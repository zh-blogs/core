import type { FastifyInstance } from 'fastify';

import { AuthError } from '@/domain/auth/types/auth.types';

import {
  authEnvelopeSchema,
  authErrorSchema,
  emailBodySchema,
  loginBodySchema,
  okSchema,
  registerBodySchema,
  sanitizeNextPath,
  sendAuthError,
  tokenBodySchema,
} from './auth-route.shared';

export const registerLocalAuthRoutes = (app: FastifyInstance): void => {
  app.post<{ Body: { identifier: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        body: loginBodySchema,
        response: {
          200: authEnvelopeSchema,
          400: authErrorSchema,
          401: authErrorSchema,
          403: authErrorSchema,
        },
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await app.auth.loginWithPassword(
          request.body.identifier,
          request.body.password,
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

  app.post<{
    Body: { username: string; email: string; password: string; nextPath?: string | null };
  }>(
    '/auth/register',
    {
      schema: {
        body: registerBodySchema,
        response: {
          200: okSchema,
          400: authErrorSchema,
          409: authErrorSchema,
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
        await app.auth.registerLocalAccount({
          username: request.body.username,
          email: request.body.email,
          password: request.body.password,
          nextPath: sanitizeNextPath(request.body.nextPath),
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

  app.post<{ Body: { token: string } }>(
    '/auth/verify-email',
    {
      schema: {
        body: tokenBodySchema,
        response: {
          200: okSchema,
          400: authErrorSchema,
          404: authErrorSchema,
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
      try {
        await app.auth.verifyEmailToken(request.body.token);
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

  app.post<{ Body: { email: string; nextPath?: string | null } }>(
    '/auth/verify-email/resend',
    {
      schema: {
        body: emailBodySchema,
        response: {
          200: okSchema,
          400: authErrorSchema,
          404: authErrorSchema,
          409: authErrorSchema,
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
        await app.auth.resendVerificationEmail({
          email: request.body.email,
          nextPath: sanitizeNextPath(request.body.nextPath),
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
};
