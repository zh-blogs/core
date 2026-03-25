import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '@/domain/auth/types/auth.types';

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
