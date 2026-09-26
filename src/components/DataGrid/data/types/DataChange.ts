import type { RowKey } from './RowKey'

/**
 * One pending or pushed change. For `update`, `data` holds only the modified fields — exactly
 * what `setCellValue` wrote into `newData`.
 */
export interface DataChange<TRow = unknown> {
  type: 'insert' | 'update' | 'remove'
  key: RowKey
  data?: Partial<TRow>
}
