import { useCallback, useRef } from 'react'

/**
 * React Aria's `onSortChange` does not say which keys were held. They are captured on the way
 * down (pointer or keyboard) so a header click can tell Shift / Ctrl / ⌘ apart, as DevExtreme's
 * multiple sorting needs.
 */
export function useSortModifierKeys() {
  const modifiers = useRef({ shiftKey: false, ctrlKey: false })
  const capture = useCallback((e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
    modifiers.current = { shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey }
  }, [])
  const getModifiers = useCallback(() => modifiers.current, [])
  return { getModifiers, onPointerDownCapture: capture, onKeyDownCapture: capture }
}
