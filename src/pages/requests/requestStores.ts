import { ArrayStore } from '@/components/DataGrid'
import { makeRequests } from './makeRequests'
import type { Request } from './Request'

/**
 * Module level, so edits survive switching tabs (panels unmount when hidden). Each demo has its
 * own store, so they do not change each other's records.
 */
export const ROW_EDITING_REQUESTS = new ArrayStore<Request>({ key: 'id', data: makeRequests(64) })
export const CELL_EDITING_REQUESTS = new ArrayStore<Request>({ key: 'id', data: makeRequests(24) })
