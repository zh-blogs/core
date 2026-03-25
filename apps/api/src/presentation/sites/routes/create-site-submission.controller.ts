import { type SiteAuditDiffItem, SiteAudits, type SiteAuditSnapshot } from '@zhblogs/db';

import type { FastifyInstance, FastifyReply, preHandlerHookHandler } from 'fastify';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParseResult = { success: true; data: any } | { success: false };

type SafeParser = {
  safeParse: (input: unknown) => ParseResult;
};

type ErrorResponder = (
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  fields?: string[],
) => unknown;

type CreateSubmissionInput = {
  submitter_name: string;
  submitter_email: string;
  submit_reason: string;
  notify_by_email: boolean;
  site: {
    name: string;
    url: string;
    sign?: string | null;
    icon_base64?: string | null;
    feed?: SiteAuditSnapshot['feed'];
    default_feed_url?: string | null;
    sitemap?: string | null;
    link_page?: string | null;
    main_tag_id?: string | null;
    sub_tag_ids?: string[] | null;
    custom_sub_tags?: string[] | null;
    architecture?: SiteAuditSnapshot['architecture'];
  };
};

type CreateRouteDeps = {
  submissionResultSchema: unknown;
  errorResponseSchema: unknown;
  enforceSubmissionRateLimit: preHandlerHookHandler;
  createSiteSubmissionSchema: SafeParser;
  normalizeSubmitterEmail: (email: string) => string;
  validateCreateSiteFields: (payload: CreateSubmissionInput) => string[];
  sendApiError: ErrorResponder;
  buildCreateSnapshot: (site: CreateSubmissionInput['site']) => SiteAuditSnapshot;
  validateFeedSelection: (
    feed: SiteAuditSnapshot['feed'],
    defaultFeedUrl: string | null | undefined,
    fieldPrefix: string,
  ) => string[];
  ensureTagIdsExist: (app: FastifyInstance, tagIds: string[]) => Promise<boolean>;
  buildCombinedTagIds: (mainTagId?: string | null, subTagIds?: string[] | null) => string[] | null;
  ensureTechnologyIdsExist: (
    app: FastifyInstance,
    architecture: SiteAuditSnapshot['architecture'],
  ) => Promise<boolean>;
  ensureNoSiteIdentifierConflict: (
    app: FastifyInstance,
    snapshot: SiteAuditSnapshot,
    ignoreSiteId?: string,
  ) => Promise<Array<'url' | 'bid' | 'name'> | null>;
  buildSnapshotDiff: (
    before: SiteAuditSnapshot | null,
    after: SiteAuditSnapshot,
  ) => SiteAuditDiffItem[];
};

export function registerCreateSubmissionRoute(app: FastifyInstance, deps: CreateRouteDeps): void {
  app.post(
    '/api/sites',
    {
      schema: {
        tags: ['sites'],
        summary: 'Submit a new site for review',
        response: {
          201: deps.submissionResultSchema,
          400: deps.errorResponseSchema,
          409: deps.errorResponseSchema,
          429: deps.errorResponseSchema,
          503: deps.errorResponseSchema,
        },
      },
      preHandler: deps.enforceSubmissionRateLimit,
    },
    async (request, reply) => {
      const parsed = deps.createSiteSubmissionSchema.safeParse(request.body);

      if (!parsed.success) {
        return deps.sendApiError(
          reply,
          400,
          'INVALID_BODY',
          'Request body is invalid for a site creation submission.',
        );
      }

      const payload = {
        ...(parsed.data as CreateSubmissionInput),
        submitter_email: deps.normalizeSubmitterEmail(String(parsed.data.submitter_email ?? '')),
      };
      const invalidFields = deps.validateCreateSiteFields(payload);

      if (invalidFields.length > 0) {
        return deps.sendApiError(
          reply,
          400,
          'INVALID_BODY',
          'Request body contains empty or malformed fields.',
          invalidFields,
        );
      }

      try {
        const proposedSnapshot = deps.buildCreateSnapshot(payload.site);
        const feedFields = deps.validateFeedSelection(
          proposedSnapshot.feed,
          proposedSnapshot.default_feed_url,
          'site.',
        );

        if (feedFields.length > 0) {
          return deps.sendApiError(
            reply,
            400,
            'INVALID_BODY',
            'Request body contains empty or malformed fields.',
            feedFields,
          );
        }

        const [tagsValid, architectureValid, conflictFields] = await Promise.all([
          deps.ensureTagIdsExist(
            app,
            deps.buildCombinedTagIds(payload.site.main_tag_id, payload.site.sub_tag_ids) ?? [],
          ),
          deps.ensureTechnologyIdsExist(app, proposedSnapshot.architecture),
          deps.ensureNoSiteIdentifierConflict(app, proposedSnapshot),
        ]);

        if (!tagsValid) {
          return deps.sendApiError(
            reply,
            400,
            'INVALID_TAG_IDS',
            'One or more submitted tag IDs do not exist or are disabled.',
            ['site.main_tag_id', 'site.sub_tag_ids'],
          );
        }

        if (!architectureValid) {
          return deps.sendApiError(
            reply,
            400,
            'INVALID_ARCHITECTURE',
            'One or more submitted technology IDs do not match the expected catalog type.',
            ['site.architecture'],
          );
        }

        if (conflictFields) {
          return deps.sendApiError(
            reply,
            409,
            'SITE_CONFLICT',
            'A site with the same unique identifier already exists.',
            conflictFields.map((field) => `site.${field}`),
          );
        }

        const diff = deps.buildSnapshotDiff(null, proposedSnapshot);

        const [createdAudit] = await app.db.write
          .insert(SiteAudits)
          .values({
            action: 'CREATE',
            proposed_snapshot: proposedSnapshot,
            diff,
            submit_reason: payload.submit_reason,
            submitter_name: payload.submitter_name,
            submitter_email: payload.submitter_email,
            notify_by_email: payload.notify_by_email,
          })
          .returning({
            id: SiteAudits.id,
            status: SiteAudits.status,
          });

        if (!createdAudit) {
          throw new Error('site creation audit insert returned no row');
        }

        return reply.code(201).send({
          ok: true,
          data: {
            audit_id: createdAudit.id,
            action: 'CREATE',
            status: createdAudit.status,
            site_id: null,
          },
        });
      } catch (error) {
        app.log.error({ error }, 'failed to create site submission audit');
        return deps.sendApiError(
          reply,
          503,
          'DEPENDENCY_ERROR',
          'Unable to persist the site creation submission right now.',
        );
      }
    },
  );
}
