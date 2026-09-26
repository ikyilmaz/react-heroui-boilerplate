import type { RequestStatusItem } from './RequestStatusItem'

/** The status column's lookup `dataSource`. */
export const REQUEST_STATUSES: RequestStatusItem[] = [
  { id: 'waiting', label: 'Bekliyor', color: 'accent' },
  { id: 'urgent', label: 'Acil', color: 'danger' },
  { id: 'info', label: 'Bilgi', color: 'default' },
  { id: 'approved', label: 'Onaylandı', color: 'success' },
]
