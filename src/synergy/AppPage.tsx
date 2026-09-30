import { Navigate, useParams } from 'react-router'
import { Card, Flex, Tag, Typography } from 'antd'
import { Hourglass } from 'lucide-react'
import { findApp } from '@/synergy/shared/workflowData'
import { BASE, START_CRUMB, useFrame } from '@/synergy/paths'
import { CARD, TintIcon, cn } from '@/synergy/ant/ui'

/* Menü uygulaması (maket): tek beyaz karoda "Yakında" */

export function AppPage() {
  const app = findApp(useParams().appId)
  useFrame(app ? [START_CRUMB, { label: app.caption, icon: `app:${app.id}` }] : [])
  if (!app) return <Navigate to={BASE} replace />
  return (
    <Flex vertical gap={12}>
      <Typography.Title level={1} className="m-0 px-1 pt-2 font-display text-[2rem] font-bold">
        {app.caption}
      </Typography.Title>
      <Card role="note" className={cn(CARD)} classNames={{ body: 'px-6 py-14' }}>
        <Flex vertical align="center" gap={12}>
          <TintIcon icon={Hourglass} />
          <Tag
            variant="solid"
            className="me-0 rounded-full border-0 bg-accent px-2.5 text-xs font-medium text-accent-foreground"
          >
            Yakında
          </Tag>
          <Typography.Paragraph type="secondary" className="m-0 max-w-sm text-center text-sm">
            Bu uygulama bu örnekte henüz yok.
          </Typography.Paragraph>
        </Flex>
      </Card>
    </Flex>
  )
}
