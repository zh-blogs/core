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

const publicSiteItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    bid: { type: ['string', 'null'] },
    name: { type: 'string' },
    url: { type: 'string' },
    sign: { type: 'string' },
    feedUrl: { type: ['string', 'null'] },
    sitemap: { type: ['string', 'null'] },
    linkPage: { type: ['string', 'null'] },
    featured: { type: 'boolean' },
    status: { type: 'string' },
    accessScope: { type: 'string' },
    joinTime: { type: 'string' },
    updateTime: { type: 'string' },
    latestPublishedTime: { type: ['string', 'null'] },
    articleCount: { type: 'number' },
    visitCount: { type: 'number' },
    primaryTag: { type: ['string', 'null'] },
    subTags: {
      type: 'array',
      items: { type: 'string' },
    },
    warningTags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          machineKey: { type: 'string' },
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
        },
        required: ['machineKey', 'name', 'description'],
      },
    },
  },
  required: [
    'id',
    'bid',
    'name',
    'url',
    'sign',
    'feedUrl',
    'sitemap',
    'linkPage',
    'featured',
    'status',
    'accessScope',
    'joinTime',
    'updateTime',
    'latestPublishedTime',
    'articleCount',
    'visitCount',
    'primaryTag',
    'subTags',
    'warningTags',
  ],
} as const;

const publicSitesResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: publicSiteItemSchema,
        },
      },
      required: ['items'],
    },
  },
  required: ['ok', 'data'],
} as const;

export { announcementsResponseSchema, homeResponseSchema, publicSitesResponseSchema };
