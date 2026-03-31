import type { FastifyInstance } from 'fastify';

import { AuthError } from '@/domain/auth/types/auth.types';

import {
  AUTH_GITHUB_INTENT_COOKIE_NAME,
  authEnvelopeSchema,
  authErrorSchema,
  redirectGithubAuthError,
  sanitizeNextPath,
  sendAuthError,
  setReturnToCookie,
} from './auth-route.shared';

export const registerGithubAuthRoutes = (app: FastifyInstance): void => {
  app.get(
    '/auth/github',
    {
      schema: {
        tags: ['auth'],
        summary: 'GitHub OAuth start endpoint',
        response: {
          302: { type: 'null' },
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
      const query = request.query as { next?: string };
      const nextPath = sanitizeNextPath(query.next);

      setReturnToCookie(app, reply, nextPath);
      reply.setCookie(AUTH_GITHUB_INTENT_COOKIE_NAME, 'login', {
        httpOnly: true,
        sameSite: 'lax',
        secure: app.config.NODE_ENV === 'production',
        path: '/',
        maxAge: 10 * 60,
        ...(app.config.API_COOKIE_DOMAIN ? { domain: app.config.API_COOKIE_DOMAIN } : {}),
      });
      return reply.redirect('/auth/github/start');
    },
  );

  app.get(
    '/auth/github/bind',
    {
      schema: {
        tags: ['auth'],
        summary: 'GitHub bind start endpoint',
        response: {
          302: { type: 'null' },
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
        await app.auth.beginGithubBind(request, reply);
      } catch (error) {
        if (error instanceof AuthError && error.statusCode === 401) {
          return reply.redirect(`${app.config.API_WEB_BASE_URL}/login?next=%2Fdashboard`);
        }

        throw error;
      }
    },
  );

  app.post(
    '/auth/github/unbind',
    {
      schema: {
        response: {
          200: authEnvelopeSchema,
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
        const actor = await app.auth.getCurrentUser(request);
        const user = await app.auth.unbindGithub(actor, reply);

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

  app.get(
    '/auth/github/exchange',
    {
      schema: {
        summary: 'GitHub OAuth exchange endpoint',
        response: {
          302: { type: 'null' },
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
        await app.auth.completeGithubLogin(request, reply);
      } catch (error) {
        if (error instanceof AuthError) {
          return redirectGithubAuthError(app, request, reply, error);
        }

        throw error;
      }
    },
  );
};
