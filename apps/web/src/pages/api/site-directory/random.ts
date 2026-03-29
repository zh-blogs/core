import type { APIRoute } from 'astro';

import { handleSiteRandomRequest } from '@/application/site/site-directory.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleSiteRandomRequest(request);
