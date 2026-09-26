import type { Format } from '../types/Format'
import { formatDateValue } from './formatDateValue'
import { formatNumber } from './formatNumber'

/** DevExtreme's `formatValue`: numbers and dates through `format`, the rest as text. */
export function formatValue(value: unknown, format: Format | undefined, locale: string): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return formatNumber(value, format, locale)
  if (value instanceof Date) return formatDateValue(value, format, locale)
  return String(value)
}
