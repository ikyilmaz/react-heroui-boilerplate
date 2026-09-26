import type { RowObject } from '../RowObject'

/** `allowUpdating` / `allowDeleting`: fixed, or decided per row. */
export type RowPermission<TRow> = boolean | ((e: { row: RowObject<TRow> }) => boolean)
