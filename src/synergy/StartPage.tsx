import {
  useEffect,
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
  Divider,
  Flex,
  Segmented,
  Select,
  Skeleton,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd'
import type { SortOrder } from 'antd/es/table/interface'
import { ExternalLink, History, MousePointerClick, Moon, RefreshCw, Star, Sun } from 'lucide-react'
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
import { boxLink, k, requestLink, useFrame } from '@/synergy/paths'
import {
  useBand,
  CellValue,
  EmptyNote,
  SearchField,
  SortMenu,
  compareBy,
} from '@/synergy/ant/parts'
import { CARD, IC, MotionFlex, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { GRID_ROW, GRID_TABLE } from '@/synergy/ant/grid'
import { Count, Indicator } from '@/synergy/ant/motion'
import { FastMenu } from '@/synergy/rows'
import { useFlow } from '@/synergy/flow'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { AnimatePresence } from 'framer-motion'
import { useLeaving, useTransition } from '@/synergy/motion'
import { Dashboard } from '@/synergy/dashboard/Dashboard'
import type { WidgetSize } from '@/synergy/dashboard/model'
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
 * Kategori sekmesi (Chrome sekmeleri gibi): seçili sekme iş bloğuyla aynı yüzeyde, alttan ona
 * kaynaşır; diğerleri zeminde saydam, üzerine gelince soluk. Birincil renk ikon ve sayıda.
 */
const CATEGORY =
  'relative h-16 w-full min-w-0 justify-start gap-2 overflow-hidden rounded-t-2xl rounded-b-none px-5 shadow-none'

/**
 * Seçili sekme (Chrome sekmeleri gibi): yüzey renginde, yanlarda ve üstte kartın konturu
 * (`--border-width`); alt köşelerde zeminden oyulmuş içbükey kavisler. Kontur kavis boyunca
 * kartın üst çizgisine kesintisiz bağlanır: kavis halkasının orta çizgisi 1rem yarıçaplı, bir ucu
 * sekmenin kenar çizgisinin, öbür ucu kartın halkasının (kartın dışında, `ring`) tam üstünde. Halka
 * zemin rengi üstüne çizilir (alttaki kart halkasıyla üst üste binip koyulaşmasın); halkanın dışı
 * yüzey (kartla kaynaşır), içi saydam. Sekmenin dolgusu çerçevenin altına girmez (`bg-clip-padding`):
 * yarı saydam çizgi kartınki gibi zeminin üstünde durur. `--fa` / `--fb` halkanın iç / dış yarıçapı.
 */
const TAB =
  'rounded-t-2xl rounded-b-none bg-surface bg-clip-padding border-x-(length:--border-width) border-t-(length:--border-width) [--fa:calc(1rem_-_var(--border-width)/2)] [--fb:calc(1rem_+_var(--border-width)/2)]'
// Sabit metin (Tailwind görsün): üstte halka (`--border`), altında zemin + dışında yüzey
const FLARE_L =
  "before:absolute before:bottom-0 before:start-[calc(var(--border-width)/2_-_1rem)] before:size-(--fb) before:bg-[radial-gradient(circle_at_0_0,transparent_var(--fa),var(--border)_var(--fa),var(--border)_var(--fb),transparent_var(--fb)),radial-gradient(circle_at_0_0,transparent_var(--fa),var(--background)_var(--fa),var(--background)_var(--fb),var(--surface)_var(--fb))] before:content-['']"
const FLARE_R =
  "after:absolute after:bottom-0 after:end-[calc(var(--border-width)/2_-_1rem)] after:size-(--fb) after:bg-[radial-gradient(circle_at_100%_0,transparent_var(--fa),var(--border)_var(--fa),var(--border)_var(--fb),transparent_var(--fb)),radial-gradient(circle_at_100%_0,transparent_var(--fa),var(--background)_var(--fa),var(--background)_var(--fb),var(--surface)_var(--fb))] after:content-['']"

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
function SkeletonRows({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <Flex vertical gap={8} aria-hidden className={className}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton.Button
          key={i}
          active
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
  useFrame([{ label: 'Başlangıç' }])
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
        }
      }}
    />
  )
}

/** İş Akışları widget'ı: kategori sekmeleri ve altında süreç grupları ↔ talepler (hücreyi doldurur). */
function WorkBlock({ refreshing }: { refreshing: boolean }) {
  const [category, setCategory] = useState<BoxId>('bekleyen')
  const [processId, setProcessId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState<Partial<Record<BoxId, GroupSort>>>(() =>
    readJson(SORT_KEY, {}),
  )
  const [groupsLoading, reloadGroups] = useBriefPending()
  const [requestsLoading, reloadRequests] = useBriefPending()

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
    <Flex vertical className="h-full min-h-0">
      <Categories selected={category} onSelect={choose} />
      {/* İş bloğu: seçili sekmenin devamı; hücrenin kalanını doldurur, sütunlar içeride kayar */}
      <Card
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
            ellipsis
            className="m-0! min-w-0 flex-1 font-display text-lg font-bold text-current!"
          >
            {text}, {CURRENT_USER.firstName}.
          </Title>
        </Flex>
        <Paragraph ellipsis className="m-0! text-xs text-current! opacity-85">
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
          ellipsis
          className={cn(
            'm-0! min-w-0 flex-1 font-display font-bold text-current!',
            small ? 'text-xl' : 'text-2xl sm:text-3xl',
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

function AppTile({ app, fill = false }: { app: MenuApp; fill?: boolean }) {
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
            'absolute! end-1 top-1 z-10 size-6 min-w-6',
            app.pinned ? 'text-accent-soft-foreground!' : 'text-muted!',
          )}
        />
      </Tip>
      <Avatar
        aria-hidden
        size={fill ? 48 : 40}
        icon={Icon ? <Icon {...IC_BLOCK} size={fill ? 22 : 18} /> : undefined}
        className={cn(
          'inline-flex! shrink-0 items-center justify-center text-sm font-semibold transition-transform duration-200 group-hover/app:scale-110',
          Icon
            ? 'bg-surface-tertiary! text-foreground!'
            : 'bg-accent-soft! text-accent-soft-foreground!',
        )}
      >
        {Icon ? undefined : initials(app.caption)}
      </Avatar>
      <Link
        to={k(app.href)}
        className={cn(
          'static block w-full min-w-0 truncate text-center text-foreground no-underline hover:text-foreground hover:no-underline after:absolute after:inset-0',
          fill ? 'text-sm' : 'text-xs',
        )}
      >
        {app.caption}
      </Link>
    </Flex>
  )
}

/**
 * Favoriler / Son Kullanılan Uygulamalar: boyuta göre yatay şerit (yatay, tam genişlik; sekmeler
 * solda ikon), iki sütunlu karolar (dikey, sütun; sekmeler tam genişlik) ya da kare ızgara (kare). İçerik hücrede kayar.
 */
/** Yan sekme ikonları (yatay boyut). */
const TAB_ICONS = { favorites: Star, recent: History } as const

/** Sekme seçicinin görünümü: seçili sekme yüzeyde, birincil tonda ince halkalı. */
const TABS =
  'shrink-0 [&_.ant-segmented-item-selected]:font-semibold [&_.ant-segmented-item-selected]:text-accent-soft-foreground [&_.ant-segmented-item-selected]:bg-surface [&_.ant-segmented-item-selected]:ring-2 [&_.ant-segmented-item-selected]:ring-inset [&_.ant-segmented-item-selected]:ring-accent-soft-foreground/40 [&_.ant-segmented-thumb]:bg-surface [&_.ant-segmented-thumb]:ring-2 [&_.ant-segmented-thumb]:ring-inset [&_.ant-segmented-thumb]:ring-accent-soft-foreground/40 [&_.ant-segmented-item-label]:whitespace-nowrap'

function AppsBlock({ size }: { size: WidgetSize }) {
  // Dikey ve sütun: sekmeler tam genişlik, uygulamalar iki sütunlu karolar
  const vertical = size.id === 'tall' || size.id === 'column'
  const square = size.id === 'square'
  // Yatay boyutlarda sekmeler solda, alt alta, yalnızca ikon (şerit kalan genişliği kullanır)
  const side = !vertical && !square
  const lists = useMenuApps()
  const transition = useTransition()
  const [tab, setTab] = useState<'favorites' | 'recent'>('favorites')
  const ids = ['favorites', 'recent'] as const
  return (
    <Card
      className={cn(CARD, 'h-full min-h-0')}
      classNames={{ body: 'flex h-full min-h-0 flex-col p-4' }}
    >
      <Flex
        vertical={!side}
        gap={side ? 12 : 8}
        className={cn('min-h-0 flex-1', side && 'items-stretch')}
      >
        {/* Yanda: tam boy dikey düğme grubu, iki sekme yüksekliği eşit paylaşır */}
        <Segmented<'favorites' | 'recent'>
          aria-label={`${APPS_LABELS.favorites} / ${APPS_LABELS.recent}`}
          value={tab}
          onChange={setTab}
          vertical={side}
          block={vertical}
          className={cn(
            TABS,
            side
              ? 'h-full self-stretch [&_.ant-segmented-group]:h-full [&_.ant-segmented-item]:flex [&_.ant-segmented-item]:w-11 [&_.ant-segmented-item]:flex-1 [&_.ant-segmented-item]:items-center [&_.ant-segmented-item]:justify-center [&_.ant-segmented-item-label]:px-0'
              : vertical
                ? 'w-full'
                : 'self-start',
          )}
          options={ids.map((id) => {
            const Icon = TAB_ICONS[id]
            return {
              value: id,
              label: side ? (
                // Yan sekmede yalnızca ikon; ad ipucunda (sekmenin üzerine gelince) ve ekran okuyucuda
                <Tip label={APPS_LABELS[id]} placement="left">
                  <Flex align="center" justify="center" className="h-full w-11">
                    <Icon {...IC} size={17} />
                    <Text className="sr-only">{APPS_LABELS[id]}</Text>
                  </Flex>
                </Tip>
              ) : (
                APPS_LABELS[id]
              ),
            }
          })}
        />
        <Flex
          key={tab}
          vertical
          role="tabpanel"
          aria-label={APPS_LABELS[tab]}
          className="min-h-0 min-w-0 flex-1"
        >
          {lists[tab].length === 0 ? (
            <EmptyNote text="Kullanılabilir öğe yok." className="py-3" />
          ) : vertical || square ? (
            // Dikey liste ya da kare ızgara; hücrede aşağı kayar
            <Scroll className="h-full">
              <Flex
                role="list"
                aria-label={APPS_LABELS[tab]}
                className={cn('grid gap-1.5', vertical ? 'grid-cols-2' : 'grid-cols-3')}
              >
                {lists[tab].map((a) => (
                  <Flex key={a.id} role="listitem" className="block min-w-0">
                    <AppTile app={a} fill={vertical} />
                  </Flex>
                ))}
              </Flex>
            </Scroll>
          ) : (
            <Scroll horizontal className={cn('[scrollbar-width:none]', side && 'h-full')}>
              {/* Favoriye eklenen / çıkarılan karo yerine süzülür, diğerleri kayarak yer açar */}
              <Flex
                role="list"
                aria-label={APPS_LABELS[tab]}
                className={cn(
                  'grid grid-flow-col gap-1',
                  // Yanda karolar hücrenin yüksekliğini doldurur
                  side ? 'h-full auto-cols-[9rem] gap-2' : 'auto-cols-[8rem]',
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {lists[tab].map((a) => (
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
                      <AppTile app={a} fill={side} />
                    </MotionFlex>
                  ))}
                </AnimatePresence>
              </Flex>
            </Scroll>
          )}
        </Flex>
      </Flex>
    </Card>
  )
}

/* --- Satır 2: kategori blokları ---------------------------------------------------------------- */

function Categories({ selected, onSelect }: { selected: BoxId; onSelect: (b: BoxId) => void }) {
  const counts = useBoxCounts({ unreadInfo: true })
  return (
    <Scroll horizontal className="shrink-0 [scrollbar-width:none]">
      <Flex
        role="group"
        aria-label={START_LABELS.categories}
        align="stretch"
        gap={4}
        // İçeri girme payı = kartın köşe yarıçapı (kart: en çok 32px) + kavis (1rem): seçili
        // sekmenin kavisi her temada kartın düz kenarına oturur (boşluk ölçeğine bağlı değil)
        className="w-full min-w-184 px-[calc(min(32px,var(--radius)*3)+1rem)]"
      >
        {mainBoxes.map((b) => {
          const Icon = b.icon
          const isSel = b.id === selected
          const n = counts.get(b.id) ?? 0
          return (
            <Flex key={b.id} className={cn('relative grid min-w-0 grow basis-0', isSel && 'z-10')}>
              {/* Seçili sekme (yüzey, kontur, içbükey kavisler) sekmeden sekmeye kayar */}
              {isSel && <Indicator id="start-category" className={cn(TAB, FLARE_L, FLARE_R)} />}
              <Button
                type="text"
                aria-pressed={isSel}
                aria-label={`${b.label}, ${n}`}
                onClick={() => onSelect(b.id)}
                className={cn(
                  CATEGORY,
                  isSel ? 'text-foreground hover:bg-transparent!' : 'text-foreground/70',
                )}
              >
                {/* 1280px altında etiket sığmıyor ("Bekle…"); orada ikon + sayı, ad aria-label'da */}
                <Text
                  ellipsis
                  className={cn(
                    'hidden min-w-0 xl:block',
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
            </Flex>
          )
        })}
      </Flex>
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
    <Flex
      // Hücrenin kalanını doldurur; iki sütun kendi içinde kayar (zemin kartın kendisi)
      className="flex min-h-0 flex-1 flex-col text-foreground lg:flex-row"
      style={{ '--split': `${split}%` } as CSSProperties}
    >
      {/* Sol sütun iş bloğunun tüm yüksekliğini alır (süreç listesi en alta kadar uzar) */}
      <Flex vertical className="min-h-0 overflow-y-auto p-5 lg:w-(--split) lg:shrink-0">
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
        className="hidden w-3 cursor-col-resize justify-center py-5 outline-none focus-visible:bg-accent-soft lg:flex"
      >
        <Divider orientation="vertical" className="m-0 h-full" />
      </Flex>
      <Divider className="m-0 lg:hidden" />
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
        <Title level={2} className={cn(H2, 'me-auto')}>
          {caption}
        </Title>
        <SortMenu box={box} sort={sort} onSort={onSort} />
        <Refresh pending={loading} onPress={onReload} />
        {SHOW_ALL_BOXES.includes(box.id) && (
          // Yalnızca ikon; ad ipucunda ve erişilebilir adda
          <Tip label={START_LABELS.showAll}>
            <Link
              to={boxLink(box.id)}
              aria-label={START_LABELS.showAll}
              className="inline-grid size-9 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground transition-colors hover:bg-accent/20 hover:text-accent-soft-foreground focus-visible:outline-2 focus-visible:outline-focus"
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
        <Flex className="relative min-h-[26rem] flex-1 lg:min-h-48">
          <Scroll className="absolute inset-0">
            <Flex vertical role="listbox" aria-label={label} className="-mx-1">
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
                      <Text ellipsis className="text-xs text-current! opacity-65">
                        {p.project}
                      </Text>
                      <Text ellipsis className="text-sm font-medium text-current!">
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
    <Flex vertical gap={12}>
      <Flex wrap align="center" className="gap-x-3 gap-y-2">
        <Flex vertical className="min-w-0 flex-1">
          <Title level={2} className={H2}>
            {title}
          </Title>
          {process && (
            <Text type="secondary" ellipsis className="text-sm">
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
                      ellipsis
                      type={unread ? undefined : 'secondary'}
                      className={cn('text-sm', unread && 'font-semibold')}
                    >
                      {r.template.title}
                    </Text>
                    <Text type="secondary" ellipsis className="text-xs">
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
            onRow={(r) => ({ onClick: () => open(r.id), onKeyDown: openOnEnter(r), tabIndex: 0 })}
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
