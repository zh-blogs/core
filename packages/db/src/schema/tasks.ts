import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { v7 } from 'uuid'
import { JOB_STATUS_KEYS, TASK_TYPE_KEYS } from '../constants/task'
import {
  executionStatusEnum,
  jobStatusEnum,
  jobTriggerSourceEnum,
  scheduleModeEnum,
  taskTypeEnum,
} from './enums'

/** 调度器元数据，可由 Worker 调度器或后台管理界面维护 */
export interface TaskScheduleConfig {
  cron?: string
  interval_seconds?: number
  timezone?: string
  jitter_seconds?: number
  start_at?: string
  end_at?: string
}

/** 默认任务载荷模板，用于生成实际 jobs.payload */
export interface TaskPayloadTemplate {
  site_id?: string
  site_ids?: string[]
  feed_url?: string
  target_email?: string
  message_channel?: string
  message_template?: string
  options?: Record<string, unknown>
}

/** 任务依赖或事件触发条件定义 */
export interface TaskTriggerRule {
  event?: string
  parent_task_type?: (typeof TASK_TYPE_KEYS)[number]
  parent_status?: (typeof JOB_STATUS_KEYS)[number]
  only_on_success?: boolean
  delay_seconds?: number
}

/** 重试、超时和并发配置 */
export interface JobPolicyConfig {
  max_attempts?: number
  timeout_seconds?: number
  retry_backoff_seconds?: number[]
  concurrency_key?: string
  dedupe_window_seconds?: number
}

/** 调度定义表，描述任务如何被创建 */
export const TaskSchedules = pgTable(
  'task_schedules',
  {
    /** 调度定义主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 人类可读的调度名称 */
    name: varchar({ length: 128 }).notNull(),
    /** 任务类型 */
    task_type: taskTypeEnum().notNull(),
    /** 任务所属队列，Worker 可按 queue_name 分工消费 */
    queue_name: varchar({ length: 64 }).notNull(),
    /** 调度方式：定时、间隔、手动、事件 */
    schedule_mode: scheduleModeEnum().notNull(),
    /** 是否启用该调度定义 */
    is_enabled: boolean().notNull().default(true),
    /** 调度配置，如 cron 表达式、时区、时间窗 */
    schedule_config: jsonb().$type<TaskScheduleConfig>(),
    /** 事件触发或关联触发规则 */
    trigger_rule: jsonb().$type<TaskTriggerRule>(),
    /** 生成 job 时使用的默认载荷 */
    payload_template: jsonb().$type<TaskPayloadTemplate>(),
    /** 重试、超时、并发等策略 */
    policy: jsonb().$type<JobPolicyConfig>(),
    /** 下次计划触发时间，供调度器扫描 */
    next_run_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 上次生成任务时间 */
    last_run_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
    /** 调度定义最后更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('task_schedules_name_index').on(table.name),
    index('task_schedules_enabled_next_run_index').on(
      table.is_enabled,
      table.next_run_time,
    ),
    index('task_schedules_type_enabled_index').on(
      table.task_type,
      table.is_enabled,
    ),
    index('task_schedules_queue_enabled_index').on(
      table.queue_name,
      table.is_enabled,
    ),
  ],
)

/** 实际待消费任务表，对应文档中的 PostgreSQL jobs 队列 */
export const Jobs = pgTable(
  'jobs',
  {
    /** 任务实例主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 根任务 ID，用于串联一整条关联触发链路 */
    root_job_id: uuid(),
    /** 父任务 ID，用于记录链式触发关系 */
    parent_job_id: uuid(),
    /** 来源调度定义，手动任务可为空 */
    schedule_id: uuid().references(() => TaskSchedules.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    /** 任务类型 */
    task_type: taskTypeEnum().notNull(),
    /** Worker 消费队列名 */
    queue_name: varchar({ length: 64 }).notNull(),
    /** 任务触发来源 */
    trigger_source: jobTriggerSourceEnum().notNull(),
    /** 事件名或触发上下文标识 */
    trigger_key: varchar({ length: 128 }),
    /** 任务当前状态 */
    status: jobStatusEnum().notNull().default('PENDING'),
    /** 调度优先级，数字越大优先级越高 */
    priority: integer().notNull().default(0),
    /** 当前尝试次数 */
    attempt_count: integer().notNull().default(0),
    /** 最大允许尝试次数 */
    max_attempts: integer().notNull().default(3),
    /** 任务载荷 */
    payload: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    /** 任务执行结果摘要 */
    result: jsonb().$type<Record<string, unknown>>(),
    /** 幂等或去重键 */
    dedupe_key: varchar({ length: 256 }),
    /** 任务最早可执行时间 */
    run_at: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
    /** 被消费者锁定的时间 */
    locked_at: timestamp({ withTimezone: true, precision: 6 }),
    /** 当前锁定该任务的 Worker 标识 */
    locked_by: varchar({ length: 128 }),
    /** 执行心跳时间，用于判定 Worker 是否失联 */
    heartbeat_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 开始执行时间 */
    started_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 完成时间 */
    finished_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 下次重试时间 */
    next_retry_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 失败错误码 */
    error_code: varchar({ length: 64 }),
    /** 失败错误信息 */
    error_message: text(),
    /** 任务创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
    /** 任务最后更新时间 */
    updated_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (table) => [
    index('jobs_queue_status_run_at_priority_index').on(
      table.queue_name,
      table.status,
      table.run_at,
      table.priority.desc(),
    ),
    index('jobs_status_next_retry_time_index').on(
      table.status,
      table.next_retry_time,
    ),
    index('jobs_schedule_created_time_index').on(
      table.schedule_id,
      table.created_time.desc(),
    ),
    index('jobs_root_job_created_time_index').on(
      table.root_job_id,
      table.created_time.desc(),
    ),
    index('jobs_parent_job_created_time_index').on(
      table.parent_job_id,
      table.created_time.desc(),
    ),
    index('jobs_locked_by_heartbeat_time_index').on(
      table.locked_by,
      table.heartbeat_time,
    ),
    uniqueIndex('jobs_dedupe_key_index').on(table.dedupe_key),
  ],
)

/** 每次消费尝试的执行明细表，用于重试追踪和故障排查 */
export const JobExecutions = pgTable(
  'job_executions',
  {
    /** 执行记录主键 */
    id: uuid()
      .$default(() => v7())
      .primaryKey(),
    /** 所属任务 */
    job_id: uuid()
      .notNull()
      .references(() => Jobs.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 第几次尝试，从 1 开始 */
    attempt_no: integer().notNull(),
    /** 处理该次执行的 Worker 实例 */
    worker_id: varchar({ length: 128 }),
    /** 当前执行状态 */
    status: executionStatusEnum().notNull().default('RUNNING'),
    /** 入参快照，便于排查重试时的 payload 漂移 */
    input_payload: jsonb().$type<Record<string, unknown>>(),
    /** 输出结果快照 */
    output_payload: jsonb().$type<Record<string, unknown>>(),
    /** 结构化错误信息 */
    error_detail: jsonb().$type<Record<string, unknown>>(),
    /** 错误摘要 */
    error_message: text(),
    /** 开始时间 */
    started_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
    /** 完成时间 */
    finished_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 执行耗时，毫秒 */
    duration_ms: integer(),
    /** 最后一次心跳时间 */
    heartbeat_time: timestamp({ withTimezone: true, precision: 6 }),
    /** 执行记录创建时间 */
    created_time: timestamp({ withTimezone: true, precision: 6 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('job_executions_job_id_attempt_no_index').on(
      table.job_id,
      table.attempt_no,
    ),
    index('job_executions_job_id_started_time_index').on(
      table.job_id,
      table.started_time.desc(),
    ),
    index('job_executions_worker_status_started_time_index').on(
      table.worker_id,
      table.status,
      table.started_time.desc(),
    ),
  ],
)
