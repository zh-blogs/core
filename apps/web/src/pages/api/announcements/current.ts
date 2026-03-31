import type { APIRoute } from 'astro';

import { handleCurrentAnnouncementRequest } from '@/application/announcement/announcement.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handleCurrentAnnouncementRequest(request);
