import type { APIRoute } from 'astro';

import { handleRestoreSubmissionRequest } from '@/application/site-submission/site-submission.server-handler';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handleRestoreSubmissionRequest(request);
