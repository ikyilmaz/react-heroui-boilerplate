import { NUMBER_FORMATS } from '../constants/predefinedFormats'
import type { Format } from '../types/Format'
import type { PredefinedFormat } from '../types/PredefinedFormat'
import { getLdmlNumberOptions } from './getLdmlNumberOptions'
import { getPredefinedNumberOptions } from './getPredefinedNumberOptions'

/**
 * The Intl options a number editor can show for a format. No format: the plain number, no
 * grouping (as DevExtreme's NumberBox). A literal `'%'` affix maps to the percent unit, so
 * 0–100 values read "%45" in the editor too.
 */
export function getNumberFormatOptions(format: Format | undefined): Intl.NumberFormatOptions | undefined {
  if (format === undefined) return { useGrouping: false, maximumFractionDigits: 20 }
  if (typeof format === 'function') return undefined
  if (typeof format === 'string') {
    if (NUMBER_FORMATS.has(format as PredefinedFormat))
      return getPredefinedNumberOptions(format as PredefinedFormat)
    const { options, percent, prefix, suffix } = getLdmlNumberOptions(format)
    if (percent) return { ...options, style: 'percent' }
    if (prefix.trim() === '%' || suffix.trim() === '%')
      return { ...options, style: 'unit', unit: 'percent', unitDisplay: 'narrow' }
    return options
  }
  return format.type ? getPredefinedNumberOptions(format.type, format.precision, format.currency) : undefined
}
