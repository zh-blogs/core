<script lang="ts">
  import type { ComponentProps, Snippet } from 'svelte';

  import ModalSurface from './ModalSurface.svelte';

  type ModalTone = ComponentProps<typeof ModalSurface>['tone'];

  let {
    open = false,
    title = '请确认',
    description = '',
    tone = 'warning',
    confirmLabel = '确认',
    cancelLabel = '取消',
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
    cancelLabel?: string;
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
  {cancelLabel}
  {dismissible}
  showCancel={true}
  {onConfirm}
  {onCancel}
>
  {@render childContent?.()}
</ModalSurface>
