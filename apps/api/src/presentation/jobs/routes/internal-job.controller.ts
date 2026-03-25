import type { FastifyInstance } from 'fastify';

import {
  type AllowedQueueName,
  enqueueJob,
  enqueueJobs,
  isAllowedQueueName,
  retryDeadLetterJobs,
} from '@/application/jobs/usecase/job-queue.usecase';

import { batchSchema, enqueueItemSchema, retryDeadLetterSchema } from '../dto/job-request.dto';

import { ensureInternalToken, parseEnqueueError, sendError } from './job-route.service';

export function registerInternalJobRoutes(app: FastifyInstance) {
  app.post('/api/internal/jobs', async (request, reply) => {
    if (!ensureInternalToken(request, app)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Invalid internal token.');
    }

    const parsed = enqueueItemSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'INVALID_PAYLOAD', 'Invalid enqueue payload.');
    }

    const payload = parsed.data;
    if (!isAllowedQueueName(payload.queue_name)) {
      return sendError(reply, 404, 'QUEUE_NOT_FOUND', 'Unsupported queue_name.');
    }

    try {
      const data = await enqueueJob(app, {
        ...payload,
        queue_name: payload.queue_name,
      });

      return {
        ok: true,
        data,
      };
    } catch (error) {
      return parseEnqueueError(reply, error);
    }
  });

  app.post('/api/internal/jobs/batch', async (request, reply) => {
    if (!ensureInternalToken(request, app)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Invalid internal token.');
    }

    const parsed = batchSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'INVALID_PAYLOAD', 'Invalid batch enqueue payload.');
    }

    const invalidQueueIndex = parsed.data.items.findIndex(
      (item) => !isAllowedQueueName(item.queue_name),
    );

    if (invalidQueueIndex >= 0) {
      return sendError(reply, 404, 'QUEUE_NOT_FOUND', 'Unsupported queue_name.', [
        `items.${invalidQueueIndex}.queue_name`,
      ]);
    }

    try {
      const normalizedItems = parsed.data.items.map((item) => ({
        ...item,
        queue_name: item.queue_name as AllowedQueueName,
      }));

      const result = await enqueueJobs(app, normalizedItems);

      return {
        ok: true,
        data: {
          created: result.created,
          failed_items: result.failed,
        },
      };
    } catch (error) {
      return parseEnqueueError(reply, error);
    }
  });

  app.post('/api/internal/jobs/retry-dead-letter', async (request, reply) => {
    if (!ensureInternalToken(request, app)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Invalid internal token.');
    }

    const parsed = retryDeadLetterSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError(reply, 400, 'INVALID_PAYLOAD', 'Invalid dead-letter retry payload.');
    }

    try {
      return {
        ok: true,
        data: await retryDeadLetterJobs(app, parsed.data.job_ids),
      };
    } catch {
      return sendError(reply, 503, 'STORAGE_UNAVAILABLE', 'Unable to retry dead-letter jobs.');
    }
  });
}
