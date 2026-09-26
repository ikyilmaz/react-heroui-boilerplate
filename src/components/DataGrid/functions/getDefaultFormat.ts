import type { DataType } from '../types/DataType'
import type { Format } from '../types/Format'

export function getDefaultFormat(dataType: DataType): Format | undefined {
  if (dataType === 'date') return 'shortDate'
  if (dataType === 'datetime') return 'shortDateShortTime'
  return undefined
}
