import type { EventInfo } from './EventInfo'

export interface DataErrorOccurredEvent<TRow> extends EventInfo<TRow> {
  error: Error
}
