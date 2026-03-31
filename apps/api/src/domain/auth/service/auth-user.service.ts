import type { ManagementPermissionKey, Users } from '@zhblogs/db';

import type { AuthUser, AuthUserMetadata, ManagedUserSnapshot } from '../types/auth.types';

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

export const buildAuthUser = (
  record: UserRow,
  permissions: ManagementPermissionKey[] = [],
  hasGithub = false,
): AuthUser => {
  const metadata = readMetadata(record.metadata);

  return {
    id: record.id,
    email: record.email,
    nickname: record.nickname,
    avatarUrl: record.avatar_url ?? null,
    role: record.role as AuthUser['role'],
    permissions,
    isActive: record.is_active,
    isVerified: record.is_verified,
    hasPassword: Boolean(record.password_hash?.trim()),
    hasGithub,
    authVersion: metadata.auth_version,
    adminGrantedBy: metadata.admin_granted_by,
    adminGrantedTime: metadata.admin_granted_time,
  };
};

export const buildManagedUserSnapshot = (
  record: UserRow,
  permissions: ManagementPermissionKey[] = [],
  hasGithub = false,
): ManagedUserSnapshot => {
  const authUser = buildAuthUser(record, permissions, hasGithub);

  return {
    ...authUser,
    createdTime: toIsoString(record.created_time),
    lastLoginTime: toIsoString(record.last_login_time),
  };
};
