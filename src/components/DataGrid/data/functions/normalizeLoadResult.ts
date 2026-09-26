import type { LoadResult } from '../types/LoadResult'

export function normalizeLoadResult<TRow>(result: LoadResult<TRow>): {
  data: TRow[]
  totalCount?: number
} {
  return Array.isArray(result) ? { data: result } : result
}
