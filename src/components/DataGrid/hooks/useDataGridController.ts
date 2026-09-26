import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../constants/defaultPageSize'
import { combineFilters } from '../data/functions/combineFilters'
import { toStore } from '../data/functions/toStore'
import type { FilterExpression } from '../data/types/FilterExpression'
import type { RowKey } from '../data/types/RowKey'
import { buildRows } from '../functions/buildRows'
import { createDataGridInstance } from '../functions/createDataGridInstance'
import { createInstanceHandle } from '../functions/createInstanceHandle'
import { getObjectKey } from '../functions/getObjectKey'
import { getRowLabel } from '../functions/getRowLabel'
import { getSearchExpression } from '../functions/getSearchExpression'
import { normalizeRemoteOperations } from '../functions/normalizeRemoteOperations'
import { formatMessage } from '../localization/formatMessage'
import { locale as getLocale } from '../localization/locale'
import type { DataGridProps } from '../types/DataGridProps'
import type { FilterOperation } from '../types/FilterOperation'
import type { GridRuntime } from '../types/GridRuntime'
import { useColumnsController } from './useColumnsController'
import { useDataController } from './useDataController'
import { useEditingController } from './useEditingController'
import { useLatestRef } from './useLatestRef'
import { useOptionState } from './useOptionState'
import { useSelectionController } from './useSelectionController'
import { useStableRows } from './useStableRows'
import { useStableValue } from './useStableValue'
import { useStatusMessage } from './useStatusMessage'
import { useStoreItems } from './useStoreItems'

const NO_DATA: never[] = []

/**
 * The grid's brain: builds the store, runs the columns, data, selection and editing controllers
 * (as DevExtreme's modules do), exposes the instance through `ref`, and hands the view what it
 * renders.
 */
export function useDataGridController<TRow extends object>(props: DataGridProps<TRow>) {
  const [handle] = useState(() => createInstanceHandle<TRow>())
  const { instance: component, getRuntime } = handle
  const propsRef = useLatestRef(props)
  const locale = getLocale()

  useImperativeHandle(props.ref, () => ({ instance: () => component }), [component])

  const emitOptionChanged = useCallback(
    (name: string, fullName: string, value: unknown, previousValue: unknown) =>
      propsRef.current.onOptionChanged?.({ component, name, fullName, value, previousValue }),
    [component, propsRef],
  )
  const reportError = useCallback(
    (error: Error) => {
      const handler = propsRef.current.onDataErrorOccurred
      if (handler) handler({ component, error })
      else console.error(error)
    },
    [component, propsRef],
  )
  const [statusStore, announce] = useStatusMessage()

  // Inline option objects are new on every parent render; compare them by content
  const filterRow = useStableValue(props.filterRow) ?? {}
  const searchPanel = useStableValue(props.searchPanel) ?? {}
  const paging = useStableValue(props.paging) ?? {}
  const pager = useStableValue(props.pager) ?? {}
  const selection = useStableValue(props.selection) ?? {}
  const sorting = useStableValue(props.sorting) ?? {}
  const editing = useStableValue(props.editing) ?? {}
  const loadPanel = useStableValue(props.loadPanel) ?? {}
  const filterValue = useStableValue(props.filterValue)
  const remoteOperations = normalizeRemoteOperations(useStableValue(props.remoteOperations))
  const isRemote = remoteOperations.filtering || remoteOperations.sorting || remoteOperations.paging

  const store = useMemo(
    () => toStore(props.dataSource ?? NO_DATA, props.keyExpr),
    [props.dataSource, props.keyExpr],
  )
  const keyOf = useCallback((item: TRow): RowKey => store.keyOf(item) ?? getObjectKey(item), [store])
  const rowLabel = useCallback(
    (data: TRow, key: RowKey) => getRowLabel(propsRef.current.rowLabelExpr, data, key),
    [propsRef],
  )

  const selectionMode = selection.mode ?? 'none'
  const selectionColumn =
    selectionMode === 'multiple' && (selection.showCheckBoxesMode ?? 'onClick') !== 'none'
  const editingMode = editing.mode ?? 'row'
  const commandColumn =
    editingMode === 'row' ? !!(editing.allowUpdating || editing.allowDeleting) : !!editing.allowDeleting
  const pagingEnabled = paging.enabled ?? true
  const applyFilterOnClick = filterRow.applyFilter === 'onClick'

  // Paging and search are bindable options: they start from the props and follow them
  const [pageIndex, setPageIndexState] = useOptionState(paging.pageIndex, 0)
  const [pageSize, setPageSizeState] = useOptionState(paging.pageSize, DEFAULT_PAGE_SIZE)
  const [searchText, setSearchTextState] = useOptionState(searchPanel.text, '')
  const [dataSourceFilter, setDataSourceFilterState] = useState<FilterExpression | undefined>()

  const pageIndexRef = useLatestRef(pageIndex)
  const setPageIndex = useCallback(
    (index: number) => {
      const previous = pageIndexRef.current
      if (index === previous) return
      pageIndexRef.current = index
      setPageIndexState(index)
      emitOptionChanged('paging', 'paging.pageIndex', index, previous)
    },
    [emitOptionChanged, pageIndexRef, setPageIndexState],
  )
  /** A new filter or search starts over from the first page. */
  const resetPage = useCallback(() => setPageIndex(0), [setPageIndex])

  const pageSizeRef = useLatestRef(pageSize)
  const setPageSize = useCallback(
    (size: number) => {
      const previous = pageSizeRef.current
      if (size === previous) return
      pageSizeRef.current = size
      setPageSizeState(size)
      emitOptionChanged('paging', 'paging.pageSize', size, previous)
      resetPage()
      announce(formatMessage('dxDataGrid-statusPageSize', size))
    },
    [announce, emitOptionChanged, pageSizeRef, resetPage, setPageSizeState],
  )

  const searchTextRef = useLatestRef(searchText)
  const setSearchText = useCallback(
    (text: string) => {
      const previous = searchTextRef.current
      if (text === previous) return
      searchTextRef.current = text
      setSearchTextState(text)
      emitOptionChanged('searchPanel', 'searchPanel.text', text, previous)
      resetPage()
    },
    [emitOptionChanged, resetPage, searchTextRef, setSearchTextState],
  )

  const setDataSourceFilter = useCallback(
    (filter: FilterExpression | undefined) => {
      setDataSourceFilterState(filter)
      resetPage()
    },
    [resetPage],
  )

  // Local operations: every item, loaded before the columns so the first one can type them
  const local = useStoreItems(store, !isRemote, reportError)
  // Remote operations: the first item of the last loaded page does
  const [remoteSample, setRemoteSample] = useState<TRow | undefined>()
  const onRemoteLoaded = useCallback((items: TRow[]) => {
    if (items[0]) setRemoteSample(items[0])
  }, [])
  const sampleItem = isRemote ? remoteSample : local.items[0]

  const columns = useColumnsController({
    columns: props.columns,
    sampleItem,
    selectionColumn,
    commandColumn,
    sortingMode: sorting.mode ?? 'single',
    applyFilterOnClick,
    remoteSorting: remoteOperations.sorting,
    emitOptionChanged,
  })

  const {
    setFilterValue: setColumnFilterValue,
    setFilterOperation: setColumnFilterOperation,
    resetFilter: resetColumnFilter,
    applyFilter: applyColumnFilter,
    clearFilterRow,
  } = columns

  // Filter changes go back to the first page
  const setFilterValue = useCallback(
    (name: string, value: unknown) => {
      setColumnFilterValue(name, value)
      if (!applyFilterOnClick) resetPage()
    },
    [applyFilterOnClick, resetPage, setColumnFilterValue],
  )
  const setFilterOperation = useCallback(
    (name: string, operation: FilterOperation | undefined) => {
      setColumnFilterOperation(name, operation)
      if (!applyFilterOnClick) resetPage()
    },
    [applyFilterOnClick, resetPage, setColumnFilterOperation],
  )
  const resetFilter = useCallback(
    (name: string) => {
      resetColumnFilter(name)
      resetPage()
    },
    [resetColumnFilter, resetPage],
  )
  const applyFilter = useCallback(() => {
    applyColumnFilter()
    resetPage()
  }, [applyColumnFilter, resetPage])

  const clearFilter = useCallback(
    (type?: string) => {
      if (!type || type === 'row') clearFilterRow()
      if (!type || type === 'search') setSearchText('')
      if (!type || type === 'dataSource') setDataSourceFilterState(undefined)
      resetPage()
      if (!type) announce(formatMessage('dxDataGrid-statusFiltersCleared'))
    },
    [announce, clearFilterRow, resetPage, setSearchText],
  )

  const searchVisibleColumnsOnly = searchPanel.searchVisibleColumnsOnly ?? false
  const searchExpression = useMemo(() => {
    const visible = new Set(columns.visibleColumns.map((c) => c.name))
    return getSearchExpression(
      columns.columns,
      searchText,
      { searchVisibleColumnsOnly, locale },
      (c) => visible.has(c.name),
    )
  }, [columns.columns, columns.visibleColumns, locale, searchText, searchVisibleColumnsOnly])

  const combinedFilter = useMemo(
    () => combineFilters([dataSourceFilter, filterValue, columns.filterRowExpression, searchExpression]),
    [columns.filterRowExpression, dataSourceFilter, filterValue, searchExpression],
  )

  const data = useDataController({
    store,
    remoteOperations,
    filter: combinedFilter,
    sort: columns.sortDescriptors,
    pagingEnabled,
    pageIndex,
    pageSize,
    locale,
    local,
    onError: reportError,
    onRemoteLoaded,
  })

  const itemsByKey = useMemo(
    () => new Map(data.sourceItems.map((item) => [keyOf(item), item])),
    [data.sourceItems, keyOf],
  )
  const getItemByKey = useCallback((key: RowKey) => itemsByKey.get(key), [itemsByKey])

  const selectionCtl = useSelectionController({
    mode: selectionMode,
    selectAllMode: selection.selectAllMode ?? 'allPages',
    selectedRowKeys: props.selectedRowKeys,
    defaultSelectedRowKeys: props.defaultSelectedRowKeys,
    getAllKeys: () => getRuntime().data.processedItems.map(keyOf),
    getPageKeys: () => getRuntime().rows.filter((r) => !r.isNewRow).map((r) => r.key),
    getRowsData: (keys) =>
      keys.map((k) => getRuntime().getItemByKey(k)).filter((d): d is TRow => d !== undefined),
    component,
    onSelectionChanged: props.onSelectionChanged,
    onSelectedRowKeysChange: props.onSelectedRowKeysChange,
    emitOptionChanged,
  })

  const refresh = useCallback(() => getRuntime().data.reload(), [getRuntime])

  const editingCtl = useEditingController({
    store,
    mode: editingMode,
    confirmDelete: editing.confirmDelete ?? true,
    changes: editing.changes,
    editRowKey: editing.editRowKey,
    editColumnName: editing.editColumnName,
    columns: columns.columns,
    component,
    events: props,
    getVisibleRows: () => getRuntime().rows,
    getSourceItem: getItemByKey,
    rowLabel,
    announce,
    emitOptionChanged,
    reportError,
    onRowRemovedInternal: (key) => selectionCtl.deselectRows([key]),
    refresh,
  })

  // Memoized on its inputs: rows with pending changes get merged data, which must keep its
  // identity until something really changes (or the row cache would never settle)
  const newRowPosition = editing.newRowPosition ?? 'viewportTop'
  const builtRows = useMemo(
    () =>
      buildRows({
        pageItems: data.pageItems,
        changes: editingCtl.changes,
        keyOf,
        editRowKey: editingCtl.editRowKey,
        newRowPosition,
        selectedKeys: selectionCtl.racSelectedKeys,
      }),
    [data.pageItems, editingCtl.changes, editingCtl.editRowKey, keyOf, newRowPosition, selectionCtl.racSelectedKeys],
  )
  const rows = useStableRows(builtRows)

  const runtime: GridRuntime<TRow> = {
    store,
    keyOf,
    columns,
    data,
    selection: selectionCtl,
    editing: editingCtl,
    rows,
    pageSize,
    setPageIndex,
    setPageSize,
    dataSourceFilter,
    setDataSourceFilter,
    combinedFilter,
    setSearchText,
    clearFilter,
    getItemByKey,
    refresh,
  }
  // The stable instance reads the committed render. Before the first commit there is none, so
  // templates of the first render (cell templates calling `component.…`) get this one
  if (!handle.hasRuntime()) handle.setRuntime(() => runtime)
  useLayoutEffect(() => {
    handle.setRuntime(() => runtime)
  })
  // Toolbar templates re-render with the grid and read the state being rendered
  const renderComponent = createDataGridInstance(() => runtime)

  useEffect(() => {
    propsRef.current.onInitialized?.({ component })
  }, [component, propsRef])

  useEffect(() => {
    if (!data.loading) propsRef.current.onContentReady?.({ component })
  }, [component, data.loading, propsRef, rows])

  return {
    component,
    renderComponent,
    locale,
    statusStore,
    // options
    filterRow,
    searchPanel,
    pager,
    selection,
    selectionMode,
    sorting,
    editing,
    editingMode,
    loadPanel,
    pagingEnabled,
    applyFilterOnClick,
    // state
    rows,
    columns,
    data,
    pageIndex: data.pageIndex,
    pageSize,
    searchText,
    selectionCtl,
    editingCtl,
    // actions
    setPageIndex,
    setPageSize,
    setSearchText,
    setFilterValue,
    setFilterOperation,
    resetFilter,
    applyFilter,
    rowLabel,
  }
}
