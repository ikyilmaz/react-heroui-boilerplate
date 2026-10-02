import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Files, History, Info, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button, Card, Divider, Flex, Tabs, Typography } from 'antd'
import { DOCUMENT_LABELS } from '@/synergy/shared/workflowData'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { CARD, cn, IC, Scroll, Tip } from '@/synergy/ant/ui'

/* -------------------------------------------------------------------------------------------------
 * Talep ayrıntısının yan bilgileri: üstte bağımsız Dokümanlar kartı, altında Özellikler / Tarihçe
 * sekmeli kart. Yerleşim pencereye değil formun bölmesinin (sayfa ya da yan yana bölme) genişliğine
 * göre seçilir:
 * - Sütun (bölme en az 52rem): formun sağında üçte bir; kaydırırken yapışık kalır, ekrana sığmazsa
 *   kendi içinde kayar. Katlanınca dar bir rafa iner; tercih saklanır.
 * - Çekmece (daha dar bölme; ör. panel boyutu 1 olan child): form tam genişliğini korur, sağda raf
 *   durur. Açılınca kartlar formun üstüne sağdan kayan bir çekmecede gelir; form soluklaşır,
 *   dışarı basınca, Esc ile ya da formda bir şey gösterilince kapanır. Her açılışta katlı başlar.
 * - Telefon: kartlar formun altında, katlama yok.
 * ------------------------------------------------------------------------------------------------- */

export type SideTab = 'props' | 'history'
/** Raftan açılan yer: Dokümanlar kartı ya da sekmeli kartın bir sekmesi. */
export type SideTarget = SideTab | 'docs'

type Mode = 'stack' | 'column' | 'drawer'

/** Sütunun sığdığı en dar bölme (rem): form ~34rem, sütun (üçte bir) ~17rem. */
const COLUMN_MIN = 52

/** Sütunun katlanma tercihi (saklanır; '0' katlı). */
const SIDE_KEY = 'synergy-detail-side-v1'

function loadFolded() {
  try {
    return localStorage.getItem(SIDE_KEY) === '0'
  } catch {
    return false
  }
}

/** Kaydırınca yapışkan şeridin (4rem, üstte 0.5rem) altında, 1rem boşlukla. */
const STICKY = 'sticky top-[calc(var(--chrome-top,0px)+var(--spacing)*22)]'

/** Ekrana sığan en uzun boy: görünen alan eksi yapışma yeri ve alt boşluk. */
const FIT = 'max-h-[calc(var(--view-h,100dvh)-var(--chrome-top,0px)-var(--spacing)*22-1rem)]'

const RAIL: { id: SideTarget; label: string; icon: LucideIcon }[] = [
  { id: 'docs', label: DOCUMENT_LABELS.title, icon: Files },
  { id: 'props', label: 'Özellikler', icon: Info },
  { id: 'history', label: 'Tarihçe', icon: History },
]

export interface SideState {
  mode: Mode
  open: boolean
  setOpen: (open: boolean) => void
  /** Çekmece açıksa kapatır (formda bir şey gösterilince). */
  dismiss: () => void
  /** Çekmecenin tepsisi: formun altındaki zeminin rengi (sekmelerde sayfa kabı, yoksa sayfa). */
  tray: string
  style: CSSProperties
}

/**
 * Yan bilgilerin durumu: yerleşim (bölme genişliğinden), açık / katlı ve ekrana sığan boy.
 * `scroller` formun kaydırma kabı (sekmeler açıkken bölme; yoksa pencere). İkinci değer formla yan
 * bilgilerin ortak kabına `ref` olarak verilir (genişliği ölçülür).
 */
export function useSidePanel(
  scroller: HTMLElement | null,
): [SideState, (el: HTMLElement | null) => void] {
  const phone = useMediaQuery('(max-width: 639px)')
  const [box, setBox] = useState<HTMLElement | null>(null)
  const [roomy, setRoomy] = useState(true)
  const [viewH, setViewH] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (!box) return
    const measure = () => {
      // Tema paneli › Ölçek kök yazı boyunu değiştirir: rem her ölçümde yeniden okunur
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      setRoomy(box.clientWidth >= COLUMN_MIN * rem)
      setViewH(scroller ? scroller.clientHeight : window.innerHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    if (scroller) ro.observe(scroller)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [box, scroller])

  const mode: Mode = phone ? 'stack' : roomy ? 'column' : 'drawer'
  const [folded, setFolded] = useState(loadFolded)
  const [drawer, setDrawer] = useState(false)
  const open = mode === 'stack' || (mode === 'column' ? !folded : drawer)

  // Çekmece Esc ile kapanır
  useEffect(() => {
    if (mode !== 'drawer' || !drawer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, drawer])

  const state: SideState = {
    mode,
    open,
    setOpen: (v) => {
      if (mode === 'drawer') setDrawer(v)
      if (mode !== 'column') return
      setFolded(!v)
      try {
        localStorage.setItem(SIDE_KEY, v ? '1' : '0')
      } catch {
        // Depolama kapalıysa tercih yalnızca bu oturumda
      }
    },
    dismiss: () => setDrawer(false),
    tray: scroller ? 'bg-(--tab-bg)' : 'bg-background',
    style: (viewH === null ? {} : { '--view-h': `${viewH}px` }) as CSSProperties,
  }
  return [state, setBox]
}

/**
 * Yan bilgiler: Dokümanlar kartı ve Özellikler / Tarihçe kartı; yerleşime göre sütun, raf +
 * çekmece ya da formun altında. Formla aynı kabın (`useSidePanel` ile ölçülen) çocuğudur.
 */
export function SidePanel({
  side,
  tab,
  onTab,
  onOpen,
  warning,
  docs,
  props,
  history,
}: {
  side: SideState
  tab: SideTab
  onTab: (tab: SideTab) => void
  /** Raftan bir yer açılınca (sekme seçilir, panel açılır). */
  onOpen: (target: SideTarget) => void
  /** Zorunlu dokümanlar görülmedi: Dokümanlar kartı sallanır. */
  warning: boolean
  docs: ReactNode
  props: ReactNode
  history: ReactNode
}) {
  const { mode, open, setOpen } = side
  const drawer = mode === 'drawer'
  const foldLabel = drawer ? 'Paneli kapat' : 'Paneli katla'

  const cards = (
    <>
      <Card
        className={cn(CARD, 'shrink-0', warning && 'animate-shake ring-2 ring-warning')}
        classNames={{ body: 'flex flex-col gap-2 p-5 pt-4' }}
      >
        <Flex align="center" justify="space-between" gap={8} className="min-h-8">
          <Typography.Title level={2} className="m-0 font-display text-base font-semibold">
            {DOCUMENT_LABELS.title}
          </Typography.Title>
          {/* Sütunda katlama kartta; çekmecede kapatma raftaki düğmede */}
          {mode === 'column' && (
            <Tip label={foldLabel} placement="left">
              <Button
                type="text"
                size="small"
                aria-label={foldLabel}
                aria-expanded
                icon={<PanelRightClose {...IC} size={18} />}
                onClick={() => setOpen(false)}
                className="text-muted"
              />
            </Tip>
          )}
        </Flex>
        {docs}
      </Card>
      <Card className={cn(CARD, 'shrink-0')} classNames={{ body: 'p-5 pt-2' }}>
        <Tabs
          activeKey={tab}
          onChange={(key) => onTab(key as SideTab)}
          animated={{ inkBar: true, tabPane: true }}
          // Sekmeler şeridi eşit paylaşır; içerik kabı yanlara halka kadar (0.75rem) taşar:
          // tarihçedeki nabız halkası kesilmesin
          classNames={{
            header: 'mb-3 [&_.ant-tabs-nav-list]:w-full',
            item: 'm-0 flex-1 justify-center',
            body: '-mx-[0.75rem] px-[0.75rem]',
          }}
          items={[
            { key: 'props', label: 'Özellikler', children: props },
            { key: 'history', label: 'Tarihçe', children: history },
          ]}
        />
      </Card>
    </>
  )

  if (mode === 'stack')
    return (
      <Flex vertical gap={12}>
        {cards}
      </Flex>
    )

  // Raf: katlı sütun ya da çekmecenin kapısı; ikonlar kartları / sekmeleri açar
  const rail = (
    <Card
      className={cn(CARD, 'w-14 shrink-0', warning && !open && 'ring-2 ring-warning')}
      classNames={{ body: 'flex flex-col items-center gap-1 p-2' }}
    >
      <Tip label={open ? foldLabel : 'Paneli aç'} placement="left">
        <Button
          type="text"
          aria-label={open ? foldLabel : 'Paneli aç'}
          aria-expanded={open}
          icon={open ? <PanelRightClose {...IC} size={18} /> : <PanelRightOpen {...IC} size={18} />}
          onClick={() => setOpen(!open)}
          className={cn('text-muted', open && 'bg-surface-secondary!')}
        />
      </Tip>
      <Divider className="my-1 w-6 min-w-0" />
      {RAIL.map(({ id, label, icon: Icon }) => (
        <Tip key={id} label={label} placement="left">
          <Button
            type="text"
            aria-label={label}
            icon={<Icon {...IC} size={18} />}
            onClick={() => onOpen(id)}
            className={cn(
              id === tab && 'bg-accent/12! text-accent-soft-foreground! hover:bg-accent/18!',
            )}
          />
        </Tip>
      ))}
    </Card>
  )

  // Kartlar ekrana sığmazsa kendi içinde kayar; halka ve sallanma kesilmesin diye 0.25rem taşar
  const stack = (className: string, label?: string) => (
    <Scroll
      role={label ? 'dialog' : undefined}
      aria-label={label}
      className={cn('-m-1 gap-3 p-1', FIT, className)}
    >
      {cards}
    </Scroll>
  )

  if (mode === 'column')
    return (
      <Flex
        style={side.style}
        className={cn(
          STICKY,
          'z-10 shrink-0 self-start transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          open ? 'w-[calc((100%-0.75rem)/3)]' : 'w-14',
        )}
      >
        {open
          ? stack(
              'w-[calc(100%+0.5rem)] animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out_both]',
            )
          : rail}
      </Flex>
    )

  // Çekmece: raf yerinde kalır, kartlar onun solunda formun üstüne kayar; form soluklaşır. Kartlar
  // zemin renginde bir tepside: aralarından alttaki form görünmesin
  return (
    <>
      {open && (
        <Flex
          aria-hidden
          onClick={() => setOpen(false)}
          className="absolute inset-0 z-10 block animate-[fade-in_calc(0.2s*var(--motion-time,1))_ease-out] rounded-3xl bg-background/60"
        />
      )}
      <Flex style={side.style} className={cn(STICKY, 'z-20 shrink-0 self-start')}>
        {rail}
        {open &&
          stack(
            cn(
              'absolute end-[calc(100%+0.25rem)] -top-2 m-0 w-[min(25rem,calc(100cqw-4.5rem))] animate-slide-in rounded-[2.25rem] p-2',
              side.tray,
            ),
            'Yan bilgiler',
          )}
      </Flex>
    </>
  )
}
