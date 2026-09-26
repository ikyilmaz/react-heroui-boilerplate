import type { FilterExpression } from '../data/types/FilterExpression'
import type { Selector } from '../data/types/Selector'
import type { Column } from './Column'
import type { DataType } from './DataType'
import type { EditorOptions } from './EditorOptions'
import type { FilterOperation } from './FilterOperation'
import type { FilterTarget } from './FilterTarget'
import type { GridColumnLookup } from './GridColumnLookup'
import type { HorizontalAlignment } from './HorizontalAlignment'

/**
 * A column after normalization: defaults filled in, getters compiled. This is `this` inside
 * `calculateFilterExpression` / `setCellValue` and what `columnOption` reads.
 */
export interface GridColumn<TRow = unknown>
  extends Omit<
    Column<TRow>,
    | 'calculateCellValue'
    | 'calculateFilterExpression'
    | 'setCellValue'
    | 'lookup'
    | 'editorOptions'
  > {
  index: number
  name: string
  caption: string
  dataType: DataType
  alignment: HorizontalAlignment
  visible: boolean
  allowSorting: boolean
  allowFiltering: boolean
  allowSearch: boolean
  allowEditing: boolean
  showEditorAlways: boolean
  filterOperations: FilterOperation[]
  /** The operation a filter starts with and returns to on reset. */
  defaultSelectedFilterOperation: FilterOperation | undefined
  lookup?: GridColumnLookup
  editorOptions: EditorOptions
  trueText: string
  falseText: string
  /** What filter expressions and remote sorting refer to: the dataField, or a getter. */
  selector: Selector<TRow>

  calculateCellValue(rowData: TRow): unknown
  calculateFilterExpression(
    filterValue: unknown,
    selectedFilterOperation: FilterOperation | undefined,
    target: FilterTarget,
  ): FilterExpression | undefined
  defaultCalculateFilterExpression(
    filterValue: unknown,
    selectedFilterOperation: FilterOperation | undefined,
    target: FilterTarget,
  ): FilterExpression | undefined
  setCellValue(newData: Partial<TRow>, value: unknown, currentRowData: TRow): void | Promise<void>
  defaultSetCellValue(newData: Partial<TRow>, value: unknown, currentRowData: TRow): void
}
