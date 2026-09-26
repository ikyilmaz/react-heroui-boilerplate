import { useMemo } from 'react'
import { queryByOptions } from '../data/functions/queryByOptions'
import type { FilterExpression } from '../data/types/FilterExpression'
import type { SortDescriptor } from '../data/types/SortDescriptor'
import type { Store } from '../data/types/Store'
import type { RemoteOperations } from '../types/options/RemoteOperations'
import { useRemoteLoad } from './useRemoteLoad'

interface UseDataControllerOptions<TRow> {
  store: Store<TRow>
  remoteOperations: Required<RemoteOperations>
  filter: FilterExpression | undefined
  sort: SortDescriptor<TRow>[]
  pagingEnabled: boolean
  pageIndex: number
  pageSize: number
  locale: string
  /** All items when operations are local (`useStoreItems`). */
  local: { items: readonly TRow[]; loading: boolean; reload: () => Promise<void> }
  onError: (error: Error) => void
  /** Remote loads report their items (the first one types the columns). */
  onRemoteLoaded: (data: TRow[]) => void
}

/**
 * DevExtreme's data controller: what can be done by the store is sent in the load options, the
 * rest runs locally (filter → sort → page) on what came back.
 */
export function useDataController<TRow extends object>({
  store,
  remoteOperations,
  filter,
  sort,
  pagingEnabled,
  pageIndex,
  pageSize,
  locale,
  local,
  onError,
  onRemoteLoaded,
}: UseDataControllerOptions<TRow>) {
  const { filtering, sorting, paging } = remoteOperations
  const remote = filtering || sorting || paging
  const langParams = useMemo(() => ({ locale }), [locale])

  const loadOptions = useMemo(
    () => ({
      filter: filtering ? filter : undefined,
      sort: sorting && sort.length ? sort : undefined,
      ...(paging && pagingEnabled ? { skip: pageIndex * pageSize, take: pageSize } : {}),
      requireTotalCount: paging,
    }),
    [filter, filtering, pageIndex, pageSize, paging, pagingEnabled, sort, sorting],
  )
  const loaded = useRemoteLoad(store, loadOptions, remote, onError, onRemoteLoaded)

  const sourceItems = remote ? loaded.data : local.items

  /** Filtered and sorted; the whole list locally, the loaded page with remote paging. */
  const processedItems = useMemo(
    () =>
      queryByOptions(
        sourceItems,
        { filter: filtering ? undefined : filter, sort: sorting ? undefined : sort },
        langParams,
      ).data,
    [filter, filtering, langParams, sort, sorting, sourceItems],
  )

  const totalCount = paging ? (loaded.totalCount ?? loaded.data.length) : processedItems.length
  const pageCount = pagingEnabled ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1
  // Past the end after rows went away: the last page, as DevExtreme does
  const effectivePageIndex = Math.min(pageIndex, pageCount - 1)

  const pageItems = useMemo(
    () =>
      paging || !pagingEnabled
        ? processedItems
        : processedItems.slice(effectivePageIndex * pageSize, (effectivePageIndex + 1) * pageSize),
    [effectivePageIndex, pageSize, paging, pagingEnabled, processedItems],
  )

  return {
    sourceItems,
    processedItems,
    pageItems,
    totalCount,
    pageCount,
    pageIndex: effectivePageIndex,
    loading: remote ? loaded.loading : local.loading,
    remote,
    reload: remote ? loaded.reload : local.reload,
  }
}
