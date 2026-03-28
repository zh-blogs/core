import type {
  PagedResult,
  SiteCheckItem,
  SiteDetail,
} from '@/application/site/site-directory.models';

export function cloneSiteDetailPagedResult<TItem extends object>(
  source: PagedResult<TItem>,
): PagedResult<TItem> {
  return {
    items: source.items.map((item) => ({ ...item }) as TItem),
    pagination: { ...source.pagination },
  };
}

export function formatSiteDetailDateTime(value: string | null): string {
  if (!value) {
    return '未记录';
  }

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSiteDetailStatusLabel(value: string): string {
  if (value === 'DOWN' || value === 'ERROR') {
    return '访问异常';
  }

  if (value === 'DEGRADED') {
    return '部分异常';
  }

  if (value === 'SSLERROR') {
    return '证书异常';
  }

  return '状态正常';
}

export function resolveSiteCheckTone(result: string): string {
  if (result === 'OK') {
    return 'var(--color-ok-dot)';
  }

  if (result === 'ERROR' || result === 'DOWN' || result === 'FAIL' || result === 'SSLERROR') {
    return 'var(--color-fail-dot)';
  }

  if (result === 'WARN' || result === 'DEGRADED') {
    return 'var(--color-warn-dot)';
  }

  return 'var(--color-warn-dot)';
}

export function resolveSiteStatusToneClass(value: string): string {
  if (value === 'OK') {
    return 'text-[color:var(--color-ok)]';
  }

  if (value === 'DOWN' || value === 'ERROR' || value === 'FAIL' || value === 'SSLERROR') {
    return 'text-[color:var(--color-fail)]';
  }

  return 'text-[color:var(--color-warn)]';
}

export function resolveHeartbeatSlotCount(viewportWidth: number): number {
  if (viewportWidth >= 1440) {
    return 30;
  }

  if (viewportWidth >= 1280) {
    return 24;
  }

  if (viewportWidth >= 1024) {
    return 20;
  }

  if (viewportWidth >= 768) {
    return 16;
  }

  if (viewportWidth >= 640) {
    return 12;
  }

  return 10;
}

export function buildHeartbeatChecks(checks: SiteCheckItem[], slotCount: number) {
  const recent = [...checks].slice(0, slotCount).reverse();
  const placeholders = Array.from(
    { length: Math.max(0, slotCount - recent.length) },
    (_, index) => ({
      id: `placeholder-${index}`,
      item: null as SiteCheckItem | null,
    }),
  );

  return [
    ...placeholders,
    ...recent.map((item) => ({
      id: item.id,
      item,
    })),
  ];
}

export interface SiteResourceLink {
  key: string;
  label: string;
  value: string;
  href: string;
  kind: 'rss' | 'sitemap' | 'external';
}

export function buildSiteResourceLinks(detail: SiteDetail) {
  const items: Array<{
    key: string;
    label: string;
    value: string;
    href: string;
    kind: 'rss' | 'sitemap' | 'external';
  }> = [];

  const feeds =
    detail.feeds.length > 0
      ? detail.feeds
      : detail.feedUrl
        ? [
            {
              name: null,
              url: detail.feedUrl,
              type: null,
              isDefault: true,
            },
          ]
        : [];

  const multipleFeeds = feeds.length > 1;

  for (const [index, feed] of feeds.entries()) {
    const feedName = feed.name?.trim() || `订阅${index + 1}`;

    items.push({
      key: `feed:${feed.url}`,
      label: multipleFeeds ? `RSS-${feedName}` : 'RSS',
      value: feed.url,
      href: feed.url,
      kind: 'rss',
    });
  }

  if (detail.sitemap) {
    items.push({
      key: 'sitemap',
      label: '站点地图',
      value: detail.sitemap,
      href: detail.sitemap,
      kind: 'sitemap',
    });
  }

  if (detail.linkPage) {
    items.push({
      key: 'links',
      label: '友链页',
      value: detail.linkPage,
      href: detail.linkPage,
      kind: 'external',
    });
  }

  return items;
}
