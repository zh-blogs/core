import type { FastifyInstance } from 'fastify';

import { AuthError } from '@/domain/auth/types/auth.types';

import {
  authEnvelopeSchema,
  authErrorSchema,
  emailBodySchema,
  okSchema,
  passwordBodySchema,
  resetPasswordBodySchema,
  sanitizeNextPath,
  sendAuthError,
} from './auth-route.shared';

export const registerPasswordRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: { email: string; nextPath?: string | null } }>(
    '/auth/password/forgot',
    {
      schema: {
        body: emailBodySchema,
        response: {
          200: okSchema,
        },
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '10 minutes',
        },
      },
    },
    async (request) => {
      await app.auth.startPasswordReset({
        email: request.body.email,
        nextPath: sanitizeNextPath(request.body.nextPath),
      });

      return {
        ok: true,
      };
    },
  );

  app.post<{ Body: { token: string; password: string } }>(
    '/auth/password/reset',
    {
      schema: {
        body: resetPasswordBodySchema,
        response: {
          200: okSchema,
          400: authErrorSchema,
          404: authErrorSchema,
        },
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 minutes',
        },
      },
    },
    async (request, reply) => {
      try {
        await app.auth.resetPassword({
          token: request.body.token,
          password: request.body.password,
        });
        return {
          ok: true,
        };
      } catch (error) {
        if (error instanceof AuthError) {
          return sendAuthError(reply, error);
        }

        throw error;
      }
    },
  );

  app.post<{ Body: { currentPassword?: string | null; nextPassword: string } }>(
    '/auth/password',
    {
      schema: {
        body: passwordBodySchema,
        response: {
          200: authEnvelopeSchema,
          400: authErrorSchema,
          403: authErrorSchema,
          404: authErrorSchema,
        },
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '10 minutes',
        },
      },
    },
    async (request, reply) => {
      try {
        const actor = await app.auth.getCurrentUser(request);
        const user = await app.auth.setPassword(
          actor,
          {
            currentPassword: request.body.currentPassword,
            nextPassword: request.body.nextPassword,
          },
          reply,
        );

        return {
          ok: true,
          user,
        };
      } catch (error) {
        if (error instanceof AuthError) {
          return sendAuthError(reply, error);
        }

        throw error;
      }
    },
  );
};
