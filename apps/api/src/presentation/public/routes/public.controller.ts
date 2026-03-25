import { Announcements, SiteFeedArticleStats, Sites } from '@zhblogs/db';

import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

const homeResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalSites: { type: 'number' },
            featuredSites: { type: 'number' },
            todayUpdates: { type: 'number' },
          },
          required: ['totalSites', 'featuredSites', 'todayUpdates'],
        },
      },
      required: ['summary'],
    },
  },
  required: ['ok', 'data'],
} as const;

const announcementItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    tag: { type: 'string' },
    publishTime: { type: ['string', 'null'] },
  },
  required: ['id', 'title', 'summary', 'tag', 'publishTime'],
} as const;

const announcementsResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: announcementItemSchema,
        },
      },
      required: ['items'],
    },
  },
  required: ['ok', 'data'],
} as const;

function startOfToday(): Date {
  const current = new Date();

  current.setHours(0, 0, 0, 0);

  return current;
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
      const [totalSitesRow] = await app.db.read
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(Sites)
        .where(eq(Sites.is_show, true));

      const [featuredSitesRow] = await app.db.read
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(Sites)
        .where(and(eq(Sites.is_show, true), eq(Sites.recommend, true)));

      const [todayUpdatesRow] = await app.db.read
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(SiteFeedArticleStats)
        .innerJoin(Sites, eq(SiteFeedArticleStats.site_id, Sites.id))
        .where(
          and(
            eq(Sites.is_show, true),
            gte(SiteFeedArticleStats.latest_published_time, startOfToday()),
          ),
        );

      return {
        ok: true,
        data: {
          summary: {
            totalSites: totalSitesRow?.total ?? 0,
            featuredSites: featuredSitesRow?.total ?? 0,
            todayUpdates: todayUpdatesRow?.total ?? 0,
          },
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
      const now = new Date();
      const rows = await app.db.read
        .select({
          id: Announcements.id,
          title: Announcements.title,
          summary: Announcements.summary,
          tag: Announcements.tag,
          publishTime: Announcements.publish_time,
        })
        .from(Announcements)
        .where(
          and(
            eq(Announcements.status, 'PUBLISHED'),
            or(isNull(Announcements.publish_time), lte(Announcements.publish_time, now)),
            or(isNull(Announcements.expire_time), gte(Announcements.expire_time, now)),
          ),
        )
        .orderBy(
          desc(Announcements.sort_order),
          desc(Announcements.publish_time),
          desc(Announcements.created_time),
        )
        .limit(3);

      return {
        ok: true,
        data: {
          items: rows.map((row) => ({
            ...row,
            publishTime: row.publishTime ? row.publishTime.toISOString() : null,
          })),
        },
      };
    },
  );
}
