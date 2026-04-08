import { openAlertDialog } from '@/shared/browser/dialog.service';

import type { SiteFeedbackPayload } from './site-directory.models';

export async function submitPublicSiteFeedback(
  slug: string,
  payload: SiteFeedbackPayload,
): Promise<boolean> {
  try {
    const response = await fetch(`/api/site-directory/${encodeURIComponent(slug)}/feedback`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      void openAlertDialog({
        title: '提交失败',
        description: '提交失败，请稍后重试。',
        tone: 'danger',
        confirmLabel: '关闭',
      });
      return false;
    }

    void openAlertDialog({
      title: '反馈已提交',
      description: '感谢反馈，我们会尽快处理。',
      tone: 'info',
      confirmLabel: '关闭',
    });
    return true;
  } catch {
    void openAlertDialog({
      title: '提交失败',
      description: '提交失败，请稍后重试。',
      tone: 'danger',
      confirmLabel: '关闭',
    });
    return false;
  }
}
