import {
  SiteAccessCounters,
  SiteFeedArticleStats,
  Sites,
  SiteTags,
  TagDefinitions,
} from '@zhblogs/db';

import { and, desc, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

type PublicSiteTagState = {
  primaryTag: string | null;
  subTags: string[];
};

export type PublicSiteItem = {
  id: string;
  bid: string | null;
  name: string;
  url: string;
  sign: string;
  feedUrl: string | null;
  sitemap: string | null;
  linkPage: string | null;
  featured: boolean;
  status: string;
  accessScope: string;
  joinTime: string;
  updateTime: string;
  latestPublishedTime: string | null;
  articleCount: number;
  visitCount: number;
  primaryTag: string | null;
  subTags: string[];
};

function collectSiteTags(
  rows: Array<{ site_id: string; tagName: string; tagType: string }>,
): Map<string, PublicSiteTagState> {
  const tagStateBySiteId = new Map<string, PublicSiteTagState>();

  for (const row of rows) {
    const current = tagStateBySiteId.get(row.site_id) ?? {
      primaryTag: null,
      subTags: [],
    };

    if (row.tagType === 'MAIN' && current.primaryTag === null) {
      current.primaryTag = row.tagName;
    }

    if (row.tagType === 'SUB' && !current.subTags.includes(row.tagName)) {
      current.subTags.push(row.tagName);
    }

    tagStateBySiteId.set(row.site_id, current);
  }

  for (const state of tagStateBySiteId.values()) {
    state.subTags.sort((left, right) => left.localeCompare(right, 'zh-CN'));
  }

  return tagStateBySiteId;
}

export async function loadPublicSites(app: FastifyInstance): Promise<PublicSiteItem[]> {
  const siteRows = await app.db.read
    .select({
      id: Sites.id,
      bid: Sites.bid,
      name: Sites.name,
      url: Sites.url,
      sign: Sites.sign,
      default_feed_url: Sites.default_feed_url,
      sitemap: Sites.sitemap,
      link_page: Sites.link_page,
      recommend: Sites.recommend,
      status: Sites.status,
      access_scope: Sites.access_scope,
      join_time: Sites.join_time,
      update_time: Sites.update_time,
    })
    .from(Sites)
    .where(eq(Sites.is_show, true))
    .orderBy(desc(Sites.recommend), desc(Sites.update_time), desc(Sites.join_time));

  if (siteRows.length === 0) {
    return [];
  }

  const siteIds = siteRows.map((site) => site.id);
  const [statsRows, accessRows, tagRows] = await Promise.all([
    app.db.read
      .select({
        site_id: SiteFeedArticleStats.site_id,
        visible_articles: SiteFeedArticleStats.visible_articles,
        total_articles: SiteFeedArticleStats.total_articles,
        latest_published_time: SiteFeedArticleStats.latest_published_time,
      })
      .from(SiteFeedArticleStats)
      .where(inArray(SiteFeedArticleStats.site_id, siteIds)),
    app.db.read
      .select({
        site_id: SiteAccessCounters.site_id,
        total: SiteAccessCounters.total,
      })
      .from(SiteAccessCounters)
      .where(inArray(SiteAccessCounters.site_id, siteIds)),
    app.db.read
      .select({
        site_id: SiteTags.site_id,
        tagName: TagDefinitions.name,
        tagType: TagDefinitions.tag_type,
      })
      .from(SiteTags)
      .innerJoin(TagDefinitions, eq(SiteTags.tag_id, TagDefinitions.id))
      .where(and(inArray(SiteTags.site_id, siteIds), eq(TagDefinitions.is_enabled, true))),
  ]);

  const statsBySiteId = new Map(
    statsRows.map((row) => [
      row.site_id,
      {
        articleCount: row.visible_articles ?? row.total_articles ?? 0,
        latestPublishedTime: row.latest_published_time,
      },
    ]),
  );
  const accessCountBySiteId = new Map(accessRows.map((row) => [row.site_id, row.total ?? 0]));
  const tagStateBySiteId = collectSiteTags(tagRows);

  return siteRows.map((site) => {
    const stats = statsBySiteId.get(site.id);
    const tags = tagStateBySiteId.get(site.id);

    return {
      id: site.id,
      bid: site.bid,
      name: site.name,
      url: site.url,
      sign: site.sign ?? '',
      feedUrl: site.default_feed_url ?? null,
      sitemap: site.sitemap ?? null,
      linkPage: site.link_page ?? null,
      featured: site.recommend,
      status: site.status,
      accessScope: site.access_scope,
      joinTime: site.join_time.toISOString(),
      updateTime: site.update_time.toISOString(),
      latestPublishedTime: stats?.latestPublishedTime?.toISOString() ?? null,
      articleCount: stats?.articleCount ?? 0,
      visitCount: accessCountBySiteId.get(site.id) ?? 0,
      primaryTag: tags?.primaryTag ?? null,
      subTags: tags?.subTags ?? [],
    };
  });
}
