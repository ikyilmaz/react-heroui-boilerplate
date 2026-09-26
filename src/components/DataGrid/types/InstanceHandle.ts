import type { DataGridInstance } from './DataGridInstance'
import type { GridRuntime } from './GridRuntime'

/** The stable instance and the runtime it reads, replaced after every render. */
export interface InstanceHandle<TRow extends object> {
  instance: DataGridInstance<TRow>
  getRuntime: () => GridRuntime<TRow>
  /** A getter, so a render's runtime can be handed over without being read. */
  setRuntime: (getRuntime: () => GridRuntime<TRow>) => void
  hasRuntime: () => boolean
}
