import { vi } from 'vitest';

import type { AuthUser } from '@/domain/auth/types/auth.types';

import { createTestApp } from '../create-test-app';

export const baseAdminUser: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@example.com',
  nickname: 'Admin',
  avatarUrl: null,
  role: 'ADMIN',
  permissions: [],
  isActive: true,
  isVerified: true,
  hasPassword: true,
  hasGithub: true,
  authVersion: 1,
  adminGrantedBy: 'sys-admin-id',
  adminGrantedTime: '2026-03-19T00:00:00.000Z',
};

export const createAnnouncementTestApp = async (permissions: string[] = []) => {
  const app = createTestApp({
    disableExternalServices: true,
  });

  await app.ready();
  app.auth.getCurrentUser = vi.fn(async () => ({
    ...baseAdminUser,
    permissions,
  }));

  return app;
};

export type AnnouncementTestApp = Awaited<ReturnType<typeof createAnnouncementTestApp>>;
