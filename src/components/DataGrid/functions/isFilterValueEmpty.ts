/** No filter: nothing typed, or a `between` range with neither end. */
export function isFilterValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (Array.isArray(value)) return value.every((v) => v === null || v === undefined || v === '')
  return false
}
