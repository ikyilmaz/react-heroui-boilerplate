import { formatMessage } from '../localization/formatMessage'
import type { FilterRowOptions } from '../types/options/FilterRowOptions'
import type { FilterRowTexts } from '../types/FilterRowTexts'

export function getFilterRowTexts(filterRow: FilterRowOptions): FilterRowTexts {
  return {
    showAllText: filterRow.showAllText ?? formatMessage('dxDataGrid-filterRowShowAllText'),
    resetOperationText: filterRow.resetOperationText ?? formatMessage('dxDataGrid-filterRowResetOperationText'),
    betweenStartText: filterRow.betweenStartText ?? formatMessage('dxDataGrid-filterRowOperationBetweenStartText'),
    betweenEndText: filterRow.betweenEndText ?? formatMessage('dxDataGrid-filterRowOperationBetweenEndText'),
    operationDescriptions: filterRow.operationDescriptions,
  }
}
