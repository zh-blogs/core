import type {
  SiteDirectoryPreference,
  SiteDirectoryResult,
} from '@/application/site/site-directory.models';

export type SiteDirectoryQueryState = SiteDirectoryResult['query'] & {
  page: number;
  pageSize: number;
};

export function createDailyStableRandomSeed(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `site-directory:${year}-${month}-${day}`;
}

export function buildSiteDirectorySearchParams(query: SiteDirectoryQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (query.q.trim()) {
    params.set('q', query.q.trim());
  }

  for (const value of query.main) {
    params.append('main', value);
  }

  for (const value of query.sub) {
    params.append('sub', value);
  }

  for (const value of query.warning) {
    params.append('warning', value);
  }

  for (const value of query.program) {
    params.append('program', value);
  }

  params.set('statusMode', query.statusMode);
  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));

  if (query.random) {
    params.set('random', 'on');
    params.set('randomSeed', query.randomSeed);
  } else {
    params.set('random', 'off');
    if (query.randomSeed.trim()) {
      params.set('randomSeed', query.randomSeed.trim());
    }
  }

  if (query.sort) {
    params.set('sort', query.sort);
    params.set('order', query.order);
  }

  return params;
}

export function hasExplicitDirectoryPreference(params: URLSearchParams): boolean {
  return params.has('random') || params.has('randomSeed') || params.has('sort');
}

export function applyDirectoryPreference(
  query: SiteDirectoryQueryState,
  preference: SiteDirectoryPreference | null,
): SiteDirectoryQueryState {
  if (!preference) {
    return query;
  }

  if (preference.randomMode === 'off') {
    return {
      ...query,
      random: false,
      sort: query.sort,
      randomSeed: preference.randomSeed ?? query.randomSeed,
    };
  }

  return {
    ...query,
    random: query.sort ? false : true,
    randomSeed: preference.randomSeed ?? query.randomSeed,
  };
}
