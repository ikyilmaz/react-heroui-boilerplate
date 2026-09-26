import { compileGetter } from '../data/functions/compileGetter'
import type { ColumnLookup } from '../types/ColumnLookup'
import type { GridColumnLookup } from '../types/GridColumnLookup'

export function createLookup(lookup: ColumnLookup): GridColumnLookup {
  const valueOf = lookup.valueExpr ? compileGetter(lookup.valueExpr) : (item: unknown) => item
  const { displayExpr } = lookup
  const displayOf =
    typeof displayExpr === 'function'
      ? (item: unknown) => displayExpr(item)
      : displayExpr
        ? (item: unknown) => String(compileGetter(displayExpr)(item) ?? '')
        : (item: unknown) => String(item ?? '')
  const byValue = new Map<unknown, string>()
  for (const item of lookup.dataSource) byValue.set(valueOf(item), displayOf(item))
  return {
    ...lookup,
    allowClearing: lookup.allowClearing ?? false,
    valueOf,
    displayOf,
    calculateCellValue: (value) => byValue.get(value),
  }
}
