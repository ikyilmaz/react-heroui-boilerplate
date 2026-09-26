import type { FilterOperation } from './FilterOperation'
import type { KeyHandler } from './KeyHandler'

export interface FilterCellHandlers {
  onValueChange: (value: unknown) => void
  onOperationChange: (operation: FilterOperation | undefined) => void
  onReset: () => void
  onKeyDown: KeyHandler
}
