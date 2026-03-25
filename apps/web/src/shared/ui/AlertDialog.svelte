<script lang="ts">
  import type { ComponentProps, Snippet } from 'svelte';

  import ModalSurface from './ModalSurface.svelte';

  type ModalTone = ComponentProps<typeof ModalSurface>['tone'];

  let {
    open = false,
    title = '提醒',
    description = '',
    tone = 'info',
    confirmLabel = '知道了',
    dismissible = true,
    onConfirm,
    onCancel,
    children: childContent,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    tone?: ModalTone;
    confirmLabel?: string;
    dismissible?: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    children?: Snippet;
  } = $props();
</script>

<ModalSurface
  {open}
  {title}
  {description}
  {tone}
  {confirmLabel}
  cancelLabel=""
  {dismissible}
  showCancel={false}
  {onConfirm}
  {onCancel}
>
  {@render childContent?.()}
</ModalSurface>
