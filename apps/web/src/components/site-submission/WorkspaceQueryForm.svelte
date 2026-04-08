<script lang="ts">
  import {
    ACTION_LABELS,
    AUDIT_STATUS_META,
    type FieldErrors,
    formatAuditTime,
    type QuerySubmissionFormState,
    type SubmissionStatusResult,
  } from '@/application/site-submission/site-submission.service';

  export let inputClass = '';
  export let queryForm: QuerySubmissionFormState;
  export let queryErrors: FieldErrors = {};
  export let queryPending = false;
  export let querySuccess: SubmissionStatusResult | null = null;
  export let submitQuery: () => Promise<void>;
  export let statusToneClass: (status: string) => string;
</script>

<form class="mt-6 space-y-6" on:submit|preventDefault={submitQuery}>
  <div class="space-y-2">
    <label class="block text-sm" for="query-audit-id">查询编号</label>
    <input
      id="query-audit-id"
      class={inputClass}
      bind:value={queryForm.audit_id}
      placeholder="提交成功后返回的 UUID"
    />
    {#if queryErrors.audit_id}<p class="text-xs text-[color:var(--color-fail)]">
        {queryErrors.audit_id}
      </p>{/if}
  </div>
  <button
    class="inline-flex min-h-11 items-center justify-center rounded-[5px] border border-red-700/20 px-4 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/20 dark:text-red-400"
    disabled={queryPending}
    type="submit"
  >
    {queryPending ? '查询中...' : '查询审核结果'}
  </button>

  {#if querySuccess}
    <section class="space-y-4 rounded-[5px] border border-[color:var(--color-line-med)] p-4">
      <h3 class="text-lg leading-tight">{querySuccess.site_name ?? '待审核确认'}</h3>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span
          class={`inline-flex rounded-[999px] border px-3 py-1 text-xs font-medium ${statusToneClass(querySuccess.status)}`}
        >
          {ACTION_LABELS[querySuccess.action] ?? querySuccess.action} · {AUDIT_STATUS_META[
            querySuccess.status
          ]?.label ?? querySuccess.status}
        </span>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <div>
          <p class="text-sm text-[color:var(--color-fg-3)]">提交时间</p>
          <p class="mt-2 text-sm">{formatAuditTime(querySuccess.created_time)}</p>
        </div>
        <div>
          <p class="text-sm text-[color:var(--color-fg-3)]">处理时间</p>
          <p class="mt-2 text-sm">{formatAuditTime(querySuccess.reviewed_time)}</p>
        </div>
      </div>
      <div>
        <p class="text-sm text-[color:var(--color-fg-3)]">审核备注</p>
        <p class="mt-2 text-sm leading-7">
          {querySuccess.reviewer_comment ?? '当前还没有公开备注。'}
        </p>
      </div>
      <div>
        <p class="text-sm text-[color:var(--color-fg-3)]">查询编号</p>
        <p class="mt-2 font-mono text-sm">{querySuccess.audit_id}</p>
      </div>
    </section>
  {/if}
</form>
