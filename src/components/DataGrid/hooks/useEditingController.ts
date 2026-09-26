import { useCallback, useRef, useState } from 'react'
import { NEW_ROW_KEY_PREFIX } from '../constants/newRowKeyPrefix'
import { isPromise } from '../data/functions/isPromise'
import { mergeValues } from '../data/functions/mergeValues'
import type { DataChange } from '../data/types/DataChange'
import type { RowKey } from '../data/types/RowKey'
import type { Store } from '../data/types/Store'
import { applyCellChange } from '../functions/applyCellChange'
import { findColumn } from '../functions/findColumn'
import { processChanges } from '../functions/processChanges'
import { resolveCancel } from '../functions/resolveCancel'
import { formatMessage } from '../localization/formatMessage'
import type { DataGridInstance } from '../types/DataGridInstance'
import type { EditingEvents } from '../types/EditingEvents'
import type { EmitOptionChanged } from '../types/EmitOptionChanged'
import type { GridColumn } from '../types/GridColumn'
import type { EditingMode } from '../types/options/EditingMode'
import type { PendingDelete } from '../types/PendingDelete'
import type { RowObject } from '../types/RowObject'
import { useLatestRef } from './useLatestRef'
import { useOptionState } from './useOptionState'

const NO_CHANGES: never[] = []
let newRowSeed = 0

interface UseEditingControllerOptions<TRow extends object> {
  store: Store<TRow>
  mode: EditingMode
  confirmDelete: boolean
  changes: DataChange<TRow>[] | undefined
  editRowKey: RowKey | null | undefined
  editColumnName: string | null | undefined
  columns: GridColumn<TRow>[]
  component: DataGridInstance<TRow>
  events: EditingEvents<TRow>
  getVisibleRows: () => RowObject<TRow>[]
  getSourceItem: (key: RowKey) => TRow | undefined
  rowLabel: (data: TRow, key: RowKey) => string
  announce: (message: string) => void
  emitOptionChanged: EmitOptionChanged
  reportError: (error: Error) => void
  onRowRemovedInternal: (key: RowKey) => void
  refresh: () => Promise<void>
}

/**
 * DevExtreme's editing controller. Edits are pending `changes` (only the modified fields, as
 * `setCellValue` writes them) until `saveEditData` sends them through `onSaving` and the per-row
 * events to the store. `editRowKey` / `editColumnName` say what is open.
 *
 * Everything the methods read lives in refs mirrored from state, so a value flushed from a
 * field right before Enter is seen by the save in the same event.
 */
export function useEditingController<TRow extends object>(options: UseEditingControllerOptions<TRow>) {
  const opts = useLatestRef(options)

  const [changes, setChangesState] = useOptionState<DataChange<TRow>[]>(options.changes, NO_CHANGES)
  const [editRowKey, setEditRowKeyState] = useOptionState<RowKey | null>(options.editRowKey, null)
  const [editColumnName, setEditColumnNameState] = useOptionState<string | null>(
    options.editColumnName,
    null,
  )
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  /**
   * The button that opened the delete confirmation. React Aria returns focus to its own trigger,
   * but ours is an invisible placeholder it cannot focus, so focus fell onto the cell.
   */
  const deleteOpener = useRef<HTMLElement | null>(null)

  /** What the methods read; setters write them before the state renders. */
  const changesRef = useLatestRef(changes)
  const editRef = useLatestRef({ key: editRowKey, column: editColumnName })

  // Focus return: back to the edit (pencil) button after editing
  const returnFocusKey = useRef<RowKey | null>(null)
  const editButtonRefs = useRef(new Map<RowKey, HTMLButtonElement>())
  const restoreFocus = useCallback(() => {
    const key = returnFocusKey.current
    returnFocusKey.current = null
    if (key === null) return
    requestAnimationFrame(() => editButtonRefs.current.get(key)?.focus())
  }, [])

  const setChanges = useCallback(
    (next: DataChange<TRow>[]) => {
      const previous = changesRef.current
      if (next === previous) return
      changesRef.current = next
      setChangesState(next)
      opts.current.emitOptionChanged('editing', 'editing.changes', next, previous)
    },
    [changesRef, opts, setChangesState],
  )

  const setEditing = useCallback(
    (key: RowKey | null, column: string | null) => {
      const previous = editRef.current
      editRef.current = { key, column }
      setEditRowKeyState(key)
      setEditColumnNameState(column)
      const { emitOptionChanged } = opts.current
      if (previous.key !== key) emitOptionChanged('editing', 'editing.editRowKey', key, previous.key)
      if (previous.column !== column)
        emitOptionChanged('editing', 'editing.editColumnName', column, previous.column)
    },
    [editRef, opts, setEditColumnNameState, setEditRowKeyState],
  )

  /** The row's data with its pending change applied. */
  const getRowData = useCallback(
    (key: RowKey): TRow | undefined => {
      const change = changesRef.current.find((c) => c.key === key)
      if (change?.type === 'insert') return change.data as TRow
      const item = opts.current.getSourceItem(key)
      if (!item) return undefined
      return change?.type === 'update' ? mergeValues(item, change.data ?? {}) : item
    },
    [changesRef, opts],
  )

  const writeCellValue = useCallback(
    async (key: RowKey, column: GridColumn<TRow>, value: unknown) => {
      const current = getRowData(key)
      if (current === undefined) return
      const newData: Partial<TRow> = {}
      // Synchronous unless setCellValue is async: Enter's save in the same event must see it
      const pending = column.setCellValue(newData, value, current)
      if (isPromise(pending)) await pending
      setChanges(applyCellChange(changesRef.current, key, newData))
    },
    [changesRef, getRowData, setChanges],
  )

  /**
   * Saves run one after another: in cell mode an editor's commit and Enter's `closeEditCell`
   * both save, and the second must see what the first left, not send the same change twice.
   */
  const saving = useRef<Promise<void>>(Promise.resolve())

  /** Saves the pending changes; `keepEditing` leaves the open row/cell open. */
  const saveNow = useCallback(
    async (keepEditing: boolean) => {
      const list = changesRef.current
      const { component, events, store, getSourceItem, announce, rowLabel, refresh, reportError } =
        opts.current
      if (!list.length) {
        if (!keepEditing && editRef.current.key !== null) {
          setEditing(null, null)
          restoreFocus()
        }
        return
      }
      const e = { component, changes: [...list], cancel: false as boolean | Promise<boolean>, promise: undefined as Promise<void> | undefined }
      events.onSaving?.(e)
      if (e.promise) await e.promise
      if (await resolveCancel(e.cancel)) return

      const labels = e.changes.map((c) => {
        const data = getRowData(c.key)
        return data ? rowLabel(data, c.key) : String(c.key)
      })
      let result
      try {
        result = await processChanges(e.changes, { store, events, component, getSourceItem })
      } catch (error) {
        reportError(error as Error)
        return
      }
      // Changes made while saving (still typing) stay pending
      setChanges([...result.remaining, ...changesRef.current.filter((c) => !list.includes(c))])
      if (!keepEditing && !result.remaining.length) setEditing(null, null)
      events.onSaved?.({ component, changes: result.saved })
      if (result.saved.length === 1 && result.saved[0].type !== 'remove')
        announce(formatMessage('dxDataGrid-statusSaved', labels[e.changes.indexOf(result.saved[0])]))
      if (!keepEditing) restoreFocus()
      await refresh()
    },
    [changesRef, editRef, getRowData, opts, restoreFocus, setChanges, setEditing],
  )

  const save = useCallback(
    (keepEditing: boolean) => {
      const run = saving.current.then(() => saveNow(keepEditing))
      saving.current = run.catch(() => {})
      return run
    },
    [saveNow],
  )

  const saveEditData = useCallback(() => save(false), [save])

  const cancelEditData = useCallback(async () => {
    const list = changesRef.current
    const { component, events, announce } = opts.current
    const e = { component, changes: [...list], cancel: false as boolean | Promise<boolean> }
    events.onEditCanceling?.(e)
    if (await resolveCancel(e.cancel)) return
    setChanges(NO_CHANGES)
    setEditing(null, null)
    events.onEditCanceled?.({ component, changes: list })
    announce(formatMessage('dxDataGrid-statusEditingCanceled'))
    restoreFocus()
  }, [changesRef, opts, restoreFocus, setChanges, setEditing])

  const startEditing = useCallback(
    async (row: RowObject<TRow>, column: GridColumn<TRow> | undefined) => {
      const { component, events, announce, rowLabel } = opts.current
      const e = { component, data: row.data, key: row.key, column, cancel: false as boolean | Promise<boolean> }
      events.onEditingStart?.(e)
      if (await resolveCancel(e.cancel)) return
      returnFocusKey.current = row.key
      setEditing(row.key, column?.name ?? null)
      if (!column) announce(formatMessage('dxDataGrid-statusEditingStarted', rowLabel(row.data, row.key)))
    },
    [opts, setEditing],
  )

  const closeEditCell = useCallback(async () => {
    await save(true)
    setEditing(null, null)
  }, [save, setEditing])

  const editRowImpl = useCallback(
    async (row: RowObject<TRow>) => {
      if (editRef.current.key === row.key) return
      if (editRef.current.key !== null) {
        // Leaving a row saves it (row mode); a canceled save keeps it open
        await save(false)
        if (editRef.current.key !== null) return
      }
      await startEditing(row, undefined)
    },
    [editRef, save, startEditing],
  )

  const editCell = useCallback(
    async (rowIndex: number, id: string) => {
      const { getVisibleRows, columns, mode } = opts.current
      const row = getVisibleRows()[rowIndex]
      const column = findColumn(columns, id)
      if (!row || !column?.allowEditing) return
      if (mode === 'row') return editRowImpl(row)
      const open = editRef.current
      if (open.key === row.key && open.column === column.name) return
      if (open.key !== null) await closeEditCell()
      await startEditing(row, column)
    },
    [closeEditCell, editRef, editRowImpl, opts, startEditing],
  )

  const editRow = useCallback(
    async (rowIndex: number) => {
      const { getVisibleRows, columns, mode } = opts.current
      const row = getVisibleRows()[rowIndex]
      if (!row) return
      if (mode === 'cell') {
        const first = columns.find((c) => !c.type && c.allowEditing && c.visible)
        if (first) await editCell(rowIndex, first.name)
        return
      }
      await editRowImpl(row)
    },
    [editCell, editRowImpl, opts],
  )

  const addRow = useCallback(async () => {
    const { mode, component, events, store, columns, announce } = opts.current
    if (mode === 'row' && editRef.current.key !== null) {
      await save(false)
      if (editRef.current.key !== null) return
    }
    const e = { component, data: {} as Partial<TRow>, promise: undefined as Promise<void> | undefined }
    events.onInitNewRow?.(e)
    if (e.promise) await e.promise
    const realKey = store.keyOf(e.data as TRow)
    const key = realKey === undefined || realKey === null || realKey === '' ? `${NEW_ROW_KEY_PREFIX}${++newRowSeed}` : realKey
    setChanges([...changesRef.current, { type: 'insert', key, data: e.data }])
    const first = columns.find((c) => !c.type && c.allowEditing && c.visible)
    setEditing(key, mode === 'cell' ? (first?.name ?? null) : null)
    announce(formatMessage('dxDataGrid-statusRowAdded'))
  }, [changesRef, editRef, opts, save, setChanges, setEditing])

  const removeRow = useCallback(
    async (key: RowKey) => {
      const { component, events, store, getSourceItem, announce, rowLabel, reportError, refresh, onRowRemovedInternal } =
        opts.current
      const change: DataChange<TRow> = { type: 'remove', key }
      const e = { component, changes: [change], cancel: false as boolean | Promise<boolean>, promise: undefined as Promise<void> | undefined }
      events.onSaving?.(e)
      if (e.promise) await e.promise
      if (await resolveCancel(e.cancel)) return
      const data = getSourceItem(key)
      const label = data ? rowLabel(data, key) : String(key)
      try {
        const result = await processChanges(e.changes, { store, events, component, getSourceItem })
        if (!result.saved.length) return
        setChanges(changesRef.current.filter((c) => c.key !== key))
        if (editRef.current.key === key) setEditing(null, null)
        onRowRemovedInternal(key)
        events.onSaved?.({ component, changes: result.saved })
        announce(formatMessage('dxDataGrid-statusRemoved', label))
        await refresh()
      } catch (error) {
        reportError(error as Error)
      }
    },
    [changesRef, editRef, opts, setChanges, setEditing],
  )

  const deleteRow = useCallback(
    async (rowIndex: number) => {
      const { getVisibleRows, confirmDelete, rowLabel } = opts.current
      const row = getVisibleRows()[rowIndex]
      if (!row) return
      if (row.isNewRow) {
        setChanges(changesRef.current.filter((c) => c.key !== row.key))
        if (editRef.current.key === row.key) setEditing(null, null)
        return
      }
      if (confirmDelete) {
        deleteOpener.current = document.activeElement as HTMLElement | null
        setPendingDelete({ key: row.key, rowLabel: rowLabel(row.data, row.key) })
        return
      }
      await removeRow(row.key)
    },
    [changesRef, editRef, opts, removeRow, setChanges, setEditing],
  )

  const confirmPendingDelete = useCallback(async () => {
    const pending = pendingDelete
    // The row goes away and its button with it; no focus to return
    deleteOpener.current = null
    setPendingDelete(null)
    if (pending) await removeRow(pending.key)
  }, [pendingDelete, removeRow])

  const cancelPendingDelete = useCallback(() => {
    setPendingDelete(null)
    const el = deleteOpener.current
    deleteOpener.current = null
    // Closing may take focus back; hand it over a frame later
    if (el?.isConnected) requestAnimationFrame(() => el.focus())
  }, [])

  /**
   * An editor committed a value. In `cell` mode, or in a row that is not in edit mode (an editor
   * shown through `showEditorAlways`), it is saved right away; in an edited row it waits.
   */
  const commitCellValue = useCallback(
    async (key: RowKey, columnName: string, value: unknown) => {
      const column = opts.current.columns.find((c) => c.name === columnName)
      if (!column) return
      await writeCellValue(key, column, value)
      const isNew = changesRef.current.some((c) => c.key === key && c.type === 'insert')
      if (opts.current.mode === 'cell' ? !isNew || editRef.current.key !== key : editRef.current.key !== key)
        await save(true)
    },
    [changesRef, editRef, opts, save, writeCellValue],
  )

  const cellValue = useCallback(
    (rowIndex: number, id: string, ...value: [unknown?]) => {
      const { getVisibleRows, columns } = opts.current
      const row = getVisibleRows()[rowIndex]
      const column = findColumn(columns, id)
      if (!row || !column) return undefined
      if (!value.length) return column.calculateCellValue(row.data)
      void writeCellValue(row.key, column, value[0])
      return undefined
    },
    [opts, writeCellValue],
  )

  /** Edit buttons register here so focus can return to them after editing. */
  const registerEditButton = useCallback((key: RowKey, el: HTMLButtonElement | null) => {
    if (el) editButtonRefs.current.set(key, el)
    else editButtonRefs.current.delete(key)
  }, [])

  const hasEditData = useCallback(() => changesRef.current.length > 0, [changesRef])

  return {
    changes,
    editRowKey,
    editColumnName,
    pendingDelete,
    registerEditButton,
    addRow,
    editRow,
    editCell,
    closeEditCell,
    saveEditData,
    cancelEditData,
    deleteRow,
    confirmPendingDelete,
    cancelPendingDelete,
    commitCellValue,
    cellValue,
    hasEditData,
  }
}
