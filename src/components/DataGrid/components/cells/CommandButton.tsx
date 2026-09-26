import type { ReactNode, Ref } from 'react'
import { Button, cn } from '@heroui/react'
import { ICON_MUTED } from '@/components/fieldIconButton'
import { moveFocusWithinRow } from '../../functions/moveFocusWithinRow'

/**
 * One button of a buttons column. The hint is shown by the grid's shared tooltip (`data-dx-tip`)
 * and is part of the accessible name.
 */
export function CommandButton({
  hint,
  ariaLabel,
  icon,
  text,
  primary = false,
  danger = false,
  tooltip = true,
  disabled,
  className,
  buttonRef,
  onPress,
}: {
  hint: string
  ariaLabel: string
  icon: ReactNode
  text?: string
  primary?: boolean
  danger?: boolean
  tooltip?: boolean
  disabled?: boolean
  className?: string
  buttonRef?: Ref<HTMLButtonElement>
  onPress: () => void
}) {
  return (
    <Button
      ref={buttonRef}
      size="sm"
      variant={primary ? 'primary' : 'ghost'}
      isIconOnly={!text}
      isDisabled={disabled}
      aria-label={ariaLabel}
      data-dx-tip={tooltip && hint ? hint : undefined}
      // Same tone as the other icon buttons; the danger color only on interaction
      className={cn(!primary && ICON_MUTED, danger && 'hover:text-danger', className)}
      onPress={onPress}
      onKeyDown={moveFocusWithinRow}
    >
      {icon}
      {text}
    </Button>
  )
}
