<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onDestroy } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade, scale } from 'svelte/transition';

  type ModalTone = 'neutral' | 'info' | 'warning' | 'danger';

  let {
    open = false,
    title = '',
    description = '',
    tone = 'neutral',
    confirmLabel = '确定',
    cancelLabel = '取消',
    dismissible = true,
    showCancel = true,
    onConfirm,
    onCancel,
    children,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    tone?: ModalTone;
    confirmLabel?: string;
    cancelLabel?: string;
    dismissible?: boolean;
    showCancel?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    children?: Snippet;
  } = $props();

  const headingToneClassMap: Record<ModalTone, string> = {
    neutral: 'text-[color:var(--color-fg)]',
    info: 'text-[color:var(--color-info)]',
    warning: 'text-[color:var(--color-warn)]',
    danger: 'text-[color:var(--color-fail)]',
  };

  let previousOverflow = '';
  const backdropMotion = { duration: 160, easing: cubicOut };
  const backdropExitMotion = { duration: 140, easing: cubicOut };
  const panelEnterMotion = { duration: 180, start: 0.97, opacity: 0.18, easing: cubicOut };
  const panelExitMotion = { duration: 150, start: 1, opacity: 0.1, easing: cubicOut };
  const transitionHelpers = [fade, scale];
  void transitionHelpers;

  const handleCancel = () => {
    onCancel?.();
  };

  const handleConfirm = () => {
    onConfirm?.();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!open || !dismissible) {
      return;
    }

    if (event.key === 'Escape') {
      handleCancel();
    }
  };

  const restoreDocumentState = () => {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = previousOverflow;
    previousOverflow = '';
    window.removeEventListener('keydown', handleKeydown);
  };

  $effect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    if (!open) {
      restoreDocumentState();
      return;
    }

    if (!previousOverflow) {
      previousOverflow = document.body.style.overflow;
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeydown);

    return () => {
      restoreDocumentState();
    };
  });

  onDestroy(() => {
    restoreDocumentState();
  });
</script>

{#if open}
  <div
    class="fixed inset-0 z-[80] flex items-center justify-center bg-[color:color-mix(in_srgb,var(--color-bg)_28%,rgba(12,10,9,0.72))] px-4 py-8"
    in:fade={backdropMotion}
    out:fade={backdropExitMotion}
    onclick={(event) => {
      if (dismissible && event.target === event.currentTarget) {
        handleCancel();
      }
    }}
    role="presentation"
  >
    <div
      class="w-full max-w-[34rem] rounded-[5px] border border-[color:var(--color-line-med)] bg-[color:var(--color-bg-raised)] p-5 shadow-[0_22px_48px_rgba(28,25,23,0.18)] dark:shadow-[0_22px_48px_rgba(0,0,0,0.42)] sm:p-6"
      in:scale={panelEnterMotion}
      out:scale={panelExitMotion}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-surface-title"
    >
      <div class="space-y-2">
        <h2
          id="modal-surface-title"
          class={`text-xl tracking-[-0.03em] ${headingToneClassMap[tone]}`}
        >
          {title}
        </h2>
        {#if description}
          <p class="text-sm leading-6 text-[color:var(--color-fg-2)]">{description}</p>
        {/if}
      </div>

      <div class="mt-4 text-sm leading-7 text-[color:var(--color-fg-2)]">
        {@render children?.()}
      </div>

      <div class="mt-6 flex flex-wrap justify-end gap-3">
        {#if showCancel}
          <button
            class="rounded-[5px] px-4 py-2 text-sm text-[color:var(--color-fg-2)] transition hover:bg-[color:color-mix(in_srgb,var(--color-bg)_76%,transparent)] hover:text-[color:var(--color-fg)]"
            type="button"
            onclick={handleCancel}
          >
            {cancelLabel}
          </button>
        {/if}
        <button
          class={`rounded-[5px] px-4 py-2 text-sm transition hover:bg-[color:color-mix(in_srgb,var(--color-bg)_76%,transparent)] ${
            tone === 'danger'
              ? 'text-[color:var(--color-fail)]'
              : tone === 'warning'
                ? 'text-[color:var(--color-warn)]'
                : tone === 'info'
                  ? 'text-[color:var(--color-info)]'
                  : 'text-[color:var(--color-fg)]'
          }`}
          type="button"
          onclick={handleConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}
