import { fetchApiJson } from '../api/api.server';

export type BlogCardTone = 'amber' | 'blue' | 'emerald' | 'red' | 'stone';
export type BlogCardStatus = 'fresh' | 'quiet' | 'steady';

interface ApiPublicSiteItem {
  id: string;
  bid: string | null;
  name: string;
  url: string;
  sign: string;
  feedUrl: string | null;
  sitemap: string | null;
  linkPage: string | null;
  featured: boolean;
  status: string;
  accessScope: string;
  joinTime: string;
  updateTime: string;
  latestPublishedTime: string | null;
  articleCount: number;
  visitCount: number;
  primaryTag: string | null;
  subTags: string[];
}

interface PublicSitesPayload {
  ok: boolean;
  data: {
    items: ApiPublicSiteItem[];
  };
}

export interface PublicSiteEntry {
  id: string;
  bid: string | null;
  slug: string;
  name: string;
  domain: string;
  href: string;
  shortCode: string;
  primaryTag: string;
  summary: string;
  profile: string;
  highlights: string[];
  subTags: string[];
  joinedAt: string;
  joinedLabel: string;
  updatedLabel?: string;
  articleCount?: string;
  articleCountValue: number;
  visitCount: string;
  visitCountValue: number;
  tone: BlogCardTone;
  status: BlogCardStatus;
  rssUrl?: string;
  sitemapUrl?: string;
  linkPage?: string;
  featured?: boolean;
  accessScope: string;
  siteStatus: string;
  latestPublishedTime: string | null;
  updateTime: string;
}

function createSiteSlug(item: Pick<ApiPublicSiteItem, 'bid' | 'name' | 'id'>): string {
  if (item.bid) {
    return item.bid;
  }

  const normalized = item.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `site-${item.id.slice(0, 8)}`;
}

function extractDomain(url: string): string {
  try {
    const target = new URL(url);
    return `${target.host}${target.pathname === '/' ? '' : target.pathname}`;
  } catch {
    return url;
  }
}

function createShortCode(name: string): string {
  const compact = name.replace(/\s+/g, '');
  const chineseChars = [...compact].filter((char) => /[\u4e00-\u9fa5]/.test(char));

  if (chineseChars.length >= 2) {
    return `${chineseChars[0]}${chineseChars[1]}`;
  }

  const letters = name
    .split(/[\s/|·_.-]+/)
    .map((token) => token.trim().charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return letters || compact.slice(0, 2).toUpperCase() || 'SB';
}

function formatYearMonth(value: string): string {
  const target = new Date(value);

  return Number.isNaN(target.getTime())
    ? value
    : `${target.getFullYear()}.${String(target.getMonth() + 1).padStart(2, '0')}`;
}

function formatCompactCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  }

  return String(value);
}

function resolveUpdatedLabel(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const target = new Date(value);

  if (Number.isNaN(target.getTime())) {
    return undefined;
  }

  const diffDays = Math.max(0, Math.floor((Date.now() - target.getTime()) / 86_400_000));

  if (diffDays === 0) {
    return '今天更新';
  }

  if (diffDays < 7) {
    return `${diffDays} 天前更新`;
  }

  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} 周前更新`;
  }

  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} 个月前更新`;
  }

  return undefined;
}

function resolveTone(primaryTag: string, featured: boolean): BlogCardTone {
  if (featured) {
    return 'red';
  }

  if (/(技术|编程|开发|后端|前端|架构)/.test(primaryTag)) {
    return 'blue';
  }

  if (/(设计|产品|人文|阅读|写作)/.test(primaryTag)) {
    return 'amber';
  }

  if (/(生活|摄影|旅行|社区|外联)/.test(primaryTag)) {
    return 'emerald';
  }

  return 'stone';
}

function resolveCardStatus(siteStatus: string, latestPublishedTime: string | null): BlogCardStatus {
  if (siteStatus !== 'OK') {
    return 'quiet';
  }

  if (!latestPublishedTime) {
    return 'steady';
  }

  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(latestPublishedTime).getTime()) / 86_400_000),
  );

  if (diffDays <= 3) {
    return 'fresh';
  }

  if (diffDays <= 14) {
    return 'steady';
  }

  return 'quiet';
}

export function formatAccessScopeLabel(value: string): string {
  if (value === 'CN_ONLY' || value === 'MAINLAND_ONLY') {
    return '仅中国大陆可访问';
  }

  if (value === 'GLOBAL_ONLY' || value === 'OVERSEAS_ONLY') {
    return '仅海外可访问';
  }

  return '全球可访问';
}

export function formatSiteStatusLabel(value: string): string {
  if (value === 'DOWN' || value === 'ERROR') {
    return '访问异常';
  }

  if (value === 'DEGRADED') {
    return '部分异常';
  }

  if (value === 'SSLERROR') {
    return 'SSL 证书异常';
  }

  return '状态正常';
}

function createHighlights(
  item: ApiPublicSiteItem,
  primaryTag: string,
  updatedLabel?: string,
): string[] {
  const highlights: string[] = [];

  highlights.push(
    `分类：${primaryTag}${item.subTags.length ? ` · ${item.subTags.slice(0, 2).join(' / ')}` : ''}`,
  );

  if (item.articleCount > 0) {
    highlights.push(`已聚合 ${item.articleCount} 篇公开文章`);
  }

  if (updatedLabel) {
    highlights.push(`最近内容更新：${updatedLabel}`);
  } else {
    highlights.push(`站点状态：${formatSiteStatusLabel(item.status)}`);
  }

  const resources = [
    item.feedUrl ? 'RSS' : null,
    item.sitemap ? '站点地图' : null,
    item.linkPage ? '友链页' : null,
  ].filter(Boolean);

  if (resources.length > 0) {
    highlights.push(`已提供 ${resources.join('、')} 入口`);
  }

  return highlights.slice(0, 3);
}

function mapPublicSite(item: ApiPublicSiteItem): PublicSiteEntry {
  const primaryTag = item.primaryTag ?? '未分类';
  const updatedLabel = resolveUpdatedLabel(item.latestPublishedTime);

  return {
    id: item.id,
    bid: item.bid,
    slug: createSiteSlug(item),
    name: item.name,
    domain: extractDomain(item.url),
    href: item.url,
    shortCode: createShortCode(item.name),
    primaryTag,
    summary: item.sign || `${primaryTag}方向的公开站点。`,
    profile:
      item.sign ||
      `这个站点已收录到公开目录，当前显示为${formatSiteStatusLabel(item.status)}，可继续从下方标签与订阅入口了解它。`,
    highlights: createHighlights(item, primaryTag, updatedLabel),
    subTags: item.subTags,
    joinedAt: item.joinTime,
    joinedLabel: formatYearMonth(item.joinTime),
    updatedLabel,
    articleCount: item.articleCount > 0 ? String(item.articleCount) : undefined,
    articleCountValue: item.articleCount,
    visitCount: formatCompactCount(item.visitCount),
    visitCountValue: item.visitCount,
    tone: resolveTone(primaryTag, item.featured),
    status: resolveCardStatus(item.status, item.latestPublishedTime),
    rssUrl: item.feedUrl ?? undefined,
    sitemapUrl: item.sitemap ?? undefined,
    linkPage: item.linkPage ?? undefined,
    featured: item.featured,
    accessScope: item.accessScope,
    siteStatus: item.status,
    latestPublishedTime: item.latestPublishedTime,
    updateTime: item.updateTime,
  };
}

export const shuffleSites = <T>(items: T[]): T[] => {
  const draft = [...items];

  for (let index = draft.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    const current = draft[index];

    draft[index] = draft[nextIndex];
    draft[nextIndex] = current;
  }

  return draft;
};

export async function readPublicSites(): Promise<PublicSiteEntry[]> {
  const payload = await fetchApiJson<PublicSitesPayload>('/api/public/sites');

  return payload?.data.items.map(mapPublicSite) ?? [];
}

export async function readPublicSiteBySlug(slug: string): Promise<PublicSiteEntry | null> {
  const items = await readPublicSites();

  return items.find((item) => item.slug === slug) ?? null;
}
