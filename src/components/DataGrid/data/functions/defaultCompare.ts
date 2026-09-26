import type { LangParams } from '../types/LangParams'
import { getCollator } from './getCollator'
import { toComparable } from './toComparable'

/**
 * Default sort comparison, ascending. `null` / `undefined` are smaller than any value (so they
 * come first ascending and last descending), strings use the locale's collation.
 */
export function defaultCompare(value1: unknown, value2: unknown, langParams?: LangParams): number {
  const aEmpty = value1 === null || value1 === undefined
  const bEmpty = value2 === null || value2 === undefined
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? -1 : 1
  if (typeof value1 === 'string' && typeof value2 === 'string')
    return getCollator(langParams?.locale, {
      sensitivity: 'accent',
      ...langParams?.collatorOptions,
    }).compare(value1, value2)
  const a = toComparable(value1) as number
  const b = toComparable(value2) as number
  return a < b ? -1 : a > b ? 1 : 0
}
