import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  Dropdown,
  Flex,
  Input,
  Popover,
  Select,
  type MenuProps,
  Skeleton,
  Table,
  type TableColumnsType,
  Tag,
  Typography,
} from 'antd'
import { useLook } from '@/synergy/shared/themeSettings'
import type { SortOrder } from 'antd/es/table/interface'
import {
  Check,
  ExternalLink,
  Folder,
  History,
  MousePointerClick,
  Moon,
  Plus,
  RefreshCw,
  Star,
  Sun,
} from 'lucide-react'
import {
  isRead,
  markRead,
  togglePin,
  useBoxCounts,
  useBoxRequests,
  useMenuApps,
  useReadIds,
} from '@/synergy/shared/decisions'
import {
  APPS_LABELS,
  CURRENT_USER,
  SHOW_ALL_BOXES,
  cellValue,
  columnsFor,
  dateOf,
  findBox,
  formatLongDate,
  formatWeekday,
  greetingOf,
  initials,
  mainBoxes,
  pendingSentence,
  processCaption,
  processGroups,
  type BoxId,
  type Box as WorkBox,
  type DetailNavState,
  type MenuApp,
  type Process,
  type ProcessGroup,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import {
  START_LABELS,
  defaultSortOf,
  groupCaption,
  useBriefPending,
  type GroupSort,
} from '@/synergy/shared/startLabels'
import { boxLink, k, requestLink } from '@/synergy/paths'
import { openDeck } from '@/synergy/shared/formDeck'
import {
  createGroup,
  deleteGroup,
  GROUP_LABELS,
  renameGroup,
  toggleInGroup,
  useAppGroups,
  type AppGroup,
} from '@/synergy/shared/appGroups'
import { SoftModal } from '@/synergy/ant/modal'
import {
  useBand,
  CellValue,
  EmptyNote,
  SearchField,
  SortMenu,
  compareBy,
} from '@/synergy/ant/parts'
import { CARD, IC, MotionFlex, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { Loader } from '@/synergy/ant/Loader'
import { GRID_ROW, GRID_TABLE } from '@/synergy/ant/grid'
import { Count, Indicator } from '@/synergy/ant/motion'
import { SHEET_ON_SURFACE } from '@/synergy/tabs/shape'
import { Tab, TabButton, TabGroup, TabStrip } from '@/synergy/tabs/TabStrip'
import { FastMenu } from '@/synergy/rows'
import { useFlow } from '@/synergy/flow'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { AnimatePresence } from 'framer-motion'
import { useLeaving, useTransition } from '@/synergy/motion'
import { Dashboard } from '@/synergy/dashboard/Dashboard'
import type { WidgetSize } from '@/synergy/dashboard/model'
import {
  ActivityWidget,
  AnnouncementsWidget,
  DelegationsWidget,
  DocumentsWidget,
} from '@/synergy/dashboard/feeds'
import {
  AssistantWidget,
  CalendarWidget,
  ClockWidget,
  ControlsWidget,
  NotesWidget,
  WeatherWidget,
} from '@/synergy/dashboard/widgets'

/* -------------------------------------------------------------------------------------------------
 * Başlangıç: sabit 12 sütunlu bento
 *   1: Karşılama (birincil renk, 5 sütun) · Uygulamalar (7 sütun)
 *   2: Kategori blokları; seçili blok birincil renkte, büyür ve alttaki dille iş bloğuna bağlanır
 *   3: İş bloğu; solda süreç grupları, sağda talepler, aradaki bölücü sürüklenir (genişlik saklanır)
 * ------------------------------------------------------------------------------------------------- */

const SORT_KEY = 'synergy-start-sort-v1'
const SPLIT_KEY = 'synergy-start-split-v1'

const { Text, Title, Paragraph } = Typography

/** Blok ikonları (başlık ve kategori sekmeleri). */
const IC_BLOCK = { ...IC, size: 20 } as const

/* --- Sınıf grupları ---------------------------------------------------------------------------- */

const H2 = 'm-0! font-display text-lg font-semibold'
const ITEM = 'px-3 py-1 transition-colors'

/**
 * Olaylar sütunu en solda; tablo yatay kaysa da görünür kalır (hızlı onay hiç gizlenmez); köşeleri
 * düz ki arkası görünmesin. Satırın üzerine gelince komşu hücrelerle aynı zemin.
 */
const STICKY_START = 'sticky start-0 z-10 w-px bg-surface [tr:hover>&]:bg-surface-secondary'

/** Seçim listesi öğesinin zemini (Başlangıç süreç grupları). */
const LIST_ITEM =
  'group relative h-auto min-h-11 w-full justify-start gap-3 rounded-xl text-start shadow-none'

const dim = (on: boolean) => cn('transition-opacity', on && 'opacity-50')

type TableSort = { column: string; direction: 'ascending' | 'descending' }

/** Yenilenirken liste yerine parıldayan iskelet satırları. */
/** Yüklenirken (tema paneli › Animasyon › Yüklenirken): iskelet satırları, döner simge ya da hiçbiri. */
function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  const { loading, off } = useLook().anim
  if (loading === 'off') return null
  if (loading === 'spinner')
    return (
      // Listenin yerini doldurur, yükleyici tam ortada
      <Flex
        role="status"
        aria-label="Yükleniyor"
        align="center"
        justify="center"
        className={cn('min-h-48 flex-1 py-6', className)}
      >
        <Loader size={36} />
      </Flex>
    )
  return (
    <Flex vertical gap={8} aria-hidden className={className}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton.Button
          key={i}
          active={!off}
          block
          className="[&_.ant-skeleton-button]:h-10! [&_.ant-skeleton-button]:rounded-lg!"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </Flex>
  )
}
const NoData = () => <EmptyNote text={START_LABELS.noData} className="py-8" />

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Depolama kapalıysa yalnızca bu oturumda
  }
}

function validSort(box: WorkBox, s: GroupSort | undefined): GroupSort {
  const ok =
    s &&
    ['project', 'flow', 'form', 'date', 'count'].includes(s.field) &&
    ['ascending', 'descending'].includes(s.direction)
  return !ok || (s.field === 'form' && box.id !== 'taslaklar') ? defaultSortOf(box.id) : s
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

/** Yenile düğmesi. */
function Refresh({
  pending,
  onPress,
  className,
}: {
  pending: boolean
  onPress: () => void
  className?: string
}) {
  return (
    <Tip label={START_LABELS.refresh}>
      <Button
        type="text"
        aria-label={START_LABELS.refresh}
        aria-busy={pending || undefined}
        // Yenilenirken ikinci basış yok sayılır (düğme soluklaşmadan)
        onClick={() => {
          if (!pending) onPress()
        }}
        // Yenilenirken ikonun kendisi döner
        icon={<RefreshCw {...IC} className={cn(pending && 'animate-spin')} />}
        className={cn('size-9', className)}
      />
    </Tip>
  )
}

export function StartPage() {
  const [refreshing, refreshAll] = useBriefPending()
  return (
    <Dashboard
      render={(kind, size) => {
        switch (kind) {
          case 'greeting':
            return <Greeting size={size} refreshing={refreshing} onRefresh={refreshAll} />
          case 'apps':
            return <AppsBlock size={size} />
          case 'work':
            return <WorkBlock refreshing={refreshing} />
          case 'clock':
            return <ClockWidget size={size} />
          case 'weather':
            return <WeatherWidget size={size} />
          case 'assistant':
            return <AssistantWidget />
          case 'calendar':
            return <CalendarWidget size={size} />
          case 'controls':
            return <ControlsWidget size={size} />
          case 'notes':
            return <NotesWidget />
          case 'announcements':
            return <AnnouncementsWidget size={size} />
          case 'activity':
            return <ActivityWidget size={size} />
          case 'delegations':
            return <DelegationsWidget size={size} />
          case 'documents':
            return <DocumentsWidget size={size} />
        }
      }}
    />
  )
}

/** İş Akışları widget'ında yenilenen listenin yüklenme süresi (ms). */
const WORK_LOAD_MS = 5000

/**
 * İş Akışları widget'ı: kategori sekmeleri ve altında süreç grupları ↔ talepler (kabını doldurur).
 * Başlat kutusunun İş Akış Yönetimi bölümü de bunu gösterir (`StartMenu.tsx`); ikisi aynı anda
 * açık olabileceği için kimlikler örneğe özel.
 */
export function WorkBlock({ refreshing = false }: { refreshing?: boolean }) {
  const uid = useId()
  const panelId = `${uid}work`
  const [category, setCategory] = useState<BoxId>('bekleyen')
  const [processId, setProcessId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState<Partial<Record<BoxId, GroupSort>>>(() =>
    readJson(SORT_KEY, {}),
  )
  // Yenilenen liste 5 saniye yükleniyor görünür (maket sunucu gecikmesi; açık istek üzerine)
  const [groupsLoading, reloadGroups] = useBriefPending(WORK_LOAD_MS)
  const [requestsLoading, reloadRequests] = useBriefPending(WORK_LOAD_MS)

  const box = findBox(category)!
  const sort = validSort(box, sorts[category])
  const requests = useBoxRequests(category)
  const groups = useMemo(
    () => processGroups(box, requests, { search, sort }),
    [box, requests, search, sort],
  )
  const selected = groups.find((g) => g.process.id === processId) ?? null
  if (processId && !selected) setProcessId(null)

  const choose = (next: BoxId) => {
    if (next === category) return
    setCategory(next)
    setProcessId(null)
    setSearch('')
  }

  return (
    // Blok kendi genişliğine göre dizilir (`@container`): Başlangıç'ta widget, başlat kutusunda bölüm
    <Flex vertical className="@container h-full min-h-0">
      <Categories selected={category} onSelect={choose} uid={uid} panelId={panelId} />
      {/* İş bloğu: seçili sekmenin devamı; hücrenin kalanını doldurur, sütunlar içeride kayar */}
      <Card
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${uid}category-${category}`}
        className={cn(CARD, 'flex min-h-0 flex-1 flex-col')}
        classNames={{ body: 'flex min-h-0 flex-1 flex-col p-1.5' }}
      >
        <WorkSplit
          left={
            <GroupList
              key={category}
              box={box}
              groups={groups}
              selectedId={selected?.process.id ?? null}
              onSelect={setProcessId}
              search={search}
              onSearch={setSearch}
              sort={sort}
              onSort={(s) => {
                const all = { ...sorts, [category]: s }
                setSorts(all)
                writeJson(SORT_KEY, all)
              }}
              loading={groupsLoading || refreshing}
              onReload={reloadGroups}
            />
          }
          right={
            <RequestsTile
              key={`${category}/${selected?.process.id ?? ''}`}
              box={box}
              process={selected?.process ?? null}
              requests={selected?.requests ?? []}
              loading={requestsLoading || refreshing}
              onReload={reloadRequests}
            />
          }
        />
      </Card>
    </Flex>
  )
}

/* --- Satır 1 ----------------------------------------------------------------------------------- */

function Greeting({
  size,
  refreshing,
  onRefresh,
}: {
  size: WidgetSize
  refreshing: boolean
  onRefresh: () => void
}) {
  // Küçük boyutta: yalnızca selamlama ve cümle (tarih yok, başlık küçük)
  const small = size.id === 's'
  // Şerit (tek satır): selamlama ve altında kısa cümle, yenile yok
  const strip = size.id === 'xs'
  const now = useNow()
  const counts = useBoxCounts()
  const { text, daytime } = greetingOf(now)
  const Icon = daytime ? Sun : Moon
  // Dolu birincil renkte band
  const band = useBand()
  // Cümledeki sayı sayarak gelir; metnin geri kalanı yerelleştirmeden
  const pending = counts.get('bekleyen') ?? 0
  const [before, after = ''] = pendingSentence(pending).split(String(pending))
  if (strip)
    return (
      <Card
        className={cn(CARD, 'h-full', band.band)}
        classNames={{ body: 'flex h-full flex-col justify-center gap-0.5 px-4 py-2' }}
      >
        <Flex align="center" gap={8} className="min-w-0">
          <Icon {...IC_BLOCK} className="size-4 shrink-0" />
          <Title
            level={1}
            className="m-0! min-w-0 flex-1 font-display text-lg font-bold text-current! truncate"
          >
            {text}, {CURRENT_USER.firstName}.
          </Title>
        </Flex>
        <Paragraph className="m-0! text-xs text-current! opacity-85 truncate">
          {before}
          <Text className="font-semibold text-current!">{pending}</Text>
          {after}
        </Paragraph>
      </Card>
    )
  return (
    <Card
      className={cn(CARD, 'h-full', band.band)}
      classNames={{
        body: cn('flex h-full flex-col justify-center gap-2 p-5', small && 'gap-1.5 p-4'),
      }}
    >
      <Flex align="center" gap={12}>
        <Icon {...IC_BLOCK} className="size-6 shrink-0" />
        <Title
          level={1}
          className={cn(
            'm-0! min-w-0 flex-1 truncate font-display font-bold text-current!',
            small ? 'text-xl' : 'text-2xl @xl:text-3xl',
          )}
        >
          {text}, {CURRENT_USER.firstName}.
        </Title>
        <Refresh
          pending={refreshing}
          onPress={onRefresh}
          className="text-current! hover:bg-current/10!"
        />
      </Flex>
      <Paragraph className={cn('m-0! text-current!', small && 'line-clamp-2 text-sm')}>
        {before}
        <Count value={pending} className="font-semibold" />
        {after}
      </Paragraph>
      {!small && (
        <Text className="text-sm text-current! opacity-75">
          {formatLongDate(now)} · {formatWeekday(now)}
        </Text>
      )}
    </Card>
  )
}

function AppTile({
  app,
  fill = false,
  chip = false,
}: {
  app: MenuApp
  /** Dolu karo (yatay widget): hücrenin yüksekliğini kaplar, ikon büyük. */
  fill?: boolean
  /** Alçak widget (2 satır): yan yana ikon + ad, iki satıra sığacak kadar basık. */
  chip?: boolean
}) {
  const Icon = app.icon
  const pinLabel = app.pinned ? APPS_LABELS.unpin : APPS_LABELS.pin
  // Yıldıza her basışta küçük bir sıçrama (anahtar değişince ikon yeniden takılır)
  const [pops, setPops] = useState(0)
  return (
    // Üzerine gelince karo hafifçe kalkar, ikon büyür
    <Flex
      vertical
      align="center"
      gap={6}
      className={cn(
        'group/app relative h-full min-w-0 rounded-2xl px-2 py-2 transition duration-200 hover:-translate-y-0.5 hover:bg-surface-secondary',
        // Dolu karo (yatay widget): hücrenin yüksekliğini kaplayan yumuşak zeminli kart, ikon büyük
        fill && 'justify-center gap-2.5 bg-surface-secondary/60',
        // Basık çip: ikon solda, ad yanında, yıldız sağ uçta ortalı
        chip && 'flex-row justify-start gap-2 rounded-xl bg-surface-secondary/60 px-2 py-1 pe-7',
      )}
    >
      {/* Yıldız karonun sağ üst köşesinde; bağlantı karoyu kaplar, yıldız onun üstünde */}
      <Tip label={pinLabel}>
        <Button
          type="text"
          size="small"
          aria-pressed={app.pinned}
          onClick={() => {
            setPops((n) => n + 1)
            togglePin(app.id)
          }}
          aria-label={`${pinLabel}: ${app.caption}`}
          icon={
            <Star
              key={pops}
              {...IC}
              size={14}
              className={cn(app.pinned && 'fill-current', pops > 0 && 'animate-pop')}
            />
          }
          className={cn(
            'absolute! end-1 z-10 size-6 min-w-6',
            chip ? 'top-1/2 -translate-y-1/2' : 'top-1',
            app.pinned ? 'text-accent-soft-foreground!' : 'text-muted!',
          )}
        />
      </Tip>
      <Avatar
        aria-hidden
        size={chip ? 26 : fill ? 48 : 40}
        icon={Icon ? <Icon {...IC_BLOCK} size={chip ? 14 : fill ? 22 : 18} /> : undefined}
        className={cn(
          'inline-flex! shrink-0 items-center justify-center text-sm font-semibold transition-transform duration-200 group-hover/app:scale-110',
          Icon
            ? 'bg-surface-tertiary! text-foreground!'
            : 'bg-accent-soft! text-accent-soft-foreground!',
        )}
      >
        {Icon ? undefined : initials(app.caption)}
      </Avatar>
      {/* Modal / drawer'da açılan uygulama gidilmez, sayfanın üstünde destede açılır */}
      <Link
        to={k(app.href)}
        onClick={(e) => {
          if (!app.openOn) return
          e.preventDefault()
          openDeck(app)
        }}
        className={cn(
          'static block w-full min-w-0 truncate text-foreground no-underline hover:text-foreground hover:no-underline after:absolute after:inset-0',
          chip ? 'text-start text-xs' : fill ? 'text-center text-sm' : 'text-center text-xs',
        )}
      >
        {app.caption}
      </Link>
    </Flex>
  )
}

/**
 * Favoriler / Son Kullanılan Uygulamalar / kullanıcının grupları: üstte alçak sekmeler, ikon + ad
 * (ortak şerit; seçili yaprak Tarihçe kartındaki gibi kartın konturuyla kavislerle karta kaynaşır,
 * `SHEET_ON_SURFACE`), altında kart. Kartın içi boyuta göre: yatay şerit (yatay boyutlar), iki
 * sütunlu karolar (dikey, sütun) ya da kare ızgara (kare). İçerik kartta kayar.
 *
 * Gruplar (açık istek üzerine; `shared/appGroups.ts`): şeridin sonundaki "+" yeni grup açar (ad
 * penceresi); her grup bir sekme, sağ tık menüsünde yeniden adlandırma ve silme. Uygulama gruba
 * karonun sağ tık menüsünden (Gruba ekle › grup; grup sekmesinde Gruptan çıkar) ya da grup
 * sekmesindeki "Uygulama ekle" karosundan (bütün uygulamalar, işaretle) konur.
 */
const TAB_ICONS = { favorites: Star, recent: History } as const

/** Grup adı penceresi: yeni grup ya da yeniden adlandırma. */
type GroupEdit = { mode: 'new' } | { mode: 'rename'; id: string; name: string }

function AppsBlock({ size }: { size: WidgetSize }) {
  // Dikey ve sütun: uygulamalar iki sütunlu karolar
  const vertical = size.id === 'tall' || size.id === 'short' || size.id === 'column'
  const square = size.id === 'square'
  // Yatay boyutlarda karolar yana kayan bir şerit (hücre yüksekse iki satır); 2 satırlık alçak
  // widget'ta hep iki satır, basık çipler
  const side = !vertical && !square
  const low = side && size.h <= 2
  const lists = useMenuApps()
  const groups = useAppGroups()
  const transition = useTransition()
  const [picked, setTab] = useState<string>('favorites')
  // Silinen grubun sekmesi seçiliyse Favoriler
  const tab =
    picked === 'favorites' || picked === 'recent' || groups.some((g) => g.id === picked)
      ? picked
      : 'favorites'
  const group = groups.find((g) => g.id === tab)
  const byId = useMemo(() => new Map(lists.all.map((a) => [a.id, a])), [lists.all])
  const apps: MenuApp[] = group
    ? group.apps.flatMap((id) => {
        const a = byId.get(id)
        return a ? [a] : []
      })
    : lists[tab as 'favorites' | 'recent']
  const label = group ? group.name : APPS_LABELS[tab as 'favorites' | 'recent']
  const [edit, setEdit] = useState<GroupEdit | null>(null)
  const panelId = useId()

  // Karonun sağ tık menüsü: grup sekmesinde çıkarma; diğerlerinde gruba ekleme (grup yoksa not)
  const tileMenu = (app: MenuApp): MenuProps['items'] =>
    group
      ? [
          {
            key: 'remove',
            label: GROUP_LABELS.removeFrom,
            onClick: () => toggleInGroup(group.id, app.id),
          },
        ]
      : [
          {
            key: 'add',
            label: GROUP_LABELS.addTo,
            disabled: groups.length === 0,
            children: groups.length
              ? groups.map((g) => ({
                  key: g.id,
                  label: g.name,
                  icon: g.apps.includes(app.id) ? <Check {...IC} size={14} /> : undefined,
                  onClick: () => toggleInGroup(g.id, app.id),
                }))
              : undefined,
          },
          ...(groups.length === 0
            ? [{ key: 'none', label: GROUP_LABELS.noGroups, disabled: true }]
            : []),
        ]
  const tile = (a: MenuApp, fill: boolean, chip = false) => (
    <Dropdown trigger={['contextMenu']} menu={{ items: tileMenu(a) }}>
      <Flex className="block h-full min-w-0">
        <AppTile app={a} fill={fill} chip={chip} />
      </Flex>
    </Dropdown>
  )
  // Grup sekmesinde son karo: uygulama ekleme
  const adder = group && <AddApps group={group} all={lists.all} chip={low} />
  const count = apps.length + (adder ? 1 : 0)

  return (
    <Flex vertical className="flex h-full min-h-0">
      {/* Şerit kartın köşesi + kavis kadar içeriden başlar: seçili yaprağın kavsi kartın düz
          kenarına oturur; sekmeler alçak (2.25rem). Sonda "+" (yeni grup) */}
      <TabStrip
        label={`${APPS_LABELS.favorites} / ${APPS_LABELS.recent}`}
        sizing="content"
        sheet={SHEET_ON_SURFACE}
        selected={tab}
        inset="px-[calc(min(32px*var(--corner-scale,1),var(--radius)*2)+var(--tab-f))]"
        className="z-1 shrink-0 [--tab-h:2.25rem]"
      >
        <TabGroup id="apps">
          {(['favorites', 'recent'] as const).map((id) => {
            const on = id === tab
            return (
              <Tab key={id} id={id} selected={on}>
                <TabButton
                  label={APPS_LABELS[id]}
                  icon={TAB_ICONS[id]}
                  current={on}
                  role="tab"
                  aria-selected={on}
                  aria-controls={panelId}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(id)}
                  className="h-full px-4"
                />
              </Tab>
            )
          })}
          {groups.map((g) => {
            const on = g.id === tab
            return (
              <Tab
                key={g.id}
                id={g.id}
                selected={on}
                menu={() => [
                  {
                    key: 'rename',
                    label: GROUP_LABELS.rename,
                    onClick: () => setEdit({ mode: 'rename', id: g.id, name: g.name }),
                  },
                  {
                    key: 'delete',
                    label: GROUP_LABELS.remove,
                    danger: true,
                    onClick: () => deleteGroup(g.id),
                  },
                ]}
              >
                <TabButton
                  label={g.name}
                  icon={Folder}
                  current={on}
                  role="tab"
                  aria-selected={on}
                  aria-controls={panelId}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setTab(g.id)}
                  className="h-full max-w-48 px-4"
                />
              </Tab>
            )
          })}
        </TabGroup>
        {/* Son sekmenin sağında "+": yeni grup */}
        <Flex key="add" className="flex h-(--tab-h) shrink-0 items-end ps-1 pb-(--tab-gap)">
          <Tip label={GROUP_LABELS.newGroup} placement="top">
            <Button
              type="text"
              aria-label={GROUP_LABELS.newGroup}
              aria-haspopup="dialog"
              icon={<Plus {...IC} size={16} />}
              onClick={() => setEdit({ mode: 'new' })}
              className="h-[calc(var(--tab-h)-var(--tab-gap))] w-9 min-w-9 rounded-(--tab-nr) p-0 text-muted hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)]! hover:text-foreground!"
            />
          </Tip>
        </Flex>
      </TabStrip>
      <Card
        id={panelId}
        role="tabpanel"
        aria-label={label}
        className={cn(CARD, 'min-h-0 min-w-0 flex-1')}
        classNames={{ body: 'flex h-full min-h-0 flex-col p-4' }}
      >
        <Flex
          key={tab}
          vertical
          // Yatay boyutlarda kendi yüksekliğine göre (kap sorgusu): yer varsa karolar iki satır
          className={cn('min-h-0 min-w-0 flex-1', side && '[container-type:size]')}
        >
          {count === 0 ? (
            <EmptyNote text="Kullanılabilir öğe yok." className="py-3" />
          ) : vertical || square ? (
            // Dikey liste ya da kare ızgara; hücrede aşağı kayar
            <Scroll className="h-full">
              <Flex
                role="list"
                aria-label={label}
                className={cn('grid gap-1.5', vertical ? 'grid-cols-2' : 'grid-cols-3')}
              >
                {apps.map((a) => (
                  <Flex key={a.id} role="listitem" className="block min-w-0">
                    {tile(a, vertical)}
                  </Flex>
                ))}
                {adder && (
                  <Flex role="listitem" className="block min-w-0">
                    {adder}
                  </Flex>
                )}
              </Flex>
            </Scroll>
          ) : (
            <Scroll horizontal className={cn('[scrollbar-width:none]', side && 'h-full')}>
              {/* Favoriye eklenen / çıkarılan karo yerine süzülür, diğerleri kayarak yer açar */}
              <Flex
                role="list"
                aria-label={label}
                // İki satırda sıra soldan sağa (sütun sayısı öğe sayısının yarısı); sığmazsa yana
                // kayar
                style={side ? ({ '--cols': Math.ceil(count / 2) } as CSSProperties) : undefined}
                className={cn(
                  'grid grid-flow-col gap-1',
                  // Yanda karolar hücrenin yüksekliğini doldurur; hücre yeterince yüksekse iki satır
                  low
                    ? 'h-full grid-flow-row grid-cols-[repeat(var(--cols),11rem)] grid-rows-2 gap-1.5'
                    : side
                      ? 'h-full auto-cols-[9rem] gap-2 [@container_(min-height:13rem)]:grid-flow-row [@container_(min-height:13rem)]:grid-cols-[repeat(var(--cols),9rem)] [@container_(min-height:13rem)]:grid-rows-2'
                      : 'auto-cols-[8rem]',
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {apps.map((a) => (
                    <MotionFlex
                      key={a.id}
                      role="listitem"
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={transition}
                      className={cn('block min-w-0', side && 'h-full')}
                    >
                      {tile(a, side && !low, low)}
                    </MotionFlex>
                  ))}
                  {adder && (
                    <MotionFlex
                      key="add"
                      role="listitem"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={transition}
                      className={cn('block min-w-0', side && 'h-full')}
                    >
                      {adder}
                    </MotionFlex>
                  )}
                </AnimatePresence>
              </Flex>
            </Scroll>
          )}
        </Flex>
      </Card>
      {/* Grup adı penceresi (yeni / yeniden adlandırma); kapanınca kaldırılır */}
      <AnimatePresence>
        {edit && (
          <GroupNameDialog
            key="group-name"
            edit={edit}
            onClose={() => setEdit(null)}
            onDone={(id) => {
              setEdit(null)
              if (id) setTab(id)
            }}
          />
        )}
      </AnimatePresence>
    </Flex>
  )
}

/** Grup adı penceresi: Enter / Oluştur kaydeder; yeni grup seçilir. */
function GroupNameDialog({
  edit,
  onClose,
  onDone,
}: {
  edit: GroupEdit
  onClose: () => void
  /** Kaydedildi; yeni grubun kimliği (yeniden adlandırmada yok). */
  onDone: (id?: string) => void
}) {
  const [name, setName] = useState(edit.mode === 'rename' ? edit.name : '')
  const valid = name.trim().length > 0
  const submit = () => {
    if (!valid) return
    if (edit.mode === 'new') onDone(createGroup(name))
    else {
      renameGroup(edit.id, name)
      onDone()
    }
  }
  return (
    <SoftModal
      open
      onCancel={onClose}
      width={400}
      centered
      title={
        <Typography.Text className="text-base font-semibold">
          {edit.mode === 'new' ? GROUP_LABELS.newGroup : GROUP_LABELS.rename}
        </Typography.Text>
      }
      closable={false}
      footer={
        <Flex justify="end" gap={8}>
          <Button type="text" onClick={onClose}>
            {GROUP_LABELS.cancel}
          </Button>
          <Button type="primary" disabled={!valid} onClick={submit}>
            {edit.mode === 'new' ? GROUP_LABELS.create : GROUP_LABELS.save}
          </Button>
        </Flex>
      }
    >
      <Input
        autoFocus
        value={name}
        maxLength={40}
        placeholder={GROUP_LABELS.groupName}
        aria-label={GROUP_LABELS.groupName}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={submit}
      />
    </SoftModal>
  )
}

/**
 * Grup sekmesinin son karosu: "Uygulama ekle" — bütün uygulamaların işaretli listesi (açılır
 * panel); işaret gruba koyar / çıkarır.
 */
function AddApps({ group, all, chip }: { group: AppGroup; all: MenuApp[]; chip: boolean }) {
  const [open, setOpen] = useState(false)
  const content = (
    <Flex
      vertical
      role="group"
      aria-label={GROUP_LABELS.addApps}
      className="max-h-72 overflow-y-auto"
    >
      {all.map((a) => (
        <Checkbox
          key={a.id}
          checked={group.apps.includes(a.id)}
          onChange={() => toggleInGroup(group.id, a.id)}
          className="rounded-lg px-2 py-1.5 hover:bg-surface-secondary"
        >
          {a.caption}
        </Checkbox>
      ))}
    </Flex>
  )
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      arrow={false}
      destroyOnHidden
      content={content}
      classNames={{ container: 'w-72 max-w-[calc(100vw-2rem)] p-2' }}
    >
      <Button
        type="text"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-full w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-transparent text-muted hover:bg-surface-secondary! hover:text-foreground!',
          chip ? 'flex-row rounded-xl px-2 py-1' : 'flex-col px-2 py-2',
        )}
      >
        <Plus {...IC} size={chip ? 16 : 20} />
        <Typography.Text className="text-xs text-current!">{GROUP_LABELS.addApps}</Typography.Text>
      </Button>
    </Popover>
  )
}

/* --- Satır 2: kategori blokları ---------------------------------------------------------------- */

/** Kategori sekmesinin düğmesi: ad (geniş ekranda), ikon ve sayı; yükseklik sekmenin. */
const CATEGORY =
  'relative z-2 h-full w-full min-w-0 justify-start gap-2 rounded-(--tab-r) px-5 shadow-none hover:bg-transparent! focus-visible:outline-none! focus-visible:[box-shadow:inset_0_0_0_2px_var(--focus)]'

/**
 * Kategori sekmeleri: ortak sekme şeridi (`tabs/TabStrip.tsx`), iş bloğu kartının üstünde. Seçili
 * sekme kartla aynı yüzeyde ve kartın konturuyla (`SHEET_ON_SURFACE`): kontur içbükey kavisler
 * boyunca kartın üst çizgisine kesintisiz iner; sekmeler şeridi eşit paylaşır. Birincil renk ikon ve
 * sayıda.
 */
function Categories({
  selected,
  onSelect,
  uid,
  panelId,
}: {
  selected: BoxId
  onSelect: (b: BoxId) => void
  /** Sekme kimliklerinin öneki (widget örneğine özel). */
  uid: string
  /** İş bloğunun (sekme panelinin) kimliği. */
  panelId: string
}) {
  const counts = useBoxCounts({ unreadInfo: true })
  return (
    <TabStrip
      label={START_LABELS.categories}
      selected={selected}
      sizing="fill"
      sheet={SHEET_ON_SURFACE}
      // İçeri girme payı = kartın köşe yarıçapı (en çok 32px, squircle'da `--corner-scale` katı) +
      // sekme kavisi: seçili sekmenin kavisi her temada kartın düz kenarına oturur
      inset="min-w-184 px-[calc(min(32px*var(--corner-scale,1),var(--radius)*3)+var(--tab-f))]"
      // Kartın üstünde: seçili sekme kartın üst konturunu örter
      className="z-1 shrink-0 [--tab-h:4rem]"
    >
      <TabGroup id="categories">
        {mainBoxes.map((b) => {
          const Icon = b.icon
          const isSel = b.id === selected
          const n = counts.get(b.id) ?? 0
          return (
            <Tab key={b.id} id={b.id} selected={isSel}>
              <Button
                type="text"
                role="tab"
                id={`${uid}category-${b.id}`}
                aria-selected={isSel}
                aria-controls={panelId}
                tabIndex={isSel ? 0 : -1}
                aria-label={`${b.label}, ${n}`}
                onClick={() => onSelect(b.id)}
                className={cn(CATEGORY, isSel ? 'text-foreground' : 'text-foreground/70')}
              >
                {/* Dar blokta (48rem altı) etiket sığmıyor ("Bekle…"); orada ikon + sayı, ad aria-label'da */}
                <Text
                  className={cn(
                    'hidden min-w-0 truncate @3xl:block',
                    isSel ? 'font-semibold text-current!' : 'font-medium text-foreground/70!',
                  )}
                >
                  {b.label}
                </Text>
                <Icon {...IC_BLOCK} className="size-5 shrink-0 text-accent-soft-foreground" />
                <Text className="ms-auto font-display text-2xl leading-none font-bold text-accent-soft-foreground!">
                  <Count value={n} />
                </Text>
              </Button>
            </Tab>
          )
        })}
      </TabGroup>
    </TabStrip>
  )
}

/* --- Satır 3: iş bloğu ------------------------------------------------------------------------- */

/** Sol / sağ; aradaki tutamak sürüklenir ya da ok tuşlarıyla kaydırılır (25–55 %). */
function WorkSplit({ left, right }: { left: ReactNode; right: ReactNode }) {
  const [split, setSplit] = useState(() => {
    const v = readJson<number>(SPLIT_KEY, 30)
    return typeof v === 'number' && v >= 25 && v <= 55 ? v : 30
  })
  const set = (v: number) => {
    const next = Math.round(Math.min(55, Math.max(25, v)))
    setSplit(next)
    writeJson(SPLIT_KEY, next)
  }
  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const host = e.currentTarget.parentElement
    if (!host) return
    e.preventDefault()
    const rect = host.getBoundingClientRect()
    const move = (ev: globalThis.PointerEvent) => set(((ev.clientX - rect.left) / rect.width) * 100)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    set(split + (e.key === 'ArrowLeft' ? -2 : 2))
  }
  return (
    <Flex
      // Hücrenin kalanını doldurur; iki sütun kendi içinde kayar (zemin kartın kendisi)
      className="flex min-h-0 flex-1 flex-col text-foreground @xl:flex-row"
      style={{ '--split': `${split}%` } as CSSProperties}
    >
      {/* Sol sütun iş bloğunun tüm yüksekliğini alır (süreç listesi en alta kadar uzar) */}
      <Flex vertical className="min-h-0 overflow-y-auto p-5 @xl:w-(--split) @xl:shrink-0">
        {left}
      </Flex>
      <Flex
        role="separator"
        aria-orientation="vertical"
        aria-label="Bölücü"
        aria-valuemin={25}
        aria-valuemax={55}
        aria-valuenow={split}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="hidden w-3 cursor-col-resize justify-center py-5 outline-none focus-visible:bg-accent-soft @xl:flex"
      >
        <Divider orientation="vertical" className="m-0 h-full" />
      </Flex>
      <Divider className="m-0 @xl:hidden" />
      <Flex vertical className="min-h-0 min-w-0 flex-1 overflow-y-auto p-5">
        {right}
      </Flex>
    </Flex>
  )
}

interface GroupListProps {
  box: WorkBox
  groups: ProcessGroup[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  search: string
  onSearch: (q: string) => void
  sort: GroupSort
  onSort: (s: GroupSort) => void
  loading: boolean
  onReload: () => void
}

function GroupList({
  box,
  groups,
  selectedId,
  onSelect,
  search,
  onSearch,
  sort,
  onSort,
  loading,
  onReload,
}: GroupListProps) {
  const phone = useMediaQuery('(max-width: 639px)')
  const isDraft = box.id === 'taslaklar'
  const countLabel = isDraft ? START_LABELS.draftCount : START_LABELS.requestCount
  const caption = groupCaption(box.id)
  const label = `${box.label}: ${caption}`
  return (
    <Flex vertical gap={12} className="flex-1">
      <Flex wrap align="center" gap={4}>
        <Title level={2} className={H2}>
          {caption}
        </Title>
        <SortMenu box={box} sort={sort} onSort={onSort} />
        <Refresh pending={loading} onPress={onReload} />
        {SHOW_ALL_BOXES.includes(box.id) && (
          // Yalnızca ikon; ad ipucunda ve erişilebilir adda. Satırın en sağında
          <Tip label={START_LABELS.showAll}>
            <Link
              to={boxLink(box.id)}
              aria-label={START_LABELS.showAll}
              className="ms-auto inline-grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground transition-colors hover:bg-accent/20 hover:text-accent-soft-foreground focus-visible:outline-2 focus-visible:outline-focus"
            >
              <ExternalLink {...IC} />
            </Link>
          </Tip>
        )}
      </Flex>
      <SearchField value={search} onChange={onSearch} label={START_LABELS.search} />
      <Flex aria-hidden justify="space-between" className="px-3">
        {[START_LABELS.flow, countLabel].map((t) => (
          <Text key={t} type="secondary" className="text-[0.75rem]">
            {t}
          </Text>
        ))}
      </Flex>
      {loading && !phone ? (
        <SkeletonRows />
      ) : groups.length === 0 ? (
        <NoData />
      ) : phone ? (
        // Telefonda süreç grupları tek bir seçim alanı
        <Select
          aria-label={label}
          placeholder={caption}
          value={selectedId ?? undefined}
          onChange={(v?: string) => onSelect(v == null ? null : String(v))}
          size="large"
          className={cn('w-full', dim(loading))}
          options={groups.map(({ process: p, count }) => ({
            value: p.id,
            label: `${isDraft ? p.form : p.name} (${count})`,
          }))}
        />
      ) : (
        // Liste kalan yüksekliği doldurur, sığmazsa kendi içinde kayar; yüksekliği bloğu uzatmaz
        <Flex className="relative min-h-[26rem] flex-1 @xl:min-h-48">
          {/* Kap iki yana 4px taşar, öğeler onu doldurur (taşma öğede olsaydı kap keserdi) */}
          <Scroll className="absolute -inset-x-1 inset-y-0">
            <Flex vertical role="listbox" aria-label={label}>
              {groups.map(({ process: p, count }) => {
                const Icon = p.icon
                const isSelected = p.id === selectedId
                return (
                  <Button
                    key={p.id}
                    type="text"
                    role="option"
                    aria-selected={isSelected}
                    aria-label={`${processCaption(p)}, ${countLabel} ${count}`}
                    // Seçiliye yeniden basınca seçim kalkar
                    onClick={() => onSelect(isSelected ? null : p.id)}
                    // Seçili zemin satırdan satıra kayar
                    className={cn(
                      ITEM,
                      LIST_ITEM,
                      isSelected
                        ? 'text-accent-foreground hover:bg-transparent! hover:text-accent-foreground!'
                        : 'text-foreground hover:bg-accent/6!',
                    )}
                  >
                    {isSelected && <Indicator id="start-group" className="bg-accent" />}
                    <Icon {...IC} className="relative shrink-0 opacity-80" />
                    <Flex vertical className="relative min-w-0 flex-1">
                      <Text className="text-xs text-current! opacity-65 truncate">{p.project}</Text>
                      <Text className="text-sm font-medium text-current! truncate">
                        {isDraft ? p.form : p.name}
                      </Text>
                    </Flex>
                    <Tag
                      className={cn(
                        'relative me-0 min-w-8 rounded-full border-0 text-center font-semibold text-foreground',
                        isSelected ? 'bg-surface' : 'bg-surface-secondary',
                      )}
                    >
                      <Count value={count} />
                    </Tag>
                  </Button>
                )
              })}
            </Flex>
          </Scroll>
        </Flex>
      )}
    </Flex>
  )
}

function RequestsTile({
  box,
  process,
  requests,
  loading,
  onReload,
}: {
  box: WorkBox
  process: Process | null
  requests: WorkRequest[]
  loading: boolean
  onReload: () => void
}) {
  const navigate = useNavigate()
  const readIds = useReadIds()
  const phone = useMediaQuery('(max-width: 639px)')
  const flow = useFlow(undefined)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<TableSort | null>(null)
  const isDraft = box.id === 'taslaklar'
  const title = isDraft ? START_LABELS.drafts : START_LABELS.requests
  const columns = useMemo(() => (process ? columnsFor(box, process) : []), [box, process])

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    const found = q
      ? requests.filter((r) =>
          columns.some((c) => {
            const v = cellValue(r, c.key)
            return (
              v != null && !(v instanceof Date) && String(v).toLocaleLowerCase('tr').includes(q)
            )
          }),
        )
      : requests
    const base = [...found].sort((a, b) => dateOf(b, box).getTime() - dateOf(a, box).getTime())
    if (!sort) return base
    const d = sort.direction === 'descending' ? -1 : 1
    return base.sort((a, b) => d * compareBy(a, b, sort.column))
  }, [requests, columns, query, sort, box])

  // Hızlı onaylanan satır yerinde kalıp sağa kayarak çıkar
  const [shown, leaving] = useLeaving(rows)
  const fade = (r: WorkRequest) => leaving(r.id)

  const open = (key: string) => {
    const r = rows.find((x) => x.id === key)
    if (!r) return
    markRead(r.id)
    navigate(requestLink(r), { state: { ids: rows.map((x) => x.id) } satisfies DetailNavState })
  }
  const events = (r: WorkRequest) => (
    <FastMenu request={r} onRun={(id) => flow.run(id, r)} placement="bottom start" />
  )
  const openOnEnter = (r: WorkRequest) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && e.target === e.currentTarget) open(r.id)
  }

  const order = (key: string): SortOrder =>
    sort?.column === key ? (sort.direction === 'ascending' ? 'ascend' : 'descend') : null
  const tableColumns: TableColumnsType<WorkRequest> = [
    ...(box.decisions
      ? [
          {
            key: '__events',
            title: <Text className="sr-only">Olaylar</Text>,
            className: STICKY_START,
            render: (_: unknown, r: WorkRequest) => events(r),
          },
        ]
      : []),
    ...columns.map((c) => ({
      key: c.key,
      title: c.caption,
      sorter: true,
      sortOrder: order(c.key),
      showSorterTooltip: false,
      className: cn('whitespace-nowrap', c.key === 'Subject' && 'max-w-64 truncate'),
      render: (_: unknown, r: WorkRequest) => <CellValue r={r} col={c} />,
    })),
  ]

  return (
    // Sütunun kalanını doldurur (yüklenirken yükleyici tam ortada)
    <Flex vertical gap={12} className="min-h-0 flex-1">
      <Flex wrap align="center" className="gap-x-3 gap-y-2">
        <Flex vertical className="min-w-0 flex-1">
          <Title level={2} className={H2}>
            {title}
          </Title>
          {process && (
            <Text type="secondary" className="text-sm truncate">
              {processCaption(process)}
            </Text>
          )}
        </Flex>
        {process && (
          <Flex align="center" gap={4}>
            <SearchField
              value={query}
              onChange={setQuery}
              label={START_LABELS.search}
              className="w-56"
            />
            <Refresh pending={loading} onPress={onReload} />
          </Flex>
        )}
      </Flex>

      {!process ? (
        <EmptyNote
          icon={MousePointerClick}
          text={isDraft ? START_LABELS.pickDraft : START_LABELS.pickProcess}
          className="py-16"
        />
      ) : loading && !phone ? (
        <SkeletonRows rows={8} />
      ) : phone ? (
        // Telefonda iki satırlı liste: konu / numara ve talep eden
        shown.length === 0 ? (
          <NoData />
        ) : (
          <Flex
            vertical
            role="list"
            aria-label={`${title}: ${processCaption(process)}`}
            className={cn('-mx-1', dim(loading))}
          >
            {shown.map((r) => {
              const unread = !isRead(r, readIds)
              return (
                <Flex
                  key={r.id}
                  role="listitem"
                  align="center"
                  gap={8}
                  tabIndex={0}
                  onClick={() => open(r.id)}
                  onKeyDown={openOnEnter(r)}
                  className={cn(
                    ITEM,
                    'min-h-11 cursor-pointer rounded-xl outline-none hover:bg-accent/6 focus-visible:[box-shadow:inset_0_0_0_2px_var(--focus)]',
                    fade(r),
                  )}
                >
                  <Flex vertical className="min-w-0 flex-1">
                    <Text
                      data-item-title
                      type={unread ? undefined : 'secondary'}
                      className={cn('truncate text-sm', unread && 'font-semibold')}
                    >
                      {r.template.title}
                    </Text>
                    <Text type="secondary" className="text-xs truncate">
                      {r.requester.name} · {r.no}
                    </Text>
                  </Flex>
                  {box.decisions && events(r)}
                </Flex>
              )
            })}
          </Flex>
        )
      ) : (
        <Flex vertical className="block overflow-x-auto">
          <Table<WorkRequest>
            aria-label={`${title}: ${processCaption(process)}`}
            size="middle"
            pagination={false}
            rowKey="id"
            columns={tableColumns}
            dataSource={shown}
            className={GRID_TABLE}
            locale={{ emptyText: <NoData /> }}
            rowClassName={(r) =>
              cn(
                GRID_ROW,
                fade(r),
                !isRead(r, readIds) ? 'font-semibold' : '[&>td]:text-foreground/70',
              ) ?? ''
            }
            onRow={(r) => ({
              'data-open-path': requestLink(r),
              onClick: () => open(r.id),
              onKeyDown: openOnEnter(r),
              tabIndex: 0,
            })}
            onChange={(_, __, sorter, extra) => {
              if (extra.action !== 'sort') return
              const s = Array.isArray(sorter) ? sorter[0] : sorter
              setSort(
                s?.order
                  ? {
                      column: String(s.columnKey),
                      direction: s.order === 'ascend' ? 'ascending' : 'descending',
                    }
                  : null,
              )
            }}
          />
        </Flex>
      )}
      {box.decisions && flow.element}
    </Flex>
  )
}
