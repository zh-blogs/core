import type { APIRoute } from 'astro';

import {
  buildRedirectUrl,
  proxyAuthJson,
  readApiErrorCode,
  sanitizeNextPath,
} from '@/application/auth/auth-route.server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get('email');
  const nextPath = sanitizeNextPath(formData.get('next'));

  if (typeof email !== 'string') {
    return new Response('Invalid resend verification request', { status: 400 });
  }

  const response = await proxyAuthJson(request, '/auth/verify-email/resend', {
    email,
    nextPath,
  });

  if (!response.ok) {
    const error = await readApiErrorCode(response);
    return Response.redirect(
      buildRedirectUrl(request, '/login', {
        error,
        email: email.trim(),
        next: nextPath,
      }),
      302,
    );
  }

  return Response.redirect(
    buildRedirectUrl(request, '/login', {
      status: 'verification-resent',
      email: email.trim(),
      next: nextPath,
    }),
    302,
  );
};
