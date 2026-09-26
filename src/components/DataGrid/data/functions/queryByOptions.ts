import type { LangParams } from '../types/LangParams'
import type { LoadOptions } from '../types/LoadOptions'
import { applySort } from './applySort'
import { compileCriteria } from './compileCriteria'

/** Local data processing: filter → sort → count → skip/take. */
export function queryByOptions<TRow>(
  items: readonly TRow[],
  options: LoadOptions<TRow> = {},
  langParams?: LangParams,
): { data: TRow[]; totalCount: number } {
  const filtered = options.filter
    ? items.filter(compileCriteria<TRow>(options.filter, langParams))
    : items
  const sorted = options.sort?.length ? applySort(filtered, options.sort, langParams) : [...filtered]
  const skip = options.skip ?? 0
  const data = options.take !== undefined ? sorted.slice(skip, skip + options.take) : sorted.slice(skip)
  return { data, totalCount: sorted.length }
}
