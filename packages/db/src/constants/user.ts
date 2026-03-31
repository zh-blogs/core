export const USER_ROLES = {
  SYS_ADMIN: {
    label: '系统管理员',
    description: '拥有系统最高权限，可管理所有功能与配置',
  },
  ADMIN: {
    label: '管理员',
    description: '可以进入管理面板，并接受模块级权限授权',
  },
  USER: {
    label: '普通用户',
    description: '具备基础登录与交互能力',
  },
} as const;

export const USER_ROLE_KEYS = Object.keys(USER_ROLES) as Array<keyof typeof USER_ROLES>;

export type UserRoleKey = (typeof USER_ROLE_KEYS)[number];

export const MANAGEMENT_PERMISSIONS = {
  USER_MANAGE: {
    key: 'user.manage',
    label: '用户与授权',
    description: '管理用户提权、降权与模块权限分配',
  },
  SITE_AUDIT_REVIEW: {
    key: 'site_audit.review',
    label: '站点审核',
    description: '处理站点新增、修改和删除审核',
  },
  FEEDBACK_REVIEW: {
    key: 'feedback.review',
    label: '反馈处理',
    description: '处理站点反馈与文章反馈',
  },
  ANNOUNCEMENT_MANAGE: {
    key: 'announcement.manage',
    label: '公告管理',
    description: '管理首页公告与公开公告归档',
  },
  TAXONOMY_MANAGE: {
    key: 'taxonomy.manage',
    label: '标签与技术目录',
    description: '维护标签、技术目录与标签合并',
  },
  SITE_MANAGE: {
    key: 'site.manage',
    label: '站点编辑',
    description: '直接维护线上站点信息',
  },
  TASK_MANAGE: {
    key: 'task.manage',
    label: '任务中心',
    description: '管理任务调度、手动触发与执行记录',
  },
  LOG_READ: {
    key: 'log.read',
    label: '日志查看',
    description: '只读查看运行日志',
  },
} as const;

export const MANAGEMENT_PERMISSION_KEYS = Object.values(MANAGEMENT_PERMISSIONS).map(
  (permission) => permission.key,
) as [string, ...string[]];

export type ManagementPermissionKey = (typeof MANAGEMENT_PERMISSION_KEYS)[number];

export const USER_OAUTH_PROVIDERS = {
  GITHUB: {
    label: 'GitHub',
    description: '使用 GitHub 账号进行登录与授权',
  },
} as const;

export const USER_OAUTH_PROVIDER_KEYS = Object.keys(USER_OAUTH_PROVIDERS) as Array<
  keyof typeof USER_OAUTH_PROVIDERS
>;

export type UserOauthProviderKey = (typeof USER_OAUTH_PROVIDER_KEYS)[number];
