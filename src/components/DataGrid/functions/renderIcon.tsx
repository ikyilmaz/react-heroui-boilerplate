import { isValidElement, type ReactNode } from 'react'
import type { IconComponent } from '../types/IconComponent'

/** An icon given as a component (`Plus`) or as an element (`<Plus />`). */
export function renderIcon(icon: IconComponent | ReactNode, size: number): ReactNode {
  const isComponent =
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && !Array.isArray(icon) && !isValidElement(icon))
  if (!isComponent) return icon as ReactNode
  const Icon = icon as IconComponent
  return <Icon size={size} aria-hidden />
}
