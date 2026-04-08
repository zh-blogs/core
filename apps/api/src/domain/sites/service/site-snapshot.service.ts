import type {
  MultiFeed,
  SiteAuditArchitectureSnapshot,
  SiteAuditSnapshot,
  SiteAuditSubTagSnapshot,
} from '@zhblogs/db';

import {
  normalizeArchitectureSnapshot,
  normalizeSubTagSnapshots,
} from './site-snapshot-diff.service';
import {
  hasOwn,
  mergeSubmittedFeeds,
  normalizeSubmittedFeeds,
} from './site-submission-validation.service';

export {
  buildSnapshotDiff,
  normalizeSubTagSnapshots,
  normalizeSubTagToken,
} from './site-snapshot-diff.service';

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

type EditableSubTagInput = SiteAuditSubTagSnapshot;

type CreateSiteInput = {
  name: string;
  url: string;
  sign?: string | null;
  icon_base64?: string | null;
  feed?: MultiFeed[] | null;
  sitemap?: string | null;
  link_page?: string | null;
  main_tag_id?: string | null;
  sub_tags?: EditableSubTagInput[] | null;
  architecture?: EditableArchitectureInput | null;
};

type UpdateSiteChanges = {
  name?: string;
  url?: string;
  sign?: string | null;
  icon_base64?: string | null;
  feed?: MultiFeed[] | null;
  sitemap?: string | null;
  link_page?: string | null;
  main_tag_id?: string | null;
  sub_tags?: EditableSubTagInput[] | null;
  architecture?: EditableArchitectureInput | null;
};

export function buildSelectedTagIds(
  mainTagId: string | null | undefined,
  subTags: EditableSubTagInput[] | null | undefined,
): string[] | null {
  const values = [
    mainTagId?.trim() ?? '',
    ...(normalizeSubTagSnapshots(subTags) ?? [])
      .map((item) => item.tag_id?.trim() ?? '')
      .filter(Boolean),
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
    from: ['WEB_SUBMIT'],
    classification_status: site.main_tag_id ? 'COMPLETE' : 'NEEDS_REVIEW',
    sitemap: site.sitemap ?? null,
    link_page: site.link_page ?? null,
    access_scope: 'BOTH',
    main_tag_id: site.main_tag_id ?? null,
    sub_tags: normalizeSubTagSnapshots(site.sub_tags),
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

  if (hasOwn(changes, 'sitemap')) {
    proposedSnapshot.sitemap = changes.sitemap ?? null;
  }

  if (hasOwn(changes, 'link_page')) {
    proposedSnapshot.link_page = changes.link_page ?? null;
  }

  if (hasOwn(changes, 'main_tag_id')) {
    proposedSnapshot.main_tag_id = changes.main_tag_id ?? null;
  }

  if (hasOwn(changes, 'sub_tags')) {
    proposedSnapshot.sub_tags = normalizeSubTagSnapshots(changes.sub_tags);
  }

  if (hasOwn(changes, 'main_tag_id')) {
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

export function buildRestoreSnapshot(currentSnapshot: SiteAuditSnapshot): SiteAuditSnapshot {
  return {
    ...currentSnapshot,
    is_show: true,
    reason: null,
  };
}
