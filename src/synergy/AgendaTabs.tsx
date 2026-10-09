import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Flex } from 'antd'
import { cn } from '@/synergy/ant/ui'
import { useFillHeight } from '@/synergy/shared/hooks'
import { useTabScroller } from '@/synergy/tabs/context'
import { ContentSwitch } from '@/synergy/tabs/ContentSwitch'
import { useDirection } from '@/synergy/tabs/motion'
import { SHEET, TAB_BG } from '@/synergy/tabs/shape'
import { Tab, TabButton, TabGroup, TabStrip } from '@/synergy/tabs/TabStrip'

/*
 * Ajanda sekmeleri (iş akışı kutuları): ortak sekme şeridi (`tabs/TabStrip.tsx`, form sekmeleriyle
 * aynı görünüş) içeriği saran açık renkli kabın üstünde; seçili sekme kabın renginde, içbükey
 * kavislerle kaba kaynaşır ve sekmeden sekmeye kayar, diğerleri zeminsiz, aralarında ince çizgi.
 * Sekmeler bağlantıdır (react-router `Link`). Bir gruba ait sekmelerin önünde grubun adı yazar
 * (ör. "Geçmiş"). Sekme değişince içerik seçilen sekmenin yönünden kayarak gelir, eskisi yerinde
 * söner (`ContentSwitch`).
 */

export interface AgendaTab {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  /** Grup adı; grubun sekmelerinin önünde yazar. */
  group?: string
}

/** Art arda aynı gruptaki sekmeler bir blok. */
function blocks(tabs: AgendaTab[]) {
  const out: { key: string; label?: string; tabs: AgendaTab[] }[] = []
  for (const t of tabs) {
    const last = out[out.length - 1]
    if (last && last.label === t.group) last.tabs.push(t)
    else out.push({ key: t.group ?? `main-${out.length}`, label: t.group, tabs: [t] })
  }
  return out
}

export function AgendaTabs({
  label,
  tabs,
  active,
  children,
}: {
  label: string
  tabs: AgendaTab[]
  /** Seçili sekme; yoksa boş durum (seçim yaprağı yok). */
  active?: string
  /** Kabın içeriği. */
  children: ReactNode
}) {
  // Sekmeler açıkken bölmenin kalanını (bölmenin iç payı 0.75rem), değilse ekranın kalanını
  const scroller = useTabScroller()
  const [setFill, fillStyle] = useFillHeight(scroller ? '0.75rem' : '1.5rem', scroller)
  // Geçişin yönü: yeni sekme eskisinin sağındaysa içerik sağdan, solundaysa soldan gelir
  const dir = useDirection(tabs.findIndex((t) => t.id === active))
  return (
    // Geniş ekranda ekranın (bölmenin) kalanını doldurur (altta boşluk kalmaz); içerik kendi içinde kayar
    <Flex
      ref={setFill}
      style={fillStyle}
      className={cn('flex flex-col @4xl:h-(--fill-h)', TAB_BG)}
    >
      <TabStrip
        nav
        label={label}
        selected={active}
        sizing="content"
        sheet={SHEET}
        // Soldan içeri girme payı = kabın köşesi (`rounded-3xl`) + sekme kavisi: seçili sekmenin
        // kavisi kabın düz üst kenarına oturur
        inset="ps-[calc(var(--radius)*3+var(--tab-r))] pe-8"
        className="shrink-0"
      >
        {blocks(tabs).map((b) => (
          <TabGroup key={b.key} id={b.key} label={b.label}>
            {b.tabs.map((t) => (
              <Tab key={t.id} id={t.id} selected={t.id === active}>
                <TabButton
                  href={t.href}
                  label={t.label}
                  icon={t.icon}
                  current={t.id === active}
                  className="px-4"
                />
              </Tab>
            ))}
          </TabGroup>
        ))}
      </TabStrip>
      <Flex className="relative flex min-w-0 flex-col rounded-3xl bg-(--tab-bg) p-3 @4xl:min-h-0 @4xl:flex-1">
        <ContentSwitch
          id={active ?? ''}
          dir={dir}
          className="flex min-w-0 flex-col @4xl:min-h-0 @4xl:flex-1"
        >
          {children}
        </ContentSwitch>
      </Flex>
    </Flex>
  )
}
