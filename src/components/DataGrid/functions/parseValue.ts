import type { GridColumn } from '../types/GridColumn'
import { isDateType } from './isDateType'
import { isPercentFormat } from './isPercentFormat'
import { parseDate } from './parseDate'
import { parseNumber } from './parseNumber'

/** Turns typed text into a value of the column's type (search); `undefined` when it cannot. */
export function parseValue<TRow>(column: GridColumn<TRow>, text: string, locale: string): unknown {
  const { format } = column
  if (typeof format === 'object' && format.parser) return format.parser(text)
  if (column.dataType === 'number') {
    const n = parseNumber(text, locale)
    return n !== undefined && isPercentFormat(format) ? n / 100 : n
  }
  if (isDateType(column.dataType)) return parseDate(text, locale)
  if (column.dataType === 'boolean') {
    const t = text.trim().toLocaleLowerCase(locale)
    if (t === column.trueText.toLocaleLowerCase(locale)) return true
    if (t === column.falseText.toLocaleLowerCase(locale)) return false
    return undefined
  }
  return text
}
