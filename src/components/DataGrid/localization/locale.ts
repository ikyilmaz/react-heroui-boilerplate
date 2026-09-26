import { localizationState } from './localizationState'

/** Gets or sets the active locale (`'tr'`, `'en'`, `'de-DE'`…). Set it before rendering grids. */
export function locale(name?: string): string {
  if (name) localizationState.locale = name
  return localizationState.locale
}
