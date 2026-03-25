import type { AutoFillArchitectureHint } from '../types/site-auto-fill.types';

const META_PATTERN =
  /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']*)["'][^>]*>/gi;

const GENERATOR_MATCHERS: Array<{
  pattern: RegExp;
  field: 'program_name' | 'framework_name';
  value: string;
}> = [
  { pattern: /wordpress/i, field: 'program_name', value: 'WordPress' },
  { pattern: /discuz!?/i, field: 'program_name', value: 'Discuz' },
  { pattern: /dedecms|dede/i, field: 'program_name', value: 'DedeCMS' },
  { pattern: /typecho/i, field: 'program_name', value: 'Typecho' },
  { pattern: /z-?blog(?:php)?/i, field: 'program_name', value: 'Z-Blog' },
  { pattern: /hexo/i, field: 'program_name', value: 'Hexo' },
  { pattern: /hugo/i, field: 'program_name', value: 'Hugo' },
  { pattern: /jekyll/i, field: 'program_name', value: 'Jekyll' },
  { pattern: /astro/i, field: 'framework_name', value: 'Astro' },
  { pattern: /next\.?js/i, field: 'framework_name', value: 'Next.js' },
  { pattern: /nuxt/i, field: 'framework_name', value: 'Nuxt' },
  { pattern: /gatsby/i, field: 'framework_name', value: 'Gatsby' },
  { pattern: /eleventy|11ty/i, field: 'framework_name', value: 'Eleventy' },
];

const LANGUAGE_HINTS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /wp-content|wordpress/i, value: 'PHP' },
  { pattern: /discuz|dedecms|dede|z-?blog|typecho/i, value: 'PHP' },
  { pattern: /hexo|next|nuxt|astro|gatsby|eleventy|11ty/i, value: 'JavaScript' },
  { pattern: /hugo/i, value: 'Go' },
  { pattern: /jekyll/i, value: 'Ruby' },
];

export function detectArchitecture(html: string): AutoFillArchitectureHint | null {
  const generatorValues: string[] = [];

  for (const match of html.matchAll(META_PATTERN)) {
    if ((match[1] ?? '').toLowerCase() !== 'generator') {
      continue;
    }

    generatorValues.push(match[2] ?? '');
  }

  const combinedText = [html, ...generatorValues].join('\n');
  const result: {
    program_name?: string;
    framework_name?: string;
    language_name?: string;
  } = {};

  for (const matcher of GENERATOR_MATCHERS) {
    if (!result[matcher.field] && matcher.pattern.test(combinedText)) {
      result[matcher.field] = matcher.value;
    }
  }

  for (const matcher of LANGUAGE_HINTS) {
    if (!result.language_name && matcher.pattern.test(combinedText)) {
      result.language_name = matcher.value;
    }
  }

  if (Object.keys(result).length === 0) {
    return null;
  }

  return {
    program_id: null,
    program_name: result.program_name ?? null,
    program_is_open_source: null,
    stacks: [
      ...(result.framework_name
        ? [
            {
              category: 'FRAMEWORK' as const,
              catalog_id: null,
              name: result.framework_name,
              name_normalized: result.framework_name.toLowerCase(),
            },
          ]
        : []),
      ...(result.language_name
        ? [
            {
              category: 'LANGUAGE' as const,
              catalog_id: null,
              name: result.language_name,
              name_normalized: result.language_name.toLowerCase(),
            },
          ]
        : []),
    ],
    website_url: null,
    repo_url: null,
  };
}
