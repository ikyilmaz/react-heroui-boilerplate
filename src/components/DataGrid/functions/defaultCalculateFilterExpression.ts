import type { FilterExpression } from '../data/types/FilterExpression'
import type { FilterOperation } from '../types/FilterOperation'
import type { FilterTarget } from '../types/FilterTarget'
import type { GridColumn } from '../types/GridColumn'
import { getBetweenFilterExpression } from './getBetweenFilterExpression'
import { getDateFilterExpression } from './getDateFilterExpression'
import { isDateType } from './isDateType'
import { isFilterValueEmpty } from './isFilterValueEmpty'
import { toDate } from './toDate'

/**
 * DevExtreme's default: `[selector, operation, value]`, with `between` expanded into a range and
 * dates compared by day. Called with the column as `this`.
 */
export function defaultCalculateFilterExpression<TRow>(
  this: GridColumn<TRow>,
  filterValue: unknown,
  selectedFilterOperation: FilterOperation | undefined,
  _target: FilterTarget,
): FilterExpression | undefined {
  if (selectedFilterOperation === 'between') return getBetweenFilterExpression(this, filterValue)
  if (isFilterValueEmpty(filterValue)) return undefined
  const operation = selectedFilterOperation ?? this.defaultSelectedFilterOperation ?? '='
  if (isDateType(this.dataType) && !this.lookup) {
    const date = toDate(filterValue)
    if (date) return getDateFilterExpression(this.selector, operation, date)
  }
  return [this.selector, operation, filterValue]
}
