import type { CollectionEntry } from 'astro:content';

export type DocCategoryId = 'development' | 'contribution' | 'standards';

export interface DocCategoryMeta {
  id: DocCategoryId;
  title: string;
  summary: string;
  href: string;
}

const docCategoryById: Record<string, DocCategoryId> = {
  'getting-started': 'development',
  'contribution-guide': 'contribution',
  'collection-standards': 'standards',
  'data-field-guide': 'standards',
};

export const docCategories: DocCategoryMeta[] = [
  {
    id: 'development',
    title: '开发接入文档',
    summary: '用于了解项目结构、模块边界与接入流程。',
    href: '/docs#development',
  },
  {
    id: 'contribution',
    title: '贡献文档',
    summary: '覆盖提交流程、协作方式与参与入口。',
    href: '/docs#contribution',
  },
  {
    id: 'standards',
    title: '标准指南文档',
    summary: '说明收录规则、字段口径与维护标准。',
    href: '/docs#standards',
  },
];

export const getDocCategoryId = (entryId: string): DocCategoryId =>
  docCategoryById[entryId] ?? 'standards';

export const groupDocsByCategory = (entries: CollectionEntry<'docs'>[]) =>
  docCategories.map((category) => ({
    ...category,
    entries: entries.filter((entry) => getDocCategoryId(entry.id) === category.id),
  }));
