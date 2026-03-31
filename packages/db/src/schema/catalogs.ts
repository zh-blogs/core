import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { v7 } from 'uuid';

import { tagTypeEnum, technologyTypeEnum } from './enums';
import { Users } from './users';

/** 标签定义表，用于主标签、副标签的展示描述与筛选映射 */
export const TagDefinitions = pgTable(
  'tag_definitions',
  {
    /** 标签主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 标签展示名称 */
    name: varchar({ length: 64 }).notNull(),
    /** 稳定机器键，仅用于需要程序化识别的标签类型 */
    machine_key: varchar({ length: 64 }),
    /** 标签类型 */
    tag_type: tagTypeEnum().notNull(),
    /** 标签描述 */
    description: varchar({ length: 512 }),
    /** 是否启用 */
    is_enabled: boolean().notNull().default(true),
    /** 合并后的目标标签 */
    merged_into_tag_id: uuid().references((): AnyPgColumn => TagDefinitions.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 执行合并的管理员 */
    merged_by: uuid().references(() => Users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 合并时间 */
    merged_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    /** 更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('tag_definitions_name_type_index').on(table.name, table.tag_type),
    uniqueIndex('tag_definitions_type_machine_key_index').on(table.tag_type, table.machine_key),
    index('tag_definitions_type_enabled_index').on(table.tag_type, table.is_enabled),
    index('tag_definitions_merged_into_tag_id_index').on(table.merged_into_tag_id),
    check('tag_definitions_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check(
      'tag_definitions_machine_key_not_blank_check',
      sql`${table.machine_key} is null or btrim(${table.machine_key}) <> ''`,
    ),
    check(
      'tag_definitions_warning_machine_key_required_check',
      sql`${table.tag_type} <> 'WARNING' or btrim(coalesce(${table.machine_key}, '')) <> ''`,
    ),
    check(
      'tag_definitions_merged_into_tag_id_self_check',
      sql`${table.merged_into_tag_id} is null or ${table.merged_into_tag_id} <> ${table.id}`,
    ),
  ],
);

/** 技术栈目录表，用于程序技术栈的全局候选词库 */
export const TechnologyCatalogs = pgTable(
  'technology_catalogs',
  {
    /** 技术项主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 技术名称 */
    name: varchar({ length: 128 }).notNull(),
    /** 技术名称归一化键，用于查重与模糊匹配 */
    name_normalized: varchar({ length: 128 }).notNull(),
    /** 技术类型 */
    technology_type: technologyTypeEnum().notNull(),
    /** 技术简介 */
    description: varchar({ length: 512 }),
    /** 官网链接 */
    official_url: varchar({ length: 256 }),
    /** 是否启用 */
    is_enabled: boolean().notNull().default(true),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    /** 更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('technology_catalogs_name_type_index').on(table.name, table.technology_type),
    uniqueIndex('technology_catalogs_name_normalized_type_index').on(
      table.name_normalized,
      table.technology_type,
    ),
    index('technology_catalogs_type_enabled_index').on(table.technology_type, table.is_enabled),
    index('technology_catalogs_name_normalized_index').on(table.name_normalized),
  ],
);
