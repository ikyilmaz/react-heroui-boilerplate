import { useCallback, useState } from 'react'
import { isDeepEqual } from '../functions/isDeepEqual'

/**
 * State for an option that starts from a prop and follows it when the prop changes (DevExtreme's
 * option binding): `paging.pageIndex`, `selectedRowKeys`, `searchPanel.text`…
 */
export function useOptionState<T>(prop: T | undefined, fallback: T): [T, (value: T) => void] {
  const [state, setState] = useState(() => ({ value: prop ?? fallback, prop }))
  let current = state
  if (!isDeepEqual(prop, state.prop)) {
    current = { value: prop ?? fallback, prop }
    setState(current)
  }
  const set = useCallback((value: T) => setState((s) => ({ ...s, value })), [])
  return [current.value, set]
}
