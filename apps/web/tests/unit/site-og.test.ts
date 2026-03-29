import { describe, expect, it } from 'vitest';

import { buildSiteOgImagePath, buildSiteOgSvg } from '@/shared/site-og';

describe('site og helpers', () => {
  it('builds the detail og image path from the site slug', () => {
    expect(buildSiteOgImagePath('site-1')).toBe('/og/site/site-1.svg');
  });

  it('renders a site-specific svg card from detail data', () => {
    const svg = buildSiteOgSvg({
      name: 'Cloud Atlas',
      url: 'https://cloud-atlas.example/blog',
      description: '记录基础设施与系统实验。',
      joinTime: '2026-03-01T08:00:00.000Z',
    });

    expect(svg).toContain('Cloud Atlas');
    expect(svg).toContain('记录基础设施与系统实验。');
    expect(svg).toContain('cloud-atlas.example/blog');
    expect(svg).toContain('加入日期');
    expect(svg).toContain('2026.03.01');
    expect(svg).not.toContain('文章数');
    expect(svg).not.toContain('更新时间');
  });
});
