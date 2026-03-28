import type { FastifyInstance } from 'fastify';

import {
  loadPublicHomeSummary,
  loadPublishedAnnouncements,
} from '@/application/public/usecase/public-home.usecase';
import {
  loadPublicSiteArticles,
  loadPublicSiteChecks,
  loadPublicSiteDetail,
} from '@/application/public/usecase/public-site.detail.usecase';
import { submitPublicSiteFeedback } from '@/application/public/usecase/public-site.preference.usecase';
import {
  loadPublicSiteDirectory,
  loadPublicSiteDirectoryMeta,
} from '@/application/public/usecase/public-site.usecase';
import {
  announcementsResponseSchema,
  directoryMetaResponseSchema,
  directoryResponseSchema,
  homeResponseSchema,
  publicSiteArticleResponseSchema,
  publicSiteCheckResponseSchema,
  publicSiteDetailResponseSchema,
  publicSiteFeedbackResponseSchema,
} from '@/presentation/public/dto/public-response.dto';

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function registerPublicRoutes(app: FastifyInstance): void {
  app.get(
    '/api/home',
    {
      schema: {
        tags: ['public'],
        summary: 'Public home summary',
        response: {
          200: homeResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async () => {
      return {
        ok: true,
        data: {
          summary: await loadPublicHomeSummary(app),
        },
      };
    },
  );

  app.get(
    '/api/announcements',
    {
      schema: {
        tags: ['public'],
        summary: 'Published announcements for public pages',
        response: {
          200: announcementsResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async () => {
      return {
        ok: true,
        data: {
          items: await loadPublishedAnnouncements(app),
        },
      };
    },
  );

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
    async () => {
      return {
        ok: true,
        data: await loadPublicSiteDirectoryMeta(app),
      };
    },
  );

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
        data: await loadPublicSiteDirectory(app, {
          q: typeof query.q === 'string' ? query.q : '',
          main: toStringArray(query.main),
          sub: toStringArray(query.sub),
          warning: toStringArray(query.warning),
          program: toStringArray(query.program),
          statusMode: query.statusMode === 'abnormal' ? 'abnormal' : 'normal',
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
        }),
      };
    },
  );

  app.get<{ Params: { slug: string } }>(
    '/api/public/sites/:slug',
    {
      schema: {
        response: {
          200: publicSiteDetailResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const detail = await loadPublicSiteDetail(app, request.params.slug);

      if (!detail) {
        reply.code(404);
      }

      return {
        ok: Boolean(detail),
        data: detail,
      };
    },
  );

  app.get<{ Params: { slug: string } }>(
    '/api/public/sites/:slug/articles',
    {
      schema: {
        response: {
          200: publicSiteArticleResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const query = request.query as Record<string, unknown>;
      const data = await loadPublicSiteArticles(
        app,
        request.params.slug,
        toPositiveInt(query.page, 1),
        toPositiveInt(query.pageSize, 20),
      );

      if (!data) {
        reply.code(404);
      }

      return {
        ok: Boolean(data),
        data,
      };
    },
  );

  app.get<{ Params: { slug: string } }>(
    '/api/public/sites/:slug/checks',
    {
      schema: {
        response: {
          200: publicSiteCheckResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const query = request.query as Record<string, unknown>;
      const data = await loadPublicSiteChecks(
        app,
        request.params.slug,
        toPositiveInt(query.page, 1),
        toPositiveInt(query.pageSize, 20),
      );

      if (!data) {
        reply.code(404);
      }

      return {
        ok: Boolean(data),
        data,
      };
    },
  );

  app.post<{ Params: { slug: string } }>(
    '/api/public/sites/:slug/feedback',
    {
      schema: {
        response: {
          200: publicSiteFeedbackResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '10 minutes',
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown> | null;

      if (
        !body ||
        typeof body.reasonType !== 'string' ||
        typeof body.feedbackContent !== 'string' ||
        !body.feedbackContent.trim()
      ) {
        reply.code(400);
        return {
          ok: false,
          data: null,
        };
      }

      try {
        const data = await submitPublicSiteFeedback(app, {
          slug: request.params.slug,
          reasonType: body.reasonType as never,
          feedbackContent: body.feedbackContent,
          reporterName: typeof body.reporterName === 'string' ? body.reporterName : null,
          reporterEmail: typeof body.reporterEmail === 'string' ? body.reporterEmail : null,
          notifyByEmail: body.notifyByEmail === true,
        });

        return {
          ok: true,
          data,
        };
      } catch (error) {
        if (error instanceof Error && error.message === 'site_not_found') {
          reply.code(404);
          return {
            ok: false,
            data: null,
          };
        }

        app.log.error({ error }, 'failed to submit public site feedback');
        reply.code(500);
        return {
          ok: false,
          data: null,
        };
      }
    },
  );
}
