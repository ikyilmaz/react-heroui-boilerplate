import type { FilterExpression } from './FilterExpression'
import type { SortDescriptor } from './SortDescriptor'

/** What the grid asks a store for. Only the parts named in `remoteOperations` are sent. */
export interface LoadOptions<TRow = unknown> {
  filter?: FilterExpression
  sort?: SortDescriptor<TRow>[]
  skip?: number
  take?: number
  requireTotalCount?: boolean
}
