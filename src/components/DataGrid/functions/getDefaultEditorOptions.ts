import type { EditorOptions } from '../types/EditorOptions'
import type { GridColumn } from '../types/GridColumn'

/** The built-in editor's options for a column, `column.editorOptions` merged on top. */
export function getDefaultEditorOptions<TRow>(
  column: GridColumn<TRow>,
  parentType: 'dataRow' | 'filterRow',
): EditorOptions {
  const base: EditorOptions = { showClearButton: true }
  if (column.lookup)
    Object.assign(base, {
      dataSource: column.lookup.dataSource,
      valueExpr: column.lookup.valueExpr,
      displayExpr: column.lookup.displayExpr,
      showClearButton: parentType === 'filterRow' || column.lookup.allowClearing,
    })
  else if (column.dataType === 'boolean' && parentType === 'filterRow')
    Object.assign(base, {
      dataSource: [
        { value: true, text: column.trueText },
        { value: false, text: column.falseText },
      ],
      valueExpr: 'value',
      displayExpr: 'text',
    })
  else if (column.dataType === 'number') Object.assign(base, { format: column.format, showSpinButtons: false })
  else if (column.dataType === 'date' || column.dataType === 'datetime')
    base.type = parentType === 'dataRow' && column.dataType === 'datetime' ? 'datetime' : 'date'
  return { ...base, ...column.editorOptions }
}
