import {
  type dbRead,
  type dbWrite,
  UserEmailVerificationTokens,
  UserPasswordResetTokens,
  Users,
} from '@zhblogs/db';

import { eq, sql } from 'drizzle-orm';
import type { FastifyReply } from 'fastify';

import {
  isEmailIdentifier,
  normalizeEmail,
  normalizeUsername,
  validatePassword,
  validateUsername,
} from '@/domain/auth/service/auth-identity.service';
import {
  createOpaqueToken,
  hashOpaqueToken,
} from '@/domain/auth/service/auth-secret-token.service';
import { readMetadata, type UserRow } from '@/domain/auth/service/auth-user.service';
import { hashPassword, verifyPassword } from '@/domain/auth/service/password-hash.service';
import { AuthError, type AuthUser } from '@/domain/auth/types/auth.types';
import type { AppConfig } from '@/infrastructure/app/http/app-config.service';
import {
  sendPasswordResetMail,
  sendVerificationMail,
} from '@/infrastructure/auth/http/auth-mail.service';

type AuthDb = {
  read: typeof dbRead;
  write: typeof dbWrite;
};

type LocalAuthDeps = {
  db: AuthDb;
  config: AppConfig;
  readUserById: (userId: string) => Promise<UserRow | null>;
  readUserPermissions: (userId: string) => Promise<AuthUser['permissions']>;
  readUserHasGithub: (userId: string) => Promise<boolean>;
  issueSessionForUserId: (
    userId: string,
    reply?: FastifyReply,
  ) => Promise<{ user: AuthUser; accessToken: string; refreshToken: string }>;
};

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  nextPath?: string | null;
};

type VerifyEmailPayload = {
  token: string;
};

type ResendVerificationPayload = {
  email: string;
  nextPath?: string | null;
};

type PasswordLoginPayload = {
  identifier: string;
  password: string;
};

type ForgotPasswordPayload = {
  email: string;
  nextPath?: string | null;
};

type ResetPasswordPayload = {
  token: string;
  password: string;
};

type SetPasswordPayload = {
  actor: AuthUser;
  nextPassword: string;
  currentPassword?: string | null;
  reply: FastifyReply;
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1_000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1_000;

const buildNextAuthMetadata = (
  user: Pick<UserRow, 'metadata'>,
  patch: Record<string, unknown> = {},
): Record<string, unknown> => {
  const metadata = readMetadata(user.metadata);

  return {
    ...(user.metadata ?? {}),
    ...patch,
    auth_version: metadata.auth_version + 1,
  };
};

const readUserByEmail = async (db: AuthDb, email: string): Promise<UserRow | null> => {
  const [user] = await db.read
    .select()
    .from(Users)
    .where(sql`lower(${Users.email}) = ${normalizeEmail(email)}`)
    .limit(1);

  return user ?? null;
};

const readUserByUsername = async (db: AuthDb, username: string): Promise<UserRow | null> => {
  const [user] = await db.read
    .select()
    .from(Users)
    .where(sql`lower(${Users.username}) = ${normalizeUsername(username).toLowerCase()}`)
    .limit(1);

  return user ?? null;
};

const createVerificationToken = async (
  db: AuthDb,
  user: UserRow,
  email: string,
): Promise<string> => {
  const token = createOpaqueToken();

  await db.write
    .delete(UserEmailVerificationTokens)
    .where(eq(UserEmailVerificationTokens.user_id, user.id));

  await db.write.insert(UserEmailVerificationTokens).values({
    user_id: user.id,
    email,
    token_hash: hashOpaqueToken(token),
    expires_time: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  });

  return token;
};

const createPasswordResetToken = async (
  db: AuthDb,
  user: UserRow,
  email: string,
): Promise<string> => {
  const token = createOpaqueToken();

  await db.write
    .delete(UserPasswordResetTokens)
    .where(eq(UserPasswordResetTokens.user_id, user.id));

  await db.write.insert(UserPasswordResetTokens).values({
    user_id: user.id,
    email,
    token_hash: hashOpaqueToken(token),
    expires_time: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  });

  return token;
};

const readVerificationToken = async (db: AuthDb, token: string) => {
  const [row] = await db.read
    .select()
    .from(UserEmailVerificationTokens)
    .where(eq(UserEmailVerificationTokens.token_hash, hashOpaqueToken(token)))
    .limit(1);

  return row ?? null;
};

const readPasswordResetToken = async (db: AuthDb, token: string) => {
  const [row] = await db.read
    .select()
    .from(UserPasswordResetTokens)
    .where(eq(UserPasswordResetTokens.token_hash, hashOpaqueToken(token)))
    .limit(1);

  return row ?? null;
};

const assertValidTokenRow = (
  row: { expires_time: Date; consumed_time: Date | null } | null,
  invalidCode: string,
  expiredCode: string,
  usedCode: string,
): void => {
  if (!row) {
    throw new AuthError(invalidCode, 'Token is invalid', 400);
  }

  if (row.consumed_time) {
    throw new AuthError(usedCode, 'Token has already been used', 400);
  }

  if (row.expires_time.getTime() <= Date.now()) {
    throw new AuthError(expiredCode, 'Token has expired', 400);
  }
};

export const createLocalAuthService = (deps: LocalAuthDeps) => ({
  loginWithPassword: async (
    payload: PasswordLoginPayload,
    reply: FastifyReply,
  ): Promise<AuthUser> => {
    const identifier = payload.identifier.trim();
    const user = isEmailIdentifier(identifier)
      ? await readUserByEmail(deps.db, identifier)
      : await readUserByUsername(deps.db, identifier);

    if (!user?.password_hash || !user.is_active) {
      throw new AuthError('invalid_credentials', 'Invalid credentials', 401);
    }

    const matches = await verifyPassword(payload.password, user.password_hash);

    if (!matches) {
      throw new AuthError('invalid_credentials', 'Invalid credentials', 401);
    }

    if (!user.is_verified) {
      throw new AuthError('email_not_verified', 'Email verification required', 403);
    }

    await deps.db.write
      .update(Users)
      .set({
        last_login_time: new Date(),
      })
      .where(eq(Users.id, user.id));

    const session = await deps.issueSessionForUserId(user.id, reply);
    return session.user;
  },

  registerLocalAccount: async (payload: RegisterPayload): Promise<void> => {
    const username = normalizeUsername(payload.username);
    const email = normalizeEmail(payload.email);

    if (!validateUsername(username)) {
      throw new AuthError(
        'invalid_username',
        'Username must be 3-32 chars and use A-Z, 0-9, _ or -',
        400,
      );
    }

    if (!validatePassword(payload.password)) {
      throw new AuthError('invalid_password', 'Password must be 8-128 characters', 400);
    }

    const [emailUser, usernameUser] = await Promise.all([
      readUserByEmail(deps.db, email),
      readUserByUsername(deps.db, username),
    ]);

    if (usernameUser && usernameUser.id !== emailUser?.id) {
      throw new AuthError('username_taken', 'Username is already in use', 409);
    }

    let targetUser: UserRow | null;

    if (emailUser) {
      const hasGithub = await deps.readUserHasGithub(emailUser.id);

      if (hasGithub && !emailUser.password_hash) {
        throw new AuthError(
          'github_account_exists',
          'Email already belongs to a GitHub account',
          409,
        );
      }

      if (emailUser.is_verified) {
        throw new AuthError('email_taken', 'Email is already in use', 409);
      }

      const [updatedUser] = await deps.db.write
        .update(Users)
        .set({
          username,
          nickname: username,
          email,
          password_hash: await hashPassword(payload.password),
          is_verified: false,
        })
        .where(eq(Users.id, emailUser.id))
        .returning();

      targetUser = updatedUser ?? null;
    } else {
      const [createdUser] = await deps.db.write
        .insert(Users)
        .values({
          username,
          nickname: username,
          email,
          password_hash: await hashPassword(payload.password),
          is_verified: false,
          metadata: {
            auth_version: 1,
          },
        })
        .returning();

      targetUser = createdUser ?? null;
    }

    if (!targetUser) {
      throw new AuthError('user_upsert_failed', 'Failed to create local account', 500);
    }

    const token = await createVerificationToken(deps.db, targetUser, email);

    await sendVerificationMail(deps.config, {
      recipient: email,
      nickname: targetUser.nickname,
      token,
      nextPath: payload.nextPath,
    });
  },

  verifyEmailToken: async (payload: VerifyEmailPayload): Promise<void> => {
    const tokenRow = await readVerificationToken(deps.db, payload.token);

    assertValidTokenRow(
      tokenRow,
      'invalid_verification_token',
      'expired_verification_token',
      'used_verification_token',
    );
    const activeTokenRow = tokenRow as NonNullable<typeof tokenRow>;

    const user = await deps.readUserById(activeTokenRow.user_id);

    if (!user) {
      throw new AuthError('user_not_found', 'User not found', 404);
    }

    await deps.db.write
      .update(Users)
      .set({
        email: normalizeEmail(activeTokenRow.email),
        is_verified: true,
      })
      .where(eq(Users.id, user.id));

    await deps.db.write
      .update(UserEmailVerificationTokens)
      .set({
        consumed_time: new Date(),
      })
      .where(eq(UserEmailVerificationTokens.id, activeTokenRow.id));
  },

  resendVerificationEmail: async (payload: ResendVerificationPayload): Promise<void> => {
    const user = await readUserByEmail(deps.db, payload.email);

    if (!user) {
      throw new AuthError('user_not_found', 'User not found', 404);
    }

    if (user.is_verified) {
      throw new AuthError('email_already_verified', 'Email is already verified', 409);
    }

    if (!user.password_hash) {
      throw new AuthError('unsupported_account', 'Password account is not available', 400);
    }

    const token = await createVerificationToken(deps.db, user, normalizeEmail(payload.email));

    await sendVerificationMail(deps.config, {
      recipient: normalizeEmail(payload.email),
      nickname: user.nickname,
      token,
      nextPath: payload.nextPath,
    });
  },

  startPasswordReset: async (payload: ForgotPasswordPayload): Promise<void> => {
    const user = await readUserByEmail(deps.db, payload.email);

    if (!user || !user.password_hash || !user.is_verified || !user.is_active) {
      return;
    }

    const token = await createPasswordResetToken(deps.db, user, normalizeEmail(payload.email));

    await sendPasswordResetMail(deps.config, {
      recipient: normalizeEmail(payload.email),
      nickname: user.nickname,
      token,
      nextPath: payload.nextPath,
    });
  },

  resetPassword: async (payload: ResetPasswordPayload): Promise<void> => {
    if (!validatePassword(payload.password)) {
      throw new AuthError('invalid_password', 'Password must be 8-128 characters', 400);
    }

    const tokenRow = await readPasswordResetToken(deps.db, payload.token);

    assertValidTokenRow(
      tokenRow,
      'invalid_password_reset_token',
      'expired_password_reset_token',
      'used_password_reset_token',
    );
    const activeTokenRow = tokenRow as NonNullable<typeof tokenRow>;

    const user = await deps.readUserById(activeTokenRow.user_id);

    if (!user) {
      throw new AuthError('user_not_found', 'User not found', 404);
    }

    await deps.db.write
      .update(Users)
      .set({
        password_hash: await hashPassword(payload.password),
        is_verified: true,
        metadata: buildNextAuthMetadata(user),
      })
      .where(eq(Users.id, user.id));

    await deps.db.write
      .update(UserPasswordResetTokens)
      .set({
        consumed_time: new Date(),
      })
      .where(eq(UserPasswordResetTokens.id, activeTokenRow.id));
  },

  setPassword: async (payload: SetPasswordPayload): Promise<AuthUser> => {
    if (!validatePassword(payload.nextPassword)) {
      throw new AuthError('invalid_password', 'Password must be 8-128 characters', 400);
    }

    const user = await deps.readUserById(payload.actor.id);

    if (!user) {
      throw new AuthError('user_not_found', 'User not found', 404);
    }

    if (user.password_hash) {
      if (!payload.currentPassword) {
        throw new AuthError('current_password_required', 'Current password is required', 400);
      }

      const matches = await verifyPassword(payload.currentPassword, user.password_hash);

      if (!matches) {
        throw new AuthError('invalid_current_password', 'Current password is invalid', 403);
      }
    }

    await deps.db.write
      .update(Users)
      .set({
        password_hash: await hashPassword(payload.nextPassword),
        metadata: buildNextAuthMetadata(user),
      })
      .where(eq(Users.id, user.id));

    const session = await deps.issueSessionForUserId(user.id, payload.reply);
    return session.user;
  },
});
