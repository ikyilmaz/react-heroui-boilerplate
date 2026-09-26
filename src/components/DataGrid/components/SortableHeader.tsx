import { memo } from 'react'
import { Table, Typography } from '@heroui/react'

/** Typography renders a <p>; the index sits inside the caption, so it must be an inline <span>. */
const inlineText = { elementType: 'span', slot: null } as unknown as Record<string, never>

/**
 * Sortable header. The direction comes from the grid's own sort state, not React Aria's: RAC
 * knows one sorted column, DevExtreme's multiple sorting can have several.
 */
export const SortableHeader = memo(function SortableHeader({
  caption,
  sortDirection,
  sortIndex,
}: {
  caption: string
  sortDirection?: 'ascending' | 'descending'
  /** Shown with `sorting.showSortIndexes` (1-based). */
  sortIndex?: number
}) {
  return (
    <Table.SortableColumnHeader sortDirection={sortDirection}>
      <Typography type="body-xs" weight="medium" color="muted" truncate title={caption}>
        {caption}
        {sortIndex !== undefined && (
          <Typography {...inlineText} type="body-xs" color="muted" className="ms-1 tabular-nums opacity-70">
            {sortIndex}
          </Typography>
        )}
      </Typography>
    </Table.SortableColumnHeader>
  )
})
