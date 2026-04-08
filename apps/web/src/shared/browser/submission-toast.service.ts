import { openAlertDialog } from './dialog.service';

export type SubmissionToastTone = 'success' | 'warning' | 'error' | 'info';

export interface SubmissionToastInput {
  title: string;
  message: string;
  tone?: SubmissionToastTone;
  durationMs?: number | null;
}

export function openSubmissionToast(input: SubmissionToastInput): void {
  const tone = input.tone ?? 'info';

  void openAlertDialog({
    title: input.title,
    description: input.message,
    tone: tone === 'error' ? 'danger' : tone === 'warning' ? 'warning' : 'info',
    confirmLabel: '关闭',
  });
}
