import { memo, type ReactNode } from 'react'
import { Table, cn } from '@heroui/react'
import type { RowKey } from '../data/types/RowKey'
import { getAlignmentClass } from '../functions/getAlignmentClass'
import { getCellText } from '../functions/getCellText'
import { getDisplayValue } from '../functions/getDisplayValue'
import { renderDataCellContent } from '../functions/renderDataCellContent'
import { renderDataCellEditor } from '../functions/renderDataCellEditor'
import { resolveRowPermission } from '../functions/resolveRowPermission'
import { formatMessage } from '../localization/formatMessage'
import type { DataGridClassNames } from '../types/DataGridClassNames'
import type { DataGridInstance } from '../types/DataGridInstance'
import type { EditorPreparingEvent } from '../types/events/EditorPreparingEvent'
import type { GridColumn } from '../types/GridColumn'
import type { KeyHandler } from '../types/KeyHandler'
import type { EditingMode } from '../types/options/EditingMode'
import type { RowPermission } from '../types/options/RowPermission'
import type { StartEditAction } from '../types/options/StartEditAction'
import type { ResolvedEditingTexts } from '../types/ResolvedEditingTexts'
import type { RowObject } from '../types/RowObject'
import { CommandCellContent } from './cells/CommandCellContent'
import { StartEditArea } from './cells/StartEditArea'
import { SelectionCheckbox } from './SelectionCheckbox'

interface DataRowProps<TRow> {
  row: RowObject<TRow>
  columns: GridColumn<TRow>[]
  /** The edited column (`cell` mode), only for the row holding it. */
  editColumnName: string | null
  editingMode: EditingMode
  allowUpdating: RowPermission<TRow> | undefined
  allowDeleting: RowPermission<TRow> | undefined
  startEditAction: StartEditAction
  texts: ResolvedEditingTexts
  hoverStateEnabled: boolean
  rowAlternationEnabled: boolean
  rowLabel: (data: TRow, key: RowKey) => string
  locale: string
  classNames: DataGridClassNames
  component: DataGridInstance<TRow>
  onCellValueChange: (key: RowKey, columnName: string, value: unknown) => void
  onEditKeyDown: KeyHandler
  onFieldKeyDown: KeyHandler
  onEditorPreparing: (e: EditorPreparingEvent<TRow>) => void
  registerEditButton: (key: RowKey, el: HTMLButtonElement | null) => void
}

/**
 * A data row. `memo`: re-rendering every row whenever anything changes (a filter, a page, one
 * edited row) is the table's most expensive job. Row objects keep their identity while
 * unchanged (`useStableRows`), and every callback coming in is stable.
 *
 * No per-keystroke state here: editors keep typed text themselves. This component lives in React
 * Aria's collection tree, where state changing per key rebuilt the whole table.
 */
function DataRowImpl<TRow>({
  row,
  columns,
  editColumnName,
  editingMode,
  allowUpdating,
  allowDeleting,
  startEditAction,
  texts,
  hoverStateEnabled,
  rowAlternationEnabled,
  rowLabel,
  locale,
  classNames,
  component,
  onCellValueChange,
  onEditKeyDown,
  onFieldKeyDown,
  onEditorPreparing,
  registerEditButton,
}: DataRowProps<TRow>) {
  const label = row.isNewRow ? formatMessage('dxDataGrid-ariaNewRow') : rowLabel(row.data, row.key)
  const rowMode = editingMode === 'row'
  const canUpdate = row.isNewRow || resolveRowPermission(allowUpdating, row)
  const draftEditing = rowMode && row.isEditing

  return (
    <Table.Row
      id={row.key}
      textValue={label}
      className={cn(
        classNames.row,
        classNames.rowCorners,
        // Editing and selection backgrounds must not stack; one wins
        draftEditing ? classNames.editRow : classNames.selectedRow,
        !hoverStateEnabled && classNames.noHover,
        rowAlternationEnabled && row.rowIndex % 2 === 1 && classNames.alternateRow,
      )}
    >
      {columns.map((column, columnIndex) => {
        const cellClass = cn(
          column.type === 'selection'
            ? classNames.selectionCell
            : column.type === 'buttons'
              ? classNames.commandCell
              : classNames.cell,
          column.cssClass,
          getAlignmentClass(column.alignment),
        )
        if (column.type === 'selection')
          return (
            <Table.Cell key={column.name} className={cellClass}>
              <SelectionCheckbox aria-label={formatMessage('dxDataGrid-ariaSelectRow', label)} />
            </Table.Cell>
          )
        if (column.type === 'buttons')
          return (
            <Table.Cell key={column.name} className={cellClass}>
              <CommandCellContent
                column={column}
                row={row}
                rowLabel={label}
                component={component}
                editingMode={editingMode}
                allowUpdating={allowUpdating}
                allowDeleting={allowDeleting}
                texts={texts}
                registerEditButton={registerEditButton}
              />
            </Table.Cell>
          )

        const value = column.calculateCellValue(row.data)
        const displayValue = getDisplayValue(column, row.data, value)
        const cellInfo = {
          data: row.data,
          key: row.key,
          value,
          displayValue,
          text: getCellText(column, value, displayValue, 'row', locale),
          rowIndex: row.rowIndex,
          columnIndex,
          column,
          row,
          rowType: 'data' as const,
          component,
        }
        const editable = canUpdate && column.allowEditing
        const showEditor =
          editable &&
          (column.showEditorAlways ||
            (rowMode ? row.isEditing : row.isEditing && editColumnName === column.name))

        let content: ReactNode
        if (showEditor)
          content = renderDataCellEditor(
            {
              ...cellInfo,
              setValue: (v: unknown) => onCellValueChange(row.key, column.name, v),
              onEditKeyDown,
              onFieldKeyDown,
              updateValueTimeout: 0,
              // Draft rows drop what was typed on cancel; everything else is written on unmount
              flushOnUnmount: !draftEditing,
            },
            { className: classNames.editor, locale, onEditorPreparing },
          )
        else {
          content = renderDataCellContent(cellInfo)
          if (!rowMode && editable)
            content = (
              <StartEditArea
                action={startEditAction}
                onStart={() => void component.editCell(row.rowIndex, column.name)}
              >
                {content}
              </StartEditArea>
            )
        }
        return (
          <Table.Cell key={column.name} className={cellClass}>
            {content}
          </Table.Cell>
        )
      })}
    </Table.Row>
  )
}

export const DataRow = memo(DataRowImpl) as <TRow>(props: DataRowProps<TRow>) => ReactNode
