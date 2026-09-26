import type { RemoteOperations } from '../types/options/RemoteOperations'

/** Remote paging only works on remotely filtered and sorted data, so it implies both. */
export function normalizeRemoteOperations(value: boolean | RemoteOperations | undefined): Required<RemoteOperations> {
  if (typeof value === 'boolean') return { filtering: value, sorting: value, paging: value }
  const paging = !!value?.paging
  return { filtering: paging || !!value?.filtering, sorting: paging || !!value?.sorting, paging }
}
