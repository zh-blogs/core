import type { APIRoute } from 'astro';

import { handleAnnouncementArchiveRequest } from '@/application/announcement/announcement.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleAnnouncementArchiveRequest(request);
