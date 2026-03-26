import { isHttpUrl, isUuid, isValidEmail, normalizeEmail, trimText } from './site-submission.core';
import type { FeedInput, FieldErrors } from './site-submission.types';

export type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

export type ValidationFailure = {
  ok: false;
  fieldErrors: FieldErrors;
  formError?: string;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

type ContactFormLike = {
  submitter_name: string;
  submitter_email: string;
  submit_reason: string;
  notify_by_email: boolean;
  agree_terms: boolean;
};

export function normalizeComparableUrl(value: string): string | null {
  if (!isHttpUrl(value)) {
    return null;
  }

  try {
    const parsed = new URL(trimText(value));
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.origin}${pathname}`.toLowerCase();
  } catch {
    return null;
  }
}

export function isSameAsSiteUrl(siteUrl: string, candidateUrl: string): boolean {
  const site = normalizeComparableUrl(siteUrl);
  const candidate = normalizeComparableUrl(candidateUrl);

  if (!site || !candidate) {
    return false;
  }

  return site === candidate;
}

export function normalizeStringList(values: string[]): string[] {
  return [...new Set(values.map((value) => trimText(value)).filter(Boolean))].sort();
}

export function normalizeResolvedFeed(feed: FeedInput[]): Array<{ name: string; url: string }> {
  return feed
    .map((item, index) => ({
      name: trimText(item.name) || (feed.length === 1 && index === 0 ? '默认订阅' : ''),
      url: trimText(item.url),
    }))
    .filter((item) => item.url.length > 0);
}

export function areEqualJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateContactFields(
  form: ContactFormLike,
  fieldErrors: FieldErrors,
  options: {
    requireReason: boolean;
    reasonMessage: string;
  },
): void {
  if (trimText(form.submitter_email) && !isValidEmail(form.submitter_email)) {
    fieldErrors.submitter_email = '提交者邮箱格式不正确。';
  }

  if (options.requireReason && !trimText(form.submit_reason)) {
    fieldErrors.submit_reason = options.reasonMessage;
  }

  if (!form.agree_terms) {
    fieldErrors.agree_terms = '请先勾选同意协议。';
  }
}

export function buildDefaultCreateReason(name: string, url: string): string {
  return `公开新增收录申请：${name}（${url}）`;
}

export function normalizeSubmitterName(value: string): string {
  return trimText(value) || '匿名提交者';
}

export function normalizeOptionalSubmitterEmail(value: string): string {
  const normalized = normalizeEmail(value);
  return normalized && isValidEmail(normalized) ? normalized : 'noreply@zhblogs.invalid';
}

export function toLookupPayload(identifier: string) {
  const normalized = trimText(identifier);

  if (!normalized) {
    return null;
  }

  if (isUuid(normalized)) {
    return { site_id: normalized };
  }

  if (isHttpUrl(normalized)) {
    return { url: normalized };
  }

  return { bid: normalized };
}
