import { Jobs } from '@zhblogs/db';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { enqueueJob, retryDeadLetterJobs } from '@/application/jobs/usecase/job-queue.usecase';
import { createTestApp } from '@tests/create-test-app';

describe('jobs service', () => {
  let app: ReturnType<typeof createTestApp> | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
    app = undefined;
  });

  it('builds dedupe key from source_request_id when missing explicit dedupe_key', async () => {
    app = createTestApp({ disableExternalServices: true });
    await app.ready();

    let capturedDedupeKey = '';

    app.db.write.insert = vi.fn(() => ({
      values: vi.fn((row: { dedupe_key?: string }) => {
        capturedDedupeKey = String(row.dedupe_key ?? '');
        return {
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(async () => [
              {
                id: 'job-created-id',
                status: 'PENDING',
                trigger_source: 'MANUAL',
              },
            ]),
          })),
        };
      }),
    })) as unknown as typeof app.db.write.insert;

    const result = await enqueueJob(app, {
      task_type: 'SITE_CHECK',
      queue_name: 'queue:realtime',
      trigger_source: 'MANUAL',
      payload: {
        site_id: '11111111-1111-4111-8111-111111111111',
      },
      source_request_id: 'req-1',
    });

    expect(capturedDedupeKey).toBe('SITE_CHECK:queue:realtime:req-1');
    expect(result).toEqual({
      job_id: 'job-created-id',
      status: 'PENDING',
      deduped: false,
      trigger_source: 'MANUAL',
    });
  });

  it('returns deduped row when conflict occurs', async () => {
    app = createTestApp({ disableExternalServices: true });
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
                status: 'RUNNING',
                trigger_source: 'SYSTEM',
              },
            ]),
          })),
        };
      }),
    })) as unknown as typeof app.db.read.select;

    const result = await enqueueJob(app, {
      task_type: 'RSS_FETCH',
      queue_name: 'queue:ingest',
      trigger_source: 'MANUAL',
      payload: {
        site_id: '11111111-1111-4111-8111-111111111111',
      },
      dedupe_key: 'same-job',
    });

    expect(result).toEqual({
      job_id: 'job-existing-id',
      status: 'RUNNING',
      deduped: true,
      trigger_source: 'SYSTEM',
    });
  });

  it('requires parent/root ids for CHAIN source', async () => {
    app = createTestApp({ disableExternalServices: true });
    await app.ready();

    await expect(
      enqueueJob(app, {
        task_type: 'RSS_FETCH',
        queue_name: 'queue:ingest',
        trigger_source: 'CHAIN',
        payload: {
          site_id: '11111111-1111-4111-8111-111111111111',
        },
      }),
    ).rejects.toThrow('POLICY_VIOLATION:parent_job_id is required for CHAIN/RETRY/SYSTEM tasks');
  });

  it('returns zero dead-letter retries for empty ids', async () => {
    app = createTestApp({ disableExternalServices: true });
    await app.ready();

    const result = await retryDeadLetterJobs(app, []);
    expect(result).toEqual({ retried_count: 0 });
  });
});
