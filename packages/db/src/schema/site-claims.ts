import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { v7 } from 'uuid';

import { siteClaimStatusEnum, siteClaimTypeEnum } from './enums';
import { Sites } from './sites';
import { Users } from './users';

/** 站点认领申请表，用于记录认领流程本身，认领成功后再写入用户与站点关联表 */
export const SiteClaims = pgTable(
  'site_claims',
  {
    /** 认领记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 被认领的站点 */
    site_id: uuid()
      .notNull()
      .references(() => Sites.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 发起认领的用户 */
    user_id: uuid()
      .notNull()
      .references(() => Users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 认领方式 */
    claim_type: siteClaimTypeEnum().notNull().default('OWNER'),
    /** 认领状态：区分验证阶段和人工审核阶段 */
    status: siteClaimStatusEnum().notNull().default('PENDING_VERIFICATION'),
    /** 验证令牌，可用于邮件、页面标记或其他所有权验证流程 */
    verification_token: varchar({ length: 128 }),
    /** 验证令牌过期时间，过期后必须重新发起或重新签发验证 */
    verification_expires_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 用户提交的认领说明或所有权证明 */
    verification_note: text(),
    /** 审核备注 */
    review_note: text(),
    /** 执行审核的管理员用户 */
    reviewed_by: uuid().references(() => Users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 提交时间 */
    submitted_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    /** 审核完成时间 */
    reviewed_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 记录更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('site_claims_site_id_status_index').on(table.site_id, table.status),
    index('site_claims_user_id_status_index').on(table.user_id, table.status),
    index('site_claims_claim_type_index').on(table.claim_type),
    index('site_claims_verification_token_index').on(table.verification_token),
    index('site_claims_status_submitted_time_index').on(table.status, table.submitted_time.desc()),
    index('site_claims_submitted_time_index').on(table.submitted_time.desc()),
  ],
);
