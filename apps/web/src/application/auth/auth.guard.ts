export type EffectiveUserRole = 'USER' | 'ADMIN' | 'SYS_ADMIN';

export interface SessionUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  sourceRole: string;
  role: EffectiveUserRole;
  isActive: boolean;
  authVersion: number;
  adminGrantedBy: string | null;
  adminGrantedTime: string | null;
}

export type ProtectionLevel = 'authenticated' | 'admin' | 'sys-admin';

export const getProtectionLevel = (pathname: string): ProtectionLevel | null => {
  if (pathname.startsWith('/admin/users')) {
    return 'sys-admin';
  }

  if (pathname.startsWith('/admin')) {
    return 'admin';
  }

  if (pathname.startsWith('/dashboard')) {
    return 'authenticated';
  }

  return null;
};

export const hasAccessToPath = (user: SessionUser | null, pathname: string): boolean => {
  const protectionLevel = getProtectionLevel(pathname);

  if (!protectionLevel) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (protectionLevel === 'authenticated') {
    return true;
  }

  if (protectionLevel === 'admin') {
    return user.role === 'ADMIN' || user.role === 'SYS_ADMIN';
  }

  return user.role === 'SYS_ADMIN';
};
