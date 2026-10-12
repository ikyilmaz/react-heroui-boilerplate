import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router'
import { usePlace } from '@/synergy/tabs/context'
import {
  AnimatePresence,
  animate,
  useMotionValue,
  usePresence,
  useTransform,
  type Transition,
} from 'framer-motion'
import {
  Activity,
  ArrowDownAZ,
  ChevronRight,
  FolderArchive,
  FolderOpen,
  LayoutDashboard,
  LayoutGrid,
  ListOrdered,
  Megaphone,
  Moon,
  Palette,
  Search,
  Star,
  Sun,
  UserCheck,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, Button, Card, Flex, Typography } from 'antd'
import { togglePin, useBoxCounts, useBoxRequests, useMenuApps } from '@/synergy/shared/decisions'
import {
  MENU_LABELS,
  MENU_TREE,
  filterTree,
  sortTree,
  type MenuNode,
  type MenuSort,
} from '@/synergy/shared/menuTree'
import { readJson, writeJson } from '@/synergy/shared/grid'
import { useRemembered } from '@/synergy/shared/remembered'
import { setColorMode, useIsDark } from '@/synergy/shared/themeSettings'
import {
  CURRENT_USER,
  HISTORY_GROUP_LABEL,
  APPS_LABELS,
  findApp,
  findBox,
  greetingOf,
  historyBoxes,
  initials,
  mainBoxes,
  processCaption,
  processGroups,
  relative,
  type BoxId,
  type MenuApp,
} from '@/synergy/shared/workflowData'
import { Highlight, SORT_KEY } from '@/synergy/AllApps'
import { useTransition } from '@/synergy/motion'
import { EmptyNote, SearchField, useBand } from '@/synergy/ant/parts'
import { CARD, CARD_RADIUS, IC, MotionFlex, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { useRadiusPx } from '@/synergy/shared/hooks'
import { boxLink, k, processLink, useOpenApp } from '@/synergy/paths'
import { SHEET } from '@/synergy/tabs/shape'
import { Tab, TabButton, TabGroup, TabStrip } from '@/synergy/tabs/TabStrip'
import { Count } from '@/synergy/ant/motion'
import { START_LABELS as START_PAGE, defaultSortOf } from '@/synergy/shared/startLabels'
import {
  DOC_LABELS,
  favoriteDocuments,
  recentDocuments,
  recentRepositories,
} from '@/synergy/shared/documents'
import {
  START_MOCK_LABELS,
  activities,
  adminTools,
  announcements,
  delegationState,
  formatDay,
  givenDelegations,
  receivedDelegations,
  type Delegation,
} from '@/synergy/shared/startMock'

/*
 * Yüzen raf ve başlat kutusu (solda, dikeyde ortada; ya da üstte).
 *
 * Rafın tepesindeki arama düğmesine basınca rafın tamamı, paylaşılan yerleşim (`layoutId`)
 * geçişiyle sabit boylu bir kutuya dönüşür (clamp(30rem, 70dvh, 42rem)) (Windows'un başlat menüsü gibi). Kutuda:
 * arama (tüm bölümleri süzer), duyurular / sohbet, Favoriler, İş Akış Yönetimi (Başlangıç'taki İş
 * Akışları widget'ı: kategoriler, süreç grupları ↔ talepler), Görünüm (tema ayarları, açık / koyu
 * tema) ve tüm uygulamalar ağacı. Gezinme üstteyken kutu ekranın %55'i genişliğinde (en az 44rem).
 * Esc, dışarı tıklama, odağın dışarı çıkması ya da bir yere gitmek kutuyu kapatır; kutunun açtığı
 * pencereler (açılır menü, karar diyaloğu: `body`'deki portallar) dışarı sayılmaz. Kutu kapanırken
 * yine rafa dönüşür, odak arama düğmesine döner.
 */

export interface DockEntry {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  /** Seçili sayılacağı adres öneki. */
  match?: string
}

/** Başlat kutusunun dışarıdan açtıkları (kabukta duran paneller). */
export interface StartActions {
  onTheme: () => void
  onPanel: (panel: 'news' | 'chat') => void
}

const START_LABELS = {
  start: 'Başlat',
  overview: 'Genel bakış',
  apps: 'Uygulamalar', // 101882
  recent: 'Son Kullanılan Uygulamalar', // 102974
  pendingBox: 'Bekleyen Onaylar', // 102960
  news: 'Duyuruları Görüntüle',
  chat: 'Sohbet',
  favorites: 'Favoriler', // 100862
  workflow: 'İş Akış Yönetimi',
  view: 'Görünüm', // 100007
  themeSettings: 'Tema ayarları', // 102942
  light: 'Açık tema', // 100192
  dark: 'Koyu tema',
  noFavorites: 'Sabitlenmiş Uygulama Yok', // 102028
} as const

const { Text } = Typography

const fold = (v: string) => v.toLocaleLowerCase('tr')

/** Raf ve kutunun ortak yüzeyi (dönüşümde zemin değişmez). */
const SHELL = 'border border-border bg-surface shadow-(--overlay-shadow)'

/* --- Raf --------------------------------------------------------------------------------------- */

/**
 * Kabuğun yeri (tema paneli › Gezinme): solda sütun, üstte çubuk ya da kompakt (raf ve logo yok;
 * yalnızca başlat düğmesi, sekme satırının başında; içerik ekranın soluna kadar).
 */
export type ChromePlace = 'left' | 'top' | 'compact'

/** Kabuk sütun mu (solda). */
export const isColumn = (place: ChromePlace) => place === 'left'

/** Kabuktaki ipuçlarının yönü: içeriğe doğru. */
export const CHROME_TIP = { left: 'right', top: 'bottom', compact: 'bottom' } as const

/**
 * Rafın tek yayı: başlat dönüşümü ve raf boyunun değişmesi aynı yayla (ayrı zamanlamalar üst üste
 * binip sıçramasın).
 */
export const DOCK_SPRING: Transition = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }
/** Kapanışta başlat düğmesinin belirmesi: kutu yerine oturmaya yakın. */
const DOCK_BACK: Transition = { delay: 0.22, duration: 0.12 }

/**
 * Kabuk panellerinin ortak yüzeyi (raf). Köşe kartlarınki (`CARD_RADIUS`; tema
 * paneli › Köşe yuvarlaklığı): "Çok"ta raf tam hap, daha azında köşeli. Raf ve kutuda yarıçap
 * ayrıca px olarak stilde (paylaşılan geçişte framer yarıçapı ölçekte düzeltir); sınıf ilk ölçüme
 * kadar.
 */
export const CHROME_PANEL = cn(
  'pointer-events-auto rounded-[min(calc(32px*var(--corner-scale,1)),calc(var(--radius)*3))]',
  SHELL,
)
/**
 * Raf ve başlat kutusunun yüzeyi, kontursuz: kontur ve gölge ayrı bir halkada (`PANEL_RING`), içerik
 * gibi dönüşümün sonuna doğru belirir. Kutu düğmeden büyürken (Motion paylaşılan düzen: ölçek)
 * 1px kenarlık ve gölge halkası da ölçeklenip bitişte tam kalınlığa zıplıyordu.
 */
export const CHROME_SURFACE =
  'pointer-events-auto rounded-[min(calc(32px*var(--corner-scale,1)),calc(var(--radius)*3))] bg-surface'
const PANEL_RING =
  'pointer-events-none absolute inset-0 block rounded-[inherit] border border-border shadow-(--overlay-shadow)'

/** Sütun ve çubuk rafı: iç pay, başlat düğmesi (piksel: temanın boşluk ölçeği rafın oranını bozmasın). */
const COLUMN = {
  shell: 'flex-col items-center p-[6px]',
  // Başlat düğmesi rafla aynı ende (40px daire + 6px pay) ve aynı köşede (`radius`)
  start: 'size-[52px] min-w-[52px]',
  icon: 20,
}
/** Çubukta kompakt: 44px (36px daireler, 4px pay). */
const BAR = {
  shell: 'h-[44px] flex-row items-center p-[4px]',
  // Başlat düğmesi rafla aynı boyda (36px daire + 4px pay) ve aynı köşede
  start: 'size-[44px] min-w-[44px]',
  icon: 18,
}
/**
 * Yandaki kutu: dikeyde tam ortada (raf gibi; dönüşüm transform kullandığı için `my-auto` ile),
 * ekranın %85'i boyunda. Genişlik stilde (`PANEL_WIDTH`, bölüme göre animasyonla değişir); tavan
 * ekran.
 */
const SIDE_PANEL = 'inset-y-0 my-auto h-[85dvh] w-[min(44rem,calc(100vw-1.5rem))]'
/** Çubuktan açılan kutu: ortadan (`mx-auto`), genişlik ekrana oranla (en az 44rem). */
const BAR_PANEL =
  'inset-x-0 mx-auto h-[clamp(30rem,70dvh,42rem)] w-[min(max(44rem,55vw),calc(100vw-1.5rem))]'

/**
 * Kutunun genişliği: dar (varsayılan; üstte gezinmede ekranın %55'i, en az 44rem) ve geniş
 * (İş Akış Yönetimi / Doküman Yönetimi: beş karo ya da üç sütun yan yana; 58rem, üstte %72).
 */
/** Kutunun hedef genişliği px (kutu genişliğini kendi animasyonlar; tavan ekran − 1.5rem). */
function panelWidthPx(place: ChromePlace, wide: boolean) {
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const cap = window.innerWidth - 1.5 * fs
  if (place === 'top')
    return Math.min(Math.max(44 * fs, (wide ? 0.72 : 0.55) * window.innerWidth), cap)
  return Math.min((wide ? 58 : 44) * fs, cap)
}

/** Bir öğenin kutusu (px) ve köşesi: dönüşümün başladığı / bittiği yer. */
interface Box {
  x: number
  y: number
  w: number
  h: number
  r: number
}

/** Rafın içi, başlat düğmesi ve açılan kutunun konumu (kutu rafın olduğu kenardan açılır). */
const PLACE: Record<ChromePlace, { shell: string; start: string; icon: number; panel: string }> = {
  left: { ...COLUMN, panel: cn('start-3', SIDE_PANEL) },
  top: { ...BAR, panel: cn('top-3', BAR_PANEL) },
  // Kompakt: sekme satırındaki 40px düğmeden (satır 1.3 kat yüksek) sol üstte açılan kutu
  compact: {
    shell: '',
    start: 'size-[40px] min-w-[40px]',
    icon: 20,
    panel: 'start-3 top-3 h-[85dvh] w-[min(44rem,calc(100vw-1.5rem))]',
  },
}

/**
 * Kabuğun yanına düşen alan (px; içerik bu kadar içeriden başlar). Sütun 12px içeride, 52px; çubuk 12px
 * içeride, 44px; aradaki boşluk 12px.
 */
export const CHROME_SPACE: Record<ChromePlace, string> = {
  left: 'sm:ps-[76px] sm:pt-3',
  top: 'sm:ps-3 sm:pt-[68px]',
  // Kompakt: üstte yarısı (6px); alt pay da aynı (`Workspace` `tall`, kabuğun `pb`)
  compact: 'sm:ps-3 sm:pt-1.5',
}

/**
 * Başka yere gidilince (seçili sekme ya da yeri değişince) başlat kutusunu kapatır. Yalnızca kutu
 * açıkken takılı: sekme geçişlerinde yalnızca bu küçük parça yeniden çizilir.
 */
export function CloseOnPlace({ onChange }: { onChange: () => void }) {
  const place = usePlace()
  const opened = useRef(place)
  useEffect(() => {
    if (place !== opened.current) onChange()
  }, [place, onChange])
  return null
}

/**
 * Başlat kutusunun dönüşümü, elle: kutu takılınca kendi son yerini ölçer, başlat düğmesinin
 * kutusundan konum (`x` / `y`), genişlik, yükseklik, köşe yarıçapı ve zemin rengiyle (birincil →
 * yüzey) oraya gelir; kapanırken aynı yolu düğmeye doğru geri alır ve ancak sonra kalkar
 * (`usePresence`). Raf dönüşmez, yerinde kalır; düğme kutu açıkken gizli.
 * Motion'ın paylaşılan düzen geçişi (`layoutId`) yerine: o, ölçekle büyütüp çapraz solduruyordu —
 * 1px kenarlık ve gölge halkası ölçeklenip bitişte zıplıyor, köşeler yüzdeye çevriliyor, kapanırken
 * büyütülen raf sekme satırının katmanında kalıp geri / ileri düğmelerinin arkasından geçiyordu.
 * Genişlik ve yükseklik her karede yerleşim ister; içerik o sırada saydam, kutu kendi katmanında.
 * Bölüme göre genişleme (`wide`) de aynı genişlik değerinde, aynı yayla.
 */
function StartBox({
  place,
  from,
  anchor,
  wide,
  radiusPx,
  morph,
  iconSize,
  className,
  children,
  ...rest
}: {
  place: ChromePlace
  /** Açılışta başlanan kutu (başlat düğmesi ya da raf). */
  from: Box | null
  /** Başladığı ve kapanışta döneceği öğe: başlat düğmesi (hep takılı). */
  anchor: React.RefObject<HTMLElement | null>
  wide: boolean
  radiusPx: number | undefined
  morph: Transition
  /** Düğmenin ikon boyu: kutu düğmeye dönerken ortasında beliren ikon. */
  iconSize: number
  className?: string
  children: ReactNode
} & Pick<React.HTMLAttributes<HTMLElement>, 'onKeyDown' | 'onBlur' | 'role' | 'aria-label'>) {
  const [present, safeToRemove] = usePresence()
  const ref = useRef<HTMLElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const w = useMotionValue<number | string>('')
  const h = useMotionValue<number | string>('')
  const r = useMotionValue<number | string>(radiusPx ?? '')
  // Zemin: düğmenin birincil renginden kutunun yüzeyine (0 = yüzey, 1 = birincil); CSS karıştırır
  const mix = useMotionValue(0)
  const background = useTransform(
    mix,
    (v) => `color-mix(in oklab, var(--accent) ${Math.round(v * 100)}%, var(--surface))`,
  )
  const latest = useRef({ wide, radiusPx, morph, from })
  latest.current = { wide, radiusPx, morph, from }
  const mounted = useRef(false)
  /** Takılıştaki (dar) genişlik: üstte gezinmede genişlerken ortada kalmak için `x` bundan hesaplanır. */
  const narrowW = useRef(0)

  // Açılış: son yer ölçülür (dönüşüm yokken), başlangıç kutusundan oraya
  useLayoutEffect(() => {
    const el = ref.current
    const f = latest.current.from
    if (!el || !f) return
    const to = el.getBoundingClientRect()
    narrowW.current = to.width
    // Kutu CSS'te ortalı (üstte `mx-auto`, solda `my-auto`): genişlik / yükseklik her karede
    // değişirken kenar da kayardı (kapanış düğmeyi ıskalıyordu). Takılıştaki yerine sabitlenir;
    // genişlerken ortalama `x` ile
    el.style.left = `${to.x}px`
    el.style.top = `${to.y}px`
    el.style.right = 'auto'
    el.style.bottom = 'auto'
    el.style.margin = '0'
    const t = latest.current.morph
    x.jump(f.x - to.x)
    y.jump(f.y - to.y)
    w.jump(f.w)
    h.jump(f.h)
    r.jump(f.r)
    mix.jump(1)
    void animate(mix, 0, t)
    void animate(x, 0, t)
    void animate(y, 0, t)
    // Genişlik ve yükseklik sonra yine CSS'e (44rem / 85dvh…): pencere boyu değişince kutu uysun
    void animate(w, to.width, t).then(() => {
      if (present && !latest.current.wide) w.set('')
    })
    void animate(h, to.height, t).then(() => {
      if (present) h.set('')
    })
    void animate(r, latest.current.radiusPx ?? to.height, t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Bölüme göre genişlik (ilk takılışta açılış animasyonu zaten hedefe gider)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    if (!present) return
    const el = ref.current
    if (!el) return
    const target = panelWidthPx(place, wide)
    // CSS genişliğinden (sayı değil) başlıyorsa önce ölçülen değere oturtulur
    if (typeof w.get() !== 'number') w.jump(el.getBoundingClientRect().width)
    void animate(w, target, latest.current.morph).then(() => {
      // Dar hâle dönünce yine CSS'e
      if (!latest.current.wide && w.get() === target) w.set('')
    })
    // Üstte: sol kenar sabit, kutu genişlerken ortada kalsın
    if (place === 'top') void animate(x, (narrowW.current - target) / 2, latest.current.morph)
  }, [wide, place, present, w, x])
  // Kapanış: rafın kutusuna geri, sonra kaldır
  useEffect(() => {
    if (present) return
    const el = ref.current
    const to = anchor.current?.getBoundingClientRect()
    if (!el || !to) {
      safeToRemove()
      return
    }
    const t = latest.current.morph
    const cur = el.getBoundingClientRect()
    const baseX = cur.x - x.get()
    const baseY = cur.y - y.get()
    h.set(cur.height)
    if (typeof w.get() !== 'number') w.set(cur.width)
    // Düğmenin köşesi (kompaktta daire, solda / üstte rafın köşesi)
    const corner =
      parseFloat(getComputedStyle(anchor.current!).borderTopLeftRadius) || to.height / 2
    void Promise.all([
      animate(x, to.x - baseX, t),
      animate(y, to.y - baseY, t),
      animate(w, to.width, t),
      animate(h, to.height, t),
      animate(r, corner, t),
      animate(mix, 1, t),
    ]).then(() => safeToRemove())
  }, [present, safeToRemove, anchor, x, y, w, h, r, mix])

  return (
    <MotionFlex
      ref={ref}
      {...rest}
      style={{ x, y, width: w, height: h, borderRadius: r, backgroundColor: background }}
      className={cn(
        // Dönüşürken kendi katmanında (her karede yalnızca kutu boyanır)
        'fixed z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden will-change-transform',
        PLACE[place].panel,
        CHROME_SURFACE,
        className,
      )}
    >
      {children}
      {/* Düğmenin ikonu: kutu maviye döndükçe (kapanış) belirir, açılışta solar; kutu kalkınca
          altındaki düğmeyle aynı görünür, ikon birden çıkmaz */}
      <MotionFlex
        aria-hidden
        style={{ opacity: mix }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-accent-foreground"
      >
        <LayoutDashboard {...IC} size={iconSize} />
      </MotionFlex>
    </MotionFlex>
  )
}

/**
 * Raf (StartMenu): kendi başına bir panel; içeriği kabuk verir (`children(start)`: `start` başlat
 * düğmesi). Başlat düğmesine basınca kutu rafın (kompaktta düğmenin) yerinden büyüyerek açılır
 * (`StartBox`), kapanınca yine oraya küçülür. Raf açıkken yerini aynı boyda boş bir tutucu korur
 * (yanındaki paneller kıpırdamaz).
 */
export function StartDock({
  place,
  actions,
  layoutKey,
  children,
}: {
  place: ChromePlace
  actions: StartActions
  /** Rafın içeriğinin düzen imzası: raf yalnızca bu değişince ölçülür (Motion `layoutDependency`). */
  layoutKey?: string
  /**
   * Rafın içeriği (başlat düğmesi rafta değil: kendi beyaz kartında, rafın önünde yüzer). Kompaktta
   * raf yok: yalnızca düğme, kutu ondan dönüşür.
   */
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  // Kutu İş Akış Yönetimi bölümündeyken genişler (`PANEL_WIDTH`; içerik bildirir)
  const [wide, setWide] = useState(false)
  // Her açılış / kapanışta içerik yeniden kurulur: hızlı aç-kapa'da framer henüz çıkmamış rafı / kutuyu
  // geri getirir, içerik de gizli (şeffaf) hâlde kalıp kabuk boş görünüyordu
  const cycle = useRef(0)
  const lastOpen = useRef(open)
  if (lastOpen.current !== open) {
    cycle.current += 1
    lastOpen.current = open
  }
  const morph = useTransition(DOCK_SPRING)
  // Raf ve kutunun ortak yarıçapı (px; ölçülene kadar sınıftaki)
  const radiusPx = useRadiusPx(CARD_RADIUS)
  const radius = radiusPx === undefined ? undefined : { borderRadius: radiusPx }
  const column = isColumn(place)
  const compact = place === 'compact'
  const trigger = useRef<HTMLButtonElement>(null)
  const dockRef = useRef<HTMLElement>(null)
  const [from, setFrom] = useState<Box | null>(null)
  const wasOpen = useRef(false)
  const p = PLACE[place]

  // Kapanınca odak düğmeye döner (ilk açılışta değil)
  useEffect(() => {
    if (!open && wasOpen.current) trigger.current?.focus()
    wasOpen.current = open
  }, [open])

  // Kutu her düzende başlat düğmesinden açılır (raf dönüşmez, yerinde kalır)
  const openStart = () => {
    const el = trigger.current
    const r = el?.getBoundingClientRect()
    const corner = el ? parseFloat(getComputedStyle(el).borderTopLeftRadius) || r!.height / 2 : 0
    setFrom(r ? { x: r.x, y: r.y, w: r.width, h: r.height, r: corner } : null)
    setOpen(true)
  }
  // İçerik dönüşüm sırasında gizli, bitmeye yakın belirir (ölçeklenirken ezik görünmesin)
  const content = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { delay: 0.12, duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  }
  const start = (
    // Kutu açılırken düğme anında gizlenir (kutu onun yerinden büyür), kapanınca kutu yerine
    // oturmaya yakın belirir
    <MotionFlex
      animate={{ opacity: open ? 0 : 1 }}
      transition={open ? { duration: 0 } : DOCK_BACK}
      // Kabuk sütunu / çubuğu işaretçiyi geçirir (`pointer-events-none`): düğme kendi alır
      className="pointer-events-auto flex shrink-0"
    >
      <Tip label={START_LABELS.start} placement={CHROME_TIP[place]}>
        <Button
          ref={trigger}
          type="primary"
          shape={compact ? 'circle' : 'default'}
          aria-label={START_LABELS.start}
          aria-expanded={open}
          onClick={openStart}
          icon={<LayoutDashboard {...IC} size={p.icon} />}
          // Kompaktta daire; solda / üstte rafla aynı köşe (px, `useRadiusPx`)
          style={compact ? undefined : radius}
          className={cn(
            'shrink-0 bg-accent p-0 text-accent-foreground hover:bg-accent/90',
            compact && 'rounded-full',
            p.start,
          )}
        />
      </Tip>
    </MotionFlex>
  )
  const body = (
    <>
      {/* Raf (solda / üstte) hep yerinde; kutu düğmeden açılır */}
      {!compact && (
        <Flex
          ref={dockRef}
          style={radius}
          role="navigation"
          aria-label="Ana menü"
          // Kontur ve gölge kartlar gibi tema panelinden (`CARD`: `--border-width`, `--surface-shadow`)
          className={cn('relative flex shrink-0', p.shell, CHROME_SURFACE, CARD)}
        >
          <MotionFlex
            // Raf boyu değişince (alt seviyeler eklenince) içerik ezilmesin; raf ile aynı yay
            layout
            layoutDependency={layoutKey}
            transition={morph}
            className={cn('relative flex gap-1', column ? 'flex-col items-center' : 'items-center')}
          >
            {children}
          </MotionFlex>
        </Flex>
      )}
      <AnimatePresence initial={false}>
        {open && (
          // `contents`: kap yerleşimde yer tutmaz (yoksa kapanırken raf bir an yukarı kayıp inerdi)
          <Flex key="start" className="contents">
            <CloseOnPlace onChange={close} />
            {/* Dışarı tıklayınca kapanır; zemin hafifçe solar */}
            <MotionFlex
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onPointerDown={() => setOpen(false)}
              // `block`: antd'de içi boş `Flex` gizlenir
              className="pointer-events-auto block fixed inset-0 z-40 bg-foreground/10"
            />
            <StartBox
              place={place}
              from={from}
              anchor={trigger}
              iconSize={p.icon}
              wide={wide}
              radiusPx={radiusPx}
              morph={morph}
              role="dialog"
              aria-label={START_LABELS.start}
              onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
                // Kutunun açtığı pencerede (portal) Esc yalnızca o pencereyi kapatır
                if (e.key === 'Escape' && e.currentTarget.contains(e.target as Node)) setOpen(false)
              }}
              onBlur={(e: React.FocusEvent<HTMLElement>) => {
                // Odak kutunun dışına çıkınca (Tab) kapanır; kutunun açtığı pencerelere (açılır
                // menü, karar diyaloğu: uygulama kökünün dışındaki portallar) geçmek kapatmaz
                const next = e.relatedTarget as Node | null
                if (
                  next &&
                  !e.currentTarget.contains(next) &&
                  document.getElementById('root')?.contains(next)
                )
                  setOpen(false)
              }}
            >
              {/* Kontur ve gölge: içerikle birlikte, dönüşümün sonuna doğru belirir */}
              <MotionFlex
                key={`ring-${cycle.current}`}
                aria-hidden
                {...content}
                className={PANEL_RING}
              />
              <MotionFlex
                key={`panel-${cycle.current}`}
                {...content}
                className="flex min-h-0 flex-1 flex-col"
              >
                <StartPanel actions={actions} onClose={() => setOpen(false)} onWide={setWide} />
              </MotionFlex>
            </StartBox>
          </Flex>
        )}
      </AnimatePresence>
    </>
  )
  if (compact)
    return (
      <>
        {start}
        {body}
      </>
    )
  // Başlat düğmesi kartsız, rafın önünde (solda üstünde, üstte solunda); kutu doğrudan ondan büyür
  return (
    <Flex className={cn('flex shrink-0 items-center gap-2', column && 'flex-col')}>
      {start}
      {body}
    </Flex>
  )
}

/* --- Başlat kutusu ----------------------------------------------------------------------------- */

/*
 * Kutunun içeriği (uygulamanın kökü). Üstte arama; altında solda uygulamanın ortak sekme şeridi
 * dikey (`TabStrip orientation="vertical"`, yaprak sağdaki bölmeye kavislerle kaynaşır), sağda
 * seçili bölüm. Bölümler:
 *   1. Arama (odakta; yazınca her şey tek bir sonuç listesine döner; ↑ ↓ ile sanal vurgu, Enter açar)
 *   2. Uygulamalar: sade tek sütun ağaç (klasörler açılır / kapanır, kılavuz çizgisi); sıra
 *      numarası ↔ alfabetik (tercih tarayıcıda, tüm uygulamalar paneliyle ortak); kutunun yarısı,
 *      kendi içinde kayar; altında çizgi
 *   3. Selamlama ve bekleyen onay cümlesi; altında iş akışı kategorileri sayılarıyla (Başlangıç'taki
 *      kategori bloklarının sayıları)
 *   4. Doküman Yönetimi (maket): son kullanılan dokümanlar, depolar ve favoriler yan yana; kutu genişler
 *   5. Duyurular, Aktiviteler, Vekaletler, Yönetim Araçları (orijinalin üst çubuğu ve kullanıcı
 *      menüsünden; maketler, `shared/startMock.ts`)
 *   6. Favoriler ↔ Son Kullanılan Uygulamalar: ikon karoları (yıldızla sabitle / kaldır)
 * Alt şerit yok (duyurular, sohbet ve tema sekme satırının sağındaki eylemlerde; aramada da
 * bulunurlar). Bölümler açılışta kısa aralıklarla belirir (`--motion-time` ile ölçekli); arama sonuçları
 * beklemez. Tek renk: ikon kareleri yumuşak birincil ton, üzerine gelince / seçiliyken dolu.
 */

/** Kutunun bölümleri: soldaki dikey şeridin sekmeleri. */
type Section = 'apps' | 'work' | 'docs' | 'news' | 'activity' | 'delegations' | 'admin' | 'shelf'
const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'apps', label: MENU_LABELS.apps, icon: LayoutGrid },
  { id: 'work', label: 'İş Akış Yönetimi', icon: Workflow },
  { id: 'docs', label: DOC_LABELS.title, icon: FolderArchive },
  { id: 'news', label: START_MOCK_LABELS.announcements, icon: Megaphone },
  { id: 'activity', label: START_MOCK_LABELS.activities, icon: Activity },
  { id: 'delegations', label: START_MOCK_LABELS.delegations, icon: UserCheck },
  { id: 'admin', label: START_MOCK_LABELS.adminTools, icon: Wrench },
  { id: 'shelf', label: APPS_LABELS.favorites, icon: Star },
]

/**
 * Sekme bölmesinin (ve ona kaynaşan yaprağın) zemini: birincil rengin yüzeye karışmış açık tonu,
 * çalışma alanının kabından biraz daha açık (`--tab-bg`; `SHEET` bunu okur).
 */
const START_PANE_BG = '[--tab-bg:color-mix(in_oklab,var(--accent)_10%,var(--surface))]'

const START_UI = {
  pin: APPS_LABELS.pin,
  unpin: APPS_LABELS.unpin,
  allApps: MENU_LABELS.apps, // "Uygulamalar" (101882): sekme ve bölüm başlığı
  results: 'Arama sonuçları',
} as const

/** Bölüm: 13px orta kalın başlık, sağda isteğe bağlı ek. */
function Section({
  title,
  extra,
  children,
  className,
}: {
  title: ReactNode
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Flex role="group" className={cn('flex flex-col gap-2.5', className)}>
      <Flex align="center" justify="space-between" gap={8} className="min-h-7 px-1">
        <Text className="text-sm font-medium text-muted">{title}</Text>
        {extra}
      </Flex>
      {children}
    </Flex>
  )
}

/** İkon karesi: yumuşak birincil ton; `on` ile dolu. İkonu olmayan uygulamada baş harfler. */
function IconBox({
  icon: Icon,
  label,
  on = false,
  size = 'md',
  className,
}: {
  icon?: LucideIcon
  label: string
  on?: boolean
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <Flex
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-xl transition-colors',
        size === 'md' ? 'size-14' : 'size-9 rounded-lg',
        on ? 'bg-accent text-accent-foreground' : 'bg-accent-soft text-accent-soft-foreground',
        className,
      )}
    >
      {Icon ? (
        <Icon {...IC} size={size === 'md' ? 26 : 18} />
      ) : (
        <Text className={cn('font-semibold text-current', size === 'md' ? 'text-base' : 'text-xs')}>
          {initials(label)}
        </Text>
      )}
    </Flex>
  )
}

/**
 * Uygulama karosu: ikon karesi, altında iki satıra kadar ad. Üzerine gelince kare dolar. Sağ üstte
 * yıldız (favorilere ekle / kaldır; düğme karonun kardeşi, iç içe düğme olmaz).
 */
function AppTile({ app, active, onPress }: { app: MenuApp; active: boolean; onPress: () => void }) {
  const pinLabel = app.pinned ? START_UI.unpin : START_UI.pin
  return (
    <Flex className="group/tile relative flex">
      <Button
        type="text"
        onClick={onPress}
        aria-current={active ? 'page' : undefined}
        // `whitespace-normal`: antd düğmesi tek satır; ad iki satıra sarabilsin
        className="h-auto w-full flex-col gap-2 rounded-2xl! px-1.5 pt-3 pb-2 font-normal whitespace-normal text-foreground hover:bg-surface-secondary! focus-visible:[box-shadow:0_0_0_2px_var(--focus)]"
      >
        <IconBox
          icon={app.icon}
          label={app.caption}
          on={active}
          className="group-hover/tile:bg-accent group-hover/tile:text-accent-foreground"
        />
        <Text className="line-clamp-2 w-full text-center text-sm leading-[1.3] text-current">
          {app.caption}
        </Text>
      </Button>
      <Tip label={pinLabel} placement="top">
        <Button
          type="text"
          size="small"
          aria-label={`${pinLabel}: ${app.caption}`}
          aria-pressed={app.pinned}
          onClick={() => togglePin(app.id)}
          icon={<Star {...IC} size={15} className={cn(app.pinned && 'fill-current')} />}
          className={cn(
            'absolute top-1 end-1 size-6 min-w-6 rounded-full p-0 transition-opacity',
            app.pinned
              ? 'text-accent hover:text-accent!'
              : 'text-muted opacity-0 group-hover/tile:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
          )}
        />
      </Tip>
    </Flex>
  )
}

/** Kısa uygulama satırı (Tüm uygulamalar, arama sonuçları): küçük ikon karesi, ad, sağda not. */
function AppRow({
  icon,
  label,
  query = '',
  hint,
  active = false,
  highlighted = false,
  onPress,
  rowRef,
  plain = false,
}: {
  icon?: LucideIcon
  label: string
  query?: string
  hint?: ReactNode
  active?: boolean
  /** Aramanın sanal vurgusu (↑ ↓). */
  highlighted?: boolean
  onPress: () => void
  rowRef?: (el: HTMLElement | null) => void
  /** Sade: ikon karesiz (ağaç). */
  plain?: boolean
}) {
  const Icon = icon
  return (
    <Button
      ref={rowRef}
      type="text"
      onClick={onPress}
      aria-current={active ? 'page' : undefined}
      data-highlighted={highlighted || undefined}
      className={cn(
        'group/row w-full justify-start gap-3 rounded-xl! px-2 text-start font-normal text-foreground hover:bg-surface-secondary!',
        plain ? 'h-10' : 'h-12',
        highlighted && 'bg-surface-secondary!',
      )}
    >
      {plain ? (
        Icon ? (
          <Icon
            {...IC}
            size={18}
            className={cn('shrink-0', active ? 'text-accent' : 'text-muted')}
          />
        ) : (
          <Text
            className={cn(
              'w-[18px] shrink-0 text-center text-[0.625rem] font-semibold',
              active ? 'text-accent' : 'text-muted',
            )}
          >
            {initials(label)}
          </Text>
        )
      ) : (
        <IconBox
          icon={icon}
          label={label}
          size="sm"
          on={active}
          className="group-hover/row:bg-accent group-hover/row:text-accent-foreground"
        />
      )}
      <Text
        className={cn(
          'min-w-0 flex-1 text-base truncate',
          plain && active ? 'text-accent' : 'text-current',
        )}
      >
        <Highlight text={label} query={query} />
      </Text>
      {hint}
    </Button>
  )
}

/** Sayı rozeti (satırın sağında): nötr zemin; 0'da yok. */
function CountBadge({ value, on = false }: { value: number | undefined; on?: boolean }) {
  if (!value) return null
  return (
    <Text
      className={cn(
        'h-6 min-w-6 rounded-full px-2 text-center text-xs leading-6 font-semibold tabular-nums',
        on ? 'bg-accent-foreground text-accent' : 'bg-surface-secondary text-foreground',
      )}
    >
      {value > 999 ? '999+' : value}
    </Text>
  )
}

/** Arama sonucu: grup, ad, ikon, not ve eylem. */
interface Hit {
  key: string
  group: string
  icon?: LucideIcon
  label: string
  hint?: ReactNode
  active?: boolean
  run: () => void
}

/** Ağacın yaprakları (klasör adıyla); klasörün kendisi eşleşirse bütün içeriği. */
function leavesOf(nodes: MenuNode[], folder?: string): { n: MenuNode; folder?: string }[] {
  return nodes.flatMap((n) => (n.children ? leavesOf(n.children, n.caption) : [{ n, folder }]))
}

/** Adres yaprağın altında mı (seçili uygulama). */
const under = (place: string, href: string | undefined) =>
  !!href && (place === k(href) || place.startsWith(`${k(href)}/`))

/**
 * Ağaçtaki klasör: başlık satırı (klasör ikonu küçük karede, ad, uygulama sayısı, dönen ok) ve
 * altında sol kılavuz çizgisiyle içeri alınmış uygulamalar. Açılınca satırlar kısa aralıklarla
 * belirir; kapalıyken yalnızca başlık. Seçili uygulama varsa klasör ikonu birincil renkte.
 */
function TreeFolder({
  node,
  open,
  onToggle,
  place,
  onPick,
}: {
  node: MenuNode
  open: boolean
  onToggle: () => void
  place: string
  onPick: (n: MenuNode) => void
}) {
  const FolderIcon = node.icon ?? FolderOpen
  const kids = node.children ?? []
  const holds = kids.some((n) => under(place, n.href))
  return (
    <Flex role="treeitem" aria-expanded={open} className="flex flex-col">
      <Button
        type="text"
        onClick={onToggle}
        className="group/folder h-10 w-full justify-start gap-3 rounded-xl! px-2 text-start font-normal text-foreground hover:bg-surface-secondary!"
      >
        <FolderIcon
          {...IC}
          size={18}
          className={cn('shrink-0', holds ? 'text-accent' : 'text-muted')}
        />
        <Text className="min-w-0 flex-1 text-base font-medium text-current truncate">
          {node.caption}
        </Text>
        <ChevronRight
          {...IC}
          size={16}
          aria-hidden
          className={cn(
            'shrink-0 text-muted transition-transform duration-[calc(200ms*var(--motion-time,1))]',
            open && 'rotate-90',
          )}
        />
      </Button>
      {open && (
        // Kılavuz çizgisi klasör ikonunun ortasından iner (ikon 18px, satır payı 8px)
        <Flex
          role="group"
          aria-label={node.caption}
          className="ms-[17px] flex flex-col gap-0.5 border-s border-border ps-[11px]"
        >
          {kids.map((n) => (
            <Flex
              key={n.id}
              role="treeitem"
              aria-selected={under(place, n.href) || undefined}
              className="flex"
            >
              <AppRow
                plain
                icon={n.icon}
                label={n.caption}
                active={under(place, n.href)}
                onPress={() => onPick(n)}
              />
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  )
}

/** Başlat kutusunun İş Akış Yönetimi bölümü (yukarıda). `onGo`: adrese gider ve kutuyu kapatır. */
function WorkPane({ onGo }: { onGo: (href: string) => void }) {
  const counts = useBoxCounts()
  const [boxId, setBoxId] = useState<BoxId>('bekleyen')
  const box = findBox(boxId)!
  const requests = useBoxRequests(boxId)
  const groups = useMemo(
    () => processGroups(box, requests, { sort: defaultSortOf(boxId) }),
    [box, requests, boxId],
  )
  const isDraft = boxId === 'taslaklar'
  const countLabel = isDraft ? START_PAGE.draftCount : START_PAGE.requestCount
  return (
    <Flex className="flex h-full min-h-0 flex-col gap-4">
      {/* Kutular: sayı karoları; seçili olan dolu birincil renk */}
      <Flex
        role="tablist"
        aria-label={SECTIONS[1]!.label}
        className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2"
      >
        {mainBoxes.map((b) => {
          const Icon = b.icon
          const n = counts.get(b.id) ?? 0
          const on = b.id === boxId
          return (
            <Button
              key={b.id}
              type="text"
              role="tab"
              aria-selected={on}
              onClick={() => setBoxId(b.id)}
              aria-label={`${b.label}, ${n}`}
              className={cn(
                'h-auto flex-col items-start gap-2.5 rounded-2xl! p-3 text-start font-normal whitespace-normal',
                on
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90! hover:text-accent-foreground!'
                  : 'bg-surface-secondary/70 text-foreground hover:bg-surface-secondary!',
              )}
            >
              <Flex align="center" justify="space-between" className="w-full">
                <Icon {...IC} size={20} className={cn(!on && 'text-muted')} />
                <Text className="font-display text-2xl font-bold text-current tabular-nums">
                  <Count value={n} />
                </Text>
              </Flex>
              <Text className="line-clamp-2 w-full text-sm leading-[1.3] text-current">
                {b.label}
              </Text>
            </Button>
          )
        })}
      </Flex>

      {/* Seçili kutunun süreçleri: başlık satırı (ad, Tümünü Göster, sayı sütunu), kayan liste */}
      <Flex role="tabpanel" aria-label={box.label} className="flex min-h-0 flex-1 flex-col gap-1">
        <Flex align="center" gap={8} className="shrink-0 px-2">
          <Text className="text-sm font-medium text-muted">{START_PAGE.flow}</Text>
          <Button
            type="link"
            size="small"
            onClick={() => onGo(boxLink(boxId))}
            className="ms-auto h-7 px-1 text-sm"
          >
            {START_PAGE.showAll}
          </Button>
          <Text className="w-14 text-end text-sm text-muted">{countLabel.split(' ')[0]}</Text>
        </Flex>
        <Scroll className="-mx-1 min-h-0 flex-1 gap-0.5 px-1" role="list" aria-label={box.label}>
          {groups.length === 0 && (
            <Text className="px-2 py-6 text-center text-base text-muted">{START_PAGE.noData}</Text>
          )}
          {groups.map(({ process: p, count }) => (
            <Flex key={p.id} role="listitem" className="flex">
              <Button
                type="text"
                onClick={() => onGo(processLink(boxId, p.id))}
                aria-label={`${processCaption(p)}, ${countLabel} ${count}`}
                className="group/row h-14 w-full justify-start gap-3 rounded-xl! px-2 text-start font-normal text-foreground hover:bg-surface-secondary!"
              >
                <IconBox
                  icon={p.icon}
                  label={p.name}
                  size="sm"
                  className="group-hover/row:bg-accent group-hover/row:text-accent-foreground"
                />
                <Flex vertical className="min-w-0 flex-1">
                  <Text className="block text-xs leading-tight text-muted truncate">
                    {p.project}
                  </Text>
                  <Text className="block text-base leading-snug text-current truncate">
                    {isDraft ? p.form : p.name}
                  </Text>
                </Flex>
                <CountBadge value={count} />
              </Button>
            </Flex>
          ))}
        </Scroll>
      </Flex>
    </Flex>
  )
}

/**
 * Doküman Yönetimi bölümü (maket; sayfası yok): solda son kullanılan dokümanlar (ad, depo, ne zaman
 * açıldığı), sağda son kullanılan depolar (ad, öğe sayısı); iki eşit sütun, her biri kendi içinde
 * kayar. Satırlar bilgi amaçlı (bağlantı yok).
 */
/** Bilgi satırı (bağlantısız): küçük ikon karesi ya da avatar, ad, altında not; sağda ek. */
function InfoRow({
  lead,
  icon,
  label,
  note,
  extra,
  unread = false,
}: {
  lead?: ReactNode
  icon?: LucideIcon
  label: string
  note: ReactNode
  extra?: ReactNode
  /** Okunmamış: adın önünde birincil renkte nokta. */
  unread?: boolean
}) {
  return (
    <Flex
      role="listitem"
      align="center"
      gap={12}
      className="min-h-14 shrink-0 rounded-xl px-2 py-1.5 hover:bg-surface-secondary"
    >
      {lead ?? <IconBox icon={icon} label={label} size="sm" />}
      <Flex vertical className="min-w-0 flex-1">
        <Flex align="center" gap={6} className="min-w-0">
          {unread && (
            <Flex aria-hidden className="block size-1.5 shrink-0 rounded-full bg-accent" />
          )}
          <Text
            className={cn(
              'block min-w-0 text-base leading-snug text-foreground truncate',
              unread && 'font-medium',
            )}
          >
            {label}
          </Text>
        </Flex>
        <Text className="block text-xs leading-tight text-muted truncate">{note}</Text>
      </Flex>
      {extra}
    </Flex>
  )
}

/** Bölmenin içinde kayan liste sütunu (başlık + satırlar). */
function ListColumn({
  title,
  extra,
  children,
}: {
  title: string
  extra?: ReactNode
  children: ReactNode
}) {
  return (
    <Section className="min-h-0 min-w-0" title={title} extra={extra}>
      <Scroll className="-mx-1 min-h-0 flex-1 gap-0.5 px-1" role="list" aria-label={title}>
        {children}
      </Scroll>
    </Section>
  )
}

/**
 * Doküman Yönetimi bölümü (maket; sayfası yok): son kullanılan dokümanlar, son kullanılan depolar ve
 * favori dokümanlar (orijinal DM panosunun üç alanı) yan yana; her biri kendi içinde kayar.
 */
function DocsPane() {
  const doc = (d: (typeof recentDocuments)[number]) => (
    <InfoRow key={d.id} icon={d.icon} label={d.name} note={`${d.repo} · ${relative(d.openedAt)}`} />
  )
  return (
    <Flex className="grid h-full min-h-0 grid-cols-3 gap-6">
      <ListColumn title={DOC_LABELS.recentDocs}>{recentDocuments.map(doc)}</ListColumn>
      <ListColumn title={DOC_LABELS.recentRepos}>
        {recentRepositories.map((r) => (
          <InfoRow
            key={r.id}
            icon={r.icon}
            label={r.name}
            note={`${DOC_LABELS.items(r.count)} · ${relative(r.openedAt)}`}
          />
        ))}
      </ListColumn>
      <ListColumn title={DOC_LABELS.favorites}>{favoriteDocuments.map(doc)}</ListColumn>
    </Flex>
  )
}

/** Duyurular (101048): son duyurular, okunmamışlar işaretli; "Tümü" kabuğun Duyurular panelini açar. */
function AnnouncementsPane({ onAll }: { onAll: () => void }) {
  return (
    <ListColumn
      title={START_MOCK_LABELS.announcements}
      extra={
        <Button type="link" size="small" onClick={onAll} className="h-7 px-1 text-sm">
          {START_MOCK_LABELS.all}
        </Button>
      }
    >
      {announcements.map((a) => (
        <InfoRow
          key={a.id}
          icon={Megaphone}
          label={a.title}
          unread={a.unread}
          note={`${relative(a.date)} · ${a.summary}`}
        />
      ))}
    </ListColumn>
  )
}

/** Aktiviteler (102820): yorumlar, etiketlemeler, ekler; kim, nerede, ne zaman. */
function ActivitiesPane() {
  return (
    <ListColumn title={START_MOCK_LABELS.activities}>
      {activities.map((c) => (
        <InfoRow
          key={c.id}
          lead={
            <Avatar
              size={36}
              aria-hidden
              className="inline-flex! shrink-0 items-center justify-center bg-accent-soft text-sm font-semibold text-accent-soft-foreground"
            >
              {initials(c.who.name)}
            </Avatar>
          }
          label={`${c.who.name} ${c.action}`}
          unread={c.unread}
          note={
            <>
              {c.target} · {relative(c.date)}
              {c.text && ` · "${c.text}"`}
            </>
          }
        />
      ))}
    </ListColumn>
  )
}

/** Vekaletler (100043): verdiklerim ve aldıklarım; kişi, kapsam, tarih aralığı, durum. */
function DelegationsPane() {
  const state = (d: Delegation) => {
    const st = delegationState(d)
    return (
      <Text
        className={cn(
          'h-6 shrink-0 rounded-full px-2 text-xs leading-6 font-medium',
          st === 'active'
            ? 'bg-accent-soft text-accent-soft-foreground'
            : 'bg-surface-secondary text-muted',
        )}
      >
        {st === 'active'
          ? START_MOCK_LABELS.active
          : st === 'planned'
            ? START_MOCK_LABELS.planned
            : START_MOCK_LABELS.ended}
      </Text>
    )
  }
  const row = (d: Delegation) => (
    <InfoRow
      key={d.id}
      lead={
        <Avatar
          size={36}
          aria-hidden
          className="inline-flex! shrink-0 items-center justify-center bg-surface-secondary text-sm font-semibold text-foreground"
        >
          {initials(d.person.name)}
        </Avatar>
      }
      label={d.person.name}
      note={`${d.scope} · ${formatDay(d.start)} – ${formatDay(d.end)}`}
      extra={state(d)}
    />
  )
  return (
    <Flex className="flex h-full min-h-0 flex-col gap-6">
      <ListColumn title={START_MOCK_LABELS.given}>{givenDelegations.map(row)}</ListColumn>
      <ListColumn title={START_MOCK_LABELS.received}>{receivedDelegations.map(row)}</ListColumn>
    </Flex>
  )
}

/** Yönetim Araçları (100676): yalnızca kısayol karoları (sayfaları yok). */
function AdminToolsPane() {
  return (
    <Section className="min-h-0" title={START_MOCK_LABELS.adminTools}>
      <Flex
        role="list"
        aria-label={START_MOCK_LABELS.adminTools}
        className="grid grid-cols-3 gap-2"
      >
        {adminTools.map((t) => (
          <Flex
            key={t.id}
            role="listitem"
            vertical
            align="center"
            gap={8}
            className="rounded-2xl px-2 pt-4 pb-3 hover:bg-surface-secondary"
          >
            <IconBox icon={t.icon} label={t.label} />
            <Text className="line-clamp-2 w-full text-center text-sm leading-[1.3] text-foreground">
              {t.label}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Section>
  )
}

function StartPanel({
  actions,
  onClose,
  onWide,
}: {
  actions: StartActions
  onClose: () => void
  /** Kutu genişlesin mi (İş Akış Yönetimi bölümü, aramasız). */
  onWide: (wide: boolean) => void
}) {
  const navigate = useNavigate()
  const openApp = useOpenApp()
  const place = usePlace()
  const { favorites, recent } = useMenuApps()
  const [shelf, setShelf] = useState<'favorites' | 'recent'>('favorites')
  const counts = useBoxCounts()
  const dark = useIsDark()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MenuSort>(() => readJson<MenuSort>(SORT_KEY, 'order'))
  // Seçili bölüm (sekme); kutu hep Tüm uygulamalar'la açılır
  const [section, setSection] = useState<Section>('apps')
  // Ağaçta kapatılan klasörler (hepsi açık başlar; tercih oturum boyunca)
  const [closed, setClosed] = useRemembered<string[]>('karo:start:closed', () => [])
  // Aramanın sanal vurgusu: liste değişince başa döner
  const [hi, setHi] = useState(0)
  const hiRef = useRef<HTMLElement | null>(null)

  const q = fold(query.trim())
  const searching = !!q
  const close = onClose
  const go = (href: string) => {
    navigate(href)
    close()
  }
  const goApp = (app: MenuApp) => {
    openApp(app)
    close()
  }
  const run = (fn: () => void) => {
    close()
    fn()
  }
  const pick = (n: MenuNode) => {
    const app = findApp(n.id)
    if (app) goApp(app)
    else if (n.href) go(k(n.href))
    else close()
  }
  const changeSort = () => {
    const next: MenuSort = sort === 'order' ? 'alphabetic' : 'order'
    writeJson(SORT_KEY, next)
    setSort(next)
  }

  const now = new Date()
  const { text: hello, daytime } = greetingOf(now)
  // Selamlama kartı Başlangıç'taki karşılama bandıyla aynı yüzeyde (dolu birincil renk)
  const band = useBand()
  const pending = counts.get('bekleyen') ?? 0

  const tree = useMemo(() => sortTree(MENU_TREE, sort), [sort])
  // Favorilerdeki güncel sabitleme durumu son kullanılanlarda da geçerli (`useMenuApps`)

  const viewActions = [
    { id: 'theme', icon: Palette, label: START_LABELS.themeSettings, fn: actions.onTheme },
    {
      id: 'mode',
      icon: dark ? Sun : Moon,
      label: dark ? START_LABELS.light : START_LABELS.dark,
      fn: () => setColorMode(dark ? 'light' : 'dark'),
    },
  ]

  /* Arama: tek düz liste (uygulamalar, kutular, görünüm) ------------------------------------------ */

  const hits: Hit[] = useMemo(() => {
    if (!q) return []
    const out: Hit[] = []
    const { nodes } = filterTree(tree, q)
    for (const { n, folder } of leavesOf(nodes)) {
      const app = findApp(n.id)
      out.push({
        key: `app:${n.id}`,
        group: START_LABELS.apps,
        icon: n.icon,
        label: n.caption,
        hint: folder ? <Text className="text-sm text-muted">{folder}</Text> : undefined,
        active: under(place, n.href),
        run: () => {
          if (app) goApp(app)
          else if (n.href) go(k(n.href))
          else close()
        },
      })
    }
    for (const b of [...mainBoxes, ...historyBoxes])
      if (fold(b.label).includes(q))
        out.push({
          key: `box:${b.id}`,
          group: START_LABELS.workflow,
          icon: b.icon,
          label: b.label,
          hint: (
            <>
              {b.group === 'gecmis' && (
                <Text className="text-sm text-muted">{HISTORY_GROUP_LABEL}</Text>
              )}
              <CountBadge value={counts.get(b.id)} />
            </>
          ),
          run: () => go(boxLink(b.id)),
        })
    for (const v of viewActions)
      if (fold(v.label).includes(q))
        out.push({
          key: `view:${v.id}`,
          group: START_LABELS.view,
          icon: v.icon,
          label: v.label,
          run: () => run(v.fn),
        })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tree, counts, place, dark])

  useEffect(() => setHi(0), [q])
  // Geniş kutu: İş Akış Yönetimi (beş karo yan yana) ve Doküman Yönetimi (iki alan yan yana)
  useEffect(
    () => onWide(!searching && (section === 'work' || section === 'docs')),
    [onWide, searching, section],
  )
  useEffect(() => {
    hiRef.current?.scrollIntoView({ block: 'nearest' })
  }, [hi, q])

  const onKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!searching || !hits.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHi((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHi((i) => Math.max(i - 1, 0))
    } else if (
      e.key === 'Home' &&
      e.target instanceof HTMLInputElement &&
      e.target.selectionStart === 0
    ) {
      setHi(0)
    } else if (
      e.key === 'End' &&
      e.target instanceof HTMLInputElement &&
      e.target.selectionEnd === e.target.value.length
    ) {
      setHi(hits.length - 1)
    } else if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault()
      hits[hi]?.run()
    }
  }

  const results = hits.length ? (
    <Flex role="list" aria-label={START_UI.results} className="flex flex-col gap-4">
      {[...new Set(hits.map((h) => h.group))].map((g) => (
        <Section key={g} title={g} className="animate-none">
          <Flex className="flex flex-col gap-0.5">
            {hits.map((h, i) =>
              h.group === g ? (
                <Flex key={h.key} role="listitem" className="flex">
                  <AppRow
                    icon={h.icon}
                    label={h.label}
                    query={query}
                    hint={h.hint}
                    active={h.active}
                    highlighted={i === hi}
                    onPress={h.run}
                    rowRef={i === hi ? (el) => (hiRef.current = el) : undefined}
                  />
                </Flex>
              ) : null,
            )}
          </Flex>
        </Section>
      ))}
    </Flex>
  ) : (
    <EmptyNote text={MENU_LABELS.noResult} icon={Search} />
  )

  /* Varsayılan görünüm ---------------------------------------------------------------------------- */

  /* Bölmeler: her sekmenin içeriği (kabı doldurur, kendi içinde kayar) ------------------------- */

  const appsPane = (
    <Section
      className="h-full min-h-0"
      title={START_UI.allApps}
      extra={
        <Tip
          label={sort === 'order' ? MENU_LABELS.sortAlphabetic : MENU_LABELS.sortOrder}
          placement="left"
        >
          <Button
            type="text"
            size="small"
            aria-label={sort === 'order' ? MENU_LABELS.sortAlphabetic : MENU_LABELS.sortOrder}
            onClick={changeSort}
            icon={
              sort === 'order' ? (
                <ArrowDownAZ {...IC} size={18} />
              ) : (
                <ListOrdered {...IC} size={18} />
              )
            }
            className="size-7 min-w-7 rounded-full text-muted hover:text-foreground!"
          />
        </Tip>
      }
    >
      <Scroll className="-mx-1 min-h-0 flex-1 gap-4 px-1 pb-1">
        {/* Tek sütun ağaç: üstte yapraklar (Başlangıç, İş Akış Yönetimi), altında klasörler */}
        <Flex role="tree" aria-label={START_UI.allApps} className="flex flex-col gap-0.5">
          {tree.map((n) =>
            n.children?.length ? (
              <TreeFolder
                key={n.id}
                node={n}
                open={!closed.includes(n.id)}
                onToggle={() =>
                  setClosed((c) => (c.includes(n.id) ? c.filter((x) => x !== n.id) : [...c, n.id]))
                }
                place={place}
                onPick={pick}
              />
            ) : (
              <Flex
                key={n.id}
                role="treeitem"
                aria-selected={under(place, n.href) || undefined}
                className="flex"
              >
                <AppRow
                  plain
                  icon={n.icon}
                  label={n.caption}
                  active={under(place, n.href)}
                  hint={<CountBadge value={n.id === 'is-akis-yonetimi' ? pending : 0} />}
                  onPress={() => pick(n)}
                />
              </Flex>
            ),
          )}
        </Flex>
      </Scroll>
    </Section>
  )

  // İş Akış Yönetimi'nin kompakt hâli (başlat kutusu bir yer: bir iki tıkla gidilir): üstte kutular
  // sayı karoları (seçili olan birincil renkte; basınca o kutunun süreçleri gelir), altında seçili
  // kutunun süreç listesi (proje, süreç, sayı); satır o süreç listesini çalışma alanında açar,
  // "Tümünü Göster" kutunun kendisini. Talep ızgarası burada yok (Başlangıç'ta ve sayfada)
  const workPane = <WorkPane onGo={go} />

  // Favoriler ↔ Son kullanılanlar: karo ızgarası
  const shelfApps = shelf === 'favorites' ? favorites : recent.slice(0, 12)
  const shelfPane = (
    <Section
      className="min-h-0"
      title={
        <Flex role="group" aria-label={START_LABELS.apps} className="-ms-1 flex gap-0.5">
          {(
            [
              { id: 'favorites', label: START_LABELS.favorites },
              { id: 'recent', label: START_LABELS.recent },
            ] as const
          ).map((t) => {
            const on = shelf === t.id
            return (
              <Button
                key={t.id}
                type="text"
                size="small"
                aria-pressed={on}
                onClick={() => setShelf(t.id)}
                className={cn(
                  'h-8 rounded-full px-3 text-sm font-medium',
                  on
                    ? 'bg-surface-secondary text-foreground hover:bg-surface-secondary!'
                    : 'text-muted hover:text-foreground!',
                )}
              >
                {t.label}
              </Button>
            )
          })}
        </Flex>
      }
    >
      {shelfApps.length ? (
        <Flex
          role="list"
          aria-label={shelf === 'favorites' ? START_LABELS.favorites : START_LABELS.recent}
          className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-1"
        >
          {shelfApps.map((a) => (
            <Flex key={a.id} role="listitem" className="flex">
              <AppTile app={a} active={under(place, a.href)} onPress={() => goApp(a)} />
            </Flex>
          ))}
        </Flex>
      ) : (
        <Text className="px-1 text-base text-muted">{START_LABELS.noFavorites}</Text>
      )}
    </Section>
  )

  // Doküman Yönetimi: iki alan yan yana (kutu geniş), örnek içerik
  const docsPane = <DocsPane />
  // Orijinalin üst çubuğundaki paneller ve kullanıcı menüsü (maketler; `shared/startMock.ts`)
  const newsPane = <AnnouncementsPane onAll={() => run(() => actions.onPanel('news'))} />
  const activityPane = <ActivitiesPane />
  const delegationsPane = <DelegationsPane />
  const adminPane = <AdminToolsPane />

  const panes: Record<Section, ReactNode> = {
    apps: appsPane,
    work: workPane,
    docs: docsPane,
    news: newsPane,
    activity: activityPane,
    delegations: delegationsPane,
    admin: adminPane,
    shelf: shelfPane,
  }

  return (
    <>
      {/* Üst: arama (kutunun omurgası) */}
      {/* Altındakilerle aynı hizada (0.75rem kenar payı), altında kartın bölmeye uzaklığı kadar boşluk */}
      <Flex onKeyDown={onKey} className="flex shrink-0 px-3 pt-3 pb-3">
        <SearchField
          autoFocus
          value={query}
          onChange={setQuery}
          label={MENU_LABELS.searchAll}
          className="h-12 min-w-0 flex-1 rounded-full px-4 text-base"
        />
      </Flex>

      {/*
       * Orta: solda dikey sekme şeridi (uygulamadaki ortak şerit, `orientation="vertical"`): üç
       * bölüm, seçili yaprak sağdaki bölmeye kavislerle kaynaşır (şerit kabın rengiyle, `TAB_BG`);
       * sağda seçili bölümün içeriği (ya da arama sonuçları). Şerit kabın köşesi + kavis kadar
       * yukarıdan başlar (yaprağın kavsi bölmenin düz kenarına otursun).
       */}
      <Flex className={cn('flex min-h-0 flex-1 px-3 pb-3', START_PANE_BG)}>
        <Flex vertical className="w-[calc(11rem+4px)] shrink-0">
          {/* Selamlama kartı: Başlangıç'taki karşılama bandı (dolu birincil renk), yalnızca selamlama;
              şeridin üstündeki boşlukta, bölmenin köşesinden aşağıda bitecek kadar yüksek */}
          <Card
            // Soldan şeridin 4px payı kadar içeride (sekmelerle aynı hizada); sağdan ve alttan aramanın
            // altındaki boşluk kadar (0.75rem)
            className={cn(CARD, 'ms-[4px] me-3 shrink-0', band.band)}
            classNames={{ body: 'flex min-h-[4.5rem] flex-col justify-center px-3.5 py-3' }}
          >
            <Flex align="start" gap={8} className="min-w-0">
              {daytime ? (
                <Sun {...IC} size={20} className="mt-0.5 shrink-0" />
              ) : (
                <Moon {...IC} size={20} className="mt-0.5 shrink-0" />
              )}
              {/* Dar sütun: ad gerekirse ikinci satıra iner (kesilmez) */}
              <Typography.Title
                level={2}
                className="m-0! min-w-0 flex-1 font-display text-lg leading-tight font-bold text-current! line-clamp-2"
              >
                {hello}, {CURRENT_USER.firstName}.
              </Typography.Title>
            </Flex>
          </Card>
          <TabStrip
            label={START_LABELS.start}
            orientation="vertical"
            side="start"
            sizing="content"
            sheet={SHEET}
            selected={searching ? undefined : section}
            // Squircle temada da yuvarlak (çalışma alanının şeridi gibi); sekme boyu kavislere yeter
            round
            // Kartla ilk sekme arası = kartın bölmeye ve aramanın içeriğe uzaklığı (0.75rem; kart
            // bölmenin köşesinden aşağıda biter, ilk yaprağın kavsi düz kenara oturur)
            inset="pt-3 pb-2"
            // Dar sütun: adlar iki satıra sarar, ikonlar büyük (şerit = sekme eni + satırın 4px payı)
            className="shrink-0 [--tab-h:11rem] [--tab-l:4.25rem]"
          >
            <TabGroup id="start">
              {SECTIONS.map((sct) => {
                const on = !searching && sct.id === section
                return (
                  <Tab key={sct.id} id={sct.id} selected={on}>
                    <TabButton
                      label={sct.label}
                      icon={sct.icon}
                      iconSize={26}
                      lines={2}
                      current={on}
                      aria-selected={on}
                      role="tab"
                      tabIndex={on || (searching && sct.id === section) ? 0 : -1}
                      onClick={() => {
                        setQuery('')
                        setSection(sct.id)
                      }}
                      className="w-full flex-1 gap-3 ps-4"
                    />
                  </Tab>
                )
              })}
            </TabGroup>
          </TabStrip>
        </Flex>
        <Flex
          role="tabpanel"
          aria-label={searching ? START_UI.results : SECTIONS.find((x) => x.id === section)?.label}
          className="@container relative flex min-h-0 min-w-0 flex-1 flex-col rounded-3xl bg-(--tab-bg) p-3"
        >
          {/* İçerik kutunun zemininde (yüzey) bir kartta, kontursuz ve gölgesiz: bölmenin tonu kartın
              çevresinde çerçeve */}
          <Card
            className="flex min-h-0 flex-1 flex-col rounded-2xl bg-surface shadow-none ring-0"
            classNames={{ body: 'flex min-h-0 flex-1 flex-col p-4' }}
          >
            {searching ? (
              <Scroll className="-m-1 min-h-0 flex-1 p-1">{results}</Scroll>
            ) : (
              <Flex
                key={section}
                className="flex min-h-0 flex-1 flex-col animate-[fade-in_calc(0.2s*var(--motion-time,1))_ease-out]"
              >
                {panes[section]}
              </Flex>
            )}
          </Card>
        </Flex>
      </Flex>
    </>
  )
}
