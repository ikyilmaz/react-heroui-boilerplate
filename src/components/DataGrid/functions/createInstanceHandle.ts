import type { GridRuntime } from '../types/GridRuntime'
import type { InstanceHandle } from '../types/InstanceHandle'
import { createDataGridInstance } from './createDataGridInstance'

/** The grid's stable instance (`ref.current.instance()`), reading the last committed render. */
export function createInstanceHandle<TRow extends object>(): InstanceHandle<TRow> {
  let current: (() => GridRuntime<TRow>) | undefined
  const getRuntime = () => {
    if (!current) throw new Error('DataGrid: the instance is not available before the grid renders')
    return current()
  }
  return {
    instance: createDataGridInstance(getRuntime),
    getRuntime,
    setRuntime: (next) => {
      current = next
    },
    hasRuntime: () => current !== undefined,
  }
}
