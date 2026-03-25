import {
  collectSitemapCandidatesFromHtml,
  dedupeStrings,
  mergePaths,
} from '@/domain/sites/service/site-auto-fill-extractor.service';
import type { SiteAutoFillHints } from '@/domain/sites/types/site-auto-fill.types';
import { fetchText } from '@/infrastructure/sites/http/site-auto-fill-validator.service';

const DEFAULT_SITEMAP_PATHS = ['/sitemap.xml', '/sitemap_index.xml'];

const absolutizeUrl = (value: string, baseUrl: string): string => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return '';
  }
};

export async function collectSitemapCandidates(
  html: string,
  siteUrl: string,
  hints: SiteAutoFillHints = {},
): Promise<string[]> {
  const candidates: string[] = collectSitemapCandidatesFromHtml(html, siteUrl);

  try {
    const robotsUrl = absolutizeUrl('/robots.txt', siteUrl);
    const robots = await fetchText(robotsUrl);
    const sitemapLine = robots.split(/\r?\n/).find((line) => /^sitemap:/i.test(line.trim()));

    if (sitemapLine) {
      const sitemap = sitemapLine.replace(/^sitemap:/i, '').trim();
      candidates.push(absolutizeUrl(sitemap, siteUrl));
    }
  } catch {
    // ignore robots probe failures and continue with path hints
  }

  for (const path of mergePaths(hints.sitemap_paths, DEFAULT_SITEMAP_PATHS)) {
    candidates.push(absolutizeUrl(path, siteUrl));
  }

  return dedupeStrings(candidates);
}
