import { ANNOUNCEMENT_STATUS_KEYS, type AnnouncementStatusKey } from '@zhblogs/db';

export type AnnouncementRecord = {
  id: string;
  title: string;
  content: string | null;
  status: AnnouncementStatusKey;
  publishTime: Date | null;
  expireTime: Date | null;
  expiredTime: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdTime: Date;
  updatedTime: Date;
};

export type AnnouncementRow = Omit<AnnouncementRecord, 'status'> & {
  status: string;
};

export type AnnouncementBody = {
  id?: string;
  title?: unknown;
  content?: unknown;
  status?: unknown;
  publish_time?: unknown;
  expire_time?: unknown;
};

export type AnnouncementListQuery = {
  page?: string;
  pageSize?: string;
};

export const announcementSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    content: { type: ['string', 'null'] },
    status: { type: 'string' },
    publishTime: { type: ['string', 'null'] },
    expireTime: { type: ['string', 'null'] },
    expiredTime: { type: ['string', 'null'] },
    createdBy: { type: ['string', 'null'] },
    updatedBy: { type: ['string', 'null'] },
    createdTime: { type: 'string' },
    updatedTime: { type: 'string' },
  },
  required: [
    'id',
    'title',
    'content',
    'status',
    'publishTime',
    'expireTime',
    'expiredTime',
    'createdBy',
    'updatedBy',
    'createdTime',
    'updatedTime',
  ],
} as const;

export const announcementEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: announcementSchema,
  },
  required: ['ok', 'data'],
} as const;

export const announcementListEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: announcementSchema,
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalItems: { type: 'number' },
            totalPages: { type: 'number' },
          },
          required: ['page', 'pageSize', 'totalItems', 'totalPages'],
        },
      },
      required: ['items', 'pagination'],
    },
  },
  required: ['ok', 'data'],
} as const;

export const listQuerySchema = {
  type: 'object',
  properties: {
    page: { type: 'string' },
    pageSize: { type: 'string' },
  },
} as const;

export const deleteEnvelopeSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
  },
  required: ['ok'],
} as const;

export const paramsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
  required: ['id'],
} as const;

export const saveAnnouncementBodySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    content: { type: ['string', 'null'] },
    status: { type: 'string', enum: [...ANNOUNCEMENT_STATUS_KEYS] },
    publish_time: { type: ['string', 'null'] },
    expire_time: { type: ['string', 'null'] },
  },
  required: ['title', 'status'],
} as const;
