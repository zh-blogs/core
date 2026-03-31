import type { APIRoute } from 'astro';

import {
  buildRedirectLocation,
  createRedirectHeaders,
  proxyAuthJson,
  readApiErrorCode,
} from '@/application/auth/auth-route.server';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const response = await proxyAuthJson(request, '/auth/github/unbind', {});

  if (response.status === 401) {
    return redirect('/login?next=%2Fdashboard', 302);
  }

  if (!response.ok) {
    const error = await readApiErrorCode(response);
    return redirect(buildRedirectLocation('/dashboard', { error }), 302);
  }

  const headers = createRedirectHeaders(response);
  headers.set('Location', '/dashboard?status=github-unbound');

  return new Response(null, {
    status: 302,
    headers,
  });
};
