import type {
  SiteDirectoryItem,
  SiteWarningTagView,
} from '@/application/site/site-directory.models';

export type BlogCardTone = 'amber' | 'blue' | 'emerald' | 'red' | 'stone';
export type BlogCardStatus = 'fresh' | 'quiet' | 'steady';

export interface SiteCardEntry {
  id: string;
  slug: string;
  name: string;
  domain: string;
  href: string;
  shortCode: string;
  primaryTag: string;
  summary: string;
  subTags: string[];
  warningTags: SiteWarningTagView[];
  joinedAt: string;
  joinedLabel: string;
  updatedLabel?: string;
  articleCount?: string;
  visitCount: string;
  tone: BlogCardTone;
  status: BlogCardStatus;
  rssUrl?: string;
  sitemapUrl?: string;
  featured?: boolean;
}

export function extractDomain(url: string): string {
  try {
    const target = new URL(url);
    return `${target.host}${target.pathname === '/' ? '' : target.pathname}`;
  } catch {
    return url;
  }
}

export function createShortCode(name: string): string {
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

export function formatYearMonth(value: string): string {
  const target = new Date(value);

  return Number.isNaN(target.getTime())
    ? value
    : `${target.getFullYear()}.${String(target.getMonth() + 1).padStart(2, '0')}`;
}

export function formatCompactCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  }

  return String(value);
}

export function resolveUpdatedLabel(value: string | null): string | undefined {
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

export function resolveTone(primaryTag: string, featured: boolean): BlogCardTone {
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

export function resolveCardStatus(
  siteStatus: string,
  latestPublishedTime: string | null,
): BlogCardStatus {
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

export function mapDirectoryItemToSiteCardEntry(item: SiteDirectoryItem): SiteCardEntry {
  const primaryTag = item.primaryTag ?? '未分类';

  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    domain: extractDomain(item.url),
    href: item.url,
    shortCode: createShortCode(item.name),
    primaryTag,
    summary: item.sign || `${primaryTag}方向的公开站点。`,
    subTags: item.subTags,
    warningTags: item.warningTags,
    joinedAt: item.joinTime,
    joinedLabel: formatYearMonth(item.joinTime),
    updatedLabel: resolveUpdatedLabel(item.latestPublishedTime),
    articleCount: item.articleCount > 0 ? String(item.articleCount) : undefined,
    visitCount: formatCompactCount(item.visitCount),
    tone: resolveTone(primaryTag, item.featured),
    status: resolveCardStatus(item.status, item.latestPublishedTime),
    rssUrl: item.feedUrl ?? undefined,
    sitemapUrl: item.sitemap ?? undefined,
    featured: item.featured,
  };
}
