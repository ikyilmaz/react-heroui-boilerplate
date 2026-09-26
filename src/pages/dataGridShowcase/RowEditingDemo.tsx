import { RequestsWidget } from '@/pages/requests/RequestsWidget'
import { REQUEST_COLUMNS } from '@/pages/requests/requestColumns'
import { ROW_EDITING_REQUESTS } from '@/pages/requests/requestStores'

/** Row editing: edit a row, then save (Enter) or cancel (Escape). */
export function RowEditingDemo({ onAnnounce }: { onAnnounce: (message: string) => void }) {
  return (
    <RequestsWidget
      store={ROW_EDITING_REQUESTS}
      columns={REQUEST_COLUMNS}
      mode="row"
      // Toolbar + table + pager fit on one screen
      pageSize={8}
      onAnnounce={onAnnounce}
    />
  )
}
