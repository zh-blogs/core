import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  readAnnouncementArchive,
  readCurrentAnnouncement,
} from '@/application/announcement/announcement.server';

describe('announcement server readers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads current announcement payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              data: {
                id: 'announcement-1',
                title: 'Current',
                content: 'Current body',
                publishTime: '2026-03-29T10:00:00.000Z',
              },
            }),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          ),
      ),
    );

    await expect(readCurrentAnnouncement()).resolves.toEqual({
      id: 'announcement-1',
      title: 'Current',
      content: 'Current body',
      publishTime: '2026-03-29T10:00:00.000Z',
    });
  });

  it('reads paged announcement archive payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              ok: true,
              data: {
                items: [
                  {
                    id: 'announcement-1',
                    title: 'Current',
                    content: 'Body',
                    status: 'PUBLISHED',
                    publishTime: '2026-03-29T10:00:00.000Z',
                    expireTime: null,
                  },
                ],
                pagination: {
                  page: 2,
                  pageSize: 20,
                  totalItems: 21,
                  totalPages: 2,
                },
              },
            }),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          ),
      ),
    );

    await expect(readAnnouncementArchive(2, 20)).resolves.toEqual({
      items: [
        {
          id: 'announcement-1',
          title: 'Current',
          content: 'Body',
          status: 'PUBLISHED',
          publishTime: '2026-03-29T10:00:00.000Z',
          expireTime: null,
        },
      ],
      pagination: {
        page: 2,
        pageSize: 20,
        totalItems: 21,
        totalPages: 2,
      },
    });
  });
});
