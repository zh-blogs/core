import { createHash, randomBytes } from 'node:crypto';

export const createOpaqueToken = (): string => randomBytes(32).toString('base64url');

export const hashOpaqueToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
