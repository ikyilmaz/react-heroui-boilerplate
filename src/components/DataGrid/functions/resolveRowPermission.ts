import type { RowPermission } from '../types/options/RowPermission'
import type { RowObject } from '../types/RowObject'

export function resolveRowPermission<TRow>(permission: RowPermission<TRow> | undefined, row: RowObject<TRow>): boolean {
  return typeof permission === 'function' ? permission({ row }) : !!permission
}
