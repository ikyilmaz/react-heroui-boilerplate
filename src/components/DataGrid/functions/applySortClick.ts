import type { ColumnState } from '../types/ColumnState'
import type { GridColumn } from '../types/GridColumn'
import type { SortingMode } from '../types/options/SortingMode'

/**
 * A header click, as DevExtreme handles it: toggles asc/desc; in `multiple` mode Shift+click adds
 * the column to the sort; Ctrl/⌘+click removes it. Returns the patched states.
 */
export function applySortClick<TRow>(
  columns: GridColumn<TRow>[],
  states: Record<string, ColumnState>,
  name: string,
  mode: SortingMode,
  { shiftKey, ctrlKey }: { shiftKey: boolean; ctrlKey: boolean },
): Record<string, ColumnState> {
  const next = { ...states }
  const current = states[name]?.sortOrder
  const clear = (key: string) => (next[key] = { ...next[key], sortOrder: undefined, sortIndex: undefined })

  if (ctrlKey) {
    clear(name)
  } else {
    const keepOthers = mode === 'multiple' && shiftKey
    if (!keepOthers) for (const c of columns) if (c.name !== name && states[c.name]?.sortOrder) clear(c.name)
    const sortedCount = columns.filter((c) => c.name !== name && next[c.name]?.sortOrder).length
    next[name] = {
      ...next[name],
      sortOrder: current === 'asc' ? 'desc' : 'asc',
      sortIndex: current ? states[name].sortIndex : sortedCount,
    }
  }

  // Renumber so indexes stay 0..n-1
  columns
    .filter((c) => next[c.name]?.sortOrder)
    .sort((a, b) => (next[a.name].sortIndex ?? 0) - (next[b.name].sortIndex ?? 0))
    .forEach((c, i) => {
      if (next[c.name].sortIndex !== i) next[c.name] = { ...next[c.name], sortIndex: i }
    })
  return next
}
