import { OPERATION_ICONS } from '../constants/operationIcons'
import type { GridColumn } from '../types/GridColumn'
import type { OperationOption } from '../types/OperationOption'
import type { OperationDescriptions } from '../types/options/OperationDescriptions'
import { getOperationText } from './getOperationText'

export function getOperationOptions<TRow>(
  column: GridColumn<TRow>,
  descriptions?: OperationDescriptions,
): OperationOption[] {
  return column.filterOperations.map((id) => ({
    id,
    text: getOperationText(id, descriptions),
    icon: OPERATION_ICONS[id],
  }))
}
