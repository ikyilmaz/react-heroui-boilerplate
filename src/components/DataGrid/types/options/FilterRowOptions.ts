import type { ApplyFilterMode } from './ApplyFilterMode'
import type { OperationDescriptions } from './OperationDescriptions'

export interface FilterRowOptions {
  /** @default false */
  visible?: boolean
  /** `'onClick'` waits for the toolbar's "apply filter" button. @default 'auto' */
  applyFilter?: ApplyFilterMode
  applyFilterText?: string
  /** @default true */
  showOperationChooser?: boolean
  /** "All" entry of lookup and boolean filters. */
  showAllText?: string
  resetOperationText?: string
  betweenStartText?: string
  betweenEndText?: string
  operationDescriptions?: OperationDescriptions
}
