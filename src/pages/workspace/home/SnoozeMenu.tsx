import { Dropdown } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
import { CalendarClock, CalendarDays, Sunrise } from 'lucide-react'
import { snoozeTargets, type SnoozeTarget, type SnoozeTargetId } from '@/pages/workflows/triage'
import { snoozeWithUndo } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import type { SnoozeMenuProps } from '@/pages/workspace/home/types'
import { Text } from '@/pages/workspace/ui'

/* -------------------------------------------------------------------------------------------------
 * "Sonra" menüsü
 *
 * Talebi kuyruktan geçici olarak çıkarır: yarın sabah, pazartesi sabahı ya da gelecek hafta
 * (hepsi 09:00, `snoozeTargets`). Tetikleyici düğmeyi çağıran verir (`children`); menü HeroUI
 * `Dropdown`. Klavyede H ile açılabilsin diye isteğe bağlı olarak denetimli (`isOpen`).
 *
 * Seçenekler rakam göstermez; yanlarında yalnızca soluk bir gün adı durur ("Cuma"). Erteleme
 * `snoozeWithUndo` ile yapılır: satır solar, odak ilerler, "Ertelendi" bildirimi "Geri al" sunar.
 * ------------------------------------------------------------------------------------------------- */

const targetIcons: Record<SnoozeTargetId, LucideIcon> = {
  yarin: Sunrise,
  pazartesi: CalendarDays,
  hafta: CalendarClock,
}

const weekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })

/** Seçeneğin yanındaki soluk gün adı; "Pazartesi sabahı" günü zaten söylediği için boş. */
function dayHint(t: SnoozeTarget) {
  return t.id === 'pazartesi' ? undefined : weekday.format(t.until)
}

export function SnoozeMenu({ r, from, children, isOpen, onOpenChange, onSnoozed }: SnoozeMenuProps) {
  const home = useHome()
  const targets = snoozeTargets()
  // Seçili talep kartından ertelenince kuyruğun odağı da bir sonraki satıra geçsin
  const setFocusedId = from === 'next' && home.modeOf('next') === 'secili' ? home.setFocusedId : undefined

  return (
    <Dropdown isOpen={isOpen} onOpenChange={onOpenChange}>
      {children}
      <Dropdown.Popover placement="bottom end" className="soft-theme min-w-56">
        <Dropdown.Menu
          aria-label={`Sonra: ${r.template.title}`}
          onAction={(key) => {
            const target = targets.find((t) => t.id === key)
            if (!target) return
            snoozeWithUndo(r, target, { from, setFocusedId })
            onSnoozed?.(target)
          }}
        >
          {targets.map((t) => {
            const Icon = targetIcons[t.id]
            const hint = dayHint(t)
            return (
              <Dropdown.Item key={t.id} id={t.id} textValue={t.label} className="gap-2.5">
                <Icon size={16} strokeWidth={1.5} aria-hidden className="shrink-0 text-foreground/55" />
                <Text tone="primary" className="flex-1 text-[0.875rem]">
                  {t.label}
                </Text>
                {hint && (
                  <Text tone="muted" className="text-[0.75rem]">
                    {hint}
                  </Text>
                )}
              </Dropdown.Item>
            )
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
