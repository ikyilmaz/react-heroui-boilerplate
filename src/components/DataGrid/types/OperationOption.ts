import type { FilterOperation } from './FilterOperation'
import type { IconComponent } from './IconComponent'

/** One entry of the operation chooser. */
export interface OperationOption {
  id: FilterOperation
  text: string
  icon: IconComponent
}
