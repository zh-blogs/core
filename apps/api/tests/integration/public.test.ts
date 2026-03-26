import {
  Announcements,
  SiteAccessCounters,
  SiteFeedArticleStats,
  Sites,
  SiteTags,
  TagDefinitions,
} from '@zhblogs/db';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTestApp } from '@tests/create-test-app';

describe('public routes', () => {
  let app: ReturnType<typeof createTestApp> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('returns public home summary', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    const selectQueue = [
      {
        table: Sites,
        rows: [{ total: 12 }],
      },
      {
        table: Sites,
        rows: [{ total: 4 }],
      },
      {
        table: SiteFeedArticleStats,
        rows: [{ total: 2 }],
      },
    ];

    app.db.read.select = vi.fn(() => ({
      from(table: unknown) {
        const next = selectQueue.shift();

        expect(next?.table).toBe(table);

        if (table === SiteFeedArticleStats) {
          return {
            innerJoin: vi.fn(() => ({
              where: vi.fn(async () => next?.rows ?? []),
            })),
          };
        }

        return {
          where: vi.fn(async () => next?.rows ?? []),
        };
      },
    })) as unknown as typeof app.db.read.select;

    const response = await app.inject({
      method: 'GET',
      url: '/api/home',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        summary: {
          totalSites: 12,
          featuredSites: 4,
          todayUpdates: 2,
        },
      },
    });
  });

  it('returns published announcements only', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    app.db.read.select = vi.fn(() => ({
      from(table: unknown) {
        expect(table).toBe(Announcements);

        return {
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  id: 'announcement-1',
                  title: 'Spring Cleanup',
                  summary: 'Directory updates are in progress.',
                  tag: 'PROJECT',
                  publishTime: new Date('2026-03-20T10:00:00.000Z'),
                },
                {
                  id: 'announcement-2',
                  title: 'Submission Notice',
                  summary: 'Reviews continue this week.',
                  tag: 'NOTICE',
                  publishTime: null,
                },
              ]),
            })),
          })),
        };
      },
    })) as unknown as typeof app.db.read.select;

    const response = await app.inject({
      method: 'GET',
      url: '/api/announcements',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        items: [
          {
            id: 'announcement-1',
            title: 'Spring Cleanup',
            summary: 'Directory updates are in progress.',
            tag: 'PROJECT',
            publishTime: '2026-03-20T10:00:00.000Z',
          },
          {
            id: 'announcement-2',
            title: 'Submission Notice',
            summary: 'Reviews continue this week.',
            tag: 'NOTICE',
            publishTime: null,
          },
        ],
      },
    });
  });

  it('returns public site cards', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    const selectQueue = [
      {
        table: Sites,
        rows: [
          {
            id: 'site-1',
            bid: 'cloud-atlas',
            name: 'Cloud Atlas',
            url: 'https://cloud-atlas.example',
            sign: '记录基础设施与系统实验。',
            default_feed_url: 'https://cloud-atlas.example/feed.xml',
            sitemap: 'https://cloud-atlas.example/sitemap.xml',
            link_page: 'https://cloud-atlas.example/friends',
            recommend: true,
            status: 'OK',
            access_scope: 'BOTH',
            join_time: new Date('2026-03-01T08:00:00.000Z'),
            update_time: new Date('2026-03-25T08:00:00.000Z'),
          },
        ],
      },
      {
        table: SiteFeedArticleStats,
        rows: [
          {
            site_id: 'site-1',
            visible_articles: 18,
            total_articles: 22,
            latest_published_time: new Date('2026-03-25T06:00:00.000Z'),
          },
        ],
      },
      {
        table: SiteAccessCounters,
        rows: [
          {
            site_id: 'site-1',
            total: 320,
          },
        ],
      },
      {
        table: SiteTags,
        rows: [
          {
            site_id: 'site-1',
            tagName: '技术',
            tagType: 'MAIN',
          },
          {
            site_id: 'site-1',
            tagName: '架构',
            tagType: 'SUB',
          },
          {
            site_id: 'site-1',
            tagName: '运维',
            tagType: 'SUB',
          },
        ],
      },
    ];

    app.db.read.select = vi.fn(() => ({
      from(table: unknown) {
        const next = selectQueue.shift();

        expect(next?.table).toBe(table);

        if (table === Sites) {
          return {
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => next?.rows ?? []),
            })),
          };
        }

        if (table === SiteTags) {
          return {
            innerJoin: vi.fn((joinedTable: unknown) => {
              expect(joinedTable).toBe(TagDefinitions);

              return {
                where: vi.fn(async () => next?.rows ?? []),
              };
            }),
          };
        }

        return {
          where: vi.fn(async () => next?.rows ?? []),
        };
      },
    })) as unknown as typeof app.db.read.select;

    const response = await app.inject({
      method: 'GET',
      url: '/api/public/sites',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        items: [
          {
            id: 'site-1',
            bid: 'cloud-atlas',
            name: 'Cloud Atlas',
            url: 'https://cloud-atlas.example',
            sign: '记录基础设施与系统实验。',
            feedUrl: 'https://cloud-atlas.example/feed.xml',
            sitemap: 'https://cloud-atlas.example/sitemap.xml',
            linkPage: 'https://cloud-atlas.example/friends',
            featured: true,
            status: 'OK',
            accessScope: 'BOTH',
            joinTime: '2026-03-01T08:00:00.000Z',
            updateTime: '2026-03-25T08:00:00.000Z',
            latestPublishedTime: '2026-03-25T06:00:00.000Z',
            articleCount: 18,
            visitCount: 320,
            primaryTag: '技术',
            subTags: ['架构', '运维'],
          },
        ],
      },
    });
  });
});
