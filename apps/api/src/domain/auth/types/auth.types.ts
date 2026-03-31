import type { ManagementPermissionKey, UserRoleKey } from '@zhblogs/db';

export const EFFECTIVE_USER_ROLES = ['USER', 'ADMIN', 'SYS_ADMIN'] as const;

export type EffectiveUserRole = (typeof EFFECTIVE_USER_ROLES)[number];
export type TokenType = 'access' | 'refresh';

export interface AuthUserMetadata {
  auth_version: number;
  admin_granted_by: string | null;
  admin_granted_time: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: UserRoleKey;
  permissions: ManagementPermissionKey[];
  isActive: boolean;
  isVerified: boolean;
  hasPassword: boolean;
  hasGithub: boolean;
  authVersion: number;
  adminGrantedBy: string | null;
  adminGrantedTime: string | null;
}

export interface AuthTokenPayload {
  sub: string;
  role: UserRoleKey;
  authVersion: number;
  sessionId: string;
  tokenType: TokenType;
  iat: number;
  exp: number;
}

export interface RefreshSessionRecord {
  userId: string;
  authVersion: number;
  expiresAt: number;
}

export interface GithubIdentity {
  githubUserId: string;
  login: string;
  nickname: string;
  avatarUrl: string | null;
  email: string;
  rawProfile: Record<string, unknown>;
}

export interface ManagedUserSnapshot {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  role: UserRoleKey;
  permissions: ManagementPermissionKey[];
  isActive: boolean;
  adminGrantedBy: string | null;
  adminGrantedTime: string | null;
  createdTime: string | null;
  lastLoginTime: string | null;
}

export class AuthError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
