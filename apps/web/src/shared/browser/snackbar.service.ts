export const SNACKBAR_OPEN_EVENT = 'zhblogs:snackbar:open';
export const SNACKBAR_CLOSE_EVENT = 'zhblogs:snackbar:close';
export const DEFAULT_SNACKBAR_DURATION_MS = 5600;

export type SnackbarTone = 'info' | 'success' | 'warning' | 'error';

export interface SnackbarPayload {
  id?: string;
  title?: string;
  message: string;
  tone?: SnackbarTone;
  durationMs?: number | null;
  actionLabel?: string;
  onAction?: (() => void | Promise<void>) | null;
}

const actionHandlers = new Map<string, () => void | Promise<void>>();

const createSnackbarId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `snackbar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeSnackbarPayload = (
  payload: SnackbarPayload,
): Required<Omit<SnackbarPayload, 'durationMs' | 'onAction'>> & { durationMs: number | null } => ({
  id: payload.id?.trim() || createSnackbarId(),
  title: payload.title?.trim() || '',
  message: payload.message.trim(),
  tone: payload.tone ?? 'info',
  durationMs: payload.durationMs === undefined ? DEFAULT_SNACKBAR_DURATION_MS : payload.durationMs,
  actionLabel: payload.actionLabel?.trim() || '',
});

export const openSnackbar = (payload: SnackbarPayload): string => {
  if (typeof window === 'undefined') {
    return payload.id?.trim() || '';
  }

  const normalized = normalizeSnackbarPayload(payload);

  if (payload.onAction) {
    actionHandlers.set(normalized.id, payload.onAction);
  } else {
    actionHandlers.delete(normalized.id);
  }

  window.dispatchEvent(
    new CustomEvent(SNACKBAR_OPEN_EVENT, {
      detail: normalized,
    }),
  );

  return normalized.id;
};

export const closeSnackbar = (id?: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (id?.trim()) {
    actionHandlers.delete(id.trim());
  }

  window.dispatchEvent(
    new CustomEvent(SNACKBAR_CLOSE_EVENT, {
      detail: {
        id: id?.trim() || '',
      },
    }),
  );
};

export const triggerSnackbarAction = async (id: string): Promise<void> => {
  const action = actionHandlers.get(id);

  if (!action) {
    return;
  }

  await action();
  actionHandlers.delete(id);
};
