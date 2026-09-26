import { NUMBER_FORMATS } from '../constants/predefinedFormats'
import type { Format } from '../types/Format'
import type { PredefinedFormat } from '../types/PredefinedFormat'
import { formatLdmlNumber } from './formatLdmlNumber'
import { getNumberFormatter } from './getNumberFormatter'
import { getPredefinedNumberOptions } from './getPredefinedNumberOptions'

const SCALES: Partial<Record<PredefinedFormat, [number, string]>> = {
  thousands: [1e3, 'K'],
  millions: [1e6, 'M'],
  billions: [1e9, 'B'],
  trillions: [1e12, 'T'],
}

export function formatNumber(value: number, format: Format | undefined, locale: string): string {
  if (format === undefined) return getNumberFormatter(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(value)
  if (typeof format === 'function') return format(value)
  if (typeof format === 'string' && !NUMBER_FORMATS.has(format as PredefinedFormat))
    return formatLdmlNumber(value, format, locale)
  const { type, precision, currency, formatter } =
    typeof format === 'string' ? { type: format as PredefinedFormat } : format
  if (formatter) return formatter(value)
  if (!type) return String(value)
  const scale = SCALES[type]
  if (scale) {
    const digits = { minimumFractionDigits: precision ?? 0, maximumFractionDigits: precision ?? 0 }
    return `${getNumberFormatter(locale, digits).format(value / scale[0])}${scale[1]}`
  }
  const options = getPredefinedNumberOptions(type, precision, currency)
  return options ? getNumberFormatter(locale, options).format(value) : String(value)
}
