import { useMemo } from 'react'
import { CheckSquare, RefreshCw, Square } from 'lucide-react'
import { Surface, Typography } from '@heroui/react'
import { DataGrid, type ToolbarOptions } from '@/components/DataGrid'
import { GRID_CARD_CLASS_NAMES } from '@/pages/requests/gridCardClassNames'
import { COMPACT_CONTENT } from './compactContent'
import { DemoPanel } from './DemoPanel'
import { PRODUCT_COLUMNS } from './productColumns'
import type { Product } from './Product'
import { EVENT_PRODUCTS } from './productStores'
import { useEventLog } from './useEventLog'

const CLASS_NAMES = { ...GRID_CARD_CLASS_NAMES, content: COMPACT_CONTENT }

/**
 * Events and the instance API: every editing / selection / option event is logged; an empty
 * product name is rejected in `onRowUpdating`; toolbar `dxButton`s call instance methods.
 */
export function EventsApiDemo() {
  const { entries, log } = useEventLog()

  const toolbar = useMemo<ToolbarOptions<Product>>(
    () => ({
      items: [
        { name: 'searchPanel', location: 'before' },
        {
          widget: 'dxButton',
          options: { icon: CheckSquare, hint: 'Tümünü seç', onClick: ({ component }) => component.selectAll() },
        },
        {
          widget: 'dxButton',
          options: { icon: Square, hint: 'Seçimi temizle', onClick: ({ component }) => component.clearSelection() },
        },
        {
          widget: 'dxButton',
          options: {
            icon: RefreshCw,
            hint: 'Yenile',
            onClick: ({ component }) => void component.refresh().then(() => log('refresh()')),
          },
        },
        'addRowButton',
      ],
    }),
    [log],
  )

  return (
    <Surface variant="transparent" className="flex flex-col gap-4">
      <DataGrid<Product>
        aria-label="Ürünler — olaylar"
        dataSource={EVENT_PRODUCTS}
        columns={PRODUCT_COLUMNS}
        classNames={CLASS_NAMES}
        rowLabelExpr="name"
        toolbar={toolbar}
        searchPanel={{ visible: true }}
        selection={{ mode: 'multiple', showCheckBoxesMode: 'always' }}
        editing={{ mode: 'row', allowAdding: true, allowUpdating: true, allowDeleting: true }}
        paging={{ pageSize: 6 }}
        pager={{ showInfo: true }}
        hoverStateEnabled
        onInitNewRow={(e) => {
          Object.assign(e.data, { name: 'Yeni ürün', category: 'kirtasiye', price: 0, stock: 0, active: true, created: new Date() })
          log('onInitNewRow')
        }}
        onEditingStart={(e) => log(`onEditingStart key=${e.key}`)}
        onSaving={(e) => log(`onSaving ${e.changes.map((c) => c.type).join(', ')}`)}
        onRowInserted={(e) => log(`onRowInserted key=${e.key}`)}
        onRowUpdating={(e) => {
          if ('name' in e.newData && !String(e.newData.name ?? '').trim()) {
            e.cancel = true
            log('onRowUpdating → iptal: ürün adı boş olamaz')
          } else log(`onRowUpdating ${JSON.stringify(e.newData)}`)
        }}
        onRowUpdated={(e) => log(`onRowUpdated key=${e.key}`)}
        onRowRemoved={(e) => log(`onRowRemoved key=${e.key}`)}
        onEditCanceled={() => log('onEditCanceled')}
        onSelectionChanged={(e) => log(`onSelectionChanged [${e.selectedRowKeys.join(', ')}]`)}
        onOptionChanged={(e) => {
          if (e.name !== 'editing') log(`onOptionChanged ${e.fullName} = ${JSON.stringify(e.value)}`)
        }}
      />
      <DemoPanel title="Olay günlüğü (en yeni üstte)">
        {entries.length ? (
          entries.map((entry) => (
            <Typography key={entry.id} type="body-xs" className="font-mono">
              {entry.text}
            </Typography>
          ))
        ) : (
          <Typography type="body-xs" color="muted">
            Bir satırı düzenleyin, seçin ya da sayfa değiştirin.
          </Typography>
        )}
      </DemoPanel>
    </Surface>
  )
}
