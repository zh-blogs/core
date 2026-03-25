import { JOB_TRIGGER_SOURCE_KEYS, TASK_TYPE_KEYS } from '@zhblogs/db';

import { z } from 'zod';

export const enqueueItemSchema = z.object({
  task_type: z.enum(TASK_TYPE_KEYS),
  queue_name: z.string().min(1),
  trigger_source: z.enum(JOB_TRIGGER_SOURCE_KEYS),
  payload: z.record(z.string(), z.unknown()),
  priority: z.number().int().optional(),
  run_at: z.coerce.date().optional(),
  max_attempts: z.number().int().positive().optional(),
  dedupe_key: z.string().trim().optional(),
  trigger_key: z.string().trim().optional(),
  source_request_id: z.string().trim().optional(),
  parent_job_id: z.uuid().optional(),
  root_job_id: z.uuid().optional(),
});

export const batchSchema = z.object({
  items: z.array(enqueueItemSchema).min(1).max(200),
});

export const retryDeadLetterSchema = z.object({
  job_ids: z.array(z.uuid()).min(1).max(200),
});
