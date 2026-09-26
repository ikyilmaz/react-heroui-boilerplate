import type { Column } from '../types/Column'
import { inferDataType } from './inferDataType'
import { compileGetter } from '../data/functions/compileGetter'

/**
 * What column normalization depends on in the data: the inferred types of columns without a
 * `dataType` (and the field names, for generated columns). Re-normalizing only when this string
 * changes keeps column objects — and the memoized rows depending on them — stable across edits.
 */
export function getColumnInferenceKey<TRow>(
  columns: (Column<TRow> | string)[] | undefined,
  sampleItem: TRow | undefined,
): string {
  if (sampleItem === undefined) return ''
  if (!columns) return Object.keys(sampleItem as object).join('|')
  return columns
    .map((c) => {
      const column = typeof c === 'string' ? { dataField: c } : c
      if (column.dataType || column.type) return ''
      const value = column.calculateCellValue
        ? column.calculateCellValue(sampleItem)
        : column.dataField
          ? compileGetter<TRow>(column.dataField)(sampleItem)
          : undefined
      return inferDataType(value)
    })
    .join('|')
}
