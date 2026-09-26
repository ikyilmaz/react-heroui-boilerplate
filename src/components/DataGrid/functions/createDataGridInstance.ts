import type { FilterExpression } from '../data/types/FilterExpression'
import type { RowKey } from '../data/types/RowKey'
import type { ColumnState } from '../types/ColumnState'
import type { DataGridInstance } from '../types/DataGridInstance'
import type { FilterType } from '../types/FilterType'
import type { GridRuntime } from '../types/GridRuntime'

/**
 * An instance over `getRuntime`. The grid makes two: a stable one (`ref.current.instance()`,
 * event handlers, rows) reading the latest committed render, and one per render for templates
 * rendered during that render (toolbar items), so they see the state being rendered.
 */
export function createDataGridInstance<TRow extends object>(
  getRuntime: () => GridRuntime<TRow>,
): DataGridInstance<TRow> {
  const r = getRuntime
  const instance = {
    addRow: () => r().editing.addRow(),
    editRow: (rowIndex: number) => r().editing.editRow(rowIndex),
    editCell: (rowIndex: number, id: string) => r().editing.editCell(rowIndex, id),
    closeEditCell: () => r().editing.closeEditCell(),
    saveEditData: () => r().editing.saveEditData(),
    cancelEditData: () => r().editing.cancelEditData(),
    deleteRow: (rowIndex: number) => r().editing.deleteRow(rowIndex),
    cellValue: (rowIndex: number, id: string, ...value: [unknown?]) =>
      r().editing.cellValue(rowIndex, id, ...value),
    hasEditData: () => r().editing.hasEditData(),

    getVisibleRows: () => r().rows,
    getRowIndexByKey: (key: RowKey) => r().rows.findIndex((row) => row.key === key),
    getKeyByRowIndex: (rowIndex: number) => r().rows[rowIndex]?.key,
    keyOf: (rowData: TRow) => r().keyOf(rowData),
    byKey: (key: RowKey) => r().store.byKey(key),

    getSelectedRowKeys: () => r().selection.getSelectedRowKeys(),
    getSelectedRowsData: () => r().selection.getSelectedRowsData(),
    selectRows: (keys: RowKey[], preserve: boolean) => r().selection.selectRows(keys, preserve),
    deselectRows: (keys: RowKey[]) => r().selection.deselectRows(keys),
    selectRowsByIndexes: (indexes: number[]) =>
      r().selection.selectRows(
        indexes.map((i) => r().rows[i]?.key).filter((k): k is RowKey => k !== undefined),
        false,
      ),
    selectAll: () => r().selection.selectAll(),
    deselectAll: () => r().selection.deselectAll(),
    clearSelection: () => r().selection.clearSelection(),
    isRowSelected: (key: RowKey) => r().selection.isRowSelected(key),

    filter: (...args: [FilterExpression | undefined] | []) => {
      if (!args.length) return r().dataSourceFilter
      r().setDataSourceFilter(args[0])
      return undefined
    },
    getCombinedFilter: () => r().combinedFilter,
    clearFilter: (filterType?: FilterType) => r().clearFilter(filterType),
    searchByText: (text: string) => r().setSearchText(text),
    clearSorting: () => r().columns.clearSorting(),

    columnCount: () => r().columns.visibleColumns.length,
    getVisibleColumns: () => r().columns.visibleColumns,
    columnOption: (id: number | string, ...rest: [(string | Partial<ColumnState>)?, unknown?]) =>
      r().columns.columnOption(id, ...rest),

    pageIndex: (...args: [number] | []) => {
      if (!args.length) return r().data.pageIndex
      r().setPageIndex(args[0])
      return undefined
    },
    pageSize: (...args: [number] | []) => {
      if (!args.length) return r().pageSize
      r().setPageSize(args[0])
      return undefined
    },
    pageCount: () => r().data.pageCount,
    totalCount: () => r().data.totalCount,

    refresh: () => r().refresh(),
    getDataSource: () => ({
      store: () => r().store,
      items: () => r().data.pageItems,
      totalCount: () => r().data.totalCount,
    }),
  }
  return instance as unknown as DataGridInstance<TRow>
}
