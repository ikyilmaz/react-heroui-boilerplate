import { cn } from '@heroui/react'
import { DEFAULT_CLASS_NAMES } from '../constants/defaultClassNames'
import type { DataGridClassNames } from '../types/DataGridClassNames'

export function mergeClassNames(overrides?: Partial<DataGridClassNames>): DataGridClassNames {
  if (!overrides) return DEFAULT_CLASS_NAMES
  const merged = { ...DEFAULT_CLASS_NAMES }
  for (const key of Object.keys(overrides) as (keyof DataGridClassNames)[])
    merged[key] = cn(DEFAULT_CLASS_NAMES[key], overrides[key]) ?? ''
  return merged
}
