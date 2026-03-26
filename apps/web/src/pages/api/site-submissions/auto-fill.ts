import type { APIRoute } from 'astro';

import { handleSiteAutoFillRequest } from '@/application/site-submission/site-submission.server-handler';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleSiteAutoFillRequest(request);
