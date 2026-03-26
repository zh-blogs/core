import { createComparableHttpUrlKey, isHttpUrl, trimText } from './site-submission.core';
import { normalizeStringList } from './site-submission.payload-common';
import type {
  ArchitectureInput,
  CreateSubmissionFormState,
  FeedDraft,
  FeedInput,
  FieldErrors,
} from './site-submission.types';

function normalizeArchitectureToken(value: string | null | undefined): string | null {
  const normalized = trimText(value ?? '');
  if (!normalized) {
    return null;
  }

  const compact = normalized.toLocaleLowerCase('zh-CN').replace(/[^\p{L}\p{N}]+/gu, '');

  return compact || normalized.toLocaleLowerCase('zh-CN');
}

function normalizeArchitectureItems(
  items:
    | Array<{
        category: 'FRAMEWORK' | 'LANGUAGE';
        catalog_id?: string | null;
        name?: string | null;
        name_normalized?: string | null;
      }>
    | null
    | undefined,
): Array<{
  category: 'FRAMEWORK' | 'LANGUAGE';
  catalog_id: string | null;
  name: string | null;
  name_normalized: string | null;
}> | null {
  if (!items || items.length === 0) {
    return null;
  }

  const uniqueByToken = new Set<string>();
  const normalized = items
    .map((item) => {
      const catalog_id = trimText(item.catalog_id ?? '') || null;
      const name = trimText(item.name ?? '') || null;
      const name_normalized =
        normalizeArchitectureToken(item.name_normalized ?? item.name ?? '') || null;

      return {
        category: item.category,
        catalog_id,
        name,
        name_normalized,
      };
    })
    .filter((item) => item.catalog_id || item.name)
    .filter((item) => {
      const token = `${item.category}:${item.name_normalized || item.catalog_id}`;

      if (!token || uniqueByToken.has(token)) {
        return false;
      }

      uniqueByToken.add(token);
      return true;
    });

  return normalized.length > 0 ? normalized : null;
}

function buildArchitectureStacks(
  frameworkIds: string[],
  frameworkCustomNames: string[],
  languageIds: string[],
  languageCustomNames: string[],
): ArchitectureInput['stacks'] {
  const items: NonNullable<ArchitectureInput['stacks']> = [
    ...normalizeStringList(frameworkIds).map((catalogId) => ({
      category: 'FRAMEWORK' as const,
      catalog_id: catalogId,
    })),
    ...normalizeStringList(frameworkCustomNames).map((name) => ({
      category: 'FRAMEWORK' as const,
      name,
      name_normalized: normalizeArchitectureToken(name),
    })),
    ...normalizeStringList(languageIds).map((catalogId) => ({
      category: 'LANGUAGE' as const,
      catalog_id: catalogId,
    })),
    ...normalizeStringList(languageCustomNames).map((name) => ({
      category: 'LANGUAGE' as const,
      name,
      name_normalized: normalizeArchitectureToken(name),
    })),
  ];

  return normalizeArchitectureItems(items);
}

export function normalizeArchitectureInput(input: ArchitectureInput): ArchitectureInput | null {
  const stacks = normalizeArchitectureItems(input.stacks);
  const programId = trimText(input.program_id ?? '') || null;
  const programName = trimText(input.program_name ?? '') || null;
  const repoUrl = trimText(input.repo_url ?? '') || null;
  const websiteUrl =
    trimText(input.website_url ?? '') || (!programId && programName && repoUrl ? repoUrl : null);
  const normalized: ArchitectureInput = {
    program_id: programId,
    program_name: programName,
    program_is_open_source:
      typeof input.program_is_open_source === 'boolean' ? input.program_is_open_source : null,
    stacks,
    website_url: websiteUrl,
    repo_url: repoUrl,
  };

  return normalized.program_id || normalized.program_name || stacks || websiteUrl || repoUrl
    ? normalized
    : null;
}

function buildArchitectureInput(
  input: ArchitectureInput,
  fieldErrors: FieldErrors,
): ArchitectureInput | null {
  const normalized = normalizeArchitectureInput(input);

  if (!normalized) {
    return null;
  }

  if ((normalized.program_name?.length ?? 0) > 128) {
    fieldErrors.architecture_program_name = '自定义程序名称不能超过 128 个字符。';
  }

  return normalized;
}

export function buildFeedInputs(
  drafts: FeedDraft[],
  defaultFeedUrl: string,
  fieldErrors: FieldErrors,
): { feed: FeedInput[]; defaultFeedUrl: string | null } {
  const normalized = drafts
    .map((draft) => ({
      ...draft,
      name: trimText(draft.name),
      url: trimText(draft.url),
    }))
    .filter((draft) => draft.url.length > 0);

  if (normalized.some((draft) => !isHttpUrl(draft.url))) {
    fieldErrors.feeds = '订阅地址必须是合法的 http 或 https 链接。';
    return {
      feed: [],
      defaultFeedUrl: null,
    };
  }

  const uniqueUrls = new Set<string>();

  for (const draft of normalized) {
    const comparableUrl = createComparableHttpUrlKey(draft.url);

    if (!comparableUrl) {
      fieldErrors.feeds = '订阅地址必须是合法的 http 或 https 链接。';
      return {
        feed: [],
        defaultFeedUrl: null,
      };
    }

    if (uniqueUrls.has(comparableUrl)) {
      fieldErrors.feeds = '订阅地址不能重复。';
      return {
        feed: [],
        defaultFeedUrl: null,
      };
    }

    uniqueUrls.add(comparableUrl);
  }

  if (normalized.length === 0) {
    return {
      feed: [],
      defaultFeedUrl: null,
    };
  }

  if (normalized.length > 1 && normalized.some((draft) => draft.name.length === 0)) {
    fieldErrors.feeds = '多个订阅地址时，请为每个订阅填写名称。';
    return {
      feed: [],
      defaultFeedUrl: null,
    };
  }

  const resolvedDefaultFeedUrl =
    normalized.length === 1 ? (normalized[0]?.url ?? null) : trimText(defaultFeedUrl) || null;

  if (!resolvedDefaultFeedUrl) {
    fieldErrors.default_feed_url = '请选择一个默认订阅地址。';
    return {
      feed: [],
      defaultFeedUrl: null,
    };
  }

  const matchedDefaultFeed = normalized.find(
    (draft) =>
      createComparableHttpUrlKey(draft.url) === createComparableHttpUrlKey(resolvedDefaultFeedUrl),
  );

  if (!matchedDefaultFeed) {
    fieldErrors.default_feed_url = '默认订阅地址必须来自当前订阅列表。';
    return {
      feed: [],
      defaultFeedUrl: null,
    };
  }

  return {
    feed: normalized.map((draft) => ({
      name:
        draft.name ||
        (normalized.length === 1 && draft.url === matchedDefaultFeed.url ? '默认订阅' : ''),
      url: draft.url,
    })),
    defaultFeedUrl: matchedDefaultFeed.url,
  };
}

export function buildArchitectureFromForm(
  form: Pick<
    CreateSubmissionFormState,
    | 'architecture_program_id'
    | 'architecture_program_name'
    | 'architecture_program_is_open_source'
    | 'architecture_framework_ids'
    | 'architecture_framework_custom_names'
    | 'architecture_language_ids'
    | 'architecture_language_custom_names'
    | 'architecture_website_url'
    | 'architecture_repo_url'
  >,
  fieldErrors: FieldErrors,
): ArchitectureInput | null {
  return buildArchitectureInput(
    {
      program_id: form.architecture_program_id,
      program_name: form.architecture_program_name,
      program_is_open_source: form.architecture_program_is_open_source,
      stacks: buildArchitectureStacks(
        form.architecture_framework_ids,
        form.architecture_framework_custom_names,
        form.architecture_language_ids,
        form.architecture_language_custom_names,
      ),
      website_url: form.architecture_website_url,
      repo_url: form.architecture_repo_url,
    },
    fieldErrors,
  );
}
