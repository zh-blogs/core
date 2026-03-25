import type { FastifyInstance } from 'fastify';

import { autoFillSite } from '@/application/sites/usecase/site-auto-fill.usecase';
import {
  hasPendingSiteAudit,
  loadAutoFillHints,
  loadSiteSearchResults,
  loadSubmissionOptions,
} from '@/application/sites/usecase/site-option.usecase';
import {
  buildCombinedTagIds,
  buildCreateSnapshot,
  buildDeleteSnapshot,
  buildSnapshotDiff,
  buildUpdatedSnapshot,
} from '@/domain/sites/service/site-snapshot.service';
import {
  hasOwn,
  normalizeSubmitterEmail,
  resolveAuditSiteName,
  validateCreateSiteFields,
  validateDeleteSiteFields,
  validateFeedSelection,
  validateSiteLookupFields,
  validateSubmissionQueryFields,
  validateUpdateSiteFields,
} from '@/domain/sites/service/site-submission-validation.service';
import {
  ensureNoSiteIdentifierConflict,
  ensureTagIdsExist,
  ensureTechnologyIdsExist,
  loadCurrentSiteSnapshot,
} from '@/infrastructure/sites/db/site.repository';

import {
  autoFillResultSchema,
  errorResponseSchema,
  optionsResultSchema,
  siteIdParamJsonSchema,
  siteLookupResultSchema,
  siteSearchResultSchema,
  submissionQueryResultSchema,
  submissionResultSchema,
} from '../dto';
import {
  createSiteSubmissionSchema,
  siteAutoFillSchema,
  siteIdParamSchema,
  siteLookupSchema,
  siteSearchSchema,
  submissionContactSchema,
  submissionQuerySchema,
  updateSiteSubmissionSchema,
} from '../dto/site-request.dto';

import { registerCreateSubmissionRoute } from './create-site-submission.controller';
import { registerDeleteSubmissionRoute } from './delete-site-submission.controller';
import { registerSiteDiscoveryRoutes } from './site-discovery.controller';
import {
  enforceSubmissionRateLimit,
  loadSiteLookupTarget,
  sendApiError,
} from './site-route.service';
import { registerSubmissionQueryRoute } from './site-submission-query.controller';
import { registerUpdateSubmissionRoute } from './update-site-submission.controller';

export function registerSiteRoutes(app: FastifyInstance): void {
  registerSiteDiscoveryRoutes(app, {
    errorResponseSchema,
    siteSearchSchema,
    siteSearchResultSchema,
    loadSiteSearchResults,
    optionsResultSchema,
    loadSubmissionOptions,
    siteAutoFillSchema,
    autoFillResultSchema,
    loadAutoFillHints,
    autoFillSite,
    siteLookupSchema,
    siteLookupResultSchema,
    validateSiteLookupFields,
    loadSiteLookupTarget,
    loadCurrentSiteSnapshot,
    sendApiError,
  });

  registerSubmissionQueryRoute(app, {
    errorResponseSchema,
    submissionQueryResultSchema,
    submissionQuerySchema,
    validateSubmissionQueryFields,
    resolveAuditSiteName,
    sendApiError,
  });

  registerCreateSubmissionRoute(app, {
    submissionResultSchema,
    errorResponseSchema,
    enforceSubmissionRateLimit,
    createSiteSubmissionSchema,
    normalizeSubmitterEmail,
    validateCreateSiteFields,
    sendApiError,
    buildCreateSnapshot,
    validateFeedSelection,
    ensureTagIdsExist,
    buildCombinedTagIds,
    ensureTechnologyIdsExist,
    ensureNoSiteIdentifierConflict,
    buildSnapshotDiff,
  });

  registerUpdateSubmissionRoute(app, {
    siteIdParamJsonSchema,
    submissionResultSchema,
    errorResponseSchema,
    enforceSubmissionRateLimit,
    siteIdParamSchema,
    updateSiteSubmissionSchema,
    normalizeSubmitterEmail,
    validateUpdateSiteFields,
    sendApiError,
    loadCurrentSiteSnapshot,
    hasPendingSiteAudit,
    buildUpdatedSnapshot,
    validateFeedSelection,
    buildSnapshotDiff,
    hasOwn,
    ensureTagIdsExist,
    buildCombinedTagIds,
    ensureTechnologyIdsExist,
    ensureNoSiteIdentifierConflict,
  });

  registerDeleteSubmissionRoute(app, {
    siteIdParamJsonSchema,
    submissionResultSchema,
    errorResponseSchema,
    enforceSubmissionRateLimit,
    siteIdParamSchema,
    submissionContactSchema,
    normalizeSubmitterEmail,
    validateDeleteSiteFields,
    sendApiError,
    loadCurrentSiteSnapshot,
    hasPendingSiteAudit,
    buildDeleteSnapshot,
    buildSnapshotDiff,
  });
}
