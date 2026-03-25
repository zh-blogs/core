import type { MultiFeed, SiteAuditArchitectureSnapshot, SiteAuditSnapshot } from '@zhblogs/db';

import { normalizeArchitectureSnapshot } from './site-snapshot-diff.service';
import {
  hasOwn,
  mergeSubmittedFeeds,
  normalizeFeedUrl,
  normalizeSubmittedFeeds,
} from './site-submission-validation.service';

export { buildSnapshotDiff } from './site-snapshot-diff.service';

type EditableArchitectureInput = {
  program_id?: string | null;
  program_name?: string | null;
  program_is_open_source?: boolean | null;
  stacks?: Array<{
    category: 'FRAMEWORK' | 'LANGUAGE';
    catalog_id?: string | null;
    name?: string | null;
    name_normalized?: string | null;
  }> | null;
  website_url?: string | null;
  repo_url?: string | null;
};

type CreateSiteInput = {
  name: string;
  url: string;
  sign?: string | null;
  icon_base64?: string | null;
  feed?: MultiFeed[] | null;
  default_feed_url?: string | null;
  sitemap?: string | null;
  link_page?: string | null;
  main_tag_id?: string | null;
  sub_tag_ids?: string[] | null;
  custom_sub_tags?: string[] | null;
  architecture?: EditableArchitectureInput | null;
};

type UpdateSiteChanges = {
  name?: string;
  url?: string;
  sign?: string | null;
  icon_base64?: string | null;
  feed?: MultiFeed[] | null;
  default_feed_url?: string | null;
  sitemap?: string | null;
  link_page?: string | null;
  main_tag_id?: string | null;
  sub_tag_ids?: string[] | null;
  custom_sub_tags?: string[] | null;
  architecture?: EditableArchitectureInput | null;
};

function normalizeCustomNames(values: string[] | null | undefined): string[] | null {
  if (!values) {
    return null;
  }

  const normalized = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  return normalized.length > 0 ? normalized.sort() : null;
}

export function buildCombinedTagIds(
  mainTagId: string | null | undefined,
  subTagIds: string[] | null | undefined,
): string[] | null {
  const values = [
    mainTagId?.trim() ?? '',
    ...(subTagIds ?? []).map((value) => value.trim()),
  ].filter(Boolean);

  return values.length > 0 ? [...new Set(values)].sort() : null;
}

export function buildCreateSnapshot(site: CreateSiteInput): SiteAuditSnapshot {
  const normalizedFeed = normalizeSubmittedFeeds(site.feed);
  const architecture = normalizeArchitectureSnapshot(site.architecture ?? null);

  return {
    bid: null,
    name: site.name,
    url: site.url,
    sign: site.sign ?? null,
    icon_base64: site.icon_base64 ?? null,
    feed: normalizedFeed,
    default_feed_url: normalizeFeedUrl(site.default_feed_url),
    from: ['WEB_SUBMIT'],
    classification_status: site.main_tag_id ? 'COMPLETE' : 'NEEDS_REVIEW',
    sitemap: site.sitemap ?? null,
    link_page: site.link_page ?? null,
    access_scope: 'BOTH',
    tag_ids: buildCombinedTagIds(site.main_tag_id, site.sub_tag_ids),
    main_tag_id: site.main_tag_id ?? null,
    sub_tag_ids: site.sub_tag_ids?.sort() ?? null,
    custom_sub_tags: normalizeCustomNames(site.custom_sub_tags),
    architecture,
  };
}

function mergeArchitectureChange(
  currentArchitecture: SiteAuditArchitectureSnapshot | null | undefined,
  nextArchitecture: EditableArchitectureInput | null | undefined,
) {
  if (nextArchitecture === undefined) {
    return currentArchitecture ?? null;
  }

  if (nextArchitecture === null) {
    return null;
  }

  const merged: EditableArchitectureInput = {
    program_id:
      nextArchitecture.program_id !== undefined
        ? nextArchitecture.program_id
        : currentArchitecture?.program_id,
    program_name:
      nextArchitecture.program_name !== undefined
        ? nextArchitecture.program_name
        : currentArchitecture?.program_name,
    program_is_open_source:
      nextArchitecture.program_is_open_source !== undefined
        ? nextArchitecture.program_is_open_source
        : currentArchitecture?.program_is_open_source,
    stacks:
      nextArchitecture.stacks !== undefined ? nextArchitecture.stacks : currentArchitecture?.stacks,
    website_url:
      nextArchitecture.website_url !== undefined
        ? nextArchitecture.website_url
        : currentArchitecture?.website_url,
    repo_url:
      nextArchitecture.repo_url !== undefined
        ? nextArchitecture.repo_url
        : currentArchitecture?.repo_url,
  };

  return normalizeArchitectureSnapshot(merged);
}

export function buildUpdatedSnapshot(
  currentSnapshot: SiteAuditSnapshot,
  changes: UpdateSiteChanges,
): SiteAuditSnapshot {
  const proposedSnapshot: SiteAuditSnapshot = {
    ...currentSnapshot,
  };

  if (hasOwn(changes, 'name') && changes.name !== undefined) {
    proposedSnapshot.name = changes.name;
  }

  if (hasOwn(changes, 'url') && changes.url !== undefined) {
    proposedSnapshot.url = changes.url;
  }

  if (hasOwn(changes, 'sign')) {
    proposedSnapshot.sign = changes.sign ?? null;
  }

  if (hasOwn(changes, 'icon_base64')) {
    proposedSnapshot.icon_base64 = changes.icon_base64 ?? null;
  }

  if (hasOwn(changes, 'feed')) {
    proposedSnapshot.feed = mergeSubmittedFeeds(currentSnapshot.feed, changes.feed);
  }

  if (hasOwn(changes, 'default_feed_url')) {
    proposedSnapshot.default_feed_url = normalizeFeedUrl(changes.default_feed_url);
  }

  if (hasOwn(changes, 'sitemap')) {
    proposedSnapshot.sitemap = changes.sitemap ?? null;
  }

  if (hasOwn(changes, 'link_page')) {
    proposedSnapshot.link_page = changes.link_page ?? null;
  }

  if (hasOwn(changes, 'main_tag_id')) {
    proposedSnapshot.main_tag_id = changes.main_tag_id ?? null;
  }

  if (hasOwn(changes, 'sub_tag_ids')) {
    proposedSnapshot.sub_tag_ids = changes.sub_tag_ids?.sort() ?? null;
  }

  if (hasOwn(changes, 'custom_sub_tags')) {
    proposedSnapshot.custom_sub_tags = normalizeCustomNames(changes.custom_sub_tags);
  }

  if (hasOwn(changes, 'main_tag_id') || hasOwn(changes, 'sub_tag_ids')) {
    proposedSnapshot.tag_ids = buildCombinedTagIds(
      proposedSnapshot.main_tag_id,
      proposedSnapshot.sub_tag_ids,
    );
    proposedSnapshot.classification_status = proposedSnapshot.main_tag_id
      ? 'COMPLETE'
      : 'NEEDS_REVIEW';
  }

  if (hasOwn(changes, 'architecture')) {
    proposedSnapshot.architecture = mergeArchitectureChange(
      currentSnapshot.architecture ?? null,
      changes.architecture,
    );
  }

  return proposedSnapshot;
}

export function buildDeleteSnapshot(
  currentSnapshot: SiteAuditSnapshot,
  submitReason: string,
): SiteAuditSnapshot {
  return {
    ...currentSnapshot,
    is_show: false,
    reason: submitReason.trim(),
  };
}
