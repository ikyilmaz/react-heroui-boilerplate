import type { EventInfo } from './EventInfo'

export interface InitNewRowEvent<TRow> extends EventInfo<TRow> {
  /** Fill in (or replace) the new row's initial values. */
  data: Partial<TRow>
  /** Resolve once `data` is ready, for async initialization. */
  promise?: Promise<void>
}
