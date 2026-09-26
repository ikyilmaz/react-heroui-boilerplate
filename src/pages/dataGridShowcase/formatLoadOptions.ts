import type { LoadOptions } from '@/components/DataGrid'

/** Load options as readable JSON (dates as ISO text, selector functions named). */
export function formatLoadOptions<TRow>(options: LoadOptions<TRow>): string {
  return JSON.stringify(
    options,
    (_, value: unknown) => (typeof value === 'function' ? '[function]' : value),
    2,
  )
}
