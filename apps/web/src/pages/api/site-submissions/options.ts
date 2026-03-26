import type { APIRoute } from 'astro';

import { handleSiteOptionsRequest } from '@/application/site-submission/site-submission.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleSiteOptionsRequest(request);
