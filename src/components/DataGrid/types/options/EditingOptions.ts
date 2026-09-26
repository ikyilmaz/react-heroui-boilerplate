import type { DataChange } from '../../data/types/DataChange'
import type { RowKey } from '../../data/types/RowKey'
import type { EditingMode } from './EditingMode'
import type { EditingTexts } from './EditingTexts'
import type { NewRowPosition } from './NewRowPosition'
import type { RowPermission } from './RowPermission'
import type { StartEditAction } from './StartEditAction'

export interface EditingOptions<TRow> {
  /** @default 'row' */
  mode?: EditingMode
  /** @default false */
  allowAdding?: boolean
  /** @default false */
  allowUpdating?: RowPermission<TRow>
  /** @default false */
  allowDeleting?: RowPermission<TRow>
  /** @default true */
  confirmDelete?: boolean
  /** @default 'viewportTop' */
  newRowPosition?: NewRowPosition
  /** `'cell'` mode: how a cell enters edit mode. @default 'click' */
  startEditAction?: StartEditAction
  /** @default false */
  selectTextOnEditStart?: boolean
  texts?: EditingTexts
  /** Initial pending changes; changing the prop replaces them. */
  changes?: DataChange<TRow>[]
  /** Initially edited row; changing the prop starts editing it. */
  editRowKey?: RowKey | null
  editColumnName?: string | null
}
