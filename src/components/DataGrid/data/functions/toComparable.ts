/**
 * Normalizes a value before comparison: dates by time, strings case-insensitively (locale-aware,
 * so Turkish İ/ı fold correctly).
 */
export function toComparable(value: unknown, locale?: string, caseSensitive = false): unknown {
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string' && !caseSensitive) return value.toLocaleLowerCase(locale)
  return value
}
