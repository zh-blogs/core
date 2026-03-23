import { sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  pgView,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/** 标签使用统计视图 */
export const TagStats = pgView('tag_stats', {
  /** 标签 ID */
  tag_id: uuid('tag_id'),
  /** 标签名称 */
  tag_name: varchar('tag_name', { length: 64 }),
  /** 标签类型 */
  tag_type: varchar('tag_type', { length: 32 }),
  /** 关联站点数量 */
  site_count: integer('site_count'),
}).as(sql`
  select
    td.id as tag_id,
    td.name as tag_name,
    td.tag_type as tag_type,
    count(st.site_id)::int as site_count
  from tag_definitions td
  left join site_tags st on st.tag_id = td.id
  group by td.id, td.name, td.tag_type
`)

/** 技术架构使用统计视图 */
export const TechnologyStats = pgView('technology_stats', {
  /** 技术项 ID */
  technology_id: uuid('technology_id'),
  /** 技术名称 */
  technology_name: varchar('technology_name', { length: 128 }),
  /** 技术类型 */
  technology_type: varchar('technology_type', { length: 32 }),
  /** 被站点引用次数 */
  site_count: integer('site_count'),
}).as(sql`
  with technology_refs as (
    select distinct
      sa.site_id,
      pts.catalog_id as technology_id
    from site_architectures sa
    inner join program_technology_stacks pts on pts.program_id = sa.program_id
    where pts.catalog_id is not null
  )
  select
    tc.id as technology_id,
    tc.name as technology_name,
    tc.technology_type as technology_type,
    count(tr.site_id)::int as site_count
  from technology_catalogs tc
  left join technology_refs tr on tr.technology_id = tc.id
  group by tc.id, tc.name, tc.technology_type
`)

/** 站点检测统计视图 */
export const SiteCheckStats = pgView('site_check_stats', {
  /** 站点 ID */
  site_id: uuid('site_id'),
  /** 检测总次数 */
  total_checks: integer('total_checks'),
  /** 成功检测次数 */
  success_checks: integer('success_checks'),
  /** 失败检测次数 */
  failed_checks: integer('failed_checks'),
  /** 平均响应时间 */
  avg_response_time_ms: integer('avg_response_time_ms'),
}).as(sql`
  select
    sc.site_id as site_id,
    count(*)::int as total_checks,
    count(*) filter (where sc.result = 'SUCCESS')::int as success_checks,
    count(*) filter (where sc.result <> 'SUCCESS')::int as failed_checks,
    avg(sc.response_time_ms)::int as avg_response_time_ms
  from site_checks sc
  group by sc.site_id
`)

/** 站点最新一次检测结果视图 */
export const LatestSiteChecks = pgView('latest_site_checks', {
  /** 站点 ID */
  site_id: uuid('site_id'),
  /** 最近一次检测记录 ID */
  check_id: uuid('check_id'),
  /** 最近一次检测地域 */
  region: varchar('region', { length: 32 }),
  /** 最近一次检测结果 */
  result: varchar('result', { length: 32 }),
  /** 最近一次 HTTP 状态码 */
  status_code: integer('status_code'),
  /** 最近一次响应耗时 */
  response_time_ms: integer('response_time_ms'),
  /** 最近一次总耗时 */
  duration_ms: integer('duration_ms'),
  /** 最终跳转地址 */
  final_url: varchar('final_url', { length: 256 }),
  /** 内容是否通过校验 */
  content_verified: boolean('content_verified'),
  /** 最近一次检测时间 */
  check_time: timestamp('check_time', { withTimezone: true, precision: 6 }),
}).as(sql`
  select distinct on (sc.site_id)
    sc.site_id as site_id,
    sc.id as check_id,
    sc.region as region,
    sc.result as result,
    sc.status_code as status_code,
    sc.response_time_ms as response_time_ms,
    sc.duration_ms as duration_ms,
    sc.final_url as final_url,
    sc.content_verified as content_verified,
    sc.check_time as check_time
  from site_checks sc
  order by sc.site_id, sc.check_time desc, sc.id desc
`)

/** 站点文章聚合统计视图 */
export const SiteFeedArticleStats = pgView('site_feed_article_stats', {
  /** 站点 ID */
  site_id: uuid('site_id'),
  /** 抓取文章总数 */
  total_articles: integer('total_articles'),
  /** 当前可见文章数 */
  visible_articles: integer('visible_articles'),
  /** 最近一次抓取时间 */
  latest_fetched_time: timestamp('latest_fetched_time', {
    withTimezone: true,
    precision: 6,
  }),
  /** 最近一篇文章发布时间 */
  latest_published_time: timestamp('latest_published_time', {
    withTimezone: true,
    precision: 6,
  }),
}).as(sql`
  select
    fa.site_id as site_id,
    count(*)::int as total_articles,
    count(*) filter (where fa.visibility = 'VISIBLE')::int as visible_articles,
    max(fa.fetched_time) as latest_fetched_time,
    max(fa.published_time) as latest_published_time
  from feed_articles fa
  group by fa.site_id
`)

/** 站点访问计数聚合视图 */
export const SiteAccessCounters = pgView('site_access_counters', {
  /** 站点 ID */
  site_id: uuid('site_id'),
  /** 访问总次数 */
  total: integer('total'),
  /** 最近一次访问时间 */
  updated_time: timestamp('updated_time', {
    withTimezone: true,
    precision: 6,
  }),
}).as(sql`
  select
    s.id as site_id,
    count(sae.id)::int as total,
    max(sae.occurred_time) as updated_time
  from sites s
  left join site_access_events sae on sae.site_id = s.id
  group by s.id
`)

/** 站点访问来源聚合视图 */
export const SiteAccessSourceStats = pgView('site_access_source_stats', {
  /** 站点 ID */
  site_id: uuid('site_id'),
  /** 访问事件类型 */
  event_type: varchar('event_type', { length: 64 }),
  /** 访问来源 */
  source: varchar('source', { length: 64 }),
  /** 该来源访问次数 */
  total: integer('total'),
  /** 最近一次访问时间 */
  latest_access_time: timestamp('latest_access_time', {
    withTimezone: true,
    precision: 6,
  }),
}).as(sql`
  select
    sae.site_id as site_id,
    sae.event_type as event_type,
    sae.source as source,
    count(*)::int as total,
    max(sae.occurred_time) as latest_access_time
  from site_access_events sae
  group by sae.site_id, sae.event_type, sae.source
`)

/** 站点按访问事件类型聚合统计视图 */
export const SiteAccessEventTypeStats = pgView('site_access_event_type_stats', {
  /** 站点 ID */
  site_id: uuid('site_id'),
  /** 访问事件类型 */
  event_type: varchar('event_type', { length: 64 }),
  /** 该事件类型访问次数 */
  total: integer('total'),
  /** 最近一次访问时间 */
  latest_access_time: timestamp('latest_access_time', {
    withTimezone: true,
    precision: 6,
  }),
}).as(sql`
  select
    sae.site_id as site_id,
    sae.event_type as event_type,
    count(*)::int as total,
    max(sae.occurred_time) as latest_access_time
  from site_access_events sae
  group by sae.site_id, sae.event_type
`)

/** 站点警示标签统计视图 */
export const SiteWarningTagStats = pgView('site_warning_tag_stats', {
  /** 警示标签类型 */
  tag: varchar('tag', { length: 64 }),
  /** 带有该标签的站点数量 */
  site_count: integer('site_count'),
}).as(sql`
  select
    swt.tag as tag,
    count(distinct swt.site_id)::int as site_count
  from site_warning_tags swt
  group by swt.tag
`)
