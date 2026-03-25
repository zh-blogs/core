import { afterEach, describe, expect, it, vi } from 'vitest';

import { autoFillSite } from '@/application/sites/usecase/site-auto-fill.usecase';

describe('autoFillSite', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses title fallback, page links, and common architecture hints', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === 'https://example.com') {
        return new Response(
          `
            <html>
              <head>
                <title>Example Blog - 关于前端与架构</title>
                <meta name="generator" content="Discuz! X3.5" />
                <link rel="alternate" href="/atom.xml" type="application/atom+xml" />
                <link rel="sitemap" href="/site-map.xml" />
              </head>
              <body>
                <a href="/friends">友情链接</a>
              </body>
            </html>
          `,
          {
            status: 200,
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          },
        );
      }

      if (url === 'https://example.com/atom.xml') {
        return new Response('<feed><title>Atom Feed</title></feed>', {
          status: 200,
          headers: {
            'content-type': 'application/atom+xml',
          },
        });
      }

      if (url === 'https://example.com/feed.xml') {
        return new Response('<rss version="2.0"><channel></channel></rss>', {
          status: 200,
          headers: {
            'content-type': 'application/rss+xml',
          },
        });
      }

      if (url === 'https://example.com/site-map.xml') {
        return new Response('<urlset></urlset>', {
          status: 200,
          headers: {
            'content-type': 'application/xml',
          },
        });
      }

      if (url === 'https://example.com/friends') {
        return new Response('<html><head><title>友情链接</title></head><body></body></html>', {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        });
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await autoFillSite('https://example.com', {
      feed_paths: ['/feed.xml'],
      sitemap_paths: ['/sitemap.xml'],
      link_page_paths: ['/links'],
    });

    expect(result.name).toBe('Example Blog - 关于前端与架构');
    expect(result.sign).toBe('关于前端与架构');
    expect(result.feed_candidates).toEqual([
      {
        name: '默认订阅',
        url: 'https://example.com/atom.xml',
      },
      {
        name: '订阅 2',
        url: 'https://example.com/feed.xml',
      },
    ]);
    expect(result.sitemap).toBe('https://example.com/site-map.xml');
    expect(result.link_page).toBe('https://example.com/friends');
    expect(result.architecture).toEqual({
      program_id: null,
      program_name: 'Discuz',
      program_is_open_source: null,
      stacks: [
        {
          category: 'LANGUAGE',
          catalog_id: null,
          name: 'PHP',
          name_normalized: 'php',
        },
      ],
      website_url: null,
      repo_url: null,
    });
    expect(result.warnings).toBeUndefined();
  });

  it('probes derived paths and only returns validated candidates', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === 'https://example.com') {
        throw new Error('network unavailable');
      }

      if (url === 'https://example.com/custom-feed.xml') {
        return new Response('<rss version="2.0"><channel></channel></rss>', {
          status: 200,
          headers: {
            'content-type': 'application/rss+xml',
          },
        });
      }

      if (url === 'https://example.com/maps/site.xml') {
        return new Response('<urlset></urlset>', {
          status: 200,
          headers: {
            'content-type': 'application/xml',
          },
        });
      }

      if (url === 'https://example.com/links') {
        return new Response('<html><head><title>友情链接</title></head><body></body></html>', {
          status: 200,
          headers: {
            'content-type': 'text/html; charset=utf-8',
          },
        });
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await autoFillSite('https://example.com', {
      feed_paths: ['/custom-feed.xml'],
      sitemap_paths: ['/maps/site.xml'],
      link_page_paths: ['/links'],
    });

    expect(result.name).toBe('');
    expect(result.sign).toBe('');
    expect(result.feed_candidates[0]).toEqual({
      name: '默认订阅',
      url: 'https://example.com/custom-feed.xml',
    });
    expect(result.feed_candidates.some((item) => item.url === 'https://example.com/feed.xml')).toBe(
      false,
    );
    expect(result.sitemap).toBe('https://example.com/maps/site.xml');
    expect(result.link_page).toBe('https://example.com/links');
    expect(result.warnings).toContain(
      '未能抓取站点首页，已继续探测常用订阅、站点地图和友链页地址；未通过验证的候选不会回填。',
    );
  });

  it('dedupes equivalent feeds with JSON > ATOM > RSS and shorter uri preference', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);

      if (url === 'https://example.com') {
        return new Response(
          `
            <html>
              <head><title>Example Blog</title></head>
              <body>
                <a href="/rss.xml">rss</a>
                <a href="/atom.xml">atom</a>
                <a href="/feed.json">json</a>
                <a href="/feed-long.json?from=alt">json alt</a>
              </body>
            </html>
          `,
          {
            status: 200,
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          },
        );
      }

      if (url === 'https://example.com/rss.xml') {
        return new Response(
          '<rss><channel><item><title>Post A</title></item><item><title>Post B</title></item></channel></rss>',
          {
            status: 200,
            headers: {
              'content-type': 'application/rss+xml',
            },
          },
        );
      }

      if (url === 'https://example.com/atom.xml') {
        return new Response(
          '<feed><entry><title>Post A</title></entry><entry><title>Post B</title></entry></feed>',
          {
            status: 200,
            headers: {
              'content-type': 'application/atom+xml',
            },
          },
        );
      }

      if (url === 'https://example.com/feed.json') {
        return new Response(
          JSON.stringify({
            version: 'https://jsonfeed.org/version/1.1',
            items: [
              { id: 'a', title: 'Post A' },
              { id: 'b', title: 'Post B' },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/feed+json',
            },
          },
        );
      }

      if (url === 'https://example.com/feed-long.json?from=alt') {
        return new Response(
          JSON.stringify({
            version: 'https://jsonfeed.org/version/1.1',
            items: [
              { id: 'a', title: 'Post A' },
              { id: 'b', title: 'Post B' },
            ],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/feed+json',
            },
          },
        );
      }

      return new Response('not found', { status: 404 });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await autoFillSite('https://example.com');

    expect(result.feed_candidates).toEqual([
      {
        name: '默认订阅',
        url: 'https://example.com/feed.json',
      },
    ]);
    expect(result.warnings).toContain('检测到 3 个内容重复的订阅源，已按优先级保留最佳来源。');
  });
});
