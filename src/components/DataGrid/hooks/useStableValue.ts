import { useState } from 'react'
import { isDeepEqual } from '../functions/isDeepEqual'

/**
 * Returns the previous value while the new one is structurally equal. Option objects written
 * inline (`paging={{ pageSize: 8 }}`) are new on every parent render; this keeps them from
 * invalidating everything computed from them.
 */
export function useStableValue<T>(value: T): T {
  const [stable, setStable] = useState(value)
  if (stable !== value && !isDeepEqual(stable, value)) {
    setStable(value)
    return value
  }
  return stable
}
