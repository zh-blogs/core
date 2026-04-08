import { trimText } from './site-submission.service';

const SUBMISSION_IDENTIFIER_QUERY_PARAM = 'site_id';

export function buildSubmissionQueryHref(auditId: string): string {
  return `/site/submit/query?audit_id=${encodeURIComponent(trimText(auditId))}`;
}

export async function copySubmissionAuditId(auditId: string): Promise<void> {
  const normalizedAuditId = trimText(auditId);

  if (!normalizedAuditId) {
    return;
  }

  try {
    await navigator.clipboard.writeText(normalizedAuditId);
  } catch {
    // Ignore clipboard failures and keep the audit id visible in the dialog.
  }
}

export function clearSubmissionIdentifierSearchParams(): void {
  const currentUrl = new URL(window.location.href);
  if (!currentUrl.searchParams.has(SUBMISSION_IDENTIFIER_QUERY_PARAM)) {
    return;
  }

  currentUrl.searchParams.delete(SUBMISSION_IDENTIFIER_QUERY_PARAM);

  window.history.replaceState(
    window.history.state,
    '',
    `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
  );
}
