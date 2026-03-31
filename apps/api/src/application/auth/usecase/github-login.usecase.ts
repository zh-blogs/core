import {
  type dbRead,
  type dbWrite,
  type ManagementPermissionKey,
  UserOauthAccounts,
  Users,
} from '@zhblogs/db';

import { and, eq, sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { normalizeEmail } from '@/domain/auth/service/auth-identity.service';
import type { UserRow } from '@/domain/auth/service/auth-user.service';
import { buildAuthUser } from '@/domain/auth/service/auth-user.service';
import { AuthError, type AuthUser } from '@/domain/auth/types/auth.types';
import { fetchGithubIdentity } from '@/infrastructure/auth/http/github-identity.service';

export interface GithubOAuthNamespace {
  getAccessTokenFromAuthorizationCodeFlow: (
    request: FastifyRequest,
  ) => Promise<{ token: { access_token: string } }>;
}

export type GithubAuthIntent = 'login' | 'bind';

type OauthDeps = {
  db: {
    read: typeof dbRead;
    write: typeof dbWrite;
  };
  githubOAuth2: GithubOAuthNamespace;
  githubScope: string;
  webBaseUrl: string;
  readReturnToPath: (request: FastifyRequest) => string | null;
  clearReturnToCookie: (reply: FastifyReply) => void;
  readGithubIntent: (request: FastifyRequest) => GithubAuthIntent;
  clearGithubIntentCookie: (reply: FastifyReply) => void;
  readUserById: (userId: string) => Promise<UserRow | null>;
  readUserPermissions: (userId: string) => Promise<ManagementPermissionKey[]>;
  readUserHasGithub: (userId: string) => Promise<boolean>;
  readCurrentUserForBind: (request: FastifyRequest) => Promise<AuthUser>;
  createTokensForUser: (
    user: AuthUser,
    currentSessionId?: string,
  ) => Promise<{ accessToken: string; refreshToken: string; sessionId: string }>;
  setSessionCookies: (reply: FastifyReply, accessToken: string, refreshToken: string) => void;
};

const parseGithubScopes = (scope: string): string[] =>
  scope
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const appendStatusToPath = (pathname: string, status: string): string => {
  const target = new URL(pathname, 'http://zhblogs.local');
  target.searchParams.set('status', status);
  return `${target.pathname}${target.search}`;
};

const isManagementPath = (path: string): boolean =>
  path === '/management' || path.startsWith('/management/');

export const resolveGithubPostLoginPath = (nextPath: string | null, _user: AuthUser): string => {
  if (nextPath && !isManagementPath(nextPath)) {
    return nextPath;
  }

  return '/dashboard';
};

export const createCompleteGithubLogin = (deps: OauthDeps) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = await deps.githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    const githubIdentity = await fetchGithubIdentity(token.token.access_token);
    const now = new Date();
    const returnToPath = deps.readReturnToPath(request);
    const intent = deps.readGithubIntent(request);

    const [existingOauthAccount] = await deps.db.write
      .select({
        id: UserOauthAccounts.id,
        userId: UserOauthAccounts.user_id,
        providerUserId: UserOauthAccounts.provider_user_id,
      })
      .from(UserOauthAccounts)
      .where(
        and(
          eq(UserOauthAccounts.provider, 'GITHUB'),
          eq(UserOauthAccounts.provider_user_id, githubIdentity.githubUserId),
        ),
      )
      .limit(1);

    if (intent === 'bind') {
      const currentUser = await deps.readCurrentUserForBind(request);
      const normalizedGithubEmail = normalizeEmail(githubIdentity.email);
      const normalizedCurrentEmail = normalizeEmail(currentUser.email);

      if (normalizedGithubEmail !== normalizedCurrentEmail) {
        throw new AuthError(
          'github_bind_email_mismatch',
          'GitHub primary email must match the current account email',
          409,
        );
      }

      const [existingUserBinding] = await deps.db.write
        .select({
          id: UserOauthAccounts.id,
          providerUserId: UserOauthAccounts.provider_user_id,
        })
        .from(UserOauthAccounts)
        .where(
          and(
            eq(UserOauthAccounts.provider, 'GITHUB'),
            eq(UserOauthAccounts.user_id, currentUser.id),
          ),
        )
        .limit(1);

      if (existingOauthAccount?.userId && existingOauthAccount.userId !== currentUser.id) {
        throw new AuthError('github_account_conflict', 'GitHub account is already bound', 409);
      }

      if (
        existingUserBinding?.providerUserId &&
        existingUserBinding.providerUserId !== githubIdentity.githubUserId
      ) {
        throw new AuthError(
          'github_already_bound',
          'Current account already has a GitHub binding',
          409,
        );
      }

      if (existingUserBinding?.id) {
        await deps.db.write
          .update(Users)
          .set({
            is_verified: true,
          })
          .where(eq(Users.id, currentUser.id));

        await deps.db.write
          .update(UserOauthAccounts)
          .set({
            provider_username: githubIdentity.login,
            access_token: token.token.access_token,
            scopes: parseGithubScopes(deps.githubScope),
            profile: githubIdentity.rawProfile,
            updated_time: now,
          })
          .where(eq(UserOauthAccounts.id, existingUserBinding.id));
      } else {
        await deps.db.write
          .update(Users)
          .set({
            is_verified: true,
          })
          .where(eq(Users.id, currentUser.id));

        await deps.db.write.insert(UserOauthAccounts).values({
          user_id: currentUser.id,
          provider: 'GITHUB',
          provider_user_id: githubIdentity.githubUserId,
          provider_username: githubIdentity.login,
          access_token: token.token.access_token,
          scopes: parseGithubScopes(deps.githubScope),
          profile: githubIdentity.rawProfile,
        });
      }

      deps.clearGithubIntentCookie(reply);
      deps.clearReturnToCookie(reply);
      void reply.redirect(appendStatusToPath(returnToPath ?? '/dashboard', 'github-bound'));
      return;
    }

    const [matchedEmailUser] = existingOauthAccount
      ? []
      : await deps.db.write
          .select()
          .from(Users)
          .where(sql`lower(${Users.email}) = ${normalizeEmail(githubIdentity.email)}`)
          .limit(1);

    let userRecord: UserRow | undefined;

    if (existingOauthAccount?.userId) {
      userRecord = (await deps.readUserById(existingOauthAccount.userId)) ?? undefined;
    } else if (matchedEmailUser) {
      const [updatedUser] = await deps.db.write
        .update(Users)
        .set({
          email: normalizeEmail(githubIdentity.email),
          nickname: githubIdentity.nickname,
          avatar_url: githubIdentity.avatarUrl,
          last_login_time: now,
          is_verified: true,
        })
        .where(eq(Users.id, matchedEmailUser.id))
        .returning();

      userRecord = updatedUser;
    } else {
      const [createdUser] = await deps.db.write
        .insert(Users)
        .values({
          username: githubIdentity.login,
          email: normalizeEmail(githubIdentity.email),
          nickname: githubIdentity.nickname,
          avatar_url: githubIdentity.avatarUrl,
          is_verified: true,
          last_login_time: now,
          metadata: {
            auth_version: 1,
          },
        })
        .returning();

      userRecord = createdUser;
    }

    if (!userRecord) {
      throw new AuthError('user_upsert_failed', 'Failed to provision login user', 500);
    }

    const [existingUserBinding] = await deps.db.write
      .select({
        providerUserId: UserOauthAccounts.provider_user_id,
      })
      .from(UserOauthAccounts)
      .where(
        and(eq(UserOauthAccounts.provider, 'GITHUB'), eq(UserOauthAccounts.user_id, userRecord.id)),
      )
      .limit(1);

    if (
      existingUserBinding?.providerUserId &&
      existingUserBinding.providerUserId !== githubIdentity.githubUserId
    ) {
      throw new AuthError(
        'github_already_bound',
        'Current account already has a different GitHub binding',
        409,
      );
    }

    await deps.db.write
      .insert(UserOauthAccounts)
      .values({
        user_id: userRecord.id,
        provider: 'GITHUB',
        provider_user_id: githubIdentity.githubUserId,
        provider_username: githubIdentity.login,
        access_token: token.token.access_token,
        scopes: parseGithubScopes(deps.githubScope),
        profile: githubIdentity.rawProfile,
      })
      .onConflictDoUpdate({
        target: [UserOauthAccounts.provider, UserOauthAccounts.provider_user_id],
        set: {
          user_id: userRecord.id,
          provider_username: githubIdentity.login,
          access_token: token.token.access_token,
          scopes: parseGithubScopes(deps.githubScope),
          profile: githubIdentity.rawProfile,
          updated_time: now,
        },
      });

    const refreshedUserRecord = await deps.readUserById(userRecord.id);

    if (!refreshedUserRecord) {
      throw new AuthError('user_not_found', 'User not found after login', 500);
    }

    const permissions = await deps.readUserPermissions(refreshedUserRecord.id);
    const hasGithub = await deps.readUserHasGithub(refreshedUserRecord.id);
    const user = buildAuthUser(refreshedUserRecord, permissions, hasGithub);
    const { accessToken, refreshToken } = await deps.createTokensForUser(user);

    deps.setSessionCookies(reply, accessToken, refreshToken);
    deps.clearGithubIntentCookie(reply);
    deps.clearReturnToCookie(reply);
    const postLoginPath = resolveGithubPostLoginPath(returnToPath, user);
    const redirectTarget = returnToPath ? postLoginPath : `${deps.webBaseUrl}${postLoginPath}`;
    void reply.redirect(redirectTarget);
  };
};
