import { useState } from 'react'
import { areSameKeys } from '../functions/areSameKeys'

/**
 * Like `useMemo`, but recomputes only when `keys` change — also when `compute` reads other
 * values on purpose (the visible columns read the column states, yet only visibility changes may
 * rebuild them). Kept in state and adjusted during render, React's pattern for derived state.
 */
export function useMemoByKey<T>(compute: () => T, keys: readonly unknown[]): T {
  const [state, setState] = useState(() => ({ keys, value: compute() }))
  if (!areSameKeys(state.keys, keys)) {
    const value = compute()
    setState({ keys, value })
    return value
  }
  return state.value
}
