import type { DataType } from '../types/DataType'
import type { FilterOperation } from '../types/FilterOperation'

export function getDefaultFilterOperations(dataType: DataType, hasLookup: boolean): FilterOperation[] {
  if (hasLookup) return ['=', '<>']
  switch (dataType) {
    case 'number':
    case 'date':
    case 'datetime':
      return ['=', '<>', '<', '>', '<=', '>=', 'between']
    case 'boolean':
      return ['=']
    default:
      return ['contains', 'notcontains', 'startswith', 'endswith', '=', '<>']
  }
}
