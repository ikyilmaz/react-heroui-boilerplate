import type { CSSProperties } from 'react'
import type { GridColumn } from '../types/GridColumn'

/** `width` / `minWidth`: numbers are pixels, strings are used as they are (`'13%'`). */
export function getColumnStyle<TRow>(column: GridColumn<TRow>): CSSProperties | undefined {
  if (column.width === undefined && column.minWidth === undefined) return undefined
  return { width: column.width, minWidth: column.minWidth }
}
