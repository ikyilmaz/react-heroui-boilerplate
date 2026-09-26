import { useCallback } from 'react'
import { moveFocusWithinRow } from '../functions/moveFocusWithinRow'
import type { KeyHandler } from '../types/KeyHandler'

/**
 * Enter finishes editing (`saveEditData` in row mode, `closeEditCell` in cell mode), Escape
 * cancels, Tab stays in the row.
 */
export function useEditKeyHandlers(finish: () => void, cancel: () => void) {
  const onEditKeyDown = useCallback<KeyHandler>(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        finish()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancel()
      } else {
        moveFocusWithinRow(e)
      }
    },
    [cancel, finish],
  )

  /** Date / number fields handle their own keys; only Enter, Escape and Tab are taken. */
  const onFieldKeyDown = useCallback<KeyHandler>(
    (e) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') onEditKeyDown(e)
    },
    [onEditKeyDown],
  )

  return { onEditKeyDown, onFieldKeyDown }
}
