import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import {
  AnimatePresence,
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
import { flushSync } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { Files, History, Info, PanelRightClose, PanelRightOpen, PanelTopClose } from 'lucide-react'
import { Button, Card, Divider, Flex, Typography } from 'antd'
import { DOCUMENT_LABELS } from '@/synergy/shared/workflowData'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { useLook } from '@/synergy/shared/themeSettings'
import { useTransition } from '@/synergy/motion'
import { CARD, cn, IC, MotionFlex, Tip } from '@/synergy/ant/ui'
import { SHEET_ON_SURFACE, STRIP_VARS } from '@/synergy/tabs/shape'
import { Tab, TabButton, TabGroup, TabStrip } from '@/synergy/tabs/TabStrip'

/* -------------------------------------------------------------------------------------------------
 * Talep ayrıntısının yan bilgileri: üstte Özellikler / Tarihçe kartı, altında bağımsız Dokümanlar
 * sekmeli kart. Yerleşim pencereye değil formun bölmesinin (sayfa ya da yan yana bölme) genişliğine
 * göre seçilir:
 * - Sütun (bölme en az 52rem): formun sağında üçte bir; kaydırırken yapışık kalır, ekrana sığmazsa
 *   kendi içinde kayar. Katlanınca dar bir rafa iner; tercih saklanır.
 * - Sayfa (daha dar bölme; ör. yan yana bölünen form ya da panel boyutu 1 olan child): raf yok, form
 *   tam genişlikte. Formun başlığındaki (ve kaydırınca şeritteki) bilgi düğmesi (DetailPage.tsx)
 *   kartları form kartının yerini alan, yukarıdan aşağı açılan bir sayfada gösterir: form kartı
 *   gizlenir (bağlı kalır, girilen değerler gitmez), arkada kayan bir şey kalmaz. Düğmeyle, sayfadaki
 *   kapatma düğmesiyle, Esc ile ya da formda bir şey gösterilince kapanır; form kaldığı kaydırma
 *   yerine döner. Her açılışta kapalı başlar.
 * - Telefon: kartlar formun altında, katlama yok.
 * ------------------------------------------------------------------------------------------------- */

export type SideTab = 'props' | 'history' | 'docs'
/** Raftan açılan yer: kartın bir sekmesi. */
export type SideTarget = SideTab

type Mode = 'stack' | 'column' | 'sheet'

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
  '[--fill-h:inherit] [--view-h:inherit] h-[min(calc(var(--fill-h,100dvh)+var(--scrolled,0px)),calc(var(--view-h,100dvh)-var(--chrome-top,0px)-var(--spacing)*22-1rem))]'

/** Kabın boyları kalıtılmaz (`src/index.css`): sütun kartların kabına aktarır. */
const PASS_FILL = '[--fill-h:inherit] [--view-h:inherit]'

const RAIL: { id: SideTarget; label: string; icon: LucideIcon }[] = [
  { id: 'history', label: 'Tarihçe', icon: History },
  { id: 'docs', label: DOCUMENT_LABELS.title, icon: Files },
  { id: 'props', label: 'Özellikler', icon: Info },
]

/** Dar bölmedeki bilgi düğmesinin adı (başlıkta ve şeritte; DetailPage.tsx). */
export const SIDE_LABEL = `${DOCUMENT_LABELS.title}, Özellikler ve Tarihçe`

export interface SideState {
  mode: Mode
  open: boolean
  /** `from`: sayfayı açan öğe (kapanınca odak ona döner; yoksa o anki odak). */
  setOpen: (open: boolean, from?: HTMLElement) => void
  /** Sayfayı açan öğe (bilgi düğmesi). */
  opener: RefObject<HTMLElement | null>
  /** Sayfa açıksa kapatır (formda bir şey gösterilince). */
  dismiss: () => void
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
): [SideState, (el: HTMLElement | null) => (() => void) | undefined] {
  const phone = useMediaQuery('(max-width: 639px)')
  const [roomy, setRoomy] = useState(true)
  // Kabın genişliği ve ekranın boyu boyut gözlemcisinde (düzen hazırken) ölçülür: form iskeletten
  // çıkınca ne düzeni zorlar ne de (yerleşim değişmedikçe) formu yeniden çizer. Ekranın boyu kaba
  // doğrudan yazılır (`--view-h`, yapışkan yan sütun); yerleşim değişirse boyamadan önce çizilir
  // (yanlış yerleşim bir kare görünmesin)
  const attach = useCallback(
    (box: HTMLElement | null) => {
      if (!box) return
      const measure = () => {
        // Gizli bölmede kutu yok: yerleşim olduğu gibi kalır
        if (!box.getClientRects().length) return
        // Tema paneli › Ölçek kök yazı boyunu değiştirir: rem her ölçümde yeniden okunur
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
        const view = scroller ? scroller.clientHeight : window.innerHeight
        box.style.setProperty('--view-h', `${view}px`)
        const next = box.clientWidth >= COLUMN_MIN * rem
        flushSync(() => setRoomy(next))
      }
      const ro = new ResizeObserver(measure)
      ro.observe(box)
      if (scroller) ro.observe(scroller)
      window.addEventListener('resize', measure)
      return () => {
        ro.disconnect()
        window.removeEventListener('resize', measure)
      }
    },
    [scroller],
  )

  const mode: Mode = phone ? 'stack' : roomy ? 'column' : 'sheet'
  const [folded, setFolded] = useState(loadFolded)
  const [sheet, setSheet] = useState(false)
  // Bölme genişleyip sayfa yerleşiminden çıkınca sayfa kapanır (geri daralınca kapalı başlar)
  if (sheet && mode !== 'sheet') setSheet(false)
  const opener = useRef<HTMLElement | null>(null)
  const open = mode === 'stack' || (mode === 'column' ? !folded : sheet)

  // Sayfa açıkken form gizli, kap kısalır ve kaydırma başa döner: formun kaydırma yeri açılırken
  // saklanır, kapanınca (form yeniden yerinde, boyamadan önce) geri gelir
  const saved = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (sheet || saved.current === null) return
    const top = saved.current
    saved.current = null
    ;(scroller ?? window).scrollTo({ top })
  }, [sheet, scroller])

  // Sayfa Esc ile kapanır
  useEffect(() => {
    if (mode !== 'sheet' || !sheet) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, sheet])

  const state: SideState = {
    mode,
    open,
    setOpen: (v, from) => {
      if (mode === 'sheet') {
        // Tıklanan düğme her tarayıcıda odak almaz (Safari): açan öğe açıkça saklanır
        if (v && !sheet) {
          const active = document.activeElement
          opener.current = from ?? (active instanceof HTMLElement ? active : null)
          saved.current = scroller ? scroller.scrollTop : window.scrollY
        }
        setSheet(v)
      }
      if (mode !== 'column') return
      setFolded(!v)
      try {
        localStorage.setItem(SIDE_KEY, v ? '1' : '0')
      } catch {
        // Depolama kapalıysa tercih yalnızca bu oturumda
      }
    },
    opener,
    dismiss: () => setSheet(false),
    scroller,
  }
  return [state, attach]
}

/* --- Hareket ------------------------------------------------------------------------------------ */

/** Kartlar raftan (sağdan) ya da sayfada yukarıdan kısa kayıp belirir; kap sırayı yönetir (`stagger`). */
const cardVariants = (enter: Transition, exit: Transition, sheet: boolean): Variants => ({
  hidden: { opacity: 0, ...(sheet ? { y: -16 } : { x: 24 }), transition: exit },
  shown: { opacity: 1, x: 0, y: 0, transition: enter },
})

/**
 * Sayfanın perdesi: alt kenarı üstten aşağı iner. Kenarlar (açıkken alt kenar da) kutudan %10 taşar:
 * kartların halkası ve gölgesi kesilmez. Tek birim (%): Motion ara değerleri hesaplayabilsin.
 */
const WIPE_HIDDEN = 'inset(-10% -10% 100% -10%)'
const WIPE_SHOWN = 'inset(-10% -10% -10% -10%)'

/**
 * Kartların kabı: girişte kartlar sırayla (önce Özellikler / Tarihçe), çıkışta ters sırayla. Sayfada kabın
 * kendisi (tepsi) de belirir ve yukarıdan aşağı açılır (perde; "Az"da yalnızca solma: `clipPath`
 * dönüşüm değil, MotionConfig kapatmaz).
 */
function useStack(sheet: boolean) {
  const { motion: level, speed, anim } = useLook()
  const enter = useTransition({ duration: 0.36, ease: [0.22, 1, 0.36, 1] })
  const exit = useTransition({ duration: 0.16, ease: [0.4, 0, 1, 1] })
  const off = level === 'off'
  // Perde açılışı bir kayma: tema paneli › Animasyon › Kayma ve büyüme
  const wipe = sheet && anim.movement
  const stack: Variants = {
    hidden: {
      ...(sheet && { opacity: 0 }),
      ...(wipe && { clipPath: WIPE_HIDDEN }),
      transition: { ...exit, delayChildren: off ? 0 : stagger(0.04 / speed, { from: 'last' }) },
    },
    shown: {
      ...(sheet && { opacity: 1 }),
      ...(wipe && { clipPath: WIPE_SHOWN }),
      transition: { ...enter, delayChildren: off ? 0 : stagger(0.07 / speed) },
    },
  }
  return { stack, card: cardVariants(enter, exit, sheet), fade: enter }
}

/** Sekme içeriği: değişimin yönünden gelir, ters yöne kısa çıkar (`mode="wait"`). */
const tabVariants = (enter: Transition, exit: Transition): Variants => ({
  enter: (dir: number) => ({ opacity: 0, x: dir * 16 }),
  center: { opacity: 1, x: 0, transition: enter },
  exit: (dir: number) => ({ opacity: 0, x: dir * -12, transition: exit }),
})

/** Katlama / açma / kapatma düğmesi: çıplak simge, üzerine gelince yüzey rengi. Rafta ve şeridin ucunda aynı. */
const FOLD_BUTTON = 'text-muted hover:bg-surface-secondary! hover:text-foreground!'

/* --- Alta ayrılan sekme ------------------------------------------------------------------------- */

/**
 * Bir sekme tutulup aşağı bırakılınca kart ikiye bölünür: o sekme altta kendi şeridi ve kartıyla
 * durur, üstteki kartta kalan sekmeler; ikisi aynı anda görünür. Tercih tarayıcıda saklanır ve
 * bütün talep ekranlarında ortaktır. Alttaki sekme yukarı bırakılınca birleşir.
 */
const SPLIT_KEY = 'synergy.side.split'
let split: SideTab | null = loadSplit()
const splitListeners = new Set<() => void>()
function loadSplit(): SideTab | null {
  try {
    const v = localStorage.getItem(SPLIT_KEY)
    return v === 'props' || v === 'history' || v === 'docs' ? v : null
  } catch {
    return null
  }
}
function setSplit(v: SideTab | null) {
  if (v === split) return
  split = v
  try {
    if (v) localStorage.setItem(SPLIT_KEY, v)
    else localStorage.removeItem(SPLIT_KEY)
  } catch {
    // Depolama kapalıysa tercih yalnızca bu oturumda
  }
  for (const l of splitListeners) l()
}
function subscribeSplit(l: () => void) {
  splitListeners.add(l)
  return () => {
    splitListeners.delete(l)
  }
}
const getSplit = () => split
function useSideSplit() {
  return useSyncExternalStore(subscribeSplit, getSplit, getSplit)
}

/** Sürüklenen sekme: hangi karttan tutuldu, imlecin altındaki yarı. */
interface Tear {
  key: SideTab
  label: string
  from: 'top' | 'bottom'
}
type Zone = 'top' | 'bottom' | null

/** Sürükleme bu kadar dikey yol alınca başlar (yatayı aşmalı: yatay hareket sekme seçimi değildir). */
const TEAR_THRESHOLD = 14

/**
 * Sekmeyi tutup aşağı / yukarı taşıma. Hayalet (sekmenin yaprağı gibi bir kutu) imleci izler
 * (MotionValue: React çizmez); imlecin bulunduğu yarı (`zone`) değişince ve başlarken / biterken
 * çizilir. Bırakınca: üstten alta → o sekme ayrılır, alttan üste → birleşir.
 */
function useTear(box: RefObject<HTMLElement | null>, onDrop: (tear: Tear, zone: Zone) => void) {
  const [tear, setTear] = useState<Tear | null>(null)
  const [zone, setZone] = useState<Zone>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const session = useRef<{
    id: number
    tear: Tear
    startX: number
    startY: number
    rect: DOMRect
    started: boolean
    zone: Zone
  } | null>(null)
  const latest = useRef(onDrop)
  latest.current = onDrop

  const start = useCallback(
    (e: ReactPointerEvent<HTMLElement>, t: Tear) => {
      const el = box.current
      if (e.button !== 0 || e.pointerType === 'touch' || session.current || !el) return
      const d = {
        id: e.pointerId,
        tear: t,
        startX: e.clientX,
        startY: e.clientY,
        rect: el.getBoundingClientRect(),
        started: false,
        zone: null as Zone,
      }
      session.current = d
      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== d.id) return
        const dx = ev.clientX - d.startX
        const dy = ev.clientY - d.startY
        if (!d.started) {
          if (Math.abs(dy) < TEAR_THRESHOLD || Math.abs(dy) < Math.abs(dx)) return
          d.started = true
          d.rect = el.getBoundingClientRect()
          setTear(d.tear)
        }
        // Hayalet imlecin solunda / üstünde biter: tutulan yerden taşınıyor gibi
        x.set(ev.clientX - d.rect.left - 48)
        y.set(ev.clientY - d.rect.top - 20)
        const half = d.rect.top + d.rect.height / 2
        const inside =
          ev.clientX >= d.rect.left - 40 &&
          ev.clientX <= d.rect.right + 40 &&
          ev.clientY >= d.rect.top - 40 &&
          ev.clientY <= d.rect.bottom + 40
        const z: Zone = !inside ? null : ev.clientY > half ? 'bottom' : 'top'
        if (z !== d.zone) {
          d.zone = z
          setZone(z)
        }
      }
      const end = (ev: PointerEvent) => {
        if (ev.pointerId !== d.id) return
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', end)
        window.removeEventListener('pointercancel', end)
        session.current = null
        if (!d.started) return
        setTear(null)
        setZone(null)
        if (ev.type === 'pointerup') latest.current(d.tear, d.zone)
        // Sürüklemenin sonundaki tıklama sekmeyi seçmesin
        const stop = (c: Event) => {
          c.stopPropagation()
          c.preventDefault()
        }
        el.addEventListener('click', stop, { capture: true, once: true })
        setTimeout(() => el.removeEventListener('click', stop, { capture: true }))
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', end)
      window.addEventListener('pointercancel', end)
    },
    [box, x, y],
  )
  return { tear, zone, x, y, start }
}

/* --- Yan bilgiler -------------------------------------------------------------------------------- */

/**
 * Yan bilgiler: Dokümanlar kartı ve Özellikler / Tarihçe kartı; yerleşime göre sütun, form kartını
 * örten sayfa ya da formun altında. Formla aynı kabın (`useSidePanel` ile ölçülen) çocuğudur.
 * Sütunda ve sayfada üstte Özellikler / Tarihçe (kalan boy), altta Dokümanlar (içeriği kadar, en
 * çok %45); taşan içerik kartın içinde kayar.
 *
 * Hareket (Motion): sütun açılınca kartlar sırayla raftan kayarak gelir, katlanınca ters sırayla
 * çıkar (`AnimatePresence`, `stagger`); sütunun genişliği tek adımda değişir, form kartı Motion düzen
 * animasyonuyla daralır / genişler (DetailPage.tsx). Sayfa yukarıdan aşağı açılır, kartlar
 * yukarıdan sırayla gelir; kapanırken tersi. Sekmeler arasında alt çizgi kayar (`layoutId`),
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
  historyFooter,
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
  /** Tarihçe kartının altında sabit duran satır (Tüm Tarihçeyi Göster ve seçenekler). */
  historyFooter?: ReactNode
}) {
  const { mode, open, setOpen } = side
  // Kaydırma miktarı CSS değişkeninde (`FILL`): sütun yapışana kadar kaydırılan kadar uzar, alt
  // kenarı ekranın altında kalır. MotionValue: React çizmez
  const container = useMemo(() => ({ current: side.scroller }), [side.scroller])
  const { scrollY } = useScroll(side.scroller ? { container } : undefined)
  const sticky = { '--scrolled': useMotionTemplate`${scrollY}px` } as MotionStyle
  const foldLabel = 'Paneli katla'
  const { stack: stackVariants, card, fade } = useStack(mode === 'sheet')

  // Sayfa açılınca odak kapatma düğmesine geçer; kapanınca (odak sayfadaysa) açan öğeye döner. Açan
  // öğe kalktıysa (şeritteki düğme: sayfa açılınca kaydırma başa döner, şerit gizlenir) formun bilgi
  // düğmesine (`data-side-opener`, görünümün kabında: `data-side-scope`)
  const sheetBox = useRef<HTMLElement | null>(null)
  const sheetOpen = mode === 'sheet' && open
  const { opener } = side
  useEffect(() => {
    // Sayfa bu çizimde kuruldu (bağı bağlı); kapanırken çıkış animasyonu boyunca yerinde kalır
    const box = sheetBox.current
    // Açan öğe açılırken saklandı (`setOpen`), bu çizimden önce
    const back = opener.current
    if (!sheetOpen || !box) return
    const frame = requestAnimationFrame(() =>
      box.querySelector<HTMLElement>('[data-sheet-close]')?.focus({ preventScroll: true }),
    )
    return () => {
      cancelAnimationFrame(frame)
      const lost = document.activeElement
      if (lost !== document.body && !box.contains(lost)) return
      const target = back?.isConnected
        ? back
        : box.closest('[data-side-scope]')?.querySelector<HTMLElement>('[data-side-opener]')
      target?.focus({ preventScroll: true })
    }
  }, [sheetOpen, opener])

  // Sütunda katlama (şeridin sağ ucundaki köşe boşluğunda, kartın köşesinin üstünde), sayfada
  // kapatma
  const control =
    mode === 'column' ? (
      <Tip label={foldLabel} placement="bottom">
        <Button
          type="text"
          aria-label={foldLabel}
          aria-expanded
          icon={<PanelRightClose {...IC} size={18} />}
          onClick={() => setOpen(false)}
          className={FOLD_BUTTON}
        />
      </Tip>
    ) : mode === 'sheet' ? (
      <Tip label="Paneli kapat" placement="bottom">
        <Button
          type="text"
          aria-label="Paneli kapat"
          data-sheet-close
          icon={<PanelTopClose {...IC} size={18} />}
          onClick={() => setOpen(false)}
          className={FOLD_BUTTON}
        />
      </Tip>
    ) : undefined

  // Bir sekme alta ayrılmış olabilir (`useSideSplit`): üstte kalan sekmelerin kartı, altta onun kartı.
  // Üstte seçili sekme ayrılan sekmeyse yerine ilk kalan
  const splitTab = useSideSplit()
  const topTabs = TABS.filter((t) => t.key !== splitTab)
  const bottom = TABS.find((t) => t.key === splitTab)
  const topTab = tab === splitTab ? topTabs[0].key : tab
  const box = useRef<HTMLElement | null>(null)
  const { tear, zone, x, y, start } = useTear(box, (t, z) => {
    if (t.from === 'top' && z === 'bottom') {
      setSplit(t.key)
      if (tab === t.key) onTab(topTabs.find((o) => o.key !== t.key)?.key ?? t.key)
    } else if (t.from === 'bottom' && z === 'top') {
      setSplit(null)
      onTab(t.key)
    }
  })
  // Sürüklemeyle aynı iş sağ tık menüsünden de (dokunmatik, klavye)
  const tearMenu = (key: SideTab, from: 'top' | 'bottom') => [
    from === 'top'
      ? { key: 'split', label: 'Alta ayır', onClick: () => setSplit(key) }
      : {
          key: 'join',
          label: 'Üste birleştir',
          onClick: () => {
            setSplit(null)
            onTab(key)
          },
        },
  ]

  // Üstte kalan sekmelerin kartı ve (ayrılmışsa) alttaki sekmenin kartı; `fill` (sütun, sayfa): kabı
  // doldurur, ikisi yarı yarıya, içleri kayar; telefonda doğal boy. Zorunlu doküman uyarısı
  // Dokümanlar'ın bulunduğu kartı sallar (sekmesi seçilir)
  const cards = (fill: boolean) => (
    <MotionFlex
      ref={box}
      variants={card}
      vertical
      className={cn('relative gap-3', fill ? 'flex min-h-0 flex-1 basis-0 flex-col' : 'shrink-0')}
    >
      <SideTabs
        tabs={topTabs}
        tab={topTab}
        onTab={onTab}
        panes={{ props, history, docs }}
        footers={{ history: historyFooter }}
        fill={fill}
        extra={control}
        warning={warning && splitTab !== 'docs'}
        tearing={tear?.from === 'top' ? tear.key : null}
        onTear={(e, key, label) => start(e, { key, label, from: 'top' })}
        menu={(key) => tearMenu(key, 'top')}
      />
      {bottom && (
        <SideTabs
          tabs={[bottom]}
          tab={bottom.key}
          onTab={() => {}}
          sizing="content"
          panes={{ props, history, docs }}
          footers={{ history: historyFooter }}
          fill={fill}
          warning={warning && splitTab === 'docs'}
          tearing={tear?.from === 'bottom' ? tear.key : null}
          onTear={(e, key, label) => start(e, { key, label, from: 'bottom' })}
          menu={(key) => tearMenu(key, 'bottom')}
        />
      )}
      {/* Bırakma alanı: tutulan sekmenin gideceği yarı; imleç oradayken belirgin */}
      {tear && (
        <Flex
          className={cn(
            'pointer-events-none absolute inset-x-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed transition-colors',
            tear.from === 'top' ? 'top-1/2 bottom-0 mt-1.5' : 'top-0 bottom-1/2 mb-1.5',
            zone === (tear.from === 'top' ? 'bottom' : 'top')
              ? 'border-accent bg-accent/10'
              : 'border-border bg-surface/60',
          )}
        >
          <Typography.Text className="font-medium text-muted">
            {tear.from === 'top' ? 'Alta ayır' : 'Üste birleştir'}
          </Typography.Text>
        </Flex>
      )}
      {/* Hayalet: sekmenin yaprağı gibi bir kutu imleci izler */}
      {tear && (
        <MotionFlex
          aria-hidden
          style={{ x, y }}
          className={cn(
            STRIP_VARS,
            'pointer-events-none absolute start-0 top-0 z-30 flex h-(--tab-h) items-center rounded-t-(--tab-r) bg-surface px-6 font-medium text-accent-soft-foreground shadow-overlay ring-1 ring-border',
          )}
        >
          {tear.label}
        </MotionFlex>
      )}
    </MotionFlex>
  )

  if (mode === 'stack')
    return (
      <Flex vertical gap={12}>
        {cards(false)}
      </Flex>
    )

  // Raf: katlı sütun; ikonlar kartları / sekmeleri açar
  const rail = (
    <Card
      className={cn(CARD, 'w-14 shrink-0', warning && !open && 'ring-2 ring-warning')}
      classNames={{ body: 'flex flex-col items-center gap-1 p-2' }}
    >
      <Tip label="Paneli aç" placement="left">
        <Button
          type="text"
          aria-label="Paneli aç"
          aria-expanded={false}
          icon={<PanelRightOpen {...IC} size={18} />}
          onClick={() => setOpen(true)}
          className={FOLD_BUTTON}
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

  // Kartların kabı (boyu çağırandan; kartlar yarı yarıya); kartlar sırayla gelir / gider
  const stack = (key: string, className: string, label?: string, ref?: Ref<HTMLElement>) => (
    <MotionFlex
      key={key}
      ref={ref}
      vertical
      role={label ? 'dialog' : undefined}
      aria-label={label}
      variants={stackVariants}
      initial="hidden"
      animate="shown"
      exit="hidden"
      className={cn('gap-3', className)}
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
          PASS_FILL,
          'z-10 shrink-0 self-start',
          open ? 'w-[calc((100%-0.75rem)/3)]' : 'w-14',
        )}
      >
        <AnimatePresence initial={false} mode="popLayout" anchorX="right">
          {open ? (
            stack('cards', cn(FILL, 'w-full'))
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

  // Sayfa: form kartının yerini alır (form kartı gizli, DetailPage.tsx), kabın kalanını doldurur
  // (`--fill-h`; çok kısa ekranda en az 24rem); kartlar yarı yarıya, içleri kayar. Kapanırken akıştan
  // çıkar (`popLayout`: bento `relative`) ve yeniden beliren formun üstünde yukarı toplanır
  return (
    <AnimatePresence mode="popLayout">
      {open &&
        stack(
          'sheet',
          'h-(--fill-h) min-h-96 min-w-0 flex-1 [--fill-h:inherit]',
          'Yan bilgiler',
          sheetBox,
        )}
    </AnimatePresence>
  )
}

/**
 * Özellikler / Tarihçe: ortak sekme şeridi (`tabs/`), kartın üstünde; seçili yaprak karta kaynaşır. İçerik değişimin yönünden gelir, eskisi önce kısa çıkar (`mode="wait"`: kart
 * sabit boylu, iki içerik üst üste binmez); yeni içerik baştan başlar.
 */
function SideTabs({
  tabs,
  tab,
  onTab,
  sizing = 'fill',
  panes,
  footers,
  fill,
  extra,
  warning = false,
  tearing,
  onTear,
  menu,
}: {
  /** Bu kartın sekmeleri (alta ayrılan sekme kendi kartında tek başına). */
  tabs: { key: SideTab; label: string }[]
  tab: SideTab
  onTab: (tab: SideTab) => void
  sizing?: 'fill' | 'content'
  panes: Record<SideTab, ReactNode>
  /** Sekmenin altında, kayan alanın dışında sabit duran satır. */
  footers?: Partial<Record<SideTab, ReactNode>>
  fill: boolean
  /** Şeridin ucunda (sütunu katlama / sayfayı kapatma düğmesi). */
  extra?: ReactNode
  /** Zorunlu dokümanlar görülmedi: kart sallanır, uyarı halkası. */
  warning?: boolean
  /** Şu an tutulup taşınan sekme (soluk). */
  tearing?: SideTab | null
  /** Sekmeye basıldı: aşağı / yukarı taşıma başlayabilir (`useTear`). */
  onTear?: (e: ReactPointerEvent<HTMLElement>, key: SideTab, label: string) => void
  /** Sekmenin sağ tık menüsü (Alta ayır / Üste birleştir). */
  menu?: (key: SideTab) => { key: string; label: string; onClick: () => void }[]
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

  const panelId = useId()
  return (
    <Flex vertical className={cn(fill ? 'flex min-h-0 flex-1 basis-0 flex-col' : 'shrink-0')}>
      {/* Ortak sekme şeridi, kartın üstünde (Başlangıç kategorileri gibi): seçili yaprak kartla aynı
          yüzeyde, kartın konturu kavisler boyunca kartın üst çizgisine iner (`SHEET_ON_SURFACE`).
          Katlama / kapatma düğmesi şeridin kaymayan ucunda */}
      <TabStrip
        label="Yan bilgiler"
        selected={tab}
        sizing={sizing}
        sheet={SHEET_ON_SURFACE}
        inset="px-[calc(min(32px*var(--corner-scale,1),var(--radius)*3)+var(--tab-f))]"
        className="relative z-1 shrink-0 [--tab-h:2.75rem]"
        end={
          // Şeridin sağ ucundaki köşe boşluğunun (`inset`) ortasında, sekmelerin hizasında
          extra && (
            <Flex className="absolute inset-y-0 end-0 flex w-[calc(min(32px*var(--corner-scale,1),var(--radius)*3)+var(--tab-f))] items-center justify-center pb-(--tab-gap)">
              {extra}
            </Flex>
          )
        }
      >
        <TabGroup id="side">
          {tabs.map(({ key, label }) => (
            <Tab
              key={key}
              id={key}
              selected={key === tab}
              menu={menu && (() => menu(key))}
              className={cn(tearing === key && 'opacity-40')}
            >
              <TabButton
                label={label}
                current={key === tab}
                role="tab"
                aria-selected={key === tab}
                aria-controls={panelId}
                tabIndex={key === tab ? 0 : -1}
                onClick={() => onTab(key)}
                onPointerDown={(e) => onTear?.(e, key, label)}
                className={cn('justify-center', sizing === 'fill' ? 'flex-1' : 'px-6')}
              />
            </Tab>
          ))}
        </TabGroup>
      </TabStrip>
      <Card
        id={panelId}
        role="tabpanel"
        aria-label={TABS.find((t) => t.key === tab)?.label}
        className={cn(
          CARD,
          fill ? 'flex min-h-0 flex-1 flex-col' : 'shrink-0',
          warning && 'animate-shake ring-2 ring-warning',
        )}
        classNames={{ body: cn('flex flex-col p-6 pt-5', fill && 'min-h-0 flex-1') }}
      >
        {/* Yanlara nabız halkası kadar (1rem) taşar: tarihçedeki halka kesilmesin */}
        <FadeScroll ref={scroller} fill={fill} className="-mx-4 px-4">
          <AnimatePresence
            mode="wait"
            initial={false}
            custom={seen.dir}
            onExitComplete={() => scroller.current?.scrollTo({ top: 0 })}
          >
            <MotionFlex
              key={tab}
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
        {/* Sekmenin sabit alt satırı (Tarihçe: Tüm Tarihçeyi Göster ve seçenekler) */}
        {footers?.[tab] && <Flex className="block shrink-0 pt-3">{footers[tab]}</Flex>}
      </Card>
    </Flex>
  )
}

const TABS: { key: SideTab; label: string }[] = [
  { key: 'history', label: 'Tarihçe' },
  { key: 'docs', label: DOCUMENT_LABELS.title },
  { key: 'props', label: 'Özellikler' },
]

/**
 * Kartın içindeki kaydırma alanı. İçerik taşınca kenarları solarak biter: kaydırılmış üst kenar ve
 * daha aşağısı olan alt kenar (CSS maskesi; zemin renginden bağımsız, kart stili ne olursa olsun).
 * Maskeyi kaydırmaya bağlı MotionValue'lar sürer (`useScroll`): React çizmez. `fill`: kalan boyu
 * doldurur; değilse (telefon) en çok 27.5rem.
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
  // İlk ölçüm gözlemcinin ilk bildiriminde (düzen hazırken): takılınca hemen okumak düzeni zorlardı
  useEffect(() => {
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
      style={{ maskImage: mask }}
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
