import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { v7 } from 'uuid'
import type { FeedTypeKey } from '../constants/site'
import { articleVisibilityEnum, feedTypeEnum } from './enums'
import { Sites } from './sites'

/** 抓取来源信息，用于记录文章来自哪个 Feed */
export interface FeedArticleSourceInfo {
  feed_name?: string
  feed_url?: string
  feed_type?: FeedTypeKey
}

/** RSS 抓取后的文章落库表 */
export const FeedArticles = pgTable(
  'feed_articles',
  {
    /** 文章记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 所属站点 */
    site_id: uuid()
      .notNull()
      .references(() => Sites.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** Feed 原始唯一标识，可能为空 */
    guid: varchar({ length: 512 }),
    /** 文章访问地址 */
    article_url: varchar({ length: 512 }).notNull(),
    /** 文章标题 */
    title: varchar({ length: 512 }).notNull(),
    /** 列表摘要 */
    summary: text(),
    /** 抓取来源的订阅类型 */
    feed_type: feedTypeEnum(),
    /** 抓取来源信息，记录文章来自哪个订阅源 */
    source: jsonb().$type<FeedArticleSourceInfo>().notNull().default({}),
    /** 文章发布时间，以源站为准 */
    published_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 本次抓取入库时间 */
    fetched_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
    /** 前台文章可见性，可被反馈审核流修改 */
    visibility: articleVisibilityEnum().notNull().default('VISIBLE'),
    /** 隐藏或删除原因 */
    visibility_reason: text(),
  },
  (table) => [
    uniqueIndex('feed_articles_site_id_guid_index')
      .on(table.site_id, table.guid)
      .where(sql`${table.guid} is not null and ${table.guid} <> ''`),
    uniqueIndex('feed_articles_site_id_url_index').on(
      table.site_id,
      table.article_url,
    ),
    check(
      'feed_articles_visibility_reason_check',
      sql`(${table.visibility} = 'VISIBLE' and ${table.visibility_reason} is null) or (${table.visibility} <> 'VISIBLE')`,
    ),
    index('feed_articles_site_id_published_time_index').on(
      table.site_id,
      table.published_time.desc(),
    ),
    index('feed_articles_site_id_visibility_published_time_index').on(
      table.site_id,
      table.visibility,
      table.published_time.desc(),
    ),
    index('feed_articles_feed_type_index').on(table.feed_type),
    index('feed_articles_visibility_published_time_index').on(
      table.visibility,
      table.published_time.desc(),
    ),
    index('feed_articles_fetched_time_index').on(table.fetched_time.desc()),
  ],
)
