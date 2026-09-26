import { useCallback, useState } from 'react'
import { createStatusStore } from '../functions/createStatusStore'
import type { StatusStore } from '../types/StatusStore'

/**
 * Screen reader announcements. The message lives in a small store read only by `StatusRegion`:
 * kept as grid state, every announcement (two updates: clear, then the text) re-rendered the
 * whole grid twice — and with it every table cell.
 */
export function useStatusMessage(): [StatusStore, (message: string) => void] {
  const [store] = useState(createStatusStore)
  const announce = useCallback(
    (next: string) => {
      // The same text twice in a row is not read again; clear first
      store.set('')
      requestAnimationFrame(() => store.set(next))
    },
    [store],
  )
  return [store, announce]
}
