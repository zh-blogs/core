import { isUuid, trimText } from './site-submission.core';
import {
  normalizeOptionalSubmitterEmail,
  normalizeSubmitterName,
  validateContactFields,
  type ValidationResult,
} from './site-submission.payload-shared';
import type {
  FieldErrors,
  RestoreSubmissionFormState,
  SiteSubmissionRestoreRequest,
} from './site-submission.types';

export function buildRestoreSubmissionPayload(
  siteId: string,
  form: RestoreSubmissionFormState,
): ValidationResult<SiteSubmissionRestoreRequest> {
  const fieldErrors: FieldErrors = {};
  validateContactFields(
    {
      submitter_name: form.submitter_name,
      submitter_email: form.submitter_email,
      submit_reason: form.restore_reason,
      notify_by_email: form.notify_by_email,
      agree_terms: form.agree_terms,
    },
    fieldErrors,
    {
      requireReason: true,
      reasonMessage: '请填写恢复说明。',
    },
  );

  if (fieldErrors.submit_reason) {
    fieldErrors.restore_reason = fieldErrors.submit_reason;
    delete fieldErrors.submit_reason;
  }

  if (!isUuid(siteId)) {
    fieldErrors.site_id = '恢复目标无效，请从重复提示重新进入。';
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
      site_id: trimText(siteId),
      submitter_name: normalizeSubmitterName(form.submitter_name),
      submitter_email: normalizeOptionalSubmitterEmail(form.submitter_email),
      restore_reason: trimText(form.restore_reason),
      notify_by_email: form.notify_by_email,
    },
  };
}
