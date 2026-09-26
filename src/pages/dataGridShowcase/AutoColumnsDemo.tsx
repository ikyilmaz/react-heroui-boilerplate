import { DataGrid } from '@/components/DataGrid'
import { GRID_CARD_CLASS_NAMES } from '@/pages/requests/gridCardClassNames'
import { COMPACT_CONTENT } from './compactContent'
import { makeProducts } from './makeProducts'

const CLASS_NAMES = { ...GRID_CARD_CLASS_NAMES, content: COMPACT_CONTENT }
const DATA = makeProducts(15, 21)

/**
 * No `columns`: they are generated from the first row, captions from field names, types (and so
 * alignment, format, filters) inferred from the values. Read-only, with borders.
 */
export function AutoColumnsDemo() {
  return (
    <DataGrid
      aria-label="Ürünler — otomatik kolonlar"
      dataSource={DATA}
      keyExpr="id"
      classNames={CLASS_NAMES}
      filterRow={{ visible: true }}
      searchPanel={{ visible: true }}
      paging={{ pageSize: 5 }}
      pager={{ showInfo: true }}
      showBorders
    />
  )
}
