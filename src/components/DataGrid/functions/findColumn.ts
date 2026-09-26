import type { GridColumn } from '../types/GridColumn'

/** By index, name or dataField, as `columnOption(id)` accepts. */
export function findColumn<TRow>(columns: GridColumn<TRow>[], id: number | string): GridColumn<TRow> | undefined {
  if (typeof id === 'number') return columns[id]
  return columns.find((c) => c.name === id) ?? columns.find((c) => c.dataField === id)
}
