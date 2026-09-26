import type { SortingMode } from './SortingMode'

export interface SortingOptions {
  /**
   * `'multiple'`: Shift+click adds a column, Ctrl/⌘+click removes one.
   * @default 'single'
   */
  mode?: SortingMode
  /** Show the order number of each sorted column (`multiple` mode). @default false */
  showSortIndexes?: boolean
}
