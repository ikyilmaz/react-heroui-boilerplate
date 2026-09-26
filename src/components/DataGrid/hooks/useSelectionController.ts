import { useCallback, useMemo } from 'react'
import type { Selection } from '@heroui/react'
import { NON_RECORD_ROW_KEYS } from '../constants/rowIds'
import type { RowKey } from '../data/types/RowKey'
import type { DataGridInstance } from '../types/DataGridInstance'
import type { EmitOptionChanged } from '../types/EmitOptionChanged'
import type { SelectionChangedEvent } from '../types/events/SelectionChangedEvent'
import type { SelectAllMode } from '../types/options/SelectAllMode'
import type { SelectionMode } from '../types/options/SelectionMode'
import { unionKeys } from '../functions/unionKeys'
import { useLatestRef } from './useLatestRef'
import { useOptionState } from './useOptionState'

const NO_KEYS: RowKey[] = []

interface UseSelectionControllerOptions<TRow> {
  mode: SelectionMode
  selectAllMode: SelectAllMode
  selectedRowKeys: RowKey[] | undefined
  defaultSelectedRowKeys: RowKey[] | undefined
  /** Keys of every row passing the filters (all pages). */
  getAllKeys: () => RowKey[]
  /** Keys of the current page's rows. */
  getPageKeys: () => RowKey[]
  getRowsData: (keys: RowKey[]) => TRow[]
  component: DataGridInstance<TRow>
  onSelectionChanged?: (e: SelectionChangedEvent<TRow>) => void
  onSelectedRowKeysChange?: (keys: RowKey[]) => void
  emitOptionChanged: EmitOptionChanged
}

/** DevExtreme's selection controller: an ordered key list, fed by React Aria's selection. */
export function useSelectionController<TRow>(options: UseSelectionControllerOptions<TRow>) {
  const opts = useLatestRef(options)
  const [selectedRowKeys, setKeys] = useOptionState(
    options.selectedRowKeys,
    options.defaultSelectedRowKeys ?? NO_KEYS,
  )
  const keysRef = useLatestRef(selectedRowKeys)

  const commit = useCallback(
    (next: RowKey[]) => {
      const previous = keysRef.current
      if (next.length === previous.length && next.every((k, i) => k === previous[i])) return
      keysRef.current = next
      setKeys(next)
      const { component, onSelectionChanged, onSelectedRowKeysChange, emitOptionChanged, getRowsData } =
        opts.current
      emitOptionChanged('selectedRowKeys', 'selectedRowKeys', next, previous)
      onSelectedRowKeysChange?.(next)
      onSelectionChanged?.({
        component,
        selectedRowKeys: next,
        selectedRowsData: getRowsData(next),
        currentSelectedRowKeys: next.filter((k) => !previous.includes(k)),
        currentDeselectedRowKeys: previous.filter((k) => !next.includes(k)),
      })
    },
    [keysRef, opts, setKeys],
  )

  const onRacSelectionChange = useCallback(
    (keys: Selection) => {
      const { mode, selectAllMode, getAllKeys, getPageKeys } = opts.current
      if (mode === 'none') return
      const current = keysRef.current
      if (keys === 'all') {
        commit(unionKeys(current, selectAllMode === 'allPages' ? getAllKeys() : getPageKeys()))
        return
      }
      const picked = [...keys].filter((k) => !NON_RECORD_ROW_KEYS.includes(String(k))) as RowKey[]
      // "Deselect all" of `page` mode leaves the other pages' selection alone
      if (mode === 'multiple' && selectAllMode === 'page' && picked.length === 0) {
        const page = getPageKeys()
        commit(current.filter((k) => !page.includes(k)))
        return
      }
      commit(unionKeys(current.filter((k) => picked.includes(k)), picked))
    },
    [commit, keysRef, opts],
  )

  const racSelectedKeys = useMemo(() => new Set<RowKey>(selectedRowKeys), [selectedRowKeys])

  const selectRows = useCallback(
    (keys: RowKey[], preserve: boolean) => commit(preserve ? unionKeys(keysRef.current, keys) : [...keys]),
    [commit, keysRef],
  )
  const deselectRows = useCallback(
    (keys: RowKey[]) => commit(keysRef.current.filter((k) => !keys.includes(k))),
    [commit, keysRef],
  )
  const selectAll = useCallback(() => {
    const { selectAllMode, getAllKeys, getPageKeys } = opts.current
    commit(unionKeys(keysRef.current, selectAllMode === 'allPages' ? getAllKeys() : getPageKeys()))
  }, [commit, keysRef, opts])
  const deselectAll = useCallback(() => {
    const { selectAllMode, getPageKeys } = opts.current
    if (selectAllMode === 'page') {
      const page = getPageKeys()
      commit(keysRef.current.filter((k) => !page.includes(k)))
    } else commit([])
  }, [commit, keysRef, opts])
  const clearSelection = useCallback(() => commit([]), [commit])
  const isRowSelected = useCallback((key: RowKey) => keysRef.current.includes(key), [keysRef])
  const getSelectedRowKeys = useCallback(() => keysRef.current, [keysRef])
  const getSelectedRowsData = useCallback(() => opts.current.getRowsData(keysRef.current), [keysRef, opts])

  return {
    selectedRowKeys,
    racSelectedKeys,
    onRacSelectionChange,
    selectRows,
    deselectRows,
    selectAll,
    deselectAll,
    clearSelection,
    isRowSelected,
    getSelectedRowKeys,
    getSelectedRowsData,
  }
}
