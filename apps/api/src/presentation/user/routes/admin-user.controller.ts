import type { FastifyInstance, FastifyRequest } from 'fastify';

import { AuthError } from '@/domain/auth/types/auth.types';

const requireSysAdmin = async (request: FastifyRequest): Promise<void> => {
  const user = await request.server.auth.getCurrentUser(request);

  if (user.role !== 'SYS_ADMIN') {
    throw new AuthError('forbidden', 'SYS_ADMIN required', 403);
  }
};

const managedUserSchema = {
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
    createdTime: { type: ['string', 'null'] },
    lastLoginTime: { type: ['string', 'null'] },
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
    'createdTime',
    'lastLoginTime',
  ],
} as const;

const managedUserEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: managedUserSchema,
  },
  required: ['ok', 'data'],
} as const;

const managedUserListEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'array',
      items: managedUserSchema,
    },
  },
  required: ['ok', 'data'],
} as const;

const paramsSchema = {
  type: 'object',
  properties: {
    userId: { type: 'string', format: 'uuid' },
  },
  required: ['userId'],
} as const;

export function registerAdminUserRoutes(app: FastifyInstance): void {
  app.get(
    '/api/admin/users',
    {
      preHandler: requireSysAdmin,
      schema: {
        response: {
          200: managedUserListEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
        },
      },
    },
    async () => ({
      ok: true,
      data: await app.auth.listManagedUsers(),
    }),
  );

  app.post<{ Params: { userId: string } }>(
    '/api/admin/users/:userId/grant-admin',
    {
      preHandler: requireSysAdmin,
      schema: {
        params: paramsSchema,
        response: {
          200: managedUserEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request) => {
      const actor = await app.auth.getCurrentUser(request);
      const data = await app.auth.grantAdminRole(actor, request.params.userId);

      return {
        ok: true,
        data,
      };
    },
  );

  app.post<{ Params: { userId: string } }>(
    '/api/admin/users/:userId/revoke-admin',
    {
      preHandler: requireSysAdmin,
      schema: {
        params: paramsSchema,
        response: {
          200: managedUserEnvelopeSchema,
        },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request) => {
      const actor = await app.auth.getCurrentUser(request);
      const data = await app.auth.revokeAdminRole(actor, request.params.userId);

      return {
        ok: true,
        data,
      };
    },
  );
}
