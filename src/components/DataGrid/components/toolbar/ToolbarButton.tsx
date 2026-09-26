import { Button } from '@heroui/react'
import { renderIcon } from '../../functions/renderIcon'
import type { ToolbarButtonOptions } from '../../types/options/ToolbarButtonOptions'
import type { DataGridInstance } from '../../types/DataGridInstance'

const VARIANTS = {
  normal: { contained: 'secondary', outlined: 'outline', text: 'ghost' },
  default: { contained: 'primary', outlined: 'outline', text: 'ghost' },
  danger: { contained: 'danger', outlined: 'danger-soft', text: 'ghost' },
  success: { contained: 'primary', outlined: 'outline', text: 'ghost' },
} as const

/** A `widget: 'dxButton'` toolbar item (also the built-in add-row / apply-filter buttons). */
export function ToolbarButton<TRow>({
  options,
  disabled,
  component,
  className,
}: {
  options: ToolbarButtonOptions<TRow>
  disabled?: boolean
  component: DataGridInstance<TRow>
  className?: string
}) {
  const variant = VARIANTS[options.type ?? 'normal'][options.stylingMode ?? 'contained']
  const iconOnly = !options.text
  return (
    <Button
      size="sm"
      variant={variant}
      isIconOnly={iconOnly}
      isDisabled={disabled || options.disabled}
      aria-label={options.hint ?? options.text}
      data-dx-tip={options.hint}
      className={className}
      onPress={() => options.onClick?.({ component })}
    >
      {options.icon !== undefined && renderIcon(options.icon, 16)}
      {options.text}
    </Button>
  )
}
