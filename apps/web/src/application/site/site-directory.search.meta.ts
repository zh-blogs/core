export type SiteDirectoryStructuredSearchState = {
  keywords: string[];
  main: string[];
  sub: string[];
  warning: string[];
  program: string[];
  site: string[];
  domain: string[];
  access: string[];
  rss: boolean | null;
  featured: boolean | null;
};

export type SiteDirectorySearchHint = {
  field: string;
  label: string;
  snippet: string;
  description: string;
  example: string;
};

export type StructuredArrayField =
  | 'main'
  | 'sub'
  | 'warning'
  | 'program'
  | 'site'
  | 'domain'
  | 'access';

const arrayFields = new Set([
  'main',
  'sub',
  'warning',
  'program',
  'site',
  'domain',
  'access',
] as const satisfies StructuredArrayField[]);

const searchHints = [
  {
    field: 'main',
    label: '主标签',
    snippet: 'main:',
    description: '按主标签精确匹配，适合快速限定主要分类。',
    example: 'main:技术',
  },
  {
    field: 'sub',
    label: '子标签',
    snippet: 'sub:',
    description: '按子标签匹配，可多次使用。',
    example: 'sub:架构',
  },
  {
    field: 'warning',
    label: '警示标签',
    snippet: 'warning:',
    description: '按警示标签筛选，可多次使用。',
    example: 'warning:外部限制',
  },
  {
    field: 'program',
    label: '程序',
    snippet: 'program:',
    description: '按站点程序名称匹配，通常单选即可。',
    example: 'program:WordPress',
  },
  {
    field: 'site',
    label: '站点名',
    snippet: 'site:',
    description: '按站点名称或完整地址文本匹配。',
    example: 'site:"秋雨" ',
  },
  {
    field: 'domain',
    label: '域名',
    snippet: 'domain:',
    description: '按域名或主机名匹配。',
    example: 'domain:example.com',
  },
  {
    field: 'access',
    label: '访问范围',
    snippet: 'access:',
    description: '支持 全球 / 海外 / 大陆 等访问范围词。',
    example: 'access:全球',
  },
  {
    field: 'rss',
    label: 'RSS',
    snippet: 'rss:',
    description: '按是否提供 RSS 筛选，支持 true / false。',
    example: 'rss:true',
  },
  {
    field: 'featured',
    label: '推荐',
    snippet: 'featured:',
    description: '按推荐状态筛选，支持 true / false。',
    example: 'featured:true',
  },
] as const satisfies SiteDirectorySearchHint[];

const booleanAliases = new Map<string, boolean>([
  ['1', true],
  ['true', true],
  ['yes', true],
  ['on', true],
  ['y', true],
  ['有', true],
  ['是', true],
  ['0', false],
  ['false', false],
  ['no', false],
  ['off', false],
  ['n', false],
  ['无', false],
  ['否', false],
]);

export const SITE_DIRECTORY_SEARCH_HINTS = searchHints;

export function isStructuredArrayField(field: string): field is StructuredArrayField {
  return arrayFields.has(field as StructuredArrayField);
}

export function createEmptyStructuredSearchState(): SiteDirectoryStructuredSearchState {
  return {
    keywords: [],
    main: [],
    sub: [],
    warning: [],
    program: [],
    site: [],
    domain: [],
    access: [],
    rss: null,
    featured: null,
  };
}

export function normalizeSiteDirectoryBoolean(value: string): boolean | null {
  return booleanAliases.get(value.trim().toLowerCase()) ?? null;
}
