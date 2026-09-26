import type { ReactNode } from 'react'
import { Card, Typography } from '@heroui/react'

/** A side panel next to a demo grid (event log, last load options). */
export function DemoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="secondary" className="min-w-0 gap-2">
      <Card.Header>
        <Typography type="body-sm" weight="medium">
          {title}
        </Typography>
      </Card.Header>
      <Card.Content className="max-h-72 overflow-auto">{children}</Card.Content>
    </Card>
  )
}
