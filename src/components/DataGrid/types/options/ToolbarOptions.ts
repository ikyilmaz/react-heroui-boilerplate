import type { ToolbarItem } from './ToolbarItem'
import type { ToolbarItemName } from './ToolbarItemName'

export interface ToolbarOptions<TRow> {
  /** @default shown when it has items */
  visible?: boolean
  disabled?: boolean
  /** @default ['addRowButton', 'applyFilterButton', 'searchPanel'] (those that apply) */
  items?: (ToolbarItemName | ToolbarItem<TRow>)[]
}
