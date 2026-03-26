import { getApiBaseUrl } from '../auth/auth.server';

export const JSON_HEADERS = {
  'cache-control': 'no-store',
  'content-type': 'application/json; charset=utf-8',
};

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

export function upstreamErrorResponse(): Response {
  return jsonResponse(
    {
      ok: false,
      error: {
        code: 'UPSTREAM_ERROR',
        message: 'Unable to reach the submission service right now.',
      },
    },
    502,
  );
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export async function postJson(
  path: string,
  payload: unknown,
  request?: Request,
): Promise<Response | null> {
  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(request?.headers.get('cookie') ? { cookie: request.headers.get('cookie') ?? '' } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return null;
  }
}

async function getJson(path: string, request?: Request): Promise<Response | null> {
  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(request?.headers.get('cookie') ? { cookie: request.headers.get('cookie') ?? '' } : {}),
      },
    });
  } catch {
    return null;
  }
}

export async function forwardPost(
  path: string,
  payload: unknown,
  request?: Request,
): Promise<Response> {
  const upstream = await postJson(path, payload, request);

  if (!upstream) {
    return upstreamErrorResponse();
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: JSON_HEADERS,
  });
}

export async function forwardGet(path: string, request?: Request): Promise<Response> {
  const upstream = await getJson(path, request);

  if (!upstream) {
    return upstreamErrorResponse();
  }

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: JSON_HEADERS,
  });
}
