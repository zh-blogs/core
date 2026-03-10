import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { v7 } from 'uuid'
import { userOauthProviderEnum, userRoleEnum } from './enums'
import { Sites } from './sites'

/** 用户主表，保留基础身份信息并预留扩展能力 */
export const Users = pgTable(
  'users',
  {
    /** 用户主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 用户名，可用于个人页或后台识别 */
    username: varchar({ length: 64 }),
    /** 用户昵称 */
    nickname: varchar({ length: 64 }).notNull(),
    /** 用户头像链接 */
    avatar_url: varchar({ length: 256 }),
    /** 邮箱地址 */
    email: varchar({ length: 128 }).notNull(),
    /** 密码哈希，第三方登录独立账号可为空 */
    password_hash: varchar({ length: 256 }),
    /** 用户角色 */
    role: userRoleEnum().notNull().default('USER'),
    /** 账号是否启用 */
    is_active: boolean().notNull().default(true),
    /** 邮箱是否已验证 */
    is_verified: boolean().notNull().default(false),
    /** 用户档案扩展信息 */
    profile: jsonb().$type<Record<string, unknown>>(),
    /** 用户偏好设置 */
    settings: jsonb().$type<Record<string, unknown>>(),
    /** 额外保留字段，便于未来挂载 API Token、审计元数据等 */
    metadata: jsonb().$type<Record<string, unknown>>(),
    /** 最后登录时间 */
    last_login_time: timestamp({ withTimezone: true, precision: 6 }),
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
    uniqueIndex('users_email_index').on(table.email),
    uniqueIndex('users_username_index').on(table.username),
    index('users_role_active_index').on(table.role, table.is_active),
    index('users_created_time_index').on(table.created_time.desc()),
  ],
)

/** 第三方登录授权表，当前优先支持 GitHub，后续可扩展更多提供商 */
export const UserOauthAccounts = pgTable(
  'user_oauth_accounts',
  {
    /** 授权记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 关联用户 */
    user_id: uuid()
      .notNull()
      .references(() => Users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 第三方提供商 */
    provider: userOauthProviderEnum().notNull(),
    /** 提供商侧唯一用户标识 */
    provider_user_id: varchar({ length: 128 }).notNull(),
    /** 提供商用户名 */
    provider_username: varchar({ length: 128 }),
    /** 访问令牌 */
    access_token: text(),
    /** 刷新令牌 */
    refresh_token: text(),
    /** 令牌失效时间 */
    expires_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 授权范围 */
    scopes: jsonb().$type<string[]>().default([]),
    /** 提供商返回的附加资料 */
    profile: jsonb().$type<Record<string, unknown>>(),
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
    uniqueIndex('user_oauth_accounts_provider_user_id_index').on(
      table.provider,
      table.provider_user_id,
    ),
    index('user_oauth_accounts_user_id_index').on(table.user_id),
    index('user_oauth_accounts_provider_index').on(table.provider),
  ],
)

/** 用户 API 访问令牌表，支持未来开放 API 能力时按用户签发多 Token */
export const UserApiTokens = pgTable(
  'user_api_tokens',
  {
    /** Token 记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 所属用户 */
    user_id: uuid()
      .notNull()
      .references(() => Users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** Token 名称，便于用户区分用途 */
    name: varchar({ length: 64 }).notNull(),
    /** Token 哈希值，仅存储哈希而不存明文 */
    token_hash: varchar({ length: 256 }).notNull().unique(),
    /** 权限范围 */
    scopes: jsonb().$type<string[]>().default([]),
    /** 是否启用 */
    is_active: boolean().notNull().default(true),
    /** 最后使用时间 */
    last_used_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 过期时间 */
    expires_time: timestamp({ withTimezone: true, precision: 6 }),
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
    index('user_api_tokens_user_id_index').on(table.user_id),
    index('user_api_tokens_user_id_active_index').on(
      table.user_id,
      table.is_active,
    ),
    index('user_api_tokens_expires_time_index').on(table.expires_time),
  ],
)

/** 用户与站点关联表，一个用户可关联多个站点，一个站点仅归属一个用户 */
export const UserSites = pgTable(
  'user_sites',
  {
    /** 关联记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 用户 ID */
    user_id: uuid()
      .notNull()
      .references(() => Users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 站点 ID */
    site_id: uuid()
      .notNull()
      .references(() => Sites.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 关联建立时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('user_sites_site_id_index').on(table.site_id),
    uniqueIndex('user_sites_user_id_site_id_index').on(table.user_id, table.site_id),
    index('user_sites_user_id_index').on(table.user_id),
  ],
)
