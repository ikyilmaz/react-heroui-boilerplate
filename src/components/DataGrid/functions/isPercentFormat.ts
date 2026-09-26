import type { Format } from '../types/Format'
import { NUMBER_FORMATS } from '../constants/predefinedFormats'
import type { PredefinedFormat } from '../types/PredefinedFormat'
import { getLdmlNumberOptions } from './getLdmlNumberOptions'

/** Formats that show value × 100 (so parsing divides by 100). */
export function isPercentFormat(format: Format | undefined): boolean {
  if (typeof format === 'string')
    return NUMBER_FORMATS.has(format as PredefinedFormat)
      ? format === 'percent'
      : getLdmlNumberOptions(format).percent
  return typeof format === 'object' && format.type === 'percent'
}
