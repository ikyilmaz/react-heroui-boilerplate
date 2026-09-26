import type { FilterExpression } from '../data/types/FilterExpression'
import type { GridColumn } from '../types/GridColumn'
import { addDays } from './addDays'
import { combineFilters } from '../data/functions/combineFilters'
import { isDateType } from './isDateType'
import { startOfDay } from './startOfDay'
import { toDate } from './toDate'

/** `between [start, end]`, inclusive; either end may be missing. Date ends cover whole days. */
export function getBetweenFilterExpression<TRow>(
  column: GridColumn<TRow>,
  filterValue: unknown,
): FilterExpression | undefined {
  if (!Array.isArray(filterValue)) return undefined
  const [start, end] = filterValue as unknown[]
  const { selector } = column
  if (isDateType(column.dataType)) {
    const s = toDate(start)
    const e = toDate(end)
    return combineFilters([
      s ? [selector, '>=', startOfDay(s)] : undefined,
      e ? [selector, '<', addDays(startOfDay(e), 1)] : undefined,
    ])
  }
  const has = (v: unknown) => v !== null && v !== undefined && v !== ''
  return combineFilters([
    has(start) ? [selector, '>=', start] : undefined,
    has(end) ? [selector, '<=', end] : undefined,
  ])
}
