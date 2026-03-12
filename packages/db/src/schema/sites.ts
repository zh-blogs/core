import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { v7 } from 'uuid'
import type { FeedTypeKey } from '../constants/site'
import { fromSources, siteAccessScopeEnum, siteStatusTypeEnum } from './enums'
import { TagDefinitions, TechnologyCatalogs } from './catalogs'

export interface MultiFeed {
  name: string
  url: string
  type?: FeedTypeKey
}

export const Sites = pgTable(
  'sites',
  {
    /** 站点主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 面向外部展示与管理的站点唯一业务标识 */
    bid: varchar({ length: 64 }).unique().notNull(),
    /** 站点名称 */
    name: varchar({ length: 64 }).unique().notNull(),
    /** 站点主页地址 */
    url: varchar({ length: 256 }).unique().notNull(),
    /** 站点签名或简短描述 */
    sign: text().default(''),
    /** 站点图标的 base64 编码字符串 */
    icon_base64: text(),
    /** 站点订阅源列表 */
    feed: jsonb().$type<MultiFeed[]>().default([]),
    /** 站点来源渠道 */
    from: fromSources().array(),
    /** 站点地图地址 */
    sitemap: varchar({ length: 256 }),
    /** 友链页地址 */
    link_page: varchar({ length: 256 }),
    /** 站点加入时间 */
    join_time: timestamp({ withTimezone: true, precision: 6 }).$default(
      () => new Date(),
    ),
    /** 站点最后更新时间 */
    update_time: timestamp({ withTimezone: true, precision: 6 }).$default(
      () => new Date(),
    ),
    /** 站点访问属性：仅国内、仅海外、国内外都可访问 */
    access_scope: siteAccessScopeEnum().notNull().default('BOTH'),
    /** 站点当前简易显示状态，取最近一次检测归并结果 */
    status: siteStatusTypeEnum().notNull().default('OK'),
    /** 是否在前台显示 */
    is_show: boolean().notNull().default(true),
    /** 是否推荐 */
    recommend: boolean().default(false),
    /** 不显示或异常时的补充原因 */
    reason: text(),
  },
  (table) => [
    index('sites_from_gin_index').using('gin', table.from),
    index('sites_access_scope_index').on(table.access_scope),
    index('sites_status_index').on(table.status),
    index('sites_is_show_index').on(table.is_show),
    index('sites_recommend_index').on(table.recommend),
    index('sites_join_time_index').on(table.join_time.desc()),
    index('sites_update_time_index').on(table.update_time.desc()),
  ],
)

/** 站点标签关联表，通过标签定义表表达主标签和副标签 */
export const SiteTags = pgTable(
  'site_tags',
  {
    /** 关联站点 */
    site_id: uuid()
      .notNull()
      .references(() => Sites.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 关联标签 */
    tag_id: uuid()
      .notNull()
      .references(() => TagDefinitions.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 关联创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'site_tags_pkey',
      columns: [table.site_id, table.tag_id],
    }),
    index('site_tags_site_id_index').on(table.site_id),
    index('site_tags_tag_id_index').on(table.tag_id),
  ],
)

/** 站点技术架构关联表，通过目录表表达系统、框架、语言 */
export const SiteArchitectures = pgTable(
  'site_architectures',
  {
    /** 站点 ID，与站点表一对一 */
    site_id: uuid()
      .primaryKey()
      .references(() => Sites.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 博客系统 */
    system_id: uuid().references(() => TechnologyCatalogs.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 技术框架 */
    framework_id: uuid().references(() => TechnologyCatalogs.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 编程语言 */
    language_id: uuid().references(() => TechnologyCatalogs.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
    /** 更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('site_architectures_system_id_index').on(table.system_id),
    index('site_architectures_framework_id_index').on(table.framework_id),
    index('site_architectures_language_id_index').on(table.language_id),
  ],
)

export const SiteAccessCounters = pgTable(
  'site_access_counters',
  {
    site_id: uuid().primaryKey().references(() => Sites.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    total: integer().notNull().default(0),
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('site_access_counters_total_index').on(table.total.desc())],
)
