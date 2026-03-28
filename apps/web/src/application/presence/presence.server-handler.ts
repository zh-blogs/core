import { proxyUpstreamBody } from '@/application/shared/upstream-proxy.server';

export async function handlePresenceOnlineRequest(request?: Request): Promise<Response> {
  return proxyUpstreamBody(
    '/api/presence/online',
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    },
    {
      request,
      fallbackMessage: 'Unable to reach presence service right now.',
    },
  );
}

export async function handlePresenceHeartbeatRequest(request: Request): Promise<Response> {
  return proxyUpstreamBody(
    '/api/presence/heartbeat',
    {
      method: 'POST',
      body: await request.text(),
      headers: {
        accept: 'application/json',
        'content-type': request.headers.get('content-type') ?? 'application/json',
      },
    },
    {
      request,
      fallbackMessage: 'Unable to reach presence service right now.',
    },
  );
}

export async function handlePresenceStreamRequest(request?: Request): Promise<Response> {
  return proxyUpstreamBody(
    '/api/presence/stream',
    {
      method: 'GET',
      headers: {
        accept: 'text/event-stream',
      },
    },
    {
      request,
      fallbackMessage: 'Unable to reach presence service right now.',
    },
  );
}
