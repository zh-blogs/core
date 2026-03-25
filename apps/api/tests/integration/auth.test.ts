import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser, ManagedUserSnapshot } from '@/domain/auth/types/auth.types';

import { TEST_AUTH_COOKIES } from '../config';
import { createTestApp } from '../create-test-app';

const userFixture: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  nickname: 'User',
  avatarUrl: null,
  sourceRole: 'USER',
  role: 'USER',
  isActive: true,
  authVersion: 1,
  adminGrantedBy: null,
  adminGrantedTime: null,
};

describe('auth routes', () => {
  let app: ReturnType<typeof createTestApp> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('returns 401 for /auth/me without a session cookie', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns current user when auth service resolves session', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    app.auth.getCurrentUser = vi.fn(async () => userFixture);

    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: {
        [TEST_AUTH_COOKIES.access]: 'test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      user: userFixture,
    });
  });

  it('uses auth service for refresh and logout endpoints', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    app.auth.refreshSession = vi.fn(async (_request, reply) => {
      reply.header('set-cookie', `${TEST_AUTH_COOKIES.access}=refreshed`);
      return userFixture;
    });
    app.auth.logout = vi.fn(async (_request, reply) => {
      reply.header('set-cookie', `${TEST_AUTH_COOKIES.access}=; Max-Age=0`);
    });

    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: {
        [TEST_AUTH_COOKIES.refresh]: 'refresh-token',
      },
    });
    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/auth/logout',
    });

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshResponse.json()).toEqual({
      ok: true,
      user: userFixture,
    });
    expect(logoutResponse.statusCode).toBe(200);
    expect(logoutResponse.json()).toEqual({
      ok: true,
    });
  });

  it('protects sys-admin routes from lower roles', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    const adminUser: AuthUser = {
      ...userFixture,
      role: 'ADMIN',
      sourceRole: 'ADMIN',
    };

    app.auth.getCurrentUser = vi.fn(async () => adminUser);

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      cookies: {
        [TEST_AUTH_COOKIES.access]: 'test-token',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('allows sys-admin role management routes', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    const sysAdminUser: AuthUser = {
      ...userFixture,
      role: 'SYS_ADMIN',
      sourceRole: 'SYS_ADMIN',
    };
    const managedUser: ManagedUserSnapshot = {
      ...sysAdminUser,
      createdTime: '2026-03-19T00:00:00.000Z',
      lastLoginTime: '2026-03-19T00:00:00.000Z',
    };
    const managedUsers: ManagedUserSnapshot[] = [managedUser];

    app.auth.getCurrentUser = vi.fn(async () => sysAdminUser);
    app.auth.listManagedUsers = vi.fn(async () => managedUsers);
    app.auth.grantAdminRole = vi.fn(async () => managedUser);
    const revokedUser: ManagedUserSnapshot = {
      ...managedUser,
      role: 'USER',
      sourceRole: 'USER',
    };

    app.auth.revokeAdminRole = vi.fn(async () => revokedUser);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/users',
      cookies: {
        [TEST_AUTH_COOKIES.access]: 'sys-admin-token',
      },
    });
    const grantResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userFixture.id}/grant-admin`,
      cookies: {
        [TEST_AUTH_COOKIES.access]: 'sys-admin-token',
      },
    });
    const revokeResponse = await app.inject({
      method: 'POST',
      url: `/api/admin/users/${userFixture.id}/revoke-admin`,
      cookies: {
        [TEST_AUTH_COOKIES.access]: 'sys-admin-token',
      },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      ok: true,
      data: managedUsers,
    });
    expect(grantResponse.statusCode).toBe(200);
    expect(revokeResponse.statusCode).toBe(200);
  });

  it('returns 503 for github auth start when oauth is not configured', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/auth/github',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      ok: false,
      message: 'GitHub OAuth is not configured',
    });
  });
});
