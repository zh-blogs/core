export type SiteAccessSource = 'SITE_GO' | 'SITE_DETAIL' | 'SITE_CARD';

export type SiteAccessTargetKind = 'SITE' | 'FEED' | 'SITEMAP' | 'LINK_PAGE' | 'ARTICLE';

export interface SiteAccessPayload {
  source: SiteAccessSource;
  targetKind: SiteAccessTargetKind;
}

export interface SiteAccessNavigateInput extends SiteAccessPayload {
  siteId: string;
  href: string;
  newTab?: boolean;
}
