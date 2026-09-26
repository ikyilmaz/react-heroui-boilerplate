import { memo, type ReactNode } from 'react'
import { Table, cn } from '@heroui/react'
import { getAlignmentClass } from '../functions/getAlignmentClass'
import { getColumnStyle } from '../functions/getColumnStyle'
import { formatMessage } from '../localization/formatMessage'
import type { ColumnState } from '../types/ColumnState'
import type { DataGridClassNames } from '../types/DataGridClassNames'
import type { DataGridInstance } from '../types/DataGridInstance'
import type { GridColumn } from '../types/GridColumn'
import type { SelectionMode } from '../types/options/SelectionMode'
import type { SortingMode } from '../types/options/SortingMode'
import { HeaderText } from './HeaderText'
import { SelectionCheckbox } from './SelectionCheckbox'
import { SortableHeader } from './SortableHeader'

interface ColumnHeadersProps<TRow> {
  columns: GridColumn<TRow>[]
  states: Record<string, ColumnState>
  sortingMode: SortingMode
  showSortIndexes: boolean
  selectionMode: SelectionMode
  allowSelectAll: boolean
  classNames: DataGridClassNames
  component: DataGridInstance<TRow>
}

/** DevExtreme's column headers view: captions, sort indicators, the select-all check box. */
function ColumnHeadersImpl<TRow>({
  columns,
  states,
  sortingMode,
  showSortIndexes,
  selectionMode,
  allowSelectAll,
  classNames,
  component,
}: ColumnHeadersProps<TRow>) {
  // React Aria needs a row header; the first data column is it
  const rowHeader = columns.find((c) => !c.type)?.name
  const sortedCount = columns.filter((c) => states[c.name]?.sortOrder).length
  return (
    <Table.Header className={classNames.header}>
      {columns.map((column, columnIndex) => {
        const style = getColumnStyle(column)
        if (column.type === 'selection')
          return (
            <Table.Column key={column.name} id={column.name} className={cn(classNames.selectionColumn, column.cssClass)} style={style}>
              {selectionMode === 'multiple' && allowSelectAll && (
                <SelectionCheckbox aria-label={formatMessage('dxDataGrid-ariaSelectAll')} />
              )}
            </Table.Column>
          )
        if (column.type === 'buttons')
          return (
            <Table.Column key={column.name} id={column.name} className={cn(classNames.commandColumn, column.cssClass)} style={style}>
              <HeaderText>{column.caption}</HeaderText>
            </Table.Column>
          )
        const state = states[column.name]
        const sortable = sortingMode !== 'none' && column.allowSorting
        const direction = state?.sortOrder === 'asc' ? 'ascending' : state?.sortOrder === 'desc' ? 'descending' : undefined
        return (
          <Table.Column
            key={column.name}
            id={column.name}
            isRowHeader={column.name === rowHeader}
            allowsSorting={sortable}
            className={cn(classNames.headerCell, column.cssClass, getAlignmentClass(column.alignment))}
            style={style}
          >
            {column.headerCellRender ? (
              column.headerCellRender({ column, columnIndex, component })
            ) : sortable ? (
              <SortableHeader
                caption={column.caption}
                sortDirection={direction}
                sortIndex={
                  showSortIndexes && sortingMode === 'multiple' && sortedCount > 1 && state?.sortIndex !== undefined
                    ? state.sortIndex + 1
                    : undefined
                }
              />
            ) : (
              <HeaderText>{column.caption}</HeaderText>
            )}
          </Table.Column>
        )
      })}
    </Table.Header>
  )
}

export const ColumnHeaders = memo(ColumnHeadersImpl) as <TRow>(props: ColumnHeadersProps<TRow>) => ReactNode
