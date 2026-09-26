import type { DataGridInstance } from './DataGridInstance'

/** What the grid's `ref` receives, as in `devextreme-react`: `ref.current.instance()`. */
export interface DataGridRef<TRow> {
  instance(): DataGridInstance<TRow>
}
