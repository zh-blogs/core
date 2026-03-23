import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { v7 } from 'uuid'
import { siteCheckRegionEnum, siteCheckResultEnum } from './enums'
import { Sites } from './sites'

/** 站点检测历史表，用于记录可用性、地域访问状态和性能表现 */
export const SiteChecks = pgTable(
  'site_checks',
  {
    /** 检测记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 关联站点 */
    site_id: uuid()
      .notNull()
      .references(() => Sites.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 检测地域 */
    region: siteCheckRegionEnum().notNull().default('UNKNOWN'),
    /** 检测结果 */
    result: siteCheckResultEnum().notNull(),
    /** HTTP 状态码 */
    status_code: integer(),
    /** 响应耗时 */
    response_time_ms: integer(),
    /** 总耗时 */
    duration_ms: integer(),
    /** 检测结果说明 */
    message: text(),
    /** 执行检测的 Worker 标识 */
    checker_id: varchar({ length: 128 }),
    /** 最终访问地址，用于记录 301/302 等跳转后的目标地址 */
    final_url: varchar({ length: 256 }),
    /** 响应内容是否通过内容有效性校验 */
    content_verified: boolean().notNull().default(false),
    /** 检测时间 */
    check_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('site_checks_site_id_check_time_index').on(
      table.site_id,
      table.check_time.desc(),
    ),
    index('site_checks_site_id_region_check_time_index').on(
      table.site_id,
      table.region,
      table.check_time.desc(),
    ),
    index('site_checks_result_check_time_index').on(
      table.result,
      table.check_time.desc(),
    ),
    index('site_checks_site_id_result_check_time_index').on(
      table.site_id,
      table.result,
      table.check_time.desc(),
    ),
    check('site_checks_status_code_valid_range_check', sql`${table.status_code} is null or (${table.status_code} >= 100 and ${table.status_code} <= 599)`),
    check('site_checks_response_time_non_negative_check', sql`${table.response_time_ms} is null or ${table.response_time_ms} >= 0`),
    check('site_checks_duration_non_negative_check', sql`${table.duration_ms} is null or ${table.duration_ms} >= 0`),
  ],
)
