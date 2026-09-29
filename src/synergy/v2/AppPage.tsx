import { Navigate, useParams } from 'react-router'
import { Card, Chip, cn } from '@heroui/react'
import { Hourglass } from 'lucide-react'
import { findApp } from '@/synergy/shared/workflowData'
import { Box } from '@/synergy/shared/ui'
import { BASE, START_CRUMB, useCrumbs } from '@/synergy/v2/paths'
import { Empty, PANEL, PageHeader } from '@/synergy/v2/parts'

/* Menü uygulaması (maket): başlık ve "Yakında" kartı */

export function BentoAppPage() {
  const app = findApp(useParams().appId)
  useCrumbs(app ? [START_CRUMB, { label: app.caption }] : [])
  if (!app) return <Navigate to={BASE} replace />
  return (
    <Box className="flex flex-col gap-6">
      <PageHeader
        title={app.caption}
        actions={
          <Chip size="sm" variant="soft" color="accent">
            Yakında
          </Chip>
        }
      />
      <Card className={cn(PANEL)}>
        <Empty icon={Hourglass} text="Bu uygulama bu örnekte henüz yok." className="py-24" />
      </Card>
    </Box>
  )
}
