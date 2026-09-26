import type { EditorName } from '../EditorName'
import type { EditorOptions } from '../EditorOptions'
import type { RowObject } from '../RowObject'
import type { EventInfo } from './EventInfo'

/**
 * Fired before each built-in editor renders. Change `editorName` / `editorOptions` to adjust it,
 * or set `cancel` to render nothing.
 */
export interface EditorPreparingEvent<TRow> extends EventInfo<TRow> {
  parentType: 'dataRow' | 'filterRow' | 'searchPanel'
  dataField?: string
  value: unknown
  setValue: (value: unknown) => void
  editorName: EditorName
  editorOptions: EditorOptions
  readOnly: boolean
  disabled: boolean
  cancel: boolean
  row?: RowObject<TRow>
}
