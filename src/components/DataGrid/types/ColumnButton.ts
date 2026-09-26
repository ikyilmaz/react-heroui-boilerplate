import type { ReactNode } from 'react'
import type { ColumnButtonClickEvent } from './events/ColumnButtonClickEvent'
import type { ColumnButtonName } from './ColumnButtonName'
import type { IconComponent } from './IconComponent'
import type { RowObject } from './RowObject'

/** A button of a `type: 'buttons'` column. */
export interface ColumnButton<TRow> {
  /** A built-in button to customize (its hint, icon or visibility). */
  name?: ColumnButtonName
  hint?: string
  icon?: IconComponent | ReactNode
  text?: string
  cssClass?: string
  visible?: boolean | ((e: { row: RowObject<TRow> }) => boolean)
  disabled?: boolean | ((e: { row: RowObject<TRow> }) => boolean)
  onClick?: (e: ColumnButtonClickEvent<TRow>) => void
}
