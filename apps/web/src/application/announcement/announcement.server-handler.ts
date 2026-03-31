import { proxyUpstreamText } from '@/application/shared/upstream-proxy.server';

export async function handleCurrentAnnouncementRequest(request?: Request): Promise<Response> {
  return proxyUpstreamText(
    '/api/announcements/current',
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to load the current announcement right now.',
    },
  );
}

export async function handleAnnouncementArchiveRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  return proxyUpstreamText(
    `/api/announcements${url.search}`,
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to load the announcement archive right now.',
    },
  );
}
