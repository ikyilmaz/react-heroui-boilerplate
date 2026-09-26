import type { HorizontalAlignment } from '../types/HorizontalAlignment'

export function getAlignmentClass(alignment: HorizontalAlignment): string {
  return alignment === 'right' ? 'text-end' : alignment === 'center' ? 'text-center' : 'text-start'
}
