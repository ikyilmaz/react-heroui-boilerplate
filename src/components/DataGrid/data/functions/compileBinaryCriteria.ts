import type { LangParams } from '../types/LangParams'
import type { Selector } from '../types/Selector'
import { compileGetter } from './compileGetter'
import { toComparable } from './toComparable'

/** `[selector, operation, value]` → predicate. String operations are case-insensitive. */
export function compileBinaryCriteria<TRow>(
  selector: Selector<TRow>,
  operation: string,
  value: unknown,
  langParams?: LangParams,
): (item: TRow) => boolean {
  const getter = compileGetter(selector)
  const locale = langParams?.locale
  const target = toComparable(value, locale)
  const op = operation.toLowerCase()

  switch (op) {
    case '=':
      return (item) => toComparable(getter(item), locale) == target
    case '<>':
      return (item) => toComparable(getter(item), locale) != target
    case '<':
    case '<=':
    case '>':
    case '>=':
      return (item) => {
        const v = toComparable(getter(item), locale)
        // Empty values take no part in ordering comparisons
        if (v === null || v === undefined || target === null || target === undefined) return false
        const a = v as number
        const b = target as number
        return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b
      }
    case 'contains':
    case 'notcontains':
    case 'startswith':
    case 'endswith': {
      const needle = String(target ?? '')
      return (item) => {
        const hay = String(toComparable(getter(item), locale) ?? '')
        if (op === 'contains') return hay.includes(needle)
        if (op === 'notcontains') return !hay.includes(needle)
        if (op === 'startswith') return hay.startsWith(needle)
        return hay.endsWith(needle)
      }
    }
    default:
      throw new Error(`E4003: unknown filter operation "${operation}"`)
  }
}
