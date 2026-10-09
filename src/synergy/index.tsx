import {
  createContext,
  memo,
  startTransition,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
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
import { ShellRouter, Workspace, useWorkspaceUrl, type Act } from '@/synergy/Workspace'
import { PlaceContext } from '@/synergy/tabs/context'
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
                      <Typography.Text className="min-w-0 text-current truncate">
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
 * Kabuğun seçili sekmeye bağlı iki değeri: raftaki dolu uygulama ve geri / ileri. Yalnızca
 * kullananlar (raf daireleri, geri / ileri) okur: sekme geçişinde kabuğun geri kalanı çizilmez.
 */
const ChromeNavContext = createContext<{ current: string | undefined; history: HistoryNav }>({
  current: undefined,
  history: { back: false, forward: false, go: () => {} },
})

/**
 * Geri / ileri: seçili sekmenin kendi geçmişinde (sekmeler tarayıcı sekmesi gibi); sekme şeridinin
 * solunda, Başlangıç sekmesinden hemen önce. Şeridin parçası gibi: çerçevesiz, sekme yaprağının
 * zemini (`--tab-bg`); üzerine gelince çıkan hapla aynı boy ve köşe (sekme − `--tab-gap`, üstü seçili sekmeyle aynı hizada,
 * `--tab-nr`), düğmeler kare (`--hb`; değişkenler sarmalayıcıda, `Workspace.tsx`).
 */
const HistoryButtons = memo(function HistoryButtons() {
  const nav = useContext(ChromeNavContext).history
  return (
    <Flex
      align="center"
      className="h-[calc(var(--tab-h)-var(--tab-gap))] shrink-0 rounded-(--tab-nr) bg-(--tab-bg) p-[2px]"
    >
      {(
        [
          { label: 'Geri', icon: ChevronLeft, dir: -1, on: nav.back },
          { label: 'İleri', icon: ChevronRight, dir: 1, on: nav.forward },
        ] as const
      ).map(({ label, icon: Icon, dir, on }) => (
        <Tip key={label} label={label} placement="bottom">
          <Button
            type="text"
            size="small"
            aria-label={label}
            disabled={!on}
            onClick={() => nav.go(dir)}
            icon={<Icon {...IC} size={18} />}
            className="size-(--hb) min-w-(--hb) rounded-[calc(var(--tab-nr)-2px)] p-0 text-muted enabled:hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] enabled:hover:text-foreground disabled:opacity-50"
          />
        </Tip>
      ))}
    </Flex>
  )
})

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
  tip?: 'bottom'
  open: boolean
  onOpenChange: (open: boolean) => void
  placement: 'bottomRight'
  popupClassName: string
  content: ReactNode
  /** Kompakt (sekme şeridinin yanında): 32px düğme. */
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
  compact,
}: {
  label: string
  icon: LucideIcon
  /** Başlat kutusundan da açılır (kabukta tutulur). */
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  compact?: boolean
}) {
  return (
    <BarButton
      label={label}
      icon={icon}
      compact={compact}
      open={isOpen}
      onOpenChange={onOpenChange}
      placement="bottomRight"
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
  onApp,
  onNavigate,
  group = 'dock',
}: {
  expanded: boolean
  onApp: DockOpen
  onNavigate?: () => void
  group?: string
}) {
  const { current } = useContext(ChromeNavContext)
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
const DockApps = memo(function DockApps({ place, onApp }: { place: ChromePlace; onApp: DockOpen }) {
  const { current } = useContext(ChromeNavContext)
  const column = isColumn(place)
  const size = DOCK_SIZE[column ? 'left' : 'top']
  const tip = CHROME_TIP[place]
  return (
    <Flex
      role="list"
      aria-label="Uygulamalar"
      className={cn('flex items-center', column && 'flex-col')}
    >
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
})

/**
 * Sekme şeridinin sağındaki eylemler ve kullanıcı (her iki gezinme konumunda): sohbet / duyurular,
 * tema ayarları, açık / koyu, kullanıcı. Kompakt (32px); ipuçları ve paneller aşağı açılır.
 */
const ShellActions = memo(function ShellActions({
  panel,
  onPanel,
  onTheme,
}: {
  panel: 'news' | 'chat' | null
  onPanel: (p: 'news' | 'chat' | null) => void
  onTheme: () => void
}) {
  const dark = useIsDark()
  const themeLabel = dark ? 'Açık tema' : 'Koyu tema'
  const button = 'size-[32px] min-w-[32px] text-muted hover:text-foreground'
  return (
    <Flex align="center" className="shrink-0 gap-0.5 ps-2 pe-1">
      <PanelButton
        label="Sohbet"
        icon={MessageCircle}
        compact
        isOpen={panel === 'chat'}
        onOpenChange={(o) => onPanel(o ? 'chat' : null)}
      />
      <PanelButton
        label="Duyurular"
        icon={Megaphone}
        compact
        isOpen={panel === 'news'}
        onOpenChange={(o) => onPanel(o ? 'news' : null)}
      />
      <Tip label="Tema ayarları" placement="bottom">
        <Button
          type="text"
          aria-label="Tema ayarları"
          onClick={onTheme}
          icon={<Palette {...IC} size={18} />}
          className={button}
        />
      </Tip>
      <Tip label={themeLabel} placement="bottom">
        <Button
          type="text"
          aria-label={themeLabel}
          onClick={() => setColorMode(dark ? 'light' : 'dark')}
          icon={dark ? <Sun {...IC} size={18} /> : <Moon {...IC} size={18} />}
          className={button}
        />
      </Tip>
      <Tip label={`${CURRENT_USER.name} · ${CURRENT_USER.department}`} placement="bottom">
        <UserAvatar size={32} className="ms-1 text-[0.8125rem]" />
      </Tip>
    </Flex>
  )
})

/**
 * Kabuk (tema paneli › Gezinme): ayrı yüzen paneller. Geri / ileri ve eylemler her iki konumda
 * sekme şeridinin satırında (`HistoryButtons`, `ShellActions`; çalışma alanına verilir).
 * - Solda: sol kenarda üstte logo (sekme satırıyla aynı hizada), ortada raf (StartMenu: başlat ve
 *   uygulamalar; başlat kutusu o kenardan açılır).
 * - Üstte: ortada yatay raf; solda köşedeki tutamaç (tüm uygulamalar paneli soldan yüzerek açılır)
 *   ve logo.
 * Zemini olan panel yalnızca raf; logo zeminsiz.
 */
const Chrome = memo(function Chrome({
  place,
  actions,
  onApp,
  appsOpen,
  onApps,
}: {
  place: ChromePlace
  actions: StartActions
  onApp: DockOpen
  /** Tüm uygulamalar paneli (üstteyken köşedeki tutamaç açar). */
  appsOpen: boolean
  onApps: () => void
}) {
  const column = isColumn(place)

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
          <DockApps place={place} onApp={onApp} />
        </>
      )}
    </StartDock>
  )

  if (column)
    return (
      // Üç satır: üstte logo, raf tam ortada, alt satır boş (rafı ortada tutar)
      <Flex className="pointer-events-none fixed inset-y-3 start-3 z-50 hidden w-[52px] grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] justify-items-center gap-3 sm:grid">
        {/* Logo geri / ileri ile aynı hizada: sekme satırının ortasından 4px yukarıda (satır 0.25rem
            pay + 2.5rem sekme; logo 34px) */}
        <Flex className="pointer-events-auto self-start pt-[calc(1.5rem-21px)]">{logo}</Flex>
        {dock}
      </Flex>
    )
  return (
    // Üç sütun: solda tutamaç + logo, ortada raf (hep tam ortada), sağ sütun boş
    // Arkada sayfa renginde şerit: kaydırılan içerik çubuğun altında karışmasın (panel zemini değil);
    // dokusu görüntü alanına sabit, sayfanın doku katmanıyla aynı hizada. İçeriğin başladığı yerin
    // 1 birim üstünde biter: kartların dışa çizilen konturunu ve gölgesini örtmesin
    // Kompakt: 44px (raf 36px dairelerle), içerik 68px'ten başlar (`CHROME_SPACE`)
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
      <Flex align="center" className="pointer-events-auto min-w-0 overflow-hidden ps-[24px]">
        {logo}
      </Flex>
      {dock}
    </Flex>
  )
})

/**
 * Dar ekranın çekmecesi: arama, raf, tüm uygulamalar, tema. Seçili uygulama bağlamdan
 * (`ChromeNavContext`): çekmece kapalıyken sekme geçişinde çizilmez.
 */
const PhoneDrawer = memo(function PhoneDrawer({
  open,
  onClose,
  onApp,
  onApps,
  onTheme,
}: {
  open: boolean
  onClose: () => void
  onApp: DockOpen
  onApps: () => void
  onTheme: () => void
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
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
      <DockList expanded onApp={onApp} onNavigate={onClose} group="drawer" />
      <AllAppsButton expanded onPress={onApps} />
      <Flex align="center" className="gap-2">
        <ThemeButton onPress={onTheme} />
        <ThemeSwitch vertical={false} group="drawer" />
      </Flex>
    </Drawer>
  )
})

/** Tema paneli › Gezinme seçeneğinin kabuktaki yeri (`default` = Solda). */
const NAV_PLACE: Record<string, ChromePlace> = { default: 'left', top: 'top' }

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
  const notify = useNotify()

  // Çalışma alanı: adresten kurulur (geçersiz yerler atlanır), adresle eşlenir (`useWorkspaceUrl`)
  const [ws, dispatch] = useReducer(workspaceReducer, undefined, () =>
    decodeWorkspace(window.location.pathname, window.location.search, isValidPath),
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
  const takePush = useCallback(() => {
    const push = pushNext.current
    pushNext.current = false
    return push
  }, [])
  useWorkspaceUrl(ws, act, takePush)

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
  const nav = useMemo(() => ({ current, history }), [current, history])

  // Çekmece açıldığı yerde (seçili ekran ve adresi) açık kalır; gezinince kendiliğinden kapanır
  const where = activeScreen(ws).path
  const here = `${active}\t${where}`
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const openDrawer = useCallback(() => {
    const x = activeScreen(latest.current.ws)
    setDrawerAt(`${x.key}\t${x.path}`)
  }, [])
  const closeDrawer = useCallback(() => setDrawerAt(null), [])
  // Tek kabuk: yanda sütun ya da çubuk (tema paneli › Gezinme); 640px altında üst çubuk + çekmece
  const place: ChromePlace = NAV_PLACE[look.nav] ?? 'left'
  const wide = useMediaQuery('(min-width: 640px)')
  const [appsOpen, setAppsOpen] = useState(false)
  const [panel, setPanel] = useState<'news' | 'chat' | null>(null)
  const openTheme = useCallback(() => setThemeOpen(true), [setThemeOpen])
  const closeTheme = useCallback(() => setThemeOpen(false), [setThemeOpen])
  const openApps = useCallback(() => setAppsOpen(true), [])
  const appsFromDrawer = useCallback(() => {
    setDrawerAt(null)
    setAppsOpen(true)
  }, [])
  const themeFromDrawer = useCallback(() => {
    setDrawerAt(null)
    setThemeOpen(true)
  }, [setThemeOpen])
  const startActions = useMemo<StartActions>(
    () => ({ onTheme: openTheme, onPanel: setPanel }),
    [openTheme],
  )
  // Sekme şeridinin iki yanı (geniş ekranda; dar ekranda üst çubuk ve çekmece): sabit öğeler
  const stripStart = useMemo(() => <HistoryButtons />, [])
  const stripEnd = useMemo(
    () => <ShellActions panel={panel} onPanel={setPanel} onTheme={openTheme} />,
    [panel, openTheme],
  )

  return (
    // Kabuğun yönlendiricisi: yeri sabit, bağlantılar çalışma alanında açar. Seçili ekranın adresi
    // kabuğa bağlamla (başlat kutusu, tüm uygulamalar)
    <ShellRouter act={act}>
      <PlaceContext value={where}>
        <ChromeNavContext value={nav}>
          {/* Zemin dokusu (tema paneli): görüntü alanına sabit katman, içeriğin arkasında (kök kendi yığın
        bağlamı: katman kökün zemininin üstünde, içeriğin altında) */}
          <Flex
            vertical
            className="isolate min-h-screen bg-background text-foreground antialiased before:pointer-events-none before:fixed before:inset-0 before:-z-10 before:bg-(image:--background-texture) before:bg-size-(--background-texture-size) before:content-['']"
          >
            {wide ? (
              <Chrome
                place={place}
                actions={startActions}
                onApp={openDock}
                appsOpen={appsOpen}
                onApps={openApps}
              />
            ) : (
              <TopBar onMenu={openDrawer} panel={panel} onPanel={setPanel} />
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
              <Workspace
                state={ws}
                act={act}
                start={wide ? stripStart : undefined}
                end={wide ? stripEnd : undefined}
              />
            </Flex>

            {/* Dar ekranda raf çekmecede */}
            <PhoneDrawer
              open={drawerAt === here}
              onClose={closeDrawer}
              onApp={openDock}
              onApps={appsFromDrawer}
              onTheme={themeFromDrawer}
            />

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
              onClose={closeTheme}
              settings={theme}
              onChange={setTheme}
              reducedBySystem={theme.motion === 'full' && look.motion !== 'full'}
            />
          </Flex>
        </ChromeNavContext>
      </PlaceContext>
    </ShellRouter>
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

/**
 * Uygulama kabuğu (`src/App.tsx`): yönlendiricisi kendinde (`ShellRouter`), sayfalar çalışma alanının
 * ekranlarında, adres çalışma alanının (`useWorkspaceUrl`).
 */
export function AppShell() {
  return <Shell />
}
