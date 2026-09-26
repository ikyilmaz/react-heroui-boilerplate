import type { DataGridInstance } from '../types/DataGridInstance'
import type { EditorPreparingEvent } from '../types/events/EditorPreparingEvent'
import type { GridColumn } from '../types/GridColumn'
import type { RowObject } from '../types/RowObject'
import { getDefaultEditorOptions } from './getDefaultEditorOptions'
import { getEditorName } from './getEditorName'

/** The built-in editor and its options, after `onEditorPreparing` had its say. */
export function prepareEditor<TRow>({
  column,
  parentType,
  value,
  setValue,
  row,
  component,
  onEditorPreparing,
}: {
  column: GridColumn<TRow>
  parentType: 'dataRow' | 'filterRow'
  value: unknown
  setValue: (value: unknown) => void
  row?: RowObject<TRow>
  component: DataGridInstance<TRow>
  onEditorPreparing?: (e: EditorPreparingEvent<TRow>) => void
}): EditorPreparingEvent<TRow> {
  const e: EditorPreparingEvent<TRow> = {
    component,
    parentType,
    dataField: column.dataField,
    value,
    setValue,
    editorName: getEditorName(column, parentType),
    editorOptions: getDefaultEditorOptions(column, parentType),
    readOnly: false,
    disabled: false,
    cancel: false,
    row,
  }
  onEditorPreparing?.(e)
  return e
}
