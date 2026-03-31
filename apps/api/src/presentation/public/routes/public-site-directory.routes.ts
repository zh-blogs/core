import type { FastifyInstance } from 'fastify';

import { loadPublicSiteRandom } from '@/application/public/usecase/public-site.random.usecase';
import type { PublicSiteDirectoryQuery } from '@/application/public/usecase/public-site.types';
import {
  loadPublicSiteDirectory,
  loadPublicSiteDirectoryMeta,
} from '@/application/public/usecase/public-site.usecase';
import {
  directoryMetaResponseSchema,
  directoryResponseSchema,
  publicSiteRandomResponseSchema,
} from '@/presentation/public/dto/public-response.dto';

import { toPositiveInt, toStringArray } from './public-route.helpers';

const buildDirectoryQuery = (query: Record<string, unknown>): PublicSiteDirectoryQuery => ({
  q: typeof query.q === 'string' ? query.q : '',
  main: toStringArray(query.main),
  sub: toStringArray(query.sub),
  warning: toStringArray(query.warning),
  program: toStringArray(query.program),
  statusMode:
    query.statusMode === 'abnormal'
      ? 'abnormal'
      : query.statusMode === 'normal'
        ? 'normal'
        : undefined,
  random: query.random === 'off' ? false : query.random === 'on' ? true : undefined,
  sort:
    query.sort === 'updated' ||
    query.sort === 'joined' ||
    query.sort === 'visits' ||
    query.sort === 'articles'
      ? query.sort
      : undefined,
  order: query.order === 'asc' ? 'asc' : query.order === 'desc' ? 'desc' : undefined,
  page: toPositiveInt(query.page, 1),
  pageSize: toPositiveInt(query.pageSize, 24),
  randomSeed: typeof query.randomSeed === 'string' ? query.randomSeed : undefined,
});

const registerDirectoryMetaRoute = (app: FastifyInstance) => {
  app.get(
    '/api/public/sites/meta',
    {
      schema: {
        tags: ['public'],
        summary: 'Public site directory metadata',
        response: {
          200: directoryMetaResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async () => ({
      ok: true,
      data: await loadPublicSiteDirectoryMeta(app),
    }),
  );
};

const registerDirectoryRoute = (app: FastifyInstance) => {
  app.get(
    '/api/public/sites',
    {
      schema: {
        tags: ['public'],
        summary: 'Public site directory query',
        response: {
          200: directoryResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async (request) => {
      const query = request.query as Record<string, unknown>;

      return {
        ok: true,
        data: await loadPublicSiteDirectory(app, buildDirectoryQuery(query)),
      };
    },
  );
};

const registerRandomRoute = (app: FastifyInstance) => {
  app.get(
    '/api/public/sites/random',
    {
      schema: {
        tags: ['public'],
        summary: 'Strict random site selection for /site/go',
        response: {
          200: publicSiteRandomResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async (request) => ({
      ok: true,
      data: await loadPublicSiteRandom(app, request.raw.url ?? request.url),
    }),
  );
};

export const registerPublicSiteDirectoryRoutes = (app: FastifyInstance) => {
  registerDirectoryMetaRoute(app);
  registerDirectoryRoute(app);
  registerRandomRoute(app);
};
