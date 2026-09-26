import { memo, type ReactNode } from 'react'
import { Table, cn, type Selection, type SortDescriptor as RacSortDescriptor } from '@heroui/react'
import { NON_RECORD_ROW_KEYS } from '../constants/rowIds'
import type { RowKey } from '../data/types/RowKey'
import type { DataGridClassNames } from '../types/DataGridClassNames'
import type { DataGridInstance } from '../types/DataGridInstance'
import type { ColumnState } from '../types/ColumnState'
import type { EditorPreparingEvent } from '../types/events/EditorPreparingEvent'
import type { FilterCellHandlers } from '../types/FilterCellHandlers'
import type { FilterRowTexts } from '../types/FilterRowTexts'
import type { GridColumn } from '../types/GridColumn'
import type { KeyHandler } from '../types/KeyHandler'
import type { OperationOption } from '../types/OperationOption'
import type { EditingMode } from '../types/options/EditingMode'
import type { RowPermission } from '../types/options/RowPermission'
import type { SelectionMode } from '../types/options/SelectionMode'
import type { SortingMode } from '../types/options/SortingMode'
import type { StartEditAction } from '../types/options/StartEditAction'
import type { ResolvedEditingTexts } from '../types/ResolvedEditingTexts'
import type { RowObject } from '../types/RowObject'
import { ColumnHeaders } from './ColumnHeaders'
import { DataRow } from './DataRow'
import { FilterRow } from './filters/FilterRow'
import { NoDataRow } from './NoDataRow'

export interface GridTableProps<TRow> {
  ariaLabel: string
  ariaDescribedBy?: string
  classNames: DataGridClassNames
  contentClassName: string
  component: DataGridInstance<TRow>
  locale: string
  columns: GridColumn<TRow>[]
  states: Record<string, ColumnState>
  rows: RowObject<TRow>[]
  loading: boolean
  noDataText: string
  // sorting
  sortDescriptor: RacSortDescriptor | undefined
  onSortChange: (descriptor: RacSortDescriptor) => void
  sortingMode: SortingMode
  showSortIndexes: boolean
  // selection
  selectionMode: SelectionMode
  selectedKeys: Selection
  onSelectionChange: (keys: Selection) => void
  allowSelectAll: boolean
  // filter row
  filterRowVisible: boolean
  operationsByColumn: Record<string, OperationOption[]>
  filterHandlers: Record<string, FilterCellHandlers>
  showOperationChooser: boolean
  applyFilterOnClick: boolean
  filterRowTexts: FilterRowTexts
  updateValueTimeout: number
  onEditorPreparing: (e: EditorPreparingEvent<TRow>) => void
  // rows
  editRowKey: RowKey | null
  editColumnName: string | null
  editingMode: EditingMode
  allowUpdating: RowPermission<TRow> | undefined
  allowDeleting: RowPermission<TRow> | undefined
  startEditAction: StartEditAction
  editingTexts: ResolvedEditingTexts
  hoverStateEnabled: boolean
  rowAlternationEnabled: boolean
  rowLabel: (data: TRow, key: RowKey) => string
  onCellValueChange: (key: RowKey, columnName: string, value: unknown) => void
  onEditKeyDown: KeyHandler
  onFieldKeyDown: KeyHandler
  registerEditButton: (key: RowKey, el: HTMLButtonElement | null) => void
}

/**
 * The HeroUI table, behind its own memo boundary. Every render of React Aria's table re-runs the
 * hooks of every cell, row and column (grid cell, selectable item, press, focus ring…), so it
 * must not render because something *outside* it changed: the delete dialog opening, the load
 * panel, the toolbar, or a parent passing inline option objects (the events demo logs on every
 * event, the remote demo on every load).
 */
function GridTableImpl<TRow>(p: GridTableProps<TRow>) {
  return (
    <Table variant="secondary" className={p.classNames.table}>
      <Table.ScrollContainer className={p.classNames.scrollContainer}>
        <Table.Content
          aria-label={p.ariaLabel}
          aria-describedby={p.ariaDescribedBy}
          className={cn(p.contentClassName)}
          sortDescriptor={p.sortDescriptor}
          onSortChange={p.onSortChange}
          selectionMode={p.selectionMode}
          selectedKeys={p.selectedKeys}
          onSelectionChange={p.onSelectionChange}
          disabledKeys={NON_RECORD_ROW_KEYS}
          disabledBehavior="selection"
        >
          <ColumnHeaders
            columns={p.columns}
            states={p.states}
            sortingMode={p.sortingMode}
            showSortIndexes={p.showSortIndexes}
            selectionMode={p.selectionMode}
            allowSelectAll={p.allowSelectAll}
            classNames={p.classNames}
            component={p.component}
          />
          <Table.Body>
            {p.filterRowVisible && (
              <FilterRow
                columns={p.columns}
                states={p.states}
                operationsByColumn={p.operationsByColumn}
                handlers={p.filterHandlers}
                showOperationChooser={p.showOperationChooser}
                applyFilterOnClick={p.applyFilterOnClick}
                texts={p.filterRowTexts}
                updateValueTimeout={p.updateValueTimeout}
                locale={p.locale}
                classNames={p.classNames}
                component={p.component}
                onEditorPreparing={p.onEditorPreparing}
              />
            )}
            {p.rows.length === 0 && !p.loading && (
              <NoDataRow
                colSpan={p.columns.length}
                text={p.noDataText}
                className={p.classNames.noData}
                rowClassName={p.classNames.noHover}
              />
            )}
            {p.rows.map((row) => (
              <DataRow
                key={row.key}
                row={row}
                columns={p.columns}
                editColumnName={row.key === p.editRowKey ? p.editColumnName : null}
                editingMode={p.editingMode}
                allowUpdating={p.allowUpdating}
                allowDeleting={p.allowDeleting}
                startEditAction={p.startEditAction}
                texts={p.editingTexts}
                hoverStateEnabled={p.hoverStateEnabled}
                rowAlternationEnabled={p.rowAlternationEnabled}
                rowLabel={p.rowLabel}
                locale={p.locale}
                classNames={p.classNames}
                component={p.component}
                onCellValueChange={p.onCellValueChange}
                onEditKeyDown={p.onEditKeyDown}
                onFieldKeyDown={p.onFieldKeyDown}
                onEditorPreparing={p.onEditorPreparing}
                registerEditButton={p.registerEditButton}
              />
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}

export const GridTable = memo(GridTableImpl) as <TRow>(props: GridTableProps<TRow>) => ReactNode
