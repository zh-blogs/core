import {
  forwardGet,
  forwardPost,
  isRecord,
  jsonResponse,
  readJsonBody,
} from './site-submission.server-http';
import { resolveSiteIdentifier } from './site-submission.server-resolve';
import {
  isCreateSubmissionRequest,
  isDeleteSubmissionRequest,
  isLookupRequest,
  isSubmissionQueryRequest,
  isUpdateSubmissionRequest,
} from './site-submission.server-validators';

export async function handleCreateSubmissionRequest(request: Request): Promise<Response> {
  const payload = await readJsonBody(request);

  if (!isCreateSubmissionRequest(payload)) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body is invalid for a site creation submission.',
        },
      },
      400,
    );
  }

  return forwardPost('/api/sites', payload, request);
}

export async function handleUpdateSubmissionRequest(request: Request): Promise<Response> {
  const payload = await readJsonBody(request);

  if (!isUpdateSubmissionRequest(payload)) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body is invalid for a site update submission.',
        },
      },
      400,
    );
  }

  const resolved = await resolveSiteIdentifier(request, payload.site_identifier);

  if (!resolved.ok) {
    return resolved.response;
  }

  return forwardPost(
    `/api/sites/${resolved.siteId}/updates`,
    {
      submitter_name: payload.submitter_name,
      submitter_email: payload.submitter_email,
      submit_reason: payload.submit_reason,
      notify_by_email: payload.notify_by_email,
      changes: payload.changes,
    },
    request,
  );
}

export async function handleDeleteSubmissionRequest(request: Request): Promise<Response> {
  const payload = await readJsonBody(request);

  if (!isDeleteSubmissionRequest(payload)) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body is invalid for a site delete submission.',
        },
      },
      400,
    );
  }

  const resolved = await resolveSiteIdentifier(request, payload.site_identifier);

  if (!resolved.ok) {
    return resolved.response;
  }

  return forwardPost(
    `/api/sites/${resolved.siteId}/deletions`,
    {
      submitter_name: payload.submitter_name,
      submitter_email: payload.submitter_email,
      submit_reason: payload.submit_reason,
      notify_by_email: payload.notify_by_email,
    },
    request,
  );
}

export async function handleSubmissionQueryRequest(request: Request): Promise<Response> {
  const payload = await readJsonBody(request);

  if (!isSubmissionQueryRequest(payload)) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body is invalid for a site submission query.',
        },
      },
      400,
    );
  }

  return forwardPost('/api/sites/submissions/query', payload, request);
}

export async function handleSiteSearchRequest(request: Request): Promise<Response> {
  const payload = await readJsonBody(request);

  if (!isRecord(payload) || typeof payload.query !== 'string') {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body is invalid for site search.',
        },
      },
      400,
    );
  }

  return forwardPost('/api/sites/search', payload, request);
}

export async function handleSiteOptionsRequest(request: Request): Promise<Response> {
  return forwardGet('/api/sites/submission-options', request);
}

export async function handleSiteAutoFillRequest(request: Request): Promise<Response> {
  const payload = await readJsonBody(request);

  if (!isRecord(payload) || typeof payload.url !== 'string') {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body is invalid for site auto-fill.',
        },
      },
      400,
    );
  }

  return forwardPost('/api/sites/auto-fill', payload, request);
}

export async function handleResolveSiteRequest(request: Request): Promise<Response> {
  const payload = await readJsonBody(request);

  if (!isLookupRequest(payload)) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: 'INVALID_BODY',
          message: 'Request body is invalid for site lookup.',
        },
      },
      400,
    );
  }

  return forwardPost('/api/sites/resolve', payload, request);
}
