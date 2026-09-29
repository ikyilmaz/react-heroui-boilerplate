import { useState, type ReactNode } from 'react'
import { Outlet, matchPath, useHref, useLocation, useNavigate } from 'react-router'
import {
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  Chip,
  ComboBox,
  Drawer,
  Dropdown,
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
  ChevronRight,
  Ellipsis,
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
import { CURRENT_USER, avatarColor, initials, menuApps } from '@/synergy/shared/workflowData'
import { inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { BASE, FrameContext, k, type Crumb, type Frame } from '@/synergy/v1/paths'
import { IC, Tip } from '@/synergy/v1/parts'
import { LookContext, useThemeSettings } from '@/synergy/shared/themeSettings'
import { ThemePanel } from '@/synergy/shared/ThemePanel'
import { V1_THEME } from '@/synergy/v1/theme'
import { VersionSwitch } from '@/synergy/shared/version'

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
  { id: 'is-akis-yonetimi', label: 'İş Akış Yönetimi', icon: Workflow, href: '/is-akislari/bekleyen', match: '/is-akislari' },
  { id: 'insan-kaynaklari', label: 'İnsan Kaynakları', icon: Users },
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
        <ListBox aria-label="Uygulamalar" renderEmptyState={() => <EmptyState className="py-4 text-center">Kullanılabilir öğe yok.</EmptyState>}>
          {results.length > 0 && (
            <ListBox.Section>
              <SectionHeader>Uygulamalar</SectionHeader>
              {results.map(({ id, caption, icon: Icon }) => (
                <ListBox.Item key={id} id={id} textValue={caption}>
                  {Icon ? (
                    <Icon {...IC} className="shrink-0" />
                  ) : (
                    <Avatar size="sm" color={avatarColor(caption)} className="size-6">
                      <Avatar.Fallback className="text-[0.625rem] font-semibold">{initials(caption)}</Avatar.Fallback>
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

/** Konum hapı: bağlantılar birincil rengin yumuşak tonunda, bulunulan konum dolu birincil renkte. */
function CrumbPill({ c, current, icon }: { c: Crumb; current: boolean; icon?: ReactNode }) {
  return (
    <Breadcrumbs.Item href={current ? undefined : c.href}>
      <Chip size="lg" color="accent" variant={current ? 'primary' : 'soft'} className={current ? 'font-semibold' : 'text-foreground'}>
        {icon}
        <Chip.Label>{c.label}</Chip.Label>
      </Chip>
    </Breadcrumbs.Item>
  )
}

/** Konum hapları; uzun yollarda aradakiler "…" menüsüne katlanır (dar ekranda yalnızca son konum açık). */
function Crumbs({ crumbs, compact = false }: { crumbs: Crumb[]; compact?: boolean }) {
  // Tek hap bulunulan sayfanın kendisi (ör. Başlangıç); göstermeye gerek yok
  if (crumbs.length < 2) return null
  const [first, ...rest] = crumbs
  const keep = compact ? 1 : 2
  const folded = rest.slice(0, -keep)
  const tail = rest.slice(-keep)
  return (
    // Üst çubukta tek satır (sarınca çubuktan taşıyordu); sayfa başındaki kısa sürüm sarabilir
    <Breadcrumbs aria-label="Konum" className={cn('min-w-0 gap-1', compact ? 'flex-wrap' : 'flex-nowrap')} separator={<ChevronRight strokeWidth={1.75} />}>
      <CrumbPill c={first!} current={!rest.length} icon={<House {...IC} size={14} />} />
      {folded.length > 0 && (
        <Breadcrumbs.Item>
          {() => (
            <>
              <Dropdown>
                <Button isIconOnly size="sm" variant="ghost" aria-label="Diğer konumlar" className="bg-accent-soft text-accent-soft-foreground">
                  <Ellipsis {...IC} />
                </Button>
                <Dropdown.Popover placement="bottom">
                  <Dropdown.Menu aria-label="Diğer konumlar">
                    {folded.map((c) => (
                      <Dropdown.Item key={c.label} id={c.label} href={c.href} textValue={c.label}>
                        {c.label}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
              <ChevronRight strokeWidth={1.75} className="breadcrumbs__separator" aria-hidden />
            </>
          )}
        </Breadcrumbs.Item>
      )}
      {tail.map((c, i) => (
        <CrumbPill key={`${c.label}-${i}`} c={c} current={i === tail.length - 1} />
      ))}
    </Breadcrumbs>
  )
}

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
      <Button isIconOnly variant="ghost" aria-label={label} className="text-muted data-hovered:text-foreground">
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
          <EmptyState className="py-8 text-center text-sm text-muted">Kullanılabilir öğe yok.</EmptyState>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/* --- Uygulama rafı ----------------------------------------------------------------------------- */

function DockList({ expanded, current, onNavigate }: { expanded: boolean; current: string | undefined; onNavigate?: () => void }) {
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
            'h-11 gap-0 overflow-hidden bg-surface p-0 transition-colors data-hovered:bg-surface-tertiary data-selected:bg-accent data-selected:text-accent-foreground',
            !expanded && 'w-11',
            // Geri dönüş bir uygulama değil: zeminsiz, altında ayraç
            id === 'geri' && 'mb-3 bg-transparent text-muted',
          )}
        >
          {({ isHovered, isFocusVisible }) => (
            <>
              <Tooltip isOpen={!expanded && (isHovered || isFocusVisible)}>
                {/* İkon yuvası ipucuna yalnızca konum verir; odak ve rol seçenek öğesinde kalır */}
                <Tooltip.Trigger role="presentation" tabIndex={-1} className="pointer-events-none grid size-11 shrink-0 place-items-center">
                  <Icon {...IC} size={20} />
                </Tooltip.Trigger>
                <Tooltip.Content placement="right" offset={16}>
                  {label}
                </Tooltip.Content>
              </Tooltip>
              <Text slot="label" className={cn('text-sm font-medium whitespace-nowrap text-current', !expanded && 'sr-only')}>
                {label}
              </Text>
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
function ThemeSwitch({ vertical }: { vertical: boolean }) {
  const { resolvedTheme, setTheme } = useTheme()
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
        selectedKeys={[resolvedTheme === 'dark' ? 'dark' : 'light']}
        onSelectionChange={(keys) => setTheme([...keys][0] === 'dark' ? 'dark' : 'light')}
        className="gap-1"
      >
        {themes.map(({ id, label, icon: Icon }) => (
          <Tip key={id} label={label} placement={vertical ? 'right' : 'top'}>
            <ToggleButton id={id} isIconOnly variant="ghost" aria-label={label} className="data-selected:bg-accent data-selected:text-accent-foreground">
              <Icon {...IC} />
            </ToggleButton>
          </Tip>
        ))}
      </ToggleButtonGroup>
    </Card>
  )
}

function Dock({ current, onTheme }: { current: string | undefined; onTheme: () => void }) {
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
          <Button isIconOnly variant="ghost" aria-label={label} aria-expanded={expanded} onPress={toggle} className="size-11 text-muted">
            <ToggleIcon {...IC} size={20} />
          </Button>
        </Tip>
        <DockList expanded={expanded} current={current} />
      </Box>
      <Box className={cn('flex gap-2', expanded ? 'flex-row items-center' : 'flex-col items-start')}>
        <ThemeButton onPress={onTheme} />
        <ThemeSwitch vertical={!expanded} />
      </Box>
    </Box>
  )
}

/** Gezinme "Üstte": uygulamalar üst çubuğun altında yatay; sağda tema paneli ve tema geçişi. */
function TopNav({ current, onTheme }: { current: string | undefined; onTheme: () => void }) {
  return (
    <Box role="navigation" aria-label="Ana menü" className="hidden items-center gap-2 px-6 pb-3 sm:flex">
      {dockEntries.map(({ id, label, icon: Icon, href }) => (
        <Link
          key={id}
          href={href}
          isDisabled={!href}
          aria-current={id === current ? 'page' : undefined}
          className={cn(
            'h-10 gap-2 rounded-xl px-3.5 text-sm font-medium no-underline transition-colors data-disabled:opacity-50',
            id === current ? 'bg-accent text-accent-foreground' : 'bg-surface text-foreground hover:bg-surface-tertiary',
            id === 'geri' && 'bg-transparent text-muted',
          )}
        >
          <Icon {...IC} size={18} />
          {id !== 'geri' && label}
        </Link>
      ))}
      <Box className="ms-auto flex items-center gap-2">
        <ThemeButton onPress={onTheme} />
        <ThemeSwitch vertical={false} />
      </Box>
    </Box>
  )
}

/** Tema paneli düğmesi (raf altında, tema geçişinin yanında). */
function ThemeButton({ onPress }: { onPress: () => void }) {
  return (
    <Tip label="Tema ayarları" placement="right">
      <Card className="w-fit p-1">
        <Button isIconOnly size="sm" variant="ghost" aria-label="Tema ayarları" onPress={onPress}>
          <Palette {...IC} />
        </Button>
      </Card>
    </Tip>
  )
}

/* --- Kabuk ------------------------------------------------------------------------------------- */

function Shell() {
  const { pathname } = useLocation()
  const [frame, setFrame] = useState<Frame | null>(null)
  // Çekmece açıldığı adreste açık kalır; gezinince kendiliğinden kapanır
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null)
  // Tema paneli: ayarlar <html>'e uygulanır, kabuktan çıkınca temizlenir (shared/themeSettings.ts)
  const [theme, setTheme, look] = useThemeSettings(V1_THEME)
  const topNav = look.nav === 'top'
  const [themeOpen, setThemeOpen] = useState(false)

  const current = dockEntries.find((e) => e.match && matchPath({ path: e.match, end: false }, pathname))?.id

  return (
    <LookContext value={look}>
    <FrameContext value={setFrame}>
      <Box className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <TopBar crumbs={frame?.crumbs ?? []} onMenu={() => setDrawer(true)} />
        {topNav && <TopNav current={current} onTheme={() => setThemeOpen(true)} />}
        <Box className="flex flex-1">
          {!topNav && <Dock current={current} onTheme={() => setThemeOpen(true)} />}
          <Box role="main" className={cn('flex min-w-0 flex-1 flex-col gap-3 px-4 pb-6 sm:pe-6', topNav ? 'sm:ps-6' : 'sm:ps-0')}>
            {/* 1280px altında konum, üst çubuk yerine sayfanın başında kısa haplarla (1024'te çubuğa sığmıyordu) */}
            {(frame?.crumbs.length ?? 0) > 1 && (
              <Box className="pt-1 xl:hidden">
                <Crumbs crumbs={frame!.crumbs} compact />
              </Box>
            )}
            <Outlet />
          </Box>
        </Box>

        {/* Dar ekranda raf çekmecede */}
        <Drawer.Root isOpen={drawerAt === pathname} onOpenChange={setDrawer}>
          <Drawer.Trigger className="hidden" aria-hidden />
          <Drawer.Content placement="left">
            <Drawer.Dialog className="bg-background">
              <Drawer.Header>
                <Drawer.Heading className="font-display text-lg font-semibold">synergy</Drawer.Heading>
                <Drawer.CloseTrigger />
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-6">
                <AppSearch />
                <DockList expanded current={current} onNavigate={() => setDrawer(false)} />
                <Box className="flex items-center gap-2">
                  <ThemeButton
                    onPress={() => {
                      setDrawer(false)
                      setThemeOpen(true)
                    }}
                  />
                  <ThemeSwitch vertical={false} />
                </Box>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Root>

        <ThemePanel kit={V1_THEME} isOpen={themeOpen} onClose={() => setThemeOpen(false)} settings={theme} onChange={setTheme} />
        <Toast.Provider placement="bottom end" />
      </Box>
    </FrameContext>
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
