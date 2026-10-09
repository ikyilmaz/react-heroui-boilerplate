import { Fragment, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Card, Flex, Typography } from 'antd'
import { CARD, IC, cn } from '@/synergy/ant/ui'
import { useFillHeight } from '@/synergy/shared/hooks'
import { useTabScroller } from '@/synergy/tabs/context'
import { ContentSwitch } from '@/synergy/tabs/ContentSwitch'
import { useDirection } from '@/synergy/tabs/motion'

/*
 * Ajanda (iş akışı kutuları): sayfanın üstünde beyaz bir araç çubuğunda yuvarlak çipler. Sekme
 * değil (çalışma alanının sekmesinin içinde ikinci bir sekme şeridi hiyerarşiyi bulandırıyordu);
 * süzgeç gibi okunur. Seçili kutu birincil renkte dolu, diğerleri açık gri; gruba ait kutuların
 * (ör. "Geçmiş") önünde ince bir ayraç ve grubun adı, çipleri zeminsiz. Yazı kalınlığı seçimle
 * değişmez (çipin genişliği oynamaz). Çipler bağlantıdır (react-router `Link`); sığmayınca çubuk
 * yana kayar. Kutu değişince içerik seçilen çipin yönünden kayarak gelir, eskisi yerinde söner
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

const CHIP =
  'flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap no-underline transition-colors duration-[calc(150ms*var(--motion-time,1))] outline-none hover:no-underline focus-visible:[box-shadow:0_0_0_2px_var(--focus)]'
/** Seçili kutu. */
const CHIP_ON = 'bg-accent text-accent-foreground hover:text-accent-foreground'
/** Ana kutular: açık gri dolgu. */
const CHIP_MAIN =
  'bg-surface-secondary text-foreground hover:bg-surface-tertiary hover:text-foreground'
/** Gruptaki kutular (Geçmiş): zeminsiz, soluk. */
const CHIP_GROUP = 'text-muted hover:bg-surface-secondary hover:text-foreground'

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
      <Card className={cn(CARD, 'shrink-0')} classNames={{ body: 'p-1.5' }}>
        <Flex
          role="navigation"
          aria-label={label}
          className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]"
        >
          {blocks(tabs).map((b) => (
            <Fragment key={b.key}>
              {b.label && (
                <>
                  <Flex aria-hidden className="mx-1.5 block h-5 w-px shrink-0 bg-border" />
                  <Typography.Text className="shrink-0 px-1 text-[0.6875rem] font-semibold tracking-wider text-muted uppercase">
                    {b.label}
                  </Typography.Text>
                </>
              )}
              {b.tabs.map((t) => {
                const on = t.id === active
                const Icon = t.icon
                return (
                  <Link
                    key={t.id}
                    to={t.href}
                    aria-current={on ? 'page' : undefined}
                    className={cn(CHIP, on ? CHIP_ON : b.label ? CHIP_GROUP : CHIP_MAIN)}
                  >
                    {Icon && <Icon {...IC} size={15} className="shrink-0" />}
                    {t.label}
                  </Link>
                )
              })}
            </Fragment>
          ))}
        </Flex>
      </Card>
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
