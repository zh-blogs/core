import type { FastifyInstance } from 'fastify';

import { authEnvelopeSchema, okSchema } from './auth-route.shared';

export const registerSessionRoutes = (app: FastifyInstance): void => {
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
          200: okSchema,
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
};
