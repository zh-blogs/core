import type { APIRoute } from 'astro';

import { handleSiteDetailRequest } from '@/application/site/site-directory.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const slug = params.slug?.trim();

  if (!slug) {
    return new Response('missing slug', { status: 400 });
  }

  return handleSiteDetailRequest(slug, request);
};
