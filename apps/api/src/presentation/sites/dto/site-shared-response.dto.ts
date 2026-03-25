const feedItemResultSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    url: { type: 'string' },
    type: { type: 'string' },
  },
  required: ['name', 'url'],
} as const;

const optionItemResultSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
  },
  required: ['id', 'name'],
} as const;

const techStackOptionItemResultSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string', enum: ['FRAMEWORK', 'LANGUAGE'] },
  },
  required: ['id', 'name', 'category'],
} as const;

const architectureResultSchema = {
  type: ['object', 'null'],
  properties: {
    program_id: { type: ['string', 'null'] },
    program_name: { type: ['string', 'null'] },
    program_is_open_source: { type: ['boolean', 'null'] },
    stacks: {
      type: ['array', 'null'],
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['FRAMEWORK', 'LANGUAGE'] },
          catalog_id: { type: ['string', 'null'] },
          name: { type: ['string', 'null'] },
          name_normalized: { type: ['string', 'null'] },
        },
        required: ['category', 'catalog_id', 'name', 'name_normalized'],
      },
    },
    website_url: { type: ['string', 'null'] },
    repo_url: { type: ['string', 'null'] },
  },
  required: [
    'program_id',
    'program_name',
    'program_is_open_source',
    'stacks',
    'website_url',
    'repo_url',
  ],
} as const;

export {
  architectureResultSchema,
  feedItemResultSchema,
  optionItemResultSchema,
  techStackOptionItemResultSchema,
};
