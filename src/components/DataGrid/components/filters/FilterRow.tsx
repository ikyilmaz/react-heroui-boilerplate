import { memo, type ReactNode } from 'react'
import { Table, cn } from '@heroui/react'
import { FILTER_ROW_KEY } from '../../constants/rowIds'
import { getAlignmentClass } from '../../functions/getAlignmentClass'
import { formatMessage } from '../../localization/formatMessage'
import type { ColumnState } from '../../types/ColumnState'
import type { DataGridClassNames } from '../../types/DataGridClassNames'
import type { DataGridInstance } from '../../types/DataGridInstance'
import type { EditorPreparingEvent } from '../../types/events/EditorPreparingEvent'
import type { FilterCellHandlers } from '../../types/FilterCellHandlers'
import type { FilterRowTexts } from '../../types/FilterRowTexts'
import type { GridColumn } from '../../types/GridColumn'
import type { OperationOption } from '../../types/OperationOption'
import { FilterRowCell } from './FilterRowCell'

interface FilterRowProps<TRow> {
  columns: GridColumn<TRow>[]
  states: Record<string, ColumnState>
  operationsByColumn: Record<string, OperationOption[]>
  handlers: Record<string, FilterCellHandlers>
  showOperationChooser: boolean
  applyFilterOnClick: boolean
  texts: FilterRowTexts
  updateValueTimeout: number
  locale: string
  classNames: DataGridClassNames
  component: DataGridInstance<TRow>
  onEditorPreparing: (e: EditorPreparingEvent<TRow>) => void
}

/**
 * The filter row (`filterRow.visible`). Command columns get empty cells, as in DevExtreme; each
 * data column gets a memoized `FilterRowCell` fed only its own state slice.
 */
function FilterRowImpl<TRow>({
  columns,
  states,
  operationsByColumn,
  handlers,
  classNames,
  ...shared
}: FilterRowProps<TRow>) {
  return (
    <Table.Row
      id={FILTER_ROW_KEY}
      textValue={formatMessage('dxDataGrid-ariaFilterRow')}
      className={cn(classNames.row, classNames.noHover)}
    >
      {columns.map((column) => (
        <Table.Cell
          key={column.name}
          className={cn(
            column.type === 'selection'
              ? classNames.selectionCell
              : column.type === 'buttons'
                ? classNames.commandCell
                : classNames.cell,
            column.cssClass,
            getAlignmentClass(column.alignment),
          )}
        >
          {!column.type && column.allowFiltering && (
            <FilterRowCell
              column={column}
              state={states[column.name] ?? {}}
              operations={operationsByColumn[column.name]}
              handlers={handlers[column.name]}
              classNames={classNames}
              {...shared}
            />
          )}
        </Table.Cell>
      ))}
    </Table.Row>
  )
}

export const FilterRow = memo(FilterRowImpl) as <TRow>(props: FilterRowProps<TRow>) => ReactNode
