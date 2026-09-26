import { useState } from 'react'
import { Outlet, matchPath, useHref, useLocation, useNavigate } from 'react-router'
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Dropdown,
  Link,
  ListBox,
  RouterProvider,
  Separator,
  Surface,
  Toast,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  buttonVariants,
  cn,
  useTheme,
} from '@heroui/react'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FolderOpen,
  House,
  Layers,
  LayoutGrid,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Star,
  Sun,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { ThemeTweaker } from '@/components/ThemeTweaker'
import { Box, Text } from '@/pages/workspace/ui'
import { CrumbsContext, type Crumb } from '@/pages/workspace/crumbs'
import { ICON, edge, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Yumuşak kabuk: puslu zemin + başlık (logo, konum, ikonlar) + sol menü rayı
 *
 * Çalışma alanı ve iş akışı sayfalarının ortak düzeni; yalnızca HeroUI bileşenleriyle kurulu
 * (`Link`, `Breadcrumbs`, `Dropdown`, `Button`, `Badge`, `Tooltip`, `Avatar`, `ListBox`,
 * `ToggleButtonGroup`). `.soft-theme` yalnızca yüzey tonlarını değiştirir; vurgu, durum renkleri,
 * yarıçap, kenarlık, boşluk ve yazı tipi tema panelinden gelir (başlıktaki palet düğmesi).
 * `RouterProvider`, HeroUI `href`'lerinin (Link, Breadcrumbs, ListBox, Dropdown öğeleri) sayfayı
 * yenilemeden react-router ile gezinmesini sağlar.
 * ------------------------------------------------------------------------------------------------- */

/**
 * Kenar halkası (`tile`) bir `ring` yardımcı sınıfı; yardımcı katmanda olduğu için HeroUI'nin
 * bileşen katmanındaki klavye odak halkasını ezer. Odakta HeroUI'nin kendi `status-focused`
 * görünümünü geri veriyoruz.
 */
const focusRing = 'data-[focus-visible]:status-focused'

/**
 * Tema paneli tetikleyicisi, yanındaki ikon düğmeleriyle aynı HeroUI düğmesi (`buttonVariants`).
 * `.drawer__trigger` bileşen katmanında `.button`'dan sonra gelip `inline-block` verdiği için
 * ikonu ortalayan `inline-flex` yeniden eklenir.
 */
const themeTrigger = cn(buttonVariants({ variant: 'secondary', size: 'lg', isIconOnly: true }), 'inline-flex', tile, focusRing)

const headerActions: { label: string; icon: LucideIcon; dot?: boolean }[] = [
  { label: 'Ara', icon: Search },
  { label: 'Mesajlar', icon: MessageCircle },
  { label: 'Bildirimler (2)', icon: Bell, dot: true },
]

function Header({ crumbs }: { crumbs: Crumb[] | null }) {
  // Konum: ilk öğe ev ikonu, son öğe bulunulan sayfa (RAC onu bağlantı olmaktan çıkarıp
  // `aria-current` verir). Üçten uzun yollarda aradaki öğeler "…" menüsüne katlanır. Görünüm
  // `index.css`'te (`.soft-theme .breadcrumbs`).
  const [first, ...rest] = crumbs ?? []
  const folded = rest.length > 2 ? rest.slice(0, -2) : []
  const tail = folded.length ? rest.slice(-2) : rest

  return (
    <Box role="banner" className="flex items-center gap-4 px-5 pt-4 pb-3">
      <Box className="flex flex-1 items-center">
        <Link href="/calisma-alani" className="gap-2.5 no-underline!">
          <Layers size={26} strokeWidth={2} aria-hidden />
          <Text tone="primary" className="text-[1.2rem] font-bold tracking-tight">
            synergy
          </Text>
        </Link>
      </Box>

      <Box className="flex min-w-0 shrink justify-center">
        {first && (
          <Breadcrumbs aria-label="Konum" separator={<ChevronRight strokeWidth={1.5} />}>
            <Breadcrumbs.Item href={tail.length ? first.href : undefined} aria-label={tail.length ? first.label : undefined}>
              <House size={15} strokeWidth={1.5} aria-hidden />
              {!tail.length && first.label}
            </Breadcrumbs.Item>
            {folded.length > 0 && (
              <Breadcrumbs.Item>
                {() => (
                  <>
                    <Dropdown>
                      <Button isIconOnly size="sm" variant="ghost" aria-label="Diğer konumlar">
                        <Ellipsis size={16} strokeWidth={1.5} />
                      </Button>
                      <Dropdown.Popover placement="bottom" className="soft-theme">
                        <Dropdown.Menu aria-label="Diğer konumlar">
                          {folded.map((c) => (
                            <Dropdown.Item key={c.label} id={c.label} href={c.href} textValue={c.label}>
                              {c.label}
                            </Dropdown.Item>
                          ))}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                    <ChevronRight strokeWidth={1.5} className="breadcrumbs__separator" aria-hidden />
                  </>
                )}
              </Breadcrumbs.Item>
            )}
            {tail.map((c, i) => (
              <Breadcrumbs.Item key={`${c.label}-${i}`} href={i === tail.length - 1 ? undefined : c.href}>
                {c.label}
              </Breadcrumbs.Item>
            ))}
          </Breadcrumbs>
        )}
      </Box>

      <Box className="flex flex-1 items-center justify-end gap-2">
        {headerActions.map(({ label, icon: Icon, dot }) => {
          const button = (
            <Button isIconOnly size="lg" variant="secondary" aria-label={label} className={cn(tile, focusRing)}>
              <Icon {...ICON} />
            </Button>
          )
          return (
            <Tooltip key={label}>
              {dot ? (
                <Badge.Anchor>
                  {button}
                  {/* Mercan bildirim noktası; yuvarlak düğmenin kenarına oturması için içeri çekildi */}
                  <Badge color="danger" size="sm" placement="top-right" className="-translate-x-1.5 translate-y-1.5" />
                </Badge.Anchor>
              ) : (
                button
              )}
              <Tooltip.Content placement="bottom">{label}</Tooltip.Content>
            </Tooltip>
          )
        })}
        {/*
         * Bilerek `Tooltip` ile sarılmadı: `Tooltip`'in tetikleyiciye verdiği odak bağlamı
         * (`FocusableProvider`) React ağacında çekmecenin portal içeriğine de iner ve çekmecedeki her
         * düğme "Tema ayarları" ipucunu açardı. İpucu `ThemeTweaker` içinde yalnızca `Drawer.Trigger`'ı
         * sarmalı; erişilebilir ad şimdilik tetikleyicinin `aria-label`'ı.
         */}
        <ThemeTweaker className={themeTrigger} />
        <Avatar color="success" className="ring-3 ring-(--surface-tertiary)">
          <Avatar.Fallback className="text-sm font-semibold">FT</Avatar.Fallback>
        </Avatar>
      </Box>
    </Box>
  )
}

interface RailEntry {
  id: string
  label: string
  icon: LucideIcon
  /** Rotası olan öğe bağlantıdır; olmayanlar (henüz sayfası yok) gezinmez. */
  href?: string
}

const backEntry: RailEntry = { id: 'geri', label: 'Ana sayfaya dön', icon: ChevronLeft, href: '/' }

const railEntries: RailEntry[] = [
  { id: 'ana-sayfa', label: 'Ana sayfa', icon: House, href: '/calisma-alani' },
  { id: 'dokumanlar', label: 'Dokümanlar', icon: FolderOpen },
  { id: 'is-akislari', label: 'İş akışları', icon: Workflow, href: '/is-akislari' },
  { id: 'ekipler', label: 'Ekipler', icon: Users },
  { id: 'favoriler', label: 'Favoriler', icon: Star },
  { id: 'uygulamalar', label: 'Uygulamalar', icon: LayoutGrid },
  { id: 'yeni', label: 'Yeni', icon: Plus },
]

const themeEntries = [
  { id: 'dark', label: 'Koyu tema', icon: Moon },
  { id: 'light', label: 'Açık tema', icon: Sun },
] as const

const RAIL_KEY = 'workspace-rail-expanded'

/** Dar raydaki ipuçları rayın iç boşluğunu (`px-3.5`) aşıp rayın dışında dursun. */
const TIP_OFFSET = 20

function loadExpanded() {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Menü öğesi: sabit ikon yuvası + etiket. Ray daralınca etiket kırpılıp soluklaşır, geriye yuvarlak
 * ikon kalır. Bulunulan sayfa `ListBox` seçimiyle (`data-selected`) siyah vurguya döner.
 */
const railItem = cn(
  tile,
  focusRing,
  'h-9 gap-0 overflow-hidden rounded-pill bg-(--default) p-0',
  'data-hovered:bg-(--default-hover) data-selected:bg-(--accent) data-selected:text-(--accent-foreground) data-selected:data-hovered:bg-(--accent-hover)',
)

/**
 * Sol menü rayı. Gezinme bir HeroUI `ListBox`'ı: rotalı öğeler bağlantı (`href`, istemci tarafı
 * gezinme), bulunulan sayfa rotadan türetilen denetimli seçim (`aria-selected`). Ok tuşları, Home /
 * End ve harfle arama `ListBox`'tan gelir. Daralmış rayda etiketler `Tooltip` ile sağda görünür;
 * genişletme düğmesiyle etiketler açılır, genişlik yumuşakça değişir.
 */
function Rail() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const { pathname } = useLocation()
  const [expanded, setExpanded] = useState(loadExpanded)

  // Alt sayfalar da (örn. /is-akislari/:box) üst menü öğesini seçili tutar
  const current = railEntries.find((e) => e.href && matchPath({ path: e.href, end: false }, pathname))?.id

  const toggle = () => {
    setExpanded((v) => {
      try {
        localStorage.setItem(RAIL_KEY, v ? '0' : '1')
      } catch {
        // Depolama kapalıysa tercih yalnızca bu oturumda kalır
      }
      return !v
    })
  }

  const toggleLabel = expanded ? 'Menüyü daralt' : 'Menüyü genişlet'
  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen

  // İpucu, öğenin fareyle üstüne gelinmesi ya da klavyeyle odaklanmasıyla açılır (yalnızca dar rayda)
  const entry = ({ id, label, icon: Icon, href }: RailEntry) => (
    <ListBox.Item key={id} id={id} href={href} textValue={label} className={railItem}>
      {({ isHovered, isFocusVisible }) => (
        <>
          <Tooltip isOpen={!expanded && (isHovered || isFocusVisible)}>
            {/*
             * İkon yuvası ipucuna yalnızca konum verir: odak, tıklama ve rol seçenek öğesinde kalsın diye
             * tetikleyicinin kendi `button` rolü, sekme durağı ve işaretçi olayları kapatıldı.
             */}
            <Tooltip.Trigger role="presentation" tabIndex={-1} className="pointer-events-none grid size-9 shrink-0 place-items-center">
              <Icon {...ICON} />
            </Tooltip.Trigger>
            <Tooltip.Content placement="right" offset={TIP_OFFSET}>
              {label}
            </Tooltip.Content>
          </Tooltip>
          <Text
            slot="label"
            className={cn(
              'whitespace-nowrap text-current! transition-opacity duration-200 ease-out motion-reduce:transition-none',
              !expanded && 'opacity-0',
            )}
          >
            {label}
          </Text>
        </>
      )}
    </ListBox.Item>
  )

  return (
    <Surface
      variant="secondary"
      role="navigation"
      aria-label="Ana menü"
      className={cn(
        edge,
        'sticky top-4 flex h-[calc(100vh-5.5rem)] shrink-0 flex-col justify-between overflow-hidden rounded-panel px-3.5 py-3 backdrop-blur-xl transition-[width] duration-250 ease-out motion-reduce:transition-none',
        expanded ? 'w-56' : 'w-16',
      )}
    >
      <Box className="flex flex-col gap-2">
        <Tooltip>
          <Button
            isIconOnly
            variant="secondary"
            aria-label={toggleLabel}
            aria-expanded={expanded}
            onPress={toggle}
            className={cn('size-9', tile, focusRing)}
          >
            <ToggleIcon {...ICON} />
          </Button>
          <Tooltip.Content placement="right" offset={TIP_OFFSET}>
            {toggleLabel}
          </Tooltip.Content>
        </Tooltip>

        {/* Seçim denetimli ve yalnızca rotadan türetiliyor; rotasız öğelere basmak seçimi değiştirmez */}
        <ListBox
          aria-label="Sayfalar"
          selectionMode="single"
          selectedKeys={current ? [current] : []}
          className="overflow-visible p-0 [&>*+*]:mt-2"
        >
          {entry(backEntry)}
          <Separator />
          {railEntries.map(entry)}
        </ListBox>
      </Box>

      {/* Tema: dar rayda dikey, geniş rayda yatay bölmeli hap */}
      <ToggleButtonGroup
        aria-label="Tema"
        size="sm"
        orientation={expanded ? 'horizontal' : 'vertical'}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[isDark ? 'dark' : 'light']}
        onSelectionChange={(keys) => setTheme([...keys][0] === 'dark' ? 'dark' : 'light')}
      >
        {themeEntries.map(({ id, label, icon: Icon }) => (
          <Tooltip key={id}>
            <ToggleButton id={id} isIconOnly aria-label={label}>
              <Icon {...ICON} />
            </ToggleButton>
            <Tooltip.Content placement={expanded ? 'top' : 'right'} offset={expanded ? undefined : TIP_OFFSET}>
              {label}
            </Tooltip.Content>
          </Tooltip>
        ))}
      </ToggleButtonGroup>
    </Surface>
  )
}

export function WorkspaceShell() {
  const navigate = useNavigate()
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null)
  return (
    <RouterProvider navigate={navigate} useHref={useHref}>
      <CrumbsContext value={setCrumbs}>
        <Box className="soft-theme soft-canvas min-h-screen">
          <Header crumbs={crumbs} />
          <Box className="flex gap-4 px-5 pb-5">
            <Rail />
            <Box role="main" className="flex min-w-0 flex-1 flex-col gap-4">
              <Outlet />
            </Box>
          </Box>
          {/* Sayfaların "Geri al"lı bildirimleri (ör. ana sayfadaki kararlar); portal olduğu için sınıf yeniden verilir */}
          <Toast.Provider placement="bottom end" className="soft-theme" />
        </Box>
      </CrumbsContext>
    </RouterProvider>
  )
}
