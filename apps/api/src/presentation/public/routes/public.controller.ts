import type { FastifyInstance } from 'fastify';

import {
  loadPublicHomeSummary,
  loadPublishedAnnouncements,
} from '@/application/public/usecase/public-home.usecase';
import { loadPublicSites } from '@/application/public/usecase/public-site.usecase';
import {
  announcementsResponseSchema,
  homeResponseSchema,
  publicSitesResponseSchema,
} from '@/presentation/public/dto/public-response.dto';

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
    '/api/public/sites',
    {
      schema: {
        tags: ['public'],
        summary: 'Public site cards for home and listing pages',
        response: {
          200: publicSitesResponseSchema,
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
          items: await loadPublicSites(app),
        },
      };
    },
  );
}
