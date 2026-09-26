import type { ReactNode } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { Surface } from '@heroui/react'
import { FIELD_ICON_SIZE } from '@/components/fieldIconButton'
import { DEFAULT_COLUMN_BUTTONS } from '../../constants/defaultColumnButtons'
import type { RowKey } from '../../data/types/RowKey'
import { renderIcon } from '../../functions/renderIcon'
import { resolveRowPermission } from '../../functions/resolveRowPermission'
import { formatMessage } from '../../localization/formatMessage'
import type { ColumnButton } from '../../types/ColumnButton'
import type { ColumnButtonName } from '../../types/ColumnButtonName'
import type { DataGridInstance } from '../../types/DataGridInstance'
import type { GridColumn } from '../../types/GridColumn'
import type { EditingMode } from '../../types/options/EditingMode'
import type { RowPermission } from '../../types/options/RowPermission'
import type { ResolvedEditingTexts } from '../../types/ResolvedEditingTexts'
import type { RowObject } from '../../types/RowObject'
import { CommandButton } from './CommandButton'

const BUILT_IN_ICONS: Record<ColumnButtonName, ReactNode> = {
  edit: <Pencil size={FIELD_ICON_SIZE} aria-hidden />,
  delete: <Trash2 size={FIELD_ICON_SIZE} aria-hidden />,
  save: <Check size={16} aria-hidden />,
  cancel: <X size={16} aria-hidden />,
}

export interface CommandCellContentProps<TRow> {
  column: GridColumn<TRow>
  row: RowObject<TRow>
  rowLabel: string
  component: DataGridInstance<TRow>
  editingMode: EditingMode
  allowUpdating: RowPermission<TRow> | undefined
  allowDeleting: RowPermission<TRow> | undefined
  texts: ResolvedEditingTexts
  registerEditButton: (key: RowKey, el: HTMLButtonElement | null) => void
}

/**
 * A buttons column cell. Built-in buttons show when they apply — edit / delete outside editing,
 * save / cancel while the row is edited (`row` mode); `cell` mode has no edit / save / cancel.
 */
export function CommandCellContent<TRow>({
  column,
  row,
  rowLabel,
  component,
  editingMode,
  allowUpdating,
  allowDeleting,
  texts,
  registerEditButton,
}: CommandCellContentProps<TRow>) {
  const rowMode = editingMode === 'row'
  const editing = rowMode && row.isEditing
  const builtIn: Record<ColumnButtonName, { visible: boolean; hint: string; action: () => void }> = {
    edit: {
      visible: rowMode && !editing && resolveRowPermission(allowUpdating, row),
      hint: texts.editRow,
      action: () => void component.editRow(row.rowIndex),
    },
    delete: {
      visible: !editing && resolveRowPermission(allowDeleting, row),
      hint: texts.deleteRow,
      action: () => void component.deleteRow(row.rowIndex),
    },
    save: { visible: editing, hint: texts.saveRowChanges, action: () => void component.saveEditData() },
    cancel: { visible: editing, hint: texts.cancelRowChanges, action: () => void component.cancelEditData() },
  }

  const buttons = (column.buttons ?? DEFAULT_COLUMN_BUTTONS).map(
    (b): ColumnButton<TRow> => (typeof b === 'string' ? { name: b } : b),
  )
  const content = buttons.map((button, i) => {
    const base = button.name ? builtIn[button.name] : undefined
    const visible =
      typeof button.visible === 'function'
        ? button.visible({ row })
        : (button.visible ?? true) && (base ? base.visible : !editing)
    if (!visible) return null
    const hint = button.hint ?? base?.hint ?? button.text ?? ''
    const disabled = typeof button.disabled === 'function' ? button.disabled({ row }) : button.disabled
    const onPress = () => {
      if (button.onClick) button.onClick({ component, row, column })
      else base?.action()
    }
    return (
      <CommandButton
        key={button.name ?? i}
        hint={hint}
        ariaLabel={formatMessage('dxDataGrid-ariaRowCommand', hint, rowLabel)}
        icon={button.icon !== undefined ? renderIcon(button.icon, FIELD_ICON_SIZE) : button.name ? BUILT_IN_ICONS[button.name] : null}
        text={button.icon === undefined && !button.name ? button.text : undefined}
        primary={button.name === 'save'}
        danger={button.name === 'delete'}
        tooltip={button.name !== 'save' && button.name !== 'cancel'}
        disabled={disabled}
        className={button.cssClass}
        buttonRef={button.name === 'edit' ? (el) => registerEditButton(row.key, el) : undefined}
        onPress={onPress}
      />
    )
  })

  return (
    <Surface
      variant="transparent"
      role="group"
      aria-label={formatMessage('dxDataGrid-ariaRowCommands', rowLabel)}
      className="flex items-center gap-1"
    >
      {content}
    </Surface>
  )
}
