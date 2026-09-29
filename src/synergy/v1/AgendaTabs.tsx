import { useLayoutEffect, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, Typography, cn } from '@heroui/react'
import { inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { IC, Scroll } from '@/synergy/v1/parts'
import { useFillHeight } from '@/synergy/shared/hooks'

/*
 * Ajanda sekmeleri (form sekmeleriyle aynı görünüş): içeriği saran açık renkli bir kabın üstünde
 * yatay sekmeler; seçili sekme kabın renginde, içbükey kavislerle kaba kaynaşır ve sekmeden sekmeye
 * kayar (konum şeride göre ölçülür); diğerleri kısa ve gri. Sekmeler bağlantıdır (`href`). Bir
 * gruba ait ilk sekmenin önünde grubun adı yazar (ör. "Geçmiş").
 */

/** Kap ve seçili sekmenin rengi: birincil rengin zemine karışmış çok açık tonu. */
export const AGENDA_PAGE = '[--tab-bg:color-mix(in_oklab,var(--accent)_9%,var(--background))]'

/** Seçili sekmenin kaba bağlandığı alt köşelerdeki içbükey kavisler. */
const FLARES =
  "before:absolute before:bottom-0 before:-start-4 before:size-4 before:bg-[radial-gradient(circle_at_0_0,transparent_1rem,var(--tab-bg)_1rem)] before:content-[''] after:absolute after:bottom-0 after:-end-4 after:size-4 after:bg-[radial-gradient(circle_at_100%_0,transparent_1rem,var(--tab-bg)_1rem)] after:content-['']"

export interface AgendaTab {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  /** Grup adı; grubun ilk sekmesinin önünde yazar. */
  group?: string
}

export function AgendaTabs({
  label,
  tabs,
  active,
  children,
}: {
  label: string
  tabs: AgendaTab[]
  active: string
  /** Kabın içeriği. */
  children: ReactNode
}) {
  const [setFill, fillStyle] = useFillHeight()
  // Seçim zemininin yeri: seçili sekmenin şerit içindeki konumu; ilk ölçümde kaymadan yerleşir
  const [row, setRow] = useState<HTMLElement | null>(null)
  const [bar, setBar] = useState<{ left: number; width: number; slide: boolean } | null>(null)
  useLayoutEffect(() => {
    if (!row) return
    const measure = () => {
      const el = row.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`)
      setBar((b) => {
        if (!el) return null
        // Konum şeride göre (sekme konumlu bir sarmalayıcıda; offsetLeft ona göre 0 çıkıyordu)
        const r = el.getBoundingClientRect()
        const next = {
          left: Math.round(r.left - row.getBoundingClientRect().left),
          width: Math.round(r.width),
          slide: b !== null,
        }
        return b && b.left === next.left && b.width === next.width ? b : next
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    row.querySelectorAll('[data-tab]').forEach((t) => ro.observe(t))
    return () => ro.disconnect()
  }, [row, active, tabs])

  return (
    // Geniş ekranda ekranın kalanını doldurur (altta boşluk kalmaz); içerik kendi içinde kayar
    <Box
      ref={setFill}
      style={fillStyle}
      className={cn('flex flex-col lg:h-(--fill-h)', AGENDA_PAGE)}
    >
      <Scroll orientation="horizontal" hideScrollBar className="shrink-0">
        <Box
          ref={setRow}
          role="navigation"
          aria-label={label}
          className="relative flex min-w-max items-end gap-1 px-8 pt-1"
        >
          {bar && (
            <Box
              aria-hidden
              style={{ left: bar.left, width: bar.width }}
              className={cn(
                'pointer-events-none absolute bottom-0 z-1 h-12 rounded-t-2xl bg-(--tab-bg)',
                FLARES,
                bar.slide &&
                  'transition-[left,width] duration-[calc(260ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
              )}
            />
          )}
          {tabs.map((t, i) => {
            const selected = t.id === active
            const Icon = t.icon
            const groupStart = t.group && tabs[i - 1]?.group !== t.group
            return (
              <Box key={t.id} className="flex items-end">
                {groupStart && (
                  <Text
                    tone="muted"
                    className="ms-4 me-2 mb-3.5 text-xs font-medium whitespace-nowrap"
                  >
                    {t.group}
                  </Text>
                )}
                <Box
                  data-tab={t.id}
                  className={cn('relative flex h-12 shrink-0 items-center', selected && 'z-2')}
                >
                  {!selected && (
                    <Box
                      aria-hidden
                      className="absolute inset-x-0 top-2 bottom-0 z-0 rounded-t-2xl bg-surface-tertiary"
                    />
                  )}
                  <Link
                    href={t.href}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      // Klavye odağı sekmenin içinde ince çizgi (HeroUI'nin dışa taşan halkası yerine)
                      'relative z-2 flex h-full items-center gap-2 rounded-t-2xl px-5 pt-2 text-sm no-underline transition-colors hover:no-underline focus-visible:[box-shadow:inset_0_0_0_2px_var(--focus)] data-[focus-visible=true]:[box-shadow:inset_0_0_0_2px_var(--focus)]',
                      selected
                        ? 'font-semibold text-accent-soft-foreground'
                        : 'font-medium text-foreground/70 hover:text-foreground',
                    )}
                  >
                    {Icon && <Icon {...IC} className="shrink-0" />}
                    <Typography {...inline} className="whitespace-nowrap text-current!">
                      {t.label}
                    </Typography>
                  </Link>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Scroll>
      <Box className="flex min-w-0 flex-col rounded-3xl bg-(--tab-bg) p-3 lg:min-h-0 lg:flex-1">
        {children}
      </Box>
    </Box>
  )
}
