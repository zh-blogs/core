export const ANNOUNCEMENT_STATUSES = {
  DRAFT: {
    label: '草稿',
    description: '仅后台可见，可继续编辑或删除的公告草稿',
  },
  SCHEDULED: {
    label: '预发布',
    description: '已设定发布时间但尚未对前台可见的公告',
  },
  PUBLISHED: {
    label: '已发布',
    description: '已对前台可见的公告内容',
  },
  EXPIRED: {
    label: '已过期',
    description: '已下线且不再允许普通管理员编辑或删除的公告',
  },
} as const

export const ANNOUNCEMENT_STATUS_KEYS = Object.keys(ANNOUNCEMENT_STATUSES) as Array<
  keyof typeof ANNOUNCEMENT_STATUSES
>

export type AnnouncementStatusKey = (typeof ANNOUNCEMENT_STATUS_KEYS)[number]
