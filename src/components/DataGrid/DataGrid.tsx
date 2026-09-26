import { memo, useCallback, useMemo, useRef } from 'react'
import { Surface, cn, type SortDescriptor as RacSortDescriptor } from '@heroui/react'
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog'
import { GridTable } from './components/GridTable'
import { GridTooltip } from './components/GridTooltip'
import { LoadPanel } from './components/LoadPanel'
import { Pager } from './components/Pager'
import { StatusRegion } from './components/StatusRegion'
import { HeaderPanel } from './components/toolbar/HeaderPanel'
import { DEFAULT_UPDATE_VALUE_TIMEOUT } from './constants/defaultUpdateValueTimeout'
import { ArrayStore } from './data/ArrayStore'
import type { RowKey } from './data/types/RowKey'
import { SearchHighlightContext } from './DataGridContext'
import { getEditingTexts } from './functions/getEditingTexts'
import { getFilterRowTexts } from './functions/getFilterRowTexts'
import { getOperationOptions } from './functions/getOperationOptions'
import { getPageSizes } from './functions/getPageSizes'
import { getToolbarItems } from './functions/getToolbarItems'
import { mergeClassNames } from './functions/mergeClassNames'
import { useDataGridController } from './hooks/useDataGridController'
import { useEditKeyHandlers } from './hooks/useEditKeyHandlers'
import { useFilterCellHandlers } from './hooks/useFilterCellHandlers'
import { useLatestRef } from './hooks/useLatestRef'
import { useSortModifierKeys } from './hooks/useSortModifierKeys'
import { useStableValue } from './hooks/useStableValue'
import { formatMessage } from './localization/formatMessage'
import type { DataGridProps } from './types/DataGridProps'
import type { EditorPreparingEvent } from './types/events/EditorPreparingEvent'

/**
 * A data grid with DevExtreme DataGrid's options, events, methods and data model, drawn with
 * HeroUI / React Aria:
 *
 * ```tsx
 * const grid = useRef<DataGridRef<Order>>(null)
 * <DataGrid
 *   ref={grid}
 *   dataSource={orders}
 *   keyExpr="id"
 *   columns={[{ dataField: 'total', dataType: 'number', format: 'currency' }]}
 *   filterRow={{ visible: true }}
 *   editing={{ mode: 'row', allowUpdating: true }}
 *   onRowUpdated={(e) => save(e.key, e.data)}
 *   aria-label="Orders"
 * />
 * grid.current?.instance().addRow()
 * ```
 *
 * `memo`: when the parent renders for another reason, the table stays untouched. When React Aria
 * Table's root re-renders, its state context is renewed and **every** cell re-renders.
 */
function DataGridImpl<TRow extends object>(props: DataGridProps<TRow>) {
  const grid = useDataGridController(props)
  const {
    component,
    locale,
    columns,
    rows,
    data,
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
    selectionCtl,
    editingCtl,
  } = grid
  const propsRef = useLatestRef(props)
  const rootRef = useRef<HTMLDivElement>(null)

  const classNames = useMemo(() => mergeClassNames(props.classNames), [props.classNames])
  const editingTexts = useMemo(() => getEditingTexts(editing.texts), [editing.texts])
  const filterRowTexts = useMemo(() => getFilterRowTexts(filterRow), [filterRow])
  const updateValueTimeout = props.updateValueTimeout ?? DEFAULT_UPDATE_VALUE_TIMEOUT

  // Enter finishes the edit (save the row / close the cell), Escape cancels
  const finishEdit = useCallback(
    () => void (editingMode === 'row' ? component.saveEditData() : component.closeEditCell()),
    [component, editingMode],
  )
  const cancelEdit = useCallback(() => void component.cancelEditData(), [component])
  const { onEditKeyDown, onFieldKeyDown } = useEditKeyHandlers(finishEdit, cancelEdit)

  const filterHandlers = useFilterCellHandlers(
    columns.columns,
    grid.setFilterValue,
    grid.setFilterOperation,
    grid.resetFilter,
  )
  const operationDescriptions = useStableValue(filterRow.operationDescriptions)
  const operationsByColumn = useMemo(
    () => Object.fromEntries(columns.columns.map((c) => [c.name, getOperationOptions(c, operationDescriptions)])),
    [columns.columns, operationDescriptions],
  )

  const { commitCellValue } = editingCtl
  const onCellValueChange = useCallback(
    (key: RowKey, columnName: string, value: unknown) => void commitCellValue(key, columnName, value),
    [commitCellValue],
  )
  const { registerEditButton } = editingCtl
  const onEditorPreparing = useCallback(
    (e: EditorPreparingEvent<TRow>) => propsRef.current.onEditorPreparing?.(e),
    [propsRef],
  )
  const rowLabel = grid.rowLabel

  // Sorting: modifier keys decide single / added / removed (DevExtreme's multiple sorting)
  const sortKeys = useSortModifierKeys()
  const { getModifiers } = sortKeys
  const { sortByColumn } = columns
  const onSortChange = useCallback(
    (d: RacSortDescriptor) => sortByColumn(String(d.column), getModifiers()),
    [getModifiers, sortByColumn],
  )
  // React Aria knows one sorted column (for aria-sort): the first one
  const primarySort = useMemo(() => {
    const first = columns.columns
      .filter((c) => columns.states[c.name]?.sortOrder)
      .sort((a, b) => (columns.states[a.name].sortIndex ?? 0) - (columns.states[b.name].sortIndex ?? 0))[0]
    return first
      ? ({
          column: first.name,
          direction: columns.states[first.name].sortOrder === 'desc' ? 'descending' : 'ascending',
        } as RacSortDescriptor)
      : undefined
  }, [columns.columns, columns.states])

  const highlight = useMemo(
    () => ({
      text: searchPanel.highlightSearchText === false ? '' : grid.searchText,
      caseSensitive: searchPanel.highlightCaseSensitive ?? false,
      locale,
    }),
    [grid.searchText, locale, searchPanel.highlightCaseSensitive, searchPanel.highlightSearchText],
  )

  const toolbarItems = getToolbarItems(props.toolbar, {
    searchPanel: !!searchPanel.visible,
    addRowButton: !!editing.allowAdding,
    applyFilterButton: !!filterRow.visible && applyFilterOnClick,
  })
  const showToolbar = props.toolbar?.visible ?? toolbarItems.length > 0
  const showPager = pager.visible === 'auto' || pager.visible === undefined ? pagingEnabled : pager.visible
  const pageSizes = useMemo(
    () => getPageSizes(pager.allowedPageSizes ?? 'auto', grid.pageSize),
    [grid.pageSize, pager.allowedPageSizes],
  )
  const showLoadPanel =
    (loadPanel.enabled ?? 'auto') === 'auto'
      ? data.loading && !(props.dataSource instanceof ArrayStore) && !Array.isArray(props.dataSource)
      : !!loadPanel.enabled && data.loading

  const pending = editingCtl.pendingDelete
  const contentClassName =
    cn(
      classNames.content,
      (props.showColumnLines ?? true) && classNames.columnLines,
      props.showRowLines && classNames.rowLines,
      props.showBorders && classNames.borders,
      props.wordWrapEnabled && classNames.wordWrap,
    ) ?? ''

  return (
    <Surface
      ref={rootRef}
      variant="transparent"
      id={props.elementAttr?.id}
      className={cn(classNames.root, props.elementAttr?.class)}
      style={{ width: props.width, height: props.height }}
      aria-disabled={props.disabled || undefined}
      aria-busy={data.loading || undefined}
    >
      <SearchHighlightContext.Provider value={highlight}>
        {showToolbar && (
          <HeaderPanel
            items={toolbarItems}
            disabled={!!props.toolbar?.disabled || !!props.disabled}
            component={grid.renderComponent}
            className={classNames.toolbar}
            search={{
              text: grid.searchText,
              onTextChange: grid.setSearchText,
              placeholder: searchPanel.placeholder,
              width: searchPanel.width,
              delay: updateValueTimeout,
            }}
            addRowText={editingTexts.addRow}
            applyFilterText={filterRow.applyFilterText ?? formatMessage('dxDataGrid-applyFilterText')}
            onApplyFilter={grid.applyFilter}
          />
        )}

        <Surface variant="transparent" className={classNames.body}>
          {/* Captures modifier keys before React Aria's sort handler runs */}
          <Surface
            variant="transparent"
            className="contents"
            onPointerDownCapture={sortKeys.onPointerDownCapture}
            onKeyDownCapture={sortKeys.onKeyDownCapture}
          >
            <GridTable
              ariaLabel={props['aria-label']}
              ariaDescribedBy={props['aria-describedby']}
              classNames={classNames}
              contentClassName={contentClassName}
              component={component}
              locale={locale}
              columns={columns.visibleColumns}
              states={columns.states}
              rows={rows}
              loading={data.loading}
              noDataText={props.noDataText ?? formatMessage('dxDataGrid-noDataText')}
              sortDescriptor={primarySort}
              onSortChange={onSortChange}
              sortingMode={sorting.mode ?? 'single'}
              showSortIndexes={sorting.showSortIndexes ?? false}
              selectionMode={selectionMode}
              selectedKeys={selectionCtl.racSelectedKeys}
              onSelectionChange={selectionCtl.onRacSelectionChange}
              allowSelectAll={selection.allowSelectAll ?? true}
              filterRowVisible={!!filterRow.visible}
              operationsByColumn={operationsByColumn}
              filterHandlers={filterHandlers}
              showOperationChooser={filterRow.showOperationChooser ?? true}
              applyFilterOnClick={applyFilterOnClick}
              filterRowTexts={filterRowTexts}
              updateValueTimeout={updateValueTimeout}
              onEditorPreparing={onEditorPreparing}
              editRowKey={editingCtl.editRowKey}
              editColumnName={editingCtl.editColumnName}
              editingMode={editingMode}
              allowUpdating={editing.allowUpdating}
              allowDeleting={editing.allowDeleting}
              startEditAction={editing.startEditAction ?? 'click'}
              editingTexts={editingTexts}
              hoverStateEnabled={props.hoverStateEnabled ?? false}
              rowAlternationEnabled={props.rowAlternationEnabled ?? false}
              rowLabel={rowLabel}
              onCellValueChange={onCellValueChange}
              onEditKeyDown={onEditKeyDown}
              onFieldKeyDown={onFieldKeyDown}
              registerEditButton={registerEditButton}
            />
          </Surface>

          {showPager && (
            <Pager
              pageIndex={grid.pageIndex}
              pageCount={data.pageCount}
              totalCount={data.totalCount}
              pageSize={grid.pageSize}
              pageSizes={pageSizes}
              showPageSizeSelector={pager.showPageSizeSelector ?? false}
              showInfo={pager.showInfo ?? false}
              infoText={pager.infoText ?? formatMessage('dxPager-infoText')}
              showNavigationButtons={pager.showNavigationButtons ?? false}
              label={pager.label ?? formatMessage('dxPager-ariaLabel')}
              onPageIndexChange={grid.setPageIndex}
              onPageSizeChange={grid.setPageSize}
              className={classNames.pager}
            />
          )}
        </Surface>
      </SearchHighlightContext.Provider>

      {showLoadPanel && (
        <LoadPanel
          text={loadPanel.text ?? formatMessage('dxDataGrid-loadPanelText')}
          showIndicator={loadPanel.showIndicator ?? true}
          className={classNames.loadPanel}
        />
      )}

      {(editing.confirmDelete ?? true) && (
        <ConfirmDeleteDialog
          rowLabel={pending?.rowLabel ?? null}
          title={editingTexts.confirmDeleteTitle}
          message={editingTexts.confirmDeleteMessage}
          confirmText={editingTexts.deleteRow}
          cancelText={editingTexts.cancelRowChanges}
          onConfirm={() => void editingCtl.confirmPendingDelete()}
          onCancel={editingCtl.cancelPendingDelete}
        />
      )}

      <StatusRegion store={grid.statusStore} />
      <GridTooltip rootRef={rootRef} />
    </Surface>
  )
}

export const DataGrid = memo(DataGridImpl) as typeof DataGridImpl
