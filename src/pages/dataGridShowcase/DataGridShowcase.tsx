import { useState, type ReactNode } from 'react'
import { Surface, Tabs, Typography } from '@heroui/react'
import { AutoColumnsDemo } from './AutoColumnsDemo'
import { CellEditingDemo } from './CellEditingDemo'
import { DATA_GRID_VARIANTS } from './dataGridVariants'
import { EventsApiDemo } from './EventsApiDemo'
import { RemoteDataDemo } from './RemoteDataDemo'
import { RowEditingDemo } from './RowEditingDemo'
import { SortingFilteringDemo } from './SortingFilteringDemo'

/** Typography renders a <p>; tab labels need a <span>. */
const inlineText = { elementType: 'span', slot: null } as unknown as Record<string, never>

/**
 * The DataGrid slide: one tab per variant. Only the selected panel renders; the demos' stores
 * live at module level, so edits survive switching.
 */
export function DataGridShowcase({ onAnnounce }: { onAnnounce: (message: string) => void }) {
  const [variant, setVariant] = useState(DATA_GRID_VARIANTS[0].id)
  const demos: Record<string, ReactNode> = {
    row: <RowEditingDemo onAnnounce={onAnnounce} />,
    cell: <CellEditingDemo onAnnounce={onAnnounce} />,
    sorting: <SortingFilteringDemo />,
    remote: <RemoteDataDemo />,
    events: <EventsApiDemo />,
    auto: <AutoColumnsDemo />,
  }
  return (
    <Tabs
      variant="secondary"
      selectedKey={variant}
      onSelectionChange={(k) => setVariant(String(k))}
      className="w-full min-w-0 gap-4"
    >
      <Tabs.ListContainer className="overflow-x-auto">
        <Tabs.List aria-label="DataGrid örnekleri">
          {DATA_GRID_VARIANTS.map((v) => (
            <Tabs.Tab key={v.id} id={v.id} className="gap-2 whitespace-nowrap">
              <Tabs.Indicator />
              <Typography aria-hidden className="inline-flex" {...inlineText}>
                {v.icon}
              </Typography>
              <Typography {...inlineText}>{v.label}</Typography>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {DATA_GRID_VARIANTS.map((v) => (
        <Tabs.Panel key={v.id} id={v.id} className="min-w-0">
          <Surface variant="transparent" className="flex min-w-0 flex-col gap-3">
            <Typography type="body-sm" color="muted">
              {v.description}
            </Typography>
            {demos[v.id]}
          </Surface>
        </Tabs.Panel>
      ))}
    </Tabs>
  )
}
