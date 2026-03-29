import {
  directoryMetaResponseSchema,
  directoryResponseSchema,
  publicSiteAccessResponseSchema,
  publicSiteArticleResponseSchema,
  publicSiteCheckResponseSchema,
  publicSiteDetailResponseSchema,
  publicSiteFeedbackResponseSchema,
  publicSiteRandomResponseSchema,
  publicSitesResponseSchema,
  siteDirectoryPreferenceResponseSchema,
} from '@/presentation/public/dto/public-site-response.dto';

const homeSummarySchema = {
  type: 'object',
  properties: {
    totalSites: { type: 'number' },
    featuredSites: { type: 'number' },
    todayUpdates: { type: 'number' },
  },
  required: ['totalSites', 'featuredSites', 'todayUpdates'],
} as const;

const homeResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        summary: homeSummarySchema,
      },
      required: ['summary'],
    },
  },
  required: ['ok', 'data'],
} as const;

const announcementItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    summary: { type: 'string' },
    tag: { type: 'string' },
    publishTime: { type: ['string', 'null'] },
  },
  required: ['id', 'title', 'summary', 'tag', 'publishTime'],
} as const;

const announcementsResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: announcementItemSchema,
        },
      },
      required: ['items'],
    },
  },
  required: ['ok', 'data'],
} as const;

export {
  announcementsResponseSchema,
  directoryMetaResponseSchema,
  directoryResponseSchema,
  homeResponseSchema,
  publicSiteAccessResponseSchema,
  publicSiteArticleResponseSchema,
  publicSiteCheckResponseSchema,
  publicSiteDetailResponseSchema,
  publicSiteFeedbackResponseSchema,
  publicSiteRandomResponseSchema,
  publicSitesResponseSchema,
  siteDirectoryPreferenceResponseSchema,
};
