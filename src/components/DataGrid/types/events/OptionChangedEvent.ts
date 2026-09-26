import type { EventInfo } from './EventInfo'

export interface OptionChangedEvent<TRow> extends EventInfo<TRow> {
  /** Top-level option: `'paging'`, `'columns'`, `'selectedRowKeys'`… */
  name: string
  /** Full path: `'paging.pageIndex'`, `'columns[2].filterValue'`… */
  fullName: string
  value: unknown
  previousValue: unknown
}
