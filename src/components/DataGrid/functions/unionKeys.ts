import type { RowKey } from '../data/types/RowKey'

/** Keeps the existing order: current keys first, then the new ones. */
export function unionKeys(current: RowKey[], add: RowKey[]): RowKey[] {
  return [...current, ...add.filter((k) => !current.includes(k))]
}
