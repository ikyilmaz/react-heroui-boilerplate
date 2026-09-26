import type { KeyHandler } from '../KeyHandler'
import type { ColumnCellTemplateData } from './ColumnCellTemplateData'

/** What `editCellRender` receives. */
export interface ColumnEditCellTemplateData<TRow> extends ColumnCellTemplateData<TRow> {
  /** Writes the value (through `setCellValue`). */
  setValue: (value: unknown) => void
  /** Not in DevExtreme: for text inputs — Enter saves, Escape cancels, Tab stays in the row. */
  onEditKeyDown: KeyHandler
  /** Not in DevExtreme: for fields that handle their own keys — only Enter / Escape / Tab. */
  onFieldKeyDown: KeyHandler
  /** Not in DevExtreme: how long typed text should wait before `setValue` (`useBufferedValue`). */
  updateValueTimeout: number
  /** Not in DevExtreme: whether a pending value must be written when the editor unmounts. */
  flushOnUnmount: boolean
}
