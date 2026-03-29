import type {
  SiteAccessNavigateInput,
  SiteAccessPayload,
} from '@/application/site/site-access.shared';

function resolveCurrentPath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function trackSiteAccessRequest(siteId: string, payload: SiteAccessPayload): void {
  if (typeof window === 'undefined') {
    return;
  }

  const body = JSON.stringify({
    ...payload,
    path: resolveCurrentPath(),
  });
  const endpoint = `/api/site-directory/${siteId}/access`;
  const blob = new Blob([body], {
    type: 'application/json',
  });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const sent = navigator.sendBeacon(endpoint, blob);

    if (sent) {
      return;
    }
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => undefined);
}

export function trackSiteAccess(siteId: string, payload: SiteAccessPayload): void {
  trackSiteAccessRequest(siteId, payload);
}

export function navigateToTrackedSite(input: SiteAccessNavigateInput): void {
  trackSiteAccessRequest(input.siteId, {
    source: input.source,
    targetKind: input.targetKind,
  });

  if (typeof window === 'undefined') {
    return;
  }

  if (input.newTab) {
    window.open(input.href, '_blank', 'noopener,noreferrer');
    return;
  }

  window.location.assign(input.href);
}
