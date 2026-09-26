import type { PredefinedFormat } from './PredefinedFormat'

export interface FormatObject {
  type?: PredefinedFormat
  /** Fraction digits of number formats. */
  precision?: number
  /** Currency code of `'currency'`; defaults to `config().defaultCurrency`. */
  currency?: string
  /** Custom formatting; wins over `type`. */
  formatter?: (value: number | Date) => string
  /** Turns text back into a value (search, editors). */
  parser?: (text: string) => number | Date | undefined
}
