import type { SiteDirectoryResult } from '@/application/site/site-directory.models';
import {
  appendSiteDirectorySearchSnippet,
  serializeSiteDirectoryStructuredSearch,
  type SiteDirectoryStructuredSearchState,
} from '@/application/site/site-directory.search';
import {
  createDailyStableRandomSeed,
  type SiteDirectoryQueryState,
} from '@/application/site/site-directory.shared';
import {
  cloneStructuredSearchState,
  createQueryFromSiteDirectorySearch,
  toggleStructuredSelection,
} from '@/components/site/site-directory-page.shared';

type DirectoryLoader = (
  nextQuery: SiteDirectoryQueryState,
  options?: { persistRandomPreference?: boolean },
) => Promise<void>;

type SearchContext = {
  query: SiteDirectoryQueryState;
  draftSearch: string;
  structured: SiteDirectoryStructuredSearchState;
  setDraftSearch: (value: string) => void;
  loadDirectory: DirectoryLoader;
};

function updateStructuredSearch(
  structured: SiteDirectoryStructuredSearchState,
  setDraftSearch: (value: string) => void,
  mutate: (value: SiteDirectoryStructuredSearchState) => void,
): string {
  const next = cloneStructuredSearchState(structured);
  mutate(next);
  const nextSearch = serializeSiteDirectoryStructuredSearch(next);
  setDraftSearch(nextSearch);
  return nextSearch;
}

export function handleSiteDirectorySearchDrivenFilter(
  context: SearchContext,
  field: 'main' | 'sub' | 'warning' | 'program' | 'access',
  value: string,
  multiple: boolean,
) {
  const nextSearch = updateStructuredSearch(context.structured, context.setDraftSearch, (next) => {
    next[field] = toggleStructuredSelection(next[field], value, multiple);
  });

  return context.loadDirectory(
    createQueryFromSiteDirectorySearch(nextSearch, context.query, {
      page: 1,
    }),
  );
}

export function handleSiteDirectoryBooleanFilter(
  context: SearchContext,
  field: 'rss' | 'featured',
  value: boolean,
) {
  const nextSearch = updateStructuredSearch(context.structured, context.setDraftSearch, (next) => {
    next[field] = next[field] === value ? null : value;
  });

  return context.loadDirectory(
    createQueryFromSiteDirectorySearch(nextSearch, context.query, {
      page: 1,
    }),
  );
}

export function handleSiteDirectorySearchSubmit(context: SearchContext) {
  return context.loadDirectory(
    createQueryFromSiteDirectorySearch(context.draftSearch, context.query, {
      page: 1,
    }),
  );
}

export function handleSiteDirectorySearchClear(context: SearchContext) {
  const resetQuery: SiteDirectoryQueryState = {
    ...context.query,
    q: '',
    main: [],
    sub: [],
    warning: [],
    program: [],
    statusMode: 'normal',
    random: true,
    sort: null,
    order: 'desc',
    randomSeed: createDailyStableRandomSeed(),
    page: 1,
  };

  context.setDraftSearch('');
  return context.loadDirectory(resetQuery, { persistRandomPreference: true });
}

export function handleSiteDirectoryRandomToggle(context: SearchContext) {
  const baseQuery = createQueryFromSiteDirectorySearch(context.draftSearch, context.query);
  const nextRandom = !baseQuery.random || Boolean(baseQuery.sort);

  return context.loadDirectory(
    {
      ...baseQuery,
      random: nextRandom,
      sort: nextRandom ? null : baseQuery.sort,
      page: 1,
    },
    { persistRandomPreference: true },
  );
}

export function handleSiteDirectorySortChange(context: SearchContext, value: string) {
  const nextSort =
    value === 'updated' || value === 'joined' || value === 'visits' || value === 'articles'
      ? value
      : null;
  const baseQuery = createQueryFromSiteDirectorySearch(context.draftSearch, context.query);

  return context.loadDirectory({
    ...baseQuery,
    sort: nextSort,
    random: nextSort ? false : baseQuery.random,
    page: 1,
  });
}

export function handleSiteDirectoryStatusModeChange(
  context: SearchContext,
  nextStatusMode: 'normal' | 'abnormal',
) {
  if (context.query.statusMode === nextStatusMode) {
    return Promise.resolve();
  }

  const baseQuery = createQueryFromSiteDirectorySearch(context.draftSearch, context.query);

  return context.loadDirectory({
    ...baseQuery,
    statusMode: nextStatusMode,
    page: 1,
  });
}

export function handleSiteDirectoryOrderToggle(context: SearchContext) {
  const baseQuery = createQueryFromSiteDirectorySearch(context.draftSearch, context.query);

  return context.loadDirectory({
    ...baseQuery,
    order: baseQuery.order === 'asc' ? 'desc' : 'asc',
    page: 1,
  });
}

export function appendSiteDirectorySyntaxSnippet(
  draftSearch: string,
  setDraftSearch: (value: string) => void,
  snippet: string,
) {
  setDraftSearch(appendSiteDirectorySearchSnippet(draftSearch, snippet));
}

export function changeSiteDirectoryPage(
  result: SiteDirectoryResult,
  context: SearchContext,
  nextPage: number,
) {
  if (nextPage < 1 || nextPage > result.pagination.totalPages || nextPage === context.query.page) {
    return Promise.resolve();
  }

  return context.loadDirectory(
    createQueryFromSiteDirectorySearch(context.draftSearch, context.query, {
      page: nextPage,
    }),
  );
}
