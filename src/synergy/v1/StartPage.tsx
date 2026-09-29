import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router'
import {
  Avatar,
  Button,
  Card,
  Chip,
  Link,
  ListBox,
  Select,
  Separator,
  Skeleton,
  Surface,
  Table,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  buttonVariants,
  cn,
  type SortDescriptor,
} from '@heroui/react'
import { ExternalLink, MousePointerClick, Moon, RefreshCw, Star, Sun } from 'lucide-react'
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
import { inline, timeOf } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { boxLink, k, requestLink, useFrame } from '@/synergy/v1/paths'
import {
  CellValue,
  EmptyNote,
  IC,
  IC_BLOCK,
  KaroSearch,
  SortMenu,
  Tip,
  compareBy,
  useBand,
  Scroll,
} from '@/synergy/v1/parts'
import { FastMenu } from '@/synergy/v1/rows'
import { useKaroFlow } from '@/synergy/v1/flow'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { AnimatePresence } from 'framer-motion'
import { Count, Indicator, MotionBox, useLeaving, useTransition } from '@/synergy/v1/motion'

/* -------------------------------------------------------------------------------------------------
 * Karo · Başlangıç: sabit 12 sütunlu bento
 *   1: Karşılama (birincil renk, 5 sütun) · Uygulamalar (7 sütun)
 *   2: Kategori blokları; seçili blok birincil renkte, büyür ve alttaki dille iş bloğuna bağlanır
 *   3: İş bloğu; solda süreç grupları, sağda talepler, aradaki bölücü sürüklenir (genişlik saklanır)
 * ------------------------------------------------------------------------------------------------- */

const SORT_KEY = 'synergy-start-sort-v1'
const SPLIT_KEY = 'synergy-start-split-v1'

/* --- Sınıf grupları ---------------------------------------------------------------------------- */

const BLOCK = 'min-h-39'
const H2 = 'font-display text-lg'
const LIST = '-mx-1 p-0'
const ITEM = 'px-3 py-1 transition-colors data-hovered:bg-accent/6'

/**
 * Kategori sekmesi (Chrome sekmeleri gibi): seçili sekme iş bloğuyla aynı yüzeyde, alttan ona
 * kaynaşır; diğerleri zeminde saydam, üzerine gelince soluk. Birincil renk ikon ve sayıda.
 */
const CATEGORY =
  'relative h-16 w-full min-w-0 justify-start gap-2 overflow-hidden rounded-t-2xl rounded-b-none px-5 data-selected:bg-transparent data-selected:text-foreground'

/** Seçili sekmenin alt köşelerindeki içbükey kavis (yüzey rengi, zeminden oyulmuş çeyrek daire). */
const FLARE_L =
  "before:absolute before:bottom-0 before:-start-4 before:size-4 before:bg-[radial-gradient(circle_at_0_0,transparent_1rem,var(--surface)_1rem)] before:content-['']"
const FLARE_R =
  "after:absolute after:bottom-0 after:-end-4 after:size-4 after:bg-[radial-gradient(circle_at_100%_0,transparent_1rem,var(--surface)_1rem)] after:content-['']"

/** Tablo başlığı / hücresi: çizgisiz; satırın üzerine gelince soluk birincil şerit. */
const COLUMN = 'whitespace-nowrap text-foreground/70 after:hidden'
const CELL = 'h-11 border-b-0 py-1 group-hover/row:bg-accent/6'

/** Olaylar sütunu en solda; tablo yatay kaysa da görünür kalır (hızlı onay hiç gizlenmez); köşeleri düz ki arkası görünmesin. */
const STICKY_START = 'sticky start-0 z-10 bg-surface'

const dim = (on: boolean) => cn('transition-opacity', on && 'opacity-50')

/** Yenilenirken liste yerine parıldayan iskelet satırları. */
function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <Box aria-hidden className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton
          key={i}
          animationType="shimmer"
          className="h-10 rounded-lg"
          style={{ opacity: 1 - i * 0.12 }}
        />
      ))}
    </Box>
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
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={START_LABELS.refresh}
        isPending={pending}
        onPress={onPress}
        className={cn('size-9', className)}
      >
        {/* Yenilenirken ikonun kendisi döner */}
        {({ isPending }) => <RefreshCw {...IC} className={cn(isPending && 'animate-spin')} />}
      </Button>
    </Tip>
  )
}

export function StartPage() {
  const [category, setCategory] = useState<BoxId>('bekleyen')
  const [processId, setProcessId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState<Partial<Record<BoxId, GroupSort>>>(() =>
    readJson(SORT_KEY, {}),
  )
  const [refreshing, refreshAll] = useBriefPending()
  const [groupsLoading, reloadGroups] = useBriefPending()
  const [requestsLoading, reloadRequests] = useBriefPending()

  useFrame([{ label: 'Başlangıç' }], category)

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
    // Sayfa ana alanın kalanını doldurur; iş bloğu en alta kadar uzar
    <Box className="flex flex-1 flex-col">
      <Box className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Greeting refreshing={refreshing} onRefresh={refreshAll} />
        <AppsBlock />
      </Box>
      <Categories selected={category} onSelect={choose} />
      {/* İş bloğu: seçili sekmenin devamı (sekme şeridi iki yandan içeride, kavisler her yerde görünür) */}
      <Card className={cn(BLOCK, 'flex-1 p-1.5')}>
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
    </Box>
  )
}

/* --- Satır 1 ----------------------------------------------------------------------------------- */

function Greeting({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const now = useNow()
  const counts = useBoxCounts()
  const { text, daytime } = greetingOf(now)
  const Icon = daytime ? Sun : Moon
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  // Vurgu gücüne göre band (tema paneli)
  const band = useBand()
  // Cümledeki sayı sayarak gelir; metnin geri kalanı yerelleştirmeden
  const pending = counts.get('bekleyen') ?? 0
  const [before, after = ''] = pendingSentence(pending).split(String(pending))
  return (
    <Card className={cn(BLOCK, 'justify-center gap-2 p-5 lg:col-span-5', band.band)}>
      <Box className="flex items-center gap-3">
        <Icon {...IC_BLOCK} className="size-6 shrink-0" />
        <Typography.Heading
          level={1}
          weight="bold"
          truncate
          className="min-w-0 flex-1 font-display text-2xl text-current! sm:text-3xl"
        >
          {text}, {CURRENT_USER.firstName}.
        </Typography.Heading>
        <Refresh
          pending={refreshing}
          onPress={onRefresh}
          className="text-current hover:bg-current/10"
        />
      </Box>
      <Typography className="text-current!">
        {before}
        <Count value={pending} className="font-semibold" />
        {after}
      </Typography>
      <Typography {...timeOf(today)} type="body-sm" className="text-current! opacity-75">
        {formatLongDate(now)} · {formatWeekday(now)}
      </Typography>
    </Card>
  )
}

function AppTile({ app }: { app: MenuApp }) {
  const Icon = app.icon
  const pinLabel = app.pinned ? APPS_LABELS.unpin : APPS_LABELS.pin
  // Yıldıza her basışta küçük bir sıçrama (anahtar değişince ikon yeniden takılır)
  const [pops, setPops] = useState(0)
  return (
    // Üzerine gelince karo hafifçe kalkar, ikon büyür
    <Card
      variant="transparent"
      className="group/app relative h-full min-w-0 items-center gap-1.5 px-2 py-2 transition duration-200 hover:-translate-y-0.5 hover:bg-surface-secondary"
    >
      {/* Yıldız karonun sağ üst köşesinde; bağlantı karoyu kaplar, yıldız onun üstünde */}
      <Tip label={pinLabel}>
        <ToggleButton
          isIconOnly
          size="sm"
          variant="ghost"
          isSelected={app.pinned}
          onChange={() => {
            setPops((n) => n + 1)
            togglePin(app.id)
          }}
          aria-label={`${pinLabel}: ${app.caption}`}
          className="absolute end-1 top-1 z-10 size-6 min-w-6 text-muted data-selected:bg-transparent data-selected:text-accent-soft-foreground"
        >
          <Star
            key={pops}
            {...IC}
            size={14}
            className={cn(app.pinned && 'fill-current', pops > 0 && 'animate-pop')}
          />
        </ToggleButton>
      </Tip>
      <Avatar
        color="accent"
        variant={Icon ? undefined : 'soft'}
        aria-hidden
        className="size-10 transition-transform duration-200 group-hover/app:scale-110"
      >
        <Avatar.Fallback
          className={cn('text-sm font-semibold', Icon && 'bg-surface-tertiary text-foreground')}
        >
          {Icon ? <Icon {...IC_BLOCK} size={18} /> : initials(app.caption)}
        </Avatar.Fallback>
      </Avatar>
      <Link
        href={k(app.href)}
        className="static block w-full min-w-0 truncate text-center text-xs hover:no-underline after:absolute after:inset-0"
      >
        {app.caption}
      </Link>
    </Card>
  )
}

function AppsBlock() {
  const lists = useMenuApps()
  const transition = useTransition()
  const [tab, setTab] = useState<'favorites' | 'recent'>('favorites')
  const ids = ['favorites', 'recent'] as const
  return (
    <Card className={cn(BLOCK, 'p-4 lg:col-span-7')}>
      <Tabs
        selectedKey={tab}
        onSelectionChange={(key) => setTab(key as typeof tab)}
        className="gap-2"
      >
        <Tabs.ListContainer className="self-start">
          <Tabs.List aria-label={`${APPS_LABELS.favorites} / ${APPS_LABELS.recent}`}>
            {ids.map((id) => (
              <Tabs.Tab
                key={id}
                id={id}
                className="whitespace-nowrap data-[selected=true]:font-semibold data-[selected=true]:text-accent-soft-foreground"
              >
                <Tabs.Indicator className="bg-surface ring-2 ring-inset ring-accent-soft-foreground/40" />
                {APPS_LABELS[id]}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {ids.map((id) => (
          <Tabs.Panel key={id} id={id} className="mt-0 p-0">
            {lists[id].length === 0 ? (
              <EmptyNote text="Kullanılabilir öğe yok." className="py-3" />
            ) : (
              <Scroll orientation="horizontal" hideScrollBar>
                {/* Favoriye eklenen / çıkarılan karo yerine süzülür, diğerleri kayarak yer açar */}
                <Box
                  role="list"
                  aria-label={APPS_LABELS[id]}
                  className="grid auto-cols-[8rem] grid-flow-col gap-1"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {lists[id].map((a) => (
                      <MotionBox
                        key={a.id}
                        role="listitem"
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={transition}
                        className="min-w-0"
                      >
                        <AppTile app={a} />
                      </MotionBox>
                    ))}
                  </AnimatePresence>
                </Box>
              </Scroll>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Card>
  )
}

/* --- Satır 2: kategori blokları ---------------------------------------------------------------- */

function Categories({ selected, onSelect }: { selected: BoxId; onSelect: (b: BoxId) => void }) {
  const counts = useBoxCounts({ unreadInfo: true })
  return (
    <Scroll orientation="horizontal" hideScrollBar className="mt-3">
      <ToggleButtonGroup
        aria-label={START_LABELS.categories}
        isDetached
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[selected]}
        onSelectionChange={(keys) => {
          const [key] = [...keys]
          if (key) onSelect(key as BoxId)
        }}
        className="flex w-full min-w-184 items-stretch gap-1 px-12"
      >
        {mainBoxes.map((b) => {
          const Icon = b.icon
          const isSel = b.id === selected
          const n = counts.get(b.id) ?? 0
          return (
            <Box key={b.id} className={cn('relative grid min-w-0 grow basis-0', isSel && 'z-10')}>
              {/* Seçili sekme (yüzey + içbükey kavisler) sekmeden sekmeye kayar */}
              {isSel && (
                <Indicator
                  id="start-category"
                  className={cn('rounded-t-2xl rounded-b-none bg-surface', FLARE_L, FLARE_R)}
                />
              )}
              <ToggleButton
                id={b.id}
                variant="ghost"
                aria-label={`${b.label}, ${n}`}
                className={CATEGORY}
              >
                {/* 1280px altında etiket sığmıyor ("Bekle…"); orada ikon + sayı, ad aria-label'da */}
                <Typography
                  {...inline}
                  weight={isSel ? 'semibold' : 'medium'}
                  truncate
                  className={cn(
                    'hidden min-w-0 text-current! xl:block',
                    !isSel && 'text-foreground/70!',
                  )}
                >
                  {b.label}
                </Typography>
                <Icon {...IC_BLOCK} className="size-5 shrink-0 text-accent-soft-foreground" />
                <Typography
                  {...inline}
                  weight="bold"
                  className="ms-auto font-display text-2xl leading-none text-accent-soft-foreground!"
                >
                  <Count value={n} />
                </Typography>
              </ToggleButton>
            </Box>
          )
        })}
      </ToggleButtonGroup>
    </Scroll>
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
    <Surface
      variant="default"
      className="flex flex-1 flex-col lg:flex-row"
      style={{ '--split': `${split}%` } as CSSProperties}
    >
      {/* Sol sütun iş bloğunun tüm yüksekliğini alır (süreç listesi en alta kadar uzar) */}
      <Box className="flex flex-col p-5 lg:w-(--split) lg:shrink-0">{left}</Box>
      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label="Bölücü"
        aria-valuemin={25}
        aria-valuemax={55}
        aria-valuenow={split}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="hidden w-3 cursor-col-resize justify-center py-5 outline-none focus-visible:bg-accent-soft lg:flex"
      >
        <Separator orientation="vertical" />
      </Box>
      <Separator className="lg:hidden" />
      <Box className="min-w-0 flex-1 p-5">{right}</Box>
    </Surface>
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
    <Box className="flex flex-1 flex-col gap-3">
      <Box className="flex flex-wrap items-center gap-1">
        <Typography.Heading level={2} className={cn(H2, 'me-auto')}>
          {caption}
        </Typography.Heading>
        <SortMenu box={box} sort={sort} onSort={onSort} />
        <Refresh pending={loading} onPress={onReload} />
        {SHOW_ALL_BOXES.includes(box.id) && (
          <Link
            href={boxLink(box.id)}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'gap-1.5 bg-accent-soft no-underline!',
            )}
          >
            {START_LABELS.showAll}
            <ExternalLink {...IC} />
          </Link>
        )}
      </Box>
      <KaroSearch value={search} onChange={onSearch} label={START_LABELS.search} />
      <Box aria-hidden className="flex justify-between px-3">
        {[START_LABELS.flow, countLabel].map((t) => (
          <Text key={t} tone="muted" className="text-[0.75rem]">
            {t}
          </Text>
        ))}
      </Box>
      {loading && !phone ? (
        <SkeletonRows />
      ) : groups.length === 0 ? (
        <NoData />
      ) : phone ? (
        // Telefonda süreç grupları tek bir seçim alanı
        <Select
          aria-label={label}
          placeholder={caption}
          value={selectedId}
          onChange={(v) => onSelect(v == null ? null : String(v))}
          fullWidth
          className={dim(loading)}
        >
          <Select.Trigger className="min-h-11 items-center">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label={caption}>
              {groups.map(({ process: p, count }) => (
                <ListBox.Item
                  key={p.id}
                  id={p.id}
                  textValue={`${isDraft ? p.form : p.name} (${count})`}
                >
                  {isDraft ? p.form : p.name} ({count})
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ) : (
        // Liste kalan yüksekliği doldurur, sığmazsa kendi içinde kayar; yüksekliği bloğu uzatmaz
        <Box className="relative min-h-[26rem] flex-1 lg:min-h-48">
          <Scroll className="absolute inset-0">
            <ListBox
              aria-label={label}
              selectionMode="single"
              selectedKeys={selectedId ? [selectedId] : []}
              onSelectionChange={(keys) => {
                const [key] = keys === 'all' ? [] : [...keys]
                onSelect(key == null ? null : String(key))
              }}
              className={LIST}
            >
              {groups.map(({ process: p, count }) => {
                const Icon = p.icon
                return (
                  <ListBox.Item
                    key={p.id}
                    id={p.id}
                    textValue={`${processCaption(p)}, ${countLabel} ${count}`}
                    // Seçili zemin satırdan satıra kayar
                    className={cn(
                      ITEM,
                      'group relative data-selected:bg-transparent data-selected:text-accent-foreground',
                    )}
                  >
                    {({ isSelected }) => (
                      <>
                        {isSelected && <Indicator id="start-group" className="bg-accent" />}
                        <Icon {...IC} className="relative opacity-80" />
                        <Box className="relative min-w-0 flex-1">
                          <Typography
                            {...inline}
                            truncate
                            className="text-xs text-current! opacity-65"
                          >
                            {p.project}
                          </Typography>
                          <Typography
                            {...inline}
                            truncate
                            weight="medium"
                            className="text-sm text-current!"
                          >
                            {isDraft ? p.form : p.name}
                          </Typography>
                        </Box>
                        <Chip className="relative min-w-8 justify-center bg-surface-secondary font-semibold group-data-selected:bg-surface">
                          <Count value={count} />
                        </Chip>
                      </>
                    )}
                  </ListBox.Item>
                )
              })}
            </ListBox>
          </Scroll>
        </Box>
      )}
    </Box>
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
  const flow = useKaroFlow(undefined)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortDescriptor | null>(null)
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
    return base.sort((a, b) => d * compareBy(a, b, String(sort.column)))
  }, [requests, columns, query, sort, box])

  // Hızlı onaylanan satır yerinde kalıp sağa kayarak çıkar
  const [shown, leaving] = useLeaving(rows)
  const fade = (r: WorkRequest) => leaving(r.id)

  const open = (key: string | number) => {
    const r = rows.find((x) => x.id === key)
    if (!r) return
    markRead(r.id)
    navigate(requestLink(r), { state: { ids: rows.map((x) => x.id) } satisfies DetailNavState })
  }
  const events = (r: WorkRequest) => (
    <FastMenu request={r} onRun={(id) => flow.run(id, r)} placement="bottom start" />
  )

  return (
    <Box className="flex flex-col gap-3">
      <Box className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Box className="min-w-0 flex-1">
          <Typography.Heading level={2} className={H2}>
            {title}
          </Typography.Heading>
          {process && (
            <Text tone="muted" truncate className="text-sm">
              {processCaption(process)}
            </Text>
          )}
        </Box>
        {process && (
          <Box className="flex items-center gap-1">
            <KaroSearch
              value={query}
              onChange={setQuery}
              label={START_LABELS.search}
              className="w-56"
            />
            <Refresh pending={loading} onPress={onReload} />
          </Box>
        )}
      </Box>

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
        <ListBox
          aria-label={`${title}: ${processCaption(process)}`}
          onAction={open}
          renderEmptyState={NoData}
          className={cn(LIST, dim(loading))}
        >
          {shown.map((r) => {
            const unread = !isRead(r, readIds)
            return (
              <ListBox.Item
                key={r.id}
                id={r.id}
                textValue={r.template.title}
                className={cn(ITEM, fade(r))}
              >
                <Box className="min-w-0 flex-1">
                  <Text
                    slot="label"
                    data-item-title
                    truncate
                    tone={unread ? 'primary' : 'secondary'}
                    weight={unread ? 'semibold' : undefined}
                    className="text-sm"
                  >
                    {r.template.title}
                  </Text>
                  <Text slot="description" tone="muted" truncate className="text-xs">
                    {r.requester.name} · {r.no}
                  </Text>
                </Box>
                {box.decisions && events(r)}
              </ListBox.Item>
            )
          })}
        </ListBox>
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content
              aria-label={`${title}: ${processCaption(process)}`}
              sortDescriptor={sort ?? undefined}
              onSortChange={setSort}
              onRowAction={open}
            >
              <Table.Header>
                {box.decisions && (
                  <Table.Column
                    id="__events"
                    className={cn(COLUMN, STICKY_START, 'w-px bg-surface-secondary')}
                  >
                    <Text className="sr-only">Olaylar</Text>
                  </Table.Column>
                )}
                {columns.map((c, i) => (
                  <Table.Column
                    key={c.key}
                    id={c.key}
                    isRowHeader={i === 1 || (isDraft && i === 0)}
                    allowsSorting
                    className={COLUMN}
                  >
                    {({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>
                        {c.caption}
                      </Table.SortableColumnHeader>
                    )}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body renderEmptyState={NoData}>
                {shown.map((r) => {
                  const unread = !isRead(r, readIds)
                  return (
                    <Table.Row
                      key={r.id}
                      id={r.id}
                      className={cn('group/row cursor-pointer', fade(r), unread && 'font-semibold')}
                    >
                      {box.decisions && (
                        <Table.Cell className={cn(CELL, STICKY_START, 'w-px')}>
                          {events(r)}
                        </Table.Cell>
                      )}
                      {columns.map((c) => (
                        <Table.Cell
                          key={c.key}
                          className={cn(
                            CELL,
                            'whitespace-nowrap',
                            !unread && 'text-foreground/70',
                            c.key === 'Subject' && 'max-w-64 truncate',
                          )}
                        >
                          <CellValue r={r} col={c} />
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
      {box.decisions && flow.element}
    </Box>
  )
}
