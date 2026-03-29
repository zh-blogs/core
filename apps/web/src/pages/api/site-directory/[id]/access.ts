import type { APIRoute } from 'astro';

import { handleSiteAccessRequest } from '@/application/site/site-directory.server-handler';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const id = params.id?.trim();

  if (!id) {
    return new Response('missing id', { status: 400 });
  }

  return handleSiteAccessRequest(id, request);
};
