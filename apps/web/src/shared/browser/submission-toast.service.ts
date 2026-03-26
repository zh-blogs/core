import { openToast } from './toast.service';

export type SubmissionToastTone = 'success' | 'warning' | 'error' | 'info';

export interface SubmissionToastInput {
  title: string;
  message: string;
  tone?: SubmissionToastTone;
  durationMs?: number | null;
}

export function openSubmissionToast(input: SubmissionToastInput): void {
  openToast({
    title: input.title,
    message: input.message,
    tone: input.tone ?? 'info',
    durationMs: input.durationMs,
  });
}
