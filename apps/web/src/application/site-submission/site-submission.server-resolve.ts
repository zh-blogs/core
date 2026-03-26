import {
  JSON_HEADERS,
  jsonResponse,
  postJson,
  upstreamErrorResponse,
} from './site-submission.server-http';
import { getLookupPayload } from './site-submission.service';

export async function resolveSiteIdentifier(
  request: Request,
  identifier: string,
): Promise<{ ok: true; siteId: string } | { ok: false; response: Response }> {
  const lookupPayload = getLookupPayload(identifier);

  if (!lookupPayload) {
    return {
      ok: false,
      response: jsonResponse(
        {
          ok: false,
          error: {
            code: 'INVALID_BODY',
            message: 'A valid site identifier is required.',
            fields: ['site_identifier'],
          },
        },
        400,
      ),
    };
  }

  const lookupResponse = await postJson('/api/sites/resolve', lookupPayload, request);

  if (!lookupResponse) {
    return {
      ok: false,
      response: upstreamErrorResponse(),
    };
  }

  if (!lookupResponse.ok) {
    return {
      ok: false,
      response: new Response(await lookupResponse.text(), {
        status: lookupResponse.status,
        headers: JSON_HEADERS,
      }),
    };
  }

  const payload = (await lookupResponse.json()) as {
    ok: boolean;
    data?: { site_id?: string };
  };

  if (!payload.ok || !payload.data?.site_id) {
    return {
      ok: false,
      response: upstreamErrorResponse(),
    };
  }

  return {
    ok: true,
    siteId: payload.data.site_id,
  };
}
