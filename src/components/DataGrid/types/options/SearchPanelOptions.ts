export interface SearchPanelOptions {
  /** @default false */
  visible?: boolean
  /** Search text; changing the prop searches. */
  text?: string
  placeholder?: string
  width?: number | string
  /** @default true */
  highlightSearchText?: boolean
  /** @default false */
  highlightCaseSensitive?: boolean
  /** Search hidden columns too when `false`. @default false */
  searchVisibleColumnsOnly?: boolean
}
