import { isValidUrl } from '@zhblogs/utils/psl';

import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

import { ANNOUNCEMENT_STATUS_KEYS } from '../constants/announcement';
import {
  ARTICLE_FEEDBACK_ACTION_KEYS,
  ARTICLE_FEEDBACK_REASON_KEYS,
  ARTICLE_VISIBILITY_KEYS,
} from '../constants/article';
import { AUDIT_STATUS_KEYS, SITE_AUDIT_ACTION_KEYS } from '../constants/audit';
import { DEPLOYMENT_MODULE_KEYS, DEPLOYMENT_STATUS_KEYS } from '../constants/deployment';
import {
  SITE_CHECK_REGION_KEYS,
  SITE_CHECK_RESULT_KEYS,
  SITE_STATUS_TAG_KEYS,
  SITE_STATUS_TYPE_KEYS,
  SITE_WARNING_TAG_SOURCE_KEYS,
} from '../constants/monitoring';
import {
  FEED_TYPE_KEYS,
  FROM_SOURCE_KEYS,
  SITE_ACCESS_EVENT_TYPE_KEYS,
  SITE_ACCESS_SCOPE_KEYS,
  SITE_CLAIM_STATUS_KEYS,
  SITE_CLAIM_TYPE_KEYS,
  SITE_CLASSIFICATION_STATUS_KEYS,
} from '../constants/site';
import {
  EXECUTION_STATUS_KEYS,
  JOB_STATUS_KEYS,
  JOB_TRIGGER_SOURCE_KEYS,
  SCHEDULE_MODE_KEYS,
  TASK_TYPE_KEYS,
} from '../constants/task';
import {
  SITE_TECH_STACK_CATEGORY_KEYS,
  TAG_TYPE_KEYS,
  TECHNOLOGY_TYPE_KEYS,
} from '../constants/taxonomy';
import { USER_OAUTH_PROVIDER_KEYS, USER_ROLE_KEYS } from '../constants/user';
import {
  Announcements,
  ArticleFeedbackAudits,
  Deployments,
  FeedArticles,
  JobExecutions,
  Jobs,
  LatestSiteChecks,
  Programs,
  ProgramTechnologyStacks,
  SiteAccessCounters,
  SiteAccessEvents,
  SiteAccessEventTypeStats,
  SiteAccessSourceStats,
  SiteArchitectures,
  SiteAudits,
  SiteChecks,
  SiteCheckStats,
  SiteClaims,
  SiteFeedArticleStats,
  Sites,
  SiteTags,
  SiteWarningTags,
  SiteWarningTagStats,
  TagDefinitions,
  TagStats,
  TaskSchedules,
  TechnologyCatalogs,
  TechnologyStats,
  UserApiTokens,
  UserOauthAccounts,
  Users,
  UserSites,
} from '../schema';

const toEnumSchema = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]]);

const jsonRecordSchema = z.record(z.string(), z.unknown());
const domainLabelPattern = /^[a-z0-9-]+$/i;

const hasValidHostnameLabels = (hostname: string): boolean =>
  hostname.split('.').every((label) => {
    if (!label.length || label.length > 63) {
      return false;
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return false;
    }
    return domainLabelPattern.test(label);
  });

const isValidSiteUrl = (value: string): boolean => {
  if (!isValidUrl(value)) {
    return false;
  }

  try {
    return hasValidHostnameLabels(new URL(value).hostname);
  } catch {
    return false;
  }
};

const publicSiteUrlSchema = z.url().refine(isValidSiteUrl, {
  message: 'URL hostname must be a valid public domain',
});
const optionalPublicSiteUrlSchema = publicSiteUrlSchema.optional();
const nullableOptionalPublicSiteUrlSchema = publicSiteUrlSchema.nullable().optional();

export const announcementStatusSchema = toEnumSchema(ANNOUNCEMENT_STATUS_KEYS);
export const fromSourceSchema = toEnumSchema(FROM_SOURCE_KEYS);
export const feedTypeSchema = toEnumSchema(FEED_TYPE_KEYS);
export const siteAccessEventTypeSchema = toEnumSchema(SITE_ACCESS_EVENT_TYPE_KEYS);
export const siteAccessScopeSchema = toEnumSchema(SITE_ACCESS_SCOPE_KEYS);
export const siteClassificationStatusSchema = toEnumSchema(SITE_CLASSIFICATION_STATUS_KEYS);
export const siteClaimStatusSchema = toEnumSchema(SITE_CLAIM_STATUS_KEYS);
export const siteClaimTypeSchema = toEnumSchema(SITE_CLAIM_TYPE_KEYS);
export const articleVisibilitySchema = toEnumSchema(ARTICLE_VISIBILITY_KEYS);
export const siteAuditActionSchema = toEnumSchema(SITE_AUDIT_ACTION_KEYS);
export const auditStatusSchema = toEnumSchema(AUDIT_STATUS_KEYS);
export const articleFeedbackActionSchema = toEnumSchema(ARTICLE_FEEDBACK_ACTION_KEYS);
export const articleFeedbackReasonSchema = toEnumSchema(ARTICLE_FEEDBACK_REASON_KEYS);
export const taskTypeSchema = toEnumSchema(TASK_TYPE_KEYS);
export const scheduleModeSchema = toEnumSchema(SCHEDULE_MODE_KEYS);
export const jobTriggerSourceSchema = toEnumSchema(JOB_TRIGGER_SOURCE_KEYS);
export const jobStatusSchema = toEnumSchema(JOB_STATUS_KEYS);
export const executionStatusSchema = toEnumSchema(EXECUTION_STATUS_KEYS);
export const tagTypeSchema = toEnumSchema(TAG_TYPE_KEYS);
export const technologyTypeSchema = toEnumSchema(TECHNOLOGY_TYPE_KEYS);
export const siteTechStackCategorySchema = toEnumSchema(SITE_TECH_STACK_CATEGORY_KEYS);
export const userRoleSchema = toEnumSchema(USER_ROLE_KEYS);
export const userOauthProviderSchema = toEnumSchema(USER_OAUTH_PROVIDER_KEYS);
export const siteCheckRegionSchema = toEnumSchema(SITE_CHECK_REGION_KEYS);
export const siteCheckResultSchema = toEnumSchema(SITE_CHECK_RESULT_KEYS);
export const siteStatusTypeSchema = toEnumSchema(SITE_STATUS_TYPE_KEYS);
export const siteStatusTagSchema = toEnumSchema(SITE_STATUS_TAG_KEYS);
export const siteWarningTagSourceSchema = toEnumSchema(SITE_WARNING_TAG_SOURCE_KEYS);
export const deploymentStatusSchema = toEnumSchema(DEPLOYMENT_STATUS_KEYS);
export const deploymentModuleSchema = toEnumSchema(DEPLOYMENT_MODULE_KEYS);

export const multiFeedSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: feedTypeSchema.optional(),
});

const multiFeedInputSchema = z.object({
  name: z.string(),
  url: publicSiteUrlSchema,
  type: feedTypeSchema.optional(),
});

const normalizeFeedUrlValue = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

type DefaultFeedValidationPayload = {
  feed?: Array<{ url: string }> | null;
  default_feed_url?: string | null;
};

const addDefaultFeedValidation = <TSchema extends z.ZodType<DefaultFeedValidationPayload>>(
  schema: TSchema,
): TSchema =>
  schema.superRefine((value, ctx) => {
    const feed = value.feed ?? undefined;
    const defaultFeedUrl = normalizeFeedUrlValue(value.default_feed_url);

    if (feed === undefined) {
      return;
    }

    if (feed.length === 0) {
      if (defaultFeedUrl !== null) {
        ctx.addIssue({
          code: 'custom',
          message: 'default_feed_url must be null when feed is empty',
          path: ['default_feed_url'],
        });
      }

      return;
    }

    if (defaultFeedUrl === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'default_feed_url is required when feed is not empty',
        path: ['default_feed_url'],
      });
      return;
    }

    if (!feed.some((item) => item.url === defaultFeedUrl)) {
      ctx.addIssue({
        code: 'custom',
        message: 'default_feed_url must match one feed url',
        path: ['default_feed_url'],
      });
    }
  });

export const feedArticleSourceInfoSchema = z.object({
  feed_name: z.string().optional(),
  feed_url: z.string().optional(),
  feed_type: feedTypeSchema.optional(),
});

const siteArchitectureItemSchema = z.object({
  category: siteTechStackCategorySchema.nullable().optional(),
  catalog_id: z.uuid().nullable().optional(),
  name: z.string().trim().min(1).max(128).nullable().optional(),
  name_normalized: z.string().trim().min(1).max(128).nullable().optional(),
});

export const siteAuditArchitectureSchema = z.object({
  program_id: z.uuid().nullable().optional(),
  program_name: z.string().trim().min(1).max(128).nullable().optional(),
  program_is_open_source: z.boolean().nullable().optional(),
  stacks: z.array(siteArchitectureItemSchema).max(10).nullable().optional(),
  website_url: nullableOptionalPublicSiteUrlSchema,
  repo_url: nullableOptionalPublicSiteUrlSchema,
});

export const siteAuditSnapshotSchema = z.object({
  bid: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  sign: z.string().nullable().optional(),
  icon_base64: z.string().nullable().optional(),
  feed: z.array(multiFeedSchema).nullable().optional(),
  default_feed_url: z.string().nullable().optional(),
  from: z.array(fromSourceSchema).nullable().optional(),
  classification_status: siteClassificationStatusSchema.nullable().optional(),
  sitemap: z.string().nullable().optional(),
  link_page: z.string().nullable().optional(),
  access_scope: siteAccessScopeSchema.nullable().optional(),
  status: siteStatusTypeSchema.nullable().optional(),
  is_show: z.boolean().nullable().optional(),
  recommend: z.boolean().nullable().optional(),
  reason: z.string().nullable().optional(),
  tag_ids: z.array(z.uuid()).nullable().optional(),
  main_tag_id: z.uuid().nullable().optional(),
  sub_tag_ids: z.array(z.uuid()).nullable().optional(),
  custom_sub_tags: z.array(z.string()).nullable().optional(),
  architecture: siteAuditArchitectureSchema.nullable().optional(),
});

const siteAuditSnapshotInputSchema = addDefaultFeedValidation(
  z.object({
    bid: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    url: nullableOptionalPublicSiteUrlSchema,
    sign: z.string().nullable().optional(),
    icon_base64: z.string().nullable().optional(),
    feed: z.array(multiFeedInputSchema).nullable().optional(),
    default_feed_url: nullableOptionalPublicSiteUrlSchema,
    from: z.array(fromSourceSchema).nullable().optional(),
    classification_status: siteClassificationStatusSchema.nullable().optional(),
    sitemap: nullableOptionalPublicSiteUrlSchema,
    link_page: nullableOptionalPublicSiteUrlSchema,
    access_scope: siteAccessScopeSchema.nullable().optional(),
    status: siteStatusTypeSchema.nullable().optional(),
    is_show: z.boolean().nullable().optional(),
    recommend: z.boolean().nullable().optional(),
    reason: z.string().nullable().optional(),
    tag_ids: z.array(z.uuid()).nullable().optional(),
    main_tag_id: z.uuid().nullable().optional(),
    sub_tag_ids: z.array(z.uuid()).nullable().optional(),
    custom_sub_tags: z.array(z.string().trim().min(1).max(64)).nullable().optional(),
    architecture: siteAuditArchitectureSchema.nullable().optional(),
  }),
);

export const siteAuditDiffItemSchema = z.object({
  field: z.string(),
  before: z.unknown(),
  after: z.unknown(),
});

export const taskScheduleConfigSchema = z.object({
  cron: z.string().optional(),
  interval_seconds: z.number().int().optional(),
  timezone: z.string().optional(),
  jitter_seconds: z.number().int().optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
});

export const taskPayloadTemplateSchema = z.object({
  site_id: z.uuid().optional(),
  site_ids: z.array(z.uuid()).optional(),
  feed_url: z.string().optional(),
  target_email: z.string().optional(),
  message_channel: z.string().optional(),
  message_template: z.string().optional(),
  options: jsonRecordSchema.optional(),
});

const taskPayloadTemplateInputSchema = z.object({
  site_id: z.uuid().optional(),
  site_ids: z.array(z.uuid()).optional(),
  feed_url: optionalPublicSiteUrlSchema,
  target_email: z.string().optional(),
  message_channel: z.string().optional(),
  message_template: z.string().optional(),
  options: jsonRecordSchema.optional(),
});

export const taskTriggerRuleSchema = z.object({
  event: z.string().optional(),
  parent_task_type: taskTypeSchema.optional(),
  parent_status: jobStatusSchema.optional(),
  only_on_success: z.boolean().optional(),
  delay_seconds: z.number().int().optional(),
});

export const jobPolicyConfigSchema = z.object({
  max_attempts: z.number().int().optional(),
  timeout_seconds: z.number().int().optional(),
  retry_backoff_seconds: z.array(z.number().int()).optional(),
  concurrency_key: z.string().optional(),
  dedupe_window_seconds: z.number().int().optional(),
});

export const siteSelectSchema = createSelectSchema(Sites, {
  feed: z.array(multiFeedSchema),
  from: z.array(fromSourceSchema).nullable(),
});
const siteInsertSchemaBase = (createInsertSchema(Sites) as z.ZodObject).extend({
  url: publicSiteUrlSchema,
  feed: z.array(multiFeedInputSchema).optional(),
  default_feed_url: nullableOptionalPublicSiteUrlSchema,
  from: z.array(fromSourceSchema).optional(),
  sitemap: nullableOptionalPublicSiteUrlSchema,
  link_page: nullableOptionalPublicSiteUrlSchema,
});
export const siteInsertSchema = addDefaultFeedValidation(siteInsertSchemaBase);

const siteUpdateSchemaBase = (createUpdateSchema(Sites) as z.ZodObject).extend({
  url: publicSiteUrlSchema.optional(),
  feed: z.array(multiFeedInputSchema).optional(),
  default_feed_url: nullableOptionalPublicSiteUrlSchema,
  from: z.array(fromSourceSchema).optional(),
  sitemap: nullableOptionalPublicSiteUrlSchema,
  link_page: nullableOptionalPublicSiteUrlSchema,
});
export const siteUpdateSchema = addDefaultFeedValidation(siteUpdateSchemaBase);

export const announcementSelectSchema = createSelectSchema(Announcements);
export const announcementInsertSchema = createInsertSchema(Announcements);
export const announcementUpdateSchema = createUpdateSchema(Announcements);

export const siteTagSelectSchema = createSelectSchema(SiteTags);
export const siteTagInsertSchema = createInsertSchema(SiteTags);
export const siteTagUpdateSchema = createUpdateSchema(SiteTags);

export const siteArchitectureSelectSchema = createSelectSchema(SiteArchitectures);
export const siteArchitectureInsertSchema = createInsertSchema(SiteArchitectures);
export const siteArchitectureUpdateSchema = createUpdateSchema(SiteArchitectures);
export const programSelectSchema = createSelectSchema(Programs);
export const programInsertSchema = createInsertSchema(Programs);
export const programUpdateSchema = createUpdateSchema(Programs);
export const programTechnologyStackSelectSchema = createSelectSchema(ProgramTechnologyStacks);
export const programTechnologyStackInsertSchema = createInsertSchema(ProgramTechnologyStacks);
export const programTechnologyStackUpdateSchema = createUpdateSchema(ProgramTechnologyStacks);

export const siteAccessEventSelectSchema = createSelectSchema(SiteAccessEvents);
export const siteAccessEventInsertSchema = createInsertSchema(SiteAccessEvents);
export const siteAccessEventUpdateSchema = createUpdateSchema(SiteAccessEvents);
export const siteAccessCounterSelectSchema = createSelectSchema(SiteAccessCounters);
export const siteAccessSourceStatsSelectSchema = createSelectSchema(SiteAccessSourceStats);
export const siteAccessEventTypeStatsSelectSchema = createSelectSchema(SiteAccessEventTypeStats);

export const feedArticleSelectSchema = createSelectSchema(FeedArticles, {
  source: feedArticleSourceInfoSchema.nullable(),
});
export const feedArticleInsertSchema = createInsertSchema(FeedArticles, {
  source: feedArticleSourceInfoSchema.optional(),
});
export const feedArticleUpdateSchema = createUpdateSchema(FeedArticles, {
  source: feedArticleSourceInfoSchema.optional(),
});

export const siteAuditSelectSchema = createSelectSchema(SiteAudits, {
  current_snapshot: siteAuditSnapshotSchema.nullable(),
  proposed_snapshot: siteAuditSnapshotSchema.nullable(),
  diff: z.array(siteAuditDiffItemSchema),
});
export const siteAuditInsertSchema = createInsertSchema(SiteAudits, {
  current_snapshot: siteAuditSnapshotInputSchema.optional(),
  proposed_snapshot: siteAuditSnapshotInputSchema.optional(),
  diff: z.array(siteAuditDiffItemSchema).optional(),
});
export const siteAuditUpdateSchema = createUpdateSchema(SiteAudits, {
  current_snapshot: siteAuditSnapshotInputSchema.optional(),
  proposed_snapshot: siteAuditSnapshotInputSchema.optional(),
  diff: z.array(siteAuditDiffItemSchema).optional(),
});

export const articleFeedbackAuditSelectSchema = createSelectSchema(ArticleFeedbackAudits);
export const articleFeedbackAuditInsertSchema = createInsertSchema(ArticleFeedbackAudits);
export const articleFeedbackAuditUpdateSchema = createUpdateSchema(ArticleFeedbackAudits);

export const taskScheduleSelectSchema = createSelectSchema(TaskSchedules, {
  schedule_config: taskScheduleConfigSchema.nullable(),
  trigger_rule: taskTriggerRuleSchema.nullable(),
  payload_template: taskPayloadTemplateSchema.nullable(),
  policy: jobPolicyConfigSchema.nullable(),
});
export const taskScheduleInsertSchema = createInsertSchema(TaskSchedules, {
  schedule_config: taskScheduleConfigSchema.optional(),
  trigger_rule: taskTriggerRuleSchema.optional(),
  payload_template: taskPayloadTemplateInputSchema.optional(),
  policy: jobPolicyConfigSchema.optional(),
});
export const taskScheduleUpdateSchema = createUpdateSchema(TaskSchedules, {
  schedule_config: taskScheduleConfigSchema.optional(),
  trigger_rule: taskTriggerRuleSchema.optional(),
  payload_template: taskPayloadTemplateInputSchema.optional(),
  policy: jobPolicyConfigSchema.optional(),
});

export const jobSelectSchema = createSelectSchema(Jobs, {
  payload: jsonRecordSchema,
  result: jsonRecordSchema.nullable(),
});
export const jobInsertSchema = createInsertSchema(Jobs, {
  payload: jsonRecordSchema.optional(),
  result: jsonRecordSchema.optional(),
});
export const jobUpdateSchema = createUpdateSchema(Jobs, {
  payload: jsonRecordSchema.optional(),
  result: jsonRecordSchema.optional(),
});

export const jobExecutionSelectSchema = createSelectSchema(JobExecutions, {
  input_payload: jsonRecordSchema.nullable(),
  output_payload: jsonRecordSchema.nullable(),
  error_detail: jsonRecordSchema.nullable(),
});
export const jobExecutionInsertSchema = createInsertSchema(JobExecutions, {
  input_payload: jsonRecordSchema.optional(),
  output_payload: jsonRecordSchema.optional(),
  error_detail: jsonRecordSchema.optional(),
});
export const jobExecutionUpdateSchema = createUpdateSchema(JobExecutions, {
  input_payload: jsonRecordSchema.optional(),
  output_payload: jsonRecordSchema.optional(),
  error_detail: jsonRecordSchema.optional(),
});

export const tagDefinitionSelectSchema = createSelectSchema(TagDefinitions);
export const tagDefinitionInsertSchema = createInsertSchema(TagDefinitions);
export const tagDefinitionUpdateSchema = createUpdateSchema(TagDefinitions);

export const technologyCatalogSelectSchema = createSelectSchema(TechnologyCatalogs);
export const technologyCatalogInsertSchema = createInsertSchema(TechnologyCatalogs);
export const technologyCatalogUpdateSchema = createUpdateSchema(TechnologyCatalogs);

export const userSelectSchema = createSelectSchema(Users, {
  profile: jsonRecordSchema.nullable(),
  settings: jsonRecordSchema.nullable(),
  metadata: jsonRecordSchema.nullable(),
});
export const userInsertSchema = createInsertSchema(Users, {
  profile: jsonRecordSchema.optional(),
  settings: jsonRecordSchema.optional(),
  metadata: jsonRecordSchema.optional(),
});
export const userUpdateSchema = createUpdateSchema(Users, {
  profile: jsonRecordSchema.optional(),
  settings: jsonRecordSchema.optional(),
  metadata: jsonRecordSchema.optional(),
});

export const userOauthAccountSelectSchema = createSelectSchema(UserOauthAccounts, {
  scopes: z.array(z.string()),
  profile: jsonRecordSchema.nullable(),
});
export const userOauthAccountInsertSchema = createInsertSchema(UserOauthAccounts, {
  scopes: z.array(z.string()).optional(),
  profile: jsonRecordSchema.optional(),
});
export const userOauthAccountUpdateSchema = createUpdateSchema(UserOauthAccounts, {
  scopes: z.array(z.string()).optional(),
  profile: jsonRecordSchema.optional(),
});

export const userApiTokenSelectSchema = createSelectSchema(UserApiTokens, {
  scopes: z.array(z.string()),
});
export const userApiTokenInsertSchema = createInsertSchema(UserApiTokens, {
  scopes: z.array(z.string()).optional(),
});
export const userApiTokenUpdateSchema = createUpdateSchema(UserApiTokens, {
  scopes: z.array(z.string()).optional(),
});

export const userSiteSelectSchema = createSelectSchema(UserSites);
export const userSiteInsertSchema = createInsertSchema(UserSites);
export const userSiteUpdateSchema = createUpdateSchema(UserSites);

export const siteClaimSelectSchema = createSelectSchema(SiteClaims);
export const siteClaimInsertSchema = createInsertSchema(SiteClaims);
export const siteClaimUpdateSchema = createUpdateSchema(SiteClaims);

export const siteWarningTagSelectSchema = createSelectSchema(SiteWarningTags);
export const siteWarningTagInsertSchema = createInsertSchema(SiteWarningTags);
export const siteWarningTagUpdateSchema = createUpdateSchema(SiteWarningTags);

export const siteCheckSelectSchema = createSelectSchema(SiteChecks);
export const siteCheckInsertSchema = createInsertSchema(SiteChecks);
export const siteCheckUpdateSchema = createUpdateSchema(SiteChecks);

export const deploymentSelectSchema = createSelectSchema(Deployments, {
  modules: z.array(deploymentModuleSchema),
  metadata: jsonRecordSchema.nullable(),
  raw_payload: jsonRecordSchema.nullable(),
});
export const deploymentInsertSchema = createInsertSchema(Deployments, {
  modules: z.array(deploymentModuleSchema),
  metadata: jsonRecordSchema.optional(),
  raw_payload: jsonRecordSchema.optional(),
});
export const deploymentUpdateSchema = createUpdateSchema(Deployments, {
  modules: z.array(deploymentModuleSchema).optional(),
  metadata: jsonRecordSchema.optional(),
  raw_payload: jsonRecordSchema.optional(),
});

export const tagStatsSelectSchema = createSelectSchema(TagStats);
export const technologyStatsSelectSchema = createSelectSchema(TechnologyStats);
export const siteCheckStatsSelectSchema = createSelectSchema(SiteCheckStats);
export const latestSiteChecksSelectSchema = createSelectSchema(LatestSiteChecks);
export const siteFeedArticleStatsSelectSchema = createSelectSchema(SiteFeedArticleStats);
export const siteWarningTagStatsSelectSchema = createSelectSchema(SiteWarningTagStats);

export type FromSource = z.infer<typeof fromSourceSchema>;
export type AnnouncementStatus = z.infer<typeof announcementStatusSchema>;
export type FeedType = z.infer<typeof feedTypeSchema>;
export type SiteAccessEventType = z.infer<typeof siteAccessEventTypeSchema>;
export type SiteAccessScope = z.infer<typeof siteAccessScopeSchema>;
export type SiteClassificationStatus = z.infer<typeof siteClassificationStatusSchema>;
export type SiteClaimStatus = z.infer<typeof siteClaimStatusSchema>;
export type SiteClaimType = z.infer<typeof siteClaimTypeSchema>;
export type ArticleVisibility = z.infer<typeof articleVisibilitySchema>;
export type SiteAuditAction = z.infer<typeof siteAuditActionSchema>;
export type AuditStatus = z.infer<typeof auditStatusSchema>;
export type ArticleFeedbackAction = z.infer<typeof articleFeedbackActionSchema>;
export type ArticleFeedbackReason = z.infer<typeof articleFeedbackReasonSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type ScheduleMode = z.infer<typeof scheduleModeSchema>;
export type JobTriggerSource = z.infer<typeof jobTriggerSourceSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;
export type TagType = z.infer<typeof tagTypeSchema>;
export type TechnologyType = z.infer<typeof technologyTypeSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type UserOauthProvider = z.infer<typeof userOauthProviderSchema>;
export type SiteCheckRegion = z.infer<typeof siteCheckRegionSchema>;
export type SiteCheckResult = z.infer<typeof siteCheckResultSchema>;
export type SiteStatusType = z.infer<typeof siteStatusTypeSchema>;
export type SiteStatusTag = z.infer<typeof siteStatusTagSchema>;
export type SiteWarningTagSource = z.infer<typeof siteWarningTagSourceSchema>;
export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;
export type DeploymentModule = z.infer<typeof deploymentModuleSchema>;
export type MultiFeedData = z.infer<typeof multiFeedSchema>;
export type FeedArticleSourceInfoData = z.infer<typeof feedArticleSourceInfoSchema>;
export type SiteAuditArchitectureData = z.infer<typeof siteAuditArchitectureSchema>;
export type SiteAuditSnapshotData = z.infer<typeof siteAuditSnapshotSchema>;
export type SiteAuditDiffItemData = z.infer<typeof siteAuditDiffItemSchema>;
export type TaskScheduleConfigData = z.infer<typeof taskScheduleConfigSchema>;
export type TaskPayloadTemplateData = z.infer<typeof taskPayloadTemplateSchema>;
export type TaskTriggerRuleData = z.infer<typeof taskTriggerRuleSchema>;
export type JobPolicyConfigData = z.infer<typeof jobPolicyConfigSchema>;
