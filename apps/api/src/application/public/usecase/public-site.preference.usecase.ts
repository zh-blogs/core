import { SiteFeedbackAudits, Users } from '@zhblogs/db';

import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import type {
  PublicSiteFeedbackInput,
  SiteDirectoryPreference,
} from '@/application/public/usecase/public-site.types';
import { resolvePublicSiteBySlug } from '@/application/public/usecase/public-site.usecase';

export async function submitPublicSiteFeedback(
  app: FastifyInstance,
  input: PublicSiteFeedbackInput,
): Promise<{ id: string }> {
  const site = await resolvePublicSiteBySlug(app, input.slug);

  if (!site) {
    throw new Error('site_not_found');
  }

  const [audit] = await app.db.write
    .insert(SiteFeedbackAudits)
    .values({
      site_id: site.id,
      reason_type: input.reasonType,
      feedback_content: input.feedbackContent.trim(),
      reporter_name: input.reporterName?.trim() || null,
      reporter_email: input.reporterEmail?.trim() || null,
      notify_by_email: input.notifyByEmail ?? false,
    })
    .returning({ id: SiteFeedbackAudits.id });

  if (!audit) {
    throw new Error('feedback_create_failed');
  }

  return audit;
}

function normalizeSiteDirectoryPreference(
  value: Record<string, unknown> | null | undefined,
): SiteDirectoryPreference {
  return {
    randomMode: value?.randomMode === 'off' ? 'off' : 'stable',
    randomSeed:
      typeof value?.randomSeed === 'string' && value.randomSeed.trim() ? value.randomSeed : null,
  };
}

function extractSiteDirectoryPreference(settings: unknown): Record<string, unknown> {
  const raw =
    settings &&
    typeof settings === 'object' &&
    !Array.isArray(settings) &&
    'site_directory' in settings
      ? (settings as { site_directory?: unknown }).site_directory
      : null;

  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

export async function readSiteDirectoryPreference(
  app: FastifyInstance,
  userId: string,
): Promise<SiteDirectoryPreference> {
  const [row] = await app.db.read
    .select({ settings: Users.settings })
    .from(Users)
    .where(eq(Users.id, userId))
    .limit(1);

  return normalizeSiteDirectoryPreference(extractSiteDirectoryPreference(row?.settings));
}

export async function updateSiteDirectoryPreference(
  app: FastifyInstance,
  userId: string,
  input: SiteDirectoryPreference,
): Promise<SiteDirectoryPreference> {
  const [row] = await app.db.read
    .select({ settings: Users.settings })
    .from(Users)
    .where(eq(Users.id, userId))
    .limit(1);

  const normalized = normalizeSiteDirectoryPreference({
    randomMode: input.randomMode,
    randomSeed: input.randomSeed?.trim() || null,
  });

  const nextSettings = {
    ...(row?.settings ?? {}),
    site_directory: normalized,
  };

  await app.db.write.update(Users).set({ settings: nextSettings }).where(eq(Users.id, userId));

  return normalized;
}
