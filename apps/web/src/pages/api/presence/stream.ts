import type { APIRoute } from 'astro';

import { handlePresenceStreamRequest } from '@/application/presence/presence.server-handler';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => handlePresenceStreamRequest(request);
