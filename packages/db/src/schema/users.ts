import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { v7 } from 'uuid';

import { managementPermissionEnum, userOauthProviderEnum, userRoleEnum } from './enums';
import { Sites } from './sites';

/** 用户主表，保留基础身份信息并预留扩展能力 */
export const Users = pgTable(
  'users',
  {
    /** 用户主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 用户名，可用于个人页或后台识别 */
    username: varchar({ length: 64 }).notNull(),
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
    profile: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    /** 用户偏好设置 */
    settings: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    /** 额外保留字段，便于未来挂载 API Token、审计元数据等 */
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    /** 最后登录时间 */
    last_login_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    /** 更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('users_email_lower_index').on(sql`lower(${table.email})`),
    uniqueIndex('users_username_lower_index').on(sql`lower(${table.username})`),
    index('users_role_active_index').on(table.role, table.is_active),
    index('users_created_time_index').on(table.created_time.desc()),
    check('users_username_not_blank_check', sql`btrim(${table.username}) <> ''`),
    check('users_nickname_not_blank_check', sql`btrim(${table.nickname}) <> ''`),
  ],
);

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
    scopes: jsonb().$type<string[]>().notNull().default([]),
    /** 提供商返回的附加资料 */
    profile: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
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
    uniqueIndex('user_oauth_accounts_user_provider_index').on(table.user_id, table.provider),
    index('user_oauth_accounts_user_id_index').on(table.user_id),
    index('user_oauth_accounts_provider_index').on(table.provider),
  ],
);

export const UserEmailVerificationTokens = pgTable(
  'user_email_verification_tokens',
  {
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    user_id: uuid()
      .notNull()
      .references(() => Users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    email: varchar({ length: 128 }).notNull(),
    token_hash: varchar({ length: 128 }).notNull(),
    expires_time: timestamp({ withTimezone: true, precision: 6 }).notNull(),
    consumed_time: timestamp({ withTimezone: true, precision: 6 }),
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('user_email_verification_tokens_token_hash_index').on(table.token_hash),
    index('user_email_verification_tokens_user_id_index').on(table.user_id),
    index('user_email_verification_tokens_email_index').on(table.email),
    index('user_email_verification_tokens_expires_time_index').on(table.expires_time),
  ],
);

export const UserPasswordResetTokens = pgTable(
  'user_password_reset_tokens',
  {
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    user_id: uuid()
      .notNull()
      .references(() => Users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    email: varchar({ length: 128 }).notNull(),
    token_hash: varchar({ length: 128 }).notNull(),
    expires_time: timestamp({ withTimezone: true, precision: 6 }).notNull(),
    consumed_time: timestamp({ withTimezone: true, precision: 6 }),
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('user_password_reset_tokens_token_hash_index').on(table.token_hash),
    index('user_password_reset_tokens_user_id_index').on(table.user_id),
    index('user_password_reset_tokens_email_index').on(table.email),
    index('user_password_reset_tokens_expires_time_index').on(table.expires_time),
  ],
);

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
    scopes: jsonb().$type<string[]>().notNull().default([]),
    /** 是否启用 */
    is_active: boolean().notNull().default(true),
    /** 最后使用时间 */
    last_used_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 过期时间 */
    expires_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
    /** 更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('user_api_tokens_user_id_index').on(table.user_id),
    index('user_api_tokens_user_id_active_index').on(table.user_id, table.is_active),
    index('user_api_tokens_expires_time_index').on(table.expires_time),
  ],
);

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
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_sites_site_id_index').on(table.site_id),
    index('user_sites_user_id_index').on(table.user_id),
  ],
);

/** 用户管理权限关联表，仅允许 ADMIN 账号持有模块权限 */
export const UserManagementPermissions = pgTable(
  'user_management_permissions',
  {
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    user_id: uuid()
      .notNull()
      .references(() => Users.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    permission_key: managementPermissionEnum().notNull(),
    granted_by: uuid().references(() => Users.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    created_time: timestamp({ withTimezone: true, precision: 6 }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('user_management_permissions_user_permission_index').on(
      table.user_id,
      table.permission_key,
    ),
    index('user_management_permissions_user_id_index').on(table.user_id),
    index('user_management_permissions_granted_by_index').on(table.granted_by),
    index('user_management_permissions_permission_key_index').on(table.permission_key),
  ],
);
