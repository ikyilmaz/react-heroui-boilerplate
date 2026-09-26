import { DataGrid } from '@/components/DataGrid'
import { GRID_CARD_CLASS_NAMES } from '@/pages/requests/gridCardClassNames'
import { COMPACT_CONTENT } from './compactContent'
import { PRODUCT_COLUMNS } from './productColumns'
import type { Product } from './Product'
import { SORTING_PRODUCTS } from './productStores'

const CLASS_NAMES = { ...GRID_CARD_CLASS_NAMES, content: COMPACT_CONTENT }

/**
 * Multiple sorting (Shift+click adds a column, Ctrl/⌘+click removes it), a filter row applied
 * with the toolbar button, alternating rows and single selection.
 */
export function SortingFilteringDemo() {
  return (
    <DataGrid<Product>
      aria-label="Ürünler — sıralama ve filtre"
      dataSource={SORTING_PRODUCTS}
      columns={PRODUCT_COLUMNS}
      classNames={CLASS_NAMES}
      sorting={{ mode: 'multiple', showSortIndexes: true }}
      filterRow={{ visible: true, applyFilter: 'onClick' }}
      searchPanel={{ visible: true }}
      toolbar={{ items: [{ name: 'searchPanel', location: 'before' }, 'applyFilterButton'] }}
      selection={{ mode: 'single' }}
      paging={{ pageSize: 8 }}
      pager={{ showInfo: true, showNavigationButtons: true }}
      hoverStateEnabled
      rowAlternationEnabled
      showRowLines
      showColumnLines={false}
    />
  )
}
