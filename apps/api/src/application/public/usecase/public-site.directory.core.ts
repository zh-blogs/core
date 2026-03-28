import type { PublicSiteBaseRow } from '@/application/public/usecase/public-site.types';

export function createSiteSlug(site: Pick<PublicSiteBaseRow, 'bid' | 'name' | 'id'>): string {
  return site.id;
}

export function compareNames(left: string, right: string): number {
  return left.localeCompare(right, 'zh-CN');
}

export function stableHash(value: string): number {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}
