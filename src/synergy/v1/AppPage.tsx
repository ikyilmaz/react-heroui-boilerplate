import { Navigate, useParams } from 'react-router'
import { Card, Chip, EmptyState, Typography, cn } from '@heroui/react'
import { Hourglass } from 'lucide-react'
import { findApp } from '@/synergy/shared/workflowData'
import { card } from '@/synergy/shared/tokens'
import { Box } from '@/synergy/shared/ui'
import { BASE, START_CRUMB, useFrame } from '@/synergy/v1/paths'
import { TintIcon } from '@/synergy/v1/parts'

/* Menü uygulaması (maket): tek beyaz karoda "Yakında" */

export function KaroAppPage() {
  const app = findApp(useParams().appId)
  useFrame(app ? [START_CRUMB, { label: app.caption }] : [])
  if (!app) return <Navigate to={BASE} replace />
  return (
    <Box className="flex flex-col gap-3">
      <Typography.Heading level={1} weight="bold" className="px-1 pt-2 font-display text-[2rem]">
        {app.caption}
      </Typography.Heading>
      <Card role="note" className={cn('px-6 py-14', card)}>
        <EmptyState className="flex flex-col items-center gap-3">
          <TintIcon icon={Hourglass} />
          <Chip size="sm" variant="primary" color="accent">
            Yakında
          </Chip>
          <Typography type="body-sm" color="muted" align="center" className="max-w-sm">
            Bu uygulama bu örnekte henüz yok.
          </Typography>
        </EmptyState>
      </Card>
    </Box>
  )
}
