import { trimText } from './site-submission.core';
import {
  normalizeOptionalSubmitterEmail,
  normalizeSubmitterName,
  toLookupPayload,
  validateContactFields,
  type ValidationResult,
} from './site-submission.payload-shared';
import type {
  DeleteSubmissionFormState,
  FieldErrors,
  QuerySubmissionFormState,
  SiteResolveRequest,
  SiteSubmissionDeleteRequest,
  SiteSubmissionQueryRequest,
} from './site-submission.types';

export function buildDeleteSubmissionPayload(
  form: DeleteSubmissionFormState,
): ValidationResult<SiteSubmissionDeleteRequest> {
  const fieldErrors: FieldErrors = {};
  validateContactFields(form, fieldErrors, {
    requireReason: true,
    reasonMessage: '请填写删除原因。',
  });

  if (!trimText(form.site_identifier)) {
    fieldErrors.site_identifier = '请先选择需要删除的站点。';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      formError: '请先修正表单字段。',
    };
  }

  return {
    ok: true,
    data: {
      submitter_name: normalizeSubmitterName(form.submitter_name),
      submitter_email: normalizeOptionalSubmitterEmail(form.submitter_email),
      submit_reason: trimText(form.submit_reason),
      notify_by_email: form.notify_by_email,
      site_identifier: trimText(form.site_identifier),
    },
  };
}

export function buildSubmissionQueryPayload(
  form: QuerySubmissionFormState,
): ValidationResult<SiteSubmissionQueryRequest> {
  const fieldErrors: FieldErrors = {};
  const auditId = trimText(form.audit_id);

  if (!/^([0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(auditId)) {
    fieldErrors.audit_id = '请填写合法的查询编号。';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      fieldErrors,
      formError: '请先修正查询字段。',
    };
  }

  return {
    ok: true,
    data: {
      audit_id: auditId,
    },
  };
}

export function getLookupPayload(identifier: string): SiteResolveRequest | null {
  return toLookupPayload(identifier);
}
