import type { ReactNode } from 'react'
import { MAX_TIMEOUT } from '../constants/maxTimeout'
import { CheckBoxEditor } from '../components/editors/CheckBoxEditor'
import { DateBoxEditor } from '../components/editors/DateBoxEditor'
import { NumberBoxEditor } from '../components/editors/NumberBoxEditor'
import { SelectBoxEditor } from '../components/editors/SelectBoxEditor'
import { TextBoxEditor } from '../components/editors/TextBoxEditor'
import { formatMessage } from '../localization/formatMessage'
import type { EditorPreparingEvent } from '../types/events/EditorPreparingEvent'
import type { ColumnEditCellTemplateData } from '../types/templates/ColumnEditCellTemplateData'
import { moveFocusWithinRow } from './moveFocusWithinRow'
import { prepareEditor } from './prepareEditor'

/**
 * `editCellRender`, or the built-in editor picked by `onEditorPreparing`. Built-in editors commit
 * on blur / Enter (DevExtreme's `valueChangeEvent: 'change'`), so typing never touches the grid.
 */
export function renderDataCellEditor<TRow>(
  cellInfo: ColumnEditCellTemplateData<TRow>,
  {
    className,
    locale,
    onEditorPreparing,
  }: {
    className: string
    locale: string
    onEditorPreparing: (e: EditorPreparingEvent<TRow>) => void
  },
): ReactNode {
  const { column, value, setValue, row, component } = cellInfo
  if (column.editCellRender) return column.editCellRender(cellInfo)
  const prepared = prepareEditor({ column, parentType: 'dataRow', value, setValue, row, component, onEditorPreparing })
  if (prepared.cancel) return null
  const options = { ...prepared.editorOptions, readOnly: prepared.readOnly, disabled: prepared.disabled }
  const label = column.caption
  switch (prepared.editorName) {
    case 'dxNumberBox':
      return (
        <NumberBoxEditor
          label={label}
          value={value}
          onValueChange={setValue}
          options={options}
          className={className}
          onKeyDown={cellInfo.onFieldKeyDown}
          locale={locale}
        />
      )
    case 'dxDateBox':
      return (
        <DateBoxEditor
          label={label}
          value={value}
          onValueChange={setValue}
          options={options}
          className={className}
          delay={MAX_TIMEOUT}
          flushOnUnmount={cellInfo.flushOnUnmount}
          onKeyDown={cellInfo.onFieldKeyDown}
          locale={locale}
        />
      )
    case 'dxSelectBox':
      return (
        <SelectBoxEditor
          label={label}
          value={value}
          onValueChange={setValue}
          options={options}
          onKeyDown={moveFocusWithinRow}
          listLabel={formatMessage('dxDataGrid-ariaEditorOptions', label)}
        />
      )
    case 'dxCheckBox':
      return <CheckBoxEditor label={label} value={value} onValueChange={setValue} readOnly={options.readOnly} />
    default:
      return (
        <TextBoxEditor
          label={label}
          value={value == null ? '' : String(value)}
          onValueChange={setValue}
          options={options}
          className={className}
          delay={MAX_TIMEOUT}
          flushOnUnmount={cellInfo.flushOnUnmount}
          onKeyDown={cellInfo.onEditKeyDown}
          clearLabel={formatMessage('dxDataGrid-ariaClearValue', label)}
        />
      )
  }
}
