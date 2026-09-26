import type { ReactNode } from 'react'
import { Typography } from '@heroui/react'

export function HeaderText({ children }: { children: ReactNode }) {
  return (
    <Typography type="body-xs" weight="medium" color="muted" truncate>
      {children}
    </Typography>
  )
}
