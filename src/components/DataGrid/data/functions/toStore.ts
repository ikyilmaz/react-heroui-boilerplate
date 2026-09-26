import { ArrayStore } from '../ArrayStore'
import type { Store } from '../types/Store'

/** An array becomes an `ArrayStore`, the way DevExtreme wraps arrays passed as `dataSource`. */
export function toStore<TRow extends object>(
  dataSource: TRow[] | Store<TRow>,
  keyExpr: string | undefined,
): Store<TRow> {
  return Array.isArray(dataSource) ? new ArrayStore<TRow>({ key: keyExpr, data: dataSource }) : dataSource
}
