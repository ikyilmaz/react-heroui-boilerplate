import { isPlainObject } from './isPlainObject'

/**
 * Returns `target` with `values` deep-merged into it, without mutating either. Plain objects are
 * merged recursively (so `{ address: { city } }` keeps the other address fields); anything else
 * — Dates, arrays, class instances — is replaced.
 */
export function mergeValues<T>(target: T, values: Partial<T>): T {
  const result: Record<string, unknown> = { ...(target as Record<string, unknown>) }
  for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
    const current = result[key]
    result[key] = isPlainObject(current) && isPlainObject(value) ? mergeValues(current, value) : value
  }
  return result as T
}
