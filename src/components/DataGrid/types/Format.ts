import type { FormatObject } from './FormatObject'
import type { PredefinedFormat } from './PredefinedFormat'

/**
 * A predefined name (`'currency'`), an object (`{ type: 'fixedPoint', precision: 2 }`), a function,
 * or an LDML pattern (`'#,##0.00'`, `'dd.MM.yyyy HH:mm'`).
 */
export type Format =
  | PredefinedFormat
  | FormatObject
  | ((value: number | Date) => string)
  | (string & {})
