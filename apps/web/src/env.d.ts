interface WebBuildMetadata {
  packageName: string;
  version: string;
  branch: string;
  commitHash: string;
  shortCommitHash: string;
  commitTime: string;
  commitLink: string;
  buildTime: string;
}

declare const __ZHBLOGS_BUILD_METADATA__: WebBuildMetadata;

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ZhblogsNoticeApi {
  close: (id?: string) => void;
  open: (
    payload: import('./application/site-notice/site-notice.service').SiteNoticePayload,
  ) => string;
}

interface ZhblogsToast {
  close: (id?: string) => void;
  open: (payload: import('./application/toast/toast.service').ToastPayload) => string;
}

interface Window {
  ZhblogsNotice?: ZhblogsNoticeApi;
  ZhblogsToast?: ZhblogsToast;
  __setZhblogsTheme?: (nextTheme: 'light' | 'dark') => void;
  __toggleZhblogsTheme?: () => void;
}

declare namespace App {
  interface Locals {
    authUser?: import('./application/auth/auth.guard').SessionUser | null;
  }
}
