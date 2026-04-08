import {
  type MultiFeed,
  Programs,
  ProgramTechnologyStacks,
  SiteArchitectures,
  type SiteAuditArchitectureSnapshot,
  type SiteAuditSnapshot,
  Sites,
  SiteTags,
  TagDefinitions,
  TechnologyCatalogs,
} from '@zhblogs/db';

import { and, eq, inArray, ne } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import {
  mapStrongDuplicateFields,
  reviewSiteDuplicates,
  type SiteDuplicateReviewResult,
} from '@/domain/sites/service/site-duplicate-review.service';

type ArchitectureInput =
  | { program_id?: string | null }
  | SiteAuditArchitectureSnapshot
  | null
  | undefined;

function hasArchitectureStacks(
  architecture: ArchitectureInput,
): architecture is SiteAuditArchitectureSnapshot {
  return Boolean(architecture && 'stacks' in architecture);
}

const normalizeFeedUrl = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const normalizeSubTagToken = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    return null;
  }

  const compact = normalized.toLocaleLowerCase('zh-CN').replace(/[^\p{L}\p{N}]+/gu, '');
  return compact || normalized.toLocaleLowerCase('zh-CN');
};

const normalizeSubmittedFeeds = (feed: MultiFeed[] | null | undefined): MultiFeed[] => {
  const normalized: MultiFeed[] = [];
  const seen = new Set<string>();

  for (const entry of feed ?? []) {
    const url = normalizeFeedUrl(entry.url);

    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);
    normalized.push({
      name: entry.name?.trim() || `订阅 ${normalized.length + 1}`,
      url,
      ...(entry.type ? { type: entry.type } : {}),
      isDefault: entry.isDefault === true,
    });
  }

  if (normalized.length === 1) {
    return normalized.map((item) => ({
      ...item,
      isDefault: true,
    }));
  }

  return normalized;
};

export async function ensureTagIdsExist(
  app: FastifyInstance,
  tagIds: string[] | null | undefined,
): Promise<boolean> {
  if (!tagIds || tagIds.length === 0) {
    return true;
  }

  const rows = await app.db.read
    .select({ id: TagDefinitions.id })
    .from(TagDefinitions)
    .where(and(inArray(TagDefinitions.id, tagIds), eq(TagDefinitions.is_enabled, true)));

  return new Set(rows.map((row) => row.id)).size === new Set(tagIds).size;
}

export async function ensureTechnologyIdsExist(
  app: FastifyInstance,
  architecture: ArchitectureInput,
): Promise<boolean> {
  if (!architecture) {
    return true;
  }

  if (architecture.program_id) {
    const [program] = await app.db.read
      .select({ id: Programs.id })
      .from(Programs)
      .where(and(eq(Programs.id, architecture.program_id), eq(Programs.is_enabled, true)))
      .limit(1);

    if (!program) {
      return false;
    }

    return true;
  }

  const stackItems = hasArchitectureStacks(architecture)
    ? Array.isArray(architecture.stacks)
      ? architecture.stacks
      : []
    : [];
  const catalogIds = [
    ...new Set(stackItems.map((item) => item.catalog_id).filter(Boolean)),
  ] as string[];

  if (catalogIds.length === 0) {
    return true;
  }

  const rows = await app.db.read
    .select({
      id: TechnologyCatalogs.id,
      technology_type: TechnologyCatalogs.technology_type,
    })
    .from(TechnologyCatalogs)
    .where(
      and(inArray(TechnologyCatalogs.id, catalogIds), eq(TechnologyCatalogs.is_enabled, true)),
    );

  const catalogTypeById = new Map(rows.map((row) => [row.id, row.technology_type]));

  return stackItems.every((item) => {
    if (!item.catalog_id) {
      return true;
    }

    const catalogType = catalogTypeById.get(item.catalog_id);
    return catalogType === 'FRAMEWORK' || catalogType === 'LANGUAGE'
      ? catalogType === item.category
      : false;
  });
}

export async function ensureNoSiteIdentifierConflict(
  app: FastifyInstance,
  snapshot: Pick<SiteAuditSnapshot, 'bid' | 'name' | 'url'>,
  currentSiteId?: string,
): Promise<Array<'bid' | 'url'> | null> {
  const review = await reviewSubmittedSiteDuplicates(app, snapshot, currentSiteId);
  return mapStrongDuplicateFields(review.strong);
}

export async function reviewSubmittedSiteDuplicates(
  app: FastifyInstance,
  snapshot: Pick<SiteAuditSnapshot, 'bid' | 'name' | 'url'>,
  currentSiteId?: string,
): Promise<SiteDuplicateReviewResult> {
  const rows = await app.db.read
    .select({
      id: Sites.id,
      bid: Sites.bid,
      name: Sites.name,
      url: Sites.url,
      is_show: Sites.is_show,
    })
    .from(Sites)
    .where(currentSiteId ? ne(Sites.id, currentSiteId) : undefined);

  return reviewSiteDuplicates(rows, snapshot);
}

export async function loadHiddenSiteRestoreTarget(app: FastifyInstance, siteId: string) {
  const [site] = await app.db.read
    .select({
      site_id: Sites.id,
      bid: Sites.bid,
      name: Sites.name,
      url: Sites.url,
      reason: Sites.reason,
      is_show: Sites.is_show,
    })
    .from(Sites)
    .where(eq(Sites.id, siteId))
    .limit(1);

  if (!site || site.is_show) {
    return null;
  }

  return {
    site_id: site.site_id,
    bid: site.bid,
    name: site.name,
    url: site.url,
    reason: site.reason,
  };
}

export async function loadCurrentSiteSnapshot(
  app: FastifyInstance,
  siteId: string,
): Promise<SiteAuditSnapshot | null> {
  const [site] = await app.db.read.select().from(Sites).where(eq(Sites.id, siteId)).limit(1);

  if (!site) {
    return null;
  }

  const tagRows = await app.db.read
    .select({ tag_id: SiteTags.tag_id })
    .from(SiteTags)
    .where(eq(SiteTags.site_id, siteId));

  const tagDefinitionRows =
    tagRows.length > 0
      ? await app.db.read
          .select({
            id: TagDefinitions.id,
            name: TagDefinitions.name,
            tag_type: TagDefinitions.tag_type,
          })
          .from(TagDefinitions)
          .where(
            inArray(
              TagDefinitions.id,
              tagRows.map((row) => row.tag_id),
            ),
          )
      : [];

  const [architecture] = await app.db.read
    .select({
      program_id: SiteArchitectures.program_id,
    })
    .from(SiteArchitectures)
    .where(eq(SiteArchitectures.site_id, siteId))
    .limit(1);

  const [program] = architecture?.program_id
    ? await app.db.read
        .select({
          id: Programs.id,
          name: Programs.name,
          is_open_source: Programs.is_open_source,
          website_url: Programs.website_url,
          repo_url: Programs.repo_url,
        })
        .from(Programs)
        .where(eq(Programs.id, architecture.program_id))
        .limit(1)
    : [];

  const programStacks = program
    ? await app.db.read
        .select({
          category: ProgramTechnologyStacks.category,
          catalog_id: ProgramTechnologyStacks.catalog_id,
          name_custom: ProgramTechnologyStacks.name_custom,
          name_normalized: ProgramTechnologyStacks.name_normalized,
        })
        .from(ProgramTechnologyStacks)
        .where(eq(ProgramTechnologyStacks.program_id, program.id))
    : [];

  const stackCatalogIds = programStacks.map((row) => row.catalog_id).filter(Boolean) as string[];

  const stackCatalogRows =
    stackCatalogIds.length > 0
      ? await app.db.read
          .select({
            id: TechnologyCatalogs.id,
            name: TechnologyCatalogs.name,
          })
          .from(TechnologyCatalogs)
          .where(inArray(TechnologyCatalogs.id, stackCatalogIds))
      : [];

  const mainTagId = tagDefinitionRows.find((row) => row.tag_type === 'MAIN')?.id ?? null;
  const subTags = tagDefinitionRows
    .filter((row) => row.tag_type === 'SUB')
    .map((row) => ({
      tag_id: row.id,
      name: row.name,
      name_normalized: normalizeSubTagToken(row.name),
    }))
    .sort((left, right) => left.tag_id.localeCompare(right.tag_id, 'zh-CN'));
  const stackNameByCatalogId = new Map(stackCatalogRows.map((row) => [row.id, row.name]));

  return {
    bid: site.bid ?? null,
    name: site.name,
    url: site.url,
    sign: site.sign ?? null,
    icon_base64: site.icon_base64 ?? null,
    feed: normalizeSubmittedFeeds(site.feed ?? []),
    from: (site.from ?? null) as SiteAuditSnapshot['from'],
    classification_status: site.classification_status as SiteAuditSnapshot['classification_status'],
    sitemap: site.sitemap ?? null,
    link_page: site.link_page ?? null,
    access_scope: site.access_scope as SiteAuditSnapshot['access_scope'],
    status: site.status as SiteAuditSnapshot['status'],
    is_show: site.is_show,
    recommend: site.recommend ?? false,
    reason: site.reason ?? null,
    main_tag_id: mainTagId,
    sub_tags: subTags.length > 0 ? subTags : null,
    architecture: architecture
      ? {
          program_id: architecture.program_id ?? null,
          program_name: program?.name ?? null,
          program_is_open_source: program?.is_open_source ?? null,
          stacks: programStacks
            .map((row) => {
              const category =
                row.category === 'FRAMEWORK' || row.category === 'LANGUAGE' ? row.category : null;
              return {
                category,
                catalog_id: row.catalog_id ?? null,
                name:
                  row.name_custom ??
                  (row.catalog_id ? (stackNameByCatalogId.get(row.catalog_id) ?? null) : null),
                name_normalized: row.name_normalized,
              };
            })
            .filter(
              (
                row,
              ): row is {
                category: 'FRAMEWORK' | 'LANGUAGE';
                catalog_id: string | null;
                name: string | null;
                name_normalized: string;
              } => row.category !== null,
            ),
          website_url: program?.website_url ?? null,
          repo_url: program?.repo_url ?? null,
        }
      : null,
  };
}
