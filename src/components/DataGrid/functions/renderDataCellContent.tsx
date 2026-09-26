import type { ReactNode } from 'react'
import { CellText } from '../components/CellText'
import { CheckBoxEditor } from '../components/editors/CheckBoxEditor'
import type { ColumnCellTemplateData } from '../types/templates/ColumnCellTemplateData'
import { isDateType } from './isDateType'

/** `cellRender`, or the default display: text (formatted, highlighted), check box for booleans. */
export function renderDataCellContent<TRow>(cellInfo: ColumnCellTemplateData<TRow>): ReactNode {
  const { column, text, value } = cellInfo
  if (column.cellRender) return column.cellRender(cellInfo)
  if (column.dataType === 'boolean' && !column.lookup)
    return <CheckBoxEditor label={text} value={value} readOnly />
  if (column.dataType === 'number') return <CellText text={text} className="tabular-nums" />
  if (isDateType(column.dataType)) return <CellText text={text} color="muted" className="tabular-nums" />
  return <CellText text={text} />
}
