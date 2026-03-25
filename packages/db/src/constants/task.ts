export const TASK_TYPES = {
  RSS_FETCH: {
    label: 'RSS 抓取',
    description: '抓取站点 RSS 文章并入库',
  },
  SITE_CHECK: {
    label: '站点检测',
    description: '检测站点可用性、响应时间与访问状态',
  },
  DB_MAINTENANCE: {
    label: '数据库整理',
    description: '执行数据库整理、清理、归档或维护任务',
  },
  STATS_CALC: {
    label: '统计计算',
    description: '聚合访问、抓取、状态等业务统计数据',
  },
  EMAIL_SEND: {
    label: '发送邮件',
    description: '发送通知邮件、审核邮件或系统邮件',
  },
  MESSAGE_DISPATCH: {
    label: '发送消息',
    description: '定时发送系统消息、通知或站内信',
  },
  CUSTOM: {
    label: '自定义任务',
    description: '用于兼容临时扩展的自定义任务类型',
  },
} as const;

export const TASK_TYPE_KEYS = Object.keys(TASK_TYPES) as Array<keyof typeof TASK_TYPES>;

export type TaskTypeKey = (typeof TASK_TYPE_KEYS)[number];

export const SCHEDULE_MODES = {
  CRON: {
    label: 'Cron 定时',
    description: '按 Cron 表达式定时创建任务',
  },
  INTERVAL: {
    label: '固定间隔',
    description: '按固定时间间隔持续创建任务',
  },
  MANUAL: {
    label: '手动触发',
    description: '仅在人工触发时创建任务',
  },
  EVENT: {
    label: '事件触发',
    description: '由业务事件或关联任务完成后触发创建',
  },
} as const;

export const SCHEDULE_MODE_KEYS = Object.keys(SCHEDULE_MODES) as Array<keyof typeof SCHEDULE_MODES>;

export type ScheduleModeKey = (typeof SCHEDULE_MODE_KEYS)[number];

export const JOB_TRIGGER_SOURCES = {
  SCHEDULE: {
    label: '调度触发',
    description: '由任务调度器自动生成的任务',
  },
  MANUAL: {
    label: '手动触发',
    description: '由后台或接口人工触发的任务',
  },
  EVENT: {
    label: '事件触发',
    description: '由业务事件直接触发的任务',
  },
  CHAIN: {
    label: '关联触发',
    description: '由上游任务完成后派生出的下游任务',
  },
  RETRY: {
    label: '失败重试',
    description: '由失败任务按策略重新入队的任务',
  },
  SYSTEM: {
    label: '系统触发',
    description: '由系统内部流程自动产生的任务',
  },
} as const;

export const JOB_TRIGGER_SOURCE_KEYS = Object.keys(JOB_TRIGGER_SOURCES) as Array<
  keyof typeof JOB_TRIGGER_SOURCES
>;

export type JobTriggerSourceKey = (typeof JOB_TRIGGER_SOURCE_KEYS)[number];

export const JOB_STATUSES = {
  PENDING: {
    label: '待执行',
    description: '任务已入队，等待消费者处理',
  },
  RUNNING: {
    label: '执行中',
    description: '任务已被 Worker 锁定并正在执行',
  },
  SUCCEEDED: {
    label: '已成功',
    description: '任务执行完成且结果成功',
  },
  FAILED: {
    label: '已失败',
    description: '任务执行失败，可能进入重试流程',
  },
  CANCELED: {
    label: '已取消',
    description: '任务被人工或系统取消执行',
  },
  DEAD_LETTER: {
    label: '死信',
    description: '任务多次重试后仍失败，被转入死信状态',
  },
} as const;

export const JOB_STATUS_KEYS = Object.keys(JOB_STATUSES) as Array<keyof typeof JOB_STATUSES>;

export type JobStatusKey = (typeof JOB_STATUS_KEYS)[number];

export const EXECUTION_STATUSES = {
  RUNNING: {
    label: '执行中',
    description: '本次执行尝试正在进行',
  },
  SUCCEEDED: {
    label: '执行成功',
    description: '本次执行尝试成功完成',
  },
  FAILED: {
    label: '执行失败',
    description: '本次执行尝试失败',
  },
  TIMEOUT: {
    label: '执行超时',
    description: '本次执行尝试超过超时阈值',
  },
  CANCELED: {
    label: '已取消',
    description: '本次执行尝试被取消',
  },
} as const;

export const EXECUTION_STATUS_KEYS = Object.keys(EXECUTION_STATUSES) as Array<
  keyof typeof EXECUTION_STATUSES
>;

export type ExecutionStatusKey = (typeof EXECUTION_STATUS_KEYS)[number];
