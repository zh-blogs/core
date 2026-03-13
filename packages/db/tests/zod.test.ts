import { describe, expect, it } from 'vitest'
import {
  siteAuditInsertSchema,
  siteInsertSchema,
  siteUpdateSchema,
  taskScheduleInsertSchema,
} from '../src/zod/index.ts'

const expectSuccess = (result: { success: boolean; error?: { issues: unknown } }) => {
  if (!result.success) {
    throw new Error(JSON.stringify(result.error?.issues))
  }
}

const expectFailurePath = (
  result: {
    success: boolean
    error?: { issues: Array<{ path: Array<string | number> }> }
  },
  expectedPath: string,
) => {
  expect(result.success).toBe(false)
  expect(
    result.error?.issues.some((issue) => issue.path.join('.') === expectedPath),
  ).toBe(true)
}

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
        },
      ],
      sitemap: 'https://example.com/sitemap.xml',
      link_page: 'https://links.example.com/friends',
    })

    expectSuccess(result)
  })

  it('rejects non-absolute site urls', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'missing-scheme',
      name: 'Missing Scheme',
      url: 'example.com',
    })

    expectFailurePath(result, 'url')
  })

  it('rejects invalid hostname labels', () => {
    const result = siteInsertSchema.safeParse({
      bid: 'bad-hostname',
      name: 'Bad Hostname',
      url: 'https://foo_bar.com',
    })

    expectFailurePath(result, 'url')
  })

  it('still allows clearing nullable site urls on updates', () => {
    const result = siteUpdateSchema.safeParse({
      sitemap: null,
      link_page: null,
    })

    expectSuccess(result)
  })

  it('validates nested site snapshot urls', () => {
    const result = siteAuditInsertSchema.safeParse({
      action: 'CREATE',
      proposed_snapshot: {
        url: 'https://example.com',
        link_page: 'https://localhost/friends',
      },
    })

    expectFailurePath(result, 'proposed_snapshot.link_page')
  })

  it('validates payload_template.feed_url', () => {
    const result = taskScheduleInsertSchema.safeParse({
      name: 'Manual Feed Fetch',
      task_type: 'RSS_FETCH',
      queue_name: 'rss',
      schedule_mode: 'MANUAL',
      payload_template: {
        feed_url: 'https://localhost/feed.xml',
      },
    })

    expectFailurePath(result, 'payload_template.feed_url')
  })
})
