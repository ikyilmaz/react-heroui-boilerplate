import { getLdmlNumberOptions } from './getLdmlNumberOptions'
import { getNumberFormatter } from './getNumberFormatter'

/** LDML number pattern: `'#,##0.00'`, `'₺ #,##0'`, `'0.#%'`… */
export function formatLdmlNumber(value: number, pattern: string, locale: string): string {
  const { options, prefix, suffix, percent } = getLdmlNumberOptions(pattern)
  const formatted = getNumberFormatter(locale, options).format(percent ? value * 100 : value)
  return `${prefix}${formatted}${suffix}`
}
