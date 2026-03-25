export const SITE_NOTICE_OPEN_EVENT = 'zhblogs:notice:open';
export const LEGACY_DOMAIN_FROM_PARAM = 'from';
export const DEFAULT_PRIMARY_DOMAIN = 'www.zhblogs.net';
export const DEFAULT_ZHBLOGS_CN_EXPIRES_AT = '2027-02-22T19:27:13+08:00';
export const DEFAULT_SITE_NOTICE_DURATION_MS = 6000;
export const DEFAULT_LEGACY_DOMAIN_NOTICE_DURATION_MS = 10000;

export type SiteNoticeTone = 'neutral' | 'info' | 'warning' | 'success' | 'error';

export interface SiteNoticePayload {
  durationMs?: number | null;
  eyebrow?: string;
  id?: string;
  message: string;
  title: string;
  tone?: SiteNoticeTone;
}

export interface LegacyDomainNoticeOptions {
  primaryDomain?: string;
  zhblogsCnExpiresAt?: string | null;
}

const LEGACY_DOMAIN_ALIASES = new Map<string, string>([
  ['zhblogs.ohyee.cc', 'zhblogs.ohyee.cc'],
  ['www.zhblogs.ohyee.cc', 'zhblogs.ohyee.cc'],
  ['zhblogs.cn', 'zhblogs.cn'],
  ['www.zhblogs.cn', 'zhblogs.cn'],
  ['zhblogs.org', 'zhblogs.org'],
  ['www.zhblogs.org', 'zhblogs.org'],
]);

const tryParseUrl = (input: string): URL | null => {
  try {
    return new URL(input);
  } catch {
    try {
      return new URL(`https://${input}`);
    } catch {
      return null;
    }
  }
};

const toUrl = (input: string | URL): URL =>
  input instanceof URL ? new URL(input.toString()) : new URL(input);

export const normalizeLegacyDomain = (input: string | null | undefined): string | null => {
  const candidate = input?.trim();

  if (!candidate) {
    return null;
  }

  const parsed = tryParseUrl(candidate);

  if (!parsed?.hostname) {
    return null;
  }

  return parsed.hostname.toLowerCase();
};

export const formatNoticeDate = (input: string | null | undefined): string | null => {
  const candidate = input?.trim();

  if (!candidate) {
    return null;
  }

  const parsed = new Date(candidate);

  if (Number.isNaN(parsed.getTime())) {
    return candidate;
  }

  return parsed.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const buildPrimaryDomainUrl = (
  input: string | URL,
  primaryDomain = DEFAULT_PRIMARY_DOMAIN,
): string => {
  const url = toUrl(input);

  url.protocol = 'https:';
  url.hostname = primaryDomain;
  url.port = '';
  url.searchParams.delete(LEGACY_DOMAIN_FROM_PARAM);

  return url.toString();
};

const buildLegacyDomainNotice = (
  sourceDomain: string,
  options: LegacyDomainNoticeOptions = {},
): SiteNoticePayload | null => {
  if (sourceDomain === 'zhblogs.ohyee.cc') {
    return {
      durationMs: DEFAULT_LEGACY_DOMAIN_NOTICE_DURATION_MS,
      eyebrow: '域名迁移提醒',
      id: 'legacy-domain:zhblogs.ohyee.cc',
      message:
        '您当前是从早期域名 zhblogs.ohyee.cc 跳转过来的。该域名已停止维护，请尽快将书签、订阅地址和常用入口更新为 www.zhblogs.net。',
      title: '旧入口已停止使用',
      tone: 'warning',
    };
  }

  if (sourceDomain === 'zhblogs.cn') {
    const expiry = formatNoticeDate(options.zhblogsCnExpiresAt ?? DEFAULT_ZHBLOGS_CN_EXPIRES_AT);

    return {
      durationMs: DEFAULT_LEGACY_DOMAIN_NOTICE_DURATION_MS,
      eyebrow: '主域名迁移提醒',
      id: 'legacy-domain:zhblogs.cn',
      message: expiry
        ? `您当前是从旧主域名 zhblogs.cn 跳转过来的。该域名将于 ${expiry} 到期，之后可能无法继续访问，请尽快将书签、订阅地址和常用入口更新为 www.zhblogs.net。`
        : '您当前是从旧主域名 zhblogs.cn 跳转过来的。该域名已进入停用迁移期，请尽快将书签、订阅地址和常用入口更新为 www.zhblogs.net。',
      title: expiry ? '旧主域名即将到期' : '旧主域名已进入迁移期',
      tone: 'warning',
    };
  }

  if (sourceDomain === 'zhblogs.org') {
    return {
      durationMs: DEFAULT_LEGACY_DOMAIN_NOTICE_DURATION_MS,
      eyebrow: '访问入口提示',
      id: 'legacy-domain:zhblogs.org',
      message:
        '您当前是通过辅助域名 zhblogs.org 进入本站。对外统一访问入口为 www.zhblogs.net，建议优先使用主域名，避免后续链接、缓存或书签入口出现偏差。',
      title: '当前入口仅作兼容保留',
      tone: 'info',
    };
  }

  return null;
};

export const getLegacyDomainNoticeFromUrl = (
  input: string | URL,
  options: LegacyDomainNoticeOptions = {},
): SiteNoticePayload | null => {
  const url = toUrl(input);
  const fromDomain = normalizeLegacyDomain(url.searchParams.get(LEGACY_DOMAIN_FROM_PARAM));

  if (!fromDomain) {
    return null;
  }

  const sourceDomain = LEGACY_DOMAIN_ALIASES.get(fromDomain);

  if (!sourceDomain) {
    return null;
  }

  return buildLegacyDomainNotice(sourceDomain, options);
};

export const dispatchSiteNotice = (payload: SiteNoticePayload): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<SiteNoticePayload>(SITE_NOTICE_OPEN_EVENT, {
      detail: payload,
    }),
  );
};
