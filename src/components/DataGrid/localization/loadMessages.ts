import { localizationState } from './localizationState'

/** Adds or overrides texts: `loadMessages({ tr: { 'dxDataGrid-noDataText': 'Boş' } })`. */
export function loadMessages(messages: Record<string, Record<string, string>>): void {
  for (const [name, dictionary] of Object.entries(messages))
    localizationState.dictionaries[name] = {
      ...localizationState.dictionaries[name],
      ...dictionary,
    }
}
