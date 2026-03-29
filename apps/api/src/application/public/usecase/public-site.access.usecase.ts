import { SiteAccessEvents, Sites } from '@zhblogs/db';

import { and, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type {
  PublicSiteAccessEventInput,
  PublicSiteAccessEventResult,
} from '@/application/public/usecase/public-site.types';

function trimToMaxLength(value: string | null | undefined, maxLength: number): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function extractRefererHost(referer: string | null, origin: string | null): string | null {
  for (const candidate of [referer, origin]) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(candidate).host.slice(0, 256);
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeSource(source: string, targetKind: string): string {
  return `${source}:${targetKind}`.slice(0, 64);
}

export async function recordPublicSiteAccessEvent(
  app: FastifyInstance,
  input: PublicSiteAccessEventInput,
): Promise<PublicSiteAccessEventResult | null> {
  const [site] = await app.db.read
    .select({
      id: Sites.id,
    })
    .from(Sites)
    .where(and(eq(Sites.id, input.id), eq(Sites.is_show, true)))
    .limit(1);

  if (!site) {
    return null;
  }

  await app.db.write.insert(SiteAccessEvents).values({
    site_id: input.id,
    event_type: 'OUTBOUND_CLICK',
    source: normalizeSource(input.source, input.targetKind),
    referer_host: extractRefererHost(input.referer, input.origin),
    path: trimToMaxLength(input.path, 512),
    user_agent: trimToMaxLength(input.userAgent, 512),
  });

  return {
    recorded: true,
  };
}
