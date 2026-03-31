import type { ManagementPermissionKey } from './auth.guard';
import { forwardSetCookieHeaders, getApiBaseUrl } from './auth.server';

type RedirectParams = Record<string, string | null | undefined>;

export const buildRedirectLocation = (pathname: string, params: RedirectParams = {}): string => {
  const target = new URL(pathname, 'http://zhblogs.local');

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return `${target.pathname}${target.search}`;
};

export const buildRedirectUrl = (
  request: Request,
  pathname: string,
  params: RedirectParams = {},
): string => {
  const location = buildRedirectLocation(pathname, params);
  return new URL(location, request.url).toString();
};

const isManagementPath = (path: string): boolean =>
  path === '/management' || path.startsWith('/management/');

type LoginUser = {
  role: 'USER' | 'ADMIN' | 'SYS_ADMIN';
  permissions: ManagementPermissionKey[];
};

export const resolvePostLoginRedirect = (nextPath: string | null, _user: LoginUser): string => {
  if (nextPath && !isManagementPath(nextPath)) {
    return nextPath;
  }

  return '/dashboard';
};

export const sanitizeNextPath = (
  value: FormDataEntryValue | string | null | undefined,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  return normalized;
};

export const readApiErrorCode = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as {
      code?: string;
    };

    return payload.code ?? 'request_failed';
  } catch {
    return 'request_failed';
  }
};

export const proxyAuthJson = async (
  request: Request,
  path: string,
  body: Record<string, unknown>,
  method = 'POST',
): Promise<Response> =>
  fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      cookie: request.headers.get('cookie') ?? '',
    },
    body: JSON.stringify(body),
  });

export const createRedirectHeaders = (response?: Response): Headers => {
  const headers = new Headers();

  if (response) {
    forwardSetCookieHeaders(response.headers, headers);
  }

  return headers;
};
