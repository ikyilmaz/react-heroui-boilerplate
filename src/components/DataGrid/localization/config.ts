import type { GlobalConfig } from '../types/GlobalConfig'
import { localizationState } from './localizationState'

/** Global settings, like `devextreme/core/config`. */
export function config(options?: GlobalConfig): Required<GlobalConfig> {
  if (options?.defaultCurrency) localizationState.defaultCurrency = options.defaultCurrency
  return { defaultCurrency: localizationState.defaultCurrency }
}
