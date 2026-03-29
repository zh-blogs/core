import {
  SiteAccessCounters,
  SiteAccessEvents,
  SiteFeedArticleStats,
  Sites,
  SiteTags,
  SiteWarningTags,
  TagDefinitions,
} from '@zhblogs/db';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTestApp } from '@tests/create-test-app';

function mockRandomQueries(
  app: ReturnType<typeof createTestApp>,
  options: {
    sites: unknown[];
    stats?: unknown[];
    access?: unknown[];
    tags?: unknown[];
    warnings?: unknown[];
    mainTags?: unknown[];
  },
) {
  app.db.read.select = vi.fn(() => ({
    from(table: unknown) {
      if (table === TagDefinitions) {
        return {
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => options.mainTags ?? []),
          })),
        };
      }

      if (table === Sites) {
        return {
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => options.sites),
          })),
        };
      }

      if (table === SiteFeedArticleStats) {
        return {
          where: vi.fn(async () => options.stats ?? []),
        };
      }

      if (table === SiteAccessCounters) {
        return {
          where: vi.fn(async () => options.access ?? []),
        };
      }

      if (table === SiteTags) {
        return {
          innerJoin: vi.fn((joinedTable: unknown) => {
            expect(joinedTable).toBe(TagDefinitions);

            return {
              where: vi.fn(async () => options.tags ?? []),
            };
          }),
        };
      }

      if (table === SiteWarningTags) {
        return {
          innerJoin: vi.fn((joinedTable: unknown) => {
            expect(joinedTable).toBe(TagDefinitions);

            return {
              where: vi.fn(() => ({
                orderBy: vi.fn(async () => options.warnings ?? []),
              })),
            };
          }),
        };
      }

      throw new Error('unexpected read query');
    },
  })) as unknown as typeof app.db.read.select;
}

describe('public site random route', () => {
  let app: ReturnType<typeof createTestApp> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('returns only safe sites when no filter is provided', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockRandomQueries(app, {
      mainTags: [
        { id: 'main-1', name: '技术', machineKey: null, tagType: 'MAIN' },
        { id: 'main-2', name: '生活', machineKey: null, tagType: 'MAIN' },
      ],
      sites: [
        {
          id: 'site-safe',
          bid: 'safe',
          name: 'Safe Site',
          url: 'https://safe.example',
          sign: '安全站点',
          defaultFeedUrl: 'https://safe.example/feed.xml',
          sitemap: null,
          linkPage: null,
          featured: false,
          status: 'OK',
          accessScope: 'BOTH',
          joinTime: new Date('2026-03-01T08:00:00.000Z'),
          updateTime: new Date('2026-03-25T08:00:00.000Z'),
          reason: null,
        },
        {
          id: 'site-down',
          bid: 'down',
          name: 'Down Site',
          url: 'https://down.example',
          sign: '异常站点',
          defaultFeedUrl: null,
          sitemap: null,
          linkPage: null,
          featured: true,
          status: 'DOWN',
          accessScope: 'BOTH',
          joinTime: new Date('2026-03-02T08:00:00.000Z'),
          updateTime: new Date('2026-03-20T08:00:00.000Z'),
          reason: null,
        },
        {
          id: 'site-warn',
          bid: 'warn',
          name: 'Warn Site',
          url: 'https://warn.example',
          sign: '告警站点',
          defaultFeedUrl: null,
          sitemap: null,
          linkPage: null,
          featured: false,
          status: 'OK',
          accessScope: 'BOTH',
          joinTime: new Date('2026-03-03T08:00:00.000Z'),
          updateTime: new Date('2026-03-18T08:00:00.000Z'),
          reason: null,
        },
      ],
      stats: [
        {
          site_id: 'site-safe',
          visible_articles: 12,
          total_articles: 12,
          latest_published_time: new Date('2026-03-24T08:00:00.000Z'),
        },
      ],
      access: [
        {
          site_id: 'site-safe',
          total: 80,
        },
      ],
      tags: [
        {
          site_id: 'site-safe',
          tagName: '技术',
          tagType: 'MAIN',
        },
        {
          site_id: 'site-warn',
          tagName: '生活',
          tagType: 'MAIN',
        },
      ],
      warnings: [
        {
          siteId: 'site-warn',
          source: 'MANUAL',
          note: 'warn',
          createdTime: new Date('2026-03-24T08:00:00.000Z'),
          id: 'warning-1',
          machineKey: 'EXTERNAL_LIMIT',
          name: '外部限制',
          description: 'warning',
        },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/public/sites/random',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: expect.objectContaining({
        failureReason: null,
        filters: {
          recommend: false,
          type: '',
        },
        availableTypes: ['技术', '生活'],
        site: expect.objectContaining({
          id: 'site-safe',
          name: 'Safe Site',
          status: 'OK',
          warningTags: [],
        }),
      }),
    });
  });

  it('returns UNKNOWN_PARAM for unsupported query keys', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockRandomQueries(app, {
      mainTags: [{ id: 'main-1', name: '技术', machineKey: null, tagType: 'MAIN' }],
      sites: [],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/public/sites/random?foo=bar',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.failureReason).toBe('UNKNOWN_PARAM');
    expect(response.json().data.site).toBeNull();
  });

  it('returns INVALID_RECOMMEND for unsupported recommend values', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockRandomQueries(app, {
      mainTags: [{ id: 'main-1', name: '技术', machineKey: null, tagType: 'MAIN' }],
      sites: [],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/public/sites/random?recommend=false',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.failureReason).toBe('INVALID_RECOMMEND');
  });

  it('returns INVALID_TYPE for unknown main tags', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockRandomQueries(app, {
      mainTags: [{ id: 'main-1', name: '技术', machineKey: null, tagType: 'MAIN' }],
      sites: [],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/public/sites/random?type=%E8%AE%BE%E8%AE%A1',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.failureReason).toBe('INVALID_TYPE');
  });

  it('returns INVALID_PARAMS when recommend and type are both invalid', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockRandomQueries(app, {
      mainTags: [{ id: 'main-1', name: '技术', machineKey: null, tagType: 'MAIN' }],
      sites: [],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/public/sites/random?recommend=false&type=%E8%AE%BE%E8%AE%A1',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.failureReason).toBe('INVALID_PARAMS');
    expect(response.json().data.site).toBeNull();
  });

  it('returns NO_MATCH when valid filters produce no safe candidates', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    mockRandomQueries(app, {
      mainTags: [{ id: 'main-1', name: '技术', machineKey: null, tagType: 'MAIN' }],
      sites: [
        {
          id: 'site-1',
          bid: 'site-1',
          name: 'Site 1',
          url: 'https://site-1.example',
          sign: '技术站点',
          defaultFeedUrl: null,
          sitemap: null,
          linkPage: null,
          featured: false,
          status: 'OK',
          accessScope: 'BOTH',
          joinTime: new Date('2026-03-01T08:00:00.000Z'),
          updateTime: new Date('2026-03-25T08:00:00.000Z'),
          reason: null,
        },
      ],
      tags: [
        {
          site_id: 'site-1',
          tagName: '技术',
          tagType: 'MAIN',
        },
      ],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/public/sites/random?recommend=true&type=%E6%8A%80%E6%9C%AF',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.failureReason).toBe('NO_MATCH');
    expect(response.json().data.site).toBeNull();
  });
});

describe('public site access event route', () => {
  let app: ReturnType<typeof createTestApp> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('records outbound click events for public sites', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    app.db.read.select = vi.fn(() => ({
      from(table: unknown) {
        expect(table).toBe(Sites);

        return {
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ id: 'site-1' }]),
          })),
        };
      },
    })) as unknown as typeof app.db.read.select;

    let insertedValues: unknown;
    app.db.write.insert = vi.fn((table: unknown) => {
      expect(table).toBe(SiteAccessEvents);

      return {
        values: vi.fn(async (values) => {
          insertedValues = values;
        }),
      };
    }) as unknown as typeof app.db.write.insert;

    const response = await app.inject({
      method: 'POST',
      url: '/api/public/sites/4ffb6f48-63d1-4e3a-9c36-b9fc86dd65c0/access-events',
      headers: {
        'content-type': 'application/json',
        referer: 'https://www.zhblogs.net/site/go?recommend=true',
        origin: 'https://www.zhblogs.net',
        'user-agent': 'vitest',
      },
      payload: {
        source: 'SITE_GO',
        targetKind: 'SITE',
        path: '/site/go?recommend=true',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        recorded: true,
      },
    });
    expect(insertedValues).toEqual({
      site_id: '4ffb6f48-63d1-4e3a-9c36-b9fc86dd65c0',
      event_type: 'OUTBOUND_CLICK',
      source: 'SITE_GO:SITE',
      referer_host: 'www.zhblogs.net',
      path: '/site/go?recommend=true',
      user_agent: 'vitest',
    });
  });

  it('rejects invalid request bodies', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/public/sites/4ffb6f48-63d1-4e3a-9c36-b9fc86dd65c0/access-events',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        source: 'SITE_GO',
        targetKind: 'SITE',
        path: '',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_BODY');
  });

  it('returns 404 when the site is not public', async () => {
    app = createTestApp({
      disableExternalServices: true,
    });

    await app.ready();

    app.db.read.select = vi.fn(() => ({
      from(table: unknown) {
        expect(table).toBe(Sites);

        return {
          where: vi.fn(() => ({
            limit: vi.fn(async () => []),
          })),
        };
      },
    })) as unknown as typeof app.db.read.select;

    const response = await app.inject({
      method: 'POST',
      url: '/api/public/sites/4ffb6f48-63d1-4e3a-9c36-b9fc86dd65c0/access-events',
      headers: {
        'content-type': 'application/json',
      },
      payload: {
        source: 'SITE_DETAIL',
        targetKind: 'ARTICLE',
        path: '/site/4ffb6f48-63d1-4e3a-9c36-b9fc86dd65c0',
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('SITE_NOT_FOUND');
  });
});
