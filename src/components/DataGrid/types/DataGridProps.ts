import type { Ref } from 'react'
import type { FilterExpression } from '../data/types/FilterExpression'
import type { RowKey } from '../data/types/RowKey'
import type { Store } from '../data/types/Store'
import type { Column } from './Column'
import type { DataGridClassNames } from './DataGridClassNames'
import type { DataGridRef } from './DataGridRef'
import type { ContentReadyEvent } from './events/ContentReadyEvent'
import type { DataErrorOccurredEvent } from './events/DataErrorOccurredEvent'
import type { EditCanceledEvent } from './events/EditCanceledEvent'
import type { EditCancelingEvent } from './events/EditCancelingEvent'
import type { EditingStartEvent } from './events/EditingStartEvent'
import type { EditorPreparingEvent } from './events/EditorPreparingEvent'
import type { InitializedEvent } from './events/InitializedEvent'
import type { InitNewRowEvent } from './events/InitNewRowEvent'
import type { OptionChangedEvent } from './events/OptionChangedEvent'
import type { RowInsertedEvent } from './events/RowInsertedEvent'
import type { RowInsertingEvent } from './events/RowInsertingEvent'
import type { RowRemovedEvent } from './events/RowRemovedEvent'
import type { RowRemovingEvent } from './events/RowRemovingEvent'
import type { RowUpdatedEvent } from './events/RowUpdatedEvent'
import type { RowUpdatingEvent } from './events/RowUpdatingEvent'
import type { SavedEvent } from './events/SavedEvent'
import type { SavingEvent } from './events/SavingEvent'
import type { SelectionChangedEvent } from './events/SelectionChangedEvent'
import type { EditingOptions } from './options/EditingOptions'
import type { FilterRowOptions } from './options/FilterRowOptions'
import type { LoadPanelOptions } from './options/LoadPanelOptions'
import type { PagerOptions } from './options/PagerOptions'
import type { PagingOptions } from './options/PagingOptions'
import type { RemoteOperations } from './options/RemoteOperations'
import type { SearchPanelOptions } from './options/SearchPanelOptions'
import type { SelectionOptions } from './options/SelectionOptions'
import type { SortingOptions } from './options/SortingOptions'
import type { ToolbarOptions } from './options/ToolbarOptions'

/**
 * The grid's options, named as in DevExtreme's DataGrid. Options that change while the grid is
 * used (`paging.pageIndex`, `searchPanel.text`, `selectedRowKeys`, column `filterValue` /
 * `sortOrder`, `editing.changes`…) start from the prop and follow it when it changes;
 * `onOptionChanged` reports every change made inside the grid.
 */
export interface DataGridProps<TRow extends object> {
  ref?: Ref<DataGridRef<TRow>>

  /** An array (wrapped in an `ArrayStore`) or a store. */
  dataSource?: TRow[] | Store<TRow>
  /** Key field of array data sources; stores bring their own. */
  keyExpr?: string
  /** Generated from the first row when omitted. */
  columns?: (Column<TRow> | string)[]
  /** @default false */
  remoteOperations?: boolean | RemoteOperations
  /** Extra filter applied on top of the filter row and search. */
  filterValue?: FilterExpression

  filterRow?: FilterRowOptions
  searchPanel?: SearchPanelOptions
  paging?: PagingOptions
  pager?: PagerOptions
  selection?: SelectionOptions
  selectedRowKeys?: RowKey[]
  defaultSelectedRowKeys?: RowKey[]
  sorting?: SortingOptions
  editing?: EditingOptions<TRow>
  toolbar?: ToolbarOptions<TRow>
  loadPanel?: LoadPanelOptions

  noDataText?: string
  /** @default false */
  hoverStateEnabled?: boolean
  /** @default false */
  showBorders?: boolean
  /** @default true */
  showColumnLines?: boolean
  /** @default false */
  showRowLines?: boolean
  /** @default false */
  rowAlternationEnabled?: boolean
  /** @default false */
  wordWrapEnabled?: boolean
  disabled?: boolean
  width?: number | string
  height?: number | string
  elementAttr?: { id?: string; class?: string }

  /** Not in DevExtreme: accessible name of the table (required by React Aria). */
  'aria-label': string
  'aria-describedby'?: string
  /**
   * Not in DevExtreme: short name of a row in accessible names and announcements
   * (`'#152356'`). @default the key
   */
  rowLabelExpr?: string | ((rowData: TRow) => string)
  /**
   * Not in DevExtreme's public API: how long typed filter, search and cell text waits (ms)
   * before it is applied. @default 300
   */
  updateValueTimeout?: number
  /** Not in DevExtreme: class slots, merged onto the defaults with `cn`. */
  classNames?: Partial<DataGridClassNames>

  onInitialized?: (e: InitializedEvent<TRow>) => void
  onContentReady?: (e: ContentReadyEvent<TRow>) => void
  onOptionChanged?: (e: OptionChangedEvent<TRow>) => void
  onSelectionChanged?: (e: SelectionChangedEvent<TRow>) => void
  onSelectedRowKeysChange?: (keys: RowKey[]) => void
  onInitNewRow?: (e: InitNewRowEvent<TRow>) => void
  onEditingStart?: (e: EditingStartEvent<TRow>) => void
  onEditCanceling?: (e: EditCancelingEvent<TRow>) => void
  onEditCanceled?: (e: EditCanceledEvent<TRow>) => void
  onSaving?: (e: SavingEvent<TRow>) => void
  onSaved?: (e: SavedEvent<TRow>) => void
  onRowInserting?: (e: RowInsertingEvent<TRow>) => void
  onRowInserted?: (e: RowInsertedEvent<TRow>) => void
  onRowUpdating?: (e: RowUpdatingEvent<TRow>) => void
  onRowUpdated?: (e: RowUpdatedEvent<TRow>) => void
  onRowRemoving?: (e: RowRemovingEvent<TRow>) => void
  onRowRemoved?: (e: RowRemovedEvent<TRow>) => void
  onEditorPreparing?: (e: EditorPreparingEvent<TRow>) => void
  onDataErrorOccurred?: (e: DataErrorOccurredEvent<TRow>) => void
}
