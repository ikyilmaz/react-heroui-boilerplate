import { combineFilters } from '../data/functions/combineFilters'
import type { FilterExpression } from '../data/types/FilterExpression'
import type { GridColumn } from '../types/GridColumn'
import { parseValue } from './parseValue'

/** Matches nothing (a search nothing can match must hide every row). */
const NOTHING: FilterExpression = ['!', []]

/**
 * The search panel's filter, as DevExtreme builds it: text columns `contains`, lookup columns `=`
 * each value whose display text contains the term, other columns `=` the term parsed into their
 * type (columns it does not parse for are skipped). Joined with `or`.
 */
export function getSearchExpression<TRow>(
  columns: GridColumn<TRow>[],
  text: string,
  { searchVisibleColumnsOnly, locale }: { searchVisibleColumnsOnly: boolean; locale: string },
  isVisible: (column: GridColumn<TRow>) => boolean,
): FilterExpression | undefined {
  const needle = text.trim()
  if (!needle) return undefined
  const folded = needle.toLocaleLowerCase(locale)
  const parts: (FilterExpression | undefined)[] = []
  for (const column of columns) {
    if (column.type || !column.allowSearch) continue
    if (searchVisibleColumnsOnly && !isVisible(column)) continue
    if (column.lookup) {
      for (const item of column.lookup.dataSource)
        if (column.lookup.displayOf(item).toLocaleLowerCase(locale).includes(folded))
          parts.push(column.calculateFilterExpression(column.lookup.valueOf(item), '=', 'search'))
    } else if (column.dataType === 'string' || column.dataType === 'object') {
      parts.push(column.calculateFilterExpression(needle, 'contains', 'search'))
    } else {
      const value = parseValue(column, needle, locale)
      if (value !== undefined) parts.push(column.calculateFilterExpression(value, '=', 'search'))
    }
  }
  return combineFilters(parts, 'or') ?? NOTHING
}
