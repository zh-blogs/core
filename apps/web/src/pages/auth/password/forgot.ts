import type { APIRoute } from 'astro';

import {
  buildRedirectUrl,
  proxyAuthJson,
  sanitizeNextPath,
} from '@/application/auth/auth-route.server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get('email');
  const nextPath = sanitizeNextPath(formData.get('next'));

  if (typeof email !== 'string') {
    return new Response('Invalid forgot password request', { status: 400 });
  }

  await proxyAuthJson(request, '/auth/password/forgot', {
    email,
    nextPath,
  });

  return Response.redirect(
    buildRedirectUrl(request, '/forgot-password', {
      status: 'reset-sent',
      next: nextPath,
    }),
    302,
  );
};
