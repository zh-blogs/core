import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { type AuthError } from '@/domain/auth/types/auth.types';

export const AUTH_RETURN_TO_COOKIE_NAME = 'zhblogs_auth_return_to';
export const AUTH_GITHUB_INTENT_COOKIE_NAME = 'zhblogs_github_intent';

export const sanitizeNextPath = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  return normalized;
};

export const setReturnToCookie = (
  app: FastifyInstance,
  reply: FastifyReply,
  nextPath: string | null,
): void => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: app.config.NODE_ENV === 'production',
    path: '/',
    maxAge: 10 * 60,
    ...(app.config.API_COOKIE_DOMAIN ? { domain: app.config.API_COOKIE_DOMAIN } : {}),
  };

  if (nextPath) {
    reply.setCookie(AUTH_RETURN_TO_COOKIE_NAME, nextPath, cookieOptions);
    return;
  }

  reply.clearCookie(AUTH_RETURN_TO_COOKIE_NAME, {
    path: '/',
    ...(app.config.API_COOKIE_DOMAIN ? { domain: app.config.API_COOKIE_DOMAIN } : {}),
  });
};

export const sendAuthError = (reply: FastifyReply, error: AuthError) =>
  reply.code(error.statusCode).send({
    ok: false,
    code: error.code,
    message: error.message,
  });

export const clearGithubIntentCookie = (app: FastifyInstance, reply: FastifyReply): void => {
  reply.clearCookie(AUTH_GITHUB_INTENT_COOKIE_NAME, {
    path: '/',
    ...(app.config.API_COOKIE_DOMAIN ? { domain: app.config.API_COOKIE_DOMAIN } : {}),
  });
};

export const buildWebRedirect = (
  app: FastifyInstance,
  pathname: string,
  params: Record<string, string | null | undefined> = {},
): string => {
  const target = new URL(pathname, app.config.API_WEB_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return target.toString();
};

export const redirectGithubAuthError = (
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  error: AuthError,
) => {
  const nextPath = sanitizeNextPath(request.cookies[AUTH_RETURN_TO_COOKIE_NAME] ?? null);
  const intent = request.cookies[AUTH_GITHUB_INTENT_COOKIE_NAME] === 'bind' ? 'bind' : 'login';

  setReturnToCookie(app, reply, null);
  clearGithubIntentCookie(app, reply);

  const location =
    intent === 'bind'
      ? buildWebRedirect(app, '/dashboard', { error: error.code })
      : buildWebRedirect(app, '/login', {
          error: error.code,
          next: nextPath,
        });

  return reply.redirect(location);
};

export const authUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    nickname: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
    role: { type: 'string' },
    permissions: { type: 'array', items: { type: 'string' } },
    isActive: { type: 'boolean' },
    isVerified: { type: 'boolean' },
    hasPassword: { type: 'boolean' },
    hasGithub: { type: 'boolean' },
    authVersion: { type: 'number' },
    adminGrantedBy: { type: ['string', 'null'] },
    adminGrantedTime: { type: ['string', 'null'] },
  },
  required: [
    'id',
    'email',
    'nickname',
    'avatarUrl',
    'role',
    'permissions',
    'isActive',
    'isVerified',
    'hasPassword',
    'hasGithub',
    'authVersion',
    'adminGrantedBy',
    'adminGrantedTime',
  ],
} as const;

export const authEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    user: authUserSchema,
  },
  required: ['ok', 'user'],
} as const;

export const okSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
  },
  required: ['ok'],
} as const;

export const authErrorSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    code: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['ok', 'code', 'message'],
} as const;

export const loginBodySchema = {
  type: 'object',
  properties: {
    identifier: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
  },
  required: ['identifier', 'password'],
} as const;

export const registerBodySchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 32 },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8, maxLength: 128 },
    nextPath: { type: ['string', 'null'] },
  },
  required: ['username', 'email', 'password'],
} as const;

export const tokenBodySchema = {
  type: 'object',
  properties: {
    token: { type: 'string', minLength: 1 },
  },
  required: ['token'],
} as const;

export const emailBodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    nextPath: { type: ['string', 'null'] },
  },
  required: ['email'],
} as const;

export const passwordBodySchema = {
  type: 'object',
  properties: {
    currentPassword: { type: ['string', 'null'] },
    nextPassword: { type: 'string', minLength: 8, maxLength: 128 },
  },
  required: ['nextPassword'],
} as const;

export const resetPasswordBodySchema = {
  type: 'object',
  properties: {
    token: { type: 'string', minLength: 1 },
    password: { type: 'string', minLength: 8, maxLength: 128 },
  },
  required: ['token', 'password'],
} as const;
