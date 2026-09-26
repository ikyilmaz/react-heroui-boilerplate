import type { FilterExpression } from '../data/types/FilterExpression'
import type { RowKey } from '../data/types/RowKey'
import type { Store } from '../data/types/Store'
import type { useColumnsController } from '../hooks/useColumnsController'
import type { useDataController } from '../hooks/useDataController'
import type { useEditingController } from '../hooks/useEditingController'
import type { useSelectionController } from '../hooks/useSelectionController'
import type { RowObject } from './RowObject'

/** Everything the instance methods reach, refreshed on every render. */
export interface GridRuntime<TRow extends object> {
  store: Store<TRow>
  keyOf: (item: TRow) => RowKey
  columns: ReturnType<typeof useColumnsController<TRow>>
  data: ReturnType<typeof useDataController<TRow>>
  selection: ReturnType<typeof useSelectionController<TRow>>
  editing: ReturnType<typeof useEditingController<TRow>>
  rows: RowObject<TRow>[]
  pageSize: number
  setPageIndex: (index: number) => void
  setPageSize: (size: number) => void
  dataSourceFilter: FilterExpression | undefined
  setDataSourceFilter: (filter: FilterExpression | undefined) => void
  combinedFilter: FilterExpression | undefined
  setSearchText: (text: string) => void
  clearFilter: (type?: string) => void
  getItemByKey: (key: RowKey) => TRow | undefined
  refresh: () => Promise<void>
}
