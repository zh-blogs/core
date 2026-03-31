import { Announcements, SiteFeedArticleStats, Sites } from '@zhblogs/db';

import { and, desc, eq, gt, gte, isNull, lte, or, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

function startOfToday(): Date {
  const current = new Date();

  current.setHours(0, 0, 0, 0);

  return current;
}

export async function loadPublicHomeSummary(app: FastifyInstance) {
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
      and(eq(Sites.is_show, true), gte(SiteFeedArticleStats.latest_published_time, startOfToday())),
    );

  return {
    totalSites: totalSitesRow?.total ?? 0,
    featuredSites: featuredSitesRow?.total ?? 0,
    todayUpdates: todayUpdatesRow?.total ?? 0,
  };
}

export async function loadCurrentAnnouncement(app: FastifyInstance) {
  const now = new Date();
  const [row] = await app.db.read
    .select({
      id: Announcements.id,
      title: Announcements.title,
      content: Announcements.content,
      publishTime: Announcements.publish_time,
    })
    .from(Announcements)
    .where(
      and(
        eq(Announcements.status, 'PUBLISHED'),
        lte(Announcements.publish_time, now),
        or(isNull(Announcements.expire_time), gt(Announcements.expire_time, now)),
      ),
    )
    .orderBy(desc(Announcements.publish_time), desc(Announcements.created_time))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    publishTime: row.publishTime ? row.publishTime.toISOString() : null,
  };
}

function normalizeAnnouncementPagination(page: number, pageSize: number, totalItems: number) {
  const normalizedPageSize = Math.min(50, Math.max(1, pageSize));
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const normalizedPage = Math.min(totalPages, Math.max(1, page));

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
  };
}

export async function loadPublicAnnouncements(app: FastifyInstance, page = 1, pageSize = 20) {
  const now = new Date();
  const filters = and(
    or(eq(Announcements.status, 'PUBLISHED'), eq(Announcements.status, 'EXPIRED')),
    lte(Announcements.publish_time, now),
  );

  const [countRow] = await app.db.read
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(Announcements)
    .where(filters);

  const pagination = normalizeAnnouncementPagination(page, pageSize, countRow?.total ?? 0);
  const rows = await app.db.read
    .select({
      id: Announcements.id,
      title: Announcements.title,
      content: Announcements.content,
      status: Announcements.status,
      publishTime: Announcements.publish_time,
      expireTime: Announcements.expire_time,
    })
    .from(Announcements)
    .where(filters)
    .orderBy(desc(Announcements.publish_time), desc(Announcements.created_time))
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize);

  return {
    items: rows.map((row) => ({
      ...row,
      publishTime: row.publishTime ? row.publishTime.toISOString() : null,
      expireTime: row.expireTime ? row.expireTime.toISOString() : null,
    })),
    pagination,
  };
}
