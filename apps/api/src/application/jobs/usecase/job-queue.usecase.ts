import { type JOB_TRIGGER_SOURCE_KEYS, Jobs, type TASK_TYPE_KEYS } from '@zhblogs/db';

import { and, eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

const ALLOWED_QUEUES = ['queue:realtime', 'queue:ingest', 'queue:batch', 'queue:notify'] as const;

const SCHEDULE_SOURCES = new Set(['CHAIN', 'RETRY', 'SYSTEM']);

export type AllowedQueueName = (typeof ALLOWED_QUEUES)[number];

export interface EnqueueJobInput {
  task_type: (typeof TASK_TYPE_KEYS)[number];
  queue_name: AllowedQueueName;
  trigger_source: (typeof JOB_TRIGGER_SOURCE_KEYS)[number];
  payload: Record<string, unknown>;
  priority?: number;
  run_at?: Date;
  max_attempts?: number;
  dedupe_key?: string;
  trigger_key?: string;
  source_request_id?: string;
  parent_job_id?: string;
  root_job_id?: string;
}

export interface EnqueueJobResult {
  job_id: string;
  status: string;
  deduped: boolean;
  trigger_source: string;
}

export function isAllowedQueueName(value: string): value is AllowedQueueName {
  return ALLOWED_QUEUES.includes(value as AllowedQueueName);
}

function normalizeNullableString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildDedupeKey(input: EnqueueJobInput): string {
  const sourceRequestID = normalizeNullableString(input.source_request_id);

  if (sourceRequestID) {
    return `${input.task_type}:${input.queue_name}:${sourceRequestID}`;
  }

  const payloadSeed = JSON.stringify(input.payload);
  return `${input.task_type}:${input.queue_name}:${payloadSeed}`;
}

function validatePolicy(input: EnqueueJobInput): string | null {
  if (SCHEDULE_SOURCES.has(input.trigger_source)) {
    if (!normalizeNullableString(input.parent_job_id)) {
      return 'parent_job_id is required for CHAIN/RETRY/SYSTEM tasks';
    }

    if (!normalizeNullableString(input.root_job_id)) {
      return 'root_job_id is required for CHAIN/RETRY/SYSTEM tasks';
    }
  }

  return null;
}

export async function enqueueJob(
  app: FastifyInstance,
  input: EnqueueJobInput,
): Promise<EnqueueJobResult> {
  const policyError = validatePolicy(input);
  if (policyError) {
    throw new Error(`POLICY_VIOLATION:${policyError}`);
  }

  const dedupeKey = normalizeNullableString(input.dedupe_key) ?? buildDedupeKey(input);
  const runAt = input.run_at ?? new Date();
  const maxAttempts = input.max_attempts ?? 3;

  const insertedRows = await app.db.write
    .insert(Jobs)
    .values({
      task_type: input.task_type,
      queue_name: input.queue_name,
      trigger_source: input.trigger_source,
      trigger_key: normalizeNullableString(input.trigger_key),
      status: 'PENDING',
      priority: input.priority ?? 0,
      payload: input.payload,
      run_at: runAt,
      max_attempts: maxAttempts,
      dedupe_key: dedupeKey,
      parent_job_id: normalizeNullableString(input.parent_job_id),
      root_job_id: normalizeNullableString(input.root_job_id),
      result: {
        source_request_id: normalizeNullableString(input.source_request_id) ?? null,
      },
    })
    .onConflictDoNothing({ target: Jobs.dedupe_key })
    .returning({
      id: Jobs.id,
      status: Jobs.status,
      trigger_source: Jobs.trigger_source,
    });

  if (insertedRows.length > 0) {
    const row = insertedRows[0]!;
    return {
      job_id: row.id,
      status: row.status,
      deduped: false,
      trigger_source: row.trigger_source,
    };
  }

  const [existingRow] = await app.db.read
    .select({
      id: Jobs.id,
      status: Jobs.status,
      trigger_source: Jobs.trigger_source,
    })
    .from(Jobs)
    .where(eq(Jobs.dedupe_key, dedupeKey))
    .limit(1);

  if (!existingRow) {
    throw new Error('DUPLICATE_JOB:dedupe conflict detected but existing row was not found');
  }

  return {
    job_id: existingRow.id,
    status: existingRow.status,
    deduped: true,
    trigger_source: existingRow.trigger_source,
  };
}

export async function enqueueJobs(
  app: FastifyInstance,
  inputs: EnqueueJobInput[],
): Promise<{ created: EnqueueJobResult[]; failed: Array<{ index: number; error: string }> }> {
  const created: EnqueueJobResult[] = [];
  const failed: Array<{ index: number; error: string }> = [];

  for (const [index, input] of inputs.entries()) {
    try {
      created.push(await enqueueJob(app, input));
    } catch (error) {
      failed.push({
        index,
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
      });
    }
  }

  return { created, failed };
}

export async function retryDeadLetterJobs(
  app: FastifyInstance,
  jobIDs: string[],
): Promise<{ retried_count: number }> {
  if (jobIDs.length === 0) {
    return { retried_count: 0 };
  }

  const rows = await app.db.write
    .update(Jobs)
    .set({
      status: 'PENDING',
      run_at: new Date(),
      next_retry_time: null,
      locked_at: null,
      locked_by: null,
      heartbeat_time: null,
      error_code: null,
      error_message: null,
      finished_time: null,
      updated_time: new Date(),
    })
    .where(and(inArray(Jobs.id, jobIDs), eq(Jobs.status, 'DEAD_LETTER')))
    .returning({ id: Jobs.id });

  return {
    retried_count: rows.length,
  };
}
