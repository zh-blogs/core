import type { APIRoute } from 'astro';

import { forwardSetCookieHeaders, getApiBaseUrl } from '@/application/auth/auth.server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const response = await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: 'POST',
    headers: {
      cookie: request.headers.get('cookie') ?? '',
    },
  });

  const headers = new Headers();
  forwardSetCookieHeaders(response.headers, headers);
  headers.set('Location', '/');

  return new Response(null, {
    status: 302,
    headers,
  });
};
