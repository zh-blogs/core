import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { v7 } from 'uuid'
import { tagTypeEnum, technologyTypeEnum } from './enums'

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
    /** 标签类型 */
    tag_type: tagTypeEnum().notNull(),
    /** 标签描述 */
    description: varchar({ length: 512 }),
    /** 是否启用 */
    is_enabled: boolean().notNull().default(true),
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
    uniqueIndex('tag_definitions_name_type_index').on(table.name, table.tag_type),
    index('tag_definitions_type_enabled_index').on(
      table.tag_type,
      table.is_enabled,
    ),
  ],
)

/** 技术目录表，用于博客系统、框架、语言等展示信息与站点架构引用 */
export const TechnologyCatalogs = pgTable(
  'technology_catalogs',
  {
    /** 技术项主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 技术名称 */
    name: varchar({ length: 128 }).notNull(),
    /** 技术类型 */
    technology_type: technologyTypeEnum().notNull(),
    /** 技术简介 */
    description: varchar({ length: 512 }),
    /** 官网链接 */
    official_url: varchar({ length: 256 }),
    /** Logo 链接 */
    logo_url: varchar({ length: 256 }),
    /** 是否启用 */
    is_enabled: boolean().notNull().default(true),
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
    uniqueIndex('technology_catalogs_name_type_index').on(
      table.name,
      table.technology_type,
    ),
    index('technology_catalogs_type_enabled_index').on(
      table.technology_type,
      table.is_enabled,
    ),
  ],
)
