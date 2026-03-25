import type { Users } from '@zhblogs/db';

import type { AuthUser, AuthUserMetadata, ManagedUserSnapshot } from '../types/auth.types';

import { normalizeUserRole } from './auth-role.service';

export type UserRow = typeof Users.$inferSelect;

export const toIsoString = (value: Date | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};

export const readMetadata = (
  metadata: Record<string, unknown> | null | undefined,
): AuthUserMetadata => {
  const authVersion =
    typeof metadata?.auth_version === 'number' && Number.isFinite(metadata.auth_version)
      ? metadata.auth_version
      : 1;

  return {
    auth_version: authVersion,
    admin_granted_by:
      typeof metadata?.admin_granted_by === 'string' ? metadata.admin_granted_by : null,
    admin_granted_time:
      typeof metadata?.admin_granted_time === 'string' ? metadata.admin_granted_time : null,
  };
};

export const buildAuthUser = (record: UserRow): AuthUser => {
  const metadata = readMetadata(record.metadata);

  return {
    id: record.id,
    email: record.email,
    nickname: record.nickname,
    avatarUrl: record.avatar_url ?? null,
    sourceRole: record.role as AuthUser['sourceRole'],
    role: normalizeUserRole(record.role as AuthUser['sourceRole']),
    isActive: record.is_active,
    authVersion: metadata.auth_version,
    adminGrantedBy: metadata.admin_granted_by,
    adminGrantedTime: metadata.admin_granted_time,
  };
};

export const buildManagedUserSnapshot = (record: UserRow): ManagedUserSnapshot => {
  const authUser = buildAuthUser(record);

  return {
    ...authUser,
    createdTime: toIsoString(record.created_time),
    lastLoginTime: toIsoString(record.last_login_time),
  };
};
