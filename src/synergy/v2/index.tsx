import { useEffect, useState } from 'react'
import { Outlet, matchPath, useHref, useLocation, useNavigate } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ChevronRight, FolderOpen, House, Layers, Megaphone, MessageCircle, Moon, Palette, Search as SearchIcon, Sun, Users, Workflow } from 'lucide-react'
import {
  Avatar,
  Breadcrumbs,
  Button,
  Card,
  Drawer,
  EmptyState,
  Link,
  ListBox,
  Modal,
  RouterProvider,
  SearchField,
  Separator,
  Toast,
  Typography,
  cn,
  useTheme,
} from '@heroui/react'
import { CURRENT_USER, initials, menuApps } from '@/synergy/shared/workflowData'
import { inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { VersionSwitch } from '@/synergy/shared/version'
import { LookContext, useThemeSettings } from '@/synergy/shared/themeSettings'
import { ThemePanel } from '@/synergy/shared/ThemePanel'
import { V2_THEME } from '@/synergy/v2/theme'
import { BASE, CrumbsContext, V2, WF_HOME, v, type Crumb } from '@/synergy/v2/paths'
import { FILL, IC, Tip } from '@/synergy/v2/parts'

/* -------------------------------------------------------------------------------------------------
 * Bento (v2) kabuğu
 *
 * Yan menü yok. Üstte ince başlık: logo, konum yolu, arama hapı, Sohbet / Duyurular,
 * tema paneli, tema, sürüm, kullanıcı. Gezinme altta ortada yüzen dock'ta (seçili uygulama birincil renkte hap).
 * Arama ortada pencerede, Sohbet / Duyurular sağdan çekmece.
 * Kabuk açıkken <html data-synergy="v2"> (src/themes/synergy-v2.css).
 * ------------------------------------------------------------------------------------------------- */

interface NavEntry {
  id: string
  label: string
  icon: LucideIcon
  href?: string
  /** Seçili sayılacağı adres önekleri. */
  match?: string[]
}

/** Orijinal sol menünün sabit uygulamaları; sayfası olmayanlar gezinmez. */
const nav: NavEntry[] = [
  { id: 'baslangic', label: 'Başlangıç', icon: House, href: BASE, match: [BASE, `${V2}/uygulamalar`] },
  { id: 'dokumanlar', label: 'Dokümanlar', icon: FolderOpen },
  { id: 'is-akis-yonetimi', label: 'İş Akış Yönetimi', icon: Workflow, href: WF_HOME, match: [`${V2}/is-akislari`] },
  { id: 'insan-kaynaklari', label: 'İnsan Kaynakları', icon: Users },
]

const fold = (s: string) => s.toLocaleLowerCase('tr')

function IconButton({ label, icon: Icon, onPress }: { label: string; icon: LucideIcon; onPress: () => void }) {
  return (
    <Tip label={label} placement="bottom">
      <Button isIconOnly variant="ghost" aria-label={label} onPress={onPress} className="rounded-full text-muted data-hovered:bg-surface data-hovered:text-foreground">
        <Icon {...IC} size={18} />
      </Button>
    </Tip>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === 'dark'
  return <IconButton label={dark ? 'Açık tema' : 'Koyu tema'} icon={dark ? Sun : Moon} onPress={() => setTheme(dark ? 'light' : 'dark')} />
}

/** Arama penceresi (orijinal modules/search): menü uygulamalarında arar. */
function SearchDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const results = q ? menuApps.filter((a) => fold(a.caption).includes(q)) : []
  const close = () => {
    setQuery('')
    onClose()
  }
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && close()}>
      <Modal.Trigger className="hidden" aria-hidden tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container size="lg" placement="top">
          <Modal.Dialog aria-label="Ara" className="gap-0 overflow-hidden rounded-3xl p-0">
            <SearchField value={query} onChange={setQuery} aria-label="Ara" autoFocus className="p-3">
              <SearchField.Group className="h-12 border-0 bg-transparent shadow-none">
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Ara" className="text-base" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Separator />
            <Box className="max-h-[50vh] overflow-y-auto p-2">
              {q ? (
                <ListBox
                  aria-label="Uygulamalar"
                  onAction={close}
                  renderEmptyState={() => <EmptyState className="py-8 text-center text-sm text-muted">Kullanılabilir öğe yok.</EmptyState>}
                  className="p-0"
                >
                  {results.map(({ id, caption, href, icon: Icon }) => (
                    <ListBox.Item key={id} id={id} href={v(href)} textValue={caption} className="h-11 gap-3 rounded-xl px-3">
                      {Icon ? <Icon {...IC} className="text-muted" /> : <Text className="w-4 text-center font-mono text-xs text-muted">{initials(caption)[0]}</Text>}
                      {caption}
                    </ListBox.Item>
                  ))}
                </ListBox>
              ) : (
                <Typography type="body-sm" color="muted" className="px-2 py-6 text-center">
                  Uygulamalar
                </Typography>
              )}
            </Box>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

/** Sohbet / Duyurular: sağdan çekmece (içerik arka uçtan gelir; burada boş). */
function SidePanel({ title, isOpen, onClose }: { title: string; isOpen: boolean; onClose: () => void }) {
  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Trigger className="hidden" aria-hidden />
      <Drawer.Content placement="right">
        <Drawer.Dialog>
          <Drawer.Header>
            <Drawer.Heading className="text-lg font-bold">{title}</Drawer.Heading>
            <Drawer.CloseTrigger />
          </Drawer.Header>
          <Drawer.Body>
            <EmptyState className="py-16 text-center text-sm text-muted">Kullanılabilir öğe yok.</EmptyState>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Root>
  )
}

function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length < 2) return null
  return (
    <Breadcrumbs aria-label="Konum" className="min-w-0 flex-nowrap gap-1 text-sm" separator={<ChevronRight strokeWidth={1.75} />}>
      {crumbs.map((c, i) => (
        <Breadcrumbs.Item
          key={`${c.label}-${i}`}
          href={i === crumbs.length - 1 ? undefined : c.href}
          className={cn('truncate', i === crumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted max-lg:hidden')}
        >
          {c.label}
        </Breadcrumbs.Item>
      ))}
    </Breadcrumbs>
  )
}

/** Dock konumları (tema paneli › Gezinme): altta yüzen, solda dikey yüzen, üstte başlığın altında. */
const DOCK_PLACE: Record<string, { wrap: string; card: string; sep: string; tip: 'top' | 'right' | 'bottom' }> = {
  default: { wrap: 'pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4', card: 'flex-row', sep: 'mx-1 h-6', tip: 'top' },
  left: { wrap: 'pointer-events-none fixed inset-y-0 start-4 z-40 hidden items-center sm:flex', card: 'flex-col', sep: 'my-1 w-6', tip: 'right' },
  top: { wrap: 'sticky top-16 z-20 flex justify-center px-4 pb-2', card: 'flex-row', sep: 'mx-1 h-6', tip: 'bottom' },
}

/** Yüzen dock: uygulamalar; seçili olan birincil renkte hap (dar ekranda ve solda yalnızca ikon). */
function Dock({ place }: { place: string }) {
  const { pathname } = useLocation()
  const current = nav.find((e) => e.match?.some((m) => matchPath({ path: m, end: false }, pathname)))?.id
  const p = DOCK_PLACE[place] ?? DOCK_PLACE.default!
  const vertical = place === 'left'
  return (
    <Box className={p.wrap}>
      <Card
        role="navigation"
        aria-label="Ana menü"
        className={cn('pointer-events-auto items-center gap-1 rounded-full border border-border bg-surface/85 p-1.5 shadow-(--overlay-shadow) backdrop-blur-xl', p.card)}
      >
        <Tip label="Ana sayfaya dön" placement={p.tip}>
          <Link href="/" aria-label="Ana sayfaya dön" className="size-10 justify-center rounded-full text-muted no-underline hover:bg-surface-secondary hover:text-foreground">
            <ArrowLeft {...IC} size={18} />
          </Link>
        </Tip>
        <Separator orientation={vertical ? 'horizontal' : 'vertical'} className={p.sep} />
        {nav.map((e) => {
          const on = e.id === current
          const Icon = e.icon
          return (
            <Tip key={e.id} label={e.label} placement={p.tip}>
              <Link
                href={e.href}
                isDisabled={!e.href}
                aria-label={e.label}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'h-10 gap-2 rounded-full text-sm font-semibold whitespace-nowrap no-underline transition-colors data-disabled:opacity-45',
                  vertical ? 'w-10 justify-center px-0' : 'px-3',
                  on ? FILL : 'text-foreground/70 hover:bg-surface-secondary hover:text-foreground',
                )}
              >
                <Icon {...IC} size={18} />
                <Typography {...inline} className={cn('text-current', on && !vertical ? 'max-sm:sr-only' : 'sr-only')}>
                  {e.label}
                </Typography>
              </Link>
            </Tip>
          )
        })}
      </Card>
    </Box>
  )
}

function Shell() {
  const { pathname } = useLocation()
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [panel, setPanel] = useState<'chat' | 'news' | null>(null)
  // Tema paneli: ayarlar <html>'e uygulanır, kabuktan çıkınca temizlenir (shared/themeSettings.ts)
  const [theme, setTheme, look] = useThemeSettings(V2_THEME)
  // Dock solda ya da üstteyse alttaki boşluk gerekmez; Başlangıç'ın ekranı doldurma payı (--chrome) buna göre
  const place = look.nav === 'left' || look.nav === 'top' ? look.nav : 'default'
  const mainPlace = { default: 'pb-24 [--chrome:11rem]', left: 'pb-24 sm:pb-6 sm:ps-24 [--chrome:7rem]', top: 'pb-6 [--chrome:11.5rem]' }[place]
  const [themeOpen, setThemeOpen] = useState(false)

  // v2 teması yalnızca bu kabuk açıkken (src/themes/synergy-v2.css)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.synergy = 'v2'
    return () => {
      delete root.dataset.synergy
    }
  }, [])

  // Sayfa değişince başa dön
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <LookContext value={look}>
    <CrumbsContext value={setCrumbs}>
      <Box className="flex min-h-screen flex-col bg-background text-foreground antialiased">
        <Box role="banner" className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl">
          <Box className="flex h-16 w-full items-center gap-4 px-4 sm:px-6">
            <Link href={BASE} className="shrink-0 gap-2.5 text-foreground no-underline">
              <Avatar aria-hidden className="size-9 rounded-xl">
                <Avatar.Fallback className={cn('rounded-xl', FILL)}>
                  <Layers size={18} strokeWidth={2} aria-hidden />
                </Avatar.Fallback>
              </Avatar>
              <Typography {...inline} className="hidden text-base font-extrabold tracking-tight text-current sm:inline">
                Synergy
              </Typography>
            </Link>
            <Box className="min-w-0 flex-1 ps-2">
              <Crumbs crumbs={crumbs} />
            </Box>
            <Button variant="outline" onPress={() => setSearchOpen(true)} className="hidden h-10 w-56 justify-start gap-2 rounded-full bg-surface px-4 font-normal text-muted md:flex">
              <SearchIcon {...IC} />
              Ara
            </Button>
            <Box className="flex items-center">
              <Box className="md:hidden">
                <IconButton label="Ara" icon={SearchIcon} onPress={() => setSearchOpen(true)} />
              </Box>
              <IconButton label="Sohbet" icon={MessageCircle} onPress={() => setPanel('chat')} />
              <IconButton label="Duyurular" icon={Megaphone} onPress={() => setPanel('news')} />
              <IconButton label="Tema ayarları" icon={Palette} onPress={() => setThemeOpen(true)} />
              <ThemeToggle />
              <VersionSwitch current="v2" className="rounded-full font-mono text-xs text-muted" />
            </Box>
            <Tip label={`${CURRENT_USER.name} · ${CURRENT_USER.department}`} placement="bottom">
              <Avatar aria-label={CURRENT_USER.name}>
                <Avatar.Fallback className={cn('text-sm font-bold', FILL)}>{initials(CURRENT_USER.name)}</Avatar.Fallback>
              </Avatar>
            </Tip>
          </Box>
        </Box>

        {place === 'top' && <Dock place="top" />}
        <Box role="main" className={cn('flex w-full flex-1 flex-col px-4 pt-4 sm:px-6', mainPlace)}>
          <Outlet />
        </Box>

        {place !== 'top' && <Dock place={place} />}
        {/* Solda dock yalnızca 640px ve üstü; dar ekranda altta */}
        {place === 'left' && (
          <Box className="sm:hidden">
            <Dock place="default" />
          </Box>
        )}
        <SearchDialog isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <SidePanel title="Sohbet" isOpen={panel === 'chat'} onClose={() => setPanel(null)} />
        <SidePanel title="Duyurular" isOpen={panel === 'news'} onClose={() => setPanel(null)} />
        <ThemePanel kit={V2_THEME} isOpen={themeOpen} onClose={() => setThemeOpen(false)} settings={theme} onChange={setTheme} />
        <Toast.Provider placement="top end" />
      </Box>
    </CrumbsContext>
    </LookContext>
  )
}

/** v2 kabuğu: rotalar `src/router.tsx`'te `/v2` altında (Outlet). */
export function BentoShell() {
  const navigate = useNavigate()
  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      <Shell />
    </RouterProvider>
  )
}
