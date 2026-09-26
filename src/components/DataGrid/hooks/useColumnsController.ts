import { useCallback, useMemo, useState } from 'react'
import { COLUMN_STATE_OPTIONS } from '../constants/columnStateOptions'
import { applySortClick } from '../functions/applySortClick'
import { findColumn } from '../functions/findColumn'
import { getColumnInferenceKey } from '../functions/getColumnInferenceKey'
import { getFilterRowExpression } from '../functions/getFilterRowExpression'
import { getInitialColumnState } from '../functions/getInitialColumnState'
import { getSortDescriptors } from '../functions/getSortDescriptors'
import { getVisibleColumns } from '../functions/getVisibleColumns'
import { normalizeColumns } from '../functions/normalizeColumns'
import { syncColumnStates } from '../functions/syncColumnStates'
import type { Column } from '../types/Column'
import type { ColumnState } from '../types/ColumnState'
import type { EmitOptionChanged } from '../types/EmitOptionChanged'
import type { FilterOperation } from '../types/FilterOperation'
import type { GridColumn } from '../types/GridColumn'
import type { SortingMode } from '../types/options/SortingMode'
import { useLatestRef } from './useLatestRef'
import { useMemoByKey } from './useMemoByKey'

interface UseColumnsControllerOptions<TRow> {
  columns: (Column<TRow> | string)[] | undefined
  sampleItem: TRow | undefined
  selectionColumn: boolean
  commandColumn: boolean
  sortingMode: SortingMode
  applyFilterOnClick: boolean
  remoteSorting: boolean
  emitOptionChanged: EmitOptionChanged
}

/**
 * DevExtreme's columns controller: normalized column definitions plus their runtime options
 * (sorting, filtering, visibility), changed through `columnOption`.
 *
 * Definitions and runtime state are kept apart on purpose: typing into one filter changes one
 * state entry, while the definitions — and every memoized row and filter cell depending on
 * them — stay the same objects.
 */
export function useColumnsController<TRow>({
  columns: columnsProp,
  sampleItem,
  selectionColumn,
  commandColumn,
  sortingMode,
  applyFilterOnClick,
  remoteSorting,
  emitOptionChanged,
}: UseColumnsControllerOptions<TRow>) {
  // Only what type inference reads from the sample matters; a new sample object with the same
  // types must not re-normalize the columns (and re-render every row)
  const inferenceKey = getColumnInferenceKey(columnsProp, sampleItem)
  const sample = useMemoByKey(() => sampleItem, [inferenceKey])
  const columns = useMemo(
    () => normalizeColumns(columnsProp, { sampleItem: sample, selectionColumn, commandColumn }),
    [columnsProp, sample, selectionColumn, commandColumn],
  )

  const [store, setStore] = useState(() => ({
    columns,
    states: Object.fromEntries(columns.map((c) => [c.name, getInitialColumnState(c)])) as Record<
      string,
      ColumnState
    >,
  }))
  let { states } = store
  if (store.columns !== columns) {
    states = syncColumnStates(store.states, store.columns, columns)
    setStore({ columns, states })
  }
  /** Source of truth for event handlers; `commit` writes it before the state renders. */
  const statesRef = useLatestRef(states)
  const emitRef = useLatestRef(emitOptionChanged)
  const columnsRef = useLatestRef(columns)

  const commit = useCallback((next: Record<string, ColumnState>) => {
    const previous = statesRef.current
    if (next === previous) return
    statesRef.current = next
    setStore((s) => ({ ...s, states: next }))
    for (const column of columnsRef.current)
      for (const option of Object.keys(next[column.name] ?? {}) as (keyof ColumnState)[]) {
        const before = previous[column.name]?.[option]
        const after = next[column.name]?.[option]
        if (before !== after) emitRef.current('columns', `columns[${column.index}].${option}`, after, before)
      }
  }, [columnsRef, emitRef, statesRef])

  const patchColumn = useCallback(
    (name: string, patch: Partial<ColumnState>) => {
      const current = statesRef.current
      commit({ ...current, [name]: { ...current[name], ...patch } })
    },
    [commit, statesRef],
  )

  const columnOption = useCallback(
    (...args: [id: number | string, optionOrOptions?: string | Partial<ColumnState>, value?: unknown]) => {
      const [id, optionOrOptions, value] = args
      const column = findColumn(columnsRef.current, id)
      if (!column) return undefined
      const state = statesRef.current[column.name]
      if (optionOrOptions === undefined) return { ...column, ...state }
      if (typeof optionOrOptions === 'object') return patchColumn(column.name, optionOrOptions)
      const isState = (COLUMN_STATE_OPTIONS as string[]).includes(optionOrOptions)
      if (args.length < 3)
        return isState
          ? state?.[optionOrOptions as keyof ColumnState]
          : (column as unknown as Record<string, unknown>)[optionOrOptions]
      if (!isState) {
        console.warn(`DataGrid: columnOption("${optionOrOptions}") cannot be changed at runtime`)
        return undefined
      }
      patchColumn(column.name, { [optionOrOptions]: value })
    },
    [columnsRef, patchColumn, statesRef],
  )

  const sortByColumn = useCallback(
    (name: string, modifiers: { shiftKey: boolean; ctrlKey: boolean }) => {
      if (sortingMode === 'none') return
      const column = columnsRef.current.find((c) => c.name === name)
      if (!column?.allowSorting) return
      commit(applySortClick(columnsRef.current, statesRef.current, name, sortingMode, modifiers))
    },
    [columnsRef, commit, sortingMode, statesRef],
  )

  const clearSorting = useCallback(() => {
    const next = { ...statesRef.current }
    for (const name of Object.keys(next))
      if (next[name].sortOrder) next[name] = { ...next[name], sortOrder: undefined, sortIndex: undefined }
    commit(next)
  }, [commit, statesRef])

  /** Filter row input: applied at once, or buffered until `applyFilter()` in `onClick` mode. */
  const setFilterValue = useCallback(
    (name: string, value: unknown) =>
      patchColumn(name, applyFilterOnClick ? { bufferedFilterValue: value } : { filterValue: value }),
    [applyFilterOnClick, patchColumn],
  )

  const setFilterOperation = useCallback(
    (name: string, operation: FilterOperation | undefined) =>
      patchColumn(
        name,
        applyFilterOnClick
          ? { bufferedSelectedFilterOperation: operation }
          : { selectedFilterOperation: operation },
      ),
    [applyFilterOnClick, patchColumn],
  )

  /** The operation chooser's "reset": no value, default operation. */
  const resetFilter = useCallback(
    (name: string) => {
      const column = columnsRef.current.find((c) => c.name === name)
      patchColumn(name, {
        filterValue: undefined,
        selectedFilterOperation: column?.defaultSelectedFilterOperation,
        bufferedFilterValue: undefined,
        bufferedSelectedFilterOperation: undefined,
      })
    },
    [columnsRef, patchColumn],
  )

  const applyFilter = useCallback(() => {
    const next = { ...statesRef.current }
    for (const [name, state] of Object.entries(next)) {
      if (!('bufferedFilterValue' in state) && !('bufferedSelectedFilterOperation' in state)) continue
      const { bufferedFilterValue, bufferedSelectedFilterOperation, ...rest } = state
      next[name] = {
        ...rest,
        filterValue: 'bufferedFilterValue' in state ? bufferedFilterValue : rest.filterValue,
        selectedFilterOperation: bufferedSelectedFilterOperation ?? rest.selectedFilterOperation,
      }
    }
    commit(next)
  }, [commit, statesRef])

  const clearFilterRow = useCallback(() => {
    const next = { ...statesRef.current }
    for (const column of columnsRef.current) {
      if (column.type) continue
      const { bufferedFilterValue: _v, bufferedSelectedFilterOperation: _o, ...rest } = next[column.name] ?? {}
      next[column.name] = {
        ...rest,
        filterValue: undefined,
        selectedFilterOperation: column.defaultSelectedFilterOperation,
      }
    }
    commit(next)
  }, [columnsRef, commit, statesRef])

  const filterRowExpression = useMemo(() => getFilterRowExpression(columns, states), [columns, states])
  const sortDescriptors = useMemo(
    () => getSortDescriptors(columns, states, remoteSorting),
    [columns, remoteSorting, states],
  )

  // Only visibility changes may rebuild the visible column list
  const visibilityKey = columns
    .map((c) => `${states[c.name]?.visible ?? c.visible}:${states[c.name]?.visibleIndex ?? ''}`)
    .join(',')
  const visibleColumns = useMemoByKey(() => getVisibleColumns(columns, states), [columns, visibilityKey])

  const hasFilter = columns.some((c) => {
    const s = states[c.name]
    return !c.type && ((s?.filterValue ?? '') !== '' || s?.bufferedFilterValue !== undefined)
  })

  return {
    columns,
    visibleColumns,
    states,
    columnOption: columnOption as (
      id: number | string,
      optionOrOptions?: string | Partial<ColumnState>,
      value?: unknown,
    ) => unknown,
    sortByColumn,
    clearSorting,
    setFilterValue,
    setFilterOperation,
    resetFilter,
    applyFilter,
    clearFilterRow,
    filterRowExpression,
    sortDescriptors,
    hasFilter,
  } satisfies Record<string, unknown> & { columns: GridColumn<TRow>[] }
}
