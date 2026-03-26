import type { ApiPayload } from './site-submission.service';

export async function getJson<T>(url: string): Promise<ApiPayload<T>> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  return (await response.json()) as ApiPayload<T>;
}

export async function postJson<T>(url: string, payload: unknown): Promise<ApiPayload<T>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return (await response.json()) as ApiPayload<T>;
}
