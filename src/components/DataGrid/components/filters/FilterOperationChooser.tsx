import { memo } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button, Dropdown, cn } from '@heroui/react'
import { FIELD_ICON_BUTTON, FIELD_ICON_SIZE } from '@/components/fieldIconButton'
import { formatMessage } from '../../localization/formatMessage'
import type { FilterOperation } from '../../types/FilterOperation'
import type { OperationOption } from '../../types/OperationOption'

const RESET_KEY = '__dx_reset'

export interface FilterOperationChooserProps {
  caption: string
  operations: OperationOption[]
  value: FilterOperation | undefined
  onChange: (operation: FilterOperation) => void
  onReset: () => void
  resetText: string
}

/**
 * The filter row's operation chooser: the column's `filterOperations` plus "Reset", as in
 * DevExtreme. The chosen operation goes into the trigger's accessible name.
 *
 * A `Dropdown` (menu), not a `Select`: a Select builds its option collection and a hidden native
 * `<select>` with every option even while closed — seven of them in the filter row, re-rendered
 * with it. The dropdown's menu exists only while it is open.
 */
export const FilterOperationChooser = memo(function FilterOperationChooser({
  caption,
  operations,
  value,
  onChange,
  onReset,
  resetText,
}: FilterOperationChooserProps) {
  const current = operations.find((o) => o.id === value) ?? operations[0]
  if (!current) return null
  const Icon = current.icon
  return (
    <Dropdown>
      {/*
        `slot={null}`: the chooser sits inside number and date fields, whose button contexts
        (increment / decrement, open calendar) would otherwise claim it. The dropdown's trigger
        is wired through React Aria's press context, not the button context.
      */}
      <Button
        slot={null}
        variant="ghost"
        size="sm"
        isIconOnly
        className={cn('mx-1 shrink-0', FIELD_ICON_BUTTON)}
        aria-label={formatMessage('dxDataGrid-ariaFilterOperation', caption, current.text)}
      >
        <Icon size={FIELD_ICON_SIZE} aria-hidden />
      </Button>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          aria-label={formatMessage('dxDataGrid-ariaFilterOperations', caption)}
          selectionMode="single"
          selectedKeys={[current.id]}
          onAction={(key) => {
            if (key === RESET_KEY) onReset()
            else onChange(key as FilterOperation)
          }}
        >
          {operations.map((o) => {
            const ItemIcon = o.icon
            return (
              <Dropdown.Item key={o.id} id={o.id} textValue={o.text}>
                <ItemIcon size={14} aria-hidden />
                {o.text}
                <Dropdown.ItemIndicator />
              </Dropdown.Item>
            )
          })}
          <Dropdown.Item id={RESET_KEY} textValue={resetText} className="mt-1 border-t border-separator">
            <RotateCcw size={14} aria-hidden />
            {resetText}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
})
