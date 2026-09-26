import type { DataChange } from '../data/types/DataChange'
import type { RowKey } from '../data/types/RowKey'
import type { Store } from '../data/types/Store'
import type { DataGridInstance } from '../types/DataGridInstance'
import type { EditingEvents } from '../types/EditingEvents'
import { resolveCancel } from './resolveCancel'

/**
 * Sends changes to the store one by one, with the per-row events around each
 * (`onRowInserting` → insert → `onRowInserted`, …). A canceled change stays pending.
 */
export async function processChanges<TRow extends object>(
  changes: DataChange<TRow>[],
  {
    store,
    events,
    component,
    getSourceItem,
  }: {
    store: Store<TRow>
    events: EditingEvents<TRow>
    component: DataGridInstance<TRow>
    getSourceItem: (key: RowKey) => TRow | undefined
  },
): Promise<{ saved: DataChange<TRow>[]; remaining: DataChange<TRow>[] }> {
  const saved: DataChange<TRow>[] = []
  const remaining: DataChange<TRow>[] = []
  for (const change of changes) {
    if (change.type === 'insert') {
      const e = { component, data: change.data ?? {}, cancel: false as boolean | Promise<boolean> }
      events.onRowInserting?.(e)
      if (await resolveCancel(e.cancel)) {
        remaining.push(change)
        continue
      }
      const data = await store.insert(e.data)
      events.onRowInserted?.({ component, data, key: store.keyOf(data) })
    } else if (change.type === 'update') {
      const oldData = getSourceItem(change.key) as TRow
      const e = {
        component,
        oldData,
        newData: change.data ?? {},
        key: change.key,
        cancel: false as boolean | Promise<boolean>,
      }
      events.onRowUpdating?.(e)
      if (await resolveCancel(e.cancel)) {
        remaining.push(change)
        continue
      }
      await store.update(change.key, e.newData)
      events.onRowUpdated?.({ component, data: e.newData, key: change.key })
    } else {
      const data = getSourceItem(change.key) as TRow
      const e = { component, data, key: change.key, cancel: false as boolean | Promise<boolean> }
      events.onRowRemoving?.(e)
      if (await resolveCancel(e.cancel)) {
        remaining.push(change)
        continue
      }
      await store.remove(change.key)
      events.onRowRemoved?.({ component, data, key: change.key })
    }
    saved.push(change)
  }
  return { saved, remaining }
}
