<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';

  let {
    title = '',
    placement = 'bottom',
    widthClass = 'w-[18rem]',
    trigger,
    children,
  }: {
    title?: string;
    placement?: 'top' | 'bottom';
    widthClass?: string;
    trigger?: Snippet;
    children?: Snippet;
  } = $props();

  let root: HTMLDivElement | null = null;
  let open = $state(false);

  let panelPositionClass = $derived(
    placement === 'top' ? 'bottom-[calc(100%+0.75rem)]' : 'top-[calc(100%+0.75rem)]',
  );

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  onMount(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (root?.contains(event.target)) {
        return;
      }

      close();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeydown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="relative inline-flex" bind:this={root}>
  <span
    class="inline-flex"
    role="button"
    tabindex="0"
    onclick={toggle}
    onkeydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }

      if (event.key === 'Escape') {
        close();
      }
    }}
  >
    {@render trigger?.()}
  </span>

  {#if open}
    <div
      class={`absolute left-1/2 z-30 -translate-x-1/2 rounded-[5px] border border-(--color-line-med) bg-(--color-bg-raised) p-4 shadow-[0_18px_40px_rgba(28,25,23,0.14)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)] ${panelPositionClass} ${widthClass}`}
      role="dialog"
      aria-modal="false"
    >
      {#if title}
        <p class="text-sm font-medium text-(--color-fg)">{title}</p>
      {/if}
      <div
        class={title
          ? 'mt-2 text-sm leading-6 text-(--color-fg-2)'
          : 'text-sm leading-6 text-(--color-fg-2)'}
      >
        {@render children?.()}
      </div>
    </div>
  {/if}
</div>
