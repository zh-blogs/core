import { describe, expect, it } from 'vitest';

import {
  siteAuditInsertSchema,
  siteClaimStatusSchema,
  siteFeedbackAuditInsertSchema,
  siteFeedbackReasonSchema,
  siteInsertSchema,
  siteUpdateSchema,
  tagDefinitionInsertSchema,
  taskScheduleInsertSchema,
} from '../src/zod/index.ts';

const expectSuccess = (result: { success: boolean; error?: { issues: unknown } }) => {
  if (!result.success) {
    throw new Error(JSON.stringify(result.error?.issues));
  }
};

const expectFailurePath = (
  result: {
    success: boolean;
    error?: { issues: Array<{ path: PropertyKey[] }> };
  },
  expectedPath: string,
) => {
  expect(result.success).toBe(false);
  expect(result.error?.issues.some((issue) => issue.path.join('.') === expectedPath)).toBe(true);
};

describe('db zod site url validation', () => {
  it('accepts valid public site urls in site inserts', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'example-blog',
      name: 'Example Blog',
      url: 'https://example.com',
      feed: [
        {
          name: 'Primary Feed',
          url: 'https://blog.example.co.uk/feed.xml',
          type: 'RSS',
          isDefault: true,
        },
      ],
      sitemap: 'https://example.com/sitemap.xml',
      link_page: 'https://links.example.com/friends',
    });

    expectSuccess(result);
  });

  it('rejects non-absolute site urls', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'missing-scheme',
      name: 'Missing Scheme',
      url: 'example.com',
    });

    expectFailurePath(result, 'url');
  });

  it('rejects invalid hostname labels', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'bad-hostname',
      name: 'Bad Hostname',
      url: 'https://foo_bar.com',
    });

    expectFailurePath(result, 'url');
  });

  it('still allows clearing nullable site urls on updates', () => {
    const result = siteUpdateSchema.safeParse({
      sitemap: null,
      link_page: null,
    });

    expectSuccess(result);
  });

  it('validates nested site snapshot urls', () => {
    const result = siteAuditInsertSchema.safeParse({
      action: 'CREATE',
      proposed_snapshot: {
        url: 'https://example.com',
        feed: [
          {
            name: 'Primary Feed',
            url: 'https://example.com/feed.xml',
            type: 'RSS',
            isDefault: true,
          },
        ],
        link_page: 'https://localhost/friends',
      },
    });

    expectFailurePath(result, 'proposed_snapshot.link_page');
  });

  it('validates payload_template.feed_url', () => {
    const result = taskScheduleInsertSchema.safeParse({
      name: 'Manual Feed Fetch',
      task_type: 'RSS_FETCH',
      queue_name: 'rss',
      schedule_mode: 'MANUAL',
      payload_template: {
        feed_url: 'https://localhost/feed.xml',
      },
    });

    expectFailurePath(result, 'payload_template.feed_url');
  });

  it('accepts empty feed arrays', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'example-blog',
      name: 'Example Blog',
      url: 'https://example.com',
      feed: [],
    });

    expectSuccess(result);
  });

  it('rejects feed without a default item', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'example-blog',
      name: 'Example Blog',
      url: 'https://example.com',
      feed: [
        {
          name: 'Primary Feed',
          url: 'https://example.com/feed.xml',
          type: 'RSS',
          isDefault: false,
        },
      ],
    });

    expectFailurePath(result, 'feed');
  });

  it('rejects feed with multiple default items', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'example-blog',
      name: 'Example Blog',
      url: 'https://example.com',
      feed: [
        {
          name: 'Primary Feed',
          url: 'https://example.com/feed.xml',
          type: 'RSS',
          isDefault: true,
        },
        {
          name: 'Atom Feed',
          url: 'https://example.com/atom.xml',
          type: 'ATOM',
          isDefault: true,
        },
      ],
    });

    expectFailurePath(result, 'feed');
  });

  it('accepts new claim statuses and rejects legacy status', () => {
    expect(siteClaimStatusSchema.safeParse('PENDING_VERIFICATION').success).toBe(true);
    expect(siteClaimStatusSchema.safeParse('PENDING_REVIEW').success).toBe(true);
    expect(siteClaimStatusSchema.safeParse('PENDING').success).toBe(false);
  });

  it('requires machine_key for warning tag definitions', () => {
    expect(
      tagDefinitionInsertSchema.safeParse({
        name: '外部限制',
        tag_type: 'WARNING',
        is_enabled: true,
      }).success,
    ).toBe(false);

    expect(
      tagDefinitionInsertSchema.safeParse({
        name: '外部限制',
        tag_type: 'WARNING',
        machine_key: 'EXTERNAL_LIMIT',
        is_enabled: true,
      }).success,
    ).toBe(true);
  });

  it('accepts site feedback reasons and validates site feedback payloads', () => {
    expect(siteFeedbackReasonSchema.safeParse('SITE_INFO_ERROR').success).toBe(true);
    expect(siteFeedbackReasonSchema.safeParse('NOT_EXISTS').success).toBe(false);

    expect(
      siteFeedbackAuditInsertSchema.safeParse({
        site_id: crypto.randomUUID(),
        reason_type: 'ACCESS_ISSUE',
        feedback_content: '站点已经连续多日无法访问。',
        reporter_name: 'Alice',
        reporter_email: 'alice@example.com',
        notify_by_email: true,
      }).success,
    ).toBe(true);
  });
});
