import { EN_MESSAGES } from './messages/enMessages'
import { TR_MESSAGES } from './messages/trMessages'

/** Module-level state, like DevExtreme's global localization and `config()`. */
export const localizationState = {
  locale: 'tr',
  dictionaries: { en: { ...EN_MESSAGES }, tr: { ...TR_MESSAGES } } as Record<
    string,
    Record<string, string>
  >,
  defaultCurrency: 'TRY',
}
