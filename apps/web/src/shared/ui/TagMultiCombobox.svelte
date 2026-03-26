<script lang="ts">
  import { onMount } from 'svelte';

  import {
    type ComboboxOption,
    filterOptions,
    hasCustomConflict,
    normalize,
  } from '../browser/tag-multi-combobox.browser';

  let {
    options = [],
    selectedIds = $bindable([] as string[]),
    customValues = $bindable([] as string[]),
    inputId = '',
    placeholder = '搜索或选择子分类',
    customActionLabel = '添加自定义内容',
    useCustomDialog = false,
    disabled = false,
    onRequestCustom,
  }: {
    options?: ComboboxOption[];
    selectedIds?: string[];
    customValues?: string[];
    inputId?: string;
    placeholder?: string;
    customActionLabel?: string;
    useCustomDialog?: boolean;
    disabled?: boolean;
    onRequestCustom?: (detail: { query: string }) => void;
  } = $props();

  let root: HTMLDivElement | null = null;
  let input: HTMLInputElement | null = null;
  let isOpen = $state(false);
  let query = $state('');

  function focusInput() {
    input?.focus();
  }

  function open() {
    if (disabled) {
      return;
    }

    isOpen = true;
  }

  function close() {
    isOpen = false;
    query = '';
  }

  function toggleOption(optionId: string) {
    if (selectedIds.includes(optionId)) {
      selectedIds = selectedIds.filter((value) => value !== optionId);
      return;
    }

    selectedIds = [...selectedIds, optionId];
    query = '';
    focusInput();
  }

  function removeCustom(value: string) {
    customValues = customValues.filter((item) => item !== value);
  }

  function removeSelected(optionId: string) {
    selectedIds = selectedIds.filter((value) => value !== optionId);
  }

  function addCustom(value: string) {
    const normalized = normalize(value);

    if (!normalized || !canAddCustom) {
      return;
    }

    customValues = [...customValues, normalized];
    query = '';
    focusInput();
  }

  function requestCustom(value: string) {
    const normalized = normalize(value);

    if (!normalized || !canAddCustom) {
      return;
    }

    onRequestCustom?.({ query: normalized });
    query = '';
    focusInput();
  }

  let normalizedQuery = $derived(normalize(query));
  let optionById = $derived(new Map(options.map((option) => [option.id, option])));
  let selectedOptions = $derived(
    selectedIds
      .map((id) => optionById.get(id))
      .filter((option): option is ComboboxOption => Boolean(option)),
  );
  let filteredOptions = $derived(filterOptions(options, normalizedQuery));
  let customConflict = $derived(
    hasCustomConflict(normalizedQuery, selectedOptions, customValues, options),
  );
  let canAddCustom = $derived(normalizedQuery.length > 0 && !customConflict);

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

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  });
</script>

<div class="relative" bind:this={root}>
  <div
    class={`min-h-11 rounded-md border bg-(--color-bg-raised) px-3 py-1.5 text-sm transition ${
      disabled
        ? 'cursor-not-allowed border-(--color-line) opacity-70'
        : 'cursor-text border-(--color-line-med) focus-within:border-red-700/35 dark:focus-within:border-red-400/35'
    }`}
    onclick={() => {
      open();
      focusInput();
    }}
    onkeydown={(event) => {
      if (event.key === 'Enter' && canAddCustom) {
        event.preventDefault();
        if (useCustomDialog) {
          requestCustom(normalizedQuery);
        } else {
          addCustom(normalizedQuery);
        }
      }

      if (event.key === 'Escape') {
        close();
      }
    }}
    role="button"
    tabindex={disabled ? -1 : 0}
  >
    <div class="flex flex-wrap items-center gap-2">
      {#each selectedOptions as option (option.id)}
        <span
          class="inline-flex items-center gap-2 rounded-[999px] border border-(--color-line-med) px-3 py-1 text-xs text-(--color-fg)"
        >
          {option.name}
          <button
            class="text-(--color-fg-3) transition hover:text-(--color-fg)"
            type="button"
            aria-label={`移除 ${option.name}`}
            onclick={(event) => {
              event.stopPropagation();
              removeSelected(option.id);
            }}
          >
            ×
          </button>
        </span>
      {/each}
      {#each customValues as value (value)}
        <span
          class="inline-flex items-center gap-2 rounded-[999px] border border-dashed border-(--color-line-med) px-3 py-1 text-xs text-(--color-fg)"
        >
          {value}
          <button
            class="text-(--color-fg-3) transition hover:text-(--color-fg)"
            type="button"
            aria-label={`移除 ${value}`}
            onclick={(event) => {
              event.stopPropagation();
              removeCustom(value);
            }}
          >
            ×
          </button>
        </span>
      {/each}
      <input
        id={inputId}
        bind:this={input}
        bind:value={query}
        class="min-w-36 h-8 flex-1 bg-transparent py-0 text-sm leading-8 text-(--color-fg) outline-none placeholder:text-(--color-fg-3)"
        {disabled}
        placeholder={selectedOptions.length === 0 && customValues.length === 0
          ? placeholder
          : '继续搜索或添加'}
        onfocus={open}
        oninput={open}
        onkeydown={(event) => {
          if (event.key === 'Enter' && canAddCustom) {
            event.preventDefault();
            if (useCustomDialog) {
              requestCustom(normalizedQuery);
            } else {
              addCustom(normalizedQuery);
            }
          }

          if (event.key === 'Backspace' && !query && customValues.length > 0) {
            customValues = customValues.slice(0, -1);
          }
        }}
      />
    </div>
  </div>

  {#if isOpen && !disabled}
    <div
      class="absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-md border border-(--color-line-med) bg-(--color-bg-raised) shadow-[0_18px_40px_rgba(28,25,23,0.14)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]"
    >
      <div class="max-h-72 overflow-y-auto p-2">
        {#if filteredOptions.length > 0}
          <div class="space-y-1">
            {#each filteredOptions as option (option.id)}
              <button
                class={`flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm transition ${
                  selectedIds.includes(option.id)
                    ? 'border border-(--color-line-med) text-(--color-fg)'
                    : 'text-(--color-fg-2) hover:bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)] hover:text-(--color-fg)'
                }`}
                type="button"
                onclick={() => toggleOption(option.id)}
              >
                <span>{option.name}</span>
                {#if selectedIds.includes(option.id)}
                  <span
                    class="font-mono text-[11px] uppercase tracking-[0.18em] text-(--color-info)"
                    >已选</span
                  >
                {/if}
              </button>
            {/each}
          </div>
          {#if canAddCustom}
            <div class="mt-2 border-t border-(--color-line) pt-2">
              <button
                class="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm text-(--color-fg) transition hover:bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)]"
                type="button"
                onclick={() => {
                  if (useCustomDialog) {
                    requestCustom(normalizedQuery);
                  } else {
                    addCustom(normalizedQuery);
                  }
                }}
              >
                <span>{customActionLabel}</span>
                <span class="font-mono text-[11px] text-(--color-fg-3)">{normalizedQuery}</span>
              </button>
            </div>
          {/if}
        {:else if canAddCustom}
          <button
            class="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm text-(--color-fg) transition hover:bg-[color-mix(in_srgb,var(--color-bg)_82%,transparent)]"
            type="button"
            onclick={() => {
              if (useCustomDialog) {
                requestCustom(normalizedQuery);
              } else {
                addCustom(normalizedQuery);
              }
            }}
          >
            <span>{customActionLabel}</span>
            <span class="font-mono text-[11px] text-(--color-fg-3)">{normalizedQuery}</span>
          </button>
        {:else}
          <p class="px-3 py-2 text-sm text-(--color-fg-3)">没有匹配的子分类。</p>
        {/if}
      </div>
    </div>
  {/if}
</div>
