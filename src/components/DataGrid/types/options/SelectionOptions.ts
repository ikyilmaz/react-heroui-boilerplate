import type { SelectAllMode } from './SelectAllMode'
import type { SelectionMode } from './SelectionMode'
import type { ShowCheckBoxesMode } from './ShowCheckBoxesMode'

export interface SelectionOptions {
  /** @default 'none' */
  mode?: SelectionMode
  /** @default true */
  allowSelectAll?: boolean
  /** @default 'allPages' */
  selectAllMode?: SelectAllMode
  /** `'none'` hides the check box column of `multiple` mode. @default 'onClick' */
  showCheckBoxesMode?: ShowCheckBoxesMode
}
