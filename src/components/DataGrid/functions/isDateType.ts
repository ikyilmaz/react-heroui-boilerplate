import type { DataType } from '../types/DataType'

export function isDateType(dataType: DataType): boolean {
  return dataType === 'date' || dataType === 'datetime'
}
