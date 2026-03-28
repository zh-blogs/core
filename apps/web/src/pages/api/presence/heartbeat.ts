import type { APIRoute } from 'astro';

import { handlePresenceHeartbeatRequest } from '@/application/presence/presence.server-handler';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => handlePresenceHeartbeatRequest(request);
