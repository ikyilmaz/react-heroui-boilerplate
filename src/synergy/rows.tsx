import { Button, Dropdown } from 'antd'
import { ChevronDown, Trash2 } from 'lucide-react'
import { fastApprovalEvents, type WorkRequest } from '@/synergy/shared/workflowData'
import { IC, Tip } from '@/synergy/ant/ui'

/*
 * Satır eylemleri (antd). "Olaylar ▾" (Bekleyen Onaylar): akışın hızlı onay olayları, Enable
 * olmayanlar pasif; seçilen olay listenin olay hattına (`useFlow`) gider. "Sil" (Taslaklar).
 * Satırın kendisi tıklanır; eylemdeki tıklama satıra geçmez.
 */

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

export function FastMenu({
  request,
  onRun,
  placement = 'bottom end',
}: {
  request: WorkRequest
  onRun: (eventId: number) => void
  /** Menünün açıldığı yön (olaylar solda duruyorsa `bottom start`). */
  placement?: 'bottom end' | 'bottom start'
}) {
  const events = fastApprovalEvents(request)
  if (!events.length) return null
  const label = `Olaylar: ${request.template.title}`
  return (
    <Dropdown
      trigger={['click']}
      placement={placement === 'bottom end' ? 'bottomRight' : 'bottomLeft'}
      menu={{
        'aria-label': label,
        onClick: ({ key, domEvent }) => {
          domEvent.stopPropagation()
          onRun(Number(key))
        },
        items: events.map((e) => {
          const Icon = e.icon
          return {
            key: String(e.id),
            disabled: !e.enable,
            label: e.description,
            icon: (
              <Icon
                {...IC}
                className={
                  e.kind === 'reject'
                    ? 'text-danger'
                    : e.kind === 'approve'
                      ? 'text-success'
                      : 'text-muted'
                }
              />
            ),
          }
        }),
      }}
    >
      <Button
        type="text"
        size="small"
        aria-label={label}
        onClick={stop}
        iconPlacement="end"
        icon={<ChevronDown {...IC} size={14} />}
        className="text-accent-soft-foreground"
      >
        Olaylar
      </Button>
    </Dropdown>
  )
}

export function DeleteButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Tip label="Sil">
      <Button
        type="text"
        size="small"
        aria-label={`Sil: ${title}`}
        icon={<Trash2 {...IC} />}
        onClick={(e) => {
          e.stopPropagation()
          onPress()
        }}
        className="text-muted"
      />
    </Tip>
  )
}
