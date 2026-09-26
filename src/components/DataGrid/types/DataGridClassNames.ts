/**
 * Not in DevExtreme: class slots of the grid, merged onto the defaults with `cn` (conflicting
 * Tailwind utilities replace the default ones).
 */
export interface DataGridClassNames {
  root: string
  toolbar: string
  /** Wraps the table and the pager. */
  body: string
  table: string
  scrollContainer: string
  /** The `<table>`; the minimum width before horizontal scrolling lives here. */
  content: string
  header: string
  headerCell: string
  selectionColumn: string
  commandColumn: string
  cell: string
  selectionCell: string
  commandCell: string
  row: string
  /** Rounds the first/last cell of the row highlight. */
  rowCorners: string
  editRow: string
  selectedRow: string
  /** `hoverStateEnabled: false`, the filter row and the no-data row. */
  noHover: string
  alternateRow: string
  rowLines: string
  columnLines: string
  borders: string
  wordWrap: string
  filterCell: string
  filterEditor: string
  editor: string
  noData: string
  pager: string
  loadPanel: string
}
