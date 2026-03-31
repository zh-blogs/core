import type { APIRoute } from 'astro';

import { getApiBaseUrl } from '@/application/auth/auth.server';

export const prerender = false;

export const GET: APIRoute = async () =>
  Response.redirect(`${getApiBaseUrl()}/auth/github/bind`, 302);
