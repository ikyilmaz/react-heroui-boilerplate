import type { FilterExpression } from '../types/FilterExpression'

/** Joins the defined expressions with `and` / `or`; `undefined` when there are none. */
export function combineFilters(
  filters: (FilterExpression | undefined | null)[],
  operator: 'and' | 'or' = 'and',
): FilterExpression | undefined {
  const defined = filters.filter((f): f is FilterExpression => !!f && (typeof f === 'function' || f.length > 0))
  if (defined.length === 0) return undefined
  if (defined.length === 1) return defined[0]
  const result: unknown[] = []
  defined.forEach((f, i) => {
    if (i) result.push(operator)
    result.push(f)
  })
  return result
}
