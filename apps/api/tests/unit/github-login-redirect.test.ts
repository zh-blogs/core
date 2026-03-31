import { describe, expect, it } from 'vitest';

import { resolveGithubPostLoginPath } from '@/application/auth/usecase/github-login.usecase';
import type { AuthUser } from '@/domain/auth/types/auth.types';

const baseUser: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'user@example.com',
  nickname: 'User',
  avatarUrl: null,
  role: 'USER',
  permissions: [],
  isActive: true,
  isVerified: true,
  hasPassword: true,
  hasGithub: false,
  authVersion: 1,
  adminGrantedBy: null,
  adminGrantedTime: null,
};

describe('resolveGithubPostLoginPath', () => {
  it('redirects users away from management paths', () => {
    expect(resolveGithubPostLoginPath('/management', baseUser)).toBe('/dashboard');
    expect(resolveGithubPostLoginPath('/management/users', baseUser)).toBe('/dashboard');
    expect(resolveGithubPostLoginPath('/dashboard', baseUser)).toBe('/dashboard');
  });

  it('lands admins without permissions on dashboard', () => {
    const adminUser: AuthUser = {
      ...baseUser,
      role: 'ADMIN',
      permissions: [],
    };

    expect(resolveGithubPostLoginPath('/dashboard', adminUser)).toBe('/dashboard');
    expect(resolveGithubPostLoginPath('/management', adminUser)).toBe('/dashboard');
    expect(resolveGithubPostLoginPath(null, adminUser)).toBe('/dashboard');
  });

  it('keeps next path for admins with permissions', () => {
    const adminUser: AuthUser = {
      ...baseUser,
      role: 'ADMIN',
      permissions: ['site_audit.review'],
    };

    expect(resolveGithubPostLoginPath('/management/site-submissions', adminUser)).toBe(
      '/dashboard',
    );
    expect(resolveGithubPostLoginPath('/dashboard/account', adminUser)).toBe('/dashboard/account');
    expect(resolveGithubPostLoginPath(null, adminUser)).toBe('/dashboard');
  });
});
