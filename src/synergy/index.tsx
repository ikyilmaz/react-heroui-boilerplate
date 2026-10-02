import { useCallback, useEffect, useRef, useState } from 'react'
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
  Layers,
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
import { PerfOverlay } from '@/synergy/PerfOverlay'
import { AllAppsButton, AllAppsPanel } from '@/synergy/AllApps'
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
    href: '/is-akislari/bekleyen',
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

/** İnce kart çizgisi (tema paneli › Kenarlık kalınlığı). */
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

/** Logo rozeti (birincil renkte katman ikonu). */
function LogoMark({ icon }: { icon: number }) {
  return (
    <Avatar
      size={36}
      aria-hidden
      icon={<Layers size={icon} aria-hidden />}
      className="inline-flex! shrink-0 items-center justify-center bg-accent text-accent-foreground"
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
 *   bulanık solmayla yenilenir (ilk kurulumda değil; girişi `Crumbs` oynatır).
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
        'h-8 min-w-0 rounded-full px-2 text-sm whitespace-nowrap transition-[background-color,color,box-shadow] duration-[calc(240ms*var(--motion-time,1))] ease-out',
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
        {Icon && <Icon {...IC} size={16} className="shrink-0" />}
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
 * Konum çubuğu: ayrı küçük haplar, aralarında eğik çizgi; tüm konum hep görünür (önceki konumlar
 * ikon). Animasyonlar:
 * - yeni bölüm (derine inince) çizgisiyle birlikte soldan hafifçe kayıp büyüyerek belirir;
 * - çıkan bölüm (yukarı çıkınca) kısa süre yerinde küçülerek solar, sonra kalkar; sondan çıktığı
 *   için diğer bölümler kıpırdamaz;
 * - bölümlerin kendi değişimleri `CrumbPart`'ta (ad büzülmesi, renk, yenilenme).
 * Kademeli (stagger) giriş yok; animasyon kapalıyken hepsi anında.
 */
/** Breadcrumb'ın başında geri / ileri: yalnızca uygulamanın rota geçmişine göre. */
function HistoryButtons({ className }: { className?: string }) {
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
            icon={<Icon {...IC} size={16} />}
            className="size-7 min-w-7 rounded-full p-0 text-muted enabled:hover:bg-surface-secondary enabled:hover:text-foreground disabled:opacity-50"
          />
        </Tip>
      ))}
    </Flex>
  )
}

function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  const look = useLook()
  // Tek bölüm bulunulan sayfanın kendisi (ör. Başlangıç); göstermeye gerek yok
  const shown = crumbs.length < 2 ? NO_CRUMBS : crumbs
  const key = JSON.stringify(shown)
  const [state, setState] = useState({ key, list: shown, tail: NO_CRUMBS })
  if (state.key !== key) {
    // Sondan düşen bölümler solarak çıksın diye kısa süre tutulur
    const tail = state.list.length > shown.length ? state.list.slice(shown.length) : NO_CRUMBS
    setState({ key, list: shown, tail })
  }
  const tail = state.tail
  useEffect(() => {
    if (!tail.length) return
    const ms = look.motion === 'off' ? 0 : CRUMB_OUT_MS / look.speed
    const t = window.setTimeout(() => setState((s) => ({ ...s, tail: NO_CRUMBS })), ms)
    return () => window.clearTimeout(t)
  }, [tail, look.motion, look.speed])

  const items = [
    ...shown.map((c) => ({ c, leaving: false })),
    ...tail.map((c) => ({ c, leaving: true })),
  ]
  return (
    <Flex role="navigation" aria-label="Konum" align="center" className="min-w-0">
      {/* Geri / ileri her zaman görünür (tek bölümlü sayfada da) */}
      <HistoryButtons />
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
              i === shown.length - 1 ? 'min-w-0 shrink' : 'shrink-0',
              leaving ? 'pointer-events-none animate-crumb-out' : 'animate-crumb-in',
            )}
          >
            {i > 0 && (
              <Typography.Text aria-hidden className="mx-1.5 text-sm text-muted/50 select-none">
                /
              </Typography.Text>
            )}
            <CrumbPart c={c} current={!leaving && i === shown.length - 1} />
          </Flex>
        ))}
      </Flex>
    </Flex>
  )
}

const NO_CRUMBS: Crumb[] = []

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
      <Link to={BASE} className="flex shrink-0 items-center gap-2 no-underline">
        <LogoMark icon={20} />
        <Typography.Text className="hidden font-display text-xl font-bold md:inline">
          synergy
        </Typography.Text>
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
}: {
  label: string
  icon: LucideIcon
  tip?: 'bottom' | 'right'
  open: boolean
  onOpenChange: (open: boolean) => void
  placement: 'bottomRight' | 'rightBottom'
  popupClassName: string
  content: ReactNode
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
            icon={<Icon {...IC} size={20} />}
            className="size-10 text-muted hover:text-foreground"
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
}: {
  label: string
  icon: LucideIcon
  /** Başlat kutusundan da açılır (kabukta tutulur). */
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Kabuğun konumu: sol rayda panel sağa, üst çubukta aşağı açılır. */
  side?: 'top' | 'left'
}) {
  return (
    <BarButton
      label={label}
      icon={icon}
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
 * Hap ölçüleri. Üstte 32px boy, solda 34px en. Sonraki hap öncekinin altına kendi boyu kadar girer
 * (`wrap`: eksi kenar boşluğu), içerik bu gizli kısımdan sonra başlar (`inner`). İlk hap Başlangıç
 * dairesinin altına 28px girer.
 */
const TRAIL_PILL = {
  top: {
    wrap: '-ms-[32px]',
    wrapFirst: '-ms-[28px]',
    inner: 'h-[32px] ps-[40px] pe-3',
    innerFirst: 'h-[32px] ps-[36px] pe-3',
  },
  left: {
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

/** Raftaki sıradan uygulama dairesi. */
const APP_CIRCLE =
  'flex size-[40px] shrink-0 items-center justify-center rounded-full text-foreground/70 no-underline transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground'

/**
 * Raftaki konum: yol hep Başlangıç'tan başlar. Dolu daire Başlangıç; ardından her seviye (aktif
 * uygulama, kutu, süreç, talep…) bütün köşeleri yuvarlak bir hap. Soldaki hap hep sağdakinin
 * üstünde (`z-index` azalır; solda yukarıdan aşağıya) ve her hap bir öncekinin altına kendi boyu
 * kadar girer: görünen birleşim öncekinin yuvarlak ucudur, çizilen köşe ya da boşluk yoktur. Diğer
 * uygulamalar yolun ardından sıradan daire; aktif uygulama rafta ayrı daire olarak değil yolun ilk
 * hapı olarak durur. Üstte bulunulan yerin adı da yazar (geniş ekranda); adlar ipucunda.
 *
 * Animasyonlar (hepsi rafın yayı `DOCK_SPRING` ile; hız ve düzey `useTransition`):
 * - yeni seviye bir öncekinin altından kayarak çıkar (altta olduğu için onun içinden doğar gibi),
 *   çıkan seviye aynı yoldan geri girer; `popLayout` ile akıştan çıktığından kalanlar sıçramaz;
 * - uygulama değişince dairesi yolun ilk hapına, uygulamadan çıkınca hap yine dairesine dönüşür
 *   (`layoutId`); diğer daireler `layout` ile yer açar / kapatır;
 * - bulunulan yerin tonu ve adı seviye derinleşince / sığlaşınca renk geçişiyle el değiştirir;
 * - raf boyu StartDock'taki kapsayıcının `layout`ıyla aynı yayla büyür / küçülür.
 */
function DockPath({
  crumbs,
  current,
  left,
}: {
  crumbs: Crumb[]
  /** Raftaki aktif uygulama (yolun ilk seviyesi); rafta öğesi olmayan uygulamada yok. */
  current: string | undefined
  left: boolean
}) {
  const spring = useTransition(DOCK_SPRING)
  const style = TRAIL_STYLE[useLook().trail]
  const pill = TRAIL_PILL[left ? 'left' : 'top']
  const tip = left ? 'right' : 'bottom'
  // Seviyenin saklı konumu: bir öncekinin altında (solda yukarıda, üstte solda)
  const hidden = left ? { y: -24 } : { x: -24 }
  // Yol: Başlangıç'tan sonraki seviyeler; Başlangıç'ın kendisinde boş
  const trail = crumbs.length > 1 ? crumbs.slice(1) : NO_TRAIL
  const home = dockEntries.find((e) => e.id === 'baslangic')!
  const others = dockEntries.filter(
    (e) => e.id !== 'geri' && e.id !== 'baslangic' && e.id !== current,
  )

  const levels = trail.map((c, i) => {
    const Icon = crumbIcon(c.icon) ?? FileText
    const isCurrent = i === trail.length - 1
    const first = i === 0
    // Aktif uygulamanın hapı rafta dairesiyle aynı kimliği taşır: daire ↔ hap dönüşümü
    const appId = first ? current : undefined
    const shape = cn(
      'relative flex shrink-0 items-center justify-center gap-1.5 rounded-full no-underline transition-colors duration-300',
      first ? pill.innerFirst : pill.inner,
      isCurrent ? style.current : cn(style.item, c.href && style.hover),
    )
    const body = (
      <>
        <Icon {...IC} size={15} className="shrink-0" />
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
        className={cn('relative flex shrink-0', first ? pill.wrapFirst : pill.wrap)}
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
    return (
      <MotionFlex
        key={`app-${e.id}`}
        role="listitem"
        layout
        layoutId={`dock-app-${e.id}`}
        initial={false}
        transition={spring}
        className="relative flex shrink-0"
      >
        <Tip label={e.label} placement={tip}>
          {e.href ? (
            <Link to={e.href} aria-label={e.label} className={APP_CIRCLE}>
              <Icon {...IC} size={18} className="shrink-0" />
            </Link>
          ) : (
            // Sayfası olmayan uygulama gezinmez (pasif)
            <Flex role="link" aria-disabled aria-label={e.label} className={cn(APP_CIRCLE, 'opacity-45')}>
              <Icon {...IC} size={18} className="shrink-0" />
            </Flex>
          )}
        </Tip>
      </MotionFlex>
    )
  })

  return (
    <Flex role="list" aria-label="Konum" className={cn('flex items-center', left && 'flex-col')}>
      {/* Başlangıç: yolun başı; hep dolu renk ve hapların üstünde */}
      <Flex role="listitem" className="relative z-10 flex shrink-0">
        <Tip label={home.label} placement={tip}>
          <Link
            to={BASE}
            aria-label={home.label}
            aria-current={trail.length ? undefined : 'page'}
            className={cn(
              'flex size-[40px] shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground no-underline hover:text-accent-foreground',
              style.home,
            )}
          >
            <House {...IC} size={18} className="shrink-0" />
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
 * Kabuk (tema paneli › Gezinme): ayrı yüzen paneller aynı tarafta.
 * - Solda: sol kenarda alt alta: üstte logo ve yan yana geri / ileri (konum yok), ortada raf
 *   (StartMenu: başlat ve uygulamalar), altta sohbet / duyurular, tema, kullanıcı.
 * - Üstte: solda yatay raf, yanında header (logo, geri / ileri, konum, eylemler, kullanıcı).
 * Zemini olan panel yalnızca raf; diğerleri zeminsiz.
 */
function Chrome({
  place,
  actions,
  crumbs,
  current,
  panel,
  onPanel,
  onTheme,
}: {
  place: ChromePlace
  actions: StartActions
  crumbs: Crumb[]
  current: string | undefined
  panel: 'news' | 'chat' | null
  onPanel: (p: 'news' | 'chat' | null) => void
  onTheme: () => void
}) {
  const left = place === 'left'
  const dark = useIsDark()
  const tip = left ? 'right' : 'bottom'
  const themeLabel = dark ? 'Açık tema' : 'Koyu tema'

  const logo = (
    <Link to={BASE} aria-label="synergy" className="flex shrink-0 items-center gap-2 no-underline">
      <LogoMark icon={18} />
      {!left && (
        <Typography.Text className="hidden font-display text-lg font-bold lg:inline">
          synergy
        </Typography.Text>
      )}
    </Link>
  )

  // Raf (StartMenu): başlat ve konum (Başlangıç'tan çıkan haplar, ardından diğer uygulamalar)
  const dock = (
    <StartDock place={place} actions={actions} location={<PanelLocation crumbs={crumbs} />}>
      {(start) => (
        <>
          {start}
          <Divider
            orientation={left ? 'horizontal' : 'vertical'}
            className={left ? 'my-1 w-6 min-w-0' : 'top-0 mx-1 h-6'}
          />
          <DockPath crumbs={crumbs} current={current} left={left} />
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
        isOpen={panel === 'chat'}
        onOpenChange={(o) => onPanel(o ? 'chat' : null)}
      />
      <PanelButton
        label="Duyurular"
        icon={Megaphone}
        side={place}
        isOpen={panel === 'news'}
        onOpenChange={(o) => onPanel(o ? 'news' : null)}
      />
      <Tip label="Tema ayarları" placement={tip}>
        <Button
          type="text"
          aria-label="Tema ayarları"
          onClick={onTheme}
          icon={<Palette {...IC} size={20} />}
          className="size-10 text-muted hover:text-foreground"
        />
      </Tip>
      <Tip label={themeLabel} placement={tip}>
        <Button
          type="text"
          aria-label={themeLabel}
          onClick={() => setColorMode(dark ? 'light' : 'dark')}
          icon={dark ? <Sun {...IC} size={20} /> : <Moon {...IC} size={20} />}
          className="size-10 text-muted hover:text-foreground"
        />
      </Tip>
      <Tip label={`${CURRENT_USER.name} · ${CURRENT_USER.department}`} placement={tip}>
        <UserAvatar size={36} className={cn('text-sm', left ? 'mt-1' : 'ms-1')} />
      </Tip>
    </Flex>
  )

  if (left)
    return (
      <Flex
        vertical
        align="center"
        justify="space-between"
        className="pointer-events-none fixed inset-y-3 start-3 z-50 hidden w-[52px] gap-3 sm:flex"
      >
        {/* Üst: logo ve yan yana geri / ileri (zeminsiz; konum solda gösterilmez) */}
        <Flex vertical align="center" className="pointer-events-auto gap-2 pt-1.5">
          {logo}
          <HistoryButtons className="me-0" />
        </Flex>
        {dock}
        {/* Alt: eylemler ve kullanıcı (zeminsiz) */}
        <Flex vertical align="center" className="pointer-events-auto shrink-0 pb-1.5">
          {actionsGroup}
        </Flex>
      </Flex>
    )
  return (
    // Üç sütun: solda logo + geri / ileri + konum, ortada raf (hep tam ortada), sağda eylemler
    // Arkada sayfa renginde bulanık şerit: kaydırılan içerik çubuğun altında karışmasın (panel zemini değil)
    <Flex className="pointer-events-none fixed inset-x-3 top-3 z-50 hidden h-[52px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 before:absolute before:-inset-x-3 before:-top-3 before:-bottom-3 before:-z-10 before:bg-background/85 before:backdrop-blur-md before:content-[''] sm:grid">
      <Flex align="center" className="pointer-events-auto min-w-0 gap-3 overflow-hidden ps-1">
        {logo}
        {/* Konum rafta (aktif uygulamanın yanında) ve başlat kutusunda; burada yalnızca geri / ileri */}
        <HistoryButtons className="me-0" />
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
  if (matchPath('/is-akislari/:box/:processId/:requestId', pathname)) return 'detail'
  if (matchPath({ path: '/is-akislari', end: false }, pathname)) return 'workflow'
  // İK: modüller ve kayıtlar arası gezinme aynı ekran (geçiş yok)
  if (matchPath({ path: '/insan-kaynaklari', end: false }, pathname)) return 'hr'
  const app = matchPath('/uygulamalar/:appId', pathname)
  if (app) return `app:${app.params.appId}`
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
  // Tek kabuk: sol ray ya da üst çubuk (tema paneli › Gezinme); 640px altında üst çubuk + çekmece
  const place: ChromePlace = look.nav === 'top' ? 'top' : 'left'
  const wide = useMediaQuery('(min-width: 640px)')
  const [themeOpen, setThemeOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)
  const [panel, setPanel] = useState<'news' | 'chat' | null>(null)

  const current = appOf(pathname)

  return (
    <LookContext value={look}>
      <SettingsContext
        value={{ settings: theme, update: setTheme, openPanel: () => setThemeOpen(true) }}
      >
        <MotionScope>
          {/* antd bileşenlerinin teması (form sayfası; kabuğun tema değişkenlerinden, ant/theme.tsx) */}
          <AntTheme>
            <FrameContext value={keepFrame}>
              <Flex vertical className="min-h-screen bg-background text-foreground antialiased">
                {wide ? (
                  <Chrome
                    place={place}
                    actions={{ onTheme: () => setThemeOpen(true), onPanel: setPanel }}
                    crumbs={frame?.crumbs ?? []}
                    current={dockCurrent}
                    panel={panel}
                    onPanel={setPanel}
                    onTheme={() => setThemeOpen(true)}
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
                    wide && CHROME_SPACE[place],
                    // Yapışkan öğeler (ör. talep şeridi) kabuğun altına yapışsın
                    wide && place === 'top' ? '[--chrome-top:76px]' : '[--chrome-top:0px]',
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

                <AllAppsPanel isOpen={appsOpen} onOpenChange={setAppsOpen} />

                {/* Tema paneli › Performans › FPS'i göster */}
                {look.showFps && <PerfOverlay />}
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
