import type { APIRoute } from 'astro';

import {
  buildRedirectLocation,
  createRedirectHeaders,
  proxyAuthJson,
  readApiErrorCode,
} from '@/application/auth/auth-route.server';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const currentPassword = formData.get('currentPassword');
  const nextPassword = formData.get('nextPassword');
  const confirmPassword = formData.get('confirmPassword');

  if (typeof nextPassword !== 'string' || typeof confirmPassword !== 'string') {
    return new Response('Invalid password request', { status: 400 });
  }

  if (nextPassword !== confirmPassword) {
    return redirect('/dashboard?error=password_mismatch', 302);
  }

  const response = await proxyAuthJson(request, '/auth/password', {
    currentPassword: typeof currentPassword === 'string' ? currentPassword : null,
    nextPassword,
  });

  if (response.status === 401) {
    return redirect('/login?next=%2Fdashboard', 302);
  }

  if (!response.ok) {
    const error = await readApiErrorCode(response);
    return redirect(buildRedirectLocation('/dashboard', { error }), 302);
  }

  const headers = createRedirectHeaders(response);
  headers.set('Location', '/dashboard?status=password-updated');

  return new Response(null, {
    status: 302,
    headers,
  });
};
