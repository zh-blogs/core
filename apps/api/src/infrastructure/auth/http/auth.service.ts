import { Users } from '@zhblogs/db';

import fastifyOauth2 from '@fastify/oauth2';
import { desc, eq } from 'drizzle-orm';
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
import { hasRequiredRole } from '@/domain/auth/service/auth-role.service';
import { buildAuthUser, type UserRow } from '@/domain/auth/service/auth-user.service';
import {
  AuthError,
  type AuthUser,
  type EffectiveUserRole,
  type ManagedUserSnapshot,
} from '@/domain/auth/types/auth.types';

export interface AuthService {
  guard: (requiredRole?: EffectiveUserRole) => preHandlerHookHandler;
  getCurrentUser: (request: FastifyRequest) => Promise<AuthUser>;
  getOptionalUser: (request: FastifyRequest) => Promise<AuthUser | null>;
  completeGithubLogin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  refreshSession: (request: FastifyRequest, reply: FastifyReply) => Promise<AuthUser>;
  logout: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  listManagedUsers: () => Promise<ManagedUserSnapshot[]>;
  grantAdminRole: (actor: AuthUser, targetUserId: string) => Promise<ManagedUserSnapshot>;
  revokeAdminRole: (actor: AuthUser, targetUserId: string) => Promise<ManagedUserSnapshot>;
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

    if (app.config.API_GITHUB_CLIENT_ID && app.config.API_GITHUB_CLIENT_SECRET) {
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
        startRedirectPath: '/auth/github',
      });
    }

    app.decorateRequest('currentUser', null);

    const readUserById = async (userId: string): Promise<UserRow | null> => {
      const [user] = await app.db.read.select().from(Users).where(eq(Users.id, userId)).limit(1);

      return user ?? null;
    };

    const listUsers = async (): Promise<UserRow[]> =>
      app.db.read.select().from(Users).orderBy(desc(Users.created_time));

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
      });

    const completeGithubLogin = createCompleteGithubLogin({
      db: app.db,
      githubOAuth2: app.githubOAuth2,
      githubScope: app.config.API_GITHUB_SCOPE,
      webBaseUrl: app.config.API_WEB_BASE_URL,
      readUserById,
      createTokensForUser,
      setSessionCookies,
    });
    const managementService = createManagementService({
      listUsers,
      readUserById,
      updateUserRole,
    });

    const issueSessionForUserId = async (
      userId: string,
      reply?: FastifyReply,
    ): Promise<{ user: AuthUser; accessToken: string; refreshToken: string }> => {
      const userRecord = await readUserById(userId);

      if (!userRecord) {
        throw new AuthError('user_not_found', 'User not found', 404);
      }

      const user = buildAuthUser(userRecord);
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

      completeGithubLogin,

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

      issueSessionForUserId,
    };

    app.decorate('auth', service);
  },
  { name: 'auth', dependencies: ['config', 'drizzle', 'cache', 'security'] },
);
