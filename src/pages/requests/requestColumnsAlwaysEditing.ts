import type { Column } from '@/components/DataGrid'
import { REQUEST_COLUMNS } from './requestColumns'
import type { Request } from './Request'

/** Cell-editing demo: every data column keeps its editor open (`showEditorAlways`). */
export const REQUEST_COLUMNS_ALWAYS_EDITING: Column<Request>[] = REQUEST_COLUMNS.map((c) =>
  c.type ? c : { ...c, showEditorAlways: true },
)
