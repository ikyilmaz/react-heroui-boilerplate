import { memo, type ReactNode } from 'react'
import { Surface, cn } from '@heroui/react'
import { prepareEditor } from '../../functions/prepareEditor'
import { formatMessage } from '../../localization/formatMessage'
import type { ColumnState } from '../../types/ColumnState'
import type { DataGridClassNames } from '../../types/DataGridClassNames'
import type { DataGridInstance } from '../../types/DataGridInstance'
import type { EditorPreparingEvent } from '../../types/events/EditorPreparingEvent'
import type { FilterCellHandlers } from '../../types/FilterCellHandlers'
import type { FilterOperation } from '../../types/FilterOperation'
import type { FilterRowTexts } from '../../types/FilterRowTexts'
import type { GridColumn } from '../../types/GridColumn'
import type { OperationOption } from '../../types/OperationOption'
import { DateBoxEditor } from '../editors/DateBoxEditor'
import { NumberBoxEditor } from '../editors/NumberBoxEditor'
import { SelectBoxEditor } from '../editors/SelectBoxEditor'
import { TextBoxEditor } from '../editors/TextBoxEditor'
import { BetweenFilterEditor } from './BetweenFilterEditor'
import { FilterOperationChooser } from './FilterOperationChooser'

interface FilterRowCellProps<TRow> {
  column: GridColumn<TRow>
  /** This column's runtime options only; other columns' changes leave the cell alone. */
  state: ColumnState
  operations: OperationOption[]
  handlers: FilterCellHandlers
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
 * One filter row cell, memoized on its own: typing into one field must not re-render the others.
 *
 * Typed fields (text, date) buffer the value **inside themselves** (`useBufferedValue`) and write
 * the column's `filterValue` after `updateValueTimeout`. These cells live in the table's real DOM
 * tree; the filter row in React Aria's collection tree does not render per keystroke — if it did,
 * the collection would be rebuilt and every cell re-rendered (see README "Performans").
 */
function FilterRowCellImpl<TRow>({
  column,
  state,
  operations,
  handlers,
  showOperationChooser,
  applyFilterOnClick,
  texts,
  updateValueTimeout,
  locale,
  classNames,
  component,
  onEditorPreparing,
}: FilterRowCellProps<TRow>) {
  const filterValue =
    applyFilterOnClick && 'bufferedFilterValue' in state ? state.bufferedFilterValue : state.filterValue
  const operation =
    (applyFilterOnClick ? state.bufferedSelectedFilterOperation : undefined) ??
    state.selectedFilterOperation
  const label = formatMessage('dxDataGrid-ariaFilterCell', column.caption)

  let content: ReactNode
  if (column.filterCellRender) {
    content = column.filterCellRender({
      column,
      filterValue,
      selectedFilterOperation: operation,
      setFilterValue: handlers.onValueChange,
      setSelectedFilterOperation: handlers.onOperationChange,
      operations,
      onKeyDown: handlers.onKeyDown,
      updateValueTimeout,
      component,
    })
  } else {
    const prepared = prepareEditor({
      column,
      parentType: 'filterRow',
      value: filterValue,
      setValue: handlers.onValueChange,
      component,
      onEditorPreparing,
    })
    if (prepared.cancel) return null
    const options = { ...prepared.editorOptions, readOnly: prepared.readOnly, disabled: prepared.disabled }
    const chooser = (flush?: () => void) =>
      showOperationChooser && operations.length > 1 ? (
        <FilterOperationChooser
          caption={column.caption}
          operations={operations}
          value={operation}
          // What is being typed goes before the operation changes; both apply in one render
          onChange={(op: FilterOperation) => {
            flush?.()
            handlers.onOperationChange(op)
          }}
          onReset={handlers.onReset}
          resetText={texts.resetOperationText}
        />
      ) : null
    const fieldClass = classNames.filterEditor

    if (operation === 'between')
      content = (
        <BetweenFilterEditor
          column={column}
          label={label}
          value={filterValue}
          onValueChange={handlers.onValueChange}
          options={options}
          prefix={chooser()}
          className={fieldClass}
          texts={texts}
          locale={locale}
        />
      )
    else
      switch (prepared.editorName) {
        case 'dxNumberBox':
          content = (
            <NumberBoxEditor
              label={label}
              value={filterValue}
              onValueChange={handlers.onValueChange}
              options={options}
              prefix={chooser()}
              className={fieldClass}
              locale={locale}
            />
          )
          break
        case 'dxDateBox':
          content = (
            <DateBoxEditor
              label={label}
              value={filterValue}
              onValueChange={handlers.onValueChange}
              options={options}
              prefix={chooser}
              className={fieldClass}
              delay={updateValueTimeout}
              syncKey={state}
              locale={locale}
            />
          )
          break
        case 'dxSelectBox':
        case 'dxCheckBox': {
          const overlay = chooser()
          content = (
            <SelectBoxEditor
              label={label}
              value={filterValue}
              onValueChange={handlers.onValueChange}
              options={options}
              className={fieldClass}
              listLabel={formatMessage('dxDataGrid-ariaFilterOptions', column.caption)}
              allText={texts.showAllText}
              overlay={
                overlay && (
                  <Surface variant="transparent" className="absolute start-0 top-1/2 z-10 -translate-y-1/2">
                    {overlay}
                  </Surface>
                )
              }
            />
          )
          break
        }
        default:
          content = (
            <TextBoxEditor
              label={label}
              value={filterValue == null ? '' : String(filterValue)}
              onValueChange={handlers.onValueChange}
              options={options}
              prefix={chooser}
              className={fieldClass}
              delay={updateValueTimeout}
              syncKey={state}
              clearLabel={formatMessage('dxDataGrid-ariaClearFilter', column.caption)}
            />
          )
      }
  }

  return (
    <Surface variant="transparent" className={cn(classNames.filterCell, 'relative')} onKeyDown={handlers.onKeyDown}>
      {content}
    </Surface>
  )
}

export const FilterRowCell = memo(FilterRowCellImpl) as <TRow>(props: FilterRowCellProps<TRow>) => ReactNode
