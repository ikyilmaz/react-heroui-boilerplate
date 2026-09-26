import type { ComponentProps } from 'react'
import type { Chip } from '@heroui/react'
import type { RequestStatus } from './RequestStatus'

/** An item of the status lookup. */
export interface RequestStatusItem {
  id: RequestStatus
  label: string
  color: ComponentProps<typeof Chip>['color']
}
