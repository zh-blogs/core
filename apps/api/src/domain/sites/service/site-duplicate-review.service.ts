import type { SiteAuditSnapshot } from '@zhblogs/db';
import { get as getRegistrableDomain } from '@zhblogs/utils/psl';

export type SiteDuplicateVisibility = 'VISIBLE' | 'HIDDEN';

export interface SiteDuplicateCheckRow {
  id: string;
  bid: string | null;
  name: string;
  url: string;
  is_show: boolean;
}

export interface SiteDuplicateCandidate {
  site_id: string;
  bid: string | null;
  name: string;
  url: string;
  visibility: SiteDuplicateVisibility;
  reason: string;
}

export interface SiteDuplicateReviewResult {
  strong: SiteDuplicateCandidate[];
  weak: SiteDuplicateCandidate[];
}

type ComparableSiteUrl = {
  hostname: string;
  hostname_path: string;
  registrable_domain: string | null;
  registrable_label: string | null;
};

const STRONG_REASON_PRIORITY = {
  BID_MATCH: 0,
  HOSTNAME_PATH_MATCH: 1,
  HOSTNAME_MATCH: 2,
} as const;

const WEAK_REASON_PRIORITY = {
  NAME_MATCH: 0,
  DOMAIN_LABEL_MATCH: 1,
} as const;

type StrongReasonKey = keyof typeof STRONG_REASON_PRIORITY;
type WeakReasonKey = keyof typeof WEAK_REASON_PRIORITY;

const STRONG_REASON_LABELS: Record<StrongReasonKey, string> = {
  BID_MATCH: 'bid 一致',
  HOSTNAME_PATH_MATCH: '站点域名与路径一致',
  HOSTNAME_MATCH: '站点域名一致',
};

const WEAK_REASON_LABELS: Record<WeakReasonKey, string> = {
  NAME_MATCH: '站点名称一致',
  DOMAIN_LABEL_MATCH: '主域标识一致但后缀不同',
};

const normalizeSiteName = (value: string | null | undefined): string =>
  (value ?? '').trim().toLocaleLowerCase('zh-CN');

const normalizePathname = (value: string): string => {
  const normalized = value.trim() || '/';

  if (normalized === '/') {
    return '/';
  }

  return normalized.replace(/\/+$/u, '') || '/';
};

export function normalizeComparableSiteUrl(
  value: string | null | undefined,
): ComparableSiteUrl | null {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    return null;
  }

  try {
    const target = new URL(normalized);

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return null;
    }

    target.hostname = target.hostname.toLowerCase();
    target.hash = '';

    if (
      (target.protocol === 'http:' && target.port === '80') ||
      (target.protocol === 'https:' && target.port === '443')
    ) {
      target.port = '';
    }

    const hostname = target.hostname.toLowerCase();
    const pathname = normalizePathname(target.pathname);
    const registrableDomain = getRegistrableDomain(target.hostname);
    const registrableLabel = registrableDomain?.split('.')[0] ?? null;

    return {
      hostname,
      hostname_path: `${hostname}${pathname}`,
      registrable_domain: registrableDomain,
      registrable_label: registrableLabel,
    };
  } catch {
    return null;
  }
}

function buildCandidate(site: SiteDuplicateCheckRow, reason: string): SiteDuplicateCandidate {
  return {
    site_id: site.id,
    bid: site.bid,
    name: site.name,
    url: site.url,
    visibility: site.is_show ? 'VISIBLE' : 'HIDDEN',
    reason,
  };
}

function compareDuplicateCandidates(
  left: SiteDuplicateCandidate,
  right: SiteDuplicateCandidate,
): number {
  return left.name.localeCompare(right.name, 'zh-CN') || left.url.localeCompare(right.url, 'zh-CN');
}

function resolveStrongReason(
  incoming: Pick<SiteAuditSnapshot, 'bid' | 'url'>,
  site: SiteDuplicateCheckRow,
): StrongReasonKey | null {
  if (incoming.bid && site.bid && incoming.bid === site.bid) {
    return 'BID_MATCH';
  }

  const incomingUrl = normalizeComparableSiteUrl(incoming.url);
  const currentUrl = normalizeComparableSiteUrl(site.url);

  if (!incomingUrl || !currentUrl) {
    return null;
  }

  if (incomingUrl.hostname_path === currentUrl.hostname_path) {
    return 'HOSTNAME_PATH_MATCH';
  }

  if (incomingUrl.hostname === currentUrl.hostname) {
    return 'HOSTNAME_MATCH';
  }

  return null;
}

function resolveWeakReason(
  incoming: Pick<SiteAuditSnapshot, 'name' | 'url'>,
  site: SiteDuplicateCheckRow,
): WeakReasonKey | null {
  const incomingName = normalizeSiteName(incoming.name);
  const currentName = normalizeSiteName(site.name);

  if (incomingName && incomingName === currentName) {
    return 'NAME_MATCH';
  }

  const incomingUrl = normalizeComparableSiteUrl(incoming.url);
  const currentUrl = normalizeComparableSiteUrl(site.url);

  if (
    incomingUrl?.registrable_label &&
    currentUrl?.registrable_label &&
    incomingUrl.registrable_label === currentUrl.registrable_label &&
    incomingUrl.registrable_domain &&
    currentUrl.registrable_domain &&
    incomingUrl.registrable_domain !== currentUrl.registrable_domain
  ) {
    return 'DOMAIN_LABEL_MATCH';
  }

  return null;
}

export function reviewSiteDuplicates(
  sites: SiteDuplicateCheckRow[],
  incoming: Pick<SiteAuditSnapshot, 'bid' | 'name' | 'url'>,
): SiteDuplicateReviewResult {
  const strongBySiteId = new Map<
    string,
    {
      priority: number;
      candidate: SiteDuplicateCandidate;
    }
  >();
  const weakBySiteId = new Map<
    string,
    {
      priority: number;
      candidate: SiteDuplicateCandidate;
    }
  >();

  for (const site of sites) {
    const strongReason = resolveStrongReason(incoming, site);

    if (strongReason) {
      strongBySiteId.set(site.id, {
        priority: STRONG_REASON_PRIORITY[strongReason],
        candidate: buildCandidate(site, STRONG_REASON_LABELS[strongReason]),
      });
      continue;
    }

    if (!site.is_show) {
      continue;
    }

    const weakReason = resolveWeakReason(incoming, site);

    if (!weakReason) {
      continue;
    }

    const current = weakBySiteId.get(site.id);
    const next = {
      priority: WEAK_REASON_PRIORITY[weakReason],
      candidate: buildCandidate(site, WEAK_REASON_LABELS[weakReason]),
    };

    if (!current || next.priority < current.priority) {
      weakBySiteId.set(site.id, next);
    }
  }

  const strong = [...strongBySiteId.values()]
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return compareDuplicateCandidates(left.candidate, right.candidate);
    })
    .map((entry) => entry.candidate);
  const weak = [...weakBySiteId.values()]
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return compareDuplicateCandidates(left.candidate, right.candidate);
    })
    .map((entry) => entry.candidate)
    .slice(0, 6);

  return {
    strong,
    weak,
  };
}

export function hasConfirmedWeakDuplicateReview(
  weakCandidates: SiteDuplicateCandidate[],
  confirmedSiteIds: string[] | null | undefined,
): boolean {
  const expected = [...new Set(weakCandidates.map((candidate) => candidate.site_id))].sort();
  const actual = [
    ...new Set((confirmedSiteIds ?? []).map((value) => value.trim()).filter(Boolean)),
  ].sort();

  if (expected.length === 0) {
    return true;
  }

  if (expected.length !== actual.length) {
    return false;
  }

  return expected.every((value, index) => value === actual[index]);
}

export function mapStrongDuplicateFields(
  candidates: SiteDuplicateCandidate[],
): Array<'bid' | 'url'> | null {
  if (candidates.length === 0) {
    return null;
  }

  const fields = new Set<'bid' | 'url'>();

  for (const candidate of candidates) {
    if (candidate.reason === STRONG_REASON_LABELS.BID_MATCH) {
      fields.add('bid');
      continue;
    }

    fields.add('url');
  }

  return fields.size > 0 ? [...fields] : null;
}
