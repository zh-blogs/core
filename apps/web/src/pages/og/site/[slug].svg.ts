import type { APIRoute } from 'astro';

import { fetchSiteDetail } from '@/application/site/site-directory.server';
import { resolveSiteDetailDescription } from '@/components/site/site-detail.shared';
import { buildSiteOgSvg, type SiteOgCardInput } from '@/shared/site-og';

export const prerender = false;

function buildOgPayload(
  detail: NonNullable<Awaited<ReturnType<typeof fetchSiteDetail>>>,
): SiteOgCardInput {
  return {
    name: detail.name,
    url: detail.url,
    description: resolveSiteDetailDescription(detail.sign),
    joinTime: detail.joinTime,
  };
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug?.trim() ?? '';
  const detail = slug ? await fetchSiteDetail(slug) : null;

  if (!detail) {
    return new Response('site not found', {
      status: 404,
      headers: {
        'cache-control': 'no-store',
      },
    });
  }

  return new Response(buildSiteOgSvg(buildOgPayload(detail)), {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
