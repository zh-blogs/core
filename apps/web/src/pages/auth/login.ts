import type { APIRoute } from 'astro';

import {
  buildRedirectUrl,
  createRedirectHeaders,
  proxyAuthJson,
  readApiErrorCode,
  sanitizeNextPath,
} from '@/application/auth/auth-route.server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const identifier = formData.get('identifier');
  const password = formData.get('password');
  const nextPath = sanitizeNextPath(formData.get('next'));

  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return new Response('Invalid login request', { status: 400 });
  }

  const response = await proxyAuthJson(request, '/auth/login', {
    identifier,
    password,
  });

  if (!response.ok) {
    const error = await readApiErrorCode(response);
    return Response.redirect(
      buildRedirectUrl(request, '/login', {
        error,
        next: nextPath,
        email: identifier.includes('@') ? identifier.trim() : null,
      }),
      302,
    );
  }

  const payload = (await response.json()) as {
    ok: boolean;
    user: {
      role: 'USER' | 'ADMIN' | 'SYS_ADMIN';
    };
  };
  const headers = createRedirectHeaders(response);

  headers.set(
    'Location',
    nextPath ?? (payload.user.role === 'USER' ? '/dashboard' : '/management'),
  );

  return new Response(null, {
    status: 302,
    headers,
  });
};
