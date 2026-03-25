export function normalizeReferenceId(reference: string | { id: string }): string {
  return typeof reference === 'string' ? reference : reference.id;
}

export function buildReferenceLabelMap<T>(
  entries: T[],
  getId: (entry: T) => string,
  getLabel: (entry: T) => string,
): Map<string, string> {
  return new Map(entries.map((entry) => [getId(entry), getLabel(entry)]));
}

export function mapReferenceLabels(
  refs: Array<string | { id: string }>,
  labelMap: Map<string, string>,
): string[] {
  return refs.map((ref) => {
    const id = normalizeReferenceId(ref);

    return labelMap.get(id) || id;
  });
}
