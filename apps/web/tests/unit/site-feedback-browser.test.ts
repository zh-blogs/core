import { beforeEach, describe, expect, it, vi } from 'vitest';

const { openAlertDialogMock } = vi.hoisted(() => ({
  openAlertDialogMock: vi.fn(async () => undefined),
}));

vi.mock('@/shared/browser/dialog.service', () => ({
  openAlertDialog: openAlertDialogMock,
}));

import { submitPublicSiteFeedback } from '@/application/site/site-feedback.browser';

describe('public site feedback browser helper', () => {
  beforeEach(() => {
    openAlertDialogMock.mockReset();
  });

  it('submits feedback and shows a success dialog', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

    vi.stubGlobal('fetch', fetchMock);

    const result = await submitPublicSiteFeedback('example-blog', {
      reasonType: 'OTHER',
      feedbackContent: 'Need review',
      reporterName: 'Alice',
      reporterEmail: 'alice@example.com',
      notifyByEmail: true,
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/site-directory/example-blog/feedback',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(openAlertDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '反馈已提交',
        tone: 'info',
      }),
    );
  });

  it('shows an error dialog when feedback submission fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 })),
    );

    const result = await submitPublicSiteFeedback('example-blog', {
      reasonType: 'OTHER',
      feedbackContent: 'Need review',
    });

    expect(result).toBe(false);
    expect(openAlertDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '提交失败',
        tone: 'danger',
      }),
    );
  });
});
