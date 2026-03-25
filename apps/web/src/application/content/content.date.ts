export function formatZhDate(input: Date | string | undefined): string {
  if (!input) {
    return '';
  }

  const date = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
