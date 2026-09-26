import type { ReactNode } from 'react'
import { Surface } from '@heroui/react'
import { NumberBox } from '@/components/NumberBox'
import { getNumberFormatOptions } from '../../functions/getNumberFormatOptions'
import { useStableValue } from '../../hooks/useStableValue'
import type { EditorOptions } from '../../types/EditorOptions'
import type { KeyHandler } from '../../types/KeyHandler'

export interface NumberBoxEditorProps {
  label: string
  value: unknown
  onValueChange: (value: number | null) => void
  options: EditorOptions
  prefix?: ReactNode
  className?: string
  /** Wraps the field; for Enter / Escape / Tab in edit rows. */
  onKeyDown?: KeyHandler
  locale: string
}

/** Number editor (dxNumberBox). NumberBox writes on blur / Enter itself; nothing to buffer. */
export function NumberBoxEditor({
  label,
  value,
  onValueChange,
  options,
  prefix,
  className,
  onKeyDown,
  locale,
}: NumberBoxEditorProps) {
  // A new options object on every render would make the field reformat mid-typing
  const formatOptions = useStableValue(getNumberFormatOptions(options.format))
  const field = (
    <NumberBox
      aria-label={label}
      className={className}
      compact
      isClearable={options.showClearButton !== false}
      prefix={prefix}
      value={typeof value === 'number' ? value : null}
      onChange={onValueChange}
      // No room for − / + in a cell unless asked for; stepping stays on the arrow keys
      showControls={!!options.showSpinButtons}
      minValue={options.min}
      maxValue={options.max}
      step={options.step}
      formatOptions={formatOptions}
      placeholder={options.placeholder}
      isReadOnly={options.readOnly}
      isDisabled={options.disabled}
      locale={locale}
    />
  )
  return onKeyDown ? (
    <Surface variant="transparent" onKeyDown={onKeyDown}>
      {field}
    </Surface>
  ) : (
    field
  )
}
