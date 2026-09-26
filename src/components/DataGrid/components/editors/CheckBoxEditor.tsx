import { Checkbox } from '@heroui/react'

/** Boolean editor (dxCheckBox); read-only it doubles as the boolean cell display. */
export function CheckBoxEditor({
  label,
  value,
  onValueChange,
  readOnly = false,
}: {
  label: string
  value: unknown
  onValueChange?: (value: boolean) => void
  readOnly?: boolean
}) {
  return (
    <Checkbox
      aria-label={label}
      // Out of the table's `slot="selection"` context
      slot={null}
      isSelected={value === true}
      isIndeterminate={value === null || value === undefined}
      isReadOnly={readOnly}
      onChange={onValueChange}
      variant="secondary"
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  )
}
