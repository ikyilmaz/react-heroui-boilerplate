import { useMemo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ListBox, Select, cn } from '@heroui/react'
import { FIELD_ICON_SIZE, fieldIconButton } from '@/components/fieldIconButton'
import { FieldSelectIndicator } from '@/components/FieldSelectIndicator'
import { compileGetter } from '../../data/functions/compileGetter'
import type { EditorOptions } from '../../types/EditorOptions'
import type { KeyHandler } from '../../types/KeyHandler'

const ALL_KEY = '__dx_all'

export interface SelectBoxEditorProps {
  label: string
  value: unknown
  onValueChange: (value: unknown) => void
  options: EditorOptions
  className?: string
  onKeyDown?: KeyHandler
  listLabel: string
  /** Filter row: an entry meaning "no filter" (`null`). */
  allText?: string
  /** Filter row: the operation chooser, laid over the trigger's start. */
  overlay?: ReactNode
}

/**
 * Select editor (dxSelectBox), for lookups and boolean filters. Items come from
 * `dataSource` / `valueExpr` / `displayExpr`.
 *
 * `Select.Trigger` is a `<button>`, so the operation chooser cannot sit inside it; it is a
 * separate layer positioned over the trigger. `Select.ClearButton` is a `span` for the same
 * reason (a `Button` would become the trigger through RAC's `ButtonContext`).
 */
export function SelectBoxEditor({
  label,
  value,
  onValueChange,
  options,
  className,
  onKeyDown,
  listLabel,
  allText,
  overlay,
}: SelectBoxEditorProps) {
  const { dataSource, valueExpr, displayExpr } = options
  const items = useMemo(() => {
    const valueOf = valueExpr ? compileGetter(valueExpr) : (item: unknown) => item
    const textOf =
      typeof displayExpr === 'function'
        ? displayExpr
        : displayExpr
          ? (item: unknown) => String(compileGetter(displayExpr)(item) ?? '')
          : (item: unknown) => String(item ?? '')
    return (dataSource ?? []).map((item) => {
      const v = valueOf(item)
      return { key: String(v), value: v, text: textOf(item) }
    })
  }, [dataSource, displayExpr, valueExpr])
  const hasValue = value !== null && value !== undefined
  const selected = hasValue ? String(value) : allText !== undefined ? ALL_KEY : null
  return (
    <>
      <Select
        aria-label={label}
        className={className}
        value={selected}
        onChange={(k) => {
          if (k === null || k === ALL_KEY) onValueChange(null)
          else onValueChange(items.find((i) => i.key === String(k))?.value)
        }}
        isDisabled={options.disabled || options.readOnly}
        placeholder={options.placeholder}
        fullWidth
      >
        <Select.Trigger
          onKeyDown={onKeyDown}
          className={cn('h-8 min-h-0 items-center py-1 pe-8', overlay ? 'ps-10' : undefined)}
        >
          <Select.Value />
          {hasValue && options.showClearButton && (
            <Select.ClearButton className={fieldIconButton}>
              <X size={FIELD_ICON_SIZE} aria-hidden />
            </Select.ClearButton>
          )}
          <FieldSelectIndicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label={listLabel}>
            {allText !== undefined ? (
              <ListBox.Item id={ALL_KEY} textValue={allText}>
                {allText}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ) : null}
            {items.map((i) => (
              <ListBox.Item key={i.key} id={i.key} textValue={i.text}>
                {i.text}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {overlay}
    </>
  )
}
