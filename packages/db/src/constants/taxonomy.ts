export const TAG_TYPES = {
  MAIN: {
    label: '主标签',
    description: '用于站点主分类展示的固定标签',
  },
  SUB: {
    label: '副标签',
    description: '用于补充站点细分主题的标签',
  },
} as const;

export const TAG_TYPE_KEYS = Object.keys(TAG_TYPES) as Array<keyof typeof TAG_TYPES>;

export type TagTypeKey = (typeof TAG_TYPE_KEYS)[number];

export const TECHNOLOGY_TYPES = {
  SYSTEM: {
    label: '博客系统',
    description: '成熟博客系统，如 WordPress、Hexo、Hugo',
  },
  FRAMEWORK: {
    label: '技术框架',
    description: '用于自定义博客构建的框架，如 Next.js、Nuxt',
  },
  LANGUAGE: {
    label: '编程语言',
    description: '用于实现博客系统的主要编程语言',
  },
} as const;

export const TECHNOLOGY_TYPE_KEYS = Object.keys(TECHNOLOGY_TYPES) as Array<
  keyof typeof TECHNOLOGY_TYPES
>;

export type TechnologyTypeKey = (typeof TECHNOLOGY_TYPE_KEYS)[number];

export const SITE_TECH_STACK_CATEGORIES = {
  FRAMEWORK: {
    label: '框架',
    description: '用于网站构建或运行时的框架技术栈',
  },
  LANGUAGE: {
    label: '语言',
    description: '用于网站实现的编程语言技术栈',
  },
} as const;

export const SITE_TECH_STACK_CATEGORY_KEYS = Object.keys(SITE_TECH_STACK_CATEGORIES) as Array<
  keyof typeof SITE_TECH_STACK_CATEGORIES
>;

export type SiteTechStackCategoryKey = (typeof SITE_TECH_STACK_CATEGORY_KEYS)[number];
