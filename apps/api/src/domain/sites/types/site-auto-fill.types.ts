import type { MultiFeed } from '@zhblogs/db';

export interface AutoFillArchitectureHint {
  program_id: string | null;
  program_name: string | null;
  program_is_open_source: boolean | null;
  stacks: Array<{
    category: 'FRAMEWORK' | 'LANGUAGE';
    catalog_id: string | null;
    name: string | null;
    name_normalized: string | null;
  }> | null;
  website_url: string | null;
  repo_url: string | null;
}

export interface SiteAutoFillResult {
  name: string;
  sign: string;
  feed_candidates: Array<Pick<MultiFeed, 'name' | 'url'>>;
  sitemap: string;
  link_page: string;
  architecture: AutoFillArchitectureHint | null;
  warnings?: string[];
}

export interface SiteAutoFillHints {
  feed_paths?: string[];
  sitemap_paths?: string[];
  link_page_paths?: string[];
}
