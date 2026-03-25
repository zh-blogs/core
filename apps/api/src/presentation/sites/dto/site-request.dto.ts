import { feedTypeSchema, siteAuditArchitectureSchema, siteAuditInsertSchema } from '@zhblogs/db';

import { z } from 'zod';

const customSubTagSchema = z.string().trim().min(1).max(64);

const siteSnapshotExtrasSchema = z.object({
  tag_ids: z.array(z.uuid()).nullable().optional(),
  main_tag_id: z.uuid().nullable().optional(),
  sub_tag_ids: z.array(z.uuid()).nullable().optional(),
  custom_sub_tags: z.array(customSubTagSchema).nullable().optional(),
  architecture: siteAuditArchitectureSchema.nullable().optional(),
});

export const siteIdParamSchema = siteAuditInsertSchema
  .pick({ site_id: true })
  .required({ site_id: true });

export const siteSearchSchema = z.object({
  query: z.string().trim().min(1).max(128),
});

export const siteAutoFillSchema = z.object({
  url: z.string().trim().url(),
});

export const auditListQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELED']).optional(),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE']).optional(),
});

export const auditReviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reviewer_comment: z.string().trim().max(2000).nullable().optional(),
});

export const submissionContactSchema = siteAuditInsertSchema
  .pick({
    submitter_name: true,
    submitter_email: true,
    submit_reason: true,
    notify_by_email: true,
  })
  .required({
    submitter_name: true,
    submitter_email: true,
    submit_reason: true,
    notify_by_email: true,
  });

export const submissionQuerySchema = z.object({
  audit_id: siteIdParamSchema.shape.site_id,
});

const publicSiteUrlSchema = z.string().trim().url();
const publicFeedInputSchema = z.object({
  name: z.string().trim(),
  url: publicSiteUrlSchema,
  type: feedTypeSchema.optional(),
});

export const createSiteSubmissionSchema = submissionContactSchema.extend({
  site: z.object({
    name: z.string().trim().min(1),
    url: publicSiteUrlSchema,
    sign: z.string().trim().min(1),
    icon_base64: z.string().nullable().optional(),
    feed: z.array(publicFeedInputSchema).optional(),
    default_feed_url: publicSiteUrlSchema.nullable().optional(),
    sitemap: publicSiteUrlSchema.nullable().optional(),
    link_page: publicSiteUrlSchema.nullable().optional(),
    main_tag_id: siteSnapshotExtrasSchema.shape.main_tag_id,
    sub_tag_ids: siteSnapshotExtrasSchema.shape.sub_tag_ids,
    custom_sub_tags: z.array(customSubTagSchema).optional(),
    architecture: siteSnapshotExtrasSchema.shape.architecture,
  }),
});

export const updateSiteSubmissionSchema = submissionContactSchema
  .extend({
    changes: z.object({
      name: z.string().trim().min(1).optional(),
      url: publicSiteUrlSchema.optional(),
      sign: z.string().trim().min(1).nullable().optional(),
      icon_base64: z.string().nullable().optional(),
      feed: z.array(publicFeedInputSchema).optional(),
      default_feed_url: publicSiteUrlSchema.nullable().optional(),
      sitemap: publicSiteUrlSchema.nullable().optional(),
      link_page: publicSiteUrlSchema.nullable().optional(),
      main_tag_id: siteSnapshotExtrasSchema.shape.main_tag_id.optional(),
      sub_tag_ids: siteSnapshotExtrasSchema.shape.sub_tag_ids.optional(),
      custom_sub_tags: z.array(customSubTagSchema).optional(),
      architecture: siteSnapshotExtrasSchema.shape.architecture.optional(),
    }),
  })
  .refine((payload) => Object.values(payload.changes).some((value) => value !== undefined), {
    message: 'At least one editable field must be provided',
    path: ['changes'],
  });

export const siteLookupSchema = z
  .object({
    bid: z.string().trim().max(64).nullable().optional(),
    url: publicSiteUrlSchema.optional(),
    site_id: siteIdParamSchema.shape.site_id.optional(),
  })
  .refine(
    (payload) =>
      [payload.site_id, payload.bid, payload.url].filter(
        (value) => value !== undefined && value !== null && String(value).trim().length > 0,
      ).length === 1,
    {
      message: 'Exactly one site lookup field must be provided',
      path: ['site_lookup'],
    },
  );

export type SiteLookupInput = {
  site_id?: string;
  bid?: string | null;
  url?: string;
};

export type SiteSearchInput = z.infer<typeof siteSearchSchema>;
export type SiteAutoFillInput = z.infer<typeof siteAutoFillSchema>;
export type AuditListQueryInput = z.infer<typeof auditListQuerySchema>;
export type AuditReviewInput = z.infer<typeof auditReviewSchema>;
