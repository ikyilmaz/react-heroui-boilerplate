import type { ReactNode } from 'react'
import type { ToolbarItemTemplateData } from '../templates/ToolbarItemTemplateData'
import type { ToolbarButtonOptions } from './ToolbarButtonOptions'
import type { ToolbarItemLocation } from './ToolbarItemLocation'
import type { ToolbarItemName } from './ToolbarItemName'

export interface ToolbarItem<TRow> {
  /** A built-in item. */
  name?: ToolbarItemName
  /** @default 'after' */
  location?: ToolbarItemLocation
  /** @default true */
  visible?: boolean
  disabled?: boolean
  cssClass?: string
  widget?: 'dxButton'
  options?: ToolbarButtonOptions<TRow>
  render?: (e: ToolbarItemTemplateData<TRow>) => ReactNode
}
