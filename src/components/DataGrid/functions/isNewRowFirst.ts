import type { NewRowPosition } from '../types/options/NewRowPosition'

export function isNewRowFirst(position: NewRowPosition): boolean {
  return position === 'first' || position === 'pageTop' || position === 'viewportTop'
}
