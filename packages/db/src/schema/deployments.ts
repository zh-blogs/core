import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { v7 } from 'uuid'
import { deploymentModuleEnum, deploymentStatusEnum } from './enums'

/** 部署运维表，合并 GitHub Webhook 触发信息与部署执行结果 */
export const Deployments = pgTable(
  'deployments',
  {
    /** 部署记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 触发事件名称，如 push、pull_request、workflow_dispatch */
    trigger_event: varchar({ length: 64 }).notNull(),
    /** 部署状态 */
    status: deploymentStatusEnum().notNull().default('PENDING'),
    /** 本次部署涉及的模块 */
    modules: deploymentModuleEnum().array().notNull(),
    /** GitHub Delivery ID，可为空 */
    delivery_id: varchar({ length: 128 }),
    /** GitHub Workflow Run ID，可为空 */
    workflow_run_id: varchar({ length: 128 }),
    /** Workflow 运行地址 */
    workflow_run_url: varchar({ length: 256 }),
    /** 提交 SHA */
    commit_sha: varchar({ length: 64 }),
    /** 分支或引用 */
    git_ref: varchar({ length: 256 }),
    /** 结构化部署元数据 */
    metadata: jsonb().$type<Record<string, unknown>>(),
    /** 原始 Webhook 载荷 */
    raw_payload: jsonb().$type<Record<string, unknown>>(),
    /** 部署开始时间 */
    started_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 部署结束时间 */
    finished_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('deployments_status_created_time_index').on(
      table.status,
      table.created_time.desc(),
    ),
    index('deployments_commit_sha_created_time_index').on(
      table.commit_sha,
      table.created_time.desc(),
    ),
    index('deployments_trigger_event_created_time_index').on(
      table.trigger_event,
      table.created_time.desc(),
    ),
    index('deployments_started_time_index').on(table.started_time.desc()),
    index('deployments_workflow_run_id_index').on(table.workflow_run_id),
    index('deployments_delivery_id_index').on(table.delivery_id),
    index('deployments_modules_gin_index').using('gin', table.modules),
  ],
)
