export interface PagerOptions {
  /** `'auto'`: shown while paging is enabled. @default 'auto' */
  visible?: boolean | 'auto'
  /** `'auto'`: half, equal and double the page size. @default 'auto' */
  allowedPageSizes?: number[] | 'auto'
  /** @default false */
  showPageSizeSelector?: boolean
  /** @default false */
  showInfo?: boolean
  /** `{0}` page, `{1}` page count, `{2}` total row count. */
  infoText?: string
  /** @default false */
  showNavigationButtons?: boolean
  /** Accessible name of the pager. */
  label?: string
}
