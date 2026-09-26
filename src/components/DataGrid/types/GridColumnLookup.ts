import type { ColumnLookup } from './ColumnLookup'

/** A lookup with its getters compiled. */
export interface GridColumnLookup extends ColumnLookup {
  allowClearing: boolean
  valueOf(item: unknown): unknown
  displayOf(item: unknown): string
  /** The display text of a stored value. */
  calculateCellValue(value: unknown): string | undefined
}
