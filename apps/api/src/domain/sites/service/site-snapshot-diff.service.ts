import type {
  SiteAuditArchitectureSnapshot,
  SiteAuditDiffItem,
  SiteAuditSnapshot,
} from '@zhblogs/db';

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

function normalizeComparableValue(field: keyof SiteAuditSnapshot, value: unknown) {
  if (field === 'tag_ids' && Array.isArray(value)) {
    return [...value].sort();
  }

  if (field === 'sub_tag_ids' && Array.isArray(value)) {
    return [...value].sort();
  }

  if (field === 'custom_sub_tags' && Array.isArray(value)) {
    return [...value].sort();
  }

  if (field === 'from' && Array.isArray(value)) {
    return [...value].sort();
  }

  if (field === 'architecture' && value && typeof value === 'object') {
    return normalizeArchitectureSnapshot(value as EditableArchitectureInput);
  }

  return value ?? null;
}

export function normalizeArchitectureSnapshot(
  architecture: EditableArchitectureInput | null | undefined,
): SiteAuditArchitectureSnapshot | null {
  if (!architecture) {
    return null;
  }

  const stacks = Array.isArray(architecture.stacks)
    ? architecture.stacks
        .map((item) => {
          const category =
            item.category === 'FRAMEWORK' || item.category === 'LANGUAGE' ? item.category : null;
          const catalog_id = item.catalog_id?.trim() || null;
          const name = item.name?.trim() || null;
          const name_normalized = item.name_normalized?.trim() || null;

          if (!category || (!catalog_id && !name)) {
            return null;
          }

          return {
            category,
            catalog_id,
            name,
            name_normalized,
          };
        })
        .filter((item) => item !== null)
    : null;

  const normalized: SiteAuditArchitectureSnapshot = {
    program_id: architecture.program_id?.trim() || null,
    program_name: architecture.program_name?.trim() || null,
    program_is_open_source:
      typeof architecture.program_is_open_source === 'boolean'
        ? architecture.program_is_open_source
        : null,
    stacks: stacks && stacks.length > 0 ? stacks : null,
    website_url: architecture.website_url?.trim() || null,
    repo_url: architecture.repo_url?.trim() || null,
  };

  if (
    !normalized.program_id &&
    !normalized.program_name &&
    !normalized.stacks &&
    !normalized.website_url &&
    !normalized.repo_url
  ) {
    return null;
  }

  return normalized;
}

export function buildSnapshotDiff(
  currentSnapshot: SiteAuditSnapshot | null,
  proposedSnapshot: SiteAuditSnapshot,
): SiteAuditDiffItem[] {
  const fields: Array<keyof SiteAuditSnapshot> = [
    'bid',
    'name',
    'url',
    'sign',
    'icon_base64',
    'feed',
    'default_feed_url',
    'from',
    'classification_status',
    'sitemap',
    'link_page',
    'access_scope',
    'status',
    'is_show',
    'recommend',
    'reason',
    'tag_ids',
    'main_tag_id',
    'sub_tag_ids',
    'custom_sub_tags',
    'architecture',
  ];

  const diff: SiteAuditDiffItem[] = [];

  for (const field of fields) {
    const before = normalizeComparableValue(field, currentSnapshot?.[field]);
    const after = normalizeComparableValue(field, proposedSnapshot[field]);

    if (JSON.stringify(before) === JSON.stringify(after)) {
      continue;
    }

    diff.push({
      field,
      before,
      after,
    });
  }

  return diff;
}
