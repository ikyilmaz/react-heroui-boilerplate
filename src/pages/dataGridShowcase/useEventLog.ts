import { useCallback, useState } from 'react'

const MAX_ENTRIES = 50

/** The newest events first, capped. */
export function useEventLog() {
  const [entries, setEntries] = useState<{ id: number; text: string }[]>([])
  const log = useCallback((text: string) => {
    setEntries((list) => [{ id: Date.now() + Math.random(), text }, ...list].slice(0, MAX_ENTRIES))
  }, [])
  const clear = useCallback(() => setEntries([]), [])
  return { entries, log, clear }
}
