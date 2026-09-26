export interface CustomizeTextCellInfo {
  value: unknown
  /** The formatted value. */
  valueText: string
  target: 'row' | 'filterRow' | 'search'
}
