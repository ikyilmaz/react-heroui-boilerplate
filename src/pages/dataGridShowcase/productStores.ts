import { ArrayStore } from '@/components/DataGrid'
import { makeProducts } from './makeProducts'
import type { Product } from './Product'

/** Module level, so edits survive switching tabs. */
export const SORTING_PRODUCTS = new ArrayStore<Product>({ key: 'id', data: makeProducts(40) })
export const EVENT_PRODUCTS = new ArrayStore<Product>({ key: 'id', data: makeProducts(12, 11) })
/** The "server" of the remote demo. */
export const SERVER_PRODUCTS = makeProducts(500, 3)
