import type { ReactNode } from 'react'
import type { FilterExpression } from '../data/types/FilterExpression'
import type { ColumnButton } from './ColumnButton'
import type { ColumnButtonName } from './ColumnButtonName'
import type { ColumnLookup } from './ColumnLookup'
import type { ColumnType } from './ColumnType'
import type { CustomizeTextCellInfo } from './CustomizeTextCellInfo'
import type { DataType } from './DataType'
import type { EditorOptions } from './EditorOptions'
import type { FilterOperation } from './FilterOperation'
import type { FilterTarget } from './FilterTarget'
import type { Format } from './Format'
import type { GridColumn } from './GridColumn'
import type { HorizontalAlignment } from './HorizontalAlignment'
import type { SortOrder } from './SortOrder'
import type { ColumnCellTemplateData } from './templates/ColumnCellTemplateData'
import type { ColumnEditCellTemplateData } from './templates/ColumnEditCellTemplateData'
import type { ColumnFilterCellTemplateData } from './templates/ColumnFilterCellTemplateData'
import type { ColumnHeaderCellTemplateData } from './templates/ColumnHeaderCellTemplateData'

/**
 * A column, with DevExtreme's option names. Callbacks are declared as methods, so a
 * `Column<Order>` still fits where a looser column type is expected.
 */
export interface Column<TRow = unknown> {
  dataField?: string
  /** Identifies a column without `dataField`. @default dataField */
  name?: string
  /** @default dataField in words ("requestNo" → "Request No") */
  caption?: string
  /** Inferred from the first row when omitted. */
  dataType?: DataType
  type?: ColumnType
  /** `type: 'buttons'`: the buttons, in order. */
  buttons?: (ColumnButtonName | ColumnButton<TRow>)[]
  format?: Format
  /** @default 'right' for numbers, 'center' for booleans, 'left' otherwise */
  alignment?: HorizontalAlignment
  width?: number | string
  minWidth?: number
  /** @default true */
  visible?: boolean
  visibleIndex?: number
  /** Classes of every cell of the column (header, filter and data cells). */
  cssClass?: string

  /** @default true */
  allowSorting?: boolean
  /** @default true */
  allowFiltering?: boolean
  /** @default allowFiltering */
  allowSearch?: boolean
  /** @default true for columns with a dataField */
  allowEditing?: boolean

  sortOrder?: SortOrder
  sortIndex?: number
  sortingMethod?(value1: unknown, value2: unknown): number

  filterValue?: unknown
  selectedFilterOperation?: FilterOperation
  /** Operations of the filter row's operation chooser. */
  filterOperations?: FilterOperation[]

  calculateCellValue?(rowData: TRow): unknown
  /** A field name or a function; what cells show instead of the value. */
  calculateDisplayValue?: string | ((rowData: TRow) => unknown)
  /** A field name or a function; what the column is sorted by. */
  calculateSortValue?: string | ((rowData: TRow) => unknown)
  /**
   * The filter this column contributes for a filter row value or a search text. Call
   * `this.defaultCalculateFilterExpression(...)` to extend the default.
   */
  calculateFilterExpression?(
    this: GridColumn<TRow>,
    filterValue: unknown,
    selectedFilterOperation: FilterOperation | undefined,
    target: FilterTarget,
  ): FilterExpression | undefined
  /** Writes an edited value into `newData` (only the changed fields). */
  setCellValue?(
    this: GridColumn<TRow>,
    newData: Partial<TRow>,
    value: unknown,
    currentRowData: TRow,
  ): void | Promise<void>
  customizeText?(cellInfo: CustomizeTextCellInfo): string

  lookup?: ColumnLookup
  editorOptions?: EditorOptions
  /** The editor stays open in every row. */
  showEditorAlways?: boolean
  trueText?: string
  falseText?: string

  cellRender?(cellInfo: ColumnCellTemplateData<TRow>): ReactNode
  editCellRender?(cellInfo: ColumnEditCellTemplateData<TRow>): ReactNode
  headerCellRender?(headerInfo: ColumnHeaderCellTemplateData<TRow>): ReactNode
  /** Not in DevExtreme: replaces the filter row editor. */
  filterCellRender?(filterInfo: ColumnFilterCellTemplateData<TRow>): ReactNode
}
