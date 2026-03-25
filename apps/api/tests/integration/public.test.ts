import { Announcements, SiteFeedArticleStats, Sites } from '@zhblogs/db';

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
});
