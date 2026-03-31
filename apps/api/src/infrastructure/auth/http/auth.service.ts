import {
  type ManagementPermissionKey,
  UserManagementPermissions,
  UserOauthAccounts,
  Users,
} from '@zhblogs/db';

import fastifyOauth2 from '@fastify/oauth2';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';
import fp from 'fastify-plugin';

import {
  buildNextRoleMetadata,
  createManagementService,
} from '@/application/auth/usecase/auth-management.usecase';
import {
  ACCESS_COOKIE_NAME,
  createSessionHelpers,
  readCookiePayload,
  REFRESH_COOKIE_NAME,
} from '@/application/auth/usecase/auth-session.usecase';
import {
  createCompleteGithubLogin,
  type GithubOAuthNamespace,
} from '@/application/auth/usecase/github-login.usecase';
import { createLocalAuthService } from '@/application/auth/usecase/local-auth.usecase';
import { hasRequiredRole } from '@/domain/auth/service/auth-role.service';
import { buildAuthUser, type UserRow } from '@/domain/auth/service/auth-user.service';
import { AuthError, type AuthUser, type ManagedUserSnapshot } from '@/domain/auth/types/auth.types';

export interface AuthService {
  guard: (requiredRole?: AuthUser['role']) => preHandlerHookHandler;
  getCurrentUser: (request: FastifyRequest) => Promise<AuthUser>;
  getOptionalUser: (request: FastifyRequest) => Promise<AuthUser | null>;
  beginGithubBind: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  completeGithubLogin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  loginWithPassword: (
    identifier: string,
    password: string,
    reply: FastifyReply,
  ) => Promise<AuthUser>;
  registerLocalAccount: (payload: {
    username: string;
    email: string;
    password: string;
    nextPath?: string | null;
  }) => Promise<void>;
  verifyEmailToken: (token: string) => Promise<void>;
  resendVerificationEmail: (payload: { email: string; nextPath?: string | null }) => Promise<void>;
  startPasswordReset: (payload: { email: string; nextPath?: string | null }) => Promise<void>;
  resetPassword: (payload: { token: string; password: string }) => Promise<void>;
  setPassword: (
    actor: AuthUser,
    payload: { currentPassword?: string | null; nextPassword: string },
    reply: FastifyReply,
  ) => Promise<AuthUser>;
  unbindGithub: (actor: AuthUser, reply: FastifyReply) => Promise<AuthUser>;
  refreshSession: (request: FastifyRequest, reply: FastifyReply) => Promise<AuthUser>;
  logout: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  listManagedUsers: () => Promise<ManagedUserSnapshot[]>;
  grantAdminRole: (actor: AuthUser, targetUserId: string) => Promise<ManagedUserSnapshot>;
  revokeAdminRole: (actor: AuthUser, targetUserId: string) => Promise<ManagedUserSnapshot>;
  updateUserPermissions: (
    actor: AuthUser,
    targetUserId: string,
    permissions: ManagementPermissionKey[],
  ) => Promise<ManagedUserSnapshot>;
  issueSessionForUserId: (
    userId: string,
    reply?: FastifyReply,
  ) => Promise<{ user: AuthUser; accessToken: string; refreshToken: string }>;
}

declare module 'fastify' {
  interface FastifyInstance {
    auth: AuthService;
    githubOAuth2?: GithubOAuthNamespace;
  }

  interface FastifyRequest {
    currentUser: AuthUser | null;
  }
}

const isAuthError = (error: unknown): error is AuthError => error instanceof AuthError;
const AUTH_RETURN_TO_COOKIE_NAME = 'zhblogs_auth_return_to';
const AUTH_GITHUB_INTENT_COOKIE_NAME = 'zhblogs_github_intent';

const sanitizeReturnToPath = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  return normalized;
};

export const authPlugin = fp(
  async (app) => {
    const cookieBaseOptions: {
      httpOnly: true;
      sameSite: 'lax';
      secure: boolean;
      path: '/';
      domain?: string;
    } = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: app.config.NODE_ENV === 'production',
      path: '/' as const,
      ...(app.config.API_COOKIE_DOMAIN ? { domain: app.config.API_COOKIE_DOMAIN } : {}),
    };

    await app.register(fastifyOauth2, {
      name: 'githubOAuth2',
      credentials: {
        client: {
          id: app.config.API_GITHUB_CLIENT_ID,
          secret: app.config.API_GITHUB_CLIENT_SECRET,
        },
        auth: fastifyOauth2.GITHUB_CONFIGURATION,
      },
      callbackUri: app.config.API_GITHUB_CALLBACK_URL,
      scope: app.config.API_GITHUB_SCOPE.split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      startRedirectPath: '/auth/github/start',
    });

    app.decorateRequest('currentUser', null);

    const readUserById = async (userId: string): Promise<UserRow | null> => {
      const [user] = await app.db.read.select().from(Users).where(eq(Users.id, userId)).limit(1);

      return user ?? null;
    };

    const listUsers = async (): Promise<UserRow[]> =>
      app.db.read.select().from(Users).orderBy(desc(Users.created_time));

    const readUserHasGithub = async (userId: string): Promise<boolean> => {
      const [row] = await app.db.read
        .select({
          id: UserOauthAccounts.id,
        })
        .from(UserOauthAccounts)
        .where(eq(UserOauthAccounts.user_id, userId))
        .limit(1);

      return Boolean(row?.id);
    };

    const readUserPermissions = async (userId: string): Promise<ManagementPermissionKey[]> => {
      const rows = await app.db.read
        .select({
          permission_key: UserManagementPermissions.permission_key,
        })
        .from(UserManagementPermissions)
        .where(eq(UserManagementPermissions.user_id, userId))
        .orderBy(asc(UserManagementPermissions.permission_key));

      return rows.map((row) => row.permission_key as ManagementPermissionKey);
    };

    const clearUserPermissions = async (targetUserId: string): Promise<void> => {
      await app.db.write
        .delete(UserManagementPermissions)
        .where(eq(UserManagementPermissions.user_id, targetUserId));
    };

    const replaceUserPermissions = async (
      targetUserId: string,
      permissions: ManagementPermissionKey[],
      actorId: string,
    ): Promise<void> => {
      await clearUserPermissions(targetUserId);

      if (permissions.length === 0) {
        return;
      }

      await app.db.write.insert(UserManagementPermissions).values(
        permissions.map((permission_key) => ({
          user_id: targetUserId,
          permission_key,
          granted_by: actorId,
        })),
      );
    };

    const updateUserRole = async (
      target: UserRow,
      nextRole: UserRow['role'],
      actorId: string | null,
    ): Promise<UserRow> => {
      const [updatedUser] = await app.db.write
        .update(Users)
        .set({
          role: nextRole,
          metadata: buildNextRoleMetadata(target, actorId),
        })
        .where(eq(Users.id, target.id))
        .returning();

      if (!updatedUser) {
        throw new AuthError('user_not_found', 'User not found', 404);
      }

      return updatedUser;
    };

    const { clearSession, createTokensForUser, setSessionCookies, validateAuthenticatedUser } =
      createSessionHelpers({
        cache: app.db.cache,
        jwt: {
          accessSecret: app.config.API_JWT_ACCESS_SECRET,
          refreshSecret: app.config.API_JWT_REFRESH_SECRET,
          accessTtlSeconds: app.config.API_JWT_ACCESS_TTL_SECONDS,
          refreshTtlSeconds: app.config.API_JWT_REFRESH_TTL_SECONDS,
        },
        cookieBaseOptions,
        readUserById,
        readUserPermissions,
        readUserHasGithub,
      });

    const completeGithubLogin = createCompleteGithubLogin({
      db: app.db,
      githubOAuth2: app.githubOAuth2 as GithubOAuthNamespace,
      githubScope: app.config.API_GITHUB_SCOPE,
      webBaseUrl: app.config.API_WEB_BASE_URL,
      readReturnToPath: (request) =>
        sanitizeReturnToPath(request.cookies[AUTH_RETURN_TO_COOKIE_NAME]),
      clearReturnToCookie: (reply) => {
        reply.clearCookie(AUTH_RETURN_TO_COOKIE_NAME, cookieBaseOptions);
      },
      readGithubIntent: (request) =>
        request.cookies[AUTH_GITHUB_INTENT_COOKIE_NAME] === 'bind' ? 'bind' : 'login',
      clearGithubIntentCookie: (reply) => {
        reply.clearCookie(AUTH_GITHUB_INTENT_COOKIE_NAME, cookieBaseOptions);
      },
      readUserById,
      readUserPermissions,
      readUserHasGithub,
      readCurrentUserForBind: async (request) => {
        const payload = readCookiePayload(
          request,
          ACCESS_COOKIE_NAME,
          app.config.API_JWT_ACCESS_SECRET,
          'access',
        );
        return validateAuthenticatedUser(payload);
      },
      createTokensForUser,
      setSessionCookies,
    });
    const managementService = createManagementService({
      listUsers,
      readUserById,
      readUserPermissions,
      readUserHasGithub,
      replaceUserPermissions,
      clearUserPermissions,
      updateUserRole,
    });
    const localAuthService = createLocalAuthService({
      db: app.db,
      config: app.config,
      readUserById,
      readUserPermissions,
      readUserHasGithub,
      issueSessionForUserId: async (userId, reply) => issueSessionForUserId(userId, reply),
    });

    const issueSessionForUserId = async (
      userId: string,
      reply?: FastifyReply,
    ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> => {
      const userRecord = await readUserById(userId);

      if (!userRecord) {
        throw new AuthError('user_not_found', 'User not found', 404);
      }

      const permissions = await readUserPermissions(userRecord.id);
      const hasGithub = await readUserHasGithub(userRecord.id);
      const user = buildAuthUser(userRecord, permissions, hasGithub);
      const { accessToken, refreshToken } = await createTokensForUser(user);

      if (reply) {
        setSessionCookies(reply, accessToken, refreshToken);
      }

      return {
        user,
        accessToken,
        refreshToken,
      };
    };

    const service: AuthService = {
      guard: (requiredRole) =>
        (async (request) => {
          const user = await service.getCurrentUser(request);

          if (!hasRequiredRole(user, requiredRole)) {
            throw new AuthError('forbidden', 'Insufficient permissions', 403);
          }
        }) satisfies preHandlerHookHandler,

      getCurrentUser: async (request) => {
        if (request.currentUser) {
          return request.currentUser;
        }

        const payload = readCookiePayload(
          request,
          ACCESS_COOKIE_NAME,
          app.config.API_JWT_ACCESS_SECRET,
          'access',
        );
        const user = await validateAuthenticatedUser(payload);
        request.currentUser = user;
        return user;
      },

      getOptionalUser: async (request) => {
        if (!request.cookies[ACCESS_COOKIE_NAME]) {
          return null;
        }

        try {
          return await service.getCurrentUser(request);
        } catch (error) {
          if (isAuthError(error)) {
            return null;
          }

          throw error;
        }
      },

      beginGithubBind: async (request, reply) => {
        await service.getCurrentUser(request);

        reply.setCookie(AUTH_GITHUB_INTENT_COOKIE_NAME, 'bind', {
          ...cookieBaseOptions,
          maxAge: 10 * 60,
        });
        reply.setCookie(AUTH_RETURN_TO_COOKIE_NAME, '/dashboard', {
          ...cookieBaseOptions,
          maxAge: 10 * 60,
        });
        void reply.redirect('/auth/github/start');
      },

      completeGithubLogin,

      loginWithPassword: (identifier, password, reply) =>
        localAuthService.loginWithPassword({ identifier, password }, reply),
      registerLocalAccount: (payload) => localAuthService.registerLocalAccount(payload),
      verifyEmailToken: (token) => localAuthService.verifyEmailToken({ token }),
      resendVerificationEmail: (payload) => localAuthService.resendVerificationEmail(payload),
      startPasswordReset: (payload) => localAuthService.startPasswordReset(payload),
      resetPassword: (payload) => localAuthService.resetPassword(payload),
      setPassword: (actor, payload, reply) =>
        localAuthService.setPassword({
          actor,
          currentPassword: payload.currentPassword,
          nextPassword: payload.nextPassword,
          reply,
        }),
      unbindGithub: async (actor, reply) => {
        const userRecord = await readUserById(actor.id);

        if (!userRecord) {
          throw new AuthError('user_not_found', 'User not found', 404);
        }

        const [binding] = await app.db.read
          .select({
            id: UserOauthAccounts.id,
          })
          .from(UserOauthAccounts)
          .where(
            and(eq(UserOauthAccounts.user_id, actor.id), eq(UserOauthAccounts.provider, 'GITHUB')),
          )
          .limit(1);

        if (!binding) {
          throw new AuthError(
            'github_not_bound',
            'Current account does not have a GitHub binding',
            404,
          );
        }

        if (!userRecord.password_hash) {
          throw new AuthError(
            'github_unbind_requires_password',
            'Set a local password before unbinding GitHub',
            409,
          );
        }

        await app.db.write.delete(UserOauthAccounts).where(eq(UserOauthAccounts.id, binding.id));

        const session = await issueSessionForUserId(actor.id, reply);
        return session.user;
      },

      refreshSession: async (request, reply) => {
        const payload = readCookiePayload(
          request,
          REFRESH_COOKIE_NAME,
          app.config.API_JWT_REFRESH_SECRET,
          'refresh',
        );
        const user = await validateAuthenticatedUser(payload);
        const { accessToken, refreshToken } = await createTokensForUser(user, payload.sessionId);

        setSessionCookies(reply, accessToken, refreshToken);
        request.currentUser = user;
        return user;
      },

      logout: async (request, reply) => {
        let currentSessionId: string | undefined;

        try {
          currentSessionId = readCookiePayload(
            request,
            REFRESH_COOKIE_NAME,
            app.config.API_JWT_REFRESH_SECRET,
            'refresh',
          ).sessionId;
        } catch (error) {
          if (!isAuthError(error)) {
            throw error;
          }
        }

        await clearSession(reply, currentSessionId);
      },

      listManagedUsers: managementService.listManagedUsers,
      grantAdminRole: managementService.grantAdminRole,
      revokeAdminRole: managementService.revokeAdminRole,
      updateUserPermissions: managementService.updateUserPermissions,

      issueSessionForUserId,
    };

    app.decorate('auth', service);
  },
  { name: 'auth', dependencies: ['config', 'drizzle', 'cache', 'security'] },
);
