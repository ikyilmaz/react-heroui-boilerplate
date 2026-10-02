import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  App,
  Avatar,
  Button,
  Card,
  ConfigProvider,
  Descriptions,
  Flex,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  type TableColumnsType,
  type ThemeConfig,
} from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import trTR from 'antd/locale/tr_TR'
import { resolve, tokensOf } from '@/synergy/ant/theme'
import { CARD, StatusTag, cn } from '@/synergy/ant/ui'
import { GroupLabel, SearchField } from '@/synergy/ant/parts'
import {
  GRID_GROUP_ROW,
  GRID_ROW,
  GRID_ROW_SELECTED,
  GRID_TABLE,
  GridFooter,
  ViewSwitch,
} from '@/synergy/ant/grid'
import { FormField, LongField } from '@/synergy/FormFields'
import { ItemsTable, Section } from '@/synergy/DetailTiles'
import type { RequestStatus } from '@/synergy/shared/workflowData'
import { FLUENT } from './fluent-paths'
import { themeOf, type ThemeProps } from './theme'

/*
 * Synergy UI V2 — Claude Design bileşen paketi. Uygulamanın antd bileşenleri (aynı tema tokenları,
 * aynı Tailwind görünüşü) ve ekranların yapı taşları; tuvalde `window.SynergyUI` olarak takılır.
 * Tema kökü (`Root` ya da `AppFrame`) Tweaks değerlerini alır ve altındaki her şeye uygular.
 */

const { Text, Title } = Typography

/* --- İkon --------------------------------------------------------------------------------------- */

/** Fluent UI System Icons (20px çizim), lucide adıyla: `Search`, `House`, `Workflow`… */
export function Icon({
  name,
  size = 16,
  filled = false,
  className,
  style,
}: {
  name: string
  size?: number
  filled?: boolean
  className?: string
  style?: CSSProperties
}) {
  const p = FLUENT[name]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={cn('shrink-0', className)}
      style={style}
    >
      {(filled ? p?.f : p?.r)?.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

/* --- Tema kökü ---------------------------------------------------------------------------------- */

const NavContext = createContext<'left' | 'top'>('left')

export interface RootProps extends ThemeProps {
  width?: number
  height?: number
  children?: ReactNode
}

/**
 * Tema kökü: Tweaks değerlerinden CSS değişkenlerini yazar, antd tokenlarını bu değişkenlerden çözer
 * (uygulamadaki `AntTheme` ile aynı hesap), açılır katmanları kökün içinde açar ve ölçeği uygular.
 */
export function Root({ width = 1440, height = 900, children, ...theme }: RootProps) {
  const t = themeOf(theme)
  const host = useRef<HTMLElement>(null)
  const [config, setConfig] = useState<ThemeConfig>()
  const key = JSON.stringify(t)
  useLayoutEffect(() => {
    if (host.current) setConfig(tokensOf(resolve(host.current), t.dark, true, 1, false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  // Katman sarmalayıcısı en dışta: antd stilleri (kökün kendi Flex'leri dahil) `@layer antd` içinde
  return (
    <StyleProvider layer>
      <Flex
        data-theme={t.dark ? 'dark' : 'light'}
        className={cn('synergy-root block overflow-hidden', t.dark ? 'dark' : 'light')}
        style={{ width, height, ...(t.vars as CSSProperties) }}
      >
        <Flex
          ref={host}
          vertical
          className="relative overflow-hidden bg-background font-sans text-sm text-foreground antialiased"
          style={{ width: width / t.zoom, height: height / t.zoom, zoom: t.zoom }}
        >
          <ConfigProvider
            locale={trTR}
            theme={config}
            variant="filled"
            wave={{ disabled: true }}
            card={{ variant: 'borderless' }}
            getPopupContainer={() => host.current ?? document.body}
          >
            <App component={false}>
              <NavContext.Provider value={t.nav}>{children}</NavContext.Provider>
            </App>
          </ConfigProvider>
        </Flex>
      </Flex>
    </StyleProvider>
  )
}

/* --- Uygulama kabuğu ---------------------------------------------------------------------------- */

const APPS = [
  { id: 'home', label: 'Başlangıç', icon: 'House' },
  { id: 'docs', label: 'Dokümanlar', icon: 'FolderOpen', off: true },
  { id: 'workflow', label: 'İş Akış Yönetimi', icon: 'Workflow' },
  { id: 'hr', label: 'İnsan Kaynakları', icon: 'Users' },
] as const

export interface TrailItem {
  label: string
  icon: string
}

function IconButton({
  label,
  icon,
  size = 18,
  className,
  filled,
}: {
  label: string
  icon: string
  size?: number
  className?: string
  filled?: boolean
}) {
  return (
    <Button
      type="text"
      aria-label={label}
      title={label}
      icon={<Icon name={icon} size={size} filled={filled} />}
      className={cn('text-muted', className)}
    />
  )
}

function Dock({
  current,
  trail = [],
  top,
  hrefs = {},
}: {
  current: string
  trail?: TrailItem[]
  top: boolean
  hrefs?: Record<string, string>
}) {
  return (
    <Flex
      vertical={!top}
      align="center"
      gap={4}
      className={cn('pointer-events-auto rounded-[28px] bg-surface p-1.5', CARD)}
    >
      <Button
        type="primary"
        shape="circle"
        aria-label="Başlat"
        href={hrefs.start}
        icon={<Icon name="Search" />}
        className="size-10! shadow-[0_0_0_4px_var(--accent-soft)]"
      />
      {APPS.map((a) => {
        const on = a.id === current
        return (
          <Flex key={a.id} vertical={!top} align="center" gap={4}>
            <Button
              type="text"
              shape="circle"
              aria-label={a.label}
              title={a.label}
              href={hrefs[a.id]}
              icon={<Icon name={a.icon} size={18} filled={on} />}
              className={cn(
                'size-10!',
                on && 'bg-accent! text-accent-foreground!',
                'off' in a && 'text-muted opacity-60',
              )}
            />
            {on && trail.length > 0 && (
              <Flex
                vertical={!top}
                align="center"
                gap={2}
                className="rounded-[20px] bg-surface-secondary p-[3px]"
              >
                {trail.map((it, i) => {
                  const cur = i === trail.length - 1
                  return (
                    <Button
                      key={`${i}-${it.label}`}
                      type="text"
                      shape="circle"
                      aria-label={it.label}
                      title={it.label}
                      icon={<Icon name={it.icon} filled={cur} />}
                      className={cn(
                        'size-[34px]!',
                        cur && 'bg-accent-soft! text-accent-soft-foreground!',
                      )}
                    />
                  )
                })}
              </Flex>
            )}
          </Flex>
        )
      })}
    </Flex>
  )
}

function UserAvatar({ size = 36 }: { size?: number }) {
  return (
    <Avatar
      size={size}
      className="shrink-0 bg-accent! text-[13px]! font-semibold text-accent-foreground!"
    >
      FT
    </Avatar>
  )
}

function Logo() {
  return (
    <Avatar
      size={36}
      icon={<Icon name="Layers" size={20} />}
      className="inline-flex! shrink-0 items-center justify-center bg-accent! text-accent-foreground!"
    />
  )
}

function History() {
  return (
    <Flex gap={2}>
      <Button
        type="text"
        size="small"
        aria-label="Geri"
        icon={<Icon name="ChevronLeft" size={14} />}
      />
      <Button
        type="text"
        size="small"
        aria-label="İleri"
        disabled
        icon={<Icon name="ChevronRight" size={14} />}
      />
    </Flex>
  )
}

function Actions({ vertical }: { vertical: boolean }) {
  return (
    <Flex vertical={vertical} align="center" gap={4}>
      <IconButton label="Sohbet" icon="MessageCircle" />
      <IconButton label="Duyurular" icon="Megaphone" />
      <IconButton label="Tema ayarları" icon="Palette" />
      <IconButton label="Koyu tema" icon="Moon" />
      <UserAvatar />
    </Flex>
  )
}

export interface AppFrameProps extends RootProps {
  /** Dock'ta açık uygulama: `home`, `workflow`, `hr`. */
  current?: string
  /** Açık uygulamanın konum izi (sonuncusu bulunulan yer). */
  trail?: TrailItem[]
  /** Başlat menüsü açık (dock kutuya dönüşmüş). */
  start?: boolean
  /** Prototip bağlantıları: `home`, `workflow`, `hr`, `start` (başlat düğmesi), `close` (menüyü kapat). */
  hrefs?: Record<string, string>
}

/** Uygulama kabuğu: tema kökü + solda ya da üstte (Tweaks › Gezinme) sabit kabuk + sayfa alanı. */
export function AppFrame({
  current = 'home',
  trail,
  start = false,
  hrefs,
  children,
  ...root
}: AppFrameProps) {
  return (
    <Root {...root}>
      <Frame current={current} trail={trail} start={start} hrefs={hrefs}>
        {children}
      </Frame>
    </Root>
  )
}

function Frame({
  current,
  trail,
  start,
  hrefs,
  children,
}: {
  current: string
  trail?: TrailItem[]
  start: boolean
  hrefs?: Record<string, string>
  children?: ReactNode
}) {
  const nav = useContext(NavContext)
  const top = nav === 'top'
  return (
    <Flex vertical={top} className="min-h-0 flex-1">
      {top ? (
        <Flex className="grid h-[52px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 pt-3">
          <Flex align="center" gap={10}>
            <Logo />
            <Text className="font-display text-xl font-bold">synergy</Text>
            <History />
          </Flex>
          {start ? (
            <Flex className="block h-[52px] w-[220px]" />
          ) : (
            <Dock current={current} trail={trail} top hrefs={hrefs} />
          )}
          <Flex justify="end">
            <Actions vertical={false} />
          </Flex>
        </Flex>
      ) : (
        <Flex
          vertical
          align="center"
          justify="space-between"
          className="my-3 ms-3 w-[52px] shrink-0"
        >
          <Flex vertical align="center" gap={8}>
            <Logo />
            <History />
          </Flex>
          {start ? (
            <Flex className="block h-[260px] w-[52px]" />
          ) : (
            <Dock current={current} trail={trail} top={false} hrefs={hrefs} />
          )}
          <Actions vertical />
        </Flex>
      )}
      <Flex vertical className={cn('min-h-0 min-w-0 flex-1 gap-3', top ? 'p-3' : 'py-3 ps-6 pe-3')}>
        {children}
      </Flex>
      {start && <StartPanel top={top} closeHref={hrefs?.close} />}
    </Flex>
  )
}

/* --- Başlat menüsü ------------------------------------------------------------------------------ */

const SECTIONS = [
  { label: 'Genel bakış', icon: 'LayoutGrid' },
  { label: 'İş Akış Yönetimi', icon: 'Workflow' },
  { label: 'Uygulamalar', icon: 'Blocks', on: true },
  { label: 'Görünüm', icon: 'Palette' },
]
const ALL_APPS = [
  { label: 'Başlangıç', icon: 'House', on: true },
  { label: 'İş Akış Yönetimi', icon: 'Workflow', count: 66 },
  { label: 'Satın Alma', icon: 'ShoppingBag', tree: true },
  { label: 'İnsan Kaynakları', icon: 'Users', tree: true },
  { label: 'Finans', icon: 'Landmark', tree: true },
  { label: 'İdari İşler', icon: 'FolderOpen', tree: true },
  { label: 'Kalite Yönetim Sistemi', icon: 'ShieldCheck', tree: true },
]

/** Dock'tan dönüşen başlat kutusu: arama, "Buradasınız", bölüm rafı, tüm uygulamalar. */
function StartPanel({ top, closeHref }: { top: boolean; closeHref?: string }) {
  return (
    <>
      {closeHref ? (
        <Typography.Link
          href={closeHref}
          aria-label="Menüyü kapat"
          className="absolute! inset-0 z-40 block bg-foreground/10 backdrop-blur-[2px]"
        />
      ) : (
        <Flex className="absolute inset-0 z-40 block bg-foreground/10 backdrop-blur-[2px]" />
      )}
      <Flex
        className={cn(
          'absolute z-50 grid h-[640px] w-[704px] grid-cols-[200px_minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] gap-3 rounded-[28px] bg-surface p-3',
          CARD,
          top ? 'inset-x-0 top-3 mx-auto' : 'inset-y-0 start-3 my-auto',
        )}
      >
        <Flex gap={8} className="col-span-2">
          <Input
            size="large"
            autoFocus
            placeholder="Tüm uygulamalarda ara"
            prefix={<Icon name="Search" className="text-muted" />}
            className="flex-1 rounded-full!"
          />
          <Button
            size="large"
            shape="circle"
            aria-label="Duyurular"
            icon={<Icon name="Megaphone" size={18} />}
          />
          <Button
            size="large"
            shape="circle"
            aria-label="Sohbet"
            icon={<Icon name="MessageCircle" size={18} />}
          />
        </Flex>
        <Flex align="center" gap={6} className="col-span-2 px-2 text-xs text-muted">
          Buradasınız:
          <Icon name="House" size={14} />
          Başlangıç / İş Akış Yönetimi / … / Satın Alma Talebi /
          <Text strong className="text-xs">
            SAT-2026-0412
          </Text>
        </Flex>
        <Flex vertical gap={2} className="rounded-2xl bg-surface-secondary p-2">
          {SECTIONS.map((s) => (
            <Flex
              key={s.label}
              align="center"
              gap={8}
              className={cn(
                'rounded-xl px-2.5 py-2 text-[13px]',
                s.on && 'bg-surface font-medium ring-1 ring-border',
              )}
            >
              <Icon name={s.icon} />
              {s.label}
            </Flex>
          ))}
          <Flex vertical gap={6} className="mt-auto">
            <Flex align="center" gap={10} className="rounded-xl bg-surface p-2">
              <UserAvatar size={32} />
              <Flex vertical>
                <Text className="text-[13px] font-medium">Fatma Tekin</Text>
                <Text type="secondary" className="text-[11px]">
                  Operasyon
                </Text>
              </Flex>
            </Flex>
            <Flex align="center" gap={6} className="px-2 py-1 text-[13px] text-muted">
              <Icon name="ChevronLeft" size={14} />
              Ana sayfaya dön
            </Flex>
          </Flex>
        </Flex>
        <Flex vertical gap={2} className="min-w-0">
          <Flex align="center" justify="space-between" className="px-2.5 py-1">
            <Text className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">
              Tüm uygulamalar
            </Text>
            <Button
              type="text"
              size="small"
              aria-label="Sırala"
              icon={<Icon name="ArrowDownAZ" size={14} />}
            />
          </Flex>
          {ALL_APPS.map((a) => (
            <Flex
              key={a.label}
              align="center"
              gap={10}
              className={cn('rounded-xl px-3 py-2', a.on && 'bg-accent text-accent-foreground')}
            >
              <Icon name={a.icon} />
              <Text className="flex-1 text-current">{a.label}</Text>
              {a.count != null && (
                <Tag className="me-0 rounded-full border-0 bg-accent font-mono text-[11px] text-accent-foreground">
                  {a.count}
                </Tag>
              )}
              {a.tree && <Icon name="ChevronRight" size={14} className="text-muted" />}
            </Flex>
          ))}
        </Flex>
      </Flex>
    </>
  )
}

/* --- Sekmeler (ajanda ve form) ------------------------------------------------------------------ */

const FLARES =
  "before:absolute before:bottom-0 before:-start-4 before:size-4 before:bg-[radial-gradient(circle_at_0_0,transparent_1rem,var(--tab-bg)_1rem)] before:content-[''] after:absolute after:bottom-0 after:-end-4 after:size-4 after:bg-[radial-gradient(circle_at_100%_0,transparent_1rem,var(--tab-bg)_1rem)] after:content-['']"

export interface TabItem {
  label: string
  icon?: string
  /** Kategori sayısı (Başlangıç). */
  count?: number
  /** Grubun ilk sekmesinin önünde yazan ad (ör. "Geçmiş"). */
  group?: string
  /** Form sekmesi: kapat ve yan yana aç düğmeleri. */
  closable?: boolean
  movable?: boolean
  /** Prototip: sekmeye basınca gidilecek ekran; `moveHref` "Yan yana aç". */
  href?: string
  moveHref?: string
}

function Strip({ tabs, active, tools }: { tabs: TabItem[]; active: number; tools?: boolean }) {
  return (
    <Flex align="end" className="min-w-0 flex-1 px-6 pt-1">
      <Flex align="end" gap={4} className="min-w-0">
        {tabs.map((t, i) => {
          const sel = i === active
          const groupStart = t.group && tabs[i - 1]?.group !== t.group
          return (
            <Flex key={`${i}-${t.label}`} align="end">
              {groupStart && (
                <Text
                  type="secondary"
                  className="ms-4 me-2 mb-3.5 text-xs font-medium whitespace-nowrap"
                >
                  {t.group}
                </Text>
              )}
              <Flex
                align="center"
                gap={8}
                className={cn(
                  'relative isolate h-12 shrink-0 rounded-t-2xl px-5 pt-2 text-sm whitespace-nowrap',
                  sel
                    ? cn('z-2 bg-(--tab-bg) font-semibold text-accent-soft-foreground', FLARES)
                    : 'font-medium text-foreground/70',
                )}
              >
                {!sel && (
                  <Flex
                    aria-hidden
                    className="absolute inset-x-0 top-2 bottom-0 -z-1 block rounded-t-2xl bg-surface-tertiary"
                  />
                )}
                {t.icon && <Icon name={t.icon} />}
                {t.href ? (
                  <Typography.Link
                    href={t.href}
                    className="text-current! [font:inherit] after:absolute after:inset-0 after:content-['']"
                  >
                    {t.label}
                  </Typography.Link>
                ) : (
                  <Text className="text-current [font:inherit]">{t.label}</Text>
                )}
                {t.count != null && (
                  <Text
                    className={cn(
                      'ms-6 font-display text-current',
                      sel ? 'text-2xl font-bold' : 'text-xl font-bold text-accent-soft-foreground',
                    )}
                  >
                    {t.count}
                  </Text>
                )}
                {(t.movable || t.closable) && (
                  <Flex gap={2} className="-me-2">
                    {t.movable && (
                      <Button
                        type="text"
                        size="small"
                        href={t.moveHref}
                        aria-label={`Yan yana aç: ${t.label}`}
                        icon={<Icon name="Columns2" size={14} />}
                        className="relative z-1 text-muted"
                      />
                    )}
                    {t.closable && (
                      <Button
                        type="text"
                        size="small"
                        aria-label={`Kapat: ${t.label}`}
                        icon={<Icon name="X" size={14} />}
                        className="text-muted"
                      />
                    )}
                  </Flex>
                )}
              </Flex>
            </Flex>
          )
        })}
      </Flex>
      {tools && (
        <Flex gap={2} className="ms-auto pb-2">
          <Button
            type="text"
            size="small"
            aria-label="Bölmelerin yerini değiştir"
            icon={<Icon name="ArrowLeftRight" size={14} />}
            className="text-muted"
          />
          <Button
            type="text"
            size="small"
            aria-label="Bölmeyi kapat"
            icon={<Icon name="X" size={14} />}
            className="text-muted"
          />
        </Flex>
      )}
    </Flex>
  )
}

export interface AgendaProps {
  tabs: TabItem[]
  active?: number
  /** Yan yana: sağ grubun sekmeleri (şerit ikiye bölünür). */
  rightTabs?: TabItem[]
  rightActive?: number
  children?: ReactNode
  /** Kabın iç düzeni: `row` (varsayılan) ya da `column`. */
  direction?: 'row' | 'column'
}

/**
 * Ajanda / form sekmeleri: seçili sekme açık renkli kabın renginde, içbükey kavislerle kaba kaynaşır.
 * İş Akış kutuları, Başlangıç kategorileri ve sekmeli formlar (child form, yan yana) bunu kullanır.
 */
export function Agenda({
  tabs,
  active = 0,
  rightTabs,
  rightActive = 0,
  children,
  direction = 'row',
}: AgendaProps) {
  return (
    <Flex vertical className="min-h-0 flex-1">
      <Flex gap={12} className="shrink-0">
        <Strip tabs={tabs} active={active} />
        {rightTabs && <Strip tabs={rightTabs} active={rightActive} tools />}
      </Flex>
      <Flex
        vertical={direction === 'column'}
        gap={12}
        className="min-h-0 flex-1 overflow-hidden rounded-3xl bg-(--tab-bg) p-3"
      >
        {children}
      </Flex>
    </Flex>
  )
}

/** Yan yana bölmeleri ayıran, sürüklenen bölücü. */
export function PaneDivider() {
  return (
    <Flex
      role="separator"
      aria-orientation="vertical"
      aria-label="Bölücü"
      justify="center"
      className="-mx-1.5 w-3 shrink-0 cursor-col-resize py-6"
    >
      <Flex className="block w-px bg-separator" />
    </Flex>
  )
}

/* --- Süreç listesi ------------------------------------------------------------------------------ */

export interface ProcessItem {
  project: string
  name: string
  count: number
  icon?: string
}

/** Kutunun süreç listesi: arama + sıralama üstte, seçili süreç dolu birincil renk. */
export function ProcessList({
  items,
  selected = 0,
  countLabel = 'Talep Sayısı',
  width = 260,
  title,
}: {
  items: ProcessItem[]
  selected?: number
  countLabel?: string
  width?: number
  /** Başlık (Başlangıç'taki "Proje / Süreç"); yoksa yalnızca arama. */
  title?: string
}) {
  return (
    <Card
      className={cn(CARD, 'shrink-0')}
      style={{ width }}
      classNames={{ body: 'flex h-full flex-col gap-1 p-2' }}
    >
      {title && (
        <Flex align="center" gap={6} className="px-2 pt-1">
          <Title level={3} className="m-0 font-display text-lg font-semibold">
            {title}
          </Title>
          <Button
            type="text"
            size="small"
            aria-label="Sıralama"
            icon={<Icon name="ArrowDownUp" />}
          />
          <Button type="text" size="small" aria-label="Yenile" icon={<Icon name="RefreshCw" />} />
        </Flex>
      )}
      <Flex gap={6} className="p-1 pb-2">
        <SearchField value="" onChange={() => {}} className="flex-1" />
        {!title && <Button type="text" aria-label="Sıralama" icon={<Icon name="ArrowDownUp" />} />}
      </Flex>
      <Flex justify="space-between" className="px-3 pt-1 pb-1.5">
        <Text type="secondary" className="text-xs">
          Süreç
        </Text>
        <Text type="secondary" className="text-xs">
          {countLabel}
        </Text>
      </Flex>
      {items.map((p, i) => {
        const on = i === selected
        return (
          <Flex
            key={`${i}-${p.name}`}
            align="center"
            gap={12}
            className={cn(
              'rounded-xl px-3 py-2',
              on ? 'bg-accent text-accent-foreground' : 'hover:bg-surface-secondary',
            )}
          >
            <Icon name={p.icon ?? 'FileText'} className="opacity-80" />
            <Flex vertical className="min-w-0 flex-1">
              <Text ellipsis className="text-xs text-current opacity-65">
                {p.project}
              </Text>
              <Text ellipsis className="text-sm font-medium text-current">
                {p.name}
              </Text>
            </Flex>
            <Tag
              className={cn(
                'me-0 min-w-7 rounded-full border-0 text-center text-xs leading-5 font-semibold',
                on ? 'bg-accent-foreground text-accent' : 'bg-surface-secondary text-foreground',
              )}
            >
              {p.count}
            </Tag>
          </Flex>
        )
      })}
    </Card>
  )
}

/* --- Talep ızgarası ----------------------------------------------------------------------------- */

export interface GridColumn {
  key: string
  title: string
  /** `lead` konu / ad sütunu, `mono` numara, `status` durum etiketi, `person` avatarlı kişi. */
  kind?: 'lead' | 'mono' | 'status' | 'person' | 'end'
}

export interface GridGroup {
  label?: string
  rows: Record<string, unknown>[]
}

interface Row {
  key: string
  group?: { label: string; count: number }
  data?: Record<string, unknown>
}

const TONES = [
  'bg-accent-soft text-accent-soft-foreground',
  'bg-success/15 text-success',
  'bg-surface-tertiary text-foreground',
]

/** Veri ızgarası: uygulamanın tablo görünüşü (başlık küçük büyük harf, tarih grupları, çizgisiz satırlar). */
export function DataGrid({
  title,
  subtitle,
  columns,
  groups,
  actions = 'none',
  toolbar = true,
  footer,
  selected,
  bare = false,
  rowHref,
}: {
  title?: string
  subtitle?: string
  columns: GridColumn[]
  groups: GridGroup[]
  /** Satır eylemi: `events` ("Olaylar ▾"), `delete` (çöp kutusu). */
  actions?: 'events' | 'delete' | 'none'
  toolbar?: boolean
  footer?: { page: number; total: number; pageSize: number }
  /** Seçili satırın anahtarı (`id`). */
  selected?: string
  /** Kartsız (başka bir kartın içinde). */
  bare?: boolean
  /** Prototip: satırın konusuna basınca gidilecek ekran. */
  rowHref?: string
}) {
  const data: Row[] = groups.flatMap((g, gi) => [
    ...(g.label ? [{ key: `g${gi}`, group: { label: g.label, count: g.rows.length } }] : []),
    ...g.rows.map((r, ri) => ({ key: String(r.id ?? `${gi}-${ri}`), data: r })),
  ])
  const span = columns.length + (actions === 'none' ? 0 : 1)
  const cell = (c: GridColumn, r: Record<string, unknown>) => {
    const v = r[c.key]
    if (c.kind === 'status') return <StatusTag status={v as RequestStatus} />
    if (c.kind === 'mono')
      return <Text className="font-mono text-sm font-medium text-current">{String(v ?? '')}</Text>
    if (c.kind === 'person') {
      const name = String(v ?? '')
      const initials = name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
      return (
        <Flex align="center" gap={10}>
          <Avatar
            size={32}
            className={cn('shrink-0 text-xs! font-semibold', TONES[name.length % 3])}
          >
            {initials}
          </Avatar>
          <Flex vertical className="leading-[18px]">
            <Text className="font-medium">{name}</Text>
            {r.login ? (
              <Text type="secondary" className="font-mono text-[11px]">
                {String(r.login)}
              </Text>
            ) : null}
          </Flex>
        </Flex>
      )
    }
    if (c.kind === 'lead' && rowHref)
      return (
        <Typography.Link href={rowHref} className="text-current! [font:inherit]">
          {String(v ?? '')}
        </Typography.Link>
      )
    return <Text className="text-current [font:inherit]">{v == null ? '-' : String(v)}</Text>
  }
  const cols: TableColumnsType<Row> = [
    ...columns.map((c, i) => ({
      key: c.key,
      title: c.title,
      sorter: true,
      showSorterTooltip: false,
      align: c.kind === 'end' ? ('end' as const) : undefined,
      className:
        c.kind === 'lead' || c.kind === 'person'
          ? 'min-w-48 font-medium text-foreground'
          : 'whitespace-nowrap text-foreground/70',
      onCell: (row: Row) => (row.group ? { colSpan: i === 0 ? span : 0 } : {}),
      render: (_: unknown, row: Row) =>
        row.group ? (
          <GroupLabel label={row.group.label} count={row.group.count} />
        ) : (
          cell(c, row.data!)
        ),
    })),
    ...(actions === 'none'
      ? []
      : [
          {
            key: '__a',
            width: 1,
            onCell: (row: Row) => (row.group ? { colSpan: 0 } : {}),
            render: () =>
              actions === 'events' ? (
                <Button
                  type="text"
                  size="small"
                  iconPlacement="end"
                  icon={<Icon name="ChevronDown" size={14} />}
                  className="text-accent-soft-foreground"
                >
                  Olaylar
                </Button>
              ) : (
                <Button
                  type="text"
                  size="small"
                  aria-label="Sil"
                  icon={<Icon name="Trash2" />}
                  className="text-muted"
                />
              ),
          },
        ]),
  ]
  const body = (
    <>
      {toolbar && (title || subtitle) && (
        <Flex wrap align="center" gap={8} className="shrink-0">
          <Flex vertical className="min-w-48 flex-1">
            <Title level={2} ellipsis className="m-0 font-display text-lg">
              {title}
            </Title>
            {subtitle && (
              <Text type="secondary" className="text-xs">
                {subtitle}
              </Text>
            )}
          </Flex>
          <SearchField value="" onChange={() => {}} className="w-60" />
          <Button
            type="text"
            aria-label="Filtreleri Temizle"
            disabled
            icon={<Icon name="FilterX" />}
          />
          <ViewSwitch view="table" onChange={() => {}} />
        </Flex>
      )}
      <Flex vertical className="min-h-0 flex-1 overflow-hidden">
        <Table<Row>
          size="middle"
          pagination={false}
          columns={cols}
          dataSource={data}
          className={GRID_TABLE}
          rowClassName={(row) =>
            row.group
              ? GRID_GROUP_ROW
              : cn(
                  GRID_ROW,
                  row.data?.unread ? 'font-semibold' : '',
                  row.key === selected && GRID_ROW_SELECTED,
                )
          }
        />
      </Flex>
      {footer && (
        <GridFooter
          page={footer.page}
          from={(footer.page - 1) * footer.pageSize}
          shown={Math.min(footer.pageSize, footer.total)}
          total={footer.total}
          pageSize={footer.pageSize}
          sizes={[10, 20, 30, 50]}
          onPage={() => {}}
          onPageSize={() => {}}
        />
      )}
    </>
  )
  if (bare)
    return (
      <Flex vertical gap={12} className="min-h-0 min-w-0 flex-1">
        {body}
      </Flex>
    )
  return (
    <Card
      className={cn(CARD, 'flex min-h-0 min-w-0 flex-1 flex-col')}
      classNames={{ body: 'flex min-h-0 flex-1 flex-col gap-4 p-5' }}
    >
      {body}
    </Card>
  )
}

/* --- Başlık bandı ------------------------------------------------------------------------------- */

const BANDS: Record<string, { band: string; light: boolean }> = {
  white: { band: 'bg-surface text-foreground', light: true },
  solid: { band: 'bg-accent text-accent-foreground', light: false },
  soft: {
    band: 'bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))] text-foreground',
    light: true,
  },
  medium: {
    band: 'bg-[color-mix(in_oklab,var(--accent)_24%,var(--surface))] text-foreground',
    light: true,
  },
  outline: { band: 'border-2 border-accent bg-surface text-foreground', light: true },
  ink: { band: 'bg-foreground text-background', light: false },
}
const OFF = 'disabled:opacity-45'
const ON_LIGHT = cn('border-transparent bg-accent text-accent-foreground', OFF)
const OUT_LIGHT = cn('border-border bg-surface text-foreground', OFF)
const ON_DARK = cn('border-transparent bg-accent-foreground text-accent', OFF)
const OUT_DARK = cn('border-current/40 bg-transparent text-current', OFF)

const EVENT_ICONS: Record<string, string> = {
  Onayla: 'Check',
  Reddet: 'X',
  'Revizyon İste': 'CornerUpLeft',
  Yönlendir: 'Forward',
  Sil: 'Trash2',
}

/** Sayfa başlık bandı: süreç / modül ikonu, proje, sayfa başlığı ve durum; olaylar ve Geri / İleri. */
export function HeaderBand({
  project,
  title,
  status,
  icon = 'ShoppingCart',
  position,
  events = [],
  strength = 'white',
  count,
  compact = false,
  children,
}: {
  project: string
  title: string
  status?: string
  icon?: string
  /** "1 / 12" ve Geri / İleri; yoksa gösterilmez (child form). */
  position?: string
  /** Olay adları; ilki birincil (Onayla). */
  events?: string[]
  /** Vurgu gücü: white, solid, soft, medium, outline, ink. */
  strength?: string
  /** Başlığın yanında sayı (İK modülü). */
  count?: number
  compact?: boolean
  /** Bandın sağ ucuna (arama, filtre, Yeni). */
  children?: ReactNode
}) {
  const b = BANDS[strength] ?? BANDS.white!
  const on = b.light ? ON_LIGHT : ON_DARK
  const out = b.light ? OUT_LIGHT : OUT_DARK
  return (
    <Card
      className={cn(CARD, b.band, 'shrink-0')}
      classNames={{ body: cn('flex flex-col', compact ? 'gap-4 p-4' : 'gap-5 p-6') }}
    >
      <Flex wrap align="center" justify="space-between" gap={16}>
        <Flex align="center" gap={compact ? 12 : 16} className="min-w-0 flex-1">
          <Flex
            align="center"
            justify="center"
            className={cn('shrink-0 rounded-2xl bg-current/10', compact ? 'size-10' : 'size-12')}
          >
            <Icon name={icon} size={compact ? 18 : 22} />
          </Flex>
          <Flex vertical className="min-w-0">
            <Text
              ellipsis
              className={cn('text-current opacity-75', compact ? 'text-xs' : 'text-sm')}
            >
              {project}
            </Text>
            <Flex wrap align="center" className="min-w-0 gap-x-3 gap-y-1">
              <Title
                level={1}
                className={cn(
                  'm-0 truncate font-display font-bold text-current',
                  compact ? 'text-[22px]' : 'text-[28px]',
                )}
              >
                {title}
                {count != null && (
                  <Text className="ms-2 font-sans text-sm font-normal text-current opacity-75">
                    {count}
                  </Text>
                )}
              </Title>
              {status && (
                <Tag
                  variant="solid"
                  color={
                    status === 'Tamamlandı'
                      ? 'success'
                      : status === 'Reddedildi'
                        ? 'error'
                        : 'warning'
                  }
                  className="me-0"
                >
                  {status}
                </Tag>
              )}
            </Flex>
          </Flex>
        </Flex>
        {position && (
          <Flex align="center" gap={8}>
            <Text className="font-mono text-sm text-current opacity-75">{position}</Text>
            <Button
              aria-label="Önceki"
              disabled
              icon={<Icon name="ChevronLeft" size={18} />}
              className={out}
            />
            <Button
              aria-label="Sonraki"
              icon={<Icon name="ChevronRight" size={18} />}
              className={out}
            />
          </Flex>
        )}
        {children}
      </Flex>
      {events.length > 0 && (
        <Flex wrap gap={8} role="group" aria-label="Olaylar">
          {events.map((e, i) => (
            <Button
              key={e}
              type={i === 0 ? 'primary' : 'default'}
              className={i === 0 ? on : out}
              icon={
                e === 'Reddet' ? (
                  <Avatar
                    size={20}
                    icon={<Icon name="X" size={14} />}
                    className="inline-flex! items-center justify-center bg-danger! text-danger-foreground!"
                  />
                ) : (
                  <Icon name={EVENT_ICONS[e] ?? 'CircleDot'} />
                )
              }
            >
              {e}
            </Button>
          ))}
        </Flex>
      )}
    </Card>
  )
}

/* --- Form -------------------------------------------------------------------------------------- */

export interface FormSectionData {
  title: string
  fields?: { label: string; value: string; button?: string; buttonHref?: string }[]
  items?: { name: string; qty: number; unit: string; price: number }[]
  text?: string
  attachments?: string[]
}

/** Salt okunur talep formu: uygulamanın gerçek form alanlarıyla (FormFields.tsx) bölümler. */
export function FormCard({
  sections,
  columns = 2,
}: {
  sections: FormSectionData[]
  columns?: 1 | 2
}) {
  return (
    <Card
      className={cn(CARD, 'min-h-0 min-w-0 flex-1 overflow-hidden')}
      classNames={{ body: 'flex h-full flex-col p-8' }}
    >
      <Form layout="vertical" component={false}>
        <Flex vertical gap={28}>
          {sections.map((s) => (
            <Section key={s.title} title={s.title}>
              {s.fields && (
                <Flex
                  className={cn(
                    'grid gap-x-6 gap-y-4',
                    columns === 2 ? 'grid-cols-2' : 'grid-cols-1',
                  )}
                >
                  {s.fields.map((f) => (
                    <Flex key={f.label} vertical gap={8} className="min-w-0">
                      <FormField label={f.label} value={f.value} />
                      {f.button && (
                        <Button
                          variant="filled"
                          color="default"
                          href={f.buttonHref}
                          icon={<Icon name="FilePlus2" />}
                          className="self-start"
                        >
                          {f.button}
                        </Button>
                      )}
                    </Flex>
                  ))}
                </Flex>
              )}
              {s.items && <ItemsTable items={s.items} />}
              {s.text && <LongField label={s.title} value={s.text} rows={4} hideLabel />}
              {s.attachments && (
                <Flex wrap gap={8}>
                  {s.attachments.map((a) => (
                    <Button
                      key={a}
                      variant="filled"
                      color="default"
                      icon={<Icon name="Paperclip" />}
                    >
                      {a}
                    </Button>
                  ))}
                </Flex>
              )}
            </Section>
          ))}
        </Flex>
      </Form>
    </Card>
  )
}

/* --- Yan panel: Özellikler / Tarihçe / Dokümanlar ---------------------------------------------- */

export interface HistoryStep {
  step: string
  approver?: string
  status?: string
  date?: string
  /** done (birincil), wait (bekleyen, halka), reject (kırmızı). */
  state?: 'done' | 'wait' | 'reject'
  icon?: string
  delegated?: boolean
  reason?: string
}

/** Talebin yan paneli; katlıyken dar ikon rafı. */
export function SidePanel({
  tab = 'history',
  collapsed = false,
  properties = [],
  history = [],
  documents = [],
  status = 'Onay bekliyor',
  processNo,
  width = 400,
}: {
  tab?: 'props' | 'history' | 'docs'
  collapsed?: boolean
  properties?: { name: string; value: string }[]
  history?: HistoryStep[]
  documents?: { name: string; no: string; must?: boolean }[]
  status?: string
  processNo?: string
  width?: number
}) {
  if (collapsed)
    return (
      <Card
        className={cn(CARD, 'w-14 shrink-0 self-start')}
        classNames={{ body: 'flex flex-col items-center gap-1 p-2' }}
      >
        <Button
          type="text"
          aria-label="Paneli aç"
          icon={<Icon name="PanelRightOpen" size={18} />}
          className="text-muted"
        />
        <Flex className="my-1 block h-px w-6 bg-separator" />
        {(['Info', 'History', 'Files'] as const).map((n, i) => (
          <Button
            key={n}
            type="text"
            aria-label={['Özellikler', 'Tarihçe', 'Dokümanlar'][i]}
            icon={<Icon name={n} size={18} />}
            className={cn(i === 0 && 'bg-accent-soft! text-accent-soft-foreground!')}
          />
        ))}
      </Card>
    )
  const timeline = (
    <Flex vertical gap={16}>
      <Flex wrap align="center" gap={8}>
        <Text strong>Ana Akış</Text>
        <StatusTag status={status as RequestStatus} />
        {processNo && (
          <Text type="secondary" className="ms-auto font-mono text-xs">
            Süreç No: {processNo}
          </Text>
        )}
      </Flex>
      <Timeline
        classNames={{ itemContent: 'min-w-0 flex-1 pb-4' }}
        items={history.map((h, i) => ({
          key: i,
          icon: (
            <Avatar
              size={32}
              icon={
                <Icon
                  name={
                    h.icon ??
                    (h.state === 'wait' ? 'Hourglass' : h.state === 'reject' ? 'X' : 'Check')
                  }
                  size={15}
                />
              }
              className={cn(
                'inline-flex! items-center justify-center',
                h.state === 'reject'
                  ? 'bg-danger! text-danger-foreground!'
                  : h.state === 'wait'
                    ? 'bg-surface! text-muted! ring-2 ring-accent shadow-[0_0_0_8px_color-mix(in_oklab,var(--accent)_18%,transparent)]'
                    : 'bg-accent! text-accent-foreground!',
              )}
            />
          ),
          content: (
            <Flex vertical gap={2}>
              <Flex justify="space-between" gap={12}>
                <Text
                  type={h.state === 'wait' ? 'secondary' : undefined}
                  className="text-sm font-medium"
                >
                  {h.step}
                </Text>
                {h.date && (
                  <Text type="secondary" className="text-end text-xs whitespace-pre-line">
                    {h.date}
                  </Text>
                )}
              </Flex>
              {h.approver && <Text className="text-sm">({h.approver})</Text>}
              {h.status && (
                <Flex wrap align="center" gap={6}>
                  <Text type="secondary" className="text-sm">
                    {h.status}
                  </Text>
                  {h.delegated && <Tag className="me-0">Vekaleten</Tag>}
                </Flex>
              )}
              {h.reason && (
                <Flex vertical className="mt-1 rounded-xl bg-surface-secondary px-3 py-2">
                  <Text type="secondary" className="text-xs font-medium">
                    Sebep
                  </Text>
                  <Text className="text-sm">“{h.reason}”</Text>
                </Flex>
              )}
            </Flex>
          ),
        }))}
      />
      <Flex gap={8}>
        <Button variant="filled" color="default" className="flex-1">
          Tüm Tarihçeyi Göster
        </Button>
        <Button type="text" aria-label="Görünüm seçenekleri" icon={<Icon name="Settings2" />} />
      </Flex>
    </Flex>
  )
  const docs = (
    <Flex vertical gap={4}>
      {documents.map((d, i) => (
        <Flex
          key={d.no}
          align="center"
          gap={12}
          className={cn('rounded-xl px-3 py-2', i === 0 ? 'bg-accent text-accent-foreground' : '')}
        >
          <Icon name={i === 0 ? 'FileText' : 'Paperclip'} />
          <Flex vertical className="min-w-0 leading-tight">
            <Text ellipsis className="text-current">
              {d.name}
            </Text>
            <Text className="font-mono text-xs text-current opacity-70">Doküman No: {d.no}</Text>
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
  const props = (
    <Descriptions
      column={1}
      size="small"
      colon={false}
      classNames={{ label: 'w-2/5 text-muted', content: 'break-words' }}
      items={properties.map((p) => ({ key: p.name, label: p.name, children: p.value }))}
    />
  )
  return (
    <Card
      className={cn(CARD, 'shrink-0 self-start')}
      style={{ width }}
      classNames={{ body: 'p-5 pt-2' }}
    >
      <Tabs
        activeKey={tab}
        tabBarExtraContent={
          <Button
            type="text"
            size="small"
            aria-label="Paneli katla"
            icon={<Icon name="PanelRightClose" size={18} />}
            className="ms-2 text-muted"
          />
        }
        classNames={{
          header: 'mb-3 [&_.ant-tabs-nav-list]:w-full',
          item: 'm-0 flex-1 justify-center',
        }}
        items={[
          { key: 'props', label: 'Özellikler', children: props },
          { key: 'history', label: 'Tarihçe', children: timeline },
          { key: 'docs', label: 'Dokümanlar', children: docs },
        ]}
      />
    </Card>
  )
}

/* --- Başlangıç widget'ları ---------------------------------------------------------------------- */

/** Pano: 12 sütun, satırlar görünen alana bölünür (sayfa kaymaz). Çocuklar `Widget`. */
export function Board({ rows = 9, children }: { rows?: number; children?: ReactNode }) {
  return (
    <Flex
      className="grid min-h-0 flex-1 grid-cols-12 gap-3"
      style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
    >
      {children}
    </Flex>
  )
}

/** Panodaki bir widget'ın yeri ve kartı. */
export function Widget({
  col,
  row,
  w,
  h,
  tone = 'card',
  children,
}: {
  col: number
  row: number
  w: number
  h: number
  /** `card` (yüzey), `accent` (dolu birincil), `bare` (kartsız; ör. iş bloğu). */
  tone?: 'card' | 'accent' | 'bare'
  children?: ReactNode
}) {
  return (
    <Flex
      vertical
      className={cn(
        'min-h-0 min-w-0 overflow-hidden',
        tone === 'bare' ? '' : 'rounded-3xl p-4',
        tone === 'card' && cn('bg-surface', CARD),
        tone === 'accent' && 'bg-accent p-5 text-accent-foreground',
      )}
      style={{ gridColumn: `${col} / span ${w}`, gridRow: `${row} / span ${h}` }}
    >
      {children}
    </Flex>
  )
}

/** Karşılama: tarih, selam, bekleyen onay sayısı (dolu birincil widget'ın içi). */
export function Greeting({
  name = 'Fatma',
  date = 'Çarşamba, 30 Eylül',
  count = 66,
}: {
  name?: string
  date?: string
  count?: number
}) {
  return (
    <Flex vertical justify="space-between" className="h-full">
      <Text className="text-[13px] text-current opacity-80">{date}</Text>
      <Text className="font-display text-xl font-semibold text-current">Günaydın, {name}</Text>
      <Text className="text-[13px] text-current opacity-85">
        <Text strong className="font-display text-lg text-current">
          {count}
        </Text>{' '}
        bekleyen onayın var
      </Text>
    </Flex>
  )
}

/** Saat widget'ı. */
export function Clock({
  time = '16:02',
  seconds = '39',
  date = 'Çarşamba, 30 Eylül 2026',
}: {
  time?: string
  seconds?: string
  date?: string
}) {
  return (
    <Flex vertical justify="center" className="h-full">
      <Text className="font-display text-4xl leading-none font-bold tabular-nums">
        {time}{' '}
        <Text type="secondary" className="text-sm">
          {seconds}
        </Text>
      </Text>
      <Text type="secondary" className="mt-1 text-xs">
        {date}
      </Text>
    </Flex>
  )
}

/** Hava durumu widget'ı (örnek veri). */
export function Weather({
  city = 'İstanbul',
  temp = 20,
  desc = 'Parçalı bulutlu',
  days = [],
}: {
  city?: string
  temp?: number
  desc?: string
  days?: { day: string; hi: number; lo: number }[]
}) {
  return (
    <Flex justify="space-between" className="h-full">
      <Flex vertical gap={4}>
        <Text type="secondary" className="text-xs">
          {city}
        </Text>
        <Flex align="center" gap={8} className="font-display text-4xl font-bold">
          <Icon name="CloudSun" size={32} />
          {temp}°
        </Flex>
        <Text className="text-[13px]">{desc}</Text>
      </Flex>
      <Flex vertical gap={4} className="min-w-40 text-[13px]">
        {days.map((d) => (
          <Flex key={d.day} justify="space-between">
            <Text type="secondary">{d.day}</Text>
            <Text strong>
              {d.hi}°{' '}
              <Text type="secondary" className="font-normal">
                {d.lo}°
              </Text>
            </Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  )
}

/** Favoriler / Son Kullanılan Uygulamalar: üstte seçici, iki sütun kutular. */
export function AppsWidget({
  apps = [],
  tab = 'Favoriler',
}: {
  apps?: { name: string; icon: string; star?: boolean }[]
  tab?: string
}) {
  return (
    <Flex vertical gap={12} className="h-full">
      <Segmented block value={tab} options={['Favoriler', 'Son Kullanılanlar']} />
      <Flex className="grid grid-cols-2 gap-2">
        {apps.map((a) => (
          <Flex
            key={a.name}
            vertical
            align="center"
            gap={8}
            className="relative rounded-xl bg-surface-secondary p-3 text-center text-[13px]"
          >
            <Avatar
              size={40}
              icon={<Icon name={a.icon} size={18} />}
              className="inline-flex! items-center justify-center bg-accent-soft! text-accent-soft-foreground!"
            />
            {a.name}
            {a.star && (
              <Icon name="Star" size={12} filled className="absolute end-2 top-2 text-accent" />
            )}
          </Flex>
        ))}
      </Flex>
    </Flex>
  )
}

/** Panoyu düzenle: sağ altta yüzen düğme. */
export function EditFab() {
  return (
    <Button
      type="primary"
      shape="circle"
      size="large"
      aria-label="Panoyu düzenle"
      icon={<Icon name="Pencil" size={18} />}
      className="absolute! end-6 bottom-6 z-10"
    />
  )
}

/* --- İnsan Kaynakları --------------------------------------------------------------------------- */

/** İK modül gezgini; `divider` önceki öğeden ince çizgiyle ayırır. */
export function ModuleNav({
  items,
  selected = 0,
  width = 220,
}: {
  items: { label: string; icon: string; count?: number; divider?: boolean }[]
  selected?: number
  width?: number
}) {
  return (
    <Card
      className={cn(CARD, 'shrink-0')}
      style={{ width }}
      classNames={{ body: 'flex flex-col gap-0.5 p-2' }}
    >
      {items.map((m, i) => (
        <Flex key={m.label} vertical>
          {m.divider && <Flex className="mx-3 my-1.5 block h-px bg-separator" />}
          <Flex
            align="center"
            gap={12}
            className={cn(
              'rounded-xl px-3 py-2',
              i === selected ? 'bg-accent text-accent-foreground' : 'hover:bg-surface-secondary',
            )}
          >
            <Icon name={m.icon} />
            <Text className="flex-1 text-sm text-current">{m.label}</Text>
            {m.count != null && (
              <Text
                className={cn('font-mono text-xs text-current', i !== selected && 'opacity-60')}
              >
                {m.count}
              </Text>
            )}
          </Flex>
        </Flex>
      ))}
    </Card>
  )
}

/** İK bandının sağı: arama, şirket seçimi, filtre, "Yeni". */
export function BandTools() {
  return (
    <Flex align="center" gap={8}>
      <SearchField value="" onChange={() => {}} className="w-52" />
      <Select value="Tümü" options={[{ value: 'Tümü', label: 'Tümü' }]} className="w-44" />
      <Button
        type="text"
        aria-label="Filtre"
        icon={<Icon name="FilterX" />}
        className="text-current"
      />
      <Button
        icon={<Icon name="Plus" />}
        className="border-transparent bg-accent-foreground text-accent"
      >
        Yeni
      </Button>
    </Flex>
  )
}

/** Durum sekmeleri (Aktif / Pasif / Geçici Pasif / Tümü) ve tablo / kart seçici. */
export function StatusTabs({
  items,
  active = 0,
}: {
  items: { label: string; count: number; dot?: 'success' | 'muted' | 'warning' }[]
  active?: number
}) {
  const dot = { success: 'bg-success', muted: 'bg-muted', warning: 'bg-warning' }
  return (
    <Flex align="center" justify="space-between" className="shrink-0">
      <Segmented
        value={active}
        options={items.map((it, i) => ({
          value: i,
          label: (
            <Flex align="center" gap={6} className="px-1">
              {it.dot && <Flex className={cn('block size-1.5 rounded-full', dot[it.dot])} />}
              {it.label}
              <Text type="secondary" className="font-mono text-xs">
                {it.count}
              </Text>
            </Flex>
          ),
        }))}
      />
      <ViewSwitch view="table" onChange={() => {}} />
    </Flex>
  )
}

/** Kaydın düzenleme kartı: başlık, sekmeler, iki sütun form, Vazgeç / Kaydet. */
export function EditCard({
  module = 'Kullanıcılar',
  title,
  subtitle,
  status = 'Aktif',
  tabs = ['Kullanıcı Bilgisi', 'Şirket Bilgisi', 'Amirler'],
  fields = [],
  width = 380,
}: {
  module?: string
  title: string
  subtitle?: string
  status?: string
  tabs?: string[]
  fields?: { label: string; value: string; required?: boolean; kind?: 'select' | 'date' }[]
  width?: number
}) {
  const initials = title
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
  return (
    <Card
      className={cn(CARD, 'shrink-0')}
      style={{ width }}
      classNames={{ body: 'flex h-full flex-col p-0' }}
    >
      <Flex align="center" gap={12} className="p-4 shadow-[inset_0_-1px_0_var(--separator)]">
        <Avatar
          size={48}
          className="shrink-0 bg-success/15! text-base! font-semibold text-success!"
        >
          {initials}
        </Avatar>
        <Flex vertical className="min-w-0 flex-1">
          <Text type="secondary" className="text-[11px]">
            {module}
          </Text>
          <Text className="font-display text-lg font-semibold">{title}</Text>
          <Flex align="center" gap={6} className="text-xs">
            <Flex className="block size-1.5 rounded-full bg-success" />
            {status}
            {subtitle && (
              <Text type="secondary" className="font-mono text-xs">
                {subtitle}
              </Text>
            )}
          </Flex>
        </Flex>
        <Button type="text" aria-label="Kapat" icon={<Icon name="X" />} />
      </Flex>
      <Flex vertical gap={14} className="flex-1 p-4">
        <Segmented block value={tabs[0]} options={tabs} />
        <Form layout="vertical" component={false}>
          <Flex className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <Form.Item key={f.label} label={f.label} required={f.required}>
                {f.kind === 'select' ? (
                  <Select value={f.value} options={[{ value: f.value, label: f.value }]} />
                ) : (
                  <Input
                    value={f.value}
                    readOnly
                    suffix={
                      f.kind === 'date' ? (
                        <Icon name="Calendar" className="text-muted" />
                      ) : undefined
                    }
                  />
                )}
              </Form.Item>
            ))}
          </Flex>
        </Form>
      </Flex>
      <Flex justify="end" gap={8} className="px-4 py-3 shadow-[inset_0_1px_0_var(--separator)]">
        <Button type="text">Vazgeç</Button>
        <Button type="primary" icon={<Icon name="Save" />}>
          Kaydet
        </Button>
      </Flex>
    </Card>
  )
}

/* --- Karar pencereleri -------------------------------------------------------------------------- */

const STRIPE = { success: 'bg-success', danger: 'bg-danger', ink: 'bg-accent' }

/** Karar penceresi açık hâliyle (onay, sebep): üstte olayın anlam renginde şerit. */
export function DecisionDialog({
  title = 'Uyarı',
  message = 'Devam etmek istediğinize emin misiniz?',
  tone = 'ink',
  reason = false,
}: {
  title?: string
  message?: string
  tone?: 'success' | 'danger' | 'ink'
  /** Sebep alanı (boş bırakılınca hata). */
  reason?: boolean
}) {
  // Durağan panel (antd'nin önizleme paneli): tuvalde açık hâliyle, perdenin üstünde ortada
  const Panel = Modal._InternalPanelDoNotUseOrYouWillBeFired
  return (
    <Flex align="center" justify="center" className="absolute inset-0 z-50 bg-backdrop">
      <Panel
        width={reason ? 420 : 400}
        closable={false}
        title={<Text className="font-display text-lg font-semibold">{title}</Text>}
        classNames={{ container: 'relative overflow-hidden pt-7' }}
        footer={
          <Flex justify="end" gap={8}>
            <Flex className={cn('absolute inset-x-0 top-0 block h-1.5', STRIPE[tone])} />
            <Button type="text">{reason ? 'İptal' : 'Hayır'}</Button>
            <Button type="primary" danger={tone === 'danger'}>
              {reason ? 'Tamam' : 'Evet'}
            </Button>
          </Flex>
        }
      >
        {reason ? (
          <Form layout="vertical" component={false}>
            <Form.Item validateStatus="error" help="Sebep alanı boş olamaz.">
              <Input.TextArea rows={5} aria-label={title} />
            </Form.Item>
          </Form>
        ) : (
          <Typography.Paragraph className="mb-0">{message}</Typography.Paragraph>
        )}
      </Panel>
    </Flex>
  )
}
