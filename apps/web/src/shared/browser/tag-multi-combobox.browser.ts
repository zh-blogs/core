export interface ComboboxOption {
  id: string;
  name: string;
}

export function normalize(value: string): string {
  return value.trim();
}

export function normalizeKey(value: string): string {
  return normalize(value)
    .toLocaleLowerCase('zh-CN')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) {
    return true;
  }

  let cursor = 0;
  for (const char of haystack) {
    if (char === needle[cursor]) {
      cursor += 1;
      if (cursor === needle.length) {
        return true;
      }
    }
  }

  return false;
}

export function filterOptions(
  options: ComboboxOption[],
  normalizedQuery: string,
): ComboboxOption[] {
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) => {
    const lowerName = option.name.toLocaleLowerCase('zh-CN');
    const queryKey = normalizeKey(normalizedQuery);
    const nameKey = normalizeKey(option.name);

    if (lowerName.includes(normalizedQuery.toLocaleLowerCase('zh-CN'))) {
      return true;
    }

    if (!queryKey) {
      return false;
    }

    return (
      nameKey.startsWith(queryKey) || nameKey.includes(queryKey) || isSubsequence(queryKey, nameKey)
    );
  });
}

export function hasCustomConflict(
  normalizedQuery: string,
  selectedOptions: ComboboxOption[],
  customValues: string[],
  options: ComboboxOption[],
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const key = normalizeKey(normalizedQuery);

  if (!key) {
    return true;
  }

  const selectedOptionNameSet = new Set(selectedOptions.map((option) => normalizeKey(option.name)));
  const customNameSet = new Set(customValues.map((value) => normalizeKey(value)));
  const optionNameSet = new Set(options.map((option) => normalizeKey(option.name)));

  return selectedOptionNameSet.has(key) || customNameSet.has(key) || optionNameSet.has(key);
}
