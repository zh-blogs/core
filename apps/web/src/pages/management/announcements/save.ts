import type { APIRoute } from 'astro';

import { getApiBaseUrl } from '@/application/auth/auth.server';

export const prerender = false;

const buildRedirectPath = (params: Record<string, string | null | undefined>): string => {
  const target = new URL('/management/announcements', 'http://zhblogs.local');

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return `${target.pathname}${target.search}`;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      error?: {
        message?: string;
      };
    };

    if (payload.error?.message?.trim()) {
      return payload.error.message.trim();
    }
  } catch {
    // Ignore non-JSON error bodies and fall back to a generic message.
  }

  return '公告保存失败，请稍后再试。';
};

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const announcementId =
    typeof formData.get('id') === 'string' && formData.get('id')?.toString().trim()
      ? formData.get('id')?.toString().trim()
      : null;
  const page =
    typeof formData.get('page') === 'string' && formData.get('page')?.toString().trim()
      ? formData.get('page')?.toString().trim()
      : null;
  const pageSize =
    typeof formData.get('pageSize') === 'string' && formData.get('pageSize')?.toString().trim()
      ? formData.get('pageSize')?.toString().trim()
      : null;
  const submitIntent =
    typeof formData.get('submit_intent') === 'string' &&
    formData.get('submit_intent')?.toString().trim()
      ? formData.get('submit_intent')?.toString().trim()
      : 'draft';
  const scheduleEnabled = formData.has('schedule_enabled');
  const autoExpireEnabled = formData.has('auto_expire');
  const status =
    submitIntent === 'publish' ? (scheduleEnabled ? 'SCHEDULED' : 'PUBLISHED') : 'DRAFT';
  const body = {
    id: announcementId ?? undefined,
    title: formData.get('title'),
    content: formData.get('content') || null,
    status,
    publish_time: scheduleEnabled ? formData.get('publish_time') || null : null,
    expire_time: autoExpireEnabled ? formData.get('expire_time') || null : null,
  };

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/management/announcements`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        cookie: request.headers.get('cookie') ?? '',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) {
      return redirect('/login?next=%2Fmanagement%2Fannouncements', 302);
    }

    if (response.status === 403) {
      return redirect('/forbidden', 302);
    }

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return redirect(
        buildRedirectPath({
          error: 'save_failed',
          message,
          edit: announcementId,
          mode: announcementId ? undefined : 'create',
          page,
          pageSize,
        }),
        302,
      );
    }

    return redirect(
      buildRedirectPath({
        status: 'saved',
        page,
        pageSize,
      }),
      302,
    );
  } catch {
    return redirect(
      buildRedirectPath({
        error: 'save_failed',
        message: '公告保存失败，请稍后再试。',
        edit: announcementId,
        mode: announcementId ? undefined : 'create',
        page,
        pageSize,
      }),
      302,
    );
  }
};
