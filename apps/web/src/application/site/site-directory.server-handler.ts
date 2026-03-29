import { proxyUpstreamText } from '@/application/shared/upstream-proxy.server';

export async function handleSiteDirectoryMetaRequest(request?: Request): Promise<Response> {
  return proxyUpstreamText(
    '/api/public/sites/meta',
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteDirectoryListRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return proxyUpstreamText(
    `/api/public/sites${url.search}`,
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteRandomRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return proxyUpstreamText(
    `/api/public/sites/random${url.search}`,
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteDetailRequest(slug: string, request?: Request): Promise<Response> {
  return proxyUpstreamText(
    `/api/public/sites/${slug}`,
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteDetailArticlesRequest(
  slug: string,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  return proxyUpstreamText(
    `/api/public/sites/${slug}/articles${url.search}`,
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteDetailChecksRequest(
  slug: string,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  return proxyUpstreamText(
    `/api/public/sites/${slug}/checks${url.search}`,
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteFeedbackRequest(slug: string, request: Request): Promise<Response> {
  return proxyUpstreamText(
    `/api/public/sites/${slug}/feedback`,
    {
      method: 'POST',
      body: await request.text(),
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
      },
    },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteAccessRequest(id: string, request: Request): Promise<Response> {
  return proxyUpstreamText(
    `/api/public/sites/${id}/access-events`,
    {
      method: 'POST',
      body: await request.text(),
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
      },
    },
    {
      request,
      fallbackMessage: 'Unable to record site access right now.',
    },
  );
}

export async function handleSiteDirectoryPreferenceGet(request: Request): Promise<Response> {
  return proxyUpstreamText(
    '/api/user/settings/site-directory',
    { method: 'GET' },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}

export async function handleSiteDirectoryPreferencePut(request: Request): Promise<Response> {
  return proxyUpstreamText(
    '/api/user/settings/site-directory',
    {
      method: 'PUT',
      body: await request.text(),
      headers: {
        'content-type': request.headers.get('content-type') ?? 'application/json',
      },
    },
    {
      request,
      fallbackMessage: 'Unable to reach site directory service right now.',
    },
  );
}
