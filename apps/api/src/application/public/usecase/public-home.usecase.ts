import { Announcements, SiteFeedArticleStats, Sites } from '@zhblogs/db';

import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
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

export async function loadPublishedAnnouncements(app: FastifyInstance) {
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

  return rows.map((row) => ({
    ...row,
    publishTime: row.publishTime ? row.publishTime.toISOString() : null,
  }));
}
