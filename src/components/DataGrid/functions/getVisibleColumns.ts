import type { ColumnState } from '../types/ColumnState'
import type { GridColumn } from '../types/GridColumn'

/** Visible columns, ordered by `visibleIndex` (then declaration order). */
export function getVisibleColumns<TRow>(
  columns: GridColumn<TRow>[],
  states: Record<string, ColumnState>,
): GridColumn<TRow>[] {
  return columns
    .filter((c) => states[c.name]?.visible ?? c.visible)
    .map((c, order) => ({ c, order, index: states[c.name]?.visibleIndex ?? c.visibleIndex }))
    .sort((a, b) => (a.index ?? a.order) - (b.index ?? b.order) || a.order - b.order)
    .map(({ c }) => c)
}
