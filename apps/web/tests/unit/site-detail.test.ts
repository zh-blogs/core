import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SITE_DETAIL_DESCRIPTION,
  resolveSiteDetailDescription,
} from '@/components/site/site-detail.shared';

describe('site detail description', () => {
  it('returns the original sign when it exists', () => {
    expect(resolveSiteDetailDescription(' 一个有简介的站点 ')).toBe('一个有简介的站点');
  });

  it('falls back to the fixed default description', () => {
    expect(resolveSiteDetailDescription('')).toBe(DEFAULT_SITE_DETAIL_DESCRIPTION);
    expect(resolveSiteDetailDescription(null)).toBe(DEFAULT_SITE_DETAIL_DESCRIPTION);
  });
});
