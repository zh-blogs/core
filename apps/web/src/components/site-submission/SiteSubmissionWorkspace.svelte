<script lang="ts">
  import { onMount } from 'svelte';

  import {
    buildSubmissionQueryHref,
    copySubmissionAuditId,
  } from '@/application/site-submission/site-submission.browser-feedback';
  import {
    type AutoFillMissingState,
    createEmptyAutoFillMissingState,
  } from '@/application/site-submission/site-submission.browser-workspace';
  import {
    createInitialCreateForm,
    createInitialDeleteForm,
    createInitialQueryForm,
    createInitialUpdateForm,
    type FieldErrors,
    type SiteResolveResult,
    type SiteSearchItem,
    type SiteSubmissionOptionsResult,
    type SubmissionPage,
    type SubmissionResult,
    type SubmissionStatusResult,
  } from '@/application/site-submission/site-submission.service';
  import { statusToneClass } from '@/application/site-submission/site-submission.status-tone';
  import ModalSurface from '@/shared/ui/ModalSurface.svelte';

  import {
    WORKSPACE_INPUT_CLASS,
    WORKSPACE_SELECT_CHEVRON_STYLE,
    WORKSPACE_SELECT_CLASS,
    WORKSPACE_TEXTAREA_CLASS,
  } from './site-submission-workspace.constants';
  import {
    createSiteSubmissionWorkspaceController,
    type ValueState,
  } from './site-submission-workspace-controller';
  import SiteSubmissionWorkspacePanel from './SiteSubmissionWorkspacePanel.svelte';
  import WorkspaceAside from './WorkspaceAside.svelte';

  export let activePage: SubmissionPage = 'create';
  export let initialIdentifier = '';
  export let initialAuditId = '';

  let options: SiteSubmissionOptionsResult = {
    main_tags: [],
    sub_tags: [],
    programs: [],
    tech_stacks: [],
  };
  let optionsPending = false;

  let createForm = createInitialCreateForm();
  let updateForm = createInitialUpdateForm();
  let deleteForm = createInitialDeleteForm();
  let queryForm = createInitialQueryForm({
    audit_id: initialAuditId,
  });

  let createErrors: FieldErrors = {};
  let updateErrors: FieldErrors = {};
  let deleteErrors: FieldErrors = {};
  let queryErrors: FieldErrors = {};

  let queryError: string | null = null;

  let createSuccess: SubmissionResult | null = null;
  let updateSuccess: SubmissionResult | null = null;
  let deleteSuccess: SubmissionResult | null = null;
  let querySuccess: SubmissionStatusResult | null = null;

  let createPending = false;
  let updatePending = false;
  let deletePending = false;
  let queryPending = false;
  let searchPending = false;
  let resolvePending = false;
  let autoFillPending = false;
  let autoFillTarget: 'create' | 'update' | null = null;
  let createAutoFillMissing: AutoFillMissingState = createEmptyAutoFillMissingState();
  let updateAutoFillMissing: AutoFillMissingState = createEmptyAutoFillMissingState();

  let searchQuery = initialIdentifier;
  let searchResults: SiteSearchItem[] = [];
  let searchError: string | null = null;
  let selectedSite: SiteResolveResult | null = null;
  let createProgramPickerValue = '';
  let updateProgramPickerValue = '';
  let copiedAuditId = '';

  const state = <T,>(get: () => T, set: (value: T) => void): ValueState<T> => ({
    get,
    set,
  });

  const controller = createSiteSubmissionWorkspaceController({
    activePage,
    options: state(
      () => options,
      (value) => {
        options = value;
      },
    ),
    optionsPending: state(
      () => optionsPending,
      (value) => {
        optionsPending = value;
      },
    ),
    forms: {
      create: state(
        () => createForm,
        (value) => {
          createForm = value;
        },
      ),
      update: state(
        () => updateForm,
        (value) => {
          updateForm = value;
        },
      ),
      delete: state(
        () => deleteForm,
        (value) => {
          deleteForm = value;
        },
      ),
      query: state(
        () => queryForm,
        (value) => {
          queryForm = value;
        },
      ),
    },
    errors: {
      create: state(
        () => createErrors,
        (value) => {
          createErrors = value;
        },
      ),
      update: state(
        () => updateErrors,
        (value) => {
          updateErrors = value;
        },
      ),
      delete: state(
        () => deleteErrors,
        (value) => {
          deleteErrors = value;
        },
      ),
      query: state(
        () => queryErrors,
        (value) => {
          queryErrors = value;
        },
      ),
      queryError: state(
        () => queryError,
        (value) => {
          queryError = value;
        },
      ),
    },
    success: {
      create: state(
        () => createSuccess,
        (value) => {
          createSuccess = value;
        },
      ),
      update: state(
        () => updateSuccess,
        (value) => {
          updateSuccess = value;
        },
      ),
      delete: state(
        () => deleteSuccess,
        (value) => {
          deleteSuccess = value;
        },
      ),
      query: state(
        () => querySuccess,
        (value) => {
          querySuccess = value;
        },
      ),
    },
    pending: {
      create: state(
        () => createPending,
        (value) => {
          createPending = value;
        },
      ),
      update: state(
        () => updatePending,
        (value) => {
          updatePending = value;
        },
      ),
      delete: state(
        () => deletePending,
        (value) => {
          deletePending = value;
        },
      ),
      query: state(
        () => queryPending,
        (value) => {
          queryPending = value;
        },
      ),
      search: state(
        () => searchPending,
        (value) => {
          searchPending = value;
        },
      ),
      resolve: state(
        () => resolvePending,
        (value) => {
          resolvePending = value;
        },
      ),
      autoFill: state(
        () => autoFillPending,
        (value) => {
          autoFillPending = value;
        },
      ),
      autoFillTarget: state(
        () => autoFillTarget,
        (value) => {
          autoFillTarget = value;
        },
      ),
    },
    search: {
      query: state(
        () => searchQuery,
        (value) => {
          searchQuery = value;
        },
      ),
      results: state(
        () => searchResults,
        (value) => {
          searchResults = value;
        },
      ),
      error: state(
        () => searchError,
        (value) => {
          searchError = value;
        },
      ),
      selectedSite: state(
        () => selectedSite,
        (value) => {
          selectedSite = value;
        },
      ),
    },
    autoFillMissing: {
      create: state(
        () => createAutoFillMissing,
        (value) => {
          createAutoFillMissing = value;
        },
      ),
      update: state(
        () => updateAutoFillMissing,
        (value) => {
          updateAutoFillMissing = value;
        },
      ),
    },
    programPicker: {
      create: state(
        () => createProgramPickerValue,
        (value) => {
          createProgramPickerValue = value;
        },
      ),
      update: state(
        () => updateProgramPickerValue,
        (value) => {
          updateProgramPickerValue = value;
        },
      ),
    },
  });

  const inputClass = WORKSPACE_INPUT_CLASS;
  const selectClass = WORKSPACE_SELECT_CLASS;
  const selectChevronStyle = WORKSPACE_SELECT_CHEVRON_STYLE;
  const textAreaClass = WORKSPACE_TEXTAREA_CLASS;
  const successTitleMap = {
    CREATE: '新增申请已进入审核',
    UPDATE: '修订申请已进入审核',
    DELETE: '删除申请已进入审核',
  } as const;
  let activeSubmissionResult: SubmissionResult | null = null;
  let activeSubmissionTitle: string;

  $: activeSubmissionResult = createSuccess ?? updateSuccess ?? deleteSuccess ?? null;
  $: activeSubmissionTitle = activeSubmissionResult
    ? (successTitleMap[activeSubmissionResult.action as keyof typeof successTitleMap] ??
      '提交申请已进入审核')
    : '';

  const {
    withInputStateClass,
    isAutoFillMissing,
    clearAutoFillMissing,
    fieldNeedsRefinement,
    updateCreateUrl,
    updateUpdateUrl,
    applyAddressInference,
    selectProgramOption,
    applyProgramCustomDraft,
    addFeed,
    removeFeed,
    updateFeedName,
    updateFeedUrl,
    selectDefaultFeed,
    getProgramPickerSelected,
    resolveSite,
    runSearch,
    runAutoFill,
    submitCreate,
    submitUpdate,
    submitDelete,
    submitQuery,
  } = controller;

  onMount(async () => {
    await controller.initialize({ initialIdentifier, initialAuditId });
  });

  async function handleCopyAuditId(auditId: string) {
    await copySubmissionAuditId(auditId);
    copiedAuditId = auditId;
  }

  function closeSubmissionResultDialog() {
    createSuccess = null;
    updateSuccess = null;
    deleteSuccess = null;
    copiedAuditId = '';
  }
</script>

<div
  class={`grid gap-6 ${
    activePage === 'query' ? 'mx-auto max-w-4xl' : 'lg:grid-cols-[minmax(0,1fr)_22rem]'
  }`}
>
  <SiteSubmissionWorkspacePanel
    {activePage}
    {autoFillPending}
    {autoFillTarget}
    {createForm}
    {createErrors}
    {createPending}
    createProgramSelectedId={getProgramPickerSelected('create')}
    {deleteForm}
    {deleteErrors}
    {deletePending}
    {fieldNeedsRefinement}
    {inputClass}
    {isAutoFillMissing}
    {options}
    {optionsPending}
    programOptions={options.programs.map((item) => ({
      id: item.id,
      name: item.name,
    }))}
    {queryErrors}
    {queryForm}
    {queryPending}
    {querySuccess}
    {resolvePending}
    {searchError}
    {searchPending}
    bind:searchQuery
    {searchResults}
    {selectClass}
    {selectChevronStyle}
    {selectedSite}
    {statusToneClass}
    {textAreaClass}
    {updateErrors}
    {updateForm}
    {updatePending}
    updateProgramSelectedId={getProgramPickerSelected('update')}
    {withInputStateClass}
    {addFeed}
    {applyAddressInference}
    {applyProgramCustomDraft}
    {clearAutoFillMissing}
    {removeFeed}
    {resolveSite}
    {runAutoFill}
    {runSearch}
    {selectDefaultFeed}
    {selectProgramOption}
    {submitCreate}
    {submitDelete}
    {submitQuery}
    {submitUpdate}
    {updateCreateUrl}
    {updateFeedName}
    {updateFeedUrl}
    {updateUpdateUrl}
  />

  {#if activePage !== 'query'}
    <WorkspaceAside {activePage} />
  {/if}
</div>

<ModalSurface
  open={Boolean(activeSubmissionResult)}
  title={activeSubmissionTitle}
  description="请保存查询编号，后续可在查询页查看处理进度。"
  tone="info"
  confirmLabel="关闭"
  cancelLabel=""
  showCancel={false}
  showHeaderClose={true}
  headerCloseAriaLabel="关闭结果提示"
  onConfirm={closeSubmissionResultDialog}
  onCancel={closeSubmissionResultDialog}
>
  {#if activeSubmissionResult}
    <div class="space-y-4">
      <div class="rounded-md border border-(--color-line-med) bg-(--color-bg) px-4 py-4">
        <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-(--color-info)">
          查询编号
        </p>
        <p class="mt-3 font-mono text-sm text-(--color-fg)">{activeSubmissionResult.audit_id}</p>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          class="rounded-md border border-(--color-line-med) px-4 py-2 text-sm text-(--color-fg) transition hover:border-(--color-line-strong)"
          type="button"
          on:click={() => handleCopyAuditId(activeSubmissionResult.audit_id)}
        >
          {copiedAuditId === activeSubmissionResult.audit_id ? '已复制查询 ID' : '复制查询 ID'}
        </button>
        <a
          class="inline-flex items-center rounded-md border border-(--color-line-med) px-4 py-2 text-sm text-(--color-fg) transition hover:border-(--color-line-strong)"
          href={buildSubmissionQueryHref(activeSubmissionResult.audit_id)}
        >
          前往查询页
        </a>
      </div>
    </div>
  {/if}
</ModalSurface>
