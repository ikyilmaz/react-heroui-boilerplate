import { DEFAULT_COLUMN_BUTTONS } from '../constants/defaultColumnButtons'
import type { Column } from '../types/Column'
import type { GridColumn } from '../types/GridColumn'
import { normalizeColumn } from './normalizeColumn'

interface NormalizeColumnsOptions<TRow> {
  sampleItem: TRow | undefined
  /** `selection.mode: 'multiple'` with check boxes: a selection column is added first. */
  selectionColumn: boolean
  /** Editing buttons are needed: a buttons column is added last. */
  commandColumn: boolean
}

/**
 * The grid's columns: the given ones (or one per field of the first row), plus the command
 * columns DevExtreme adds on its own when they are not declared.
 */
export function normalizeColumns<TRow>(
  columns: (Column<TRow> | string)[] | undefined,
  { sampleItem, selectionColumn, commandColumn }: NormalizeColumnsOptions<TRow>,
): GridColumn<TRow>[] {
  let inputs: (Column<TRow> | string)[] =
    columns ?? (sampleItem ? Object.keys(sampleItem as object) : [])
  const declared = (type: string) => inputs.some((c) => typeof c !== 'string' && c.type === type)
  if (selectionColumn && !declared('selection')) inputs = [{ type: 'selection' }, ...inputs]
  if (commandColumn && !declared('buttons'))
    inputs = [...inputs, { type: 'buttons', buttons: DEFAULT_COLUMN_BUTTONS }]
  return inputs
    .filter((c) => selectionColumn || typeof c === 'string' || c.type !== 'selection')
    .map((c, i) => normalizeColumn(c, i, sampleItem))
}
