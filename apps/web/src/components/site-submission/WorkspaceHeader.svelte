<script lang="ts">
  import type { SubmissionPage } from '@/application/site-submission/site-submission.service';

  export let activePage: SubmissionPage = 'create';
</script>

<div
  class="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--color-line)] pb-5"
>
  <div class="space-y-2">
    <p class="font-mono text-[11px] uppercase tracking-[0.18em] text-red-700 dark:text-red-400">
      公开提交流程
    </p>
    <h2 class="text-[clamp(1.8rem,4vw,2.7rem)] leading-[1.04] tracking-[-0.04em]">
      {#if activePage === 'create'}
        新增站点
      {:else if activePage === 'update'}
        修订站点资料
      {:else if activePage === 'delete'}
        提交删除申请
      {:else}
        查询审核结果
      {/if}
    </h2>
  </div>

  <nav class="flex flex-wrap gap-2 text-sm">
    <a
      class={`rounded-[4px] border px-3 py-2 transition ${
        activePage === 'create'
          ? 'border-[color:var(--color-line-med)] text-[color:var(--color-fg)]'
          : 'border-[color:var(--color-line)] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]'
      }`}
      href="/site/submit/"
    >
      新增
    </a>
    <a
      class={`rounded-[4px] border px-3 py-2 transition ${
        activePage === 'update'
          ? 'border-[color:var(--color-line-med)] text-[color:var(--color-fg)]'
          : 'border-[color:var(--color-line)] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]'
      }`}
      href="/site/submit/update"
    >
      修订
    </a>
    <a
      class={`rounded-[4px] border px-3 py-2 transition ${
        activePage === 'delete'
          ? 'border-[color:var(--color-line-med)] text-[color:var(--color-fg)]'
          : 'border-[color:var(--color-line)] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]'
      }`}
      href="/site/submit/delete"
    >
      删除
    </a>
    <a
      class={`rounded-[4px] border px-3 py-2 transition ${
        activePage === 'query'
          ? 'border-[color:var(--color-line-med)] text-[color:var(--color-fg)]'
          : 'border-[color:var(--color-line)] text-[color:var(--color-fg-2)] hover:text-[color:var(--color-fg)]'
      }`}
      href="/site/submit/query"
    >
      查询
    </a>
  </nav>
</div>
