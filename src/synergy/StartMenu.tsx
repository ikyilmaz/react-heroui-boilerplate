import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { usePlace } from '@/synergy/tabs/context'
import { AnimatePresence, type Transition } from 'framer-motion'
import {
  ArrowDownAZ,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  ListOrdered,
  Moon,
  Palette,
  Search,
  Star,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { Button, Flex, Typography } from 'antd'
import { togglePin, useBoxCounts, useMenuApps } from '@/synergy/shared/decisions'
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
  APPS_LABELS,
  CURRENT_USER,
  HISTORY_GROUP_LABEL,
  findApp,
  greetingOf,
  historyBoxes,
  initials,
  mainBoxes,
  pendingSentence,
  type MenuApp,
} from '@/synergy/shared/workflowData'
import { Highlight, SORT_KEY } from '@/synergy/AllApps'
import { useTransition } from '@/synergy/motion'
import { Count } from '@/synergy/ant/motion'
import { EmptyNote, SearchField } from '@/synergy/ant/parts'
import { CARD_RADIUS, IC, MotionFlex, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { useRadiusPx } from '@/synergy/shared/hooks'
import { boxLink, k, useOpenApp } from '@/synergy/paths'

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
            style={{ borderRadius: 20 }}
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

/*
 * Kutunun içeriği (uygulamanın kökü). Tek kayan sütun, üstten alta "içgörüden eyleme":
 *   1. Arama (odakta; yazınca her şey tek bir sonuç listesine döner; ↑ ↓ ile sanal vurgu, Enter açar)
 *   2. Tüm uygulamalar: tek sütun ağaç (klasörler açılır / kapanır, kılavuz çizgisi); sıra
 *      numarası ↔ alfabetik (tercih tarayıcıda, tüm uygulamalar paneliyle ortak); kutunun yarısı,
 *      kendi içinde kayar; altında çizgi
 *   3. Selamlama ve bekleyen onay cümlesi; altında iş akışı kategorileri sayılarıyla (Başlangıç'taki
 *      kategori bloklarının sayıları)
 *   4. Favoriler ↔ Son Kullanılan Uygulamalar: tek sıra ikon karosu, sığmayınca yana kayar (yıldızla
 *      sabitle / kaldır; yalnızca bu seçim karoların yerini değiştirir); 3 ve 4 çeyrek boyda, arada
 *      çizgi
 * Alt şerit yok (duyurular, sohbet ve tema sekme satırının sağındaki eylemlerde; aramada da
 * bulunurlar). Bölümler açılışta kısa aralıklarla belirir (`--motion-time` ile ölçekli); arama sonuçları
 * beklemez. Tek renk: ikon kareleri yumuşak birincil ton, üzerine gelince / seçiliyken dolu.
 */

const START_UI = {
  allApps: MENU_LABELS.allApps,
  pin: APPS_LABELS.pin,
  unpin: APPS_LABELS.unpin,
  results: 'Arama sonuçları',
} as const

/** Bölüm: 13px orta kalın başlık, sağda isteğe bağlı ek; açılışta sırayla belirir. */
function Section({
  title,
  extra,
  index = 0,
  children,
  className,
}: {
  title: ReactNode
  extra?: ReactNode
  /** Belirme sırası (gecikme = sıra × 50ms). */
  index?: number
  children: ReactNode
  className?: string
}) {
  return (
    <Flex
      role="group"
      style={{ animationDelay: `calc(${index * 50}ms * var(--motion-time, 1))` }}
      className={cn(
        'flex flex-col gap-2.5 animate-[rise_calc(0.32s*var(--motion-time,1))_ease-out_both]',
        className,
      )}
    >
      <Flex align="center" justify="space-between" gap={8} className="min-h-7 px-1">
        <Text className="text-[0.8125rem] font-medium text-muted">{title}</Text>
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
        size === 'md' ? 'size-12' : 'size-8 rounded-lg',
        on ? 'bg-accent text-accent-foreground' : 'bg-accent-soft text-accent-soft-foreground',
        className,
      )}
    >
      {Icon ? (
        <Icon {...IC} size={size === 'md' ? 22 : 16} />
      ) : (
        <Text className={cn('font-semibold text-current', size === 'md' ? 'text-sm' : 'text-[0.6875rem]')}>
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
function AppTile({
  app,
  active,
  onPress,
}: {
  app: MenuApp
  active: boolean
  onPress: () => void
}) {
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
        <Text className="line-clamp-2 w-full text-center text-xs leading-4 text-current">
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
          icon={
            <Star
              {...IC}
              size={13}
              className={cn(app.pinned && 'fill-current')}
            />
          }
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
}) {
  return (
    <Button
      ref={rowRef}
      type="text"
      onClick={onPress}
      aria-current={active ? 'page' : undefined}
      data-highlighted={highlighted || undefined}
      className={cn(
        'group/row h-11 w-full justify-start gap-3 rounded-xl! px-2 text-start font-normal text-foreground hover:bg-surface-secondary!',
        highlighted && 'bg-surface-secondary!',
      )}
    >
      <IconBox
        icon={icon}
        label={label}
        size="sm"
        on={active}
        className="group-hover/row:bg-accent group-hover/row:text-accent-foreground"
      />
      <Text className="min-w-0 flex-1 text-sm text-current truncate">
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
        'h-5 min-w-5 rounded-full px-1.5 text-center text-[0.6875rem] leading-5 font-semibold tabular-nums',
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
  return nodes.flatMap((n) =>
    n.children ? leavesOf(n.children, n.caption) : [{ n, folder }],
  )
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
        className="group/folder h-11 w-full justify-start gap-3 rounded-xl! px-2 text-start font-normal text-foreground hover:bg-surface-secondary!"
      >
        <IconBox
          icon={FolderIcon}
          label={node.caption}
          size="sm"
          on={holds}
          className={cn(!holds && 'bg-surface-secondary text-muted', 'group-hover/folder:bg-accent group-hover/folder:text-accent-foreground')}
        />
        <Text className="min-w-0 flex-1 text-sm font-medium text-current truncate">{node.caption}</Text>
        <Text className="text-xs text-muted tabular-nums">{kids.length}</Text>
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
        // Kılavuz çizgisi klasör ikonunun ortasından iner; satırlar sırayla belirir
        <Flex role="group" aria-label={node.caption} className="ms-[23px] flex flex-col gap-0.5 border-s border-border ps-2">
          {kids.map((n, i) => (
            <Flex
              key={n.id}
              role="treeitem"
              aria-selected={under(place, n.href) || undefined}
              style={{ animationDelay: `calc(${i * 30}ms * var(--motion-time, 1))` }}
              className="flex animate-[rise_calc(0.24s*var(--motion-time,1))_ease-out_both]"
            >
              <AppRow icon={n.icon} label={n.caption} active={under(place, n.href)} onPress={() => onPick(n)} />
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  )
}

function StartPanel({ actions, onClose }: { actions: StartActions; onClose: () => void }) {
  const navigate = useNavigate()
  const openApp = useOpenApp()
  const place = usePlace()
  const { favorites, recent } = useMenuApps()
  const counts = useBoxCounts()
  const dark = useIsDark()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MenuSort>(() => readJson<MenuSort>(SORT_KEY, 'order'))
  const [shelf, setShelf] = useState<'favorites' | 'recent'>('favorites')
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
  const pending = counts.get('bekleyen') ?? 0
  const [before, after = ''] = pendingSentence(pending).split(String(pending))

  const tree = useMemo(() => sortTree(MENU_TREE, sort), [sort])
  // Favorilerdeki güncel sabitleme durumu son kullanılanlarda da geçerli (`useMenuApps`)
  const shelfApps = shelf === 'favorites' ? favorites : recent.slice(0, 12)

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
        hint: folder ? <Text className="text-xs text-muted">{folder}</Text> : undefined,
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
              {b.group === 'gecmis' && <Text className="text-xs text-muted">{HISTORY_GROUP_LABEL}</Text>}
              <CountBadge value={counts.get(b.id)} />
            </>
          ),
          run: () => go(boxLink(b.id)),
        })
    for (const v of viewActions)
      if (fold(v.label).includes(q))
        out.push({ key: `view:${v.id}`, group: START_LABELS.view, icon: v.icon, label: v.label, run: () => run(v.fn) })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tree, counts, place, dark])

  useEffect(() => setHi(0), [q])
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
    } else if (e.key === 'Home' && e.target instanceof HTMLInputElement && e.target.selectionStart === 0) {
      setHi(0)
    } else if (e.key === 'End' && e.target instanceof HTMLInputElement && e.target.selectionEnd === e.target.value.length) {
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

  const home = (
    // Üç bant: Tüm uygulamalar %50 (kendi içinde kayar) | çizgi | bekleyenler %25 | çizgi | raf %25
    <Flex className="grid h-full min-h-0 grid-rows-[minmax(0,2fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] gap-3">
      {/* Tüm uygulamalar: klasörler bölüm bölüm, iki sütun; başlık sabit, liste kayar */}
      <Section
        index={0}
        className="min-h-0"
        title={START_UI.allApps}
        extra={
          <Tip label={sort === 'order' ? MENU_LABELS.sortAlphabetic : MENU_LABELS.sortOrder} placement="left">
            <Button
              type="text"
              size="small"
              aria-label={sort === 'order' ? MENU_LABELS.sortAlphabetic : MENU_LABELS.sortOrder}
              onClick={changeSort}
              icon={sort === 'order' ? <ArrowDownAZ {...IC} size={16} /> : <ListOrdered {...IC} size={16} />}
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
                <Flex key={n.id} role="treeitem" aria-selected={under(place, n.href) || undefined} className="flex">
                  <AppRow
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
      {/* Çizgi: uygulamalar üstte, bekleyenler altta */}
      <Flex aria-hidden className="block h-px bg-border" />
      {/* Selamlama ve bekleyenler: kategoriler sayılarıyla (Bekleyen Onaylar birincil tonda) */}
      <Section
        index={1}
        className="min-h-0 justify-center"
        title={
          <Flex align="center" gap={8} className="text-foreground">
            {daytime ? <Sun {...IC} size={16} className="text-muted" /> : <Moon {...IC} size={16} className="text-muted" />}
            <Text className="font-display text-base font-semibold text-foreground">
              {hello}, {CURRENT_USER.firstName}.
            </Text>
          </Flex>
        }
        extra={
          <Text className="text-xs text-muted">
            {before}
            <Text className="font-semibold text-foreground tabular-nums">{pending}</Text>
            {after}
          </Text>
        }
      >
        <Flex className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2">
          {mainBoxes.map((b) => {
            const Icon = b.icon
            const n = counts.get(b.id) ?? 0
            const lead = b.id === 'bekleyen'
            return (
              <Button
                key={b.id}
                type="text"
                onClick={() => go(boxLink(b.id))}
                aria-label={`${b.label}, ${n}`}
                className={cn(
                  'h-auto flex-col items-start gap-3 rounded-2xl! p-3 text-start font-normal whitespace-normal',
                  lead
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90! hover:text-accent-foreground!'
                    : 'bg-surface-secondary/70 text-foreground hover:bg-surface-secondary!',
                )}
              >
                <Flex align="center" justify="space-between" className="w-full">
                  <Icon {...IC} size={18} className={cn(!lead && 'text-muted')} />
                  <Text className={cn('font-display text-xl font-bold text-current tabular-nums')}>
                    <Count value={n} />
                  </Text>
                </Flex>
                <Text className="line-clamp-1 w-full text-xs text-current">{b.label}</Text>
              </Button>
            )
          })}
        </Flex>
      </Section>

      {/* Çizgi: bekleyenler üstte, raf altta */}
      <Flex aria-hidden className="block h-px bg-border" />
      {/* Favoriler ↔ Son kullanılanlar: tek sıra karo */}
      <Section
        index={2}
        className="min-h-0 justify-center"
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
                    'h-7 rounded-full px-2.5 text-[0.8125rem] font-medium',
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
            // Tek sıra: sığmayınca yana kayar (çubuk yok)
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
          >
            {shelfApps.map((a) => (
              <Flex key={a.id} role="listitem" className="flex w-24 shrink-0">
                <AppTile app={a} active={under(place, a.href)} onPress={() => goApp(a)} />
              </Flex>
            ))}
          </Flex>
        ) : (
          <Text className="px-1 text-sm text-muted">{START_LABELS.noFavorites}</Text>
        )}
      </Section>

    </Flex>
  )

  return (
    <>
      {/* Üst: arama (kutunun omurgası) */}
      <Flex onKeyDown={onKey} className="flex shrink-0 px-5 pt-5 pb-2">
        <SearchField
          autoFocus
          value={query}
          onChange={setQuery}
          label={MENU_LABELS.searchAll}
          className="h-11 min-w-0 flex-1 rounded-full px-4"
        />
      </Flex>

      {/* Orta: varsayılan görünüm kutuyu doldurur (bantlar kendi içinde kayar); arama sonuçları
          tek kayan liste; kutu `@container` */}
      {searching ? (
        <Scroll className="@container min-h-0 flex-1 px-4 py-3" role="region" aria-label={START_LABELS.start}>
          {results}
        </Scroll>
      ) : (
        <Flex className="@container block min-h-0 flex-1 px-4 py-3" role="region" aria-label={START_LABELS.start}>
          {home}
        </Flex>
      )}

    </>
  )
}
