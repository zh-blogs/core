export const TOAST_OPEN_EVENT = 'zhblogs:toast:open';
export const TOAST_CLOSE_EVENT = 'zhblogs:toast:close';
export const DEFAULT_TOAST_DURATION_MS = 4200;

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastPayload {
  id?: string;
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number | null;
}

const createToastId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeToastPayload = (
  payload: ToastPayload,
): Required<Omit<ToastPayload, 'durationMs'>> & {
  durationMs: number | null;
} => ({
  id: payload.id?.trim() || createToastId(),
  title: payload.title.trim() || '提示',
  message: payload.message?.trim() ?? '',
  tone: payload.tone ?? 'info',
  durationMs: payload.durationMs === undefined ? DEFAULT_TOAST_DURATION_MS : payload.durationMs,
});

export const openToast = (payload: ToastPayload): string => {
  if (typeof window === 'undefined') {
    return payload.id?.trim() || '';
  }

  const normalized = normalizeToastPayload(payload);
  window.dispatchEvent(
    new CustomEvent(TOAST_OPEN_EVENT, {
      detail: normalized,
    }),
  );

  return normalized.id;
};

export const closeToast = (id?: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TOAST_CLOSE_EVENT, {
      detail: {
        id: id?.trim() || '',
      },
    }),
  );
};
