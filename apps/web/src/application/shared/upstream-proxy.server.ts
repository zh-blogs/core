import { forwardSetCookieHeaders, getApiBaseUrl } from '@/application/auth/auth.server';

type ProxyFailureResponse = {
  code: string;
  message: string;
};

function buildRequestHeaders(
  initHeaders: HeadersInit | undefined,
  request: Request | undefined,
  fallbackAccept: string,
): Headers {
  const headers = new Headers(initHeaders);

  if (!headers.has('accept')) {
    headers.set('accept', fallbackAccept);
  }

  const cookie = request?.headers.get('cookie');

  if (cookie && !headers.has('cookie')) {
    headers.set('cookie', cookie);
  }

  return headers;
}

function buildResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();

  for (const [key, value] of upstream.headers.entries()) {
    if (key.toLowerCase() === 'content-length') {
      continue;
    }

    headers.set(key, value);
  }

  headers.set('cache-control', 'no-store');
  forwardSetCookieHeaders(upstream.headers, headers);

  return headers;
}

function buildTextProxyHeaders(upstream: Response): Headers {
  const headers = buildResponseHeaders(upstream);
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');
  return headers;
}

function createProxyFailureResponse(
  status: number,
  error: ProxyFailureResponse,
  contentType = 'application/json; charset=utf-8',
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error,
    }),
    {
      status,
      headers: {
        'cache-control': 'no-store',
        'content-type': contentType,
      },
    },
  );
}

export async function proxyUpstreamText(
  path: string,
  init: RequestInit,
  options: {
    request?: Request;
    fallbackMessage: string;
    fallbackCode?: string;
  },
): Promise<Response> {
  try {
    const upstream = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: buildRequestHeaders(init.headers, options.request, 'application/json'),
    });

    const headers = buildTextProxyHeaders(upstream);
    headers.set(
      'content-type',
      upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
    );

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers,
    });
  } catch {
    return createProxyFailureResponse(502, {
      code: options.fallbackCode ?? 'UPSTREAM_ERROR',
      message: options.fallbackMessage,
    });
  }
}

export async function proxyUpstreamBody(
  path: string,
  init: RequestInit,
  options: {
    request?: Request;
    fallbackMessage: string;
    fallbackCode?: string;
    fallbackContentType?: string;
  },
): Promise<Response> {
  try {
    const upstream = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers: buildRequestHeaders(init.headers, options.request, '*/*'),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: buildResponseHeaders(upstream),
    });
  } catch {
    return createProxyFailureResponse(
      502,
      {
        code: options.fallbackCode ?? 'UPSTREAM_ERROR',
        message: options.fallbackMessage,
      },
      options.fallbackContentType,
    );
  }
}
