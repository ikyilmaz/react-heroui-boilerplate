import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, matchPath, useLocation, useNavigate } from 'react-router'
import {
  AutoComplete,
  Avatar,
  Button,
  Divider,
  Drawer,
  Dropdown,
  Flex,
  Image,
  Input,
  Popover,
  Typography,
} from 'antd'
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FileText,
  FolderOpen,
  House,
  Megaphone,
  Menu,
  MessageCircle,
  Moon,
  Palette,
  Search,
  Sun,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import {
  CURRENT_USER,
  avatarColor,
  findBox,
  findProcess,
  initials,
  menuApps,
} from '@/synergy/shared/workflowData'
import { BASE, FrameContext, k, type Crumb, type Frame } from '@/synergy/paths'
import { useMediaQuery, useRouteHistory } from '@/synergy/shared/hooks'
import {
  LookContext,
  SettingsContext,
  setColorMode,
  useIsDark,
  useLook,
  useThemeSettings,
  type TrailStyle,
} from '@/synergy/shared/themeSettings'
import { ThemePanel } from '@/synergy/shared/ThemePanel'
import { APP_THEME } from '@/synergy/theme'
import { PARENTS, findModule } from '@/synergy/hr/modules'
import { MotionScope, PageTransition, useTransition } from '@/synergy/motion'
import { AnimatePresence } from 'framer-motion'
import { AllAppsButton, AllAppsHandle, AllAppsPanel } from '@/synergy/AllApps'
import {
  CHROME_SPACE,
  DOCK_SPRING,
  StartDock,
  type ChromePlace,
  type StartActions,
} from '@/synergy/StartMenu'
import { AntTheme } from '@/synergy/ant/theme'
import { CARD, IC, MotionFlex, Tip, cn } from '@/synergy/ant/ui'
import { Indicator } from '@/synergy/ant/motion'
import brandIcon from '@/synergy/assets/brand/icon.svg'
import brandIconDark from '@/synergy/assets/brand/icon-dark.svg'
import brandWordmark from '@/synergy/assets/brand/wordmark.svg'
import brandWordmarkLight from '@/synergy/assets/brand/wordmark-light.svg'

/*
 * Kabuk: üst çubuk (logo, geri / ileri, raf, eylemler, kullanıcı) ya da solda dikeyde ortada
 * yüzen raf (StartMenu.tsx: tepede başlat kutusu; konum Başlangıç'tan çıkan haplar, `DockPath`). Sayfalar konumunu `useFrame`
 * ile bildirir. 640px altında raf çekmeceye taşınır.
 */

interface DockEntry {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  /** Seçili sayılacağı adres öneki. */
  match?: string
}

/** Orijinal sol menünün sabit uygulamaları; sayfası olmayanlar gezinmez. */
const dockEntries: DockEntry[] = [
  { id: 'geri', label: 'Ana sayfaya dön', icon: ChevronLeft, href: '/' },
  { id: 'baslangic', label: 'Başlangıç', icon: House, href: BASE, match: BASE },
  { id: 'dokumanlar', label: 'Dokümanlar', icon: FolderOpen },
  {
    id: 'is-akis-yonetimi',
    label: 'İş Akış Yönetimi',
    icon: Workflow,
    href: '/is-akislari',
    match: '/is-akislari',
  },
  {
    id: 'insan-kaynaklari',
    label: 'İnsan Kaynakları',
    icon: Users,
    href: '/insan-kaynaklari',
    match: '/insan-kaynaklari',
  },
]

const fold = (v: string) => v.toLocaleLowerCase('tr')

/** İnce kart çizgisi, gölgesiz (küçük haplar; tema paneli › Kontur). */
const card = 'ring-(length:--border-width) ring-border'

/** Baş harfli uygulama rozetinin tonu (`avatarColor`, isme göre sabit). */
const AVATAR_TONE: Record<ReturnType<typeof avatarColor>, string> = {
  success: 'bg-success/15 text-success',
  accent: 'bg-accent-soft text-accent-soft-foreground',
  default: 'bg-surface-tertiary text-foreground',
}

/** Kullanıcı avatarı (baş harfler, birincil renkte). */
function UserAvatar({ size, className }: { size: number; className?: string }) {
  return (
    <Avatar
      size={size}
      aria-label={CURRENT_USER.name}
      className={cn(
        'inline-flex! shrink-0 items-center justify-center bg-accent font-semibold text-accent-foreground',
        className,
      )}
    >
      {initials(CURRENT_USER.name)}
    </Avatar>
  )
}

/** Marka işareti (Bimser Synergy): dört renkli kare, ortada göbek; koyu temada göbek beyaz. */
function LogoMark({ size = 34 }: { size?: number }) {
  const dark = useIsDark()
  return (
    <Image
      src={dark ? brandIconDark : brandIcon}
      alt=""
      preview={false}
      width={size}
      height={size}
      rootClassName="block shrink-0"
    />
  )
}

/** Yazı logosu ("bimser synergy"); koyu temada beyaz. */
function Wordmark({ height, className }: { height: number; className?: string }) {
  const dark = useIsDark()
  return (
    <Image
      src={dark ? brandWordmarkLight : brandWordmark}
      alt=""
      preview={false}
      height={height}
      rootClassName={cn('shrink-0', className)}
    />
  )
}

/* --- Üst çubuk --------------------------------------------------------------------------------- */

/** Uygulama araması (orijinal modules/search): menü uygulamalarında arar, "Uygulamalar" altında. */
function AppSearch({ autoFocus = false, onPick }: { autoFocus?: boolean; onPick?: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const results = q ? menuApps.filter((a) => fold(a.caption).includes(q)) : []
  return (
    <AutoComplete
      value={query}
      onChange={setQuery}
      // Seçimden sonra (değişiklik olayı seçimden önce gelir) arama temizlenir
      onSelect={(key: string) => {
        const app = menuApps.find((a) => a.id === key)
        if (!app) return
        setQuery('')
        onPick?.()
        navigate(k(app.href))
      }}
      showSearch={{ filterOption: false }}
      options={
        results.length
          ? [
              {
                label: 'Uygulamalar',
                options: results.map(({ id, caption, icon: Icon }) => ({
                  value: id,
                  label: (
                    <Flex align="center" className="gap-2">
                      {Icon ? (
                        <Icon {...IC} className="shrink-0" />
                      ) : (
                        <Avatar
                          size={24}
                          aria-hidden
                          className={cn(
                            'inline-flex! shrink-0 items-center justify-center text-[0.625rem] font-semibold',
                            AVATAR_TONE[avatarColor(caption)],
                          )}
                        >
                          {initials(caption)}
                        </Avatar>
                      )}
                      <Typography.Text ellipsis className="min-w-0 text-current">
                        {caption}
                      </Typography.Text>
                    </Flex>
                  ),
                })),
              },
            ]
          : []
      }
      // Yazarken sonuç yoksa boş durum; arama boşken liste açılmaz
      notFoundContent={
        q ? (
          <Typography.Text type="secondary" className="block py-4 text-center">
            Kullanılabilir öğe yok.
          </Typography.Text>
        ) : null
      }
      className="w-90 max-w-full"
    >
      <Input
        aria-label="Ara"
        placeholder="Ara"
        autoFocus={autoFocus}
        prefix={<Search {...IC} className="text-muted" />}
        className="min-w-0 bg-surface"
      />
    </AutoComplete>
  )
}

/** Konum ikonunun anahtarından ikonu (`Crumb.icon`). */
function crumbIcon(key: string | undefined): LucideIcon | undefined {
  if (!key) return undefined
  if (key === 'home') return House
  if (key === 'workflow') return Workflow
  if (key === 'request') return FileText
  if (key === 'hr') return Users
  if (key === 'hr-record') return FileText
  const [kind, id] = key.split(':')
  if (kind === 'box') return findBox(id)?.icon
  if (kind === 'process') return findProcess(id)?.icon
  if (kind === 'app') return menuApps.find((a) => a.id === id)?.icon
  if (kind === 'hr') return findModule(id)?.icon
  if (kind === 'hr-parent') return PARENTS[id as keyof typeof PARENTS]?.icon
  return undefined
}

/**
 * Konum bölümü. Önceki konumlar yalnızca ikon (adı ipucunda ve ekran okuyucuda), bulunulan yer dolu
 * birincil renkte ve adıyla açık. Bölüm sıraya göre anahtarlı olduğundan aynı öğe kalır:
 * - bulunulan yer değişince eski bölümün adı solarak büzülür, zemini birincil renkten yüzeye döner
 *   (yukarı çıkınca tersi: ad açılır, zemin dolar);
 * - aynı sıradaki konum değişince (ör. başka süreç) hap yerinde kalır, yalnızca ikon ve ad kısa bir
 *   solmayla yenilenir (ilk kurulumda değil; girişi `Crumbs` oynatır).
 */
function CrumbPart({ c, current }: { c: Crumb; current: boolean }) {
  const Icon = crumbIcon(c.icon)
  const open = current || !Icon
  // Ad değişince (aynı sırada başka konum) içerik yenilenme animasyonuyla yeniden kurulur; ilk
  // kurulumda oynamaz. Bir kez değişince sınıf kalır (aynı öğede yeniden oynamaz)
  const prevLabel = useRef(c.label)
  const swapped = useRef(false)
  if (prevLabel.current !== c.label) {
    swapped.current = true
    prevLabel.current = c.label
  }
  const part = (
    <Flex
      align="center"
      className={cn(
        'h-7 min-w-0 rounded-full px-1.75 text-sm whitespace-nowrap transition-[background-color,color,box-shadow] duration-[calc(240ms*var(--motion-time,1))] ease-out',
        current
          ? 'bg-accent font-semibold text-accent-foreground'
          : cn(
              'bg-surface text-muted group-hover:bg-surface-secondary group-hover:text-foreground',
              card,
            ),
      )}
    >
      <Flex
        key={c.label}
        align="center"
        className={cn('min-w-0', swapped.current && 'animate-crumb-swap')}
      >
        {Icon && <Icon {...IC} size={14} className="shrink-0" />}
        <Flex
          className={cn(
            'grid min-w-0 transition-[grid-template-columns] duration-[calc(300ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
            open ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]',
          )}
        >
          <Typography.Text
            className={cn(
              'min-w-0 overflow-hidden text-current transition-opacity duration-[calc(180ms*var(--motion-time,1))]',
              current ? 'max-w-[28rem]' : 'max-w-80',
              open ? 'opacity-100' : 'opacity-0',
            )}
          >
            {/* İç boşluk kırpılan kutunun içinde: kapanınca hap tam yuvarlak kalır */}
            <Typography.Text className={cn('block truncate text-current', Icon && 'ps-1.5 pe-1')}>
              {c.label}
            </Typography.Text>
          </Typography.Text>
        </Flex>
      </Flex>
    </Flex>
  )
  // Yapı hep aynı (ipucu + bağlantı) ki bulunulan yer değişince öğe yeniden kurulmasın ve ad
  // büzülme / açılma geçişi oynasın; adresi olmayan bölüm (ör. süreç) pasif bağlantı
  const disabled = !c.href
  return (
    <Tip label={c.label} placement="bottom" disabled={open}>
      <Link
        to={c.href ?? '.'}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(e) => {
          if (disabled) e.preventDefault()
        }}
        aria-current={current ? 'page' : undefined}
        aria-label={c.label}
        // Basınca hafifçe içe göçer (büyüme yok)
        className="group flex rounded-full no-underline transition-transform duration-150 hover:no-underline active:scale-95 aria-disabled:cursor-default aria-disabled:active:scale-100"
      >
        {part}
      </Link>
    </Tip>
  )
}

/** Çıkan bölümün solma süresi (ms; hız çarpanıyla bölünür). */
const CRUMB_OUT_MS = 180

/**
 * Konum çubuğu: ayrı küçük haplar (28px), aralarında sağ ok; tüm konum hep görünür (önceki
 * konumlar ikon). Animasyonlar:
 * - yeni bölüm (derine inince) okuyla birlikte soldan hafifçe kayıp büyüyerek belirir;
 * - çıkan bölüm (yukarı çıkınca) kısa süre yerinde küçülerek solar, sonra kalkar; sondan çıktığı
 *   için diğer bölümler kıpırdamaz;
 * - bölümlerin kendi değişimleri `CrumbPart`'ta (ad büzülmesi, renk, yenilenme).
 * Kademeli (stagger) giriş yok; animasyon kapalıyken hepsi anında.
 */
/**
 * Breadcrumb'ın başında geri / ileri: yalnızca uygulamanın rota geçmişine göre. `compact`: konum
 * çubuğundaki haplarla aynı boy (28px); kabukta 32px.
 */
function HistoryButtons({ className, compact }: { className?: string; compact?: boolean }) {
  const navigate = useNavigate()
  const { canBack, canForward } = useRouteHistory()
  return (
    <Flex
      align="center"
      className={cn('shrink-0 rounded-full bg-surface p-0.5', 'me-2', card, className)}
    >
      {(
        [
          { label: 'Geri', icon: ChevronLeft, go: -1, on: canBack },
          { label: 'İleri', icon: ChevronRight, go: 1, on: canForward },
        ] as const
      ).map(({ label, icon: Icon, go, on }) => (
        <Tip key={label} label={label} placement="bottom">
          <Button
            type="text"
            size="small"
            aria-label={label}
            disabled={!on}
            onClick={() => navigate(go)}
            icon={<Icon {...IC} size={compact ? 14 : 16} />}
            className={cn(
              'rounded-full p-0 text-muted enabled:hover:bg-surface-secondary enabled:hover:text-foreground disabled:opacity-50',
              compact ? 'size-6 min-w-6' : 'size-7 min-w-7',
            )}
          />
        </Tip>
      ))}
    </Flex>
  )
}

function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  const look = useLook()
  // Tek bölüm de gösterilir (Başlangıç: ev ikonlu bulunulan yer); derine inince ikona büzülür
  const key = JSON.stringify(crumbs)
  const [state, setState] = useState({ key, list: crumbs, tail: NO_CRUMBS })
  if (state.key !== key) {
    // Sondan düşen bölümler solarak çıksın diye kısa süre tutulur
    const tail = state.list.length > crumbs.length ? state.list.slice(crumbs.length) : NO_CRUMBS
    setState({ key, list: crumbs, tail })
  }
  const tail = state.tail
  useEffect(() => {
    if (!tail.length) return
    const ms = look.motion === 'off' ? 0 : CRUMB_OUT_MS / look.speed
    const t = window.setTimeout(() => setState((s) => ({ ...s, tail: NO_CRUMBS })), ms)
    return () => window.clearTimeout(t)
  }, [tail, look.motion, look.speed])

  const items = [
    ...crumbs.map((c) => ({ c, leaving: false })),
    ...tail.map((c) => ({ c, leaving: true })),
  ]
  return (
    <Flex role="navigation" aria-label="Konum" align="center" className="min-w-0">
      {/* Geri / ileri her zaman görünür (tek bölümlü sayfada da) */}
      <HistoryButtons compact />
      <Flex role="list" align="center" className="min-w-0 flex-nowrap">
        {items.map(({ c, leaving }, i) => (
          // Sıraya göre anahtarlı: bölüm yerinde kalır; yalnızca yeni sıra girer, düşen sıra çıkar
          <Flex
            key={i}
            role={leaving ? undefined : 'listitem'}
            aria-hidden={leaving || undefined}
            align="center"
            className={cn(
              'origin-left',
              // Bulunulan yer (son bölüm) dar alanda kısalır; öncekiler ikon, küçülmez
              i === crumbs.length - 1 ? 'min-w-0 shrink' : 'shrink-0',
              leaving ? 'pointer-events-none animate-crumb-out' : 'animate-crumb-in',
            )}
          >
            {i > 0 && <ChevronRight {...IC} size={14} className="mx-0.5 shrink-0 text-muted/60" />}
            <CrumbPart c={c} current={!leaving && i === crumbs.length - 1} />
          </Flex>
        ))}
      </Flex>
    </Flex>
  )
}

const NO_CRUMBS: Crumb[] = []

/**
 * Üstteki ince konum çubuğu (Gezinme › İkisi de): sol kolonun yanından başlar, logoyla aynı hizada;
 * geri / ileri ve konum (`Crumbs`: önceki seviyeler ikon, bulunulan yer adıyla, girip çıkan
 * seviyeler animasyonlu). Arkasında sayfa renginde şerit: kaydırılan içerik altında
 * karışmasın; şerit içeriğin başladığı yerin (14 birim, `CHROME_SPACE.both`) 1 birim üstünde biter:
 * kartın konturu (`ring`) ve gölgesi kutunun dışına çizilir, tam başlangıçta bitseydi kartların üst
 * çizgisini örterdi. Aynı birimle (`--spacing`), yoksa yoğunluk değişince yine örterdi. Kutu logo
 * boyunda (34px, üstten 3 birim), 28px haplar içinde dikeyde ortalı: logoyla aynı hizada. Şeridin zemin dokusu görüntü alanına sabit (`bg-fixed`): sayfanın doku katmanıyla aynı
 * hizada, ek görünmez. Sol kolonun
 * (`z-50`) altında (`z-40`): başlat kutusu açılınca karartma ve kutu çubuğun da üstünde; sayfanın
 * yapışkan öğeleri (`z-30`) çubuğun altında.
 */
function CrumbBar({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Flex
      align="center"
      className="pointer-events-none fixed start-[76px] end-3 top-3 z-40 hidden h-[34px] min-w-0 before:absolute before:-start-3 before:-end-3 before:-top-3 before:h-[calc(var(--spacing)*13)] before:-z-10 before:bg-background before:bg-(image:--background-texture) before:bg-size-(--background-texture-size) before:bg-fixed before:content-[''] sm:flex"
    >
      <Flex className="pointer-events-auto min-w-0">
        <Crumbs crumbs={crumbs} />
      </Flex>
    </Flex>
  )
}

function TopBar({
  crumbs,
  onMenu,
  panel,
  onPanel,
}: {
  crumbs: Crumb[]
  onMenu: () => void
  panel: 'news' | 'chat' | null
  onPanel: (panel: 'news' | 'chat' | null) => void
}) {
  return (
    <Flex role="banner" align="center" className="h-16 gap-4 px-4 sm:px-6">
      <Button
        type="text"
        aria-label="Menü"
        onClick={onMenu}
        icon={<Menu {...IC} size={20} />}
        className="size-10 sm:hidden"
      />
      <Link
        to={BASE}
        aria-label="Bimser Synergy"
        className="flex shrink-0 items-center gap-2.5 no-underline"
      >
        <LogoMark />
        <Wordmark height={20} className="hidden md:block" />
      </Link>

      <Flex className="hidden min-w-0 flex-1 xl:flex">
        <Crumbs crumbs={crumbs} />
      </Flex>

      <Flex align="center" className="ms-auto gap-1">
        <SearchButton />
        <PanelButton
          label="Sohbet"
          icon={MessageCircle}
          isOpen={panel === 'chat'}
          onOpenChange={(o) => onPanel(o ? 'chat' : null)}
        />
        <PanelButton
          label="Duyurular"
          icon={Megaphone}
          isOpen={panel === 'news'}
          onOpenChange={(o) => onPanel(o ? 'news' : null)}
        />
        <Tip label={`${CURRENT_USER.name} · ${CURRENT_USER.department}`} placement="bottom">
          <UserAvatar size={40} className="ms-2" />
        </Tip>
      </Flex>
    </Flex>
  )
}

/**
 * Üst çubuktaki ikon düğmesi ve açtığı küçük panel; ipucu ve erişilebilir ad aynı etiketten.
 * antd'de ipucu ve açılır panel aynı tetikleyiciyi paylaşamaz: panel bir `Flex`'e sarılır, ipucu
 * onun çevresinde.
 */
function BarButton({
  label,
  icon: Icon,
  tip = 'bottom',
  open,
  onOpenChange,
  placement,
  popupClassName,
  content,
  compact = false,
}: {
  label: string
  icon: LucideIcon
  tip?: 'bottom' | 'right'
  open: boolean
  onOpenChange: (open: boolean) => void
  placement: 'bottomRight' | 'rightBottom'
  popupClassName: string
  content: ReactNode
  /** Kompakt üst çubuk (Gezinme › Üstte): 32px düğme. */
  compact?: boolean
}) {
  return (
    <Tip label={label} placement={tip}>
      <Flex className="inline-flex">
        <Popover
          open={open}
          onOpenChange={onOpenChange}
          trigger="click"
          placement={placement}
          arrow={false}
          // Kapanınca içerik kalkar: yeniden açılınca odak yine aramaya gelir
          destroyOnHidden
          content={content}
          classNames={{ container: popupClassName }}
        >
          <Button
            type="text"
            aria-label={label}
            aria-expanded={open}
            icon={<Icon {...IC} size={compact ? 18 : 20} />}
            className={cn(
              'text-muted hover:text-foreground',
              compact ? 'size-[32px] min-w-[32px]' : 'size-10',
            )}
          />
        </Popover>
      </Flex>
    </Tip>
  )
}

/** Arama: düğmeye basınca uygulama araması açılır; seçim yapılınca kapanır. */
function SearchButton() {
  const [open, setOpen] = useState(false)
  return (
    <BarButton
      label="Ara"
      icon={Search}
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
      popupClassName="w-96 max-w-[calc(100vw-2rem)] p-2"
      content={
        <Flex role="dialog" aria-label="Ara" vertical>
          <AppSearch autoFocus onPick={() => setOpen(false)} />
        </Flex>
      }
    />
  )
}

/** Sohbet / duyurular: başlıklı küçük panel (içerik arka uçtan gelir; burada boş). */
function PanelButton({
  label,
  icon,
  isOpen,
  onOpenChange,
  side = 'top',
  compact,
}: {
  label: string
  icon: LucideIcon
  /** Başlat kutusundan da açılır (kabukta tutulur). */
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Kabuğun konumu: sol rayda panel sağa, üst çubukta aşağı açılır. */
  side?: 'top' | 'left'
  compact?: boolean
}) {
  return (
    <BarButton
      label={label}
      icon={icon}
      compact={compact}
      tip={side === 'left' ? 'right' : 'bottom'}
      open={isOpen}
      onOpenChange={onOpenChange}
      placement={side === 'left' ? 'rightBottom' : 'bottomRight'}
      popupClassName="w-80 max-w-[calc(100vw-2rem)] p-4"
      content={
        <Flex role="dialog" aria-label={label} vertical className="gap-1">
          <Typography.Title level={2} className="m-0 font-display text-lg font-semibold">
            {label}
          </Typography.Title>
          <Typography.Text type="secondary" className="block py-8 text-center text-sm">
            Kullanılabilir öğe yok.
          </Typography.Text>
        </Flex>
      }
    />
  )
}

/* --- Uygulama rafı ----------------------------------------------------------------------------- */

/** `group`: göstergenin kimliği (raf ve çekmece ayrı kayar). */
function DockList({
  expanded,
  current,
  onNavigate,
  group = 'dock',
}: {
  expanded: boolean
  current: string | undefined
  onNavigate?: () => void
  group?: string
}) {
  return (
    <Flex vertical role="list" aria-label="Sayfalar" className="gap-0.5">
      {dockEntries.map(({ id, label, icon: Icon, href }) => {
        const selected = id === current
        const shape = cn(
          // Seçili zemin kayan gösterge (Indicator); taşma iç kutuda kırpılır ki gösterge öğeden öğeye kayabilsin
          'relative flex h-11 items-center rounded-xl bg-surface p-0 text-foreground no-underline transition-colors hover:bg-surface-tertiary hover:text-foreground',
          selected && 'text-accent-foreground hover:text-accent-foreground',
          !expanded && 'w-11',
          // Geri dönüş bir uygulama değil: zeminsiz, altında ayraç
          id === 'geri' && 'mb-3 bg-transparent text-muted',
        )
        const body = (
          <>
            {selected && <Indicator id={`${group}-sel`} className="bg-accent" />}
            <Flex align="center" className="relative size-full overflow-hidden">
              <Flex className="grid size-11 shrink-0 place-items-center">
                <Icon {...IC} size={20} />
              </Flex>
              <Typography.Text
                className={cn(
                  'text-sm font-medium whitespace-nowrap text-current',
                  !expanded && 'sr-only',
                )}
              >
                {label}
              </Typography.Text>
            </Flex>
          </>
        )
        return (
          <Flex key={id} role="listitem" vertical>
            {/* Dar rafta ad ipucunda */}
            <Tip label={label} placement="right" disabled={expanded}>
              {href ? (
                <Link
                  to={href}
                  aria-current={selected ? 'page' : undefined}
                  onClick={() => onNavigate?.()}
                  className={shape}
                >
                  {body}
                </Link>
              ) : (
                // Sayfası olmayan uygulama gezinmez
                <Button
                  type="text"
                  onClick={() => onNavigate?.()}
                  className={cn(shape, 'justify-start')}
                >
                  {body}
                </Button>
              )}
            </Tip>
          </Flex>
        )
      })}
    </Flex>
  )
}

const themes = [
  { id: 'light', label: 'Açık tema', icon: Sun },
  { id: 'dark', label: 'Koyu tema', icon: Moon },
] as const

/** Kart kabı: beyaz hap (tema geçişi ve tema paneli düğmesi). */
const PILL = cn('w-fit rounded-2xl bg-surface p-1', CARD)

/** Tema geçişi: seçili olan dolu birincil renkte, diğeri şeffaf. */
function ThemeSwitch({ vertical, group }: { vertical: boolean; group: string }) {
  const selected = useIsDark() ? 'dark' : 'light'
  return (
    <Flex role="radiogroup" aria-label="Tema" vertical={vertical} className={cn(PILL, 'gap-1')}>
      {themes.map(({ id, label, icon: Icon }) => {
        const on = id === selected
        return (
          <Tip key={id} label={label} placement={vertical ? 'right' : 'top'}>
            <Button
              type="text"
              size="small"
              role="radio"
              aria-checked={on}
              aria-label={label}
              onClick={() => setColorMode(id)}
              className={cn(
                'relative size-8 p-0',
                on &&
                  'bg-transparent text-accent-foreground hover:bg-transparent hover:text-accent-foreground',
              )}
            >
              {on && <Indicator id={`${group}-theme`} className="bg-accent" />}
              {/* Seçilince ikon küçük bir dönüşle gelir */}
              <Icon key={String(on)} {...IC} className={cn('relative', on && 'animate-pop')} />
            </Button>
          </Tip>
        )
      })}
    </Flex>
  )
}

/** Tema paneli düğmesi (raf altında, tema geçişinin yanında). */
function ThemeButton({ onPress }: { onPress: () => void }) {
  return (
    <Tip label="Tema ayarları" placement="right">
      <Flex className={PILL}>
        <Button
          type="text"
          size="small"
          aria-label="Tema ayarları"
          onClick={onPress}
          className="group size-8 p-0"
        >
          <Palette
            {...IC}
            className="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-20"
          />
        </Button>
      </Flex>
    </Tip>
  )
}

/* --- Kabuk ------------------------------------------------------------------------------------- */

/* --- Kabuk içeriği (sol ray / üst çubuk) ------------------------------------------------------ */

/* --- Raftaki konum: Başlangıç'tan çıkan iç içe haplar ---------------------------------------- */

const NO_TRAIL: Crumb[] = []

/**
 * Raftaki daire ve hap ölçüleri (px; temanın boşluk ölçeğinden bağımsız). Solda 40px daireler, 34px
 * enli haplar; üstte kompakt çubuk (44px): 36px daireler, 28px boylu haplar. Sonraki hap öncekinin
 * altına kendi boyu kadar girer (`wrap`: eksi kenar boşluğu), içerik bu gizli kısımdan sonra başlar
 * (`inner`). İlk hap Başlangıç dairesinin altına dairenin 12px eksiği kadar girer.
 */
const DOCK_SIZE = {
  top: {
    circle: 'size-[36px]',
    icon: 16,
    pillIcon: 14,
    wrap: '-ms-[28px]',
    wrapFirst: '-ms-[24px]',
    inner: 'h-[28px] ps-[36px] pe-2.5',
    innerFirst: 'h-[28px] ps-[32px] pe-2.5',
  },
  left: {
    circle: 'size-[40px]',
    icon: 18,
    pillIcon: 15,
    wrap: '-mt-[34px]',
    wrapFirst: '-mt-[28px]',
    inner: 'w-[34px] pt-[42px] pb-2',
    innerFirst: 'w-[34px] pt-[36px] pb-2',
  },
} as const

/**
 * Hapların rengi (tema paneli › Konum). Yumuşak: tek yumuşak ton, 1px yüzey rengi ayrım, bulunulan
 * yer biraz koyu. Dolu: dolu birincil renk, 2px yüzey rengi ayrım, bulunulan yer ters renkli (yüzey
 * zemin, birincil renk iç çerçeve). Zeminler opak (birincil renk yüzeyle karıştırılır): üst üste
 * binen haplar birbirini göstermez.
 */
const TRAIL_STYLE: Record<
  TrailStyle,
  { home: string; item: string; hover: string; current: string }
> = {
  soft: {
    home: '',
    item: 'bg-[color-mix(in_oklab,var(--accent)_15%,var(--surface))] text-accent-soft-foreground ring-1 ring-surface',
    hover:
      'hover:bg-[color-mix(in_oklab,var(--accent)_22%,var(--surface))] hover:text-accent-soft-foreground',
    current:
      'bg-[color-mix(in_oklab,var(--accent)_30%,var(--surface))] font-medium text-accent-soft-foreground ring-1 ring-surface',
  },
  solid: {
    home: 'ring-2 ring-surface',
    item: 'bg-accent text-accent-foreground ring-2 ring-surface',
    hover: 'hover:bg-[color-mix(in_oklab,var(--accent)_88%,var(--surface))] hover:text-accent-foreground',
    current:
      'bg-surface font-medium text-accent-soft-foreground ring-2 ring-surface inset-ring-2 inset-ring-accent',
  },
}

/** Raftaki sıradan uygulama dairesi (boyu `DOCK_SIZE`). */
const APP_CIRCLE =
  'flex shrink-0 items-center justify-center rounded-full text-foreground/70 no-underline transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground'
/** Dolu daire: yolun başı Başlangıç; sabit rafta bulunulan uygulama. */
const APP_ACTIVE = 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'

/**
 * Raftaki konum: yol hep Başlangıç'tan başlar. Dolu daire Başlangıç; ardından her seviye (aktif
 * uygulama, kutu, süreç, talep…) bütün köşeleri yuvarlak bir hap. Soldaki hap hep sağdakinin
 * üstünde (`z-index` azalır; solda yukarıdan aşağıya) ve her hap bir öncekinin altına kendi boyu
 * kadar girer: görünen birleşim öncekinin yuvarlak ucudur, çizilen köşe ya da boşluk yoktur. Diğer
 * uygulamalar yolun ardından sıradan daire; aktif uygulama rafta ayrı daire olarak değil yolun ilk
 * hapı olarak durur. Üstte bulunulan yerin adı da yazar (geniş ekranda); adlar ipucunda. Gezinme ›
 * İkisi de: raf sabit (`still`; yol hapı yok, aktif uygulama da dairesiyle yerinde ve yalnızca o
 * dolu renkte; Başlangıç da yalnızca kendisindeyken), konum üstteki konum çubuğunda.
 *
 * Animasyonlar (hepsi rafın yayı `DOCK_SPRING` ile; hız ve düzey `useTransition`):
 * - yeni seviye bir öncekinin altından kayarak çıkar (altta olduğu için onun içinden doğar gibi),
 *   çıkan seviye aynı yoldan geri girer; `popLayout` ile akıştan çıktığından kalanlar sıçramaz;
 * - uygulama değişince dairesi yolun ilk hapına, uygulamadan çıkınca hap yine dairesine dönüşür
 *   (`layoutId`); diğer daireler `layout` ile yer açar / kapatır;
 * - bulunulan yerin tonu ve adı seviye derinleşince / sığlaşınca renk geçişiyle el değiştirir;
 * - raf boyu StartDock'taki kapsayıcının `layout`ıyla aynı yayla büyür / küçülür.
 */
/** Rafın düzen imzası: hapların sayısı, ikonları, bulunulan yerin adı, aktif uygulama, yerleşim. */
function dockLayoutKey(crumbs: Crumb[], current: string | undefined, left: boolean, both: boolean) {
  // Sabit raf (İkisi de): konum ve aktif uygulama rafı değiştirmez, hiç yeniden ölçülmez
  if (both) return JSON.stringify([left, both])
  return JSON.stringify([crumbs.map((c) => [c.label, c.icon, !!c.href]), current, left, both])
}

function DockPath({
  crumbs,
  current,
  left,
  still = false,
  layoutKey,
}: {
  crumbs: Crumb[]
  /** Raftaki aktif uygulama (yolun ilk seviyesi); rafta öğesi olmayan uygulamada yok. */
  current: string | undefined
  left: boolean
  /**
   * Sabit raf (Gezinme › İkisi de; konum üstteki konum çubuğunda): yol hapı yok, aktif uygulama da
   * diğerleri gibi dairesiyle yerinde; gezinince yalnızca dolu renk bulunulan uygulamaya geçer.
   */
  still?: boolean
  /** Rafın düzen imzası: hapların yeri yalnızca bu değişince ölçülür. */
  layoutKey: string
}) {
  const spring = useTransition(DOCK_SPRING)
  const style = TRAIL_STYLE[useLook().trail]
  const size = DOCK_SIZE[left ? 'left' : 'top']
  const tip = left ? 'right' : 'bottom'
  // Seviyenin saklı konumu: bir öncekinin altında (solda yukarıda, üstte solda)
  const hidden = left ? { y: -24 } : { x: -24 }
  // Yol: Başlangıç'tan sonraki seviyeler; Başlangıç'ın kendisinde ve sabit rafta boş
  const trail = !still && crumbs.length > 1 ? crumbs.slice(1) : NO_TRAIL
  const home = dockEntries.find((e) => e.id === 'baslangic')!
  // Başlangıç dairesi yolun başı olarak hep dolu; sabit rafta yalnızca Başlangıç'tayken
  const homeActive = !still || current === home.id
  // Aktif uygulama yolun ilk hapı olur (sabit rafta dairesi yerinde kalır)
  const others = dockEntries.filter(
    (e) => e.id !== 'geri' && e.id !== 'baslangic' && (still || e.id !== current),
  )

  const levels = trail.map((c, i) => {
    const Icon = crumbIcon(c.icon) ?? FileText
    const isCurrent = i === trail.length - 1
    const first = i === 0
    // Aktif uygulamanın hapı rafta dairesiyle aynı kimliği taşır: daire ↔ hap dönüşümü
    const appId = first ? current : undefined
    const shape = cn(
      'relative flex shrink-0 items-center justify-center gap-1.5 rounded-full no-underline transition-colors duration-300',
      first ? size.innerFirst : size.inner,
      isCurrent ? style.current : cn(style.item, c.href && style.hover),
    )
    const body = (
      <>
        <Icon {...IC} size={size.pillIcon} className="shrink-0" />
        {!left && isCurrent && (
          <Typography.Text className="hidden max-w-56 truncate text-sm text-current lg:inline">
            {c.label}
          </Typography.Text>
        )}
      </>
    )
    return (
      <MotionFlex
        // Anahtar daireninkinden ayrı (ikisi bir an birlikte bulunur); dönüşüm `layoutId` ile
        key={appId ? `trail-app-${appId}` : `level-${i}-${c.label}`}
        role="listitem"
        layout
        layoutId={appId ? `dock-app-${appId}` : undefined}
        layoutDependency={layoutKey}
        // Soldaki hep üstte: daire 10, haplar 9, 8, 7…
        style={{ zIndex: 9 - i }}
        // Uygulama hapı dairesinden dönüşerek gelir; seviyeler öncekinin altından kayarak çıkar
        initial={appId ? false : { opacity: 0, ...hidden }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={
          appId
            ? undefined
            : { opacity: 0, ...hidden, transition: { duration: 0.16, ease: 'easeIn' } }
        }
        transition={spring}
        className={cn('relative flex shrink-0', first ? size.wrapFirst : size.wrap)}
      >
        <Tip label={c.label} placement={tip}>
          {isCurrent || !c.href ? (
            <Flex
              aria-current={isCurrent ? 'page' : undefined}
              aria-label={c.label}
              className={shape}
            >
              {body}
            </Flex>
          ) : (
            <Link to={c.href} aria-label={c.label} className={shape}>
              {body}
            </Link>
          )}
        </Tip>
      </MotionFlex>
    )
  })

  const apps = others.map((e) => {
    const Icon = e.icon
    // Sabit rafta bulunulan uygulama dolu renkte
    const active = still && e.id === current
    return (
      <MotionFlex
        key={`app-${e.id}`}
        role="listitem"
        layout
        layoutId={`dock-app-${e.id}`}
        layoutDependency={layoutKey}
        initial={false}
        transition={spring}
        className="relative flex shrink-0"
      >
        <Tip label={e.label} placement={tip}>
          {e.href ? (
            <Link
              to={e.href}
              aria-label={e.label}
              aria-current={active || undefined}
              className={cn(APP_CIRCLE, size.circle, active && APP_ACTIVE)}
            >
              <Icon {...IC} size={size.icon} className="shrink-0" />
            </Link>
          ) : (
            // Sayfası olmayan uygulama gezinmez (pasif)
            <Flex
              role="link"
              aria-disabled
              aria-label={e.label}
              className={cn(APP_CIRCLE, size.circle, 'opacity-45')}
            >
              <Icon {...IC} size={size.icon} className="shrink-0" />
            </Flex>
          )}
        </Tip>
      </MotionFlex>
    )
  })

  return (
    <Flex role="list" aria-label="Konum" className={cn('flex items-center', left && 'flex-col')}>
      {/* Başlangıç: yolun başı; dolu renk (sabit rafta yalnızca kendisindeyken) ve hapların üstünde */}
      <Flex role="listitem" className="relative z-10 flex shrink-0">
        <Tip label={home.label} placement={tip}>
          <Link
            to={BASE}
            aria-label={home.label}
            aria-current={crumbs.length > 1 ? undefined : 'page'}
            className={cn(APP_CIRCLE, size.circle, homeActive && cn(APP_ACTIVE, style.home))}
          >
            <House {...IC} size={size.icon} className="shrink-0" />
          </Link>
        </Tip>
      </Flex>
      <AnimatePresence initial={false} mode="popLayout">
        {[...levels, ...apps]}
      </AnimatePresence>
    </Flex>
  )
}

/**
 * Başlat kutusundaki "Buradasınız" satırı: hep tek satır. Yol 3 seviyeden uzunsa ilk seviye, "…"
 * (aradaki seviyeler menüde) ve son iki seviye görünür; sığmayan ad kısalır (tam adı ipucunda).
 * Her seviye tıklanır, bulunulan yer vurgulu.
 */
function PanelLocation({ crumbs }: { crumbs: Crumb[] }) {
  const navigate = useNavigate()
  if (crumbs.length < 2) return null
  const folded = crumbs.length > 3
  const hidden = folded ? crumbs.slice(1, -2) : []
  const shown: (Crumb | 'more')[] = folded ? [crumbs[0]!, 'more', ...crumbs.slice(-2)] : crumbs
  const sep = <ChevronRight {...IC} size={13} aria-hidden className="shrink-0 text-muted/60" />
  return (
    <Flex
      role="navigation"
      aria-label="Buradasınız"
      align="center"
      className="min-w-0 flex-nowrap gap-1 overflow-hidden text-sm"
    >
      {shown.map((c, i) => {
        if (c === 'more')
          return (
            <Flex key="more" align="center" className="shrink-0 gap-1">
              {sep}
              <Dropdown
                trigger={['click']}
                placement="bottomLeft"
                // Menü başlat kutusunun içinde açılır: odak kutudan çıkmış sayılıp kutu kapanmasın
                getPopupContainer={(n) =>
                  n.closest<HTMLElement>('[role="dialog"]') ?? document.body
                }
                menu={{
                  'aria-label': 'Diğer seviyeler',
                  onClick: ({ key }) => {
                    const h = hidden[Number(key)]?.href
                    if (h) navigate(h)
                  },
                  items: hidden.map((h, j) => {
                    const Icon = crumbIcon(h.icon) ?? FileText
                    return {
                      key: String(j),
                      label: h.label,
                      disabled: !h.href,
                      icon: <Icon {...IC} size={15} className="text-muted" />,
                    }
                  }),
                }}
              >
                <Button
                  type="text"
                  size="small"
                  aria-label="Diğer seviyeler"
                  icon={<Ellipsis {...IC} size={16} />}
                  className="h-7 w-8 min-w-8 rounded-full p-0 text-muted hover:text-foreground"
                />
              </Dropdown>
            </Flex>
          )
        const Icon = crumbIcon(c.icon) ?? FileText
        const current = i === shown.length - 1
        // Dar alanda önce bulunulan yerden önceki seviye kısalır; bulunulan yer en fazla 16rem
        const shrinks = i === shown.length - 2
        return (
          <Flex
            key={`${i}-${c.label}`}
            align="center"
            className={cn(
              'gap-1',
              shrinks ? 'min-w-0 shrink' : current ? 'max-w-64 min-w-0 shrink-0' : 'shrink-0',
            )}
          >
            {i > 0 && sep}
            <Tip label={c.label} placement="bottom">
              {current || !c.href ? (
                <Flex
                  aria-current={current ? 'page' : undefined}
                  aria-label={c.label}
                  align="center"
                  className="min-w-0 gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent-soft-foreground"
                >
                  <Icon {...IC} size={14} className="shrink-0" />
                  <Typography.Text className="truncate text-current">{c.label}</Typography.Text>
                </Flex>
              ) : (
                <Link
                  to={c.href}
                  aria-label={c.label}
                  className="flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 text-foreground/75 no-underline hover:bg-surface-secondary hover:text-foreground hover:no-underline"
                >
                  <Icon {...IC} size={14} className="shrink-0 text-muted" />
                  <Typography.Text className="truncate text-current">{c.label}</Typography.Text>
                </Link>
              )}
            </Tip>
          </Flex>
        )
      })}
    </Flex>
  )
}

/**
 * Kabuk (tema paneli › Gezinme): ayrı yüzen paneller.
 * - Solda: sol kenarda alt alta: üstte logo ve yan yana geri / ileri (konum yok), ortada raf
 *   (StartMenu: başlat ve uygulamalar), altta sohbet / duyurular, tema, kullanıcı.
 * - Üstte: ortada yatay raf; solda köşedeki tutamaç (tüm uygulamalar paneli soldan yüzerek açılır),
 *   geri / ileri ve logo; sağda eylemler ve kullanıcı.
 * - İkisi de: solda aynı kolon (geri / ileri olmadan; rafta yalnızca aktif uygulamanın hapı),
 *   üstte ince konum çubuğu (`CrumbBar`: geri / ileri ve konumun tamamı).
 * Zemini olan panel yalnızca raf; diğerleri zeminsiz.
 */
function Chrome({
  place,
  both = false,
  actions,
  crumbs,
  current,
  panel,
  onPanel,
  onTheme,
  appsOpen,
  onApps,
}: {
  place: ChromePlace
  /** Gezinme › İkisi de (`place` sol). */
  both?: boolean
  actions: StartActions
  crumbs: Crumb[]
  current: string | undefined
  panel: 'news' | 'chat' | null
  onPanel: (p: 'news' | 'chat' | null) => void
  onTheme: () => void
  /** Tüm uygulamalar paneli (üstteyken köşedeki tutamaç açar). */
  appsOpen: boolean
  onApps: () => void
}) {
  const left = place === 'left'
  const dark = useIsDark()
  const tip = left ? 'right' : 'bottom'
  const themeLabel = dark ? 'Açık tema' : 'Koyu tema'
  // Üstte kompakt çubuk (44px): logo, düğmeler ve kullanıcı da küçük
  const actionButton = cn(
    'text-muted hover:text-foreground',
    left ? 'size-10' : 'size-[32px] min-w-[32px]',
  )
  const actionIcon = left ? 20 : 18

  const logo = (
    <Link
      to={BASE}
      aria-label="Bimser Synergy"
      className="flex shrink-0 items-center gap-2.5 no-underline"
    >
      <LogoMark size={left ? 34 : 30} />
      {!left && <Wordmark height={16} className="hidden lg:block" />}
    </Link>
  )

  // Raf (StartMenu): başlat ve konum (Başlangıç'tan çıkan haplar, ardından diğer uygulamalar).
  // Rafın düzeni yalnızca yol, aktif uygulama ve yerleşim değişince ölçülür (Motion
  // `layoutDependency`): kabuk başka bir nedenle çizilince (adres, bağlam) raf ölçülmez
  const dockKey = dockLayoutKey(crumbs, current, left, both)
  const dock = (
    <StartDock
      place={place}
      actions={actions}
      layoutKey={dockKey}
      location={<PanelLocation crumbs={crumbs} />}
    >
      {(start) => (
        <>
          {start}
          <Divider
            orientation={left ? 'horizontal' : 'vertical'}
            className={left ? 'my-1 w-6 min-w-0' : 'top-0 mx-0.5 h-5'}
          />
          <DockPath
            crumbs={crumbs}
            current={current}
            left={left}
            still={both}
            layoutKey={dockKey}
          />
        </>
      )}
    </StartDock>
  )

  // Eylemler ve kullanıcı
  const actionsGroup = (
    <Flex align="center" className={cn('shrink-0 gap-0.5', left ? 'flex-col' : 'ms-auto')}>
      <PanelButton
        label="Sohbet"
        icon={MessageCircle}
        side={place}
        compact={!left}
        isOpen={panel === 'chat'}
        onOpenChange={(o) => onPanel(o ? 'chat' : null)}
      />
      <PanelButton
        label="Duyurular"
        icon={Megaphone}
        side={place}
        compact={!left}
        isOpen={panel === 'news'}
        onOpenChange={(o) => onPanel(o ? 'news' : null)}
      />
      <Tip label="Tema ayarları" placement={tip}>
        <Button
          type="text"
          aria-label="Tema ayarları"
          onClick={onTheme}
          icon={<Palette {...IC} size={actionIcon} />}
          className={actionButton}
        />
      </Tip>
      <Tip label={themeLabel} placement={tip}>
        <Button
          type="text"
          aria-label={themeLabel}
          onClick={() => setColorMode(dark ? 'light' : 'dark')}
          icon={dark ? <Sun {...IC} size={actionIcon} /> : <Moon {...IC} size={actionIcon} />}
          className={actionButton}
        />
      </Tip>
      <Tip label={`${CURRENT_USER.name} · ${CURRENT_USER.department}`} placement={tip}>
        <UserAvatar
          size={left ? 36 : 32}
          className={cn(left ? 'mt-1 text-sm' : 'ms-1 text-[0.8125rem]')}
        />
      </Tip>
    </Flex>
  )

  if (left)
    return (
      <>
        <Flex
          vertical
          align="center"
          justify="space-between"
          className="pointer-events-none fixed inset-y-3 start-3 z-50 hidden w-[52px] gap-3 sm:flex"
        >
          {/* Üst: logo ve yan yana geri / ileri (zeminsiz; konum solda gösterilmez). İkisi de:
              yalnızca logo, üstteki konum çubuğuyla aynı hizada */}
          <Flex
            vertical
            align="center"
            className={cn('pointer-events-auto gap-2', !both && 'pt-1.5')}
          >
            {logo}
            {!both && <HistoryButtons className="me-0" />}
          </Flex>
          {dock}
          {/* Alt: eylemler ve kullanıcı (zeminsiz) */}
          <Flex vertical align="center" className="pointer-events-auto shrink-0 pb-1.5">
            {actionsGroup}
          </Flex>
        </Flex>
        {both && <CrumbBar crumbs={crumbs} />}
      </>
    )
  return (
    // Üç sütun: solda tutamaç + geri / ileri + logo, ortada raf (hep tam ortada), sağda eylemler
    // Arkada sayfa renginde şerit: kaydırılan içerik çubuğun altında karışmasın (panel zemini değil);
    // dokusu görüntü alanına sabit, sayfanın doku katmanıyla aynı hizada. İçeriğin başladığı yerin
    // 1 birim üstünde biter: kartların dışa çizilen konturunu ve gölgesini örtmesin
    // Kompakt: 44px (raf 36px dairelerle), içerik 68px'ten başlar (`CHROME_SPACE.top`)
    <Flex className="pointer-events-none fixed inset-x-3 top-3 z-50 hidden h-[44px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 before:absolute before:-inset-x-3 before:-top-3 before:h-[calc(68px-var(--spacing))] before:-z-10 before:bg-background before:bg-(image:--background-texture) before:bg-size-(--background-texture-size) before:bg-fixed before:content-[''] sm:grid">
      {/* Köşedeki tutamaç: ekranın sol kenarına yapışık (çubuk kenardan 3 birim içeride, sol çizgisi
          ekran dışında), çubukta dikeyde ortalı (36px, rafın daireleri boyunda); sütunun taşma
          kırpmasının dışında */}
      <AllAppsHandle
        open={appsOpen}
        onPress={onApps}
        className="pointer-events-auto absolute -start-[calc(var(--spacing)*3+1px)] top-[4px]"
      />
      {/* Tutamacın yanından (dışarı çekilmiş hâlinden de) başlar */}
      <Flex
        align="center"
        className="pointer-events-auto min-w-0 gap-2.5 overflow-hidden ps-[24px]"
      >
        {/* Konum rafta (aktif uygulamanın yanında) ve başlat kutusunda; burada yalnızca geri / ileri
            (konum çubuğundaki gibi küçük) */}
        <HistoryButtons compact className="me-0" />
        {logo}
      </Flex>
      {dock}
      <Flex justify="flex-end" className="pointer-events-auto min-w-0 pe-1">
        {actionsGroup}
      </Flex>
    </Flex>
  )
}

/** Sayfa geçişi anahtarı: aynı anahtarda kalan gezinme (kutu / süreç değişimi) geçiş oynatmaz. */
function pageOf(pathname: string) {
  // Form çalışma alanı: talep ayrıntısı ve menü uygulamalarının formları aynı form gruplarında
  // (aralarında gezinme sayfayı yeniden kurmaz, yeni grup açar)
  if (matchPath('/is-akislari/:box/:processId/:requestId', pathname)) return 'forms'
  if (matchPath('/uygulamalar/:appId', pathname)) return 'forms'
  if (matchPath({ path: '/is-akislari', end: false }, pathname)) return 'workflow'
  // İK: modüller ve kayıtlar arası gezinme aynı ekran (geçiş yok)
  if (matchPath({ path: '/insan-kaynaklari', end: false }, pathname)) return 'hr'
  return pathname
}

/** Adresin raftaki uygulaması. */
function appOf(pathname: string) {
  return dockEntries.find((e) => e.match && matchPath({ path: e.match, end: false }, pathname))?.id
}

function Shell() {
  const { pathname } = useLocation()
  const [frame, setFrame] = useState<Frame | null>(null)
  // Sayfa geçişinde eski sayfa konumu silip yenisi yazana kadar konum çubuğu boşalmasın (yoksa
  // bölümler yeniden takılır, bulunulan yerin ikona büzülme animasyonu oynamazdı)
  // Raftaki aktif uygulama, yeni sayfa konumunu bildirdiği anda (konumla aynı güncellemede)
  // değişir, adresle değil: gösterge, konum hapının morph'u ve raf boyu aynı karede birlikte
  // başlasın (adres, sayfa geçişinin çıkış animasyonu kadar önce değişiyordu)
  const [dockCurrent, setDockCurrent] = useState(() => appOf(window.location.pathname))
  const keepFrame = useCallback((f: Frame | null) => {
    if (!f) return
    setFrame(f)
    setDockCurrent(appOf(window.location.pathname))
  }, [])
  // Çekmece açıldığı adreste açık kalır; gezinince kendiliğinden kapanır
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null)
  // Tema paneli: ayarlar <html>'e uygulanır, kabuktan çıkınca temizlenir (shared/themeSettings.ts)
  const [theme, setTheme, look] = useThemeSettings(APP_THEME)
  // Tek kabuk: sol ray, üst çubuk ya da ikisi (sol ray + üstte konum çubuğu; tema paneli ›
  // Gezinme); 640px altında üst çubuk + çekmece
  const place: ChromePlace = look.nav === 'top' ? 'top' : 'left'
  const both = look.nav === 'both'
  const wide = useMediaQuery('(min-width: 640px)')
  const [themeOpen, setThemeOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  const [panel, setPanel] = useState<'news' | 'chat' | null>(null)

  const current = appOf(pathname)
  // Sabit bağlam değeri: kabuk her çizildiğinde (konum değişince) okuyanlar yeniden çizilmesin
  const settingsControl = useMemo(
    () => ({ settings: theme, update: setTheme, openPanel: () => setThemeOpen(true) }),
    [theme, setTheme],
  )

  return (
    <LookContext value={look}>
      <SettingsContext value={settingsControl}>
        <MotionScope>
          {/* antd bileşenlerinin teması (form sayfası; kabuğun tema değişkenlerinden, ant/theme.tsx) */}
          <AntTheme>
            <FrameContext value={keepFrame}>
              {/* Zemin dokusu (tema paneli): görüntü alanına sabit katman, içeriğin arkasında (kök
                  kendi yığın bağlamı: katman kökün zemininin üstünde, içeriğin altında) */}
              <Flex
                vertical
                className="isolate min-h-screen bg-background text-foreground antialiased before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-(image:--background-texture) before:bg-size-(--background-texture-size) before:content-['']"
              >
                {wide ? (
                  <Chrome
                    place={place}
                    both={both}
                    actions={{ onTheme: () => setThemeOpen(true), onPanel: setPanel }}
                    crumbs={frame?.crumbs ?? []}
                    current={dockCurrent}
                    panel={panel}
                    onPanel={setPanel}
                    onTheme={() => setThemeOpen(true)}
                    appsOpen={appsOpen}
                    onApps={() => setAppsOpen(true)}
                  />
                ) : (
                  <TopBar
                    crumbs={frame?.crumbs ?? []}
                    onMenu={() => setDrawer(true)}
                    panel={panel}
                    onPanel={setPanel}
                  />
                )}
                <Flex
                  vertical
                  role="main"
                  className={cn(
                    // Yanlar kabukla aynı hizada (kabuk kenardan 0.75rem içeride)
                    'min-w-0 flex-1 gap-3 px-4 pb-6 sm:pe-3',
                    // Kabuk içeriğin üstünde yüzer; yanına düşen alan kadar boşluk
                    wide && CHROME_SPACE[both ? 'both' : place],
                    // Yapışkan öğeler (ör. talep şeridi) kabuğun altına yapışsın
                    !wide
                      ? '[--chrome-top:0px]'
                      : place === 'top'
                        ? '[--chrome-top:68px]'
                        : both
                          ? // İçeriğin başladığı yer (`CHROME_SPACE.both`, aynı birim)
                            '[--chrome-top:calc(var(--spacing)*14)]'
                          : '[--chrome-top:0px]',
                    wide && place === 'top' && 'sm:ps-3',
                  )}
                >
                  {/* Telefonda konum, üst çubuk yerine sayfanın başında */}
                  {!wide && (frame?.crumbs.length ?? 0) > 1 && (
                    <Flex className="pt-1">
                      <Crumbs crumbs={frame!.crumbs} />
                    </Flex>
                  )}
                  <PageTransition
                    page={pageOf(pathname)}
                    className="flex min-w-0 flex-1 flex-col"
                  />
                </Flex>

                {/* Dar ekranda raf çekmecede */}
                <Drawer
                  open={drawerAt === pathname}
                  onClose={() => setDrawer(false)}
                  placement="left"
                  title="synergy"
                  closable={{ placement: 'end' }}
                  size="min(24rem, 100vw)"
                  classNames={{
                    section: 'bg-background',
                    header: 'border-b-0',
                    title: 'font-display text-lg font-semibold',
                    body: 'flex flex-col gap-6',
                  }}
                >
                  <AppSearch />
                  <DockList
                    expanded
                    current={current}
                    onNavigate={() => setDrawer(false)}
                    group="drawer"
                  />
                  <AllAppsButton
                    expanded
                    onPress={() => {
                      setDrawer(false)
                      setAppsOpen(true)
                    }}
                  />
                  <Flex align="center" className="gap-2">
                    <ThemeButton
                      onPress={() => {
                        setDrawer(false)
                        setThemeOpen(true)
                      }}
                    />
                    <ThemeSwitch vertical={false} group="drawer" />
                  </Flex>
                </Drawer>

                {/* Üstteyken köşedeki tutamaçtan yüzen kutu; dar ekranda çekmeceden, kenara yapışık */}
                <AllAppsPanel
                  isOpen={appsOpen}
                  onOpenChange={setAppsOpen}
                  floating={wide && place === 'top'}
                />

                <ThemePanel
                  kit={APP_THEME}
                  isOpen={themeOpen}
                  onClose={() => setThemeOpen(false)}
                  settings={theme}
                  onChange={setTheme}
                  reducedBySystem={theme.motion === 'full' && look.motion !== 'full'}
                />
              </Flex>
            </FrameContext>
          </AntTheme>
        </MotionScope>
      </SettingsContext>
    </LookContext>
  )
}

/** Uygulama kabuğu: rotalar `src/router.tsx`'te bunun altında (Outlet). */
export function AppShell() {
  return <Shell />
}
