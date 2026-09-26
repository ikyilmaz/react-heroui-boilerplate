import type { DataGridProps } from './DataGridProps'

/** The editing callbacks of the grid's props. */
export type EditingEvents<TRow extends object> = Pick<
  DataGridProps<TRow>,
  | 'onInitNewRow'
  | 'onEditingStart'
  | 'onEditCanceling'
  | 'onEditCanceled'
  | 'onSaving'
  | 'onSaved'
  | 'onRowInserting'
  | 'onRowInserted'
  | 'onRowUpdating'
  | 'onRowUpdated'
  | 'onRowRemoving'
  | 'onRowRemoved'
>
