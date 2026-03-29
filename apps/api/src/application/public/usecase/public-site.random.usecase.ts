import type { FastifyInstance } from 'fastify';

import { compareNames, stableHash } from '@/application/public/usecase/public-site.directory.core';
import type {
  PublicSiteDirectoryItem,
  PublicSiteRandomFailureReason,
  PublicSiteRandomFilters,
  PublicSiteRandomResult,
} from '@/application/public/usecase/public-site.types';
import {
  loadDirectoryItems,
  loadTagFilters,
} from '@/application/public/usecase/public-site.usecase';

const RANDOM_ALLOWED_PARAMS = new Set(['recommend', 'type']);

function createSiteRandomSeed(date = new Date()): string {
  return `site-go:${date.toISOString()}`;
}

function parseRandomFilters(url: URL): PublicSiteRandomFilters {
  return {
    recommend: url.searchParams.get('recommend') === 'true',
    type: url.searchParams.get('type')?.trim() ?? '',
  };
}

function resolveRandomFailureReason(
  url: URL,
  availableTypes: string[],
): PublicSiteRandomFailureReason | null {
  const { searchParams } = url;

  for (const key of RANDOM_ALLOWED_PARAMS) {
    if (searchParams.getAll(key).length > 1) {
      return 'DUPLICATE_PARAM';
    }
  }

  for (const [key] of searchParams.entries()) {
    if (!RANDOM_ALLOWED_PARAMS.has(key)) {
      return 'UNKNOWN_PARAM';
    }
  }

  if (searchParams.has('recommend') && searchParams.get('recommend') !== 'true') {
    const type = searchParams.get('type')?.trim() ?? '';
    const invalidType = searchParams.has('type') && (!type || !availableTypes.includes(type));

    return invalidType ? 'INVALID_PARAMS' : 'INVALID_RECOMMEND';
  }

  if (searchParams.has('type')) {
    const type = searchParams.get('type')?.trim() ?? '';

    if (!type || !availableTypes.includes(type)) {
      return 'INVALID_TYPE';
    }
  }

  return null;
}

function filterRandomCandidates(
  items: PublicSiteDirectoryItem[],
  filters: PublicSiteRandomFilters,
): PublicSiteDirectoryItem[] {
  return items.filter((item) => {
    if (item.status !== 'OK') {
      return false;
    }

    if (item.warningTags.length > 0) {
      return false;
    }

    if (filters.recommend && !item.featured) {
      return false;
    }

    return !filters.type || item.primaryTag === filters.type;
  });
}

function pickRandomSite(
  items: PublicSiteDirectoryItem[],
  seed: string,
): PublicSiteDirectoryItem | null {
  if (items.length === 0) {
    return null;
  }

  return (
    [...items].sort((left, right) => {
      const leftHash = stableHash(`${seed}:${left.id}`);
      const rightHash = stableHash(`${seed}:${right.id}`);

      if (leftHash !== rightHash) {
        return leftHash - rightHash;
      }

      return compareNames(left.name, right.name);
    })[0] ?? null
  );
}

export async function loadPublicSiteRandom(
  app: FastifyInstance,
  rawUrl: string,
): Promise<PublicSiteRandomResult> {
  const url = new URL(rawUrl, 'https://www.zhblogs.net');
  const filters = parseRandomFilters(url);
  const availableTypes = (await loadTagFilters(app)).mainTags
    .map((item) => item.name)
    .sort(compareNames);
  const failureReason = resolveRandomFailureReason(url, availableTypes);

  if (failureReason) {
    return {
      site: null,
      availableTypes,
      filters,
      failureReason,
    };
  }

  const target = pickRandomSite(
    filterRandomCandidates(await loadDirectoryItems(app), filters),
    createSiteRandomSeed(),
  );

  return {
    site: target,
    availableTypes,
    filters,
    failureReason: target ? null : 'NO_MATCH',
  };
}
