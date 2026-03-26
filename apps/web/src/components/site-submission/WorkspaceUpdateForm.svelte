<script lang="ts">
  import { type CustomProgramDraft } from '@/application/site-submission/site-submission.browser-form';
  import type { AutoFillFieldKey } from '@/application/site-submission/site-submission.browser-workspace';
  import { createComparableHttpUrlKey } from '@/application/site-submission/site-submission.core';
  import SingleSelectCombobox from '@/shared/ui/SingleSelectCombobox.svelte';
  import TagMultiCombobox from '@/shared/ui/TagMultiCombobox.svelte';

  import WorkspaceProgramCustomDialog from './WorkspaceProgramCustomDialog.svelte';

  export let autoFillPending = false;
  export let autoFillTarget: 'create' | 'update' | null = null;
  export let submitUpdate: () => Promise<void>;

  interface Feed {
    id: string;
    name: string;
    url: string;
  }

  interface UpdateForm {
    name: string;
    url: string;
    sign: string;
    main_tag_id: string;
    sub_tag_ids: string[];
    custom_sub_tags: string[];
    feeds: Feed[];
    default_feed_url: string;
    sitemap: string;
    link_page: string;
    submit_reason: string;
    notify_by_email: boolean;
    submitter_name: string;
    submitter_email: string;
    agree_terms: boolean;
    architecture_program_id: string;
    architecture_program_name: string;
    architecture_program_is_open_source: boolean | null;
    architecture_framework_ids: string[];
    architecture_framework_custom_names: string[];
    architecture_language_ids: string[];
    architecture_language_custom_names: string[];
    architecture_website_url: string;
    architecture_repo_url: string;
  }

  interface TagOption {
    id: string;
    name: string;
  }

  interface Options {
    main_tags: TagOption[];
    sub_tags: TagOption[];
    tech_stacks: Array<TagOption & { category?: 'FRAMEWORK' | 'LANGUAGE' }>;
  }

  export let updateForm: UpdateForm;
  export let updateErrors: Record<string, string> = {};
  export let updateSuccess: { audit_id: string } | null = null;
  export let updatePending = false;

  export let inputClass = '';
  export let textAreaClass = '';
  export let selectClass = '';
  export let selectChevronStyle = '';

  export let withInputStateClass: (base: string, warned: boolean, missing: boolean) => string;
  export let isAutoFillMissing: (kind: 'create' | 'update', field: AutoFillFieldKey) => boolean;
  export let clearAutoFillMissing: (kind: 'create' | 'update', field: AutoFillFieldKey) => void;
  export let fieldNeedsRefinement: (kind: 'create' | 'update', value: string) => boolean;

  export let updateUpdateUrl: (value: string) => void;
  export let applyAddressInference: (kind: 'create' | 'update') => void;
  export let runAutoFill: (kind: 'create' | 'update') => Promise<void>;
  export let addFeed: (kind: 'create' | 'update') => void;
  export let removeFeed: (kind: 'create' | 'update', id: string) => void;
  export let updateFeedName: (kind: 'create' | 'update', id: string, value: string) => void;
  export let updateFeedUrl: (kind: 'create' | 'update', id: string, value: string) => void;
  export let selectDefaultFeed: (kind: 'create' | 'update', url: string) => void;

  export let optionsPending = false;
  export let options: Options;
  export let programOptions: Array<{ id: string; name: string }> = [];
  export let updateProgramSelectedId = '';
  export let selectProgramForUpdate: (id: string) => void;
  export let applyProgramCustomDraftForUpdate: (draft: CustomProgramDraft) => void;
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

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await submitUpdate();
  }

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
      name: trimText(query) || trimText(updateForm.architecture_program_name),
      isOpenSource: updateForm.architecture_program_is_open_source ?? null,
      websiteUrl: updateForm.architecture_website_url ?? '',
      repoUrl: updateForm.architecture_repo_url ?? '',
      frameworkIds: [...(updateForm.architecture_framework_ids ?? [])],
      frameworkCustomNames: [...(updateForm.architecture_framework_custom_names ?? [])],
      languageIds: [...(updateForm.architecture_language_ids ?? [])],
      languageCustomNames: [...(updateForm.architecture_language_custom_names ?? [])],
    };
    customProgramDialogError = '';
    customProgramDialogOpen = true;
  };

  const hasCustomProgramSelected = () =>
    Boolean(trimText(updateForm.architecture_program_name)) &&
    !trimText(updateForm.architecture_program_id);

  const getDisplayedProgramSelectedId = () =>
    customProgramDialogOpen || hasCustomProgramSelected() ? '' : updateProgramSelectedId;

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

    applyProgramCustomDraftForUpdate({
      ...customProgramDialogDraft,
      name: normalizedValue,
    });
    closeCustomProgramDialog();
  };
</script>

<form class="relative space-y-6" onsubmit={handleSubmit}>
  {#if autoFillPending && autoFillTarget === 'update'}
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
        <label class="block text-sm" for="update-name"
          >站点名称<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <input
          id="update-name"
          class={withInputStateClass(inputClass, false, isAutoFillMissing('update', 'name'))}
          bind:value={updateForm.name}
          oninput={() => clearAutoFillMissing('update', 'name')}
        />
        {#if updateErrors.name}<p class="text-xs text-(--color-fail)">
            {updateErrors.name}
          </p>{/if}
      </div>
      <div class="space-y-2 md:col-span-2">
        <label class="block text-sm" for="update-url"
          >站点地址<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <div class="flex flex-col gap-3 md:flex-row">
          <input
            id="update-url"
            class={`${inputClass} flex-1`}
            value={updateForm.url}
            oninput={(event) => updateUpdateUrl((event.currentTarget as HTMLInputElement).value)}
          />
          <button
            class="inline-flex min-h-11 items-center justify-center rounded-md border border-(--color-line-med) px-4 text-sm"
            type="button"
            onclick={() => applyAddressInference('update')}
            disabled={autoFillPending}
          >
            同步基础地址
          </button>
          <button
            class="inline-flex min-h-11 items-center justify-center rounded-md border border-red-700/20 px-4 text-sm font-medium text-red-700 dark:border-red-400/20 dark:text-red-400"
            type="button"
            onclick={() => runAutoFill('update')}
            disabled={autoFillPending}
          >
            {autoFillPending ? '填写中...' : '自动填写'}
          </button>
        </div>
        {#if updateErrors.url}<p class="text-xs text-(--color-fail)">
            {updateErrors.url}
          </p>{/if}
      </div>
      <div class="space-y-2 md:col-span-2">
        <label class="block text-sm" for="update-sign"
          >站点简介<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <textarea
          id="update-sign"
          class={withInputStateClass(textAreaClass, false, isAutoFillMissing('update', 'sign'))}
          bind:value={updateForm.sign}
          oninput={() => clearAutoFillMissing('update', 'sign')}
        ></textarea>
        {#if updateErrors.sign}<p class="text-xs text-(--color-fail)">
            {updateErrors.sign}
          </p>{/if}
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <label class="block text-sm" for="update-main-tag"
          >主分类<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
        >
        <select
          id="update-main-tag"
          class={selectClass}
          style={selectChevronStyle}
          bind:value={updateForm.main_tag_id}
        >
          <option value="">请选择主分类</option>
          {#each options.main_tags as item (item.id)}<option value={item.id}>{item.name}</option
            >{/each}
        </select>
        {#if updateErrors.main_tag_id}<p class="text-xs text-(--color-fail)">
            {updateErrors.main_tag_id}
          </p>{/if}
      </div>
      <div class="space-y-2">
        <label class="block text-sm" for="update-sub-tags-combobox">子分类</label>
        <TagMultiCombobox
          inputId="update-sub-tags-combobox"
          options={options.sub_tags}
          bind:selectedIds={updateForm.sub_tag_ids}
          bind:customValues={updateForm.custom_sub_tags}
          disabled={optionsPending}
        />
      </div>
    </div>

    <div class="space-y-4 border-t border-(--color-line) pt-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-medium">订阅地址</p>
          <p class="mt-1 text-xs text-(--color-fg-3)">修改地址后可重新自动抓取订阅信息。</p>
        </div>
        <button
          class="rounded-md border border-(--color-line-med) px-3 py-2 text-sm"
          type="button"
          onclick={() => addFeed('update')}>新增订阅源</button
        >
      </div>
      {#if updateForm.feeds.length > 0}
        {#each updateForm.feeds as feed, index (feed.id)}
          <div class="border-t border-(--color-line) pt-3">
            <div class="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.15fr)_auto]">
              <label
                class="inline-flex items-center gap-2 rounded-[4px] border border-(--color-line) px-3 py-2 text-xs text-(--color-fg-2)"
              >
                <input
                  type="radio"
                  checked={trimText(updateForm.default_feed_url) === trimText(feed.url)}
                  onchange={() => selectDefaultFeed('update', feed.url)}
                  disabled={!trimText(feed.url)}
                />
                <span>默认订阅</span>
              </label>
              <input
                class={inputClass}
                value={feed.name}
                oninput={(event) =>
                  updateFeedName(
                    'update',
                    feed.id,
                    (event.currentTarget as HTMLInputElement).value,
                  )}
                placeholder={updateForm.feeds.length === 1 ? '默认订阅' : `订阅名称 ${index + 1}`}
              />
              <input
                class={withInputStateClass(
                  inputClass,
                  fieldNeedsRefinement('update', feed.url),
                  isAutoFillMissing('update', 'feeds'),
                )}
                value={feed.url}
                oninput={(event) =>
                  updateFeedUrl('update', feed.id, (event.currentTarget as HTMLInputElement).value)}
                placeholder="https://example.com/feed.xml"
              />
              <button
                class="rounded-md border border-(--color-line-med) px-3 py-2 text-sm"
                type="button"
                onclick={() => removeFeed('update', feed.id)}>删除</button
              >
            </div>
            <div class="mt-3 flex items-center justify-between gap-3 text-xs text-(--color-fg-3)">
              <span
                >{updateForm.feeds.length === 1
                  ? '单个订阅时可留空名称，提交时会自动记为默认订阅。'
                  : '多个订阅时请明确填写每个订阅名称。'}</span
              >
              {#if trimText(updateForm.default_feed_url) === trimText(feed.url) && trimText(feed.url)}
                <span class="font-mono uppercase tracking-[0.18em] text-(--color-info)">默认</span>
              {/if}
            </div>
            {#if fieldNeedsRefinement('update', feed.url) && !updateErrors.feeds}
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
      {#if shouldPromptDefaultFeedSelection(updateForm.feeds, updateForm.default_feed_url) && !updateErrors.default_feed_url}
        <p class="text-xs text-(--color-fail)">请选择一个默认订阅地址用于本站订阅抓取</p>
      {/if}
      {#if updateErrors.feeds}<p class="text-xs text-(--color-fail)">
          {updateErrors.feeds}
        </p>{/if}
      {#if updateErrors.default_feed_url}<p class="text-xs text-(--color-fail)">
          {updateErrors.default_feed_url}
        </p>{/if}
    </div>
  </div>

  <div class="space-y-4">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <label class="block text-sm" for="update-sitemap">网站地图</label>
        <input
          id="update-sitemap"
          class={withInputStateClass(
            inputClass,
            fieldNeedsRefinement('update', updateForm.sitemap),
            isAutoFillMissing('update', 'sitemap'),
          )}
          bind:value={updateForm.sitemap}
          oninput={() => clearAutoFillMissing('update', 'sitemap')}
        />
        {#if updateErrors.sitemap}<p class="text-xs text-(--color-fail)">
            {updateErrors.sitemap}
          </p>{/if}
        {#if fieldNeedsRefinement('update', updateForm.sitemap) && !updateErrors.sitemap}<p
            class="text-xs text-(--color-fail)"
          >
            网站地图与站点地址相同，请补充路径或清空该字段。
          </p>{/if}
      </div>
      <div class="space-y-2">
        <label class="block text-sm" for="update-link-page">友链页面</label>
        <input
          id="update-link-page"
          class={withInputStateClass(
            inputClass,
            fieldNeedsRefinement('update', updateForm.link_page),
            isAutoFillMissing('update', 'linkPage'),
          )}
          bind:value={updateForm.link_page}
          oninput={() => clearAutoFillMissing('update', 'linkPage')}
        />
        {#if updateErrors.link_page}<p class="text-xs text-(--color-fail)">
            {updateErrors.link_page}
          </p>{/if}
        {#if fieldNeedsRefinement('update', updateForm.link_page) && !updateErrors.link_page}<p
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
          <label class="block text-sm" for="update-architecture-program">程序</label>
          <div
            class={isAutoFillMissing('update', 'architecture') ? 'rounded-md autofill-missing' : ''}
          >
            <SingleSelectCombobox
              inputId="update-architecture-program"
              options={programOptions}
              selectedId={getDisplayedProgramSelectedId()}
              selectedLabel={hasCustomProgramSelected() ? updateForm.architecture_program_name : ''}
              placeholder="输入关键词筛选程序"
              customActionLabel="使用自定义程序"
              disabled={optionsPending}
              onChoose={({ id }) => selectProgramForUpdate(id)}
              onRequestCustom={({ query }) => openCustomProgramDialog(query)}
            />
          </div>
          {#if hasCustomProgramSelected()}
            <div class="mt-2 flex items-center gap-3 text-xs text-(--color-fg-2)">
              <span>
                当前使用自定义程序：<span class="font-mono"
                  >{updateForm.architecture_program_name}</span
                >
              </span>
              <button
                class="rounded-md border border-(--color-line-med) px-2 py-1 transition hover:text-(--color-fg)"
                type="button"
                onclick={() => openCustomProgramDialog('')}
              >
                编辑自定义信息
              </button>
            </div>
          {/if}
        </div>
      </div>
      {#if updateErrors.architecture_program_name}<p class="text-xs text-(--color-fail)">
          {updateErrors.architecture_program_name}
        </p>{/if}
    </div>
  </div>

  <div class="space-y-4 border-t border-(--color-line) pt-5">
    <p class="text-xs tracking-[0.16em] text-(--color-fg-3)">提交信息与通知</p>
    <div class="space-y-2">
      <label class="block text-sm" for="update-reason"
        >修改原因<span class="ml-1 text-(--color-fail)" aria-hidden="true">✱</span></label
      >
      <textarea
        id="update-reason"
        class={textAreaClass}
        bind:value={updateForm.submit_reason}
        placeholder="说明修改原因，例如信息错误、站点改版、迁移更新等。"
      ></textarea>
      {#if updateErrors.submit_reason}<p class="text-xs text-(--color-fail)">
          {updateErrors.submit_reason}
        </p>{/if}
      {#if updateErrors.changes}<p class="text-xs text-(--color-fail)">
          {updateErrors.changes}
        </p>{/if}
    </div>

    <label class="flex items-start gap-3 text-sm">
      <input class="mt-1 h-4 w-4" type="checkbox" bind:checked={updateForm.notify_by_email} />
      <span class="leading-7">审核完成后通过邮件通知我结果（可选）。</span>
    </label>
    {#if updateForm.notify_by_email}
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm" for="update-submitter-name">提交者昵称</label>
          <input
            id="update-submitter-name"
            class={inputClass}
            bind:value={updateForm.submitter_name}
          />
          {#if updateErrors.submitter_name}<p class="text-xs text-(--color-fail)">
              {updateErrors.submitter_name}
            </p>{/if}
        </div>
        <div class="space-y-2">
          <label class="block text-sm" for="update-submitter-email">提交者邮箱</label>
          <input
            id="update-submitter-email"
            class={inputClass}
            bind:value={updateForm.submitter_email}
            inputmode="email"
          />
          {#if updateErrors.submitter_email}<p class="text-xs text-(--color-fail)">
              {updateErrors.submitter_email}
            </p>{/if}
        </div>
      </div>
    {/if}
    <label class="flex items-start gap-3 text-sm">
      <input class="mt-1 h-4 w-4" type="checkbox" bind:checked={updateForm.agree_terms} />
      <!-- TODO：Add terms and conditions link -->
      <span class="leading-7"
        >我已阅读并同意 相关 条款和声明<span class="ml-1 text-(--color-fail)" aria-hidden="true"
          >✱</span
        ></span
      >
    </label>
    {#if updateErrors.agree_terms}<p class="text-xs text-(--color-fail)">
        {updateErrors.agree_terms}
      </p>{/if}
  </div>

  {#if updateSuccess}
    <div class="rounded-md border border-(--color-line-med) px-4 py-4">
      <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-(--color-info)">
        已生成查询编号
      </p>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm leading-7">
          查询编号：<span class="font-mono">{updateSuccess.audit_id}</span>
        </p>
        <a
          class="inline-flex rounded-md border border-(--color-line-med) px-3 py-2 text-sm"
          href={`/site/submit/query?audit_id=${updateSuccess.audit_id}`}>前往查询页</a
        >
      </div>
    </div>
  {/if}

  <button
    class="inline-flex min-h-11 items-center justify-center rounded-md border border-red-700/20 px-4 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/20 dark:text-red-400"
    disabled={updatePending}
    type="submit"
  >
    {updatePending ? '提交中...' : '提交修订申请'}
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
