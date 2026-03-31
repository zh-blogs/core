import { Announcements } from '@zhblogs/db';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_AUTH_COOKIES } from '../config';

import {
  type AnnouncementTestApp,
  baseAdminUser,
  createAnnouncementTestApp,
} from './announcement-management.shared';

describe('announcement management list routes', () => {
  let app: AnnouncementTestApp | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  const getApp = () => {
    if (!app) {
      throw new Error('app not initialized');
    }

    return app;
  };

  const mockAnnouncementListSelect = (items: Array<Record<string, unknown>>) => {
    const currentApp = getApp();
    currentApp.db.read.select = vi.fn((fields?: Record<string, unknown>) => {
      if (fields && 'total' in fields) {
        return {
          from(table: unknown) {
            expect(table).toBe(Announcements);

            return Promise.resolve([
              {
                total: 12,
              },
            ]);
          },
        };
      }

      return {
        from(table: unknown) {
          expect(table).toBe(Announcements);

          return {
            orderBy: vi.fn(() => ({
              limit: vi.fn((limitValue: number) => {
                expect(limitValue).toBe(5);

                return {
                  offset: vi.fn(async (offsetValue: number) => {
                    expect(offsetValue).toBe(5);

                    return items;
                  }),
                };
              }),
            })),
          };
        },
      };
    }) as unknown as typeof currentApp.db.read.select;
  };

  const expectedListResponse = {
    ok: true,
    data: {
      items: [
        {
          id: 'announcement-2',
          title: 'Announcement 2',
          content: 'Body',
          status: 'PUBLISHED',
          publishTime: '2026-03-29T10:00:00.000Z',
          expireTime: null,
          expiredTime: null,
          createdBy: baseAdminUser.id,
          updatedBy: baseAdminUser.id,
          createdTime: '2026-03-29T09:00:00.000Z',
          updatedTime: '2026-03-29T11:00:00.000Z',
        },
      ],
      pagination: {
        page: 2,
        pageSize: 5,
        totalItems: 12,
        totalPages: 3,
      },
    },
  };

  const expectListResponse = (response: { statusCode: number; json: () => unknown }) => {
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expectedListResponse);
  };

  it('protects announcement routes from admins without announcement.manage', async () => {
    app = await createAnnouncementTestApp();
    const currentApp = getApp();

    const response = await currentApp.inject({
      method: 'GET',
      url: '/api/management/announcements',
      cookies: {
        [TEST_AUTH_COOKIES.access]: 'admin-token',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns paginated management announcement list', async () => {
    app = await createAnnouncementTestApp(['announcement.manage']);
    const currentApp = getApp();

    mockAnnouncementListSelect([
      {
        id: 'announcement-2',
        title: 'Announcement 2',
        content: 'Body',
        status: 'PUBLISHED',
        publishTime: new Date('2026-03-29T10:00:00.000Z'),
        expireTime: null,
        expiredTime: null,
        createdBy: baseAdminUser.id,
        updatedBy: baseAdminUser.id,
        createdTime: new Date('2026-03-29T09:00:00.000Z'),
        updatedTime: new Date('2026-03-29T11:00:00.000Z'),
      },
    ]);

    const response = await currentApp.inject({
      method: 'GET',
      url: '/api/management/announcements?page=2&pageSize=5',
      cookies: {
        [TEST_AUTH_COOKIES.access]: 'admin-token',
      },
    });

    expectListResponse(response);
  });
});
