import { DATE_FORMATS } from '../constants/predefinedFormats'
import type { Format } from '../types/Format'
import type { PredefinedFormat } from '../types/PredefinedFormat'
import { formatLdmlDate } from './formatLdmlDate'
import { getDateTimeFormatter } from './getDateTimeFormatter'
import { getPredefinedDateOptions } from './getPredefinedDateOptions'

export function formatDateValue(date: Date, format: Format | undefined, locale: string): string {
  if (format === undefined) return getDateTimeFormatter(locale, { dateStyle: 'short' }).format(date)
  if (typeof format === 'function') return format(date)
  if (typeof format === 'string' && !DATE_FORMATS.has(format as PredefinedFormat))
    return formatLdmlDate(date, format, locale)
  const { type, formatter } = typeof format === 'string' ? { type: format as PredefinedFormat, formatter: undefined } : format
  if (formatter) return formatter(date)
  if (type === 'quarter' || type === 'quarterAndYear') {
    const quarter = `Q${Math.floor(date.getMonth() / 3) + 1}`
    return type === 'quarter' ? quarter : `${quarter} ${date.getFullYear()}`
  }
  if (type === 'millisecond') return String(date.getMilliseconds())
  const options = type ? getPredefinedDateOptions(type) : undefined
  return getDateTimeFormatter(locale, options ?? { dateStyle: 'short' }).format(date)
}
