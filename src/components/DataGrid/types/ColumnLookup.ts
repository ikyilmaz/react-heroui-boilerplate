/** Makes a column show one field of another list, like DevExtreme's `lookup`. */
export interface ColumnLookup<TItem = unknown> {
  dataSource: TItem[]
  /** Field of the lookup item stored in the row. Without it the item itself is the value. */
  valueExpr?: string
  /** Field (or function) shown in cells and editors. */
  displayExpr?: string | ((item: TItem) => string)
  /** The editor offers an empty choice. @default false */
  allowClearing?: boolean
}
