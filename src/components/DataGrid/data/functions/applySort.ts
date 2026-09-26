import type { LangParams } from '../types/LangParams'
import type { SortDescriptor } from '../types/SortDescriptor'
import { compileGetter } from './compileGetter'
import { defaultCompare } from './defaultCompare'

/** Returns a sorted copy (stable; the first descriptor wins, later ones break ties). */
export function applySort<TRow>(
  items: readonly TRow[],
  sort: SortDescriptor<TRow>[] | undefined,
  langParams?: LangParams,
): TRow[] {
  if (!sort?.length) return [...items]
  const rules = sort.map((s) => ({
    getter: compileGetter(s.selector),
    dir: s.desc ? -1 : 1,
    compare: s.compare ?? ((a: unknown, b: unknown) => defaultCompare(a, b, langParams)),
  }))
  return [...items].sort((x, y) => {
    for (const rule of rules) {
      const result = rule.compare(rule.getter(x), rule.getter(y))
      if (result) return result * rule.dir
    }
    return 0
  })
}
