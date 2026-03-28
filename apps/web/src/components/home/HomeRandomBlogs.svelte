<script lang="ts">
  import { IconArrowRight, IconDice } from '@tabler/icons-svelte-runes';

  import type { SiteFeedbackPayload } from '@/application/site/site-directory.models';
  import type { PublicSiteEntry } from '@/application/site/site-public.server';
  import BlogCard from '@/components/site/BlogCard.svelte';
  import SiteFeedbackDialog from '@/components/site/SiteFeedbackDialog.svelte';

  let { randomBlogs }: { randomBlogs: PublicSiteEntry[] } = $props();

  let feedbackTarget = $state<PublicSiteEntry | null>(null);
  let feedbackSubmitting = $state(false);
  let feedbackError = $state('');

  async function submitFeedback(payload: SiteFeedbackPayload) {
    if (!feedbackTarget) {
      return;
    }

    feedbackSubmitting = true;
    feedbackError = '';

    try {
      const response = await fetch(`/api/site-directory/${feedbackTarget.slug}/feedback`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
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
</script>

<section class="border-b border-(--color-line) pb-10">
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="space-y-2">
      <p
        class="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-red-700 dark:text-red-400"
      >
        <IconDice size={14} stroke={1.9} class="block" />
        随机访问
      </p>
      <h2 class="text-2xl leading-tight tracking-[-0.03em]">猜你喜欢</h2>
    </div>
    <a
      class="inline-flex items-center gap-2 text-sm text-(--color-fg-2) transition hover:text-red-700 dark:hover:text-red-400"
      href="/site"
    >
      <span>完整列表</span>
      <IconArrowRight size={14} stroke={1.9} class="block" />
    </a>
  </div>

  <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each randomBlogs as entry (entry.id)}
      <BlogCard
        {entry}
        onFeedback={() => {
          feedbackError = '';
          feedbackTarget = entry;
        }}
      />
    {/each}
  </div>

  <SiteFeedbackDialog
    open={Boolean(feedbackTarget)}
    siteName={feedbackTarget?.name ?? ''}
    submitting={feedbackSubmitting}
    errorMessage={feedbackError}
    onCancel={() => {
      feedbackError = '';
      feedbackTarget = null;
    }}
    onSubmit={submitFeedback}
  />
</section>
