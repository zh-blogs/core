import { describe, expect, it, vi } from 'vitest';

import {
  getProtectionLevel,
  hasAccessToPath,
  type SessionUser,
} from '@/application/auth/auth.guard';
import { forwardSetCookieHeaders, readSessionUser } from '@/application/auth/auth.server';

import { apiStubs } from '../setup/api-stubs';
import { adminUserFixture } from '../setup/fixtures';

const adminUser: SessionUser = adminUserFixture;

describe('route protection helpers', () => {
  it('detects protected route levels', () => {
    expect(getProtectionLevel('/')).toBeNull();
    expect(getProtectionLevel('/dashboard')).toBe('authenticated');
    expect(getProtectionLevel('/admin')).toBe('admin');
    expect(getProtectionLevel('/admin/users')).toBe('sys-admin');
  });

  it('checks access against route level', () => {
    expect(hasAccessToPath(null, '/dashboard')).toBe(false);
    expect(hasAccessToPath(adminUser, '/dashboard')).toBe(true);
    expect(hasAccessToPath(adminUser, '/admin')).toBe(true);
    expect(hasAccessToPath(adminUser, '/admin/users')).toBe(false);
    expect(
      hasAccessToPath(
        {
          ...adminUser,
          role: 'SYS_ADMIN',
          sourceRole: 'SYS_ADMIN',
        },
        '/admin/users',
      ),
    ).toBe(true);
  });
});

describe('server auth helpers', () => {
  it('returns null when auth API says session is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => apiStubs.auth.sessionMissing()),
    );

    const result = await readSessionUser(
      new Request('http://127.0.0.1:9902/dashboard', {
        headers: {
          cookie: 'zhblogs_access_token=test',
        },
      }),
    );

    expect(result).toBeNull();
  });

  it('returns current user when auth API succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => apiStubs.auth.sessionOk(adminUser)),
    );

    const result = await readSessionUser(
      new Request('http://127.0.0.1:9902/dashboard', {
        headers: {
          cookie: 'zhblogs_access_token=test',
        },
      }),
    );

    expect(result).toEqual(adminUser);
  });

  it('forwards set-cookie headers', () => {
    const source = new Headers();
    const target = new Headers();

    const fakeHeaders = Object.assign(source, {
      getSetCookie: () => ['foo=bar; Path=/', 'baz=qux; Path=/'],
    }) as Headers & { getSetCookie: () => string[] };

    forwardSetCookieHeaders(fakeHeaders, target);

    expect(target.get('set-cookie')).toContain('foo=bar');
  });
});
