import { createHmac, timingSafeEqual } from 'node:crypto';

import type { AuthTokenPayload, TokenType } from '../types/auth.types';
import { AuthError } from '../types/auth.types';

interface SignJwtOptions {
  subject: string;
  role: AuthTokenPayload['role'];
  sourceRole: AuthTokenPayload['sourceRole'];
  authVersion: number;
  sessionId: string;
  tokenType: TokenType;
  secret: string;
  ttlSeconds: number;
}

const base64UrlEncode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

const base64UrlDecode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

export const signJwt = ({
  subject,
  role,
  sourceRole,
  authVersion,
  sessionId,
  tokenType,
  secret,
  ttlSeconds,
}: SignJwtOptions): string => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    sub: subject,
    role,
    sourceRole,
    authVersion,
    sessionId,
    tokenType,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const verifyJwt = (
  token: string,
  secret: string,
  expectedType: TokenType,
): AuthTokenPayload => {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new AuthError('invalid_token', 'Invalid token format');
  }

  const encodedHeader = parts[0] ?? '';
  const encodedPayload = parts[1] ?? '';
  const signature = parts[2] ?? '';
  const expectedSignature = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  const receivedSignature = Buffer.from(signature, 'base64url');

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new AuthError('invalid_token', 'Invalid token signature');
  }

  let payload: unknown;

  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    throw new AuthError('invalid_token', 'Invalid token payload');
  }

  if (!payload || typeof payload !== 'object') {
    throw new AuthError('invalid_token', 'Invalid token payload');
  }

  const candidate = payload as Partial<AuthTokenPayload>;

  if (
    typeof candidate.sub !== 'string' ||
    typeof candidate.role !== 'string' ||
    typeof candidate.sourceRole !== 'string' ||
    typeof candidate.authVersion !== 'number' ||
    typeof candidate.sessionId !== 'string' ||
    typeof candidate.iat !== 'number' ||
    typeof candidate.exp !== 'number' ||
    candidate.tokenType !== expectedType
  ) {
    throw new AuthError('invalid_token', 'Invalid token payload');
  }

  if (candidate.exp <= Math.floor(Date.now() / 1000)) {
    throw new AuthError('token_expired', 'Token expired');
  }

  return candidate as AuthTokenPayload;
};
