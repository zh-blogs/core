import { Jobs } from '@zhblogs/db';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEST_CONFIG, TEST_HEADERS } from '@tests/config';
import { createTestApp } from '@tests/create-test-app';

describe('internal jobs routes', () => {
  let app: ReturnType<typeof createTestApp> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('rejects requests without internal token', async () => {
    app = createTestApp({
      disableExternalServices: true,
      envOverrides: {
        API_INTERNAL_TOKEN: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
    });

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/jobs',
      payload: {
        task_type: 'SITE_CHECK',
        queue_name: 'queue:realtime',
        trigger_source: 'MANUAL',
        payload: { site_id: 'a' },
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid internal token.',
      },
    });
  });

  it('creates a job through internal enqueue endpoint', async () => {
    app = createTestApp({
      disableExternalServices: true,
      envOverrides: {
        API_INTERNAL_TOKEN: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
    });

    await app.ready();

    app.db.write.insert = vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(async () => [
            {
              id: 'job-created-id',
              status: 'PENDING',
              trigger_source: 'MANUAL',
            },
          ]),
        })),
      })),
    })) as unknown as typeof app.db.write.insert;

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/jobs',
      headers: {
        [TEST_HEADERS.internalToken]: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
      payload: {
        task_type: 'SITE_CHECK',
        queue_name: 'queue:realtime',
        trigger_source: 'MANUAL',
        payload: {
          site_id: '11111111-1111-4111-8111-111111111111',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        job_id: 'job-created-id',
        status: 'PENDING',
        deduped: false,
        trigger_source: 'MANUAL',
      },
    });
  });

  it('returns deduped result when dedupe key already exists', async () => {
    app = createTestApp({
      disableExternalServices: true,
      envOverrides: {
        API_INTERNAL_TOKEN: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
    });

    await app.ready();

    app.db.write.insert = vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: vi.fn(async () => []),
        })),
      })),
    })) as unknown as typeof app.db.write.insert;

    app.db.read.select = vi.fn(() => ({
      from: vi.fn((table: unknown) => {
        expect(table).toBe(Jobs);
        return {
          where: vi.fn(() => ({
            limit: vi.fn(async () => [
              {
                id: 'job-existing-id',
                status: 'PENDING',
                trigger_source: 'MANUAL',
              },
            ]),
          })),
        };
      }),
    })) as unknown as typeof app.db.read.select;

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/jobs',
      headers: {
        [TEST_HEADERS.internalToken]: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
      payload: {
        task_type: 'SITE_CHECK',
        queue_name: 'queue:realtime',
        trigger_source: 'MANUAL',
        dedupe_key: 'dedupe-key-1',
        payload: {
          site_id: '11111111-1111-4111-8111-111111111111',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        job_id: 'job-existing-id',
        status: 'PENDING',
        deduped: true,
        trigger_source: 'MANUAL',
      },
    });
  });

  it('rejects CHAIN jobs when parent/root ids are missing', async () => {
    app = createTestApp({
      disableExternalServices: true,
      envOverrides: {
        API_INTERNAL_TOKEN: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
    });

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/jobs',
      headers: {
        [TEST_HEADERS.internalToken]: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
      payload: {
        task_type: 'RSS_FETCH',
        queue_name: 'queue:ingest',
        trigger_source: 'CHAIN',
        payload: {
          site_id: '11111111-1111-4111-8111-111111111111',
        },
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'POLICY_VIOLATION',
        message: 'parent_job_id is required for CHAIN/RETRY/SYSTEM tasks',
      },
    });
  });

  it('rejects batch enqueue when any item has unsupported queue', async () => {
    app = createTestApp({
      disableExternalServices: true,
      envOverrides: {
        API_INTERNAL_TOKEN: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
    });

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/jobs/batch',
      headers: {
        [TEST_HEADERS.internalToken]: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
      payload: {
        items: [
          {
            task_type: 'SITE_CHECK',
            queue_name: 'queue:realtime',
            trigger_source: 'MANUAL',
            payload: {
              site_id: '11111111-1111-4111-8111-111111111111',
            },
          },
          {
            task_type: 'RSS_FETCH',
            queue_name: 'queue:unknown',
            trigger_source: 'MANUAL',
            payload: {
              site_id: '11111111-1111-4111-8111-111111111111',
            },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      ok: false,
      error: {
        code: 'QUEUE_NOT_FOUND',
        message: 'Unsupported queue_name.',
        fields: ['items.1.queue_name'],
      },
    });
  });

  it('retries dead-letter jobs through internal endpoint', async () => {
    app = createTestApp({
      disableExternalServices: true,
      envOverrides: {
        API_INTERNAL_TOKEN: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
    });

    await app.ready();

    app.db.write.update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => [{ id: 'j1' }, { id: 'j2' }]),
        })),
      })),
    })) as unknown as typeof app.db.write.update;

    const response = await app.inject({
      method: 'POST',
      url: '/api/internal/jobs/retry-dead-letter',
      headers: {
        [TEST_HEADERS.internalToken]: TEST_CONFIG.API_INTERNAL_TOKEN,
      },
      payload: {
        job_ids: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        retried_count: 2,
      },
    });
  });
});
