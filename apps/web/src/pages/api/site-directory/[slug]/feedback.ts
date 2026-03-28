import type { APIRoute } from 'astro';

import { handleSiteFeedbackRequest } from '@/application/site/site-directory.server-handler';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const slug = params.slug?.trim();

  if (!slug) {
    return new Response('missing slug', { status: 400 });
  }

  return handleSiteFeedbackRequest(slug, request);
};
