import type { UserRoleKey } from '@zhblogs/db';

import type { AuthUser, EffectiveUserRole } from '../types/auth.types';

const ROLE_WEIGHT: Record<EffectiveUserRole, number> = {
  USER: 1,
  ADMIN: 2,
  SYS_ADMIN: 3,
};

export const normalizeUserRole = (role: UserRoleKey): EffectiveUserRole => {
  if (role === 'CONTRIBUTOR') {
    return 'ADMIN';
  }

  return role;
};

export const hasRequiredRole = (
  user: Pick<AuthUser, 'role'>,
  requiredRole?: EffectiveUserRole,
): boolean => {
  if (!requiredRole) {
    return true;
  }

  return ROLE_WEIGHT[user.role] >= ROLE_WEIGHT[requiredRole];
};
