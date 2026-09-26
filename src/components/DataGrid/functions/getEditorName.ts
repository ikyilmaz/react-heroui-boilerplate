import type { EditorName } from '../types/EditorName'
import type { GridColumn } from '../types/GridColumn'
import { isDateType } from './isDateType'

export function getEditorName<TRow>(column: GridColumn<TRow>, parentType: 'dataRow' | 'filterRow'): EditorName {
  if (column.lookup) return 'dxSelectBox'
  if (column.dataType === 'boolean') return parentType === 'filterRow' ? 'dxSelectBox' : 'dxCheckBox'
  if (column.dataType === 'number') return 'dxNumberBox'
  if (isDateType(column.dataType)) return 'dxDateBox'
  return 'dxTextBox'
}
