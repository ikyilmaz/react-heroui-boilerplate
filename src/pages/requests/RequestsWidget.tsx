import { useMemo } from 'react'
import { DataGrid, type Column, type Store, type ToolbarOptions } from '@/components/DataGrid'
import { createRequest } from './createRequest'
import { getRequestLabel } from './getRequestLabel'
import { GRID_CARD_CLASS_NAMES } from './gridCardClassNames'
import type { Request } from './Request'
import { RequestsToolbarButtons } from './RequestsToolbarButtons'

/**
 * Requests table widget: row editing (`editing.mode: 'row'`), or every editor open with each
 * change saved at once (`mode: 'cell'` + columns with `showEditorAlways`).
 */
export function RequestsWidget({
  store,
  columns,
  mode,
  pageSize,
  onAnnounce,
}: {
  store: Store<Request>
  columns: Column<Request>[]
  mode: 'row' | 'cell'
  pageSize: number
  onAnnounce: (message: string) => void
}) {
  const toolbar = useMemo<ToolbarOptions<Request>>(
    () => ({
      items: [
        { name: 'searchPanel', location: 'before' },
        {
          location: 'after',
          render: ({ component }) => <RequestsToolbarButtons component={component} onAnnounce={onAnnounce} />,
        },
      ],
    }),
    [onAnnounce],
  )

  return (
    <DataGrid<Request>
      aria-label="Örnek istekler"
      dataSource={store}
      columns={columns}
      rowLabelExpr={getRequestLabel}
      hoverStateEnabled
      classNames={GRID_CARD_CLASS_NAMES}
      toolbar={toolbar}
      searchPanel={{ visible: true, placeholder: 'Ara' }}
      filterRow={{ visible: true, showAllText: 'Tümü' }}
      selection={{ mode: 'multiple', showCheckBoxesMode: 'always', selectAllMode: 'page' }}
      paging={{ pageSize }}
      pager={{
        showPageSizeSelector: true,
        allowedPageSizes: [10, 20, 50],
        showInfo: true,
        infoText: '{2} kayıt',
        showNavigationButtons: true,
      }}
      editing={{
        mode,
        allowAdding: true,
        allowUpdating: true,
        allowDeleting: true,
        newRowPosition: 'pageTop',
        texts: { confirmDeleteTitle: '{0} silinsin mi?', confirmDeleteMessage: 'Bu işlem geri alınamaz.' },
      }}
      onInitNewRow={(e) => Object.assign(e.data, createRequest())}
    />
  )
}
