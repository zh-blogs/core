import type { APIRoute } from 'astro';

import { getApiBaseUrl } from '@/application/auth/auth.server';
import { sanitizeNextPath } from '@/application/auth/auth-route.server';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const target = new URL(`${getApiBaseUrl()}/auth/github`);
  const nextPath = sanitizeNextPath(url.searchParams.get('next'));

  if (nextPath) {
    target.searchParams.set('next', nextPath);
  }

  return Response.redirect(target.toString(), 302);
};
