<script lang="ts">
  import { onMount } from 'svelte';

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
    {createSuccess}
    {deleteForm}
    {deleteErrors}
    {deletePending}
    {deleteSuccess}
    {fieldNeedsRefinement}
    {inputClass}
    {isAutoFillMissing}
    {options}
    {optionsPending}
    programOptions={options.programs.map((item) => ({
      id: item.id,
      name: item.name,
    }))}
    {queryError}
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
    {updateSuccess}
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
