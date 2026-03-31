import type { FastifyInstance } from 'fastify';

import {
  loadCurrentAnnouncement,
  loadPublicAnnouncements,
  loadPublicHomeSummary,
} from '@/application/public/usecase/public-home.usecase';
import {
  announcementsResponseSchema,
  currentAnnouncementResponseSchema,
  homeResponseSchema,
} from '@/presentation/public/dto/public-response.dto';

import { toPositiveInt } from './public-route.helpers';

const registerHomeRoute = (app: FastifyInstance) => {
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
    async () => ({
      ok: true,
      data: {
        summary: await loadPublicHomeSummary(app),
      },
    }),
  );
};

const registerCurrentAnnouncementRoute = (app: FastifyInstance) => {
  app.get(
    '/api/announcements/current',
    {
      schema: {
        tags: ['public'],
        summary: 'Current published announcement for home page',
        response: {
          200: currentAnnouncementResponseSchema,
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
      data: await loadCurrentAnnouncement(app),
    }),
  );
};

const registerAnnouncementArchiveRoute = (app: FastifyInstance) => {
  app.get(
    '/api/announcements',
    {
      schema: {
        tags: ['public'],
        summary: 'Published announcement archive for public pages',
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
    async (request) => {
      const query = request.query as Record<string, unknown>;

      return {
        ok: true,
        data: await loadPublicAnnouncements(
          app,
          toPositiveInt(query.page, 1),
          toPositiveInt(query.pageSize, 20),
        ),
      };
    },
  );
};

export const registerPublicAnnouncementRoutes = (app: FastifyInstance) => {
  registerHomeRoute(app);
  registerCurrentAnnouncementRoute(app);
  registerAnnouncementArchiveRoute(app);
};
