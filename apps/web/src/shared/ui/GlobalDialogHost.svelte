<script lang="ts">
  import { onMount } from 'svelte';

  import {
    closeDialog,
    DIALOG_CLOSE_EVENT,
    DIALOG_OPEN_EVENT,
    type DialogPayload,
    type DialogResolution,
  } from '../browser/dialog.service';

  import ModalSurface from './ModalSurface.svelte';

  let dialogs: DialogPayload[] = [];

  const resolve = (id: string, result: DialogResolution) => {
    dialogs = dialogs.filter((item) => item.id !== id);
    closeDialog(id, result);
  };

  onMount(() => {
    const handleOpen = (event: Event) => {
      const payload = (event as CustomEvent<DialogPayload>).detail;
      dialogs = [...dialogs.filter((item) => item.id !== payload.id), payload];
    };

    const handleClose = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id?.trim();

      if (!id) {
        return;
      }

      dialogs = dialogs.filter((item) => item.id !== id);
    };

    window.addEventListener(DIALOG_OPEN_EVENT, handleOpen as EventListener);
    window.addEventListener(DIALOG_CLOSE_EVENT, handleClose as EventListener);

    return () => {
      window.removeEventListener(DIALOG_OPEN_EVENT, handleOpen as EventListener);
      window.removeEventListener(DIALOG_CLOSE_EVENT, handleClose as EventListener);
    };
  });
</script>

{#each dialogs as dialog (dialog.id)}
  <ModalSurface
    open={true}
    title={dialog.title}
    description={dialog.description}
    tone={dialog.tone}
    confirmLabel={dialog.confirmLabel}
    cancelLabel={dialog.cancelLabel}
    dismissible={dialog.dismissible}
    showCancel={dialog.kind !== 'alert'}
    onConfirm={() => resolve(dialog.id, 'confirm')}
    onCancel={() => resolve(dialog.id, dialog.kind === 'alert' ? 'dismiss' : 'cancel')}
  >
    {#if dialog.content}
      <p>{dialog.content}</p>
    {/if}
  </ModalSurface>
{/each}
