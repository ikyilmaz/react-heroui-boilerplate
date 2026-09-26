import type { ReactNode } from 'react'
import { Surface } from '@heroui/react'
import type { StartEditAction } from '../../types/options/StartEditAction'

/**
 * `cell` mode: a click (or double click) on the cell's content opens its editor. The pointer
 * event stops here so React Aria does not treat it as a row press (selection).
 */
export function StartEditArea({
  action,
  onStart,
  children,
}: {
  action: StartEditAction
  onStart: () => void
  children: ReactNode
}) {
  return (
    <Surface
      variant="transparent"
      className="min-w-0 cursor-text"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={action === 'click' ? onStart : undefined}
      onDoubleClick={action === 'dblClick' ? onStart : undefined}
    >
      {children}
    </Surface>
  )
}
