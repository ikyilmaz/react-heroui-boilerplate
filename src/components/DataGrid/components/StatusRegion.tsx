import { memo, useSyncExternalStore } from 'react'
import { Typography } from '@heroui/react'
import type { StatusStore } from '../types/StatusStore'

/** Screen reader announcements (editing started, saved, filters cleared…); renders on its own. */
export const StatusRegion = memo(function StatusRegion({ store }: { store: StatusStore }) {
  const message = useSyncExternalStore(store.subscribe, store.get)
  return (
    <Typography role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </Typography>
  )
})
