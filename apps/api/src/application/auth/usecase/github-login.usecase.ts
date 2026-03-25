import { type dbRead, type dbWrite, UserOauthAccounts, Users } from '@zhblogs/db';

import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRow } from '@/domain/auth/service/auth-user.service';
import { buildAuthUser } from '@/domain/auth/service/auth-user.service';
import { AuthError, type AuthUser } from '@/domain/auth/types/auth.types';
import { fetchGithubIdentity } from '@/infrastructure/auth/http/github-identity.service';

export interface GithubOAuthNamespace {
  getAccessTokenFromAuthorizationCodeFlow: (
    request: FastifyRequest,
  ) => Promise<{ token: { access_token: string } }>;
}

type OauthDeps = {
  db: {
    read: typeof dbRead;
    write: typeof dbWrite;
  };
  githubOAuth2?: GithubOAuthNamespace;
  githubScope: string;
  webBaseUrl: string;
  readUserById: (userId: string) => Promise<UserRow | null>;
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

export const createCompleteGithubLogin = (deps: OauthDeps) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const githubOAuth2 = deps.githubOAuth2;

    if (!githubOAuth2) {
      throw new AuthError('oauth_not_configured', 'GitHub OAuth is not configured', 503);
    }

    const token = await githubOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    const githubIdentity = await fetchGithubIdentity(token.token.access_token);
    const now = new Date();

    const [existingOauthAccount] = await deps.db.write
      .select({
        userId: UserOauthAccounts.user_id,
      })
      .from(UserOauthAccounts)
      .where(
        and(
          eq(UserOauthAccounts.provider, 'GITHUB'),
          eq(UserOauthAccounts.provider_user_id, githubIdentity.githubUserId),
        ),
      )
      .limit(1);

    const [matchedEmailUser] = existingOauthAccount
      ? []
      : await deps.db.write
          .select()
          .from(Users)
          .where(eq(Users.email, githubIdentity.email))
          .limit(1);

    let userRecord: UserRow | undefined;

    if (existingOauthAccount?.userId) {
      userRecord = (await deps.readUserById(existingOauthAccount.userId)) ?? undefined;
    } else if (matchedEmailUser) {
      const [updatedUser] = await deps.db.write
        .update(Users)
        .set({
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
          email: githubIdentity.email,
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

    const user = buildAuthUser(refreshedUserRecord);
    const { accessToken, refreshToken } = await deps.createTokensForUser(user);

    deps.setSessionCookies(reply, accessToken, refreshToken);
    void reply.redirect(`${deps.webBaseUrl}/dashboard`);
  };
};
