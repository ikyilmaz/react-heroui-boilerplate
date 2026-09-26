import type { ReactNode } from 'react'
import type { DataGridInstance } from '../DataGridInstance'
import type { IconComponent } from '../IconComponent'

/** `widget: 'dxButton'` item options. */
export interface ToolbarButtonOptions<TRow> {
  icon?: IconComponent | ReactNode
  hint?: string
  text?: string
  disabled?: boolean
  /** @default 'normal' */
  type?: 'normal' | 'default' | 'danger' | 'success'
  /** @default 'contained' */
  stylingMode?: 'contained' | 'outlined' | 'text'
  onClick?: (e: { component: DataGridInstance<TRow> }) => void
}
