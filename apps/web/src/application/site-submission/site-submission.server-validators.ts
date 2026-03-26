import { isRecord } from './site-submission.server-http';
import type {
  SiteResolveRequest,
  SiteSubmissionCreateRequest,
  SiteSubmissionDeleteRequest,
  SiteSubmissionQueryRequest,
  SiteSubmissionUpdateRequest,
} from './site-submission.types';

export function isCreateSubmissionRequest(value: unknown): value is SiteSubmissionCreateRequest {
  return (
    isRecord(value) &&
    isRecord(value.site) &&
    typeof value.submitter_name === 'string' &&
    typeof value.submitter_email === 'string' &&
    typeof value.submit_reason === 'string' &&
    typeof value.notify_by_email === 'boolean' &&
    typeof value.site.name === 'string' &&
    typeof value.site.url === 'string' &&
    typeof value.site.sign === 'string' &&
    typeof value.site.main_tag_id === 'string'
  );
}

export function isUpdateSubmissionRequest(value: unknown): value is SiteSubmissionUpdateRequest {
  return (
    isRecord(value) &&
    isRecord(value.changes) &&
    typeof value.submitter_name === 'string' &&
    typeof value.submitter_email === 'string' &&
    typeof value.submit_reason === 'string' &&
    typeof value.notify_by_email === 'boolean' &&
    typeof value.site_identifier === 'string'
  );
}

export function isDeleteSubmissionRequest(value: unknown): value is SiteSubmissionDeleteRequest {
  return (
    isRecord(value) &&
    typeof value.submitter_name === 'string' &&
    typeof value.submitter_email === 'string' &&
    typeof value.submit_reason === 'string' &&
    typeof value.notify_by_email === 'boolean' &&
    typeof value.site_identifier === 'string'
  );
}

export function isSubmissionQueryRequest(value: unknown): value is SiteSubmissionQueryRequest {
  return isRecord(value) && typeof value.audit_id === 'string';
}

export function isLookupRequest(value: unknown): value is SiteResolveRequest {
  return (
    isRecord(value) &&
    (typeof value.site_id === 'string' ||
      typeof value.bid === 'string' ||
      typeof value.url === 'string')
  );
}
