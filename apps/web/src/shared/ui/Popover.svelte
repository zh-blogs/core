<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount, tick } from 'svelte';

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
  let panel = $state<HTMLDivElement | null>(null);
  let open = $state(false);
  let panelStyle = $state('');

  function toggle() {
    open = !open;
  }

  function close() {
    open = false;
  }

  function updatePanelPosition() {
    if (!open || !root || !panel || typeof window === 'undefined') {
      return;
    }

    const triggerRect = root.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
    left = Math.min(Math.max(gap, left), viewportWidth - panelRect.width - gap);

    let top =
      placement === 'top' ? triggerRect.top - panelRect.height - gap : triggerRect.bottom + gap;

    const canFlipAbove = triggerRect.top - panelRect.height - gap >= gap;
    const canFlipBelow = triggerRect.bottom + panelRect.height + gap <= viewportHeight - gap;

    if (placement === 'bottom' && top + panelRect.height > viewportHeight - gap && canFlipAbove) {
      top = triggerRect.top - panelRect.height - gap;
    } else if (placement === 'top' && top < gap && canFlipBelow) {
      top = triggerRect.bottom + gap;
    }

    top = Math.min(Math.max(gap, top), viewportHeight - panelRect.height - gap);

    panelStyle = `left:${Math.round(left)}px;top:${Math.round(top)}px;max-width:calc(100vw - ${gap * 2}px);`;
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
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  });

  $effect(() => {
    if (!open) {
      panelStyle = '';
      return;
    }

    void tick().then(() => {
      updatePanelPosition();
    });
  });
</script>

<div class="relative inline-flex" bind:this={root}>
  <div
    class="inline-flex"
    onclick={toggle}
    onkeydown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    }}
    role="button"
    tabindex="0"
    aria-haspopup="dialog"
    aria-expanded={open}
  >
    {@render trigger?.()}
  </div>

  {#if open}
    <div
      bind:this={panel}
      class={`fixed z-30 rounded-md border border-(--color-line-med) bg-(--color-bg-raised) p-4 shadow-[0_18px_40px_rgba(28,25,23,0.14)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)] ${widthClass}`}
      style={panelStyle}
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
