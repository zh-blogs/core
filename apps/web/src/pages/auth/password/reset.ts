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
  const token = formData.get('token');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const nextPath = sanitizeNextPath(formData.get('next'));

  if (
    typeof token !== 'string' ||
    typeof password !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    return new Response('Invalid reset password request', { status: 400 });
  }

  if (password !== confirmPassword) {
    return Response.redirect(
      buildRedirectUrl(request, '/reset-password', {
        error: 'password_mismatch',
        token,
        next: nextPath,
      }),
      302,
    );
  }

  const response = await proxyAuthJson(request, '/auth/password/reset', {
    token,
    password,
  });

  if (!response.ok) {
    const error = await readApiErrorCode(response);
    return Response.redirect(
      buildRedirectUrl(request, '/reset-password', {
        error,
        token,
        next: nextPath,
      }),
      302,
    );
  }

  return Response.redirect(
    buildRedirectUrl(request, '/login', {
      status: 'password-reset',
      next: nextPath,
    }),
    302,
  );
};
