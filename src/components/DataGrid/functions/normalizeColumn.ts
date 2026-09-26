import { compileGetter } from '../data/functions/compileGetter'
import { compileSetter } from '../data/functions/compileSetter'
import { formatMessage } from '../localization/formatMessage'
import type { Column } from '../types/Column'
import type { GridColumn } from '../types/GridColumn'
import { captionize } from './captionize'
import { createLookup } from './createLookup'
import { defaultCalculateFilterExpression } from './defaultCalculateFilterExpression'
import { getDefaultAlignment } from './getDefaultAlignment'
import { getDefaultFilterOperations } from './getDefaultFilterOperations'
import { getDefaultSelectedFilterOperation } from './getDefaultSelectedFilterOperation'
import { inferDataType } from './inferDataType'

/** Fills in a column's defaults and compiles its getters, as DevExtreme's columns controller does. */
export function normalizeColumn<TRow>(
  input: Column<TRow> | string,
  index: number,
  sampleItem: TRow | undefined,
): GridColumn<TRow> {
  const column: Column<TRow> = typeof input === 'string' ? { dataField: input } : input
  const { dataField, type } = column
  const getter = dataField ? compileGetter<TRow>(dataField) : undefined
  const setter = dataField ? compileSetter(dataField) : undefined
  const custom = column.calculateCellValue?.bind(column)
  const calculateCellValue = custom ?? ((rowData: TRow) => getter?.(rowData))
  const lookup = column.lookup ? createLookup(column.lookup) : undefined
  const dataType =
    column.dataType ?? inferDataType(sampleItem === undefined ? undefined : calculateCellValue(sampleItem))
  const isData = !type
  const allowFiltering = column.allowFiltering ?? isData
  const userFilter = column.calculateFilterExpression
  const userSetter = column.setCellValue

  const result: GridColumn<TRow> = {
    ...column,
    index,
    name: column.name ?? dataField ?? type ?? `column${index}`,
    caption: column.caption ?? (dataField ? captionize(dataField) : ''),
    dataType,
    alignment: column.alignment ?? (type === 'selection' ? 'center' : getDefaultAlignment(dataType, !!lookup)),
    visible: column.visible ?? true,
    allowSorting: column.allowSorting ?? isData,
    allowFiltering,
    allowSearch: column.allowSearch ?? allowFiltering,
    // Calculated columns cannot be written back unless they say how
    allowEditing: column.allowEditing ?? (isData && (!!dataField || !!userSetter)),
    showEditorAlways: column.showEditorAlways ?? false,
    filterOperations: column.filterOperations ?? getDefaultFilterOperations(dataType, !!lookup),
    defaultSelectedFilterOperation: isData
      ? (column.selectedFilterOperation ?? getDefaultSelectedFilterOperation(dataType, !!lookup))
      : undefined,
    lookup,
    editorOptions: column.editorOptions ?? {},
    trueText: column.trueText ?? formatMessage('dxDataGrid-trueText'),
    falseText: column.falseText ?? formatMessage('dxDataGrid-falseText'),
    // A plain field keeps expressions serializable for remote stores
    selector: custom || !dataField ? calculateCellValue : dataField,
    calculateCellValue,
    defaultCalculateFilterExpression(filterValue, operation, target) {
      return (defaultCalculateFilterExpression<TRow>).call(result, filterValue, operation, target)
    },
    calculateFilterExpression(filterValue, operation, target) {
      return (userFilter ?? defaultCalculateFilterExpression<TRow>).call(result, filterValue, operation, target)
    },
    defaultSetCellValue(newData, value) {
      if (setter) setter(newData, value)
    },
    setCellValue(newData, value, currentRowData) {
      if (userSetter) return userSetter.call(result, newData, value, currentRowData)
      result.defaultSetCellValue(newData, value, currentRowData)
    },
  }
  return result
}
