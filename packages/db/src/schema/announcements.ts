import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { v7 } from 'uuid'
import { Users } from './users'
import { announcementStatusEnum } from './enums'

/** 公告表，支持草稿、预发布、即时发布和过期生命周期。 */
export const Announcements = pgTable(
  'announcements',
  {
    /** 公告主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 公告标题 */
    title: varchar({ length: 256 }).notNull(),
    /** 公告摘要，用于首页与公告列表 */
    summary: text().notNull(),
    /** 公告正文，供后台与完整公告页使用 */
    content: text(),
    /** 公告标签，例如维护通知、项目公告 */
    tag: varchar({ length: 64 }).notNull(),
    /** 公告生命周期状态 */
    status: announcementStatusEnum().notNull().default('DRAFT'),
    /** 发布时间，草稿允许为空，预发布和已发布需要设置 */
    publish_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 定时过期时间 */
    expire_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 实际过期时间，即时过期和定时过期都会写入 */
    expired_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 排序权重，值越大越靠前 */
    sort_order: integer().notNull().default(0),
    /** 创建人 */
    created_by: uuid().references(() => Users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 最后更新人 */
    updated_by: uuid().references(() => Users.id, {
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
    index('announcements_status_publish_time_index').on(
      table.status,
      table.publish_time.desc(),
    ),
    index('announcements_expire_time_index').on(table.expire_time),
    index('announcements_sort_order_publish_time_index').on(
      table.sort_order.desc(),
      table.publish_time.desc(),
    ),
    index('announcements_created_time_index').on(table.created_time.desc()),
  ],
)
