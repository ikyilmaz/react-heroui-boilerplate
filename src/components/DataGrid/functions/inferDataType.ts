import type { DataType } from '../types/DataType'

/** Guesses a column's type from a value, the way DevExtreme reads the first row. */
export function inferDataType(value: unknown): DataType {
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'
  if (value !== null && typeof value === 'object') return 'object'
  return 'string'
}
