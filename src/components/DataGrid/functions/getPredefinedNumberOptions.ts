import { localizationState } from '../localization/localizationState'
import type { PredefinedFormat } from '../types/PredefinedFormat'

/** Intl options of a predefined number format; `undefined` for the scaled ones (thousands…). */
export function getPredefinedNumberOptions(
  type: PredefinedFormat,
  precision?: number,
  currency?: string,
): Intl.NumberFormatOptions | undefined {
  const digits =
    precision === undefined ? {} : { minimumFractionDigits: precision, maximumFractionDigits: precision }
  switch (type) {
    case 'currency':
      return { style: 'currency', currency: currency ?? localizationState.defaultCurrency, ...digits }
    case 'fixedPoint':
      return { minimumFractionDigits: precision ?? 0, maximumFractionDigits: precision ?? 0 }
    case 'decimal':
      return { useGrouping: false, maximumFractionDigits: 0, minimumIntegerDigits: precision || 1 }
    case 'percent':
      return { style: 'percent', minimumFractionDigits: precision ?? 0, maximumFractionDigits: precision ?? 0 }
    case 'exponential':
      return { notation: 'scientific', maximumFractionDigits: precision ?? 1 }
    case 'largeNumber':
      return { notation: 'compact', maximumFractionDigits: precision ?? 0 }
    default:
      return undefined
  }
}
