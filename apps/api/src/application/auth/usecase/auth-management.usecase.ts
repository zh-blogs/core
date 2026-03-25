import {
  buildManagedUserSnapshot,
  readMetadata,
  type UserRow,
} from '@/domain/auth/service/auth-user.service';
import { AuthError, type AuthUser, type ManagedUserSnapshot } from '@/domain/auth/types/auth.types';

type ManagementDeps = {
  listUsers: () => Promise<UserRow[]>;
  readUserById: (userId: string) => Promise<UserRow | null>;
  updateUserRole: (
    target: UserRow,
    nextRole: UserRow['role'],
    actorId: string | null,
  ) => Promise<UserRow>;
};

export const createManagementService = (deps: ManagementDeps) => ({
  listManagedUsers: async (): Promise<ManagedUserSnapshot[]> => {
    const users = await deps.listUsers();
    return users.map(buildManagedUserSnapshot);
  },

  grantAdminRole: async (actor: AuthUser, targetUserId: string): Promise<ManagedUserSnapshot> => {
    if (actor.role !== 'SYS_ADMIN') {
      throw new AuthError('forbidden', 'SYS_ADMIN required', 403);
    }

    const target = await deps.readUserById(targetUserId);

    if (!target) {
      throw new AuthError('user_not_found', 'User not found', 404);
    }

    if (target.role === 'SYS_ADMIN') {
      return buildManagedUserSnapshot(target);
    }

    const updatedUser = await deps.updateUserRole(target, 'ADMIN', actor.id);
    return buildManagedUserSnapshot(updatedUser);
  },

  revokeAdminRole: async (actor: AuthUser, targetUserId: string): Promise<ManagedUserSnapshot> => {
    if (actor.role !== 'SYS_ADMIN') {
      throw new AuthError('forbidden', 'SYS_ADMIN required', 403);
    }

    const target = await deps.readUserById(targetUserId);

    if (!target) {
      throw new AuthError('user_not_found', 'User not found', 404);
    }

    if (target.role === 'SYS_ADMIN') {
      throw new AuthError(
        'forbidden',
        'SYS_ADMIN role cannot be revoked through admin grant flow',
        403,
      );
    }

    const updatedUser = await deps.updateUserRole(target, 'USER', null);
    return buildManagedUserSnapshot(updatedUser);
  },
});

export const buildNextRoleMetadata = (
  target: UserRow,
  actorId: string | null,
): Record<string, unknown> => {
  const metadata = readMetadata(target.metadata);

  return {
    ...(target.metadata ?? {}),
    auth_version: metadata.auth_version + 1,
    admin_granted_by: actorId,
    admin_granted_time: actorId ? new Date().toISOString() : null,
  };
};
