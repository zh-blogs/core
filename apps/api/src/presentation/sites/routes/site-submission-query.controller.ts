import { SiteAudits, type SiteAuditSnapshot } from '@zhblogs/db';

import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply } from 'fastify';

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

type SubmissionQueryInput = {
  audit_id: string;
};

type SubmissionQueryDeps = {
  errorResponseSchema: unknown;
  submissionQueryResultSchema: unknown;
  submissionQuerySchema: SafeParser;
  validateSubmissionQueryFields: (payload: SubmissionQueryInput) => string[];
  resolveAuditSiteName: (
    proposed: SiteAuditSnapshot | null | undefined,
    current: SiteAuditSnapshot | null | undefined,
  ) => string | null;
  sendApiError: ErrorResponder;
};

export function registerSubmissionQueryRoute(
  app: FastifyInstance,
  deps: SubmissionQueryDeps,
): void {
  app.post(
    '/api/sites/submissions/query',
    {
      schema: {
        tags: ['sites'],
        summary: 'Query the current status of a public site submission',
        response: {
          200: deps.submissionQueryResultSchema,
          400: deps.errorResponseSchema,
          404: deps.errorResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const parsed = deps.submissionQuerySchema.safeParse(request.body);

      if (!parsed.success) {
        return deps.sendApiError(
          reply,
          400,
          'INVALID_BODY',
          'Request body is invalid for a site submission query.',
        );
      }

      const payload = {
        ...(parsed.data as SubmissionQueryInput),
      };
      const invalidFields = deps.validateSubmissionQueryFields(payload);

      if (invalidFields.length > 0) {
        return deps.sendApiError(
          reply,
          400,
          'INVALID_BODY',
          'Request body contains empty or malformed fields.',
          invalidFields,
        );
      }

      const [audit] = await app.db.read
        .select({
          id: SiteAudits.id,
          action: SiteAudits.action,
          status: SiteAudits.status,
          site_id: SiteAudits.site_id,
          current_snapshot: SiteAudits.current_snapshot,
          proposed_snapshot: SiteAudits.proposed_snapshot,
          reviewer_comment: SiteAudits.reviewer_comment,
          created_time: SiteAudits.created_time,
          reviewed_time: SiteAudits.reviewed_time,
        })
        .from(SiteAudits)
        .where(eq(SiteAudits.id, payload.audit_id))
        .limit(1);

      if (!audit) {
        return deps.sendApiError(
          reply,
          404,
          'SUBMISSION_NOT_FOUND',
          'No matching submission was found for the provided audit ID.',
        );
      }

      return {
        ok: true,
        data: {
          audit_id: audit.id,
          action: audit.action,
          status: audit.status,
          site_id: audit.site_id,
          site_name: deps.resolveAuditSiteName(
            audit.proposed_snapshot as SiteAuditSnapshot | null | undefined,
            audit.current_snapshot as SiteAuditSnapshot | null | undefined,
          ),
          reviewer_comment: audit.reviewer_comment ?? null,
          created_time: audit.created_time.toISOString(),
          reviewed_time: audit.reviewed_time ? audit.reviewed_time.toISOString() : null,
        },
      };
    },
  );
}
