import { OPERATION_TEXT_KEYS } from '../constants/operationTextKeys'
import { formatMessage } from '../localization/formatMessage'
import type { FilterOperation } from '../types/FilterOperation'
import type { OperationDescriptions } from '../types/options/OperationDescriptions'

export function getOperationText(operation: FilterOperation, descriptions?: OperationDescriptions): string {
  const keys = OPERATION_TEXT_KEYS[operation]
  return descriptions?.[keys.description] ?? formatMessage(keys.message)
}
