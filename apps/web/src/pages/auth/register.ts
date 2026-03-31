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
  const username = formData.get('username');
  const email = formData.get('email');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');
  const nextPath = sanitizeNextPath(formData.get('next'));

  if (
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    return new Response('Invalid register request', { status: 400 });
  }

  if (password !== confirmPassword) {
    return Response.redirect(
      buildRedirectUrl(request, '/register', {
        error: 'password_mismatch',
        next: nextPath,
      }),
      302,
    );
  }

  const response = await proxyAuthJson(request, '/auth/register', {
    username,
    email,
    password,
    nextPath,
  });

  if (!response.ok) {
    const error = await readApiErrorCode(response);
    return Response.redirect(
      buildRedirectUrl(request, '/register', {
        error,
        next: nextPath,
      }),
      302,
    );
  }

  return Response.redirect(
    buildRedirectUrl(request, '/login', {
      status: 'verification-sent',
      email: email.trim(),
      next: nextPath,
    }),
    302,
  );
};
