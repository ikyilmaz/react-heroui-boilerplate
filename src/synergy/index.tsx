import {
  memo,
  startTransition,
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
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
  FolderOpen,
  House,
  Megaphone,
  Menu,
  MessageCircle,
  Moon,
  Palette,
  Search,
  SquareArrowOutUpRight,
  Sun,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { CURRENT_USER, avatarColor, initials, menuApps } from '@/synergy/shared/workflowData'
import { BASE, useOpenApp } from '@/synergy/paths'
import { useMediaQuery } from '@/synergy/shared/hooks'
import {
  LookContext,
  SettingsContext,
  setColorMode,
  useIsDark,
  useThemeSettings,
  type Look,
  type ThemeSettings,
} from '@/synergy/shared/themeSettings'
import {
  MAX_SCREENS,
  START,
  activeScreen,
  canGoBack,
  canGoForward,
  findApp,
  isBlocked,
  tabOf,
  workspaceReducer,
} from '@/synergy/shared/workspace'
import { decodeWorkspace } from '@/synergy/shared/workspaceUrl'
import { ThemePanel } from '@/synergy/shared/ThemePanel'
import { FormDeck } from '@/synergy/FormDeck'
import { APP_THEME } from '@/synergy/theme'
import { MotionScope } from '@/synergy/motion'
import { AllAppsButton, AllAppsHandle, AllAppsPanel } from '@/synergy/AllApps'
import {
  CHROME_SPACE,
  CHROME_TIP,
  StartDock,
  isColumn,
  type ChromePlace,
  type StartActions,
} from '@/synergy/StartMenu'
import { Workspace, useWorkspaceUrl, type Act } from '@/synergy/Workspace'
import { isValidPath } from '@/synergy/screens'
import { AntTheme } from '@/synergy/ant/theme'
import { useNotify } from '@/synergy/ant/hr'
import { CARD, IC, Tip, cn } from '@/synergy/ant/ui'
import { Indicator } from '@/synergy/ant/motion'
import brandIcon from '@/synergy/assets/brand/icon.svg'
import brandIconDark from '@/synergy/assets/brand/icon-dark.svg'
import brandWordmark from '@/synergy/assets/brand/wordmark.svg'
import brandWordmarkLight from '@/synergy/assets/brand/wordmark-light.svg'

/*
 * Kabuk: üst çubuk (logo, geri / ileri, raf, eylemler, kullanıcı) ya da solda dikeyde ortada
 * yüzen raf (StartMenu.tsx: tepede başlat kutusu, ardından uygulamalar). İçerik çalışma alanı
 * (Workspace.tsx): uygulama genelindeki sekmeler; kabuk durumunu tutar ve adresle eşler. 640px
 * altında raf çekmeceye taşınır.
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
  const openApp = useOpenApp()
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
        openApp(app)
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

/** Seçili sekmenin geçmişi (geri / ileri; kabuk verir). */
interface HistoryNav {
  back: boolean
  forward: boolean
  go: (dir: -1 | 1) => void
}

/**
 * Geri / ileri: seçili sekmenin kendi geçmişinde (sekmeler tarayıcı sekmesi gibi). `compact`: 28px
 * (üst çubukta); kabukta 32px.
 */
function HistoryButtons({
  nav,
  tip = 'bottom',
  className,
  compact,
}: {
  nav: HistoryNav
  /** İpucunun yönü (alttaki çubukta yukarı). */
  tip?: 'bottom' | 'top'
  className?: string
  compact?: boolean
}) {
  return (
    <Flex
      align="center"
      className={cn('shrink-0 rounded-full bg-surface p-0.5', 'me-2', card, className)}
    >
      {(
        [
          { label: 'Geri', icon: ChevronLeft, dir: -1, on: nav.back },
          { label: 'İleri', icon: ChevronRight, dir: 1, on: nav.forward },
        ] as const
      ).map(({ label, icon: Icon, dir, on }) => (
        <Tip key={label} label={label} placement={tip}>
          <Button
            type="text"
            size="small"
            aria-label={label}
            disabled={!on}
            onClick={() => nav.go(dir)}
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

function TopBar({
  onMenu,
  panel,
  onPanel,
}: {
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
  tip?: (typeof CHROME_TIP)[ChromePlace]
  open: boolean
  onOpenChange: (open: boolean) => void
  placement: (typeof PANEL_PLACEMENT)[ChromePlace]
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

/** Kabuktaki panellerin açıldığı yön: içeriğe doğru, kabuğun ucundan. */
const PANEL_PLACEMENT = {
  left: 'rightBottom',
  right: 'leftBottom',
  top: 'bottomRight',
  bottom: 'topRight',
} as const

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
  /** Kabuğun konumu: panel içeriğe doğru açılır (sol rayda sağa, alttaki çubukta yukarı…). */
  side?: ChromePlace
  compact?: boolean
}) {
  return (
    <BarButton
      label={label}
      icon={icon}
      compact={compact}
      tip={CHROME_TIP[side]}
      open={isOpen}
      onOpenChange={onOpenChange}
      placement={PANEL_PLACEMENT[side]}
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

/**
 * Çekmecedeki raf (dar ekran): basınca uygulamanın sekmesine geçilir, yoksa yeni sekmede açılır
 * (`onApp`). `group`: göstergenin kimliği (raf ve çekmece ayrı kayar).
 */
function DockList({
  expanded,
  current,
  onApp,
  onNavigate,
  group = 'dock',
}: {
  expanded: boolean
  current: string | undefined
  onApp: DockOpen
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
                  onClick={(e) => {
                    e.preventDefault()
                    onApp(id)
                    onNavigate?.()
                  }}
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

/* --- Raftaki uygulamalar ---------------------------------------------------------------------- */

/** Raftaki dairelerin ölçüleri (px; temanın boşluk ölçeğinden bağımsız): solda 40px, üstte 36px. */
const DOCK_SIZE = {
  top: { circle: 'size-[36px]', icon: 16 },
  left: { circle: 'size-[40px]', icon: 18 },
} as const

/** Raftaki uygulama dairesi (boyu `DOCK_SIZE`). */
const APP_CIRCLE =
  'flex shrink-0 items-center justify-center rounded-full text-foreground/70 no-underline transition-colors duration-200 hover:bg-surface-secondary hover:text-foreground'
/** Seçili sekmenin uygulaması: dolu birincil renk. */
const APP_ACTIVE = 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'

/** Raftan açılış: `force` uygulamanın sekmesi varken de yenisi, `background` geçmeden. */
type DockOpen = (id: string, opts?: { force?: boolean; background?: boolean }) => void

/**
 * Raftaki uygulamalar: Başlangıç ve uygulamalar daire, seçili sekmenin uygulaması dolu birincil
 * renkte (yerleri sabit, yalnızca renk geçer). Basınca uygulamanın sekmesine geçilir, yoksa yeni
 * sekmede açılır (`onApp`); sağ tık "Yeni sekmede aç" sekmesi varken de yenisini, Ctrl / Cmd / orta
 * tık yenisini geçmeden açar. Sayfası olmayan uygulama pasif.
 */
function DockApps({
  current,
  place,
  onApp,
}: {
  current: string | undefined
  place: ChromePlace
  onApp: DockOpen
}) {
  const column = isColumn(place)
  const size = DOCK_SIZE[column ? 'left' : 'top']
  const tip = CHROME_TIP[place]
  return (
    <Flex role="list" aria-label="Uygulamalar" className={cn('flex items-center', column && 'flex-col')}>
      {dockEntries
        .filter((e) => e.id !== 'geri')
        .map((e) => {
          const Icon = e.icon
          const active = e.id === current
          // Başlangıç tek: ikinci sekmesi olmaz
          const many = e.id !== 'baslangic'
          return (
            <Flex key={e.id} role="listitem" className="relative flex shrink-0">
              <Tip label={e.label} placement={tip}>
                {e.href ? (
                  // İpucu ile sağ tık menüsü aynı tetikleyiciyi paylaşamaz: menü sarmalayıcıda
                  <Flex className="inline-flex">
                    <Dropdown
                      trigger={['contextMenu']}
                      disabled={!many}
                      menu={{
                        'aria-label': e.label,
                        items: [
                          {
                            key: 'tab',
                            label: 'Yeni sekmede aç',
                            icon: <SquareArrowOutUpRight {...IC} size={15} />,
                          },
                        ],
                        onClick: () => onApp(e.id, { force: true }),
                      }}
                    >
                      <Link
                        to={e.href}
                        aria-label={e.label}
                        aria-current={active || undefined}
                        onClick={(ev) => {
                          ev.preventDefault()
                          const extra = many && (ev.ctrlKey || ev.metaKey)
                          onApp(e.id, extra ? { force: true, background: true } : undefined)
                        }}
                        onAuxClick={(ev) => {
                          if (ev.button !== 1 || !many) return
                          ev.preventDefault()
                          onApp(e.id, { force: true, background: true })
                        }}
                        className={cn(APP_CIRCLE, size.circle, active && APP_ACTIVE)}
                      >
                        <Icon {...IC} size={size.icon} className="shrink-0" />
                      </Link>
                    </Dropdown>
                  </Flex>
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
            </Flex>
          )
        })}
    </Flex>
  )
}

/**
 * Kabuk (tema paneli › Gezinme): ayrı yüzen paneller.
 * - Solda / Sağda: o kenarda alt alta: üstte logo ve yan yana geri / ileri, ortada raf (StartMenu:
 *   başlat ve uygulamalar; başlat kutusu o kenardan açılır), altta sohbet / duyurular, tema, kullanıcı.
 * - Üstte / Altta: ortada yatay raf; solda köşedeki tutamaç (tüm uygulamalar paneli soldan yüzerek
 *   açılır), geri / ileri ve logo; sağda eylemler ve kullanıcı. Altta ipuçları ve paneller yukarı açılır.
 * Zemini olan panel yalnızca raf; diğerleri zeminsiz. Geri / ileri seçili sekmenin geçmişinde.
 */
const Chrome = memo(function Chrome({
  place,
  actions,
  current,
  history,
  onApp,
  panel,
  onPanel,
  onTheme,
  appsOpen,
  onApps,
}: {
  place: ChromePlace
  actions: StartActions
  /** Seçili sekmenin uygulaması (raftaki dolu daire). */
  current: string | undefined
  history: HistoryNav
  onApp: DockOpen
  panel: 'news' | 'chat' | null
  onPanel: (p: 'news' | 'chat' | null) => void
  onTheme: () => void
  /** Tüm uygulamalar paneli (üstteyken köşedeki tutamaç açar). */
  appsOpen: boolean
  onApps: () => void
}) {
  const column = isColumn(place)
  const dark = useIsDark()
  const tip = CHROME_TIP[place]
  const themeLabel = dark ? 'Açık tema' : 'Koyu tema'
  // Çubukta kompakt (44px): logo, düğmeler ve kullanıcı da küçük
  const actionButton = cn(
    'text-muted hover:text-foreground',
    column ? 'size-10' : 'size-[32px] min-w-[32px]',
  )
  const actionIcon = column ? 20 : 18

  const logo = (
    <Link
      to={BASE}
      aria-label="Bimser Synergy"
      onClick={(e) => {
        e.preventDefault()
        onApp('baslangic')
      }}
      className="flex shrink-0 items-center gap-2.5 no-underline"
    >
      <LogoMark size={column ? 34 : 30} />
      {!column && <Wordmark height={16} className="hidden lg:block" />}
    </Link>
  )

  // Raf (StartMenu): başlat, ardından uygulamalar (yerleri sabit; raf yalnızca yerleşim değişince
  // ölçülür, Motion `layoutDependency`)
  const dock = (
    <StartDock place={place} actions={actions} layoutKey={place}>
      {(start) => (
        <>
          {start}
          <Divider
            orientation={column ? 'horizontal' : 'vertical'}
            className={column ? 'my-1 w-6 min-w-0' : 'top-0 mx-0.5 h-5'}
          />
          <DockApps current={current} place={place} onApp={onApp} />
        </>
      )}
    </StartDock>
  )

  // Eylemler ve kullanıcı
  const actionsGroup = (
    <Flex align="center" className={cn('shrink-0 gap-0.5', column ? 'flex-col' : 'ms-auto')}>
      <PanelButton
        label="Sohbet"
        icon={MessageCircle}
        side={place}
        compact={!column}
        isOpen={panel === 'chat'}
        onOpenChange={(o) => onPanel(o ? 'chat' : null)}
      />
      <PanelButton
        label="Duyurular"
        icon={Megaphone}
        side={place}
        compact={!column}
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
          size={column ? 36 : 32}
          className={cn(column ? 'mt-1 text-sm' : 'ms-1 text-[0.8125rem]')}
        />
      </Tip>
    </Flex>
  )

  if (column)
    return (
      <Flex
        vertical
        align="center"
        justify="space-between"
        className={cn(
          'pointer-events-none fixed inset-y-3 z-50 hidden w-[52px] gap-3 sm:flex',
          place === 'left' ? 'start-3' : 'end-3',
        )}
      >
        {/* Üst: logo ve yan yana geri / ileri (zeminsiz) */}
        <Flex vertical align="center" className="pointer-events-auto gap-2 pt-1.5">
          {logo}
          <HistoryButtons nav={history} className="me-0" />
        </Flex>
        {dock}
        {/* Alt: eylemler ve kullanıcı (zeminsiz) */}
        <Flex vertical align="center" className="pointer-events-auto shrink-0 pb-1.5">
          {actionsGroup}
        </Flex>
      </Flex>
    )
  return (
    // Üç sütun: solda tutamaç + geri / ileri + logo, ortada raf (hep tam ortada), sağda eylemler
    // Arkada sayfa renginde şerit: kaydırılan içerik çubuğun altında karışmasın (panel zemini değil);
    // dokusu görüntü alanına sabit, sayfanın doku katmanıyla aynı hizada. İçeriğin başladığı yerin
    // 1 birim üstünde biter: kartların dışa çizilen konturunu ve gölgesini örtmesin
    // Kompakt: 44px (raf 36px dairelerle), içerik üstte 68px'ten başlar, altta 68px yukarıda biter
    // (`CHROME_SPACE`)
    <Flex
      className={cn(
        "pointer-events-none fixed inset-x-3 z-50 hidden h-[44px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 before:absolute before:-inset-x-3 before:h-[calc(68px-var(--spacing))] before:-z-10 before:bg-background before:bg-(image:--background-texture) before:bg-size-(--background-texture-size) before:bg-fixed before:content-[''] sm:grid",
        place === 'top' ? 'top-3 before:-top-3' : 'bottom-3 before:-bottom-3',
      )}
    >
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
        <HistoryButtons
          nav={history}
          tip={place === 'bottom' ? 'top' : 'bottom'}
          compact
          className="me-0"
        />
        {logo}
      </Flex>
      {dock}
      <Flex justify="flex-end" className="pointer-events-auto min-w-0 pe-1">
        {actionsGroup}
      </Flex>
    </Flex>
  )
})

/** Tema paneli › Gezinme seçeneğinin kabuktaki yeri (`default` = Solda). */
const NAV_PLACE: Record<string, ChromePlace> = {
  default: 'left',
  right: 'right',
  top: 'top',
  bottom: 'bottom',
}

/** Adresin raftaki uygulaması (talep kendi sekmesinde de İş Akış Yönetimi'nin). */
function appOf(path: string) {
  if (path.startsWith('/talepler/')) return 'is-akis-yonetimi'
  return dockEntries.find((e) => e.match && (path === e.match || path.startsWith(`${e.match}/`)))
    ?.id
}

/**
 * Kabuğun içi (antd temasının içinde: bildirimler): çalışma alanının durumu ve adresi, raf, ana
 * alan, çekmece ve paneller.
 */
function Frame({
  theme,
  setTheme,
  look,
  themeOpen,
  setThemeOpen,
}: {
  theme: ThemeSettings
  setTheme: (next: ThemeSettings) => void
  look: Look
  themeOpen: boolean
  setThemeOpen: (open: boolean) => void
}) {
  const location = useLocation()
  const { pathname } = location
  const notify = useNotify()

  // Çalışma alanı: adresten kurulur (geçersiz yerler atlanır), adresle eşlenir
  const [ws, dispatch] = useReducer(workspaceReducer, undefined, () =>
    decodeWorkspace(location.pathname, location.search, isValidPath),
  )
  const latest = useRef({ ws, notify })
  useLayoutEffect(() => {
    latest.current = { ws, notify }
  })
  const pushNext = useRef(false)
  // Sınıra takılan açılış yapılmaz, uyarılır
  const act = useCallback<Act>((a, opts) => {
    if (isBlocked(latest.current.ws, a)) {
      latest.current.notify.warning(
        `En çok ${MAX_SCREENS} ekran açılabilir`,
        'Yenisini açmak için açık sekmelerden birini kapatın.',
      )
      return
    }
    if (opts?.push) pushNext.current = true
    dispatch(a)
  }, [])
  useWorkspaceUrl(ws, act, pushNext)

  // Raf: uygulamanın sekmesine geçilir (formun altındaki listesi de sayılır), yoksa yeni sekmede
  // açılır (`force`: varken de yenisi; `background`: geçmeden); Başlangıç ve logo Başlangıç'a
  const openDock = useCallback<DockOpen>(
    (id, opts) => {
      const e = dockEntries.find((x) => x.id === id)
      if (!e?.href) return
      const s = latest.current.ws
      const hit = e.match && e.href !== BASE && !opts?.force ? findApp(s, e.match) : undefined
      const tab = hit ? tabOf(s, hit.key) : undefined
      startTransition(() =>
        act(
          e.href === BASE || e.href === '/'
            ? { type: 'select', tab: START }
            : tab
              ? { type: 'select', tab: tab.key }
              : { type: 'open', path: e.href!, where: 'tab', ...opts },
        ),
      )
    },
    [act],
  )
  const current = ws.active === START ? 'baslangic' : appOf(activeScreen(ws).path)
  const active = activeScreen(ws).key
  const back = canGoBack(ws, active)
  const forward = canGoForward(ws, active)
  const go = useCallback(
    (dir: -1 | 1) => {
      const key = activeScreen(latest.current.ws).key
      startTransition(() => act({ type: dir < 0 ? 'back' : 'forward', screen: key }))
    },
    [act],
  )
  const history = useMemo(() => ({ back, forward, go }), [back, forward, go])

  // Çekmece açıldığı adreste açık kalır; gezinince kendiliğinden kapanır
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null)
  // Tek kabuk: yanda sütun ya da çubuk (tema paneli › Gezinme); 640px altında üst çubuk + çekmece
  const place: ChromePlace = NAV_PLACE[look.nav] ?? 'left'
  const wide = useMediaQuery('(min-width: 640px)')
  const [appsOpen, setAppsOpen] = useState(false)
  const [panel, setPanel] = useState<'news' | 'chat' | null>(null)
  const openTheme = useCallback(() => setThemeOpen(true), [setThemeOpen])
  const openApps = useCallback(() => setAppsOpen(true), [])
  const startActions = useMemo<StartActions>(
    () => ({ onTheme: openTheme, onPanel: setPanel }),
    [openTheme],
  )

  return (
    // Zemin dokusu (tema paneli): görüntü alanına sabit katman, içeriğin arkasında (kök kendi yığın
    // bağlamı: katman kökün zemininin üstünde, içeriğin altında)
    <Flex
      vertical
      className="isolate min-h-screen bg-background text-foreground antialiased before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-(image:--background-texture) before:bg-size-(--background-texture-size) before:content-['']"
    >
      {wide ? (
        <Chrome
          place={place}
          actions={startActions}
          current={current}
          history={history}
          onApp={openDock}
          panel={panel}
          onPanel={setPanel}
          onTheme={openTheme}
          appsOpen={appsOpen}
          onApps={openApps}
        />
      ) : (
        <TopBar onMenu={() => setDrawer(true)} panel={panel} onPanel={setPanel} />
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
          wide && place === 'top' ? '[--chrome-top:68px]' : '[--chrome-top:0px]',
        )}
      >
        <Workspace state={ws} act={act} />
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
          onApp={openDock}
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

      {/* Çubukta köşedeki tutamaçtan yüzen kutu; dar ekranda çekmeceden, kenara yapışık */}
      <AllAppsPanel
        isOpen={appsOpen}
        onOpenChange={setAppsOpen}
        floating={wide && !isColumn(place)}
      />

      {/* Modal / drawer'da açılan formlar: sayfanın üstünde, deste */}
      <FormDeck />

      <ThemePanel
        kit={APP_THEME}
        isOpen={themeOpen}
        onClose={() => setThemeOpen(false)}
        settings={theme}
        onChange={setTheme}
        reducedBySystem={theme.motion === 'full' && look.motion !== 'full'}
      />
    </Flex>
  )
}

function Shell() {
  // Tema paneli: ayarlar <html>'e uygulanır, kabuktan çıkınca temizlenir (shared/themeSettings.ts)
  const [theme, setTheme, look] = useThemeSettings(APP_THEME)
  const [themeOpen, setThemeOpen] = useState(false)
  // Sabit bağlam değeri: kabuk her çizildiğinde okuyanlar yeniden çizilmesin
  const settingsControl = useMemo(
    () => ({ settings: theme, update: setTheme, openPanel: () => setThemeOpen(true) }),
    [theme, setTheme],
  )
  return (
    <LookContext value={look}>
      <SettingsContext value={settingsControl}>
        <MotionScope>
          {/* antd bileşenlerinin teması (kabuğun tema değişkenlerinden, ant/theme.tsx) */}
          <AntTheme>
            <Frame
              theme={theme}
              setTheme={setTheme}
              look={look}
              themeOpen={themeOpen}
              setThemeOpen={setThemeOpen}
            />
          </AntTheme>
        </MotionScope>
      </SettingsContext>
    </LookContext>
  )
}

/** Uygulama kabuğu: tek rota (`src/router.tsx`); sayfalar çalışma alanının ekranlarında. */
export function AppShell() {
  return <Shell />
}
