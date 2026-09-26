import { compileGetter } from '../data/functions/compileGetter'
import type { GridColumn } from '../types/GridColumn'

/** `calculateDisplayValue`, else the lookup's display text, else the value. */
export function getDisplayValue<TRow>(column: GridColumn<TRow>, rowData: TRow, value: unknown): unknown {
  const { calculateDisplayValue, lookup } = column
  if (typeof calculateDisplayValue === 'function') return calculateDisplayValue(rowData)
  if (typeof calculateDisplayValue === 'string') return compileGetter<TRow>(calculateDisplayValue)(rowData)
  if (lookup) return lookup.calculateCellValue(value) ?? value
  return value
}
