import { formatMessage } from '../localization/formatMessage'
import type { EditingTexts } from '../types/options/EditingTexts'
import type { ResolvedEditingTexts } from '../types/ResolvedEditingTexts'

export function getEditingTexts(texts: EditingTexts | undefined): ResolvedEditingTexts {
  return {
    addRow: texts?.addRow ?? formatMessage('dxDataGrid-editingAddRow'),
    editRow: texts?.editRow ?? formatMessage('dxDataGrid-editingEditRow'),
    deleteRow: texts?.deleteRow ?? formatMessage('dxDataGrid-editingDeleteRow'),
    saveRowChanges: texts?.saveRowChanges ?? formatMessage('dxDataGrid-editingSaveRowChanges'),
    cancelRowChanges: texts?.cancelRowChanges ?? formatMessage('dxDataGrid-editingCancelRowChanges'),
    confirmDeleteMessage: texts?.confirmDeleteMessage ?? formatMessage('dxDataGrid-editingConfirmDeleteMessage'),
    confirmDeleteTitle: texts?.confirmDeleteTitle ?? formatMessage('dxDataGrid-editingConfirmDeleteTitle'),
  }
}
