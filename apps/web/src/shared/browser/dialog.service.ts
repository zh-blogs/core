export const DIALOG_OPEN_EVENT = 'zhblogs:dialog:open';
export const DIALOG_CLOSE_EVENT = 'zhblogs:dialog:close';

export type DialogTone = 'neutral' | 'info' | 'warning' | 'danger';
export type DialogKind = 'modal' | 'confirm' | 'alert';
export type DialogResolution = 'confirm' | 'cancel' | 'dismiss';

interface DialogBaseInput {
  id?: string;
  title: string;
  description?: string;
  tone?: DialogTone;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissible?: boolean;
}

export interface ModalDialogInput extends DialogBaseInput {
  content?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ConfirmDialogInput extends DialogBaseInput {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AlertDialogInput extends Omit<DialogBaseInput, 'cancelLabel'> {}

export interface DialogPayload {
  id: string;
  kind: DialogKind;
  title: string;
  description: string;
  content: string;
  tone: DialogTone;
  confirmLabel: string;
  cancelLabel: string;
  dismissible: boolean;
}

const dialogResolvers = new Map<string, (result: DialogResolution) => void>();

const createDialogId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `dialog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const emitDialog = (payload: DialogPayload): string => {
  if (typeof window === 'undefined') {
    return payload.id;
  }

  window.dispatchEvent(
    new CustomEvent<DialogPayload>(DIALOG_OPEN_EVENT, {
      detail: payload,
    }),
  );

  return payload.id;
};

const createDialogPromise = (payload: DialogPayload): Promise<DialogResolution> =>
  new Promise((resolve) => {
    dialogResolvers.set(payload.id, resolve);
    emitDialog(payload);
  });

export const resolveDialog = (id: string, result: DialogResolution): void => {
  const resolver = dialogResolvers.get(id);

  if (resolver) {
    resolver(result);
    dialogResolvers.delete(id);
  }

  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(DIALOG_CLOSE_EVENT, {
      detail: {
        id,
      },
    }),
  );
};

export const closeDialog = (id: string, result: DialogResolution = 'dismiss'): void => {
  resolveDialog(id, result);
};

export const openModalDialog = (input: ModalDialogInput): Promise<DialogResolution> =>
  createDialogPromise({
    id: input.id?.trim() || createDialogId(),
    kind: 'modal',
    title: input.title.trim() || '窗口',
    description: input.description?.trim() || '',
    content: input.content?.trim() || '',
    tone: input.tone ?? 'neutral',
    confirmLabel: input.confirmLabel?.trim() || '确定',
    cancelLabel: input.cancelLabel?.trim() || '取消',
    dismissible: input.dismissible ?? true,
  });

export const openConfirmDialog = async (input: ConfirmDialogInput): Promise<boolean> => {
  const result = await createDialogPromise({
    id: input.id?.trim() || createDialogId(),
    kind: 'confirm',
    title: input.title.trim() || '请确认',
    description: input.description?.trim() || '',
    content: '',
    tone: input.tone ?? 'warning',
    confirmLabel: input.confirmLabel?.trim() || '确认',
    cancelLabel: input.cancelLabel?.trim() || '取消',
    dismissible: input.dismissible ?? true,
  });

  return result === 'confirm';
};

export const openAlertDialog = async (input: AlertDialogInput): Promise<void> => {
  await createDialogPromise({
    id: input.id?.trim() || createDialogId(),
    kind: 'alert',
    title: input.title.trim() || '提醒',
    description: input.description?.trim() || '',
    content: '',
    tone: input.tone ?? 'info',
    confirmLabel: input.confirmLabel?.trim() || '知道了',
    cancelLabel: '',
    dismissible: input.dismissible ?? true,
  });
};
