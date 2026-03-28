import type { APIRoute } from 'astro';

import { handlePresenceOnlineRequest } from '@/application/presence/presence.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handlePresenceOnlineRequest(request);
