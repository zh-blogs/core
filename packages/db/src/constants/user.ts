export const USER_ROLES = {
  SYS_ADMIN: {
    label: '系统管理员',
    description: '拥有系统最高权限，可管理所有功能与配置',
  },
  ADMIN: {
    label: '管理员',
    description: '拥有后台审核与运营管理权限',
  },
  CONTRIBUTOR: {
    label: '贡献者',
    description: '可以提交、维护内容并参与协作',
  },
  USER: {
    label: '普通用户',
    description: '具备基础登录与交互能力',
  },
} as const

export const USER_ROLE_KEYS = Object.keys(USER_ROLES) as Array<
  keyof typeof USER_ROLES
>

export type UserRoleKey = (typeof USER_ROLE_KEYS)[number]

export const USER_OAUTH_PROVIDERS = {
  GITHUB: {
    label: 'GitHub',
    description: '使用 GitHub 账号进行登录与授权',
  },
} as const

export const USER_OAUTH_PROVIDER_KEYS = Object.keys(
  USER_OAUTH_PROVIDERS,
) as Array<keyof typeof USER_OAUTH_PROVIDERS>

export type UserOauthProviderKey = (typeof USER_OAUTH_PROVIDER_KEYS)[number]
