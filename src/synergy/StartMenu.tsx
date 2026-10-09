import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { usePlace } from '@/synergy/tabs/context'
import { AnimatePresence, LayoutGroup, type Transition } from 'framer-motion'
import {
  AppWindow,
  ArrowRight,
  ChevronRight,
  LayoutDashboard,
  Boxes,
  Megaphone,
  MessageCircle,
  Moon,
  Palette,
  Search,
  Sun,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { Button, Flex, Typography } from 'antd'
import { useBoxCounts, useMenuApps } from '@/synergy/shared/decisions'
import { MENU_LABELS } from '@/synergy/shared/menuTree'
import { setColorMode, useIsDark } from '@/synergy/shared/themeSettings'
import {
  CURRENT_USER,
  HISTORY_GROUP_LABEL,
  greetingOf,
  historyBoxes,
  mainBoxes,
  pendingSentence,
  type MenuApp,
} from '@/synergy/shared/workflowData'
import { Highlight, useAppTree } from '@/synergy/AllApps'
import { useTransition } from '@/synergy/motion'
import { Indicator } from '@/synergy/ant/motion'
import { EmptyNote, SearchField } from '@/synergy/ant/parts'
import { CARD_RADIUS, IC, MotionFlex, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { useRadiusPx } from '@/synergy/shared/hooks'
import { boxLink, useOpenApp } from '@/synergy/paths'
import { WorkBlock } from '@/synergy/StartPage'

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

/**
 * Kabuk panellerinin ortak yüzeyi (raf, başlat kutusu). Köşe kartlarınki (`CARD_RADIUS`; tema
 * paneli › Köşe yuvarlaklığı): "Çok"ta raf tam hap, daha azında köşeli. Raf ve kutuda yarıçap
 * ayrıca px olarak stilde (paylaşılan geçişte framer yarıçapı ölçekte düzeltir); sınıf ilk ölçüme
 * kadar.
 */
export const CHROME_PANEL = cn(
  'pointer-events-auto rounded-[min(calc(32px*var(--corner-scale,1)),calc(var(--radius)*3))]',
  SHELL,
)

/** Sütun ve çubuk rafı: iç pay, başlat düğmesi (piksel: temanın boşluk ölçeği rafın oranını bozmasın). */
const COLUMN = {
  shell: 'flex-col items-center p-[6px]',
  start: 'size-[40px] min-w-[40px]',
  icon: 18,
}
/** Çubukta kompakt: 44px (36px daireler, 4px pay). */
const BAR = {
  shell: 'h-[44px] flex-row items-center p-[4px]',
  start: 'size-[36px] min-w-[36px]',
  icon: 16,
}
/** Yandaki kutu: dikeyde tam ortada (raf gibi; dönüşüm transform kullandığı için `my-auto` ile), ekranın %85'i boyunda. */
const SIDE_PANEL = 'inset-y-0 my-auto h-[85dvh] w-[min(44rem,calc(100vw-1.5rem))]'
/**
 * Çubuktan açılan kutu: ortadan (`mx-auto`), ekranın %55'i genişliğinde (İş Akış Yönetimi bölümündeki
 * widget'a yer; en az 44rem).
 */
const BAR_PANEL =
  'inset-x-0 mx-auto h-[clamp(30rem,70dvh,42rem)] w-[min(max(44rem,55vw),calc(100vw-1.5rem))]'

/** Rafın içi, başlat düğmesi ve açılan kutunun konumu (kutu rafın olduğu kenardan açılır). */
const PLACE: Record<ChromePlace, { shell: string; start: string; icon: number; panel: string }> = {
  left: { ...COLUMN, panel: cn('start-3', SIDE_PANEL) },
  top: { ...BAR, panel: cn('top-3', BAR_PANEL) },
  // Kompakt: sekme satırındaki 32px düğmeden sol üstte açılan kutu
  compact: {
    shell: '',
    start: 'size-[32px] min-w-[32px]',
    icon: 16,
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
  compact: 'sm:ps-3 sm:pt-3',
}

/**
 * Başka yere gidilince (seçili sekme ya da yeri değişince) başlat kutusunu kapatır. Yalnızca kutu
 * açıkken takılı: sekme geçişlerinde yalnızca bu küçük parça yeniden çizilir.
 */
function CloseOnPlace({ onChange }: { onChange: () => void }) {
  const place = usePlace()
  const opened = useRef(place)
  useEffect(() => {
    if (place !== opened.current) onChange()
  }, [place, onChange])
  return null
}

/**
 * Raf (StartMenu): kendi başına bir panel; içeriği kabuk verir (`children(start)`: `start` başlat
 * düğmesi). Başlat düğmesine basınca raf paylaşılan yerleşimle (`layoutId`) başlat kutusuna
 * dönüşür, kapanınca yine rafa küçülür. Raf açıkken yerini aynı boyda boş bir tutucu korur (yanındaki
 * paneller kıpırdamaz).
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
  const [holder, setHolder] = useState<{ w: number; h: number } | null>(null)
  const wasOpen = useRef(false)
  const p = PLACE[place]

  // Kapanınca odak düğmeye döner (ilk açılışta değil)
  useEffect(() => {
    if (!open && wasOpen.current) trigger.current?.focus()
    wasOpen.current = open
  }, [open])

  const openStart = () => {
    const r = dockRef.current?.getBoundingClientRect()
    setHolder(r ? { w: r.width, h: r.height } : null)
    setOpen(true)
  }
  // İçerik dönüşüm sırasında gizli, bitmeye yakın belirir (ölçeklenirken ezik görünmesin)
  const content = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { delay: 0.12, duration: 0.18 } },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  }
  const start = (
    <Tip label={START_LABELS.start} placement={CHROME_TIP[place]}>
      <Button
        ref={trigger}
        type="primary"
        shape="circle"
        aria-label={START_LABELS.start}
        aria-expanded={false}
        onClick={openStart}
        icon={<LayoutDashboard {...IC} size={p.icon} />}
        className={cn(
          'shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90',
          p.start,
        )}
      />
    </Tip>
  )
  const body = (
    <>
      {/* Raf açıkken yerini koruyan boş tutucu */}
      {open && holder && (
        // `block`: antd'de içi boş `Flex` gizlenir
        <Flex
          aria-hidden
          className="block shrink-0"
          style={{ width: holder.w, height: holder.h }}
        />
      )}
      {/* `popLayout`: çıkan raf / kutu solarken akıştan çıkar (yerini tutucu korur, sütun kaymaz) */}
      <AnimatePresence initial={false} mode="popLayout">
        {!open && compact ? (
          // Kompakt: dönüşen öğe başlat düğmesinin kendisi
          <MotionFlex
            key="dock"
            ref={dockRef}
            layoutId="start-menu"
            layoutDependency={layoutKey}
            transition={morph}
            style={{ borderRadius: 16 }}
            className="flex shrink-0"
          >
            {start}
          </MotionFlex>
        ) : !open ? (
          <MotionFlex
            key="dock"
            ref={dockRef}
            layoutId="start-menu"
            layoutDependency={layoutKey}
            transition={morph}
            style={radius}
            role="navigation"
            aria-label="Ana menü"
            className={cn('flex shrink-0', p.shell, CHROME_PANEL)}
          >
            <MotionFlex
              key={`dock-${cycle.current}`}
              {...content}
              // Raf boyu değişince (alt seviyeler eklenince) içerik ezilmesin; raf ile aynı yay
              layout
              layoutDependency={layoutKey}
              transition={morph}
              className={cn(
                'relative flex gap-1',
                isColumn(place) ? 'flex-col items-center' : 'items-center',
              )}
            >
              {children}
            </MotionFlex>
          </MotionFlex>
        ) : (
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
            <MotionFlex
              layoutId="start-menu"
              transition={morph}
              style={radius}
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
              className={cn(
                // Sabit boy (`PLACE`): bölüm değişince kutu zıplamaz
                'fixed z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden',
                p.panel,
                CHROME_PANEL,
              )}
            >
              <MotionFlex
                key={`panel-${cycle.current}`}
                {...content}
                className="flex min-h-0 flex-1 flex-col"
              >
                <StartPanel actions={actions} onClose={() => setOpen(false)} />
              </MotionFlex>
            </MotionFlex>
          </Flex>
        )}
      </AnimatePresence>
    </>
  )
  if (compact) return body
  // Başlat düğmesi kendi beyaz kartında yüzer (rafın önünde: solda üstünde, üstte solunda)
  return (
    <Flex className={cn('flex shrink-0 items-center gap-2', column && 'flex-col')}>
      <Flex className={cn('flex shrink-0', column ? 'p-[6px]' : 'p-[4px]', CHROME_PANEL)}>
        {start}
      </Flex>
      {body}
    </Flex>
  )
}

/* --- Başlat kutusu ----------------------------------------------------------------------------- */

type Section = 'overview' | 'workflow' | 'apps' | 'view'

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: START_LABELS.overview, icon: LayoutDashboard },
  { id: 'workflow', label: START_LABELS.workflow, icon: Workflow },
  { id: 'apps', label: START_LABELS.apps, icon: Boxes },
  { id: 'view', label: START_LABELS.view, icon: Palette },
]

function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <Flex align="center" justify="space-between" className="min-h-7">
      <Text className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
        {children}
      </Text>
      {extra}
    </Flex>
  )
}

/** Uygulama satırı: ikon karosu, ad (aramada vurgulu), sağda ok. */
function AppRow({
  icon: Icon = AppWindow,
  label,
  query,
  hint,
  onPress,
}: {
  icon?: LucideIcon
  label: string
  query: string
  /** Sağda soluk küçük not (ör. bölüm adı ya da sayı). */
  hint?: ReactNode
  onPress: () => void
}) {
  return (
    <Button
      type="text"
      onClick={onPress}
      className="group h-12 w-full justify-start gap-3 rounded-2xl! px-2 text-start font-normal text-foreground hover:bg-surface-secondary!"
    >
      <Flex className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-foreground/70 transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
        <Icon {...IC} size={17} />
      </Flex>
      <Text className="min-w-0 flex-1 truncate text-sm text-current">
        <Highlight text={label} query={query} />
      </Text>
      {hint}
      <ChevronRight
        {...IC}
        size={16}
        aria-hidden
        className="shrink-0 text-muted opacity-0 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"
      />
    </Button>
  )
}

/** Sayı notu (satırın sağında). */
function CountHint({ value }: { value: number | undefined }) {
  if (!value) return null
  return <Text className="text-xs text-muted tabular-nums">{value}</Text>
}

function StartPanel({ actions, onClose }: { actions: StartActions; onClose: () => void }) {
  const navigate = useNavigate()
  const { favorites, recent } = useMenuApps()
  const counts = useBoxCounts()
  const dark = useIsDark()
  const tree = useAppTree(onClose)
  // Kutu hep Uygulamalar bölümüyle açılır
  const [section, setSection] = useState<Section>('apps')
  const q = fold(tree.query.trim())
  const searching = !!q
  const hit = (label: string) => fold(label).includes(q)
  const go = (href: string) => {
    navigate(href)
    onClose()
  }
  const openApp = useOpenApp()
  const goApp = (app: MenuApp) => {
    openApp(app)
    onClose()
  }
  const run = (fn: () => void) => {
    onClose()
    fn()
  }
  const pending = counts.get('bekleyen') ?? 0
  const now = new Date()
  const { text: hello } = greetingOf(now)
  const [before, after = ''] = pendingSentence(pending).split(String(pending))

  const viewActions = [
    { id: 'theme', icon: Palette, label: START_LABELS.themeSettings, fn: actions.onTheme },
    {
      id: 'mode',
      icon: dark ? Sun : Moon,
      label: dark ? START_LABELS.light : START_LABELS.dark,
      fn: () => setColorMode(dark ? 'light' : 'dark'),
    },
  ]

  /* Bölümler ------------------------------------------------------------------------------------ */

  const overview = (
    <Flex className="flex flex-col gap-5">
      {/* Selamlama: başlangıçtaki cümle; bekleyen onaylara tek tıkla */}
      <Flex className="flex flex-col gap-3 rounded-3xl bg-accent-soft p-4 text-accent-soft-foreground">
        <Flex className="flex items-center gap-2">
          {greetingOf(now).daytime ? <Sun {...IC} size={18} /> : <Moon {...IC} size={18} />}
          <Text className="font-display text-xl font-bold text-current">
            {hello}, {CURRENT_USER.firstName}.
          </Text>
        </Flex>
        <Text className="text-sm text-current">
          {before}
          <Text className="font-semibold text-current">{pending}</Text>
          {after}
        </Text>
        <Button
          type="primary"
          onClick={() => go(boxLink('bekleyen'))}
          iconPlacement="end"
          icon={<ArrowRight {...IC} size={14} />}
          className="h-8 w-fit gap-1.5 rounded-full px-3 text-sm bg-accent text-accent-foreground hover:bg-accent/90"
        >
          {START_LABELS.pendingBox}
        </Button>
      </Flex>

      <Flex className="flex flex-col gap-1">
        <SectionTitle>{START_LABELS.favorites}</SectionTitle>
        {favorites.length ? (
          <Flex className="grid gap-x-2 sm:grid-cols-2">
            {favorites.map((a) => (
              <AppRow
                key={a.id}
                icon={a.icon}
                label={a.caption}
                query=""
                onPress={() => goApp(a)}
              />
            ))}
          </Flex>
        ) : (
          <Text className="text-sm text-muted">{START_LABELS.noFavorites}</Text>
        )}
      </Flex>

      <Flex className="flex flex-col gap-1">
        <SectionTitle>{START_LABELS.recent}</SectionTitle>
        <Flex className="flex flex-wrap gap-1.5">
          {recent.slice(0, 6).map((a) => {
            const Icon = a.icon ?? AppWindow
            return (
              <Button
                key={a.id}
                type="text"
                onClick={() => goApp(a)}
                icon={<Icon {...IC} size={14} className="text-muted" />}
                className="h-8 gap-1.5 rounded-full bg-surface-secondary px-3 font-normal text-foreground hover:bg-surface-tertiary!"
              >
                {a.caption}
              </Button>
            )
          })}
        </Flex>
      </Flex>
    </Flex>
  )

  // Başlangıç'taki İş Akışları widget'ı (kategoriler, süreç grupları ↔ talepler); kendi göstergesi
  // (`layoutId`) Başlangıç'takiyle karışmasın diye ayrı grupta. Talebe gidince kutu kapanır (adres)
  const workflow = (
    <LayoutGroup id="start-menu-work">
      <WorkBlock />
    </LayoutGroup>
  )

  const sortButton = (
    <Tip label={tree.sortLabel} placement="left">
      <Button
        type="text"
        aria-label={tree.sortLabel}
        onClick={tree.changeSort}
        icon={<tree.SortIcon {...IC} size={16} />}
        className="size-8 min-w-8 text-muted"
      />
    </Tip>
  )
  const apps = (
    <Flex className="flex flex-col gap-1">
      <SectionTitle extra={sortButton}>{MENU_LABELS.allApps}</SectionTitle>
      {tree.list}
    </Flex>
  )

  const view = (
    <Flex className="flex flex-col gap-5">
      {/* Açık / koyu: iki büyük seçim kartı; seçili olan birincil renk çerçeveli */}
      <Flex className="grid grid-cols-2 gap-2">
        {(
          [
            { id: 'light', label: START_LABELS.light, icon: Sun },
            { id: 'dark', label: START_LABELS.dark, icon: Moon },
          ] as const
        ).map((m) => {
          const on = (m.id === 'dark') === dark
          return (
            <Button
              key={m.id}
              type="text"
              aria-pressed={on}
              onClick={() => setColorMode(m.id)}
              className={cn(
                'h-24 w-full flex-col gap-2 rounded-2xl! font-normal',
                on
                  ? 'bg-accent-soft text-accent-soft-foreground ring-2 ring-accent hover:bg-accent-soft! hover:text-accent-soft-foreground!'
                  : 'bg-surface-secondary text-foreground hover:bg-surface-tertiary!',
              )}
            >
              <m.icon {...IC} size={22} />
              <Text className="text-sm font-medium text-current">{m.label}</Text>
            </Button>
          )
        })}
      </Flex>
      <Flex className="flex flex-col gap-1">
        <AppRow
          icon={Palette}
          label={START_LABELS.themeSettings}
          query=""
          onPress={() => run(actions.onTheme)}
        />
      </Flex>
    </Flex>
  )

  /* Arama: bölümlerden bağımsız tek liste ------------------------------------------------------- */

  const boxHits = [...mainBoxes, ...historyBoxes].filter((b) => hit(b.label))
  const viewHits = viewActions.filter((v) => hit(v.label))
  const results =
    boxHits.length || viewHits.length || tree.list ? (
      <Flex className="flex flex-col gap-5">
        {tree.list && (
          <Flex className="flex flex-col gap-1">
            <SectionTitle>{START_LABELS.apps}</SectionTitle>
            {tree.list}
          </Flex>
        )}
        {boxHits.length > 0 && (
          <Flex className="flex flex-col gap-1">
            <SectionTitle>{START_LABELS.workflow}</SectionTitle>
            {boxHits.map((b) => (
              <AppRow
                key={b.id}
                icon={b.icon}
                label={b.label}
                query={tree.query}
                hint={
                  <>
                    {/* Geçmiş kutuları adıyla karışmasın (ör. "Onaylar") */}
                    {b.group === 'gecmis' && (
                      <Text className="text-xs text-muted">{HISTORY_GROUP_LABEL}</Text>
                    )}
                    <CountHint value={counts.get(b.id)} />
                  </>
                }
                onPress={() => go(boxLink(b.id))}
              />
            ))}
          </Flex>
        )}
        {viewHits.length > 0 && (
          <Flex className="flex flex-col gap-1">
            <SectionTitle>{START_LABELS.view}</SectionTitle>
            {viewHits.map((v) => (
              <AppRow
                key={v.id}
                icon={v.icon}
                label={v.label}
                query={tree.query}
                onPress={() => run(v.fn)}
              />
            ))}
          </Flex>
        )}
      </Flex>
    ) : (
      <EmptyNote text={MENU_LABELS.noResult} icon={Search} />
    )

  const body = searching ? results : { overview, workflow, apps, view }[section]

  return (
    <>
      {/* Üst: geniş arama, duyurular ve sohbet */}
      <Flex className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-3">
        <SearchField
          autoFocus
          value={tree.query}
          onChange={tree.setQuery}
          label={MENU_LABELS.searchAll}
          className="h-11 min-w-0 flex-1 rounded-full px-4"
        />
        {(
          [
            { id: 'news', label: START_LABELS.news, icon: Megaphone },
            { id: 'chat', label: START_LABELS.chat, icon: MessageCircle },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <Tip key={id} label={label} placement="bottom">
            <Button
              type="text"
              shape="circle"
              aria-label={label}
              onClick={() => run(() => actions.onPanel(id))}
              icon={<Icon {...IC} size={18} />}
              className="size-11 min-w-11 rounded-full bg-surface-secondary text-foreground/70 hover:bg-surface-secondary! hover:text-foreground!"
            />
          </Tip>
        ))}
      </Flex>

      <Flex className="flex min-h-0 flex-1 gap-3 px-3 pb-3">
        {/* Sol: bölümler, yalnızca ikon (ad ipucunda); aramada bölüm seçimi geri planda */}
        <Flex
          role="group"
          aria-label={START_LABELS.start}
          className="flex shrink-0 flex-col gap-1 rounded-3xl bg-surface-secondary/60 p-1.5"
        >
          {SECTIONS.map((sct) => {
            const on = !searching && sct.id === section
            const Icon = sct.icon
            return (
              <Tip key={sct.id} label={sct.label} placement="right">
                <Button
                  aria-pressed={on}
                  aria-label={sct.label}
                  type="text"
                  onClick={() => {
                    tree.setQuery('')
                    setSection(sct.id)
                  }}
                  className={cn(
                    'relative size-11 min-w-11 rounded-2xl! p-0',
                    on
                      ? 'text-accent hover:bg-transparent! hover:text-accent!'
                      : 'text-foreground/65 hover:text-foreground!',
                  )}
                >
                  {on && (
                    <Indicator
                      id="start-section"
                      className="bg-surface shadow-[0_1px_3px_color-mix(in_oklab,var(--foreground)_12%,transparent)]"
                    />
                  )}
                  <Icon {...IC} size={18} className="relative shrink-0" />
                </Button>
              </Tip>
            )
          })}
        </Flex>

        {/* Sağ: seçili bölüm (ya da arama sonuçları); değişince hafifçe solarak gelir */}
        {/* İş Akış Yönetimi kutunun kalanını doldurur (widget'ın sütunları kendi içinde kayar) */}
        <Scroll className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
          <Flex
            key={searching ? 'search' : section}
            className={cn(
              'block animate-[fade-in_calc(0.2s*var(--motion-time,1))_ease-out]',
              !searching && section === 'workflow' && 'h-full',
            )}
          >
            {body}
          </Flex>
        </Scroll>
      </Flex>
    </>
  )
}
