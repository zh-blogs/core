<script lang="ts">
  import { type CustomProgramDraft } from '@/application/site-submission/site-submission.browser-form';
  import type { AutoFillFieldKey } from '@/application/site-submission/site-submission.browser-workspace';
  import { createComparableHttpUrlKey } from '@/application/site-submission/site-submission.core';
  import type {
    CreateSubmissionFormState,
    FieldErrors,
    SiteSubmissionOptionsResult,
  } from '@/application/site-submission/site-submission.service';
  import SingleSelectCombobox from '@/shared/ui/SingleSelectCombobox.svelte';
  import TagMultiCombobox from '@/shared/ui/TagMultiCombobox.svelte';

  import WorkspaceProgramCustomDialog from './WorkspaceProgramCustomDialog.svelte';

  export let autoFillPending = false;
  export let autoFillTarget: 'create' | 'update' | null = null;
  export let submitCreate: () => Promise<void>;

  export let createForm: CreateSubmissionFormState;
  export let createErrors: FieldErrors = {};
  export let createSuccess: { audit_id: string } | null = null;
  export let createPending = false;

  export let inputClass = '';
  export let textAreaClass = '';
  export let selectClass = '';
  export let selectChevronStyle = '';

  export let withInputStateClass: (base: string, warned: boolean, missing: boolean) => string;
  export let isAutoFillMissing: (kind: 'create' | 'update', field: AutoFillFieldKey) => boolean;
  export let clearAutoFillMissing: (kind: 'create' | 'update', field: AutoFillFieldKey) => void;
  export let fieldNeedsRefinement: (kind: 'create' | 'update', value: string) => boolean;

  export let updateCreateUrl: (value: string) => void;
  export let applyAddressInference: (kind: 'create' | 'update') => void;
  export let runAutoFill: (kind: 'create' | 'update') => Promise<void>;
  export let addFeed: (kind: 'create' | 'update') => void;
  export let removeFeed: (kind: 'create' | 'update', id: string) => void;
  export let updateFeedName: (kind: 'create' | 'update', id: string, value: string) => void;
  export let updateFeedUrl: (kind: 'create' | 'update', id: string, value: string) => void;
  export let selectDefaultFeed: (kind: 'create' | 'update', url: string) => void;

  export let optionsPending = false;
  export let options: SiteSubmissionOptionsResult;
  export let programOptions: Array<{ id: string; name: string }> = [];
  export let createProgramSelectedId = '';
  export let selectProgramForCreate: (id: string) => void;
  export let applyProgramCustomDraftForCreate: (draft: CustomProgramDraft) => void;
  export let trimText: (value: string) => string;

  let customProgramDialogOpen = false;
  let customProgramDialogError = '';
  let customProgramDialogDraft: CustomProgramDraft = {
    name: '',
    isOpenSource: null,
    websiteUrl: '',
    repoUrl: '',
    frameworkIds: [],
    frameworkCustomNames: [],
    languageIds: [],
    languageCustomNames: [],
  };

  const shouldPromptDefaultFeedSelection = (
    feeds: Array<{ url: string }>,
    defaultFeedUrl: string,
  ): boolean => {
    const uniqueFeedUrls = new Set(
      feeds
        .map((feed) => createComparableHttpUrlKey(feed.url))
        .filter((value): value is string => Boolean(value)),
    );

    if (uniqueFeedUrls.size <= 1) {
      return false;
    }

    const comparableDefaultFeedUrl = createComparableHttpUrlKey(defaultFeedUrl);

    return !comparableDefaultFeedUrl || !uniqueFeedUrls.has(comparableDefaultFeedUrl);
  };

  const getTechStackOptions = () =>
    (options?.tech_stacks ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
    }));

  const openCustomProgramDialog = (query: string) => {
    customProgramDialogDraft = {
      name: trimText(query) || trimText(createForm.architecture_program_name),
      isOpenSource: createForm.architecture_program_is_open_source ?? null,
      websiteUrl: createForm.architecture_website_url ?? '',
      repoUrl: createForm.architecture_repo_url ?? '',
      frameworkIds: [...(createForm.architecture_framework_ids ?? [])],
      frameworkCustomNames: [...(createForm.architecture_framework_custom_names ?? [])],
      languageIds: [...(createForm.architecture_language_ids ?? [])],
      languageCustomNames: [...(createForm.architecture_language_custom_names ?? [])],
    };
    customProgramDialogError = '';
    customProgramDialogOpen = true;
  };

  const hasCustomProgramSelected = () =>
    Boolean(trimText(createForm.architecture_program_name)) &&
    !trimText(createForm.architecture_program_id);

  const getDisplayedProgramSelectedId = () =>
    customProgramDialogOpen || hasCustomProgramSelected() ? '' : createProgramSelectedId;

  const closeCustomProgramDialog = () => {
    customProgramDialogOpen = false;
    customProgramDialogError = '';
  };

  const confirmCustomProgramDialog = () => {
    const normalizedValue = trimText(customProgramDialogDraft.name);

    if (!normalizedValue) {
      customProgramDialogError = '请输入程序名称后再确认。';
      return;
    }

    if (normalizedValue.length > 128) {
      customProgramDialogError = '自定义程序名称不能超过 128 个字符。';
      return;
    }

    applyProgramCustomDraftForCreate({
      ...customProgramDialogDraft,
      name: normalizedValue,
    });
    closeCustomProgramDialog();
  };
</script>

<form class="relative mt-6 space-y-6" on:submit|preventDefault={submitCreate}>
  {#if autoFillPending && autoFillTarget === 'create'}
    <div
      class="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-(--color-bg)/65 backdrop-blur-[1.5px]"
    >
      <div class="flex flex-col items-center gap-2">
        <span
          class="h-6 w-6 animate-spin rounded-full border-2 border-red-700 border-t-transparent dark:border-red-400 dark:border-t-transparent"
          aria-hidden="true"
        ></span>
        <p class="text-sm text-(--color-fg-2)">自动抓取中，请稍候...</p>
      </div>
    </div>
  {/if}
  <div class="space-y-4">
    <p class="text-xs tracking-[0.16em] text-(--color-fg-3)">博客信息</p>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2 md:col-span-2">
        <label class="block text-sm" for="create-name"
          >站点名称<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <input
          id="create-name"
          class={withInputStateClass(inputClass, false, isAutoFillMissing('create', 'name'))}
          bind:value={createForm.name}
          on:input={() => clearAutoFillMissing('create', 'name')}
          placeholder="例如：Example Blog"
        />
        {#if createErrors.name}<p class="text-xs text-(--color-fail)">
            {createErrors.name}
          </p>{/if}
      </div>
      <div class="space-y-2 md:col-span-2">
        <label class="block text-sm" for="create-url"
          >站点地址<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <div class="flex flex-col gap-3 md:flex-row">
          <input
            id="create-url"
            class={`${inputClass} flex-1`}
            value={createForm.url}
            on:input={(event) => updateCreateUrl((event.currentTarget as HTMLInputElement).value)}
            placeholder="https://example.com"
          />
          <button
            class="inline-flex min-h-11 items-center justify-center rounded-md border border-(--color-line-med) px-4 text-sm"
            type="button"
            on:click={() => applyAddressInference('create')}
            disabled={autoFillPending}
          >
            同步基础地址
          </button>
          <button
            class="inline-flex min-h-11 items-center justify-center rounded-md border border-red-700/20 px-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:text-red-400"
            type="button"
            on:click={() => runAutoFill('create')}
            disabled={autoFillPending}
          >
            {autoFillPending ? '填写中...' : '自动填写'}
          </button>
        </div>
        {#if createErrors.url}<p class="text-xs text-(--color-fail)">
            {createErrors.url}
          </p>{/if}
      </div>
      <div class="space-y-2 md:col-span-2">
        <label class="block text-sm" for="create-sign"
          >站点简介<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <textarea
          id="create-sign"
          class={withInputStateClass(textAreaClass, false, isAutoFillMissing('create', 'sign'))}
          bind:value={createForm.sign}
          on:input={() => clearAutoFillMissing('create', 'sign')}
          placeholder="请简要介绍站点内容、或者是个性签名。"
        ></textarea>
        {#if createErrors.sign}<p class="text-xs text-(--color-fail)">
            {createErrors.sign}
          </p>{/if}
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <label class="block text-sm" for="create-main-tag"
          >主分类<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <select
          id="create-main-tag"
          class={selectClass}
          style={selectChevronStyle}
          bind:value={createForm.main_tag_id}
          disabled={optionsPending}
        >
          <option value="">请选择主分类</option>
          {#each options.main_tags as item (item.id)}
            <option value={item.id}>{item.name}</option>
          {/each}
        </select>
        {#if createErrors.main_tag_id}<p class="text-xs text-(--color-fail)">
            {createErrors.main_tag_id}
          </p>{/if}
      </div>
      <div class="space-y-2">
        <label class="block text-sm" for="create-sub-tags-combobox">子分类</label>
        <TagMultiCombobox
          inputId="create-sub-tags-combobox"
          options={options.sub_tags}
          bind:selectedIds={createForm.sub_tag_ids}
          bind:customValues={createForm.custom_sub_tags}
          disabled={optionsPending}
        />
      </div>
    </div>

    <div class="space-y-4 border-t border-(--color-line) pt-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-medium">订阅地址</p>
          <p class="mt-1 text-xs leading-6 text-(--color-fg-3)">
            支持多个不同内容的订阅地址，请至少提供一个有效的订阅地址，或保持为空以跳过该项。
          </p>
        </div>
        <button
          class="rounded-md border border-(--color-line-med) px-3 py-2 text-sm"
          type="button"
          on:click={() => addFeed('create')}>新增订阅源</button
        >
      </div>
      {#if createForm.feeds.length > 0}
        {#each createForm.feeds as feed, index (feed.id)}
          <div class="border-t border-(--color-line) pt-3">
            <div class="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.15fr)_auto]">
              <label
                class="inline-flex items-center gap-2 rounded-[4px] border border-(--color-line) px-3 py-2 text-xs text-(--color-fg-2)"
              >
                <input
                  type="radio"
                  checked={trimText(createForm.default_feed_url) === trimText(feed.url)}
                  on:change={() => selectDefaultFeed('create', feed.url)}
                  disabled={!trimText(feed.url)}
                  aria-label={`默认订阅 ${index + 1}`}
                />
                <span>默认订阅</span>
              </label>
              <input
                class={inputClass}
                value={feed.name}
                on:input={(event) =>
                  updateFeedName(
                    'create',
                    feed.id,
                    (event.currentTarget as HTMLInputElement).value,
                  )}
                placeholder={createForm.feeds.length === 1 ? '默认订阅' : `订阅名称 ${index + 1}`}
              />
              <input
                class={withInputStateClass(
                  inputClass,
                  fieldNeedsRefinement('create', feed.url),
                  isAutoFillMissing('create', 'feeds'),
                )}
                value={feed.url}
                on:input={(event) =>
                  updateFeedUrl('create', feed.id, (event.currentTarget as HTMLInputElement).value)}
                placeholder="https://example.com/feed.xml"
              />
              <button
                class="rounded-md border border-(--color-line-med) px-3 py-2 text-sm"
                type="button"
                on:click={() => removeFeed('create', feed.id)}>删除</button
              >
            </div>
            <div class="mt-3 flex items-center justify-between gap-3 text-xs text-(--color-fg-3)">
              <span
                >{createForm.feeds.length === 1
                  ? '单个订阅时可留空名称，提交时会自动记为默认订阅。'
                  : '多个订阅时请明确填写每个订阅名称。'}</span
              >
              {#if trimText(createForm.default_feed_url) === trimText(feed.url) && trimText(feed.url)}
                <span class="font-mono uppercase tracking-[0.18em] text-(--color-info)">默认</span>
              {/if}
            </div>
            {#if fieldNeedsRefinement('create', feed.url) && !createErrors.feeds}
              <p class="mt-2 text-xs text-(--color-fail)">
                当前订阅地址与站点地址一致，请补充具体路径或清空该项。
              </p>
            {/if}
          </div>
        {/each}
      {:else}
        <div
          class="border-t border-dashed border-(--color-line-med) px-1 py-5 text-sm leading-7 text-(--color-fg-3)"
        >
          当前没有订阅地址。你可以保持为空，或手动新增一个订阅地址。
        </div>
      {/if}
      {#if shouldPromptDefaultFeedSelection(createForm.feeds, createForm.default_feed_url) && !createErrors.default_feed_url}
        <p class="text-xs text-(--color-fail)">请选择一个默认订阅地址用于本站订阅抓取</p>
      {/if}
      {#if createErrors.feeds}<p class="text-xs text-(--color-fail)">
          {createErrors.feeds}
        </p>{/if}
      {#if createErrors.default_feed_url}<p class="text-xs text-(--color-fail)">
          {createErrors.default_feed_url}
        </p>{/if}
    </div>

    <div class="space-y-4">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm" for="create-sitemap">网站地图</label>
          <input
            id="create-sitemap"
            class={withInputStateClass(
              inputClass,
              fieldNeedsRefinement('create', createForm.sitemap),
              isAutoFillMissing('create', 'sitemap'),
            )}
            bind:value={createForm.sitemap}
            on:input={() => clearAutoFillMissing('create', 'sitemap')}
            placeholder="https://example.com/sitemap.xml"
          />
          {#if createErrors.sitemap}<p class="text-xs text-(--color-fail)">
              {createErrors.sitemap}
            </p>{/if}
          {#if fieldNeedsRefinement('create', createForm.sitemap) && !createErrors.sitemap}<p
              class="text-xs text-(--color-fail)"
            >
              网站地图与站点地址相同，请补充路径或清空该字段。
            </p>{/if}
        </div>
        <div class="space-y-2">
          <label class="block text-sm" for="create-link-page">友链页面</label>
          <input
            id="create-link-page"
            class={withInputStateClass(
              inputClass,
              fieldNeedsRefinement('create', createForm.link_page),
              isAutoFillMissing('create', 'linkPage'),
            )}
            bind:value={createForm.link_page}
            on:input={() => clearAutoFillMissing('create', 'linkPage')}
            placeholder="https://example.com/friends"
          />
          {#if createErrors.link_page}<p class="text-xs text-(--color-fail)">
              {createErrors.link_page}
            </p>{/if}
          {#if fieldNeedsRefinement('create', createForm.link_page) && !createErrors.link_page}<p
              class="text-xs text-(--color-fail)"
            >
              友链页与站点地址相同，请补充路径或清空该字段。
            </p>{/if}
        </div>
      </div>

      <div class="space-y-4 border-t border-(--color-line) pt-5">
        <div>
          <p class="text-sm font-medium">架构程序信息</p>
          <p class="mt-1 text-xs leading-6 text-(--color-fg-3)">
            选择已有程序时直接使用数据库中的程序项。使用自定义程序时，请在弹窗里完整填写程序补充信息和技术栈。
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2 md:col-span-2">
            <label class="block text-sm" for="create-architecture-program">程序</label>
            <div
              class={isAutoFillMissing('create', 'architecture')
                ? `rounded-md autofill-missing`
                : ''}
            >
              <SingleSelectCombobox
                inputId="create-architecture-program"
                options={programOptions}
                selectedId={getDisplayedProgramSelectedId()}
                selectedLabel={hasCustomProgramSelected()
                  ? createForm.architecture_program_name
                  : ''}
                placeholder="输入关键词筛选程序"
                customActionLabel="使用自定义程序"
                disabled={optionsPending}
                onChoose={({ id }) => selectProgramForCreate(id)}
                onRequestCustom={({ query }) => openCustomProgramDialog(query)}
              />
            </div>
            {#if hasCustomProgramSelected()}
              <div class="mt-2 flex items-center gap-3 text-xs text-(--color-fg-2)">
                <span>
                  当前使用自定义程序：<span class="font-mono"
                    >{createForm.architecture_program_name}</span
                  >
                </span>
                <button
                  class="rounded-md border border-(--color-line-med) px-2 py-1 transition hover:text-(--color-fg)"
                  type="button"
                  on:click={() => openCustomProgramDialog('')}
                >
                  编辑自定义信息
                </button>
              </div>
            {/if}
          </div>
        </div>
        {#if createErrors.architecture_program_name}<p class="text-xs text-(--color-fail)">
            {createErrors.architecture_program_name}
          </p>{/if}
      </div>
    </div>
  </div>

  <div class="space-y-4 border-t border-(--color-line) pt-5">
    <p class="text-xs tracking-[0.16em] text-(--color-fg-3)">提交信息与通知</p>
    <label class="flex items-start gap-3 text-sm">
      <input class="mt-1 h-4 w-4" type="checkbox" bind:checked={createForm.notify_by_email} />
      <span class="leading-7">审核完成后通过邮件通知我结果（可选）。</span>
    </label>
    {#if createForm.notify_by_email}
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm" for="create-submitter-name">提交者昵称</label>
          <input
            id="create-submitter-name"
            class={inputClass}
            bind:value={createForm.submitter_name}
            placeholder="例如：Alice"
          />
          {#if createErrors.submitter_name}<p class="text-xs text-(--color-fail)">
              {createErrors.submitter_name}
            </p>{/if}
        </div>
        <div class="space-y-2">
          <label class="block text-sm" for="create-submitter-email">提交者邮箱</label>
          <input
            id="create-submitter-email"
            class={inputClass}
            bind:value={createForm.submitter_email}
            placeholder="name@example.com"
            inputmode="email"
          />
          {#if createErrors.submitter_email}<p class="text-xs text-(--color-fail)">
              {createErrors.submitter_email}
            </p>{/if}
        </div>
      </div>
    {/if}
    <label class="flex items-start gap-3 text-sm">
      <input class="mt-1 h-4 w-4" type="checkbox" bind:checked={createForm.agree_terms} />
      <span class="leading-7"
        >我确认提交信息真实可用，并同意进入人工审核流程。<span
          class="ml-1 text-(--color-fail)"
          aria-hidden="true">✱</span
        ></span
      >
    </label>
    {#if createErrors.agree_terms}<p class="text-xs text-(--color-fail)">
        {createErrors.agree_terms}
      </p>{/if}
  </div>

  {#if createSuccess}
    <div class="rounded-md border border-(--color-line-med) px-4 py-4">
      <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-(--color-info)">
        已生成查询编号
      </p>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm leading-7">
          查询编号：<span class="font-mono">{createSuccess.audit_id}</span>
        </p>
        <a
          class="inline-flex rounded-md border border-(--color-line-med) px-3 py-2 text-sm"
          href={`/site/submit/query?audit_id=${createSuccess.audit_id}`}>前往查询页</a
        >
      </div>
    </div>
  {/if}

  <button
    class="inline-flex min-h-11 items-center justify-center rounded-md border border-red-700/20 px-4 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/20 dark:text-red-400"
    disabled={createPending}
    type="submit"
  >
    {createPending ? '提交中...' : '提交新增申请'}
  </button>
</form>

<WorkspaceProgramCustomDialog
  bind:open={customProgramDialogOpen}
  bind:programName={customProgramDialogDraft.name}
  bind:programOpenSource={customProgramDialogDraft.isOpenSource}
  bind:websiteUrl={customProgramDialogDraft.websiteUrl}
  bind:repoUrl={customProgramDialogDraft.repoUrl}
  bind:frameworkIds={customProgramDialogDraft.frameworkIds}
  bind:frameworkCustomNames={customProgramDialogDraft.frameworkCustomNames}
  bind:languageIds={customProgramDialogDraft.languageIds}
  bind:languageCustomNames={customProgramDialogDraft.languageCustomNames}
  techStackOptions={getTechStackOptions()}
  error={customProgramDialogError}
  onCancel={closeCustomProgramDialog}
  onConfirm={confirmCustomProgramDialog}
  onProgramNameInput={() => {
    customProgramDialogError = '';
  }}
/>
