import { normalizeText } from '@/application/public/usecase/public-site.directory.core';
import type {
  DirectoryState,
  PublicSiteDirectoryQuery,
  StructuredArrayField,
  StructuredQueryState,
} from '@/application/public/usecase/public-site.types';

const DIRECTORY_RANDOM_FALLBACK_SEED = 'public-site-directory';

const STRUCTURED_ARRAY_FIELDS: StructuredArrayField[] = [
  'main',
  'sub',
  'warning',
  'program',
  'site',
  'domain',
  'access',
];

const BOOLEAN_ALIASES = new Map<string, boolean>([
  ['1', true],
  ['true', true],
  ['yes', true],
  ['on', true],
  ['y', true],
  ['有', true],
  ['是', true],
  ['0', false],
  ['false', false],
  ['no', false],
  ['off', false],
  ['n', false],
  ['无', false],
  ['否', false],
]);

function isStructuredArrayField(field: string): field is StructuredArrayField {
  return STRUCTURED_ARRAY_FIELDS.includes(field as StructuredArrayField);
}

function createEmptyStructuredQueryState(): StructuredQueryState {
  return {
    keywords: [],
    main: [],
    sub: [],
    warning: [],
    program: [],
    site: [],
    domain: [],
    access: [],
    rss: null,
    featured: null,
  };
}

function normalizeStructuredBoolean(value: string): boolean | null {
  return BOOLEAN_ALIASES.get(normalizeText(value)) ?? null;
}

function skipWhitespace(text: string, index: number): number {
  let next = index;

  while (next < text.length && /\s/.test(text[next]!)) {
    next += 1;
  }

  return next;
}

function readStructuredValue(
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

function pushFieldValue(state: StructuredQueryState, field: StructuredArrayField, value: string) {
  const normalized = value.trim();

  if (!normalized || state[field].includes(normalized)) {
    return;
  }

  state[field].push(normalized);
}

function consumeStructuredField(
  state: StructuredQueryState,
  text: string,
  fieldStart: number,
  field: string,
  value: string,
  nextIndex: number,
): number {
  if (isStructuredArrayField(field)) {
    pushFieldValue(state, field, value);
    return nextIndex;
  }

  if (field === 'rss') {
    const normalized = normalizeStructuredBoolean(value);

    if (normalized !== null) {
      state.rss = normalized;
      return nextIndex;
    }
  }

  if (field === 'featured') {
    const normalized = normalizeStructuredBoolean(value);

    if (normalized !== null) {
      state.featured = normalized;
      return nextIndex;
    }
  }

  state.keywords.push(text.slice(fieldStart, nextIndex).trim());
  return nextIndex;
}

function consumeStructuredToken(state: StructuredQueryState, text: string, index: number): number {
  const fieldStart = index;

  while (index < text.length && /[a-z]/i.test(text[index]!)) {
    index += 1;
  }

  const field = text.slice(fieldStart, index).toLowerCase();

  if (index < text.length && text[index] === ':' && field) {
    const { value, nextIndex } = readStructuredValue(text, index + 1);
    return consumeStructuredField(state, text, fieldStart, field, value, nextIndex);
  }

  const { value, nextIndex } = readStructuredValue(text, fieldStart);

  if (value.trim()) {
    state.keywords.push(value.trim());
  }

  return nextIndex;
}

function consumeQuotedKeyword(state: StructuredQueryState, text: string, index: number): number {
  const { value, nextIndex } = readStructuredValue(text, index);

  if (value.trim()) {
    state.keywords.push(value.trim());
  }

  return nextIndex;
}

function tokenizeStructuredQuery(input: string): StructuredQueryState {
  const state = createEmptyStructuredQueryState();
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

function mergeUnique(values: Array<string | undefined>, extra: string[] = []): string[] {
  return [
    ...new Set([
      ...values
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim()),
      ...extra.map((value) => value.trim()).filter(Boolean),
    ]),
  ];
}

export function normalizeDirectoryQuery(input: PublicSiteDirectoryQuery): DirectoryState {
  const parsed = tokenizeStructuredQuery(input.q ?? '');
  const page = Math.max(1, Number.isFinite(input.page) ? Number(input.page) : 1);
  const pageSize = Math.min(
    48,
    Math.max(12, Number.isFinite(input.pageSize) ? Number(input.pageSize) : 24),
  );
  const sort: DirectoryState['sort'] =
    input.sort === 'updated' ||
    input.sort === 'joined' ||
    input.sort === 'visits' ||
    input.sort === 'articles'
      ? input.sort
      : null;
  const random = sort ? false : input.random !== false;

  return {
    ...input,
    q: input.q?.trim() ?? '',
    main: mergeUnique(input.main ?? [], parsed.main),
    sub: mergeUnique(input.sub ?? [], parsed.sub),
    warning: mergeUnique(input.warning ?? [], parsed.warning),
    program: mergeUnique(input.program ?? [], parsed.program),
    site: parsed.site,
    domain: parsed.domain,
    access: parsed.access,
    page,
    pageSize,
    random,
    randomSeed: input.randomSeed?.trim() || DIRECTORY_RANDOM_FALLBACK_SEED,
    statusMode: input.statusMode === 'abnormal' ? 'abnormal' : 'normal',
    sort,
    order: input.order === 'asc' ? 'asc' : 'desc',
    keywords: parsed.keywords.map(normalizeText).filter(Boolean),
    rss: parsed.rss,
    featured: parsed.featured,
  };
}
