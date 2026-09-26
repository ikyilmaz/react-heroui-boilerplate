import { useLayoutEffect, useRef } from 'react'

/**
 * A ref holding the latest value for event handlers and imperative methods. Synced in a layout
 * effect, i.e. before any handler can run after a render; handlers that change the value write
 * the ref themselves, so a save in the same event sees what was just written.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
