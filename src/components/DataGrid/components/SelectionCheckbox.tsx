import { Checkbox } from '@heroui/react'

/** RAC wires `slot="selection"` check boxes to the table's selection state. */
export function SelectionCheckbox({ 'aria-label': ariaLabel }: { 'aria-label': string }) {
  return (
    <Checkbox aria-label={ariaLabel} slot="selection" variant="secondary">
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  )
}
