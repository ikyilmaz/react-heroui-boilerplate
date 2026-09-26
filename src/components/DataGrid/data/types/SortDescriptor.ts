import type { Selector } from './Selector'

/** DevExtreme sort descriptor: `{ selector, desc }`. */
export interface SortDescriptor<TRow = unknown> {
  selector: Selector<TRow>
  desc?: boolean
  /** Compares two selector values; replaces the default comparison. */
  compare?: (value1: unknown, value2: unknown) => number
}
