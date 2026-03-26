import type { APIRoute } from 'astro';

import { handleCreateSubmissionRequest } from '@/application/site-submission/site-submission.server-handler';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleCreateSubmissionRequest(request);
