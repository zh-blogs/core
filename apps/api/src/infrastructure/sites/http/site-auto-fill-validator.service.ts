import { createHash } from 'node:crypto';

import type { FeedTypeKey, MultiFeed } from '@zhblogs/db';

import { pageLooksLikeLinkPage } from '@/domain/sites/service/site-auto-fill-extractor.service';

const HTML_FETCH_TIMEOUT_MS = 8000;
const CANDIDATE_FETCH_TIMEOUT_MS = 5000;
// TODO: The sitelinks need to be corrected.
const USER_AGENT = 'zhblogs - SubmissionBot/1.0 (+https://zhblogs.net; public submission autofill)';

const RSS_BODY_PATTERN = /<rss[\s>]/i;
const ATOM_BODY_PATTERN = /<feed[\s>]/i;
const JSON_FEED_PATTERN = /https?:\/\/jsonfeed\.org\/version/i;
const SITEMAP_BODY_PATTERN = /<(?:urlset|sitemapindex)[\s>]/i;

const FEED_TYPE_BY_MIME: Record<string, FeedTypeKey> = {
  'application/rss+xml': 'RSS',
  'application/atom+xml': 'ATOM',
  'application/feed+json': 'JSON',
  'application/json': 'JSON',
};

const FEED_TYPE_PRIORITY: Record<FeedTypeKey, number> = {
  JSON: 3,
  ATOM: 2,
  RSS: 1,
};

const normalizeWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const decodeHtml = (value: string): string =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

export async function fetchBody(
  url: string,
  accept: string,
  timeoutMs: number,
): Promise<{ body: string; contentType: string } | null> {
  const response = await fetch(url, {
    headers: {
      accept,
      'user-agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    return null;
  }

  return {
    body: await response.text(),
    contentType: (response.headers.get('content-type') ?? '').toLowerCase(),
  };
}

export async function fetchText(url: string): Promise<string> {
  const response = await fetchBody(
    url,
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    HTML_FETCH_TIMEOUT_MS,
  );

  if (!response) {
    throw new Error('unexpected response');
  }

  return response.body;
}

function inferFeedType(
  contentType: string,
  body: string,
  fallbackType: FeedTypeKey | undefined,
): FeedTypeKey | null {
  const exactMimeType = (contentType.split(';')[0] ?? '').trim();

  if (FEED_TYPE_BY_MIME[exactMimeType]) {
    return FEED_TYPE_BY_MIME[exactMimeType];
  }

  if (ATOM_BODY_PATTERN.test(body)) {
    return 'ATOM';
  }

  if (JSON_FEED_PATTERN.test(body)) {
    return 'JSON';
  }

  if (RSS_BODY_PATTERN.test(body)) {
    return 'RSS';
  }

  return fallbackType ?? null;
}

export type ValidatedFeedCandidate = {
  name: string;
  url: string;
  type: FeedTypeKey;
  fingerprint: string;
};

function hashText(value: string): string {
  return createHash('sha1').update(value).digest('hex');
}

function extractFeedIdentityTokens(body: string): string[] {
  const normalizedBody = body.replace(/\s+/g, ' ').trim();

  const itemTitleMatches = [
    ...normalizedBody.matchAll(/<(?:item|entry)[\s\S]*?<title[^>]*>([^<]+)<\/title>/gi),
  ]
    .map((match) => normalizeWhitespace(decodeHtml(match[1] ?? '')))
    .filter(Boolean)
    .slice(0, 6);

  if (itemTitleMatches.length > 0) {
    return itemTitleMatches;
  }

  try {
    const parsed = JSON.parse(normalizedBody) as {
      items?: Array<{ id?: string; url?: string; title?: string }>;
      title?: string;
    };

    const itemTokens = (parsed.items ?? [])
      .map((item) => normalizeWhitespace(String(item.title ?? item.id ?? item.url ?? '')))
      .filter(Boolean)
      .slice(0, 6);

    if (itemTokens.length > 0) {
      return itemTokens;
    }

    if (parsed.title) {
      return [normalizeWhitespace(parsed.title)];
    }
  } catch {
    // ignore json parse failures, continue with fallback token extraction
  }

  const titleMatches = [...normalizedBody.matchAll(/<title[^>]*>([^<]+)<\/title>/gi)]
    .map((match) => normalizeWhitespace(decodeHtml(match[1] ?? '')))
    .filter(Boolean)
    .slice(0, 4);

  if (titleMatches.length > 0) {
    return titleMatches;
  }

  return [normalizedBody.slice(0, 480)];
}

function buildFeedFingerprint(body: string): string {
  return hashText(extractFeedIdentityTokens(body).join('|').toLowerCase());
}

export async function validateAndFingerprintFeedCandidate(
  candidate: MultiFeed,
): Promise<ValidatedFeedCandidate | null> {
  try {
    const response = await fetchBody(
      candidate.url,
      'application/rss+xml,application/atom+xml,application/feed+json,application/json,text/xml,application/xml;q=0.9,*/*;q=0.8',
      CANDIDATE_FETCH_TIMEOUT_MS,
    );

    if (!response) {
      return null;
    }

    const type = inferFeedType(response.contentType, response.body, candidate.type);

    if (!type) {
      return null;
    }

    return {
      name: candidate.name,
      url: candidate.url,
      type,
      fingerprint: buildFeedFingerprint(response.body),
    };
  } catch {
    return null;
  }
}

function choosePreferredFeed(
  current: ValidatedFeedCandidate,
  candidate: ValidatedFeedCandidate,
): ValidatedFeedCandidate {
  const currentPriority = FEED_TYPE_PRIORITY[current.type];
  const candidatePriority = FEED_TYPE_PRIORITY[candidate.type];

  if (candidatePriority > currentPriority) {
    return candidate;
  }

  if (candidatePriority < currentPriority) {
    return current;
  }

  if (candidate.url.length < current.url.length) {
    return candidate;
  }

  if (candidate.url.length > current.url.length) {
    return current;
  }

  return candidate.url.localeCompare(current.url, 'zh-CN') < 0 ? candidate : current;
}

export function dedupeFeedsByFingerprint(feeds: ValidatedFeedCandidate[]): {
  feeds: ValidatedFeedCandidate[];
  removedCount: number;
} {
  const byFingerprint = new Map<string, ValidatedFeedCandidate>();

  for (const feed of feeds) {
    const fingerprint = feed.fingerprint || `url:${feed.url}`;
    const current = byFingerprint.get(fingerprint);

    if (!current) {
      byFingerprint.set(fingerprint, feed);
      continue;
    }

    byFingerprint.set(fingerprint, choosePreferredFeed(current, feed));
  }

  const deduped = [...byFingerprint.values()];

  return {
    feeds: deduped,
    removedCount: Math.max(0, feeds.length - deduped.length),
  };
}

export async function validateSitemapCandidate(candidateUrl: string): Promise<string | null> {
  try {
    const response = await fetchBody(
      candidateUrl,
      'application/xml,text/xml;q=0.9,*/*;q=0.8',
      CANDIDATE_FETCH_TIMEOUT_MS,
    );

    if (!response) {
      return null;
    }

    return SITEMAP_BODY_PATTERN.test(response.body) ? candidateUrl : null;
  } catch {
    return null;
  }
}

export async function validateLinkPageCandidate(candidateUrl: string): Promise<string | null> {
  try {
    const response = await fetchBody(
      candidateUrl,
      'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      CANDIDATE_FETCH_TIMEOUT_MS,
    );

    if (!response) {
      return null;
    }

    return pageLooksLikeLinkPage(response.body) ? candidateUrl : null;
  } catch {
    return null;
  }
}
