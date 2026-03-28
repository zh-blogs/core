<script lang="ts">
  import { onMount } from 'svelte';

  import type {
    SiteDirectoryItem,
    SiteDirectoryMeta,
    SiteDirectoryPreference,
    SiteDirectoryResult,
  } from '@/application/site/site-directory.models';
  import { parseSiteDirectoryStructuredSearch } from '@/application/site/site-directory.search';
  import {
    applyDirectoryPreference,
    hasExplicitDirectoryPreference,
    type SiteDirectoryQueryState,
  } from '@/application/site/site-directory.shared';
  import {
    persistSiteDirectoryPreference,
    readSiteDirectoryPreference,
    requestSiteDirectory,
    resolveSiteDirectoryAccessSummary,
    resolveSiteDirectorySortSummary,
    submitSiteDirectoryFeedback,
    syncSiteDirectoryUrl,
  } from '@/components/site/site-directory-page.api';
  import {
    appendSiteDirectorySyntaxSnippet,
    changeSiteDirectoryPage,
    handleSiteDirectoryBooleanFilter,
    handleSiteDirectoryOrderToggle,
    handleSiteDirectoryRandomToggle,
    handleSiteDirectorySearchClear,
    handleSiteDirectorySearchDrivenFilter,
    handleSiteDirectorySearchSubmit,
    handleSiteDirectorySortChange,
    handleSiteDirectoryStatusModeChange,
  } from '@/components/site/site-directory-page.logic';
  import {
    cloneSiteDirectoryPreference,
    cloneSiteDirectoryResult,
    createInitialSiteDirectoryQuery,
  } from '@/components/site/site-directory-page.shared';
  import SiteDirectoryResultsSection from '@/components/site/SiteDirectoryResultsSection.svelte';
  import SiteDirectorySearchSection from '@/components/site/SiteDirectorySearchSection.svelte';
  import SiteFeedbackDialog from '@/components/site/SiteFeedbackDialog.svelte';

  let {
    initialMeta,
    initialResult,
    initialPreference = null,
    canUsePreference = false,
  }: {
    initialMeta: SiteDirectoryMeta;
    initialResult: SiteDirectoryResult;
    initialPreference?: SiteDirectoryPreference | null;
    canUsePreference?: boolean;
  } = $props();

  function createInitialResultValue(): SiteDirectoryResult {
    return cloneSiteDirectoryResult(initialResult);
  }

  function createInitialDraftSearchValue(): string {
    return createInitialResultValue().query.q;
  }

  function createInitialPreferenceValue(): SiteDirectoryPreference | null {
    return cloneSiteDirectoryPreference(initialPreference);
  }

  function createInitialQueryValue(): SiteDirectoryQueryState {
    return createInitialSiteDirectoryQuery(createInitialResultValue());
  }

  let result = $state(createInitialResultValue());
  let query = $state<SiteDirectoryQueryState>(createInitialQueryValue());
  let draftSearch = $state(createInitialDraftSearchValue());
  let pending = $state(false);
  let feedbackTarget = $state<SiteDirectoryItem | null>(null);
  let feedbackSubmitting = $state(false);
  let feedbackError = $state('');
  let preference = $state<SiteDirectoryPreference | null>(createInitialPreferenceValue());
  let syntaxHelpOpen = $state(false);

  const draftStructured = $derived(parseSiteDirectoryStructuredSearch(draftSearch));
  const sortSummary = $derived(resolveSiteDirectorySortSummary(query.sort));
  const accessSummary = $derived(resolveSiteDirectoryAccessSummary(draftStructured.access[0]));
  const rssSummary = $derived(
    draftStructured.rss === null ? '' : draftStructured.rss ? '有 RSS' : '无 RSS',
  );
  const featuredSummary = $derived(
    draftStructured.featured === null ? '' : draftStructured.featured ? '已推荐' : '未推荐',
  );

  async function loadDirectory(
    nextQuery: SiteDirectoryQueryState,
    options: { persistRandomPreference?: boolean } = {},
  ) {
    pending = true;

    try {
      const nextResult = await requestSiteDirectory(nextQuery);

      if (!nextResult) {
        return;
      }

      result = nextResult;
      query = {
        ...nextResult.query,
        page: nextResult.pagination.page,
        pageSize: nextResult.pagination.pageSize,
      };
      draftSearch = nextResult.query.q;
      syncSiteDirectoryUrl({
        ...nextResult.query,
        page: nextResult.pagination.page,
        pageSize: nextResult.pagination.pageSize,
      });

      if (options.persistRandomPreference) {
        const nextPreference: SiteDirectoryPreference = {
          randomMode: nextQuery.random ? 'stable' : 'off',
          randomSeed: nextQuery.random ? nextQuery.randomSeed : nextQuery.randomSeed || null,
        };
        preference = nextPreference;
        await persistSiteDirectoryPreference(canUsePreference, nextPreference);
      }
    } finally {
      pending = false;
    }
  }

  const searchContext = $derived({
    query,
    draftSearch,
    structured: draftStructured,
    setDraftSearch: (value: string) => {
      draftSearch = value;
    },
    loadDirectory,
  });

  async function submitFeedback(payload: {
    reasonType: string;
    feedbackContent: string;
    reporterName?: string | null;
    reporterEmail?: string | null;
    notifyByEmail?: boolean;
  }) {
    if (!feedbackTarget) {
      return;
    }

    feedbackSubmitting = true;
    feedbackError = '';

    try {
      const ok = await submitSiteDirectoryFeedback(feedbackTarget.slug, payload);

      if (!ok) {
        feedbackError = '提交失败，请稍后重试。';
        return;
      }

      feedbackTarget = null;
    } catch {
      feedbackError = '提交失败，请稍后重试。';
    } finally {
      feedbackSubmitting = false;
    }
  }

  onMount(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!canUsePreference) {
      return;
    }

    const hasExplicitPreference = hasExplicitDirectoryPreference(
      new URLSearchParams(window.location.search),
    );

    if (hasExplicitPreference) {
      return;
    }

    const nextPreference = preference ?? (await readSiteDirectoryPreference(canUsePreference));

    if (!nextPreference) {
      return;
    }

    preference = nextPreference;
    const preferredQuery = applyDirectoryPreference(query, nextPreference);

    if (
      preferredQuery.random === query.random &&
      preferredQuery.randomSeed === query.randomSeed &&
      preferredQuery.sort === query.sort
    ) {
      return;
    }

    await loadDirectory(preferredQuery);
  });
</script>

<div class="page-stack">
  <SiteDirectorySearchSection
    meta={initialMeta}
    value={draftSearch}
    {pending}
    structured={draftStructured}
    {syntaxHelpOpen}
    {accessSummary}
    {rssSummary}
    {featuredSummary}
    onSearchChange={(value) => {
      draftSearch = value;
    }}
    onSearchSubmit={() => handleSiteDirectorySearchSubmit(searchContext)}
    onSearchClear={() => handleSiteDirectorySearchClear(searchContext)}
    onSyntaxToggle={() => {
      syntaxHelpOpen = !syntaxHelpOpen;
    }}
    onInsertSyntaxSnippet={(snippet) =>
      appendSiteDirectorySyntaxSnippet(
        draftSearch,
        (value) => {
          draftSearch = value;
        },
        snippet,
      )}
    onSearchDrivenFilter={(field, value, multiple) =>
      handleSiteDirectorySearchDrivenFilter(searchContext, field, value, multiple)}
    onBooleanFilter={(field, value) =>
      handleSiteDirectoryBooleanFilter(searchContext, field, value)}
  />

  <SiteDirectoryResultsSection
    {result}
    {pending}
    {sortSummary}
    onStatusModeChange={(nextStatusMode) =>
      handleSiteDirectoryStatusModeChange(searchContext, nextStatusMode)}
    onRandomToggle={() => handleSiteDirectoryRandomToggle(searchContext)}
    onSortChange={(value) => handleSiteDirectorySortChange(searchContext, value)}
    onOrderToggle={() => handleSiteDirectoryOrderToggle(searchContext)}
    onChangePage={(nextPage) => changeSiteDirectoryPage(result, searchContext, nextPage)}
    onFeedback={(item) => {
      feedbackError = '';
      feedbackTarget = item;
    }}
  />
</div>

<SiteFeedbackDialog
  open={Boolean(feedbackTarget)}
  siteName={feedbackTarget?.name ?? '站点'}
  submitting={feedbackSubmitting}
  errorMessage={feedbackError}
  onCancel={() => {
    feedbackError = '';
    feedbackTarget = null;
  }}
  onSubmit={submitFeedback}
/>
