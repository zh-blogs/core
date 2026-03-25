import type { FastifyInstance } from 'fastify';

const authUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    nickname: { type: 'string' },
    avatarUrl: { type: ['string', 'null'] },
    sourceRole: { type: 'string' },
    role: { type: 'string' },
    isActive: { type: 'boolean' },
    authVersion: { type: 'number' },
    adminGrantedBy: { type: ['string', 'null'] },
    adminGrantedTime: { type: ['string', 'null'] },
  },
  required: [
    'id',
    'email',
    'nickname',
    'avatarUrl',
    'sourceRole',
    'role',
    'isActive',
    'authVersion',
    'adminGrantedBy',
    'adminGrantedTime',
  ],
} as const;

const authEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    user: authUserSchema,
  },
  required: ['ok', 'user'],
} as const;

const authLogoutSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
  },
  required: ['ok'],
} as const;

export function registerAuthRoutes(app: FastifyInstance): void {
  if (!app.githubOAuth2) {
    app.get(
      '/auth/github',
      {
        schema: {
          tags: ['auth'],
          summary: 'GitHub OAuth start endpoint (unavailable when not configured)',
          response: {
            503: {
              type: 'object',
              properties: {
                ok: { type: 'boolean' },
                message: { type: 'string' },
              },
              required: ['ok', 'message'],
            },
          },
        },
        config: {
          rateLimit: {
            max: 10,
            timeWindow: '1 minute',
          },
        },
      },
      async (_request, reply) =>
        reply.code(503).send({
          ok: false,
          message: 'GitHub OAuth is not configured',
        }),
    );
  }

  app.get(
    '/auth/github/callback',
    {
      schema: {
        tags: ['auth'],
        summary: 'GitHub OAuth callback',
        response: {
          302: {
            type: 'null',
          },
        },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      await app.auth.completeGithubLogin(request, reply);
    },
  );

  app.get(
    '/auth/me',
    {
      schema: {
        tags: ['auth'],
        summary: 'Current authenticated user',
        response: {
          200: authEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const user = await app.auth.getCurrentUser(request);
      return {
        ok: true,
        user,
      };
    },
  );

  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Refresh current login session',
        response: {
          200: authEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const user = await app.auth.refreshSession(request, reply);

      return {
        ok: true,
        user,
      };
    },
  );

  app.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Logout current login session',
        response: {
          200: authLogoutSchema,
        },
      },
    },
    async (request, reply) => {
      await app.auth.logout(request, reply);

      return {
        ok: true,
      };
    },
  );
}
