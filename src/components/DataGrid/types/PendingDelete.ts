import type { RowKey } from '../data/types/RowKey'

/** The row a delete confirmation is open for. */
export interface PendingDelete {
  key: RowKey
  rowLabel: string
}
