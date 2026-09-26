import type { ToolbarItem } from '../types/options/ToolbarItem'
import type { ToolbarItemName } from '../types/options/ToolbarItemName'
import type { ToolbarOptions } from '../types/options/ToolbarOptions'

/** Toolbar items as objects; the default set when none are given (DevExtreme's order). */
export function getToolbarItems<TRow>(
  toolbar: ToolbarOptions<TRow> | undefined,
  available: Record<ToolbarItemName, boolean>,
): ToolbarItem<TRow>[] {
  const items = toolbar?.items ?? (['addRowButton', 'applyFilterButton', 'searchPanel'] as const)
  return items
    .map((item) => (typeof item === 'string' ? { name: item } : item))
    .filter((item) => item.visible !== false && (!item.name || available[item.name]))
}
