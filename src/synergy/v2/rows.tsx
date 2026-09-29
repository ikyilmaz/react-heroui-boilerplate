import { Button, Dropdown } from '@heroui/react'
import { ChevronDown, Trash2 } from 'lucide-react'
import { fastApprovalEvents, type WorkRequest } from '@/synergy/shared/workflowData'
import { IC, Tip } from '@/synergy/v2/parts'

/*
 * Satır eylemleri. "Olaylar ▾" (Bekleyen Onaylar): akışın hızlı onay olayları, Enable olmayanlar
 * pasif; seçilen olay listenin olay hattına (`useBentoFlow`) gider. "Sil" (Taslaklar).
 */

export function FastMenu({ request, onRun }: { request: WorkRequest; onRun: (eventId: number) => void }) {
  const events = fastApprovalEvents(request)
  if (!events.length) return null
  const label = `Olaylar: ${request.template.title}`
  return (
    <Dropdown>
      <Button size="sm" variant="outline" aria-label={label} className="gap-1">
        Olaylar
        <ChevronDown {...IC} size={14} />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={label} disabledKeys={events.filter((e) => !e.enable).map((e) => String(e.id))} onAction={(key) => onRun(Number(key))}>
          {events.map((e) => {
            const Icon = e.icon
            return (
              <Dropdown.Item key={e.id} id={String(e.id)} textValue={e.description}>
                <Icon {...IC} className={e.kind === 'reject' ? 'text-danger' : e.kind === 'approve' ? 'text-success' : 'text-muted'} />
                {e.description}
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

export function DeleteButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Tip label="Sil">
      <Button isIconOnly size="sm" variant="ghost" aria-label={`Sil: ${title}`} onPress={onPress} className="text-muted data-hovered:text-danger">
        <Trash2 {...IC} />
      </Button>
    </Tip>
  )
}
