import { useCallback, useEffect, useRef, useState } from 'react'
import { matchPath, useHref, useLocation, useNavigate } from 'react-router'
import {
  Avatar,
  Button,
  Card,
  ComboBox,
  Drawer,
  EmptyState,
  Header as SectionHeader,
  Input,
  Link,
  ListBox,
  Popover,
  RouterProvider,
  Toast,
  ToggleButton,
  Tooltip,
  ToggleButtonGroup,
  Typography,
  cn,
  useTheme,
} from '@heroui/react'
import {
  ChevronLeft,
  FileText,
  FolderOpen,
  House,
  Layers,
  Megaphone,
  Menu,
  MessageCircle,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
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
import { card, inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { BASE, FrameContext, k, type Crumb, type Frame } from '@/synergy/v1/paths'
import { IC, Tip } from '@/synergy/v1/parts'
import { LookContext, useLook, useThemeSettings } from '@/synergy/shared/themeSettings'
import { ThemePanel } from '@/synergy/shared/ThemePanel'
import { V1_THEME } from '@/synergy/v1/theme'
import { PARENTS, findModule } from '@/synergy/v1/hr/modules'
import { VersionSwitch } from '@/synergy/shared/version'
import { Indicator, MotionScope, PageTransition } from '@/synergy/v1/motion'
import { PerfOverlay } from '@/synergy/v1/PerfOverlay'
import { AllAppsButton, AllAppsPanel } from '@/synergy/v1/AllApps'

/*
 * Kabuk: üst çubuk (logo, konum hapları, uygulama araması, kullanıcı) ve solda uygulama rafı
 * (seçili olan birincil renkte; altta tema geçişi). Sayfalar konumunu `useFrame` ile bildirir.
 * 640px altında raf çekmeceye taşınır.
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

const DOCK_KEY = 'synergy-dock-expanded'

function loadExpanded() {
  try {
    return localStorage.getItem(DOCK_KEY) === '1'
  } catch {
    return false
  }
}

const fold = (v: string) => v.toLocaleLowerCase('tr')

/* --- Üst çubuk --------------------------------------------------------------------------------- */

/** Uygulama araması (orijinal modules/search): menü uygulamalarında arar, "Uygulamalar" altında. */
function AppSearch({ autoFocus = false, onPick }: { autoFocus?: boolean; onPick?: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const results = q ? menuApps.filter((a) => fold(a.caption).includes(q)) : []
  return (
    <ComboBox
      aria-label="Ara"
      inputValue={query}
      onInputChange={setQuery}
      allowsCustomValue
      allowsEmptyCollection
      menuTrigger="input"
      selectedKey={null}
      onSelectionChange={(key) => {
        const app = menuApps.find((a) => a.id === key)
        if (!app) return
        setQuery('')
        onPick?.()
        navigate(k(app.href))
      }}
      className="w-90 max-w-full"
    >
      {/* Grubun son çocuğu tetikleyicidir; arama ikonu bu yüzden sonda, görünüşte başta durur. */}
      <ComboBox.InputGroup>
        <Input placeholder="Ara" autoFocus={autoFocus} className="min-w-0 bg-surface ps-9" />
        <ComboBox.Trigger aria-label="Ara" className="start-1 end-auto">
          <Search {...IC} />
        </ComboBox.Trigger>
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox
          aria-label="Uygulamalar"
          renderEmptyState={() => (
            <EmptyState className="py-4 text-center">Kullanılabilir öğe yok.</EmptyState>
          )}
        >
          {results.length > 0 && (
            <ListBox.Section>
              <SectionHeader>Uygulamalar</SectionHeader>
              {results.map(({ id, caption, icon: Icon }) => (
                <ListBox.Item key={id} id={id} textValue={caption}>
                  {Icon ? (
                    <Icon {...IC} className="shrink-0" />
                  ) : (
                    <Avatar size="sm" color={avatarColor(caption)} className="size-6">
                      <Avatar.Fallback className="text-[0.625rem] font-semibold">
                        {initials(caption)}
                      </Avatar.Fallback>
                    </Avatar>
                  )}
                  <Text slot="label" tone="primary">
                    {caption}
                  </Text>
                </ListBox.Item>
              ))}
            </ListBox.Section>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
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
    <Box
      className={cn(
        'flex h-8 min-w-0 items-center rounded-full px-2 text-sm whitespace-nowrap transition-[background-color,color,box-shadow] duration-[calc(240ms*var(--motion-time,1))] ease-out',
        current
          ? 'bg-accent font-semibold text-accent-foreground'
          : cn(
              'bg-surface text-muted group-hover:bg-surface-secondary group-hover:text-foreground group-data-[hovered=true]:bg-surface-secondary group-data-[hovered=true]:text-foreground',
              card,
            ),
      )}
    >
      <Box
        key={c.label}
        className={cn('flex min-w-0 items-center', swapped.current && 'animate-crumb-swap')}
      >
        {Icon && <Icon {...IC} size={16} className="shrink-0" />}
        <Box
          className={cn(
            'grid min-w-0 transition-[grid-template-columns] duration-[calc(300ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
            open ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]',
          )}
        >
          <Text
            className={cn(
              'min-w-0 overflow-hidden text-current transition-opacity duration-[calc(180ms*var(--motion-time,1))]',
              current ? 'max-w-[28rem]' : 'max-w-80',
              open ? 'opacity-100' : 'opacity-0',
            )}
          >
            {/* İç boşluk kırpılan kutunun içinde: kapanınca hap tam yuvarlak kalır */}
            <Text className={cn('block truncate text-current', Icon && 'ps-1.5 pe-1')}>
              {c.label}
            </Text>
          </Text>
        </Box>
      </Box>
    </Box>
  )
  // Yapı hep aynı (ipucu + bağlantı) ki bulunulan yer değişince öğe yeniden kurulmasın ve ad
  // büzülme / açılma geçişi oynasın; adresi olmayan bölüm (ör. süreç) pasif bağlantı
  return (
    <Tip label={c.label} placement="bottom" isDisabled={open}>
      <Link
        href={c.href}
        isDisabled={!c.href}
        aria-current={current ? 'page' : undefined}
        aria-label={c.label}
        // Basınca hafifçe içe göçer (büyüme yok)
        className="group rounded-full no-underline transition-transform duration-150 hover:no-underline active:scale-95 data-[disabled=true]:cursor-default data-[disabled=true]:opacity-100 data-[disabled=true]:active:scale-100"
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

  if (!shown.length && !tail.length) return null
  const items = [
    ...shown.map((c) => ({ c, leaving: false })),
    ...tail.map((c) => ({ c, leaving: true })),
  ]
  return (
    <Box role="navigation" aria-label="Konum" className="min-w-0">
      <Box role="list" className="flex min-w-0 flex-nowrap items-center">
        {items.map(({ c, leaving }, i) => (
          // Sıraya göre anahtarlı: bölüm yerinde kalır; yalnızca yeni sıra girer, düşen sıra çıkar
          <Box
            key={i}
            role={leaving ? undefined : 'listitem'}
            aria-hidden={leaving || undefined}
            className={cn(
              'flex shrink-0 origin-left items-center',
              leaving ? 'pointer-events-none animate-crumb-out' : 'animate-crumb-in',
            )}
          >
            {i > 0 && (
              <Text aria-hidden className="mx-1.5 text-sm text-muted/50 select-none">
                /
              </Text>
            )}
            <CrumbPart c={c} current={!leaving && i === shown.length - 1} />
          </Box>
        ))}
      </Box>
    </Box>
  )
}

const NO_CRUMBS: Crumb[] = []

function TopBar({ crumbs, onMenu }: { crumbs: Crumb[]; onMenu: () => void }) {
  return (
    <Box role="banner" className="flex h-16 items-center gap-4 px-4 sm:px-6">
      <Button isIconOnly variant="ghost" aria-label="Menü" onPress={onMenu} className="sm:hidden">
        <Menu {...IC} size={20} />
      </Button>
      <Link href={BASE} className="shrink-0 gap-2 no-underline">
        <Avatar aria-hidden className="size-9">
          <Avatar.Fallback className="bg-accent text-accent-foreground">
            <Layers size={20} aria-hidden />
          </Avatar.Fallback>
        </Avatar>
        <Typography {...inline} weight="bold" className="hidden font-display text-xl md:inline">
          synergy
        </Typography>
      </Link>

      <Box className="hidden min-w-0 flex-1 xl:flex">
        <Crumbs crumbs={crumbs} />
      </Box>

      <Box className="ms-auto flex items-center gap-1">
        <SearchButton />
        <PanelButton label="Sohbet" icon={MessageCircle} />
        <PanelButton label="Duyurular" icon={Megaphone} />
        <VersionSwitch current="v1" className="font-mono text-xs text-muted" />
        <Tip label={`${CURRENT_USER.name} · ${CURRENT_USER.department}`} placement="bottom">
          <Avatar aria-label={CURRENT_USER.name} className="ms-2">
            <Avatar.Fallback className="bg-accent font-semibold text-accent-foreground">
              {initials(CURRENT_USER.name)}
            </Avatar.Fallback>
          </Avatar>
        </Tip>
      </Box>
    </Box>
  )
}

/** Üst çubuktaki ikon düğmesi; ipucu ve erişilebilir ad aynı etiketten. */
function BarButton({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <Tip label={label} placement="bottom">
      <Button
        isIconOnly
        variant="ghost"
        aria-label={label}
        className="text-muted data-hovered:text-foreground"
      >
        <Icon {...IC} size={20} />
      </Button>
    </Tip>
  )
}

/** Arama: düğmeye basınca uygulama araması açılır; seçim yapılınca kapanır. */
function SearchButton() {
  const [open, setOpen] = useState(false)
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <BarButton label="Ara" icon={Search} />
      <Popover.Content placement="bottom end" className="w-96 max-w-[calc(100vw-2rem)]">
        <Popover.Dialog aria-label="Ara" className="p-2">
          <AppSearch autoFocus onPick={() => setOpen(false)} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/** Sohbet / duyurular: başlıklı küçük panel (içerik arka uçtan gelir; burada boş). */
function PanelButton({ label, icon }: { label: string; icon: LucideIcon }) {
  return (
    <Popover>
      <BarButton label={label} icon={icon} />
      <Popover.Content placement="bottom end" className="w-80 max-w-[calc(100vw-2rem)]">
        <Popover.Dialog aria-label={label} className="flex flex-col gap-1 p-4">
          <Popover.Heading className="font-display text-lg font-semibold">{label}</Popover.Heading>
          <EmptyState className="py-8 text-center text-sm text-muted">
            Kullanılabilir öğe yok.
          </EmptyState>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
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
    <ListBox
      aria-label="Sayfalar"
      selectionMode="single"
      selectedKeys={current ? [current] : []}
      onAction={() => onNavigate?.()}
      className="overflow-visible p-0"
    >
      {dockEntries.map(({ id, label, icon: Icon, href }) => (
        <ListBox.Item
          key={id}
          id={id}
          href={href}
          textValue={label}
          className={cn(
            // Seçili zemin kayan gösterge (Indicator); taşma iç kutuda kırpılır ki gösterge öğeden öğeye kayabilsin
            'relative h-11 gap-0 bg-surface p-0 transition-colors data-hovered:bg-surface-tertiary data-selected:text-accent-foreground',
            !expanded && 'w-11',
            // Geri dönüş bir uygulama değil: zeminsiz, altında ayraç
            id === 'geri' && 'mb-3 bg-transparent text-muted',
          )}
        >
          {({ isHovered, isFocusVisible, isSelected }) => (
            <>
              {isSelected && <Indicator id={`${group}-sel`} className="bg-accent" />}
              <Box className="relative flex size-full items-center overflow-hidden">
                <Tooltip isOpen={!expanded && (isHovered || isFocusVisible)}>
                  {/* İkon yuvası ipucuna yalnızca konum verir; odak ve rol seçenek öğesinde kalır */}
                  <Tooltip.Trigger
                    role="presentation"
                    tabIndex={-1}
                    className="pointer-events-none grid size-11 shrink-0 place-items-center"
                  >
                    <Icon {...IC} size={20} />
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="right" offset={16}>
                    {label}
                  </Tooltip.Content>
                </Tooltip>
                <Text
                  slot="label"
                  className={cn(
                    'text-sm font-medium whitespace-nowrap text-current',
                    !expanded && 'sr-only',
                  )}
                >
                  {label}
                </Text>
              </Box>
            </>
          )}
        </ListBox.Item>
      ))}
    </ListBox>
  )
}

const themes = [
  { id: 'light', label: 'Açık tema', icon: Sun },
  { id: 'dark', label: 'Koyu tema', icon: Moon },
] as const

/** Tema geçişi: seçili olan dolu birincil renkte, diğeri şeffaf. */
function ThemeSwitch({ vertical, group }: { vertical: boolean; group: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const selected = resolvedTheme === 'dark' ? 'dark' : 'light'
  // Kap Card: HeroUI yarıçapıyla beyaz hap; grubun kendi zemini / yarıçapı yok
  return (
    <Card className="w-fit p-1">
      <ToggleButtonGroup
        aria-label="Tema"
        size="sm"
        isDetached
        orientation={vertical ? 'vertical' : 'horizontal'}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[selected]}
        onSelectionChange={(keys) => setTheme([...keys][0] === 'dark' ? 'dark' : 'light')}
        className="gap-1"
      >
        {themes.map(({ id, label, icon: Icon }) => (
          <Tip key={id} label={label} placement={vertical ? 'right' : 'top'}>
            <ToggleButton
              id={id}
              isIconOnly
              variant="ghost"
              aria-label={label}
              className="relative data-selected:bg-transparent data-selected:text-accent-foreground"
            >
              {id === selected && <Indicator id={`${group}-theme`} className="bg-accent" />}
              {/* Seçilince ikon küçük bir dönüşle gelir */}
              <Icon
                key={String(id === selected)}
                {...IC}
                className={cn('relative', id === selected && 'animate-pop')}
              />
            </ToggleButton>
          </Tip>
        ))}
      </ToggleButtonGroup>
    </Card>
  )
}

function Dock({
  current,
  onTheme,
  onApps,
}: {
  current: string | undefined
  onTheme: () => void
  onApps: () => void
}) {
  const [expanded, setExpanded] = useState(loadExpanded)
  const toggle = () =>
    setExpanded((v) => {
      try {
        localStorage.setItem(DOCK_KEY, v ? '0' : '1')
      } catch {
        // Depolama kapalıysa tercih yalnızca bu oturumda kalır
      }
      return !v
    })
  const label = expanded ? 'Menüyü daralt' : 'Menüyü genişlet'
  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen
  return (
    <Box
      role="navigation"
      aria-label="Ana menü"
      className={cn(
        'sticky top-4 hidden h-[calc(100vh-5rem)] flex-col justify-between px-4 pb-6 transition-[width] motion-reduce:transition-none sm:flex',
        expanded ? 'w-60' : 'w-19',
      )}
    >
      <Box className="flex flex-col gap-3">
        <Tip label={label} placement="right">
          <Button
            isIconOnly
            variant="ghost"
            aria-label={label}
            aria-expanded={expanded}
            onPress={toggle}
            className="size-11 text-muted"
          >
            <ToggleIcon {...IC} size={20} />
          </Button>
        </Tip>
        <DockList expanded={expanded} current={current} />
      </Box>
      <Box className="flex flex-col gap-3">
        {/* Orijinal menünün alt bandı: tüm uygulamalar paneli */}
        <AllAppsButton expanded={expanded} onPress={onApps} />
        <Box
          className={cn('flex gap-2', expanded ? 'flex-row items-center' : 'flex-col items-start')}
        >
          <ThemeButton onPress={onTheme} />
          <ThemeSwitch vertical={!expanded} group="dock" />
        </Box>
      </Box>
    </Box>
  )
}

/** Gezinme "Üstte": uygulamalar üst çubuğun altında yatay; sağda tema paneli ve tema geçişi. */
function TopNav({
  current,
  onTheme,
  onApps,
}: {
  current: string | undefined
  onTheme: () => void
  onApps: () => void
}) {
  return (
    <Box
      role="navigation"
      aria-label="Ana menü"
      className="hidden items-center gap-2 px-6 pb-3 sm:flex"
    >
      {dockEntries.map(({ id, label, icon: Icon, href }) => (
        <Link
          key={id}
          href={href}
          isDisabled={!href}
          aria-current={id === current ? 'page' : undefined}
          className={cn(
            'relative h-10 gap-2 rounded-xl px-3.5 text-sm font-medium no-underline transition-colors data-disabled:opacity-50',
            id === current
              ? 'text-accent-foreground'
              : 'bg-surface text-foreground hover:bg-surface-tertiary',
            id === 'geri' && 'bg-transparent text-muted',
          )}
        >
          {id === current && <Indicator id="topnav-sel" className="bg-accent" />}
          <Icon {...IC} size={18} className="relative" />
          {id !== 'geri' && <Text className="relative text-current">{label}</Text>}
        </Link>
      ))}
      <AllAppsButton expanded={false} onPress={onApps} />
      <Box className="ms-auto flex items-center gap-2">
        <ThemeButton onPress={onTheme} />
        <ThemeSwitch vertical={false} group="topnav" />
      </Box>
    </Box>
  )
}

/** Tema paneli düğmesi (raf altında, tema geçişinin yanında). */
function ThemeButton({ onPress }: { onPress: () => void }) {
  return (
    <Tip label="Tema ayarları" placement="right">
      <Card className="w-fit p-1">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label="Tema ayarları"
          onPress={onPress}
          className="group"
        >
          <Palette
            {...IC}
            className="transition-transform duration-300 group-data-hovered:scale-110 group-data-hovered:-rotate-20"
          />
        </Button>
      </Card>
    </Tip>
  )
}

/* --- Kabuk ------------------------------------------------------------------------------------- */

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

function Shell() {
  const { pathname } = useLocation()
  const [frame, setFrame] = useState<Frame | null>(null)
  // Sayfa geçişinde eski sayfa konumu silip yenisi yazana kadar konum çubuğu boşalmasın (yoksa
  // bölümler yeniden takılır, bulunulan yerin ikona büzülme animasyonu oynamazdı)
  const keepFrame = useCallback((f: Frame | null) => {
    if (f) setFrame(f)
  }, [])
  // Çekmece açıldığı adreste açık kalır; gezinince kendiliğinden kapanır
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null)
  // Tema paneli: ayarlar <html>'e uygulanır, kabuktan çıkınca temizlenir (shared/themeSettings.ts)
  const [theme, setTheme, look] = useThemeSettings(V1_THEME)
  const topNav = look.nav === 'top'
  const [themeOpen, setThemeOpen] = useState(false)
  const [appsOpen, setAppsOpen] = useState(false)

  const current = dockEntries.find(
    (e) => e.match && matchPath({ path: e.match, end: false }, pathname),
  )?.id

  return (
    <LookContext value={look}>
      <MotionScope>
        <FrameContext value={keepFrame}>
          <Box className="flex min-h-screen flex-col bg-background text-foreground antialiased">
            <TopBar crumbs={frame?.crumbs ?? []} onMenu={() => setDrawer(true)} />
            {topNav && (
              <TopNav
                current={current}
                onTheme={() => setThemeOpen(true)}
                onApps={() => setAppsOpen(true)}
              />
            )}
            <Box className="flex flex-1">
              {!topNav && (
                <Dock
                  current={current}
                  onTheme={() => setThemeOpen(true)}
                  onApps={() => setAppsOpen(true)}
                />
              )}
              <Box
                role="main"
                className={cn(
                  'flex min-w-0 flex-1 flex-col gap-3 px-4 pb-6 sm:pe-6',
                  topNav ? 'sm:ps-6' : 'sm:ps-0',
                )}
              >
                {/* 1280px altında konum, üst çubuk yerine sayfanın başında kısa haplarla (1024'te çubuğa sığmıyordu) */}
                {(frame?.crumbs.length ?? 0) > 1 && (
                  <Box className="pt-1 xl:hidden">
                    <Crumbs crumbs={frame!.crumbs} />
                  </Box>
                )}
                <PageTransition page={pageOf(pathname)} className="flex min-w-0 flex-1 flex-col" />
              </Box>
            </Box>

            {/* Dar ekranda raf çekmecede */}
            <Drawer.Root isOpen={drawerAt === pathname} onOpenChange={setDrawer}>
              <Drawer.Trigger className="hidden" aria-hidden />
              <Drawer.Content placement="left">
                <Drawer.Dialog className="bg-background">
                  <Drawer.Header>
                    <Drawer.Heading className="font-display text-lg font-semibold">
                      synergy
                    </Drawer.Heading>
                    <Drawer.CloseTrigger />
                  </Drawer.Header>
                  <Drawer.Body className="flex flex-col gap-6">
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
                    <Box className="flex items-center gap-2">
                      <ThemeButton
                        onPress={() => {
                          setDrawer(false)
                          setThemeOpen(true)
                        }}
                      />
                      <ThemeSwitch vertical={false} group="drawer" />
                    </Box>
                  </Drawer.Body>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Root>

            <AllAppsPanel isOpen={appsOpen} onOpenChange={setAppsOpen} />

            {/* Tema paneli › Performans › FPS'i göster */}
            {look.showFps && <PerfOverlay />}
            <ThemePanel
              kit={V1_THEME}
              isOpen={themeOpen}
              onClose={() => setThemeOpen(false)}
              settings={theme}
              onChange={setTheme}
              reducedBySystem={theme.motion === 'full' && look.motion !== 'full'}
            />
            <Toast.Provider placement="bottom end" />
          </Box>
        </FrameContext>
      </MotionScope>
    </LookContext>
  )
}

/** Uygulama kabuğu: rotalar `src/router.tsx`'te bunun altında (Outlet). */
export function AppShell() {
  const navigate = useNavigate()
  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      <Shell />
    </RouterProvider>
  )
}
