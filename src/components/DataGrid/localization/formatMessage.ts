import { localizationState } from './localizationState'

/** The text of `key` in the active locale (then its base language, then English), `{n}` filled. */
export function formatMessage(key: string, ...values: unknown[]): string {
  const { locale, dictionaries } = localizationState
  const text =
    dictionaries[locale]?.[key] ??
    dictionaries[locale.split('-')[0]]?.[key] ??
    dictionaries.en?.[key] ??
    key
  return values.length ? text.replace(/\{(\d+)\}/g, (m, i) => String(values[Number(i)] ?? m)) : text
}
