import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { v7 } from 'uuid';

import { ArticleFeedbackAudits, SiteAudits } from './audits';
import { siteStatusTagEnum, siteWarningTagSourceEnum } from './enums';
import { Sites } from './sites';
import { Users } from './users';

/** 站点警示标签表，用于承接文章反馈、站点反馈与人工巡查产生的警示标记 */
export const SiteWarningTags = pgTable(
  'site_warning_tags',
  {
    /** 警示标签记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 被打标的站点 */
    site_id: uuid()
      .notNull()
      .references(() => Sites.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 警示标签类型 */
    tag: siteStatusTagEnum().notNull(),
    /** 标签来源 */
    source: siteWarningTagSourceEnum().notNull(),
    /** 来源站点审核记录，仅在 source=SITE_FEEDBACK 时写入 */
    source_site_audit_id: uuid().references(() => SiteAudits.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 来源文章反馈审核记录，仅在 source=ARTICLE_FEEDBACK 时写入 */
    source_article_feedback_audit_id: uuid().references(() => ArticleFeedbackAudits.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 人工巡查或补充说明 */
    note: text(),
    /** 创建该标签的管理员，自动流程可为空 */
    created_by: uuid().references(() => Users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    /** 更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('site_warning_tags_site_id_index').on(table.site_id),
    index('site_warning_tags_site_id_tag_index').on(table.site_id, table.tag),
    index('site_warning_tags_site_id_source_index').on(table.site_id, table.source),
    index('site_warning_tags_source_site_audit_id_index').on(table.source_site_audit_id),
    index('site_warning_tags_source_article_feedback_audit_id_index').on(
      table.source_article_feedback_audit_id,
    ),
    index('site_warning_tags_tag_index').on(table.tag),
    index('site_warning_tags_source_index').on(table.source),
    index('site_warning_tags_created_by_index').on(table.created_by),
    index('site_warning_tags_created_time_index').on(table.created_time.desc()),
  ],
);
