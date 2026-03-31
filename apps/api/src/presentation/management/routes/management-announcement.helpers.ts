import { ANNOUNCEMENT_STATUS_KEYS, Announcements, type AnnouncementStatusKey } from '@zhblogs/db';

import { and, eq, ne, or } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { hasManagementPermission } from '@/domain/auth/service/auth-role.service';
import { AuthError } from '@/domain/auth/types/auth.types';

import type { AnnouncementRow } from './management-announcement.schemas';

export const sendError = (reply: FastifyReply, statusCode: number, code: string, message: string) =>
  reply.code(statusCode).send({
    ok: false,
    error: {
      code,
      message,
    },
  });

export const requireAnnouncementManager = async (request: FastifyRequest): Promise<void> => {
  const user = await request.server.auth.getCurrentUser(request);

  if (!hasManagementPermission(user, 'announcement.manage')) {
    throw new AuthError('forbidden', 'announcement.manage required', 403);
  }
};

export const normalizeOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const normalizeRequiredString = (value: unknown): string | null => {
  const normalized = normalizeOptionalString(value);
  return normalized && normalized.length > 0 ? normalized : null;
};

export const isAnnouncementStatus = (value: unknown): value is AnnouncementStatusKey =>
  typeof value === 'string' &&
  ANNOUNCEMENT_STATUS_KEYS.includes(value as (typeof ANNOUNCEMENT_STATUS_KEYS)[number]);

export function parseOptionalDate(value: unknown): Date | null | 'invalid' {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? 'invalid' : parsed;
}

export function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function normalizePagination(page: number, pageSize: number, totalItems: number) {
  const normalizedPageSize = Math.min(50, Math.max(1, pageSize));
  const totalPages = Math.max(1, Math.ceil(totalItems / normalizedPageSize));
  const normalizedPage = Math.min(totalPages, Math.max(1, page));

  return {
    page: normalizedPage,
    pageSize: normalizedPageSize,
    totalItems,
    totalPages,
  };
}

export const readListPagination = (query: Record<string, unknown>) => ({
  page: toPositiveInt(typeof query.page === 'string' ? query.page : undefined, 1),
  pageSize: toPositiveInt(typeof query.pageSize === 'string' ? query.pageSize : undefined, 10),
});

export function serializeAnnouncement(record: AnnouncementRow) {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    status: record.status as AnnouncementStatusKey,
    publishTime: record.publishTime?.toISOString() ?? null,
    expireTime: record.expireTime?.toISOString() ?? null,
    expiredTime: record.expiredTime?.toISOString() ?? null,
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdTime: record.createdTime.toISOString(),
    updatedTime: record.updatedTime.toISOString(),
  };
}

const rangesOverlap = (
  leftStart: Date,
  leftEnd: Date | null,
  rightStart: Date,
  rightEnd: Date | null,
): boolean => {
  const leftEndTime = leftEnd?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightEndTime = rightEnd?.getTime() ?? Number.POSITIVE_INFINITY;

  return leftStart.getTime() < rightEndTime && rightStart.getTime() < leftEndTime;
};

export const isConstraintError = (error: unknown, constraintName: string): boolean =>
  error instanceof Error &&
  (error.message.includes(constraintName) ||
    error.message.includes(`constraint "${constraintName}"`));

export async function findOverlapConflict(
  app: FastifyInstance,
  status: AnnouncementStatusKey,
  publishTime: Date | null,
  expireTime: Date | null,
  currentId?: string,
): Promise<string | null> {
  if (!publishTime || (status !== 'SCHEDULED' && status !== 'PUBLISHED')) {
    return null;
  }

  const filters = [
    or(eq(Announcements.status, 'SCHEDULED'), eq(Announcements.status, 'PUBLISHED')),
  ];

  if (currentId) {
    filters.push(ne(Announcements.id, currentId));
  }

  const rows = await app.db.read
    .select({
      id: Announcements.id,
      publishTime: Announcements.publish_time,
      expireTime: Announcements.expire_time,
    })
    .from(Announcements)
    .where(and(...filters));

  const conflict = rows.find((row) =>
    row.publishTime
      ? rangesOverlap(publishTime, expireTime, row.publishTime, row.expireTime ?? null)
      : false,
  );

  return conflict?.id ?? null;
}
