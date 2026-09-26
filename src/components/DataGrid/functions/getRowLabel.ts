import { compileGetter } from '../data/functions/compileGetter'
import type { RowKey } from '../data/types/RowKey'

export function getRowLabel<TRow>(
  expr: string | ((rowData: TRow) => string) | undefined,
  rowData: TRow,
  key: RowKey,
): string {
  if (typeof expr === 'function') return expr(rowData)
  if (expr) return String(compileGetter<TRow>(expr)(rowData) ?? key)
  return String(key)
}
