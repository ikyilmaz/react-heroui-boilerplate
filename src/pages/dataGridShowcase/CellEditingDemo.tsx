import { RequestsWidget } from '@/pages/requests/RequestsWidget'
import { REQUEST_COLUMNS_ALWAYS_EDITING } from '@/pages/requests/requestColumnsAlwaysEditing'
import { CELL_EDITING_REQUESTS } from '@/pages/requests/requestStores'

/** Cell editing with every editor open: each change is saved when the field is left. */
export function CellEditingDemo({ onAnnounce }: { onAnnounce: (message: string) => void }) {
  return (
    <RequestsWidget
      store={CELL_EDITING_REQUESTS}
      columns={REQUEST_COLUMNS_ALWAYS_EDITING}
      mode="cell"
      pageSize={5}
      onAnnounce={onAnnounce}
    />
  )
}
