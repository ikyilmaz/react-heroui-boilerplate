import type { Format } from './Format'

/** Options of the built-in editors (a subset of the DevExtreme editors'). */
export interface EditorOptions {
  placeholder?: string
  showClearButton?: boolean
  readOnly?: boolean
  disabled?: boolean
  /** dxTextBox */
  maxLength?: number
  /** dxNumberBox */
  min?: number
  max?: number
  step?: number
  format?: Format
  showSpinButtons?: boolean
  /** dxDateBox */
  type?: 'date' | 'datetime'
  /** dxSelectBox */
  dataSource?: unknown[]
  valueExpr?: string
  displayExpr?: string | ((item: unknown) => string)
  [option: string]: unknown
}
