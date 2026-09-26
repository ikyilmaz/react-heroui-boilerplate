import { useState } from 'react'
import { Surface, Typography } from '@heroui/react'
import { CustomStore, DataGrid, queryByOptions, type LoadOptions } from '@/components/DataGrid'
import { GRID_CARD_CLASS_NAMES } from '@/pages/requests/gridCardClassNames'
import { COMPACT_CONTENT } from './compactContent'
import { DemoPanel } from './DemoPanel'
import { formatLoadOptions } from './formatLoadOptions'
import { PRODUCT_COLUMNS } from './productColumns'
import type { Product } from './Product'
import { SERVER_PRODUCTS } from './productStores'

const CLASS_NAMES = { ...GRID_CARD_CLASS_NAMES, content: COMPACT_CONTENT }
const LATENCY_MS = 400

/**
 * A `CustomStore` over a simulated server: with `remoteOperations`, filtering, sorting and paging
 * are sent to `load` — the panel shows what the server received.
 */
export function RemoteDataDemo() {
  const [lastLoad, setLastLoad] = useState<LoadOptions<Product> | null>(null)
  const [calls, setCalls] = useState(0)
  const [store] = useState(
    () =>
      new CustomStore<Product>({
        key: 'id',
        load: async (options) => {
          setLastLoad(options)
          setCalls((n) => n + 1)
          await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
          // The "server" answers with one processed page and the total count
          return queryByOptions(SERVER_PRODUCTS, options)
        },
      }),
  )
  return (
    <Surface variant="transparent" className="flex flex-col gap-4">
      <DataGrid<Product>
        aria-label="Ürünler — uzak veri"
        dataSource={store}
        remoteOperations
        columns={PRODUCT_COLUMNS}
        classNames={CLASS_NAMES}
        filterRow={{ visible: true }}
        searchPanel={{ visible: true }}
        toolbar={{ items: [{ name: 'searchPanel', location: 'before' }] }}
        paging={{ pageSize: 10 }}
        pager={{ showInfo: true, showPageSizeSelector: true, allowedPageSizes: [10, 25, 50], showNavigationButtons: true }}
        hoverStateEnabled
      />
      <DemoPanel title={`Son load() çağrısı (${calls}. çağrı, ${LATENCY_MS} ms gecikme)`}>
        <Typography type="body-xs" className="whitespace-pre font-mono">
          {lastLoad ? formatLoadOptions(lastLoad) : '—'}
        </Typography>
      </DemoPanel>
    </Surface>
  )
}
