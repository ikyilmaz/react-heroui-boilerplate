import type { CustomizeTextCellInfo } from '../types/CustomizeTextCellInfo'
import type { GridColumn } from '../types/GridColumn'
import { formatValue } from './formatValue'
import { getDefaultFormat } from './getDefaultFormat'
import { isDateType } from './isDateType'
import { toDate } from './toDate'

/** A cell's text: the display value formatted, then `customizeText`. */
export function getCellText<TRow>(
  column: GridColumn<TRow>,
  value: unknown,
  displayValue: unknown,
  target: CustomizeTextCellInfo['target'],
  locale: string,
): string {
  let valueText: string
  if (column.dataType === 'boolean' && !column.lookup && typeof displayValue === 'boolean')
    valueText = displayValue ? column.trueText : column.falseText
  else {
    const shown = isDateType(column.dataType) && !column.lookup ? (toDate(displayValue) ?? displayValue) : displayValue
    valueText = formatValue(shown, column.format ?? getDefaultFormat(column.dataType), locale)
  }
  return column.customizeText ? column.customizeText({ value, valueText, target }) : valueText
}
