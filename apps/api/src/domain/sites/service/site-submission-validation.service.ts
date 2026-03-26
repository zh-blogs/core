import type { MultiFeed, SiteAuditSnapshot } from '@zhblogs/db';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubmitterFields = {
  submitter_name: string;
  submitter_email: string;
  submit_reason: string;
};

type SiteLookupInputLike = {
  site_id?: string | null;
  bid?: string | null;
  url?: string | null;
};

type SiteSubmissionQueryLike = {
  audit_id: string;
};

type CreateSiteSubmissionLike = SubmitterFields & {
  site: {
    name: string;
    sign?: string | null;
    main_tag_id?: string | null;
    feed?: MultiFeed[] | null;
    default_feed_url?: string | null;
  };
};

type UpdateSiteSubmissionLike = SubmitterFields & {
  changes: Record<string, unknown>;
};

export function validateSubmitterFields(payload: SubmitterFields) {
  const fields: string[] = [];

  if (payload.submitter_name.trim().length === 0) {
    fields.push('submitter_name');
  }

  if (payload.submitter_email.trim().length === 0 || !EMAIL_PATTERN.test(payload.submitter_email)) {
    fields.push('submitter_email');
  }

  if (payload.submit_reason.trim().length === 0) {
    fields.push('submit_reason');
  }

  return fields;
}

export function validateSubmissionQueryFields(payload: SiteSubmissionQueryLike) {
  const fields: string[] = [];

  if (payload.audit_id.trim().length === 0) {
    fields.push('audit_id');
  }

  return fields;
}

export function validateSiteLookupFields(payload: SiteLookupInputLike) {
  const fields: string[] = [];
  const providedFields = [payload.site_id, payload.bid, payload.url].filter(
    (value) => value !== undefined && value !== null && String(value).trim().length > 0,
  );

  if (providedFields.length !== 1) {
    fields.push('site_lookup');
  }

  return fields;
}

export function normalizeSubmitterEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeFeedUrl(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function createComparableFeedUrlKey(value: string | null | undefined) {
  const normalized = normalizeFeedUrl(value);

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

    if (target.pathname !== '/') {
      target.pathname = target.pathname.replace(/\/+$/u, '') || '/';
    }

    return target.toString();
  } catch {
    return normalized;
  }
}

export function normalizeSubmittedFeeds(feed: MultiFeed[] | null | undefined): MultiFeed[] {
  return (feed ?? [])
    .map((item) => ({
      name: item.name.trim(),
      url: item.url.trim(),
      ...(item.type ? { type: item.type } : {}),
    }))
    .filter((item) => item.url.length > 0);
}

export function mergeSubmittedFeeds(
  currentFeed: MultiFeed[] | null | undefined,
  nextFeed: MultiFeed[] | null | undefined,
): MultiFeed[] {
  const currentTypeByUrl = new Map(
    normalizeSubmittedFeeds(currentFeed)
      .filter((item) => item.type)
      .map((item) => [createComparableFeedUrlKey(item.url) ?? item.url, item.type]),
  );

  return normalizeSubmittedFeeds(nextFeed).map((item) => ({
    ...item,
    ...(item.type
      ? { type: item.type }
      : currentTypeByUrl.get(createComparableFeedUrlKey(item.url) ?? item.url)
        ? { type: currentTypeByUrl.get(createComparableFeedUrlKey(item.url) ?? item.url) }
        : {}),
  }));
}

export function validateFeedSelection(
  feed: MultiFeed[] | null | undefined,
  defaultFeedUrl: string | null | undefined,
  fieldPrefix: string,
) {
  const fields: string[] = [];
  const normalizedFeed = normalizeSubmittedFeeds(feed);
  const normalizedDefaultFeedUrl = normalizeFeedUrl(defaultFeedUrl);

  if (normalizedFeed.length === 0) {
    if (normalizedDefaultFeedUrl) {
      fields.push(`${fieldPrefix}default_feed_url`);
    }

    return fields;
  }

  const seen = new Set<string>();

  for (const item of normalizedFeed) {
    const comparableUrl = createComparableFeedUrlKey(item.url) ?? item.url;

    if (seen.has(comparableUrl)) {
      fields.push(`${fieldPrefix}feed`);
      return fields;
    }

    seen.add(comparableUrl);
  }

  if (normalizedFeed.length > 1) {
    const unnamed = normalizedFeed.some((item) => item.name.length === 0);

    if (unnamed) {
      fields.push(`${fieldPrefix}feed`);
    }
  }

  if (!normalizedDefaultFeedUrl) {
    fields.push(`${fieldPrefix}default_feed_url`);
    return [...new Set(fields)];
  }

  const comparableDefaultFeedUrl = createComparableFeedUrlKey(normalizedDefaultFeedUrl);

  if (
    !comparableDefaultFeedUrl ||
    !normalizedFeed.some(
      (item) => (createComparableFeedUrlKey(item.url) ?? item.url) === comparableDefaultFeedUrl,
    )
  ) {
    fields.push(`${fieldPrefix}default_feed_url`);
  }

  return [...new Set(fields)];
}

export function resolveAuditSiteName(
  proposedSnapshot: SiteAuditSnapshot | null | undefined,
  currentSnapshot: SiteAuditSnapshot | null | undefined,
) {
  return proposedSnapshot?.name ?? currentSnapshot?.name ?? null;
}

export function validateCreateSiteFields(payload: CreateSiteSubmissionLike) {
  const fields = validateSubmitterFields(payload);

  if (payload.site.name.trim().length === 0) {
    fields.push('site.name');
  }

  if ((payload.site.sign ?? '').trim().length === 0) {
    fields.push('site.sign');
  }

  if (!payload.site.main_tag_id) {
    fields.push('site.main_tag_id');
  }

  fields.push(...validateFeedSelection(payload.site.feed, payload.site.default_feed_url, 'site.'));

  return [...new Set(fields)];
}

export function validateUpdateSiteFields(payload: UpdateSiteSubmissionLike) {
  const fields = validateSubmitterFields(payload);

  if (
    'name' in payload.changes &&
    payload.changes.name !== undefined &&
    String(payload.changes.name).trim().length === 0
  ) {
    fields.push('changes.name');
  }

  if ('sign' in payload.changes && String(payload.changes.sign ?? '').trim().length === 0) {
    fields.push('changes.sign');
  }

  return [...new Set(fields)];
}

export function validateDeleteSiteFields(payload: SubmitterFields) {
  return validateSubmitterFields(payload);
}

export function hasOwn<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
