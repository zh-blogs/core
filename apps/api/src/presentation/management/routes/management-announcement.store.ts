import { Announcements, type AnnouncementStatusKey } from '@zhblogs/db';

import { desc, eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import {
  isAnnouncementStatus,
  normalizeOptionalString,
  type normalizePagination,
  normalizeRequiredString,
  parseOptionalDate,
} from './management-announcement.helpers';
import type { AnnouncementBody, AnnouncementRow } from './management-announcement.schemas';

export type SaveError = {
  statusCode: number;
  code: string;
  message: string;
};

export type AnnouncementSavePayload = {
  title: string;
  content: string | null;
  status: AnnouncementStatusKey;
  publishTime: Date | null;
  expireTime: Date | null;
};

type SavePayloadResult = { error: SaveError } | { payload: AnnouncementSavePayload };

export const loadAnnouncementTotal = async (app: FastifyInstance): Promise<number> => {
  const [countRow] = await app.db.read
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(Announcements);

  return countRow?.total ?? 0;
};

export const loadAnnouncementRows = async (
  app: FastifyInstance,
  pagination: ReturnType<typeof normalizePagination>,
): Promise<AnnouncementRow[]> =>
  app.db.read
    .select({
      id: Announcements.id,
      title: Announcements.title,
      content: Announcements.content,
      status: Announcements.status,
      publishTime: Announcements.publish_time,
      expireTime: Announcements.expire_time,
      expiredTime: Announcements.expired_time,
      createdBy: Announcements.created_by,
      updatedBy: Announcements.updated_by,
      createdTime: Announcements.created_time,
      updatedTime: Announcements.updated_time,
    })
    .from(Announcements)
    .orderBy(sql`${Announcements.publish_time} desc nulls last`, desc(Announcements.created_time))
    .limit(pagination.pageSize)
    .offset((pagination.page - 1) * pagination.pageSize);

export const buildSaveValidationError = (
  statusCode: number,
  code: string,
  message: string,
): SaveError => ({
  statusCode,
  code,
  message,
});

const validateAnnouncementTiming = (
  status: AnnouncementStatusKey,
  publishTime: Date | null,
  expireTime: Date | null,
  now: Date,
): SaveError | null => {
  if ((status === 'SCHEDULED' || status === 'EXPIRED') && !publishTime) {
    return buildSaveValidationError(
      400,
      'PUBLISH_TIME_REQUIRED',
      'publish_time is required for scheduled and expired announcements.',
    );
  }

  if (status === 'SCHEDULED' && publishTime && publishTime.getTime() <= now.getTime()) {
    return buildSaveValidationError(
      400,
      'INVALID_SCHEDULE_TIME',
      'Scheduled announcements must have a future publish_time.',
    );
  }

  if (status === 'PUBLISHED' && publishTime && publishTime.getTime() > now.getTime()) {
    return buildSaveValidationError(
      400,
      'INVALID_PUBLISH_TIME',
      'Published announcements cannot have a future publish_time.',
    );
  }

  if (status === 'EXPIRED' && publishTime && publishTime.getTime() > now.getTime()) {
    return buildSaveValidationError(
      400,
      'INVALID_EXPIRED_TIME',
      'Expired announcements must have a past publish_time.',
    );
  }

  if (publishTime && expireTime && expireTime.getTime() < publishTime.getTime()) {
    return buildSaveValidationError(
      400,
      'INVALID_EXPIRE_TIME',
      'expire_time must be greater than or equal to publish_time.',
    );
  }

  return null;
};

export const buildSavePayload = (body: AnnouncementBody, now: Date): SavePayloadResult => {
  const title = normalizeRequiredString(body.title);
  const content = normalizeOptionalString(body.content);
  const status = isAnnouncementStatus(body.status) ? body.status : null;
  const parsedPublishTime = parseOptionalDate(body.publish_time);
  const expireTime = parseOptionalDate(body.expire_time);

  if (!title || !status) {
    return {
      error: buildSaveValidationError(400, 'INVALID_BODY', 'title and status are required.'),
    };
  }

  if (parsedPublishTime === 'invalid' || expireTime === 'invalid') {
    return {
      error: buildSaveValidationError(
        400,
        'INVALID_BODY',
        'publish_time or expire_time is invalid.',
      ),
    };
  }

  const publishTime = status === 'PUBLISHED' && !parsedPublishTime ? now : parsedPublishTime;
  const timingError = validateAnnouncementTiming(status, publishTime, expireTime, now);

  if (timingError) {
    return { error: timingError };
  }

  return {
    payload: {
      title,
      content,
      status,
      publishTime,
      expireTime,
    } satisfies AnnouncementSavePayload,
  };
};

const loadAnnouncementStatus = async (
  app: FastifyInstance,
  announcementId: string,
): Promise<AnnouncementStatusKey | null> => {
  const [existing] = await app.db.read
    .select({
      id: Announcements.id,
      status: Announcements.status,
    })
    .from(Announcements)
    .where(eq(Announcements.id, announcementId))
    .limit(1);

  return existing ? (existing.status as AnnouncementStatusKey) : null;
};

export const validateDraftRevert = async (
  app: FastifyInstance,
  announcementId: string | undefined,
  nextStatus: AnnouncementStatusKey,
): Promise<SaveError | null> => {
  if (!announcementId) {
    return null;
  }

  const currentStatus = await loadAnnouncementStatus(app, announcementId);

  if (!currentStatus) {
    return buildSaveValidationError(
      404,
      'ANNOUNCEMENT_NOT_FOUND',
      'The target announcement does not exist.',
    );
  }

  if (currentStatus !== 'DRAFT' && nextStatus === 'DRAFT') {
    return buildSaveValidationError(
      409,
      'ANNOUNCEMENT_DRAFT_FORBIDDEN',
      'Published or scheduled announcements cannot be reverted to draft.',
    );
  }

  return null;
};

export const buildAnnouncementValues = (
  payload: AnnouncementSavePayload,
  actorId: string,
  now: Date,
) => ({
  title: payload.title,
  content: payload.content,
  status: payload.status,
  publish_time: payload.publishTime,
  expire_time: payload.expireTime,
  expired_time: payload.status === 'EXPIRED' ? now : null,
  updated_by: actorId,
  updated_time: now,
});

export const updateAnnouncement = async (
  app: FastifyInstance,
  announcementId: string,
  values: ReturnType<typeof buildAnnouncementValues>,
) =>
  app.db.write
    .update(Announcements)
    .set(values)
    .where(eq(Announcements.id, announcementId))
    .returning({
      id: Announcements.id,
      title: Announcements.title,
      content: Announcements.content,
      status: Announcements.status,
      publishTime: Announcements.publish_time,
      expireTime: Announcements.expire_time,
      expiredTime: Announcements.expired_time,
      createdBy: Announcements.created_by,
      updatedBy: Announcements.updated_by,
      createdTime: Announcements.created_time,
      updatedTime: Announcements.updated_time,
    });

export const createAnnouncement = async (
  app: FastifyInstance,
  values: ReturnType<typeof buildAnnouncementValues>,
  actorId: string,
) =>
  app.db.write
    .insert(Announcements)
    .values({
      ...values,
      created_by: actorId,
    })
    .returning({
      id: Announcements.id,
      title: Announcements.title,
      content: Announcements.content,
      status: Announcements.status,
      publishTime: Announcements.publish_time,
      expireTime: Announcements.expire_time,
      expiredTime: Announcements.expired_time,
      createdBy: Announcements.created_by,
      updatedBy: Announcements.updated_by,
      createdTime: Announcements.created_time,
      updatedTime: Announcements.updated_time,
    });

export const buildArchiveEligibilityError = (): SaveError =>
  buildSaveValidationError(
    409,
    'ANNOUNCEMENT_ARCHIVE_FORBIDDEN',
    'Only currently active published announcements can be archived.',
  );

export const loadAnnouncementById = async (app: FastifyInstance, id: string) =>
  app.db.read
    .select({
      id: Announcements.id,
      title: Announcements.title,
      content: Announcements.content,
      status: Announcements.status,
      publishTime: Announcements.publish_time,
      expireTime: Announcements.expire_time,
      expiredTime: Announcements.expired_time,
      createdBy: Announcements.created_by,
      updatedBy: Announcements.updated_by,
      createdTime: Announcements.created_time,
      updatedTime: Announcements.updated_time,
    })
    .from(Announcements)
    .where(eq(Announcements.id, id))
    .limit(1);
