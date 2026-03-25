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

import { and, eq, inArray, ne, or } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

type ArchitectureInput =
  | { program_id?: string | null }
  | SiteAuditArchitectureSnapshot
  | null
  | undefined;

const normalizeFeedUrl = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
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
    });
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
  }

  return true;
}

export async function ensureNoSiteIdentifierConflict(
  app: FastifyInstance,
  snapshot: Pick<SiteAuditSnapshot, 'bid' | 'name' | 'url'>,
  currentSiteId?: string,
): Promise<Array<'bid' | 'name' | 'url'> | null> {
  const conditions = [eq(Sites.name, snapshot.name ?? ''), eq(Sites.url, snapshot.url ?? '')];

  if (snapshot.bid) {
    conditions.push(eq(Sites.bid, snapshot.bid));
  }

  const whereClause = currentSiteId
    ? and(ne(Sites.id, currentSiteId), conditions.length === 1 ? conditions[0] : or(...conditions))
    : conditions.length === 1
      ? conditions[0]
      : or(...conditions);

  const [conflict] = await app.db.read
    .select({
      id: Sites.id,
      bid: Sites.bid,
      name: Sites.name,
      url: Sites.url,
    })
    .from(Sites)
    .where(whereClause)
    .limit(1);

  if (!conflict) {
    return null;
  }

  const fields: Array<'bid' | 'name' | 'url'> = [];

  if (snapshot.bid && conflict.bid === snapshot.bid) {
    fields.push('bid');
  }

  if (conflict.name === snapshot.name) {
    fields.push('name');
  }

  if (conflict.url === snapshot.url) {
    fields.push('url');
  }

  return fields.length > 0 ? fields : ['name', 'url'];
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
  const subTagIds = tagDefinitionRows
    .filter((row) => row.tag_type === 'SUB')
    .map((row) => row.id)
    .sort();
  const stackNameByCatalogId = new Map(stackCatalogRows.map((row) => [row.id, row.name]));

  return {
    bid: site.bid ?? null,
    name: site.name,
    url: site.url,
    sign: site.sign ?? null,
    icon_base64: site.icon_base64 ?? null,
    feed: normalizeSubmittedFeeds(site.feed ?? []),
    default_feed_url: site.default_feed_url ?? null,
    from: (site.from ?? null) as SiteAuditSnapshot['from'],
    classification_status: site.classification_status as SiteAuditSnapshot['classification_status'],
    sitemap: site.sitemap ?? null,
    link_page: site.link_page ?? null,
    access_scope: site.access_scope as SiteAuditSnapshot['access_scope'],
    status: site.status as SiteAuditSnapshot['status'],
    is_show: site.is_show,
    recommend: site.recommend ?? false,
    reason: site.reason ?? null,
    tag_ids: tagRows.map((row) => row.tag_id).sort(),
    main_tag_id: mainTagId,
    sub_tag_ids: subTagIds.length > 0 ? subTagIds : null,
    custom_sub_tags: null,
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
