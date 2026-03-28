import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  readSiteDirectoryPreference,
  updateSiteDirectoryPreference,
} from '@/application/public/usecase/public-site.preference.usecase';

const requireAuthenticated = async (request: FastifyRequest): Promise<string> => {
  const user = await request.server.auth.getCurrentUser(request);
  return user.id;
};

const siteDirectoryPreferenceSchema = {
  type: 'object',
  properties: {
    randomMode: { type: 'string' },
    randomSeed: { type: ['string', 'null'] },
  },
  required: ['randomMode', 'randomSeed'],
} as const;

const siteDirectoryPreferenceEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: siteDirectoryPreferenceSchema,
  },
  required: ['ok', 'data'],
} as const;

export function registerSiteDirectoryPreferenceRoutes(app: FastifyInstance): void {
  app.get(
    '/api/user/settings/site-directory',
    {
      schema: {
        response: {
          200: siteDirectoryPreferenceEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const userId = await requireAuthenticated(request);

      return {
        ok: true,
        data: await readSiteDirectoryPreference(app, userId),
      };
    },
  );

  app.put(
    '/api/user/settings/site-directory',
    {
      schema: {
        response: {
          200: siteDirectoryPreferenceEnvelopeSchema,
        },
      },
    },
    async (request) => {
      const userId = await requireAuthenticated(request);
      const body = request.body as Record<string, unknown> | null;
      const randomMode = body?.['randomMode'] === 'off' ? 'off' : 'stable';

      return {
        ok: true,
        data: await updateSiteDirectoryPreference(app, userId, {
          randomMode,
          randomSeed: typeof body?.['randomSeed'] === 'string' ? body.randomSeed : null,
        }),
      };
    },
  );
}
