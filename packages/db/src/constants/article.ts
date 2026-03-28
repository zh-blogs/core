export const ARTICLE_VISIBILITIES = {
  VISIBLE: {
    label: '显示',
    description: '文章可在前台正常展示和跳转',
  },
  HIDDEN: {
    label: '隐藏',
    description: '文章仍保留记录，但不在前台展示',
  },
  DELETED: {
    label: '删除',
    description: '文章记录被逻辑删除或不再对外提供',
  },
} as const;

export const ARTICLE_VISIBILITY_KEYS = Object.keys(ARTICLE_VISIBILITIES) as Array<
  keyof typeof ARTICLE_VISIBILITIES
>;

export type ArticleVisibilityKey = (typeof ARTICLE_VISIBILITY_KEYS)[number];

export const ARTICLE_FEEDBACK_ACTIONS = {
  HIDE: {
    label: '隐藏文章',
    description: '审核通过后将文章从前台隐藏',
  },
  DELETE: {
    label: '删除文章',
    description: '审核通过后将文章标记为删除状态',
  },
} as const;

export const ARTICLE_FEEDBACK_ACTION_KEYS = Object.keys(ARTICLE_FEEDBACK_ACTIONS) as Array<
  keyof typeof ARTICLE_FEEDBACK_ACTIONS
>;

export type ArticleFeedbackActionKey = (typeof ARTICLE_FEEDBACK_ACTION_KEYS)[number];

export const ARTICLE_FEEDBACK_REASONS = {
  CONTENT_ERROR: {
    label: '文章内容错误',
    description: '文章内容明显错误、失实或不符合原文含义',
  },
  BROKEN_LINK: {
    label: '链接失效',
    description: '原文链接失效、跳转异常或无法访问',
  },
  POLITICAL_SENSITIVE: {
    label: '涉及政治敏感',
    description: '文章内容可能涉及政治敏感信息，需要人工审核',
  },
  PORNOGRAPHY_VIOLENCE: {
    label: '涉及色情暴力',
    description: '文章内容可能涉及色情、暴力或其他不适宜公开展示内容',
  },
  COPYRIGHT: {
    label: '版权问题',
    description: '文章可能涉及侵权、未经授权转载或版权争议',
  },
  SPAM: {
    label: '垃圾内容',
    description: '文章内容疑似广告、引流、恶意推广或垃圾信息',
  },
  DUPLICATE: {
    label: '重复内容',
    description: '文章与已有抓取记录重复，可能是重复收录',
  },
  OTHER: {
    label: '其他问题',
    description: '不属于预定义分类的其他反馈问题',
  },
} as const;

export const ARTICLE_FEEDBACK_REASON_KEYS = Object.keys(ARTICLE_FEEDBACK_REASONS) as Array<
  keyof typeof ARTICLE_FEEDBACK_REASONS
>;

export type ArticleFeedbackReasonKey = (typeof ARTICLE_FEEDBACK_REASON_KEYS)[number];

export const SITE_FEEDBACK_REASONS = {
  SITE_INFO_ERROR: {
    label: '站点信息错误',
    description: '站点名称、简介、标签、链接或其他公开资料存在明显错误',
  },
  ACCESS_ISSUE: {
    label: '访问异常',
    description: '站点无法正常访问、跳转异常或存在明显可用性问题',
  },
  FEED_ISSUE: {
    label: '订阅异常',
    description: 'RSS 或订阅链接无效、错误或抓取结果异常',
  },
  CONTENT_RISK: {
    label: '内容风险',
    description: '站点存在不适宜公开目录展示的内容风险',
  },
  COPYRIGHT: {
    label: '版权问题',
    description: '站点内容可能涉及侵权、未授权转载或版权争议',
  },
  SPAM: {
    label: '垃圾内容',
    description: '站点疑似广告、引流、恶意推广或垃圾信息',
  },
  OTHER: {
    label: '其他问题',
    description: '不属于预定义分类的其他站点反馈问题',
  },
} as const;

export const SITE_FEEDBACK_REASON_KEYS = Object.keys(SITE_FEEDBACK_REASONS) as Array<
  keyof typeof SITE_FEEDBACK_REASONS
>;

export type SiteFeedbackReasonKey = (typeof SITE_FEEDBACK_REASON_KEYS)[number];
