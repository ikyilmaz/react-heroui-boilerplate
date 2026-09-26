import type { FilterOperation } from '../types/FilterOperation'
import type { OperationDescriptions } from '../types/options/OperationDescriptions'

/** Operation → `filterRow.operationDescriptions` field and default message. */
export const OPERATION_TEXT_KEYS: Record<
  FilterOperation,
  { description: keyof OperationDescriptions; message: string }
> = {
  '=': { description: 'equal', message: 'dxDataGrid-filterRowOperationEquals' },
  '<>': { description: 'notEqual', message: 'dxDataGrid-filterRowOperationNotEquals' },
  '<': { description: 'lessThan', message: 'dxDataGrid-filterRowOperationLess' },
  '<=': { description: 'lessThanOrEqual', message: 'dxDataGrid-filterRowOperationLessOrEquals' },
  '>': { description: 'greaterThan', message: 'dxDataGrid-filterRowOperationGreater' },
  '>=': {
    description: 'greaterThanOrEqual',
    message: 'dxDataGrid-filterRowOperationGreaterOrEquals',
  },
  contains: { description: 'contains', message: 'dxDataGrid-filterRowOperationContains' },
  notcontains: { description: 'notContains', message: 'dxDataGrid-filterRowOperationNotContains' },
  startswith: { description: 'startsWith', message: 'dxDataGrid-filterRowOperationStartsWith' },
  endswith: { description: 'endsWith', message: 'dxDataGrid-filterRowOperationEndsWith' },
  between: { description: 'between', message: 'dxDataGrid-filterRowOperationBetween' },
}
