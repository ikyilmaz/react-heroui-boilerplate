import { memo } from 'react'
import { Typography } from '@heroui/react'
import { Highlight } from './Highlight'

export interface CellTextProps {
  text: string
  className?: string
  weight?: 'medium'
  color?: 'muted'
}

/**
 * Cell text: truncated, search highlighted. When it is cut off, the grid's shared tooltip shows it
 * whole (`data-dx-truncate`) — a tooltip per cell was one of the grid's heaviest parts.
 */
export const CellText = memo(function CellText({ text, className, weight, color }: CellTextProps) {
  return (
    <Typography weight={weight} color={color} className={className} truncate data-dx-truncate="">
      <Highlight text={text} />
    </Typography>
  )
})
