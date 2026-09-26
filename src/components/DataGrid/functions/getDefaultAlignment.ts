import type { DataType } from '../types/DataType'
import type { HorizontalAlignment } from '../types/HorizontalAlignment'

export function getDefaultAlignment(dataType: DataType, hasLookup: boolean): HorizontalAlignment {
  if (hasLookup) return 'left'
  if (dataType === 'number') return 'right'
  if (dataType === 'boolean') return 'center'
  return 'left'
}
