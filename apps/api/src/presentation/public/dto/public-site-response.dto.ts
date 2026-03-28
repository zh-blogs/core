const warningTagSchema = {
  type: 'object',
  properties: {
    machineKey: { type: 'string' },
    name: { type: 'string' },
    description: { type: ['string', 'null'] },
  },
  required: ['machineKey', 'name', 'description'],
} as const;

const publicSiteItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    bid: { type: ['string', 'null'] },
    slug: { type: 'string' },
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
      items: warningTagSchema,
    },
  },
  required: [
    'id',
    'bid',
    'slug',
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

const pagedResponseSchema = (itemSchema: unknown) =>
  ({
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      data: {
        type: ['object', 'null'],
        properties: {
          items: {
            type: 'array',
            items: itemSchema,
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
  }) as const;

export const publicSitesResponseSchema = {
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

export const directoryMetaResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          properties: {
            totalSites: { type: 'number' },
            normalSites: { type: 'number' },
            abnormalSites: { type: 'number' },
            rssSites: { type: 'number' },
          },
          required: ['totalSites', 'normalSites', 'abnormalSites', 'rssSites'],
        },
        filters: {
          type: 'object',
          properties: {
            mainTags: {
              type: 'array',
              items: {
                type: 'object',
                properties: { id: { type: 'string' }, name: { type: 'string' } },
                required: ['id', 'name'],
              },
            },
            subTags: {
              type: 'array',
              items: {
                type: 'object',
                properties: { id: { type: 'string' }, name: { type: 'string' } },
                required: ['id', 'name'],
              },
            },
            warningTags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  machineKey: { type: ['string', 'null'] },
                  name: { type: 'string' },
                },
                required: ['id', 'machineKey', 'name'],
              },
            },
            programs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                },
                required: ['id', 'name'],
              },
            },
          },
          required: ['mainTags', 'subTags', 'warningTags', 'programs'],
        },
        defaults: {
          type: 'object',
          properties: {
            pageSize: { type: 'number' },
            random: { type: 'boolean' },
            statusMode: { type: 'string' },
          },
          required: ['pageSize', 'random', 'statusMode'],
        },
      },
      required: ['stats', 'filters', 'defaults'],
    },
  },
  required: ['ok', 'data'],
} as const;

export const directoryResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        items: { type: 'array', items: publicSiteItemSchema },
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
        query: {
          type: 'object',
          properties: {
            q: { type: 'string' },
            main: { type: 'array', items: { type: 'string' } },
            sub: { type: 'array', items: { type: 'string' } },
            warning: { type: 'array', items: { type: 'string' } },
            program: { type: 'array', items: { type: 'string' } },
            statusMode: { type: 'string' },
            random: { type: 'boolean' },
            sort: { type: ['string', 'null'] },
            order: { type: 'string' },
            randomSeed: { type: 'string' },
          },
          required: [
            'q',
            'main',
            'sub',
            'warning',
            'program',
            'statusMode',
            'random',
            'sort',
            'order',
            'randomSeed',
          ],
        },
      },
      required: ['items', 'pagination', 'query'],
    },
  },
  required: ['ok', 'data'],
} as const;

export const publicSiteDetailResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: ['object', 'null'],
      properties: {
        ...publicSiteItemSchema.properties,
        reason: { type: ['string', 'null'] },
        feeds: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: ['string', 'null'] },
              url: { type: 'string' },
              type: { type: ['string', 'null'] },
              isDefault: { type: 'boolean' },
            },
            required: ['name', 'url', 'type', 'isDefault'],
          },
        },
        architecture: {
          type: 'object',
          properties: {
            program: {
              type: ['object', 'null'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                isOpenSource: { type: 'boolean' },
                websiteUrl: { type: ['string', 'null'] },
                repoUrl: { type: ['string', 'null'] },
              },
              required: ['id', 'name', 'isOpenSource', 'websiteUrl', 'repoUrl'],
            },
          },
          required: ['program'],
        },
      },
      required: [...publicSiteItemSchema.required, 'reason', 'feeds', 'architecture'],
    },
  },
  required: ['ok', 'data'],
} as const;

export const publicSiteArticleResponseSchema = pagedResponseSchema({
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    articleUrl: { type: 'string' },
    summary: { type: ['string', 'null'] },
    publishedTime: { type: ['string', 'null'] },
    fetchedTime: { type: 'string' },
    source: {
      type: 'object',
      properties: {
        feedName: { type: ['string', 'null'] },
        feedUrl: { type: ['string', 'null'] },
        feedType: { type: ['string', 'null'] },
      },
      required: ['feedName', 'feedUrl', 'feedType'],
    },
  },
  required: ['id', 'title', 'articleUrl', 'summary', 'publishedTime', 'fetchedTime', 'source'],
});

export const publicSiteCheckResponseSchema = pagedResponseSchema({
  type: 'object',
  properties: {
    id: { type: 'string' },
    region: { type: 'string' },
    result: { type: 'string' },
    statusCode: { type: ['number', 'null'] },
    responseTimeMs: { type: ['number', 'null'] },
    durationMs: { type: ['number', 'null'] },
    message: { type: ['string', 'null'] },
    finalUrl: { type: ['string', 'null'] },
    contentVerified: { type: 'boolean' },
    checkTime: { type: 'string' },
  },
  required: [
    'id',
    'region',
    'result',
    'statusCode',
    'responseTimeMs',
    'durationMs',
    'message',
    'finalUrl',
    'contentVerified',
    'checkTime',
  ],
});

export const publicSiteFeedbackResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
  },
  required: ['ok', 'data'],
} as const;

export const siteDirectoryPreferenceResponseSchema = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    data: {
      type: 'object',
      properties: {
        randomMode: { type: 'string' },
        randomSeed: { type: ['string', 'null'] },
      },
      required: ['randomMode', 'randomSeed'],
    },
  },
  required: ['ok', 'data'],
} as const;
