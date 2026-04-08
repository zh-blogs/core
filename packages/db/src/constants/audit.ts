export const SITE_AUDIT_ACTIONS = {
  CREATE: {
    label: '新增审核',
    description: '新增站点信息的审核流程',
  },
  UPDATE: {
    label: '修改审核',
    description: '已有站点信息变更申请的审核流程',
  },
  DELETE: {
    label: '删除审核',
    description: '站点删除申请的审核流程',
  },
  RESTORE: {
    label: '恢复审核',
    description: '已下线站点恢复展示的审核流程',
  },
} as const;

export const SITE_AUDIT_ACTION_KEYS = Object.keys(SITE_AUDIT_ACTIONS) as Array<
  keyof typeof SITE_AUDIT_ACTIONS
>;

export type SiteAuditActionKey = (typeof SITE_AUDIT_ACTION_KEYS)[number];

export const AUDIT_STATUSES = {
  PENDING: {
    label: '待审核',
    description: '申请已提交，等待后台审核处理',
  },
  APPROVED: {
    label: '已通过',
    description: '审核通过，变更已确认生效',
  },
  REJECTED: {
    label: '已拒绝',
    description: '审核未通过，申请被驳回',
  },
  CANCELED: {
    label: '已撤销',
    description: '申请人主动撤销或流程被终止',
  },
} as const;

export const AUDIT_STATUS_KEYS = Object.keys(AUDIT_STATUSES) as Array<keyof typeof AUDIT_STATUSES>;

export type AuditStatusKey = (typeof AUDIT_STATUS_KEYS)[number];
