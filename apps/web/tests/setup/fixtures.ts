import type { SessionUser } from '@/application/auth/auth.guard';

export const adminUserFixture: SessionUser = {
  id: 'user-admin',
  email: 'admin@example.com',
  nickname: 'Admin',
  avatarUrl: null,
  sourceRole: 'ADMIN',
  role: 'ADMIN',
  isActive: true,
  authVersion: 1,
  adminGrantedBy: 'sys-admin-id',
  adminGrantedTime: '2026-03-19T00:00:00.000Z',
};

export const createPresenceCountNode = (): {
  textContent: string;
  dataset: Record<string, string>;
} => ({
  textContent: '--',
  dataset: {},
});
