import { SiteWarningTags, TagDefinitions } from '@zhblogs/db';

import type { FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import {
  getWarningTagByMachineKey,
  listSiteWarningTagsBySiteIds,
  upsertSiteWarningTag,
} from '@/application/sites/usecase/site-warning-tag.usecase';

type SelectChain = {
  from: (table: unknown) => unknown;
};

type MockApp = FastifyInstance & {
  db: {
    read: {
      select: ReturnType<typeof vi.fn<() => SelectChain>>;
    };
    write: {
      insert: ReturnType<typeof vi.fn>;
    };
  };
};

function createMockApp(): MockApp {
  return {
    db: {
      read: {
        select: vi.fn<() => SelectChain>(),
      },
      write: {
        insert: vi.fn(),
      },
    },
  } as unknown as MockApp;
}

describe('site warning tag usecase', () => {
  it('resolves warning tag definitions by machine key', async () => {
    const app = createMockApp();

    app.db.read.select.mockImplementation(() => ({
      from(table: unknown) {
        expect(table).toBe(TagDefinitions);

        return {
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: 'warning-tag-1',
                machineKey: 'EXTERNAL_LIMIT',
                name: '外部限制',
                description: '网站受地区限制、防火墙或外部网络策略影响',
              },
            ]),
          })),
        };
      },
    }));

    await expect(getWarningTagByMachineKey(app, 'EXTERNAL_LIMIT')).resolves.toEqual({
      id: 'warning-tag-1',
      machineKey: 'EXTERNAL_LIMIT',
      name: '外部限制',
      description: '网站受地区限制、防火墙或外部网络策略影响',
    });
  });

  it('upserts site warning tags by resolved tag id', async () => {
    const app = createMockApp();

    app.db.read.select.mockImplementation(() => ({
      from(table: unknown) {
        expect(table).toBe(TagDefinitions);

        return {
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: 'warning-tag-1',
                machineKey: 'EXTERNAL_LIMIT',
                name: '外部限制',
                description: '网站受地区限制、防火墙或外部网络策略影响',
              },
            ]),
          })),
        };
      },
    }));

    app.db.write.insert.mockImplementation((table: unknown) => {
      expect(table).toBe(SiteWarningTags);

      return {
        values: vi.fn((value: unknown) => {
          expect(value).toMatchObject({
            site_id: 'site-1',
            tag_id: 'warning-tag-1',
            source: 'MANUAL',
            note: '管理员确认',
          });

          return {
            onConflictDoUpdate: vi.fn(() => ({
              returning: vi.fn(async () => [
                {
                  siteId: 'site-1',
                  source: 'MANUAL',
                  note: '管理员确认',
                },
              ]),
            })),
          };
        }),
      };
    });

    await expect(
      upsertSiteWarningTag(app, {
        siteId: 'site-1',
        machineKey: 'EXTERNAL_LIMIT',
        source: 'MANUAL',
        note: '管理员确认',
      }),
    ).resolves.toEqual({
      id: 'warning-tag-1',
      machineKey: 'EXTERNAL_LIMIT',
      name: '外部限制',
      description: '网站受地区限制、防火墙或外部网络策略影响',
      siteId: 'site-1',
      source: 'MANUAL',
      note: '管理员确认',
    });
  });

  it('lists warning tags for multiple sites', async () => {
    const app = createMockApp();

    app.db.read.select.mockImplementation(() => ({
      from(table: unknown) {
        expect(table).toBe(SiteWarningTags);

        return {
          innerJoin: vi.fn((joinedTable: unknown) => {
            expect(joinedTable).toBe(TagDefinitions);

            return {
              where: vi.fn(() => ({
                orderBy: vi.fn(async () => [
                  {
                    siteId: 'site-1',
                    source: 'MANUAL',
                    note: '管理员确认',
                    id: 'warning-tag-1',
                    machineKey: 'EXTERNAL_LIMIT',
                    name: '外部限制',
                    description: '网站受地区限制、防火墙或外部网络策略影响',
                  },
                ]),
              })),
            };
          }),
        };
      },
    }));

    await expect(listSiteWarningTagsBySiteIds(app, ['site-1'])).resolves.toEqual([
      {
        siteId: 'site-1',
        source: 'MANUAL',
        note: '管理员确认',
        id: 'warning-tag-1',
        machineKey: 'EXTERNAL_LIMIT',
        name: '外部限制',
        description: '网站受地区限制、防火墙或外部网络策略影响',
      },
    ]);
  });

  it('batches site id queries when the public list grows large', async () => {
    const app = createMockApp();
    let selectCallCount = 0;

    app.db.read.select.mockImplementation(() => {
      selectCallCount += 1;

      return {
        from(table: unknown) {
          expect(table).toBe(SiteWarningTags);

          return {
            innerJoin: vi.fn((joinedTable: unknown) => {
              expect(joinedTable).toBe(TagDefinitions);

              return {
                where: vi.fn(() => ({
                  orderBy: vi.fn(async () => [
                    {
                      siteId: `site-batch-${selectCallCount}`,
                      source: 'MANUAL',
                      note: `batch ${selectCallCount}`,
                      createdTime: new Date(`2026-03-27T00:00:0${selectCallCount}Z`),
                      id: `warning-tag-${selectCallCount}`,
                      machineKey: 'EXTERNAL_LIMIT',
                      name: '外部限制',
                      description: '网站受地区限制、防火墙或外部网络策略影响',
                    },
                  ]),
                })),
              };
            }),
          };
        },
      };
    });

    const siteIds = Array.from({ length: 501 }, (_, index) => `site-${index + 1}`);

    await expect(listSiteWarningTagsBySiteIds(app, siteIds)).resolves.toEqual([
      {
        siteId: 'site-batch-1',
        source: 'MANUAL',
        note: 'batch 1',
        id: 'warning-tag-1',
        machineKey: 'EXTERNAL_LIMIT',
        name: '外部限制',
        description: '网站受地区限制、防火墙或外部网络策略影响',
      },
      {
        siteId: 'site-batch-2',
        source: 'MANUAL',
        note: 'batch 2',
        id: 'warning-tag-2',
        machineKey: 'EXTERNAL_LIMIT',
        name: '外部限制',
        description: '网站受地区限制、防火墙或外部网络策略影响',
      },
    ]);
    expect(selectCallCount).toBe(2);
  });
});
