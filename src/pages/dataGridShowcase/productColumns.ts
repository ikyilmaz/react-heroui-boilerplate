import type { Column } from '@/components/DataGrid'
import { PRODUCT_CATEGORIES } from './productCategories'
import type { Product } from './Product'

/** Product columns shared by the demos; DevExtreme defaults apply (numbers right-aligned). */
export const PRODUCT_COLUMNS: Column<Product>[] = [
  { dataField: 'name', caption: 'Ürün' },
  {
    dataField: 'category',
    caption: 'Kategori',
    lookup: { dataSource: PRODUCT_CATEGORIES, valueExpr: 'id', displayExpr: 'name' },
  },
  { dataField: 'price', caption: 'Fiyat', dataType: 'number', format: { type: 'currency', precision: 0 } },
  { dataField: 'stock', caption: 'Stok', dataType: 'number', format: '#,##0' },
  { dataField: 'active', caption: 'Satışta', dataType: 'boolean' },
  { dataField: 'created', caption: 'Eklenme', dataType: 'date' },
]
