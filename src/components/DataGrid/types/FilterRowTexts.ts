import type { OperationDescriptions } from './options/OperationDescriptions'

/** The filter row's texts, resolved from `filterRow` options and messages. */
export interface FilterRowTexts {
  showAllText: string
  resetOperationText: string
  betweenStartText: string
  betweenEndText: string
  operationDescriptions?: OperationDescriptions
}
