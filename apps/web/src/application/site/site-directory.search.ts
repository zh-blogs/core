import {
  createEmptyStructuredSearchState,
  isStructuredArrayField,
  normalizeSiteDirectoryBoolean,
  SITE_DIRECTORY_SEARCH_HINTS,
  type SiteDirectoryStructuredSearchState,
} from '@/application/site/site-directory.search.meta';

export { SITE_DIRECTORY_SEARCH_HINTS };
export type {
  SiteDirectorySearchHint,
  SiteDirectoryStructuredSearchState,
} from '@/application/site/site-directory.search.meta';

function skipWhitespace(text: string, index: number): number {
  let next = index;

  while (next < text.length && /\s/.test(text[next]!)) {
    next += 1;
  }

  return next;
}

function readValue(
  text: string,
  index: number,
): {
  value: string;
  nextIndex: number;
} {
  if (text[index] === '"') {
    let cursor = index + 1;

    while (cursor < text.length && text[cursor] !== '"') {
      cursor += 1;
    }

    return {
      value: text.slice(index + 1, cursor),
      nextIndex: cursor < text.length && text[cursor] === '"' ? cursor + 1 : cursor,
    };
  }

  let cursor = index;

  while (cursor < text.length && !/\s/.test(text[cursor]!)) {
    cursor += 1;
  }

  return {
    value: text.slice(index, cursor),
    nextIndex: cursor,
  };
}

function pushArrayValue(target: string[], value: string) {
  const normalized = value.trim();

  if (!normalized || target.includes(normalized)) {
    return;
  }

  target.push(normalized);
}

function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

function consumeStructuredToken(
  state: SiteDirectoryStructuredSearchState,
  text: string,
  index: number,
): number {
  const fieldStart = index;

  while (index < text.length && /[a-z]/i.test(text[index]!)) {
    index += 1;
  }

  const field = text.slice(fieldStart, index).toLowerCase();

  if (index < text.length && text[index] === ':' && field) {
    const { value, nextIndex } = readValue(text, index + 1);

    if (isStructuredArrayField(field)) {
      pushArrayValue(state[field], value);
      return nextIndex;
    }

    if (field === 'rss' || field === 'featured') {
      const normalized = normalizeSiteDirectoryBoolean(value);

      if (normalized !== null) {
        state[field] = normalized;
        return nextIndex;
      }
    }

    state.keywords.push(text.slice(fieldStart, nextIndex));
    return nextIndex;
  }

  const { value, nextIndex } = readValue(text, fieldStart);

  if (value.trim()) {
    state.keywords.push(value.trim());
  }

  return nextIndex;
}

function consumeQuotedKeyword(
  state: SiteDirectoryStructuredSearchState,
  text: string,
  index: number,
): number {
  const { value, nextIndex } = readValue(text, index);

  if (value.trim()) {
    state.keywords.push(value.trim());
  }

  return nextIndex;
}

export function parseSiteDirectoryStructuredSearch(
  input: string,
): SiteDirectoryStructuredSearchState {
  const state = createEmptyStructuredSearchState();
  const text = input.trim();

  if (!text) {
    return state;
  }

  let index = 0;

  while (index < text.length) {
    index = skipWhitespace(text, index);

    if (index >= text.length) {
      break;
    }

    if (text[index] === '"') {
      index = consumeQuotedKeyword(state, text, index);
      continue;
    }

    index = consumeStructuredToken(state, text, index);
  }

  return state;
}

export function serializeSiteDirectoryStructuredSearch(
  state: SiteDirectoryStructuredSearchState,
): string {
  const parts: string[] = [];

  for (const keyword of state.keywords) {
    parts.push(quoteIfNeeded(keyword));
  }

  for (const value of state.main) {
    parts.push(`main:${quoteIfNeeded(value)}`);
  }

  for (const value of state.sub) {
    parts.push(`sub:${quoteIfNeeded(value)}`);
  }

  for (const value of state.warning) {
    parts.push(`warning:${quoteIfNeeded(value)}`);
  }

  for (const value of state.program) {
    parts.push(`program:${quoteIfNeeded(value)}`);
  }

  for (const value of state.site) {
    parts.push(`site:${quoteIfNeeded(value)}`);
  }

  for (const value of state.domain) {
    parts.push(`domain:${quoteIfNeeded(value)}`);
  }

  for (const value of state.access) {
    parts.push(`access:${quoteIfNeeded(value)}`);
  }

  if (state.rss !== null) {
    parts.push(`rss:${state.rss ? 'true' : 'false'}`);
  }

  if (state.featured !== null) {
    parts.push(`featured:${state.featured ? 'true' : 'false'}`);
  }

  return parts.join(' ').trim();
}

export function appendSiteDirectorySearchSnippet(input: string, snippet: string): string {
  const prefix = input.trimEnd();

  if (!prefix) {
    return snippet;
  }

  if (prefix.endsWith(snippet)) {
    return prefix;
  }

  return `${prefix} ${snippet}`;
}
