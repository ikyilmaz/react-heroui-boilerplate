import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import {
  AnimatePresence,
  motion,
  stagger,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionStyle,
  type Transition,
  type Variants,
} from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Files, History, Info, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button, Card, Divider, Flex, Segmented, Typography } from 'antd'
import { DOCUMENT_LABELS } from '@/synergy/shared/workflowData'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { useLook } from '@/synergy/shared/themeSettings'
import { useTransition } from '@/synergy/motion'
import { CARD, cn, IC, MotionFlex, Tip } from '@/synergy/ant/ui'

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

/**
 * Kartların kabının boyu (kartlar yarı yarıya): alt kenarı hep kabın / ekranın altında. Durgunken
 * form kartıyla aynı (`--fill-h`); kaydırdıkça kaydırılan kadar uzar (`--scrolled`, Motion
 * `useScroll`), yapışınca görünen alanda durur (görünen alan eksi yapışma yeri ve alt boşluk).
 */
const FILL =
  'h-[min(calc(var(--fill-h,100dvh)+var(--scrolled,0px)),calc(var(--view-h,100dvh)-var(--chrome-top,0px)-var(--spacing)*22-1rem))]'

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
  /** Formun kaydırma kabı (sekmeler açıkken bölme; yoksa `null`: pencere). */
  scroller: HTMLElement | null
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
    scroller,
  }
  return [state, setBox]
}

/* --- Hareket ------------------------------------------------------------------------------------ */

/** Kartlar raftan (sağdan) kısa kayıp belirir; kap sırayı yönetir (`stagger`). */
const cardVariants = (enter: Transition, exit: Transition): Variants => ({
  hidden: { opacity: 0, x: 24, transition: exit },
  shown: { opacity: 1, x: 0, transition: enter },
})

/**
 * Kartların kabı: girişte kartlar sırayla (önce Dokümanlar), çıkışta ters sırayla. Çekmecede kabın
 * kendisi (tepsi) de sağdan kayarak gelir.
 */
function useStack(tray: boolean) {
  const { motion: level, speed } = useLook()
  const enter = useTransition({ duration: 0.36, ease: [0.22, 1, 0.36, 1] })
  const exit = useTransition({ duration: 0.16, ease: [0.4, 0, 1, 1] })
  const off = level === 'off'
  const stack: Variants = {
    hidden: {
      ...(tray && { opacity: 0, x: 16 }),
      transition: { ...exit, delayChildren: off ? 0 : stagger(0.04 / speed, { from: 'last' }) },
    },
    shown: {
      ...(tray && { opacity: 1, x: 0 }),
      transition: { ...enter, delayChildren: off ? 0 : stagger(0.07 / speed) },
    },
  }
  return { stack, card: cardVariants(enter, exit), fade: enter }
}

/** Sekme içeriği: değişimin yönünden gelir, ters yöne kısa çıkar (`mode="wait"`). */
const tabVariants = (enter: Transition, exit: Transition): Variants => ({
  enter: (dir: number) => ({ opacity: 0, x: dir * 16 }),
  center: { opacity: 1, x: 0, transition: enter },
  exit: (dir: number) => ({ opacity: 0, x: dir * -12, transition: exit }),
})

const MotionCard = motion.create(Card)

/* --- Yan bilgiler -------------------------------------------------------------------------------- */

/**
 * Yan bilgiler: Dokümanlar kartı ve Özellikler / Tarihçe kartı; yerleşime göre sütun, raf +
 * çekmece ya da formun altında. Formla aynı kabın (`useSidePanel` ile ölçülen) çocuğudur. Sütunda
 * ve çekmecede iki kart kabı yarı yarıya paylaşır, taşan içerik kartın içinde kayar.
 *
 * Hareket (Motion): panel açılınca kartlar sırayla raftan kayarak gelir, katlanınca ters sırayla
 * çıkar (`AnimatePresence`, `stagger`); sütunun genişliği tek adımda değişir, form kartı Motion düzen
 * animasyonuyla daralır / genişler (DetailPage.tsx). Sekmeler arasında alt çizgi kayar (`layoutId`),
 * içerik yönünden gelir. Kaydırılabilen kartın kenarları içerik taştıkça solar (`useScroll`).
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
  // Kaydırma miktarı CSS değişkeninde (`FILL`): sütun yapışana kadar kaydırılan kadar uzar, alt
  // kenarı ekranın altında kalır. MotionValue: React çizmez
  const container = useMemo(() => ({ current: side.scroller }), [side.scroller])
  const { scrollY } = useScroll(side.scroller ? { container } : undefined)
  const sticky = { ...side.style, '--scrolled': useMotionTemplate`${scrollY}px` } as MotionStyle
  const drawer = mode === 'drawer'
  const foldLabel = drawer ? 'Paneli kapat' : 'Paneli katla'
  const { stack: stackVariants, card, fade } = useStack(drawer)

  // `fill`: kartlar kabı yarı yarıya paylaşır ve içleri kayar (sütun, çekmece); telefonda doğal boy
  const cards = (fill: boolean) => (
    <>
      <MotionCard
        variants={card}
        className={cn(
          CARD,
          fill ? 'flex min-h-0 flex-1 basis-0 flex-col' : 'shrink-0',
          warning && 'animate-shake ring-2 ring-warning',
        )}
        classNames={{ body: cn('flex flex-col gap-2 p-5 pt-4', fill && 'min-h-0 flex-1') }}
      >
        <Flex align="center" justify="space-between" gap={8} className="min-h-8 shrink-0">
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
        <FadeScroll fill={fill}>{docs}</FadeScroll>
      </MotionCard>
      <MotionCard
        variants={card}
        className={cn(CARD, fill ? 'flex min-h-0 flex-1 basis-0 flex-col' : 'shrink-0')}
        classNames={{ body: cn('flex flex-col p-5 pt-4', fill && 'min-h-0 flex-1') }}
      >
        <SideTabs tab={tab} onTab={onTab} panes={{ props, history }} fill={fill} />
      </MotionCard>
    </>
  )

  if (mode === 'stack')
    return (
      <Flex vertical gap={12}>
        {cards(false)}
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

  // Kartların kabı: ekrana sığan boyda (kartlar yarı yarıya); kartlar sırayla gelir / gider
  const stack = (key: string, className: string, label?: string) => (
    <MotionFlex
      key={key}
      vertical
      role={label ? 'dialog' : undefined}
      aria-label={label}
      variants={stackVariants}
      initial="hidden"
      animate="shown"
      exit="hidden"
      className={cn('gap-3', FILL, className)}
    >
      {cards(true)}
    </MotionFlex>
  )

  // Sütun: genişlik tek adımda değişir (form kartı Motion'la daralır / genişler); kartlar ile raf
  // yer değiştirir. Çıkan, akıştan hemen çıkar ve sağ kenara bağlı kalır (`popLayout`, `anchorX`)
  if (mode === 'column')
    return (
      <MotionFlex
        style={sticky}
        className={cn(
          // Yapışkan öğe çıkan kartların (`popLayout`, mutlak) konum kabı da olur: `relative` gerekmez
          // (eklenirse `cn` yapışkanlığı siler)
          STICKY,
          'z-10 shrink-0 self-start',
          open ? 'w-[calc((100%-0.75rem)/3)]' : 'w-14',
        )}
      >
        <AnimatePresence initial={false} mode="popLayout" anchorX="right">
          {open ? (
            stack('cards', 'w-full')
          ) : (
            <MotionFlex
              key="rail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              {rail}
            </MotionFlex>
          )}
        </AnimatePresence>
      </MotionFlex>
    )

  // Çekmece: raf yerinde kalır, kartlar onun solunda formun üstüne kayar; form soluklaşır. Kartlar
  // zemin renginde bir tepside: aralarından alttaki form görünmesin
  return (
    <>
      <AnimatePresence>
        {open && (
          <MotionFlex
            key="dim"
            aria-hidden
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="absolute inset-0 z-10 block rounded-3xl bg-background/60"
          />
        )}
      </AnimatePresence>
      <MotionFlex style={sticky} className={cn(STICKY, 'z-20 shrink-0 self-start')}>
        {rail}
        <AnimatePresence>
          {open &&
            stack(
              'drawer',
              cn(
                'absolute end-[calc(100%+0.25rem)] -top-2 w-[min(25rem,calc(100cqw-4.5rem))] rounded-[2.25rem] p-2',
                side.tray,
              ),
              'Yan bilgiler',
            )}
        </AnimatePresence>
      </MotionFlex>
    </>
  )
}

/**
 * Özellikler / Tarihçe: bölümlü seçim (antd `Segmented`, tam genişlik; seçim zemini kendi kayar,
 * klavyede oklar). İçerik değişimin yönünden gelir, eskisi önce kısa çıkar (`mode="wait"`: kart
 * sabit boylu, iki içerik üst üste binmez); yeni içerik baştan başlar.
 */
function SideTabs({
  tab,
  onTab,
  panes,
  fill,
}: {
  tab: SideTab
  onTab: (tab: SideTab) => void
  panes: Record<SideTab, ReactNode>
  fill: boolean
}) {
  const enter = useTransition({ duration: 0.24, ease: 'easeOut' })
  const exit = useTransition({ duration: 0.12, ease: 'easeIn' })
  const scroller = useRef<HTMLElement | null>(null)

  // Değişimin yönü (sağdaki bölüme geçince içerik sağdan gelir)
  const [seen, setSeen] = useState({ tab, dir: 1 })
  if (seen.tab !== tab)
    setSeen({
      tab,
      dir:
        TABS.findIndex((t) => t.key === tab) > TABS.findIndex((t) => t.key === seen.tab) ? 1 : -1,
    })

  return (
    <Flex vertical className={cn(fill && 'min-h-0 flex-1')}>
      <Segmented<SideTab>
        block
        aria-label="Yan bilgiler"
        value={tab}
        onChange={onTab}
        options={TABS.map(({ key, label }) => ({ value: key, label }))}
        className="shrink-0"
      />
      {/* Yanlara nabız halkası kadar (0.75rem) taşar: tarihçedeki halka kesilmesin */}
      <FadeScroll ref={scroller} fill={fill} className="-mx-3 px-3">
        <AnimatePresence
          mode="wait"
          initial={false}
          custom={seen.dir}
          onExitComplete={() => scroller.current?.scrollTo({ top: 0 })}
        >
          <MotionFlex
            key={tab}
            aria-label={TABS.find((t) => t.key === tab)?.label}
            role="region"
            custom={seen.dir}
            variants={tabVariants(enter, exit)}
            initial="enter"
            animate="center"
            exit="exit"
            className="block pt-4"
          >
            {panes[tab]}
          </MotionFlex>
        </AnimatePresence>
      </FadeScroll>
    </Flex>
  )
}

const TABS: { key: SideTab; label: string }[] = [
  { key: 'props', label: 'Özellikler' },
  { key: 'history', label: 'Tarihçe' },
]

/**
 * Kartın içindeki kaydırma alanı. İçerik taşınca kenarları solarak biter: kaydırılmış üst kenar ve
 * daha aşağısı olan alt kenar (CSS maskesi; zemin renginden bağımsız, kart stili ne olursa olsun).
 * Maskeyi kaydırmaya bağlı MotionValue'lar sürer (`useScroll`): React çizmez. Tema paneli ›
 * Kaydırma gölgesi kapalıysa maske yok. `fill`: kalan boyu doldurur; değilse (telefon) en çok 27.5rem.
 */
function FadeScroll({
  ref,
  fill,
  className,
  children,
}: {
  ref?: Ref<HTMLElement>
  fill: boolean
  className?: string
  children: ReactNode
}) {
  const { scrollShadow } = useLook()
  const box = useRef<HTMLElement | null>(null)
  const content = useRef<HTMLElement | null>(null)
  const attach = useCallback(
    (el: HTMLElement | null) => {
      box.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )

  // Üst kenar: kaydırıldıkça (ilk 32px'te) 24px'e kadar solar; alt kenar: kalan kaydırma kadar
  const { scrollY } = useScroll({ container: box })
  const top = useTransform(scrollY, [0, 32], [0, 24])
  const bottom = useMotionValue(0)
  const measure = useCallback(() => {
    const el = box.current
    if (!el) return
    const rest = el.scrollHeight - el.clientHeight - el.scrollTop
    bottom.set(Math.min(24, Math.max(0, rest) * 0.75))
  }, [bottom])
  useMotionValueEvent(scrollY, 'change', measure)
  // İçerik ya da kart boyu değişince (sekme, doküman uyarısı, pencere) alt kenar yeniden ölçülür
  useEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (box.current) ro.observe(box.current)
    if (content.current) ro.observe(content.current)
    return () => ro.disconnect()
  }, [measure])
  const mask = useMotionTemplate`linear-gradient(to bottom, transparent, #000 ${top}px, #000 calc(100% - ${bottom}px), transparent)`

  return (
    <MotionFlex
      ref={attach}
      vertical
      style={scrollShadow ? { maskImage: mask } : undefined}
      className={cn(
        'overflow-y-auto overscroll-contain',
        fill ? 'min-h-0 flex-1' : 'max-h-[27.5rem]',
        className,
      )}
    >
      <Flex ref={content} vertical className="shrink-0">
        {children}
      </Flex>
    </MotionFlex>
  )
}
