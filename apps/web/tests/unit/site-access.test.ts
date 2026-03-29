import { describe, expect, it, vi } from 'vitest';

import { navigateToTrackedSite, trackSiteAccess } from '@/application/site/site-access.client';

describe('site access tracking helper', () => {
  it('prefers sendBeacon when available', () => {
    const sendBeacon = vi.fn(() => true);
    const fetchSpy = vi.fn();

    vi.stubGlobal('window', {
      location: {
        pathname: '/site/go',
        search: '?recommend=true',
        hash: '',
        assign: vi.fn(),
      },
      open: vi.fn(),
    });
    vi.stubGlobal('navigator', {
      sendBeacon,
    });
    vi.stubGlobal('fetch', fetchSpy);

    trackSiteAccess('site-1', {
      source: 'SITE_GO',
      targetKind: 'SITE',
    });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledWith('/api/site-directory/site-1/access', expect.any(Blob));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('falls back to fetch keepalive when sendBeacon is unavailable', () => {
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })));

    vi.stubGlobal('window', {
      location: {
        pathname: '/site/123',
        search: '',
        hash: '#articles',
        assign: vi.fn(),
      },
      open: vi.fn(),
    });
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('fetch', fetchSpy);

    trackSiteAccess('site-2', {
      source: 'SITE_DETAIL',
      targetKind: 'ARTICLE',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/site-directory/site-2/access',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        credentials: 'same-origin',
      }),
    );
  });

  it('uses the same tracking helper before same-tab navigation', () => {
    const assign = vi.fn();
    const sendBeacon = vi.fn(() => true);

    vi.stubGlobal('window', {
      location: {
        pathname: '/site/go',
        search: '',
        hash: '',
        assign,
      },
      open: vi.fn(),
    });
    vi.stubGlobal('navigator', {
      sendBeacon,
    });
    vi.stubGlobal('fetch', vi.fn());

    navigateToTrackedSite({
      siteId: 'site-3',
      href: 'https://target.example',
      source: 'SITE_GO',
      targetKind: 'SITE',
    });

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('https://target.example');
  });
});
