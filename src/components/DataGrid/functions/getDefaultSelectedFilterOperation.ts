import type { DataType } from '../types/DataType'
import type { FilterOperation } from '../types/FilterOperation'

export function getDefaultSelectedFilterOperation(
  dataType: DataType,
  hasLookup: boolean,
): FilterOperation {
  return !hasLookup && (dataType === 'string' || dataType === 'object') ? 'contains' : '='
}
