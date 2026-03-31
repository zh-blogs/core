import type { ManagementPermissionKey, UserRoleKey } from '@zhblogs/db';

import type { AuthUser } from '../types/auth.types';

const ROLE_WEIGHT: Record<UserRoleKey, number> = {
  USER: 1,
  ADMIN: 2,
  SYS_ADMIN: 3,
};

export const hasRequiredRole = (
  user: Pick<AuthUser, 'role'>,
  requiredRole?: UserRoleKey,
): boolean => {
  if (!requiredRole) {
    return true;
  }

  return ROLE_WEIGHT[user.role] >= ROLE_WEIGHT[requiredRole];
};

export const hasManagementPermission = (
  user: Pick<AuthUser, 'role' | 'permissions'>,
  permission: ManagementPermissionKey,
): boolean => user.role === 'SYS_ADMIN' || user.permissions.includes(permission);

export const canManageUsers = (user: Pick<AuthUser, 'role' | 'permissions'>): boolean =>
  hasManagementPermission(user, 'user.manage');
