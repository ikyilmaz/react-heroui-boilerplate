import { type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Flex, Typography } from 'antd'
import { CARD, IC, cn } from '@/synergy/ant/ui'
import { Indicator } from '@/synergy/ant/motion'
import { useFillHeight } from '@/synergy/shared/hooks'
import { useTabScroller } from '@/synergy/tabs/context'
import { ContentSwitch } from '@/synergy/tabs/ContentSwitch'
import { useDirection } from '@/synergy/tabs/motion'

/*
 * Ajanda (iş akışı kutuları): sayfanın üstünde segment rayları. Sekme değil (çalışma alanının
 * sekmesinin içinde ikinci bir sekme şeridi hiyerarşiyi bulandırıyordu); süzgeç gibi okunur. Ana
 * kutular kart yüzeyinde bir rayda, rayın genişliğini eşit paylaşır; gruba ait kutular (ör. "Geçmiş")
 * sağda ayrı, kendi genişliğinde bir rayda, önünde grubun adı. Seçili kutunun zemini birincil
 * renkte ve kutudan kutuya (raylar arasında da) kayar (`Indicator`); yazı kalınlığı seçimle
 * değişmez. Kutular bağlantıdır (react-router `Link`); dar bölmede raylar alt alta, sığmayan ray yana
 * kayar. Kutu değişince içerik seçilen kutunun yönünden kayarak gelir, eskisi yerinde söner
 * (`ContentSwitch`).
 */

export interface AgendaTab {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  /** Grup adı; grubun kutularının önünde yazar. */
  group?: string
}

/** Art arda aynı gruptaki kutular bir blok. */
function blocks(tabs: AgendaTab[]) {
  const out: { key: string; label?: string; tabs: AgendaTab[] }[] = []
  for (const t of tabs) {
    const last = out[out.length - 1]
    if (last && last.label === t.group) last.tabs.push(t)
    else out.push({ key: t.group ?? `main-${out.length}`, label: t.group, tabs: [t] })
  }
  return out
}

/** Ray: kart yüzeyi ve konturu, içinde kutular. */
const RAIL = 'flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl bg-surface p-1 [scrollbar-width:none]'

/**
 * Kutu: simge ve ad; seçili olanın zemini kayan gösterge. Köşesi rayınkiyle eş merkezli: rayın
 * köşesi (`rounded-2xl`, ray `h-10` + `p-1` yüksekliğinin yarısını aşamaz) − k × `p-1`
 * (`--corner-k`: yuvarlakta 1, squircle'da ≈ 1.84).
 */
const ITEM =
  'relative flex h-10 items-center justify-center gap-2 rounded-[max(0.25rem*var(--corner-scale,1),calc(min(var(--radius)*2,var(--spacing)*6)-var(--corner-k,1)*var(--spacing)))] px-3.5 text-sm font-medium whitespace-nowrap no-underline transition-colors duration-[calc(150ms*var(--motion-time,1))] outline-none hover:no-underline focus-visible:[box-shadow:0_0_0_2px_var(--focus)]'
const ITEM_ON = 'text-accent-foreground hover:text-accent-foreground'
const ITEM_OFF = 'text-foreground/75 hover:bg-surface-secondary hover:text-foreground'

function Item({ tab, on, fill }: { tab: AgendaTab; on: boolean; fill?: boolean }) {
  const Icon = tab.icon
  return (
    <Link
      to={tab.href}
      aria-current={on ? 'page' : undefined}
      // Ana rayda eşit paylar (ama adından dar değil); grupta kendi genişliği
      className={cn(ITEM, fill ? 'min-w-max flex-1' : 'shrink-0', on ? ITEM_ON : ITEM_OFF)}
    >
      {on && <Indicator id="agenda-sel" className="bg-accent" />}
      {Icon && <Icon {...IC} size={16} className="relative shrink-0" />}
      <Typography.Text className="relative text-current!">{tab.label}</Typography.Text>
    </Link>
  )
}

export function AgendaTabs({
  label,
  tabs,
  active,
  children,
}: {
  label: string
  tabs: AgendaTab[]
  /** Seçili kutu; yoksa boş durum (hiçbir çip seçili değil). */
  active?: string
  /** Sayfanın içeriği. */
  children: ReactNode
}) {
  // Sekmeler açıkken bölmenin kalanını (bölmenin iç payı 0.75rem), değilse ekranın kalanını
  const scroller = useTabScroller()
  const setFill = useFillHeight(scroller ? '0.75rem' : '1.5rem', scroller)
  // Geçişin yönü: yeni kutu eskisinin sağındaysa içerik sağdan, solundaysa soldan gelir
  const dir = useDirection(tabs.findIndex((t) => t.id === active))
  return (
    // Geniş ekranda bölmenin kalanını doldurur (altta boşluk kalmaz); içerik kendi içinde kayar
    <Flex ref={setFill} className="flex flex-col gap-3 @4xl:h-(--fill-h)">
      <Flex
        role="navigation"
        aria-label={label}
        className="flex shrink-0 flex-col items-start gap-2 @6xl:flex-row @6xl:items-center"
      >
        {blocks(tabs).map((b) =>
          b.label ? (
            <Flex key={b.key} className={cn(RAIL, CARD, 'max-w-full shrink-0 ps-3')}>
              <Typography.Text className="shrink-0 pe-1.5 text-[0.6875rem] font-semibold tracking-wider text-muted uppercase">
                {b.label}
              </Typography.Text>
              {b.tabs.map((t) => (
                <Item key={t.id} tab={t} on={t.id === active} />
              ))}
            </Flex>
          ) : (
            <Flex key={b.key} className={cn(RAIL, CARD, 'w-full @6xl:w-auto @6xl:flex-1')}>
              {b.tabs.map((t) => (
                <Item key={t.id} tab={t} on={t.id === active} fill />
              ))}
            </Flex>
          ),
        )}
      </Flex>
      {/* `relative`: söner içerik (`popLayout`) bu kutuya göre konumlanır */}
      <Flex className="relative flex min-w-0 flex-col @4xl:min-h-0 @4xl:flex-1">
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
