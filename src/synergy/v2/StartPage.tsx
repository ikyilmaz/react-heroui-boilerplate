import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { SortDescriptor } from 'react-aria-components'
import { Button, Card, Chip, Link, ListBox, ScrollShadow, Separator, Spinner, Table, Tabs, ToggleButton, ToggleButtonGroup, Typography, buttonVariants, cn } from '@heroui/react'
import { ArrowUpRight, Moon, MousePointerClick, RefreshCw, Star, Sun } from 'lucide-react'
import { isRead, markRead, togglePin, useBoxCounts, useBoxRequests, useMenuApps, useReadIds } from '@/synergy/shared/decisions'
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
  type ProcessGroup,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { START_LABELS, defaultSortOf, groupCaption, useBriefPending, type GroupSort } from '@/synergy/shared/startLabels'
import { compareBy, readJson, writeJson } from '@/synergy/shared/grid'
import { inline, timeOf } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { START_CRUMB, boxLink, requestLink, useCrumbs, v } from '@/synergy/v2/paths'
import { CellValue, DISPLAY, Empty, FILL, TINT, ACCENT_TEXT, useHero, IC, IconTile, LABEL, PANEL, Search, SortMenu, Tip } from '@/synergy/v2/parts'
import { FastMenu } from '@/synergy/v2/rows'
import { useBentoFlow } from '@/synergy/v2/flow'

/* -------------------------------------------------------------------------------------------------
 * Bento · Başlangıç: 12 sütunlu bento ızgara
 *   Üstte ince, açık tonlu karşılama karosu (karşılama, bekleyen cümlesi, tarih, Yenile).
 *   Altında tek iş kartı: üstte kategori seçicileri (seçili açık tonda, ince birincil çerçeveli),
 *   altında solda Proje / Süreç listesi, sağda seçili sürecin talepleri; aralarında çizgi.
 *   Sağda dikey uygulamalar paneli (Favoriler / Son Kullanılan Uygulamalar). Geniş ekranda sayfa
 *   ekranı doldurur; listeler kartların içinde kayar.
 * ------------------------------------------------------------------------------------------------- */

const SORT_KEY = 'synergy-start-sort-v2'

function validSort(box: WorkBox, s: GroupSort | undefined): GroupSort {
  const ok = s && ['project', 'flow', 'form', 'date', 'count'].includes(s.field) && ['ascending', 'descending'].includes(s.direction)
  return !ok || (s.field === 'form' && box.id !== 'taslaklar') ? defaultSortOf(box.id) : s
}

const dim = (on: boolean) => cn('transition-opacity', on && 'opacity-50')

function Refresh({ pending, onPress, className }: { pending: boolean; onPress: () => void; className?: string }) {
  return (
    <Tip label={START_LABELS.refresh}>
      <Button isIconOnly variant="outline" aria-label={START_LABELS.refresh} isPending={pending} onPress={onPress} className={cn('rounded-full bg-surface', className)}>
        {({ isPending }) => (isPending ? <Spinner size="sm" color="current" /> : <RefreshCw {...IC} />)}
      </Button>
    </Tip>
  )
}

export function BentoStart() {
  const [category, setCategory] = useState<BoxId>('bekleyen')
  const [processId, setProcessId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sorts, setSorts] = useState<Partial<Record<BoxId, GroupSort>>>(() => readJson(SORT_KEY, {}))
  const [refreshing, refreshAll] = useBriefPending()
  const [groupsLoading, reloadGroups] = useBriefPending()

  useCrumbs([{ label: START_CRUMB.label }])

  const box = findBox(category)!
  const sort = validSort(box, sorts[category])
  const requests = useBoxRequests(category)
  const groups = useMemo(() => processGroups(box, requests, { search, sort }), [box, requests, search, sort])
  const selected = groups.find((g) => g.process.id === processId) ?? null
  if (processId && !selected) setProcessId(null)

  const choose = (next: BoxId) => {
    if (next === category) return
    setCategory(next)
    setProcessId(null)
    setSearch('')
  }

  return (
    // Geniş ekranda sayfa ekranı doldurur (üst çubuk ve alttaki dock payı düşülür); uzun listeler kartın içinde kayar
    <Box className="grid grid-cols-1 gap-4 xl:h-[calc(100dvh-var(--chrome,11rem))] xl:min-h-[36rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Box className="flex min-h-0 min-w-0 flex-col gap-4">
        <Hero refreshing={refreshing} onRefresh={refreshAll} />

        {/* İş kartı: kategori seçicileri, süreç listesi ve talepler tek bileşen */}
        <Card className={cn(PANEL, 'min-h-0 min-w-0 flex-1 gap-0 overflow-hidden')}>
          <Categories selected={category} onSelect={choose} />
          <Separator />
          <Box className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
            {/* Sol: süreç listesi */}
            <Box className="flex min-h-0 flex-col border-border max-lg:border-b lg:border-e">
              <Box className="flex flex-col gap-3 px-5 pt-4 pb-3">
                <Box className="flex items-center gap-2">
                  <Box className="me-auto flex min-w-0 flex-col">
                    <Typography.Heading level={2} className={cn(DISPLAY, 'text-base')}>
                      {groupCaption(box.id)}
                    </Typography.Heading>
                    <Text tone="muted" className="text-xs">
                      {box.label}
                    </Text>
                  </Box>
                  <Refresh pending={groupsLoading} onPress={reloadGroups} />
                </Box>
                <Box className="flex items-center gap-2">
                  <Search value={search} onChange={setSearch} label={START_LABELS.search} className="min-w-0 flex-1" />
                  <SortMenu
                    box={box}
                    sort={sort}
                    onSort={(s) => {
                      const all = { ...sorts, [category]: s }
                      setSorts(all)
                      writeJson(SORT_KEY, all)
                    }}
                    className="rounded-full"
                  />
                </Box>
              </Box>
              <ProcessList key={category} box={box} groups={groups} selectedId={selected?.process.id ?? null} onSelect={setProcessId} loading={groupsLoading || refreshing} />
              {SHOW_ALL_BOXES.includes(box.id) && (
                <Box className="px-4 pb-4">
                  <Link href={boxLink(box.id)} className={cn(buttonVariants({ variant: 'secondary' }), 'w-full gap-1.5 rounded-full bg-accent-soft text-accent-soft-foreground no-underline!')}>
                    {START_LABELS.showAll}
                    <ArrowUpRight {...IC} />
                  </Link>
                </Box>
              )}
            </Box>

            {/* Sağ: seçili sürecin talepleri */}
            <Box className="min-h-0 min-w-0 overflow-y-auto">
              {selected ? (
                <ProcessRequests key={`${category}/${selected.process.id}`} box={box} group={selected} />
              ) : (
                <Empty icon={MousePointerClick} text={box.id === 'taslaklar' ? START_LABELS.pickDraft : START_LABELS.pickProcess} className="h-full justify-center py-24" />
              )}
            </Box>
          </Box>
        </Card>
      </Box>
      <AppsTile />
    </Box>
  )
}

/* --- Karşılama karosu (açık ton) --------------------------------------------------------------- */

function Hero({ refreshing, onRefresh }: { refreshing: boolean; onRefresh: () => void }) {
  const now = new Date()
  const counts = useBoxCounts()
  const { text, daytime } = greetingOf(now)
  const Icon = daytime ? Sun : Moon
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const pending = counts.get('bekleyen') ?? 0
  const { hero, glass } = useHero()
  return (
    <Card className={cn('relative flex-row flex-wrap items-center justify-between gap-x-6 gap-y-3 overflow-hidden rounded-3xl px-5 py-4', hero)}>
      <Box className="relative flex min-w-0 flex-col gap-0.5">
        <Typography.Heading level={1} className={cn(DISPLAY, 'text-2xl leading-tight text-current!')}>
          {text}, {CURRENT_USER.firstName}.
        </Typography.Heading>
        <Typography className="text-sm font-medium text-foreground/70!">{pendingSentence(pending)}</Typography>
      </Box>
      <Box className="relative flex items-center gap-2">
        <Chip size="sm" className={cn('gap-1.5 rounded-full px-2.5', glass)}>
          <Icon {...IC} size={14} />
          <Typography {...timeOf(today)} {...inline} className="text-xs font-medium text-current!">
            {formatWeekday(now)}, {formatLongDate(now)}
          </Typography>
        </Chip>
        <Tip label={START_LABELS.refresh}>
          <Button
            isIconOnly
            size="sm"
            aria-label={START_LABELS.refresh}
            isPending={refreshing}
            onPress={onRefresh}
            className={cn('rounded-full data-hovered:bg-surface', glass)}
          >
            {({ isPending }) => (isPending ? <Spinner size="sm" color="current" /> : <RefreshCw {...IC} />)}
          </Button>
        </Tip>
      </Box>
    </Card>
  )
}

/* --- Kategori karoları ------------------------------------------------------------------------- */

function Categories({ selected, onSelect }: { selected: BoxId; onSelect: (b: BoxId) => void }) {
  const counts = useBoxCounts({ unreadInfo: true })
  return (
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
      className="grid w-full grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {mainBoxes.map((b) => {
        const n = counts.get(b.id) ?? 0
        const isSel = b.id === selected
        return (
          <ToggleButton
            key={b.id}
            id={b.id}
            variant="ghost"
            aria-label={`${b.label}, ${n}`}
            className={cn(
              'h-auto w-full min-w-0 items-center justify-start gap-3 rounded-2xl px-3 py-3 text-start transition-colors',
              isSel ? cn(TINT, 'ring-1 ring-accent/35 ring-inset') : 'data-hovered:bg-surface-secondary',
            )}
          >
            <IconTile icon={b.icon} solid={isSel} />
            <Box className="flex min-w-0 flex-1 flex-col">
              <Typography {...inline} className={cn(DISPLAY, 'text-2xl leading-none tabular-nums', isSel ? ACCENT_TEXT : 'text-foreground!')}>
                {n}
              </Typography>
              <Typography {...inline} truncate className="mt-1 text-xs font-medium text-foreground/70!">
                {b.label}
              </Typography>
            </Box>
          </ToggleButton>
        )
      })}
    </ToggleButtonGroup>
  )
}

/* --- Süreç listesi ----------------------------------------------------------------------------- */

function ProcessList({
  box,
  groups,
  selectedId,
  onSelect,
  loading,
}: {
  box: WorkBox
  groups: ProcessGroup[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  loading: boolean
}) {
  const isDraft = box.id === 'taslaklar'
  const countLabel = isDraft ? START_LABELS.draftCount : START_LABELS.requestCount
  return (
    <ListBox
      aria-label={`${box.label}: ${groupCaption(box.id)}`}
      selectionMode="single"
      selectedKeys={selectedId ? [selectedId] : []}
      onSelectionChange={(keys) => {
        const [key] = keys === 'all' ? [] : [...keys]
        onSelect(key == null ? null : String(key))
      }}
      renderEmptyState={() => <Empty text={START_LABELS.noData} className="py-8" />}
      className={cn('max-h-[28rem] min-h-0 flex-1 gap-1 overflow-y-auto px-3 pb-3 xl:max-h-none', dim(loading))}
    >
      {groups.map(({ process: p, count }) => {
        const Icon = p.icon
        return (
          <ListBox.Item
            key={p.id}
            id={p.id}
            textValue={`${processCaption(p)}, ${countLabel} ${count}`}
            className={cn('group gap-3 rounded-2xl px-3 py-2.5', selectedId === p.id ? FILL : 'data-hovered:bg-surface-secondary')}
          >
            <Box className={cn('grid size-9 shrink-0 place-items-center rounded-xl', selectedId === p.id ? 'bg-accent-foreground/15' : 'bg-accent-soft text-accent-soft-foreground')}>
              <Icon {...IC} />
            </Box>
            <Box className="min-w-0 flex-1">
              <Typography {...inline} truncate className="block text-[0.6875rem] text-current! opacity-70">
                {p.project}
              </Typography>
              <Typography {...inline} truncate className="block text-sm font-semibold text-current!">
                {isDraft ? p.form : p.name}
              </Typography>
            </Box>
            <Typography {...inline} className={cn(DISPLAY, 'text-lg text-current! tabular-nums')}>
              {count}
            </Typography>
          </ListBox.Item>
        )
      })}
    </ListBox>
  )
}

function ProcessRequests({ box, group }: { box: WorkBox; group: ProcessGroup }) {
  const navigate = useNavigate()
  const readIds = useReadIds()
  const phone = useMediaQuery('(max-width: 639px)')
  const flow = useBentoFlow(undefined)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortDescriptor | null>(null)
  const [loading, reload] = useBriefPending()
  const isDraft = box.id === 'taslaklar'
  const title = isDraft ? START_LABELS.drafts : START_LABELS.requests
  const columns = useMemo(() => columnsFor(box, group.process), [box, group.process])

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr')
    const found = q
      ? group.requests.filter((r) =>
          columns.some((c) => {
            const val = cellValue(r, c.key)
            return val != null && !(val instanceof Date) && String(val).toLocaleLowerCase('tr').includes(q)
          }),
        )
      : group.requests
    const base = [...found].sort((a, b) => dateOf(b, box).getTime() - dateOf(a, box).getTime())
    if (!sort) return base
    const d = sort.direction === 'descending' ? -1 : 1
    return base.sort((a, b) => d * compareBy(a, b, String(sort.column)))
  }, [group.requests, columns, query, sort, box])

  const open = (key: string | number) => {
    const r = rows.find((x) => x.id === key)
    if (!r) return
    markRead(r.id)
    navigate(requestLink(r), { state: { ids: rows.map((x) => x.id) } satisfies DetailNavState })
  }
  const events = (r: WorkRequest) => <FastMenu request={r} onRun={(id) => flow.run(id, r)} />
  const label = `${title}: ${processCaption(group.process)}`

  return (
    <Box className="flex flex-col">
      <Box className="flex flex-wrap items-center gap-2 px-5 py-3">
        <Box className="me-auto flex min-w-0 flex-col">
          <Typography.Heading level={3} className="text-sm font-semibold">
            {title}
          </Typography.Heading>
          <Text tone="muted" truncate className="text-xs">
            {processCaption(group.process)}
          </Text>
        </Box>
        <Search value={query} onChange={setQuery} label={START_LABELS.search} className="w-52" />
        <Refresh pending={loading} onPress={reload} />
      </Box>
      {phone ? (
        <Box role="list" aria-label={label} className={cn('flex flex-col px-5 pb-3', dim(loading))}>
          {rows.length === 0 && <Empty text={START_LABELS.noData} className="py-8" />}
          {rows.map((r) => {
            const unread = !isRead(r, readIds)
            return (
              <Box key={r.id} role="listitem" className="flex items-center gap-2 border-t border-border py-3">
                <Link href={requestLink(r)} onPress={() => markRead(r.id)} className="min-w-0 flex-1 flex-col items-start text-foreground no-underline">
                  <Text tone={unread ? 'primary' : 'secondary'} truncate data-item-title className={cn('w-full text-sm', unread && 'font-semibold')}>
                    {r.template.title}
                  </Text>
                  <Text tone="muted" truncate className="w-full text-xs">
                    {r.requester.name} · {r.no}
                  </Text>
                </Link>
                {box.decisions && events(r)}
              </Box>
            )
          })}
        </Box>
      ) : (
        <Table variant="secondary" className={cn('rounded-none bg-transparent px-3 pb-3', dim(loading))}>
          <Table.ScrollContainer>
            <Table.Content aria-label={label} sortDescriptor={sort ?? undefined} onSortChange={setSort} onRowAction={open}>
              <Table.Header>
                {columns.map((c, i) => (
                  <Table.Column key={c.key} id={c.key} isRowHeader={i === 1 || (isDraft && i === 0)} allowsSorting className={cn(LABEL, 'bg-surface-secondary whitespace-nowrap after:hidden')}>
                    {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>{c.caption}</Table.SortableColumnHeader>}
                  </Table.Column>
                ))}
                {box.decisions && (
                  <Table.Column id="__events" className="sticky end-0 z-10 w-px bg-surface-secondary after:hidden">
                    <Text className="sr-only">Olaylar</Text>
                  </Table.Column>
                )}
              </Table.Header>
              <Table.Body renderEmptyState={() => <Empty text={START_LABELS.noData} className="py-8" />}>
                {rows.map((r) => {
                  const unread = !isRead(r, readIds)
                  return (
                    <Table.Row key={r.id} id={r.id} className={cn('group/row cursor-pointer', unread && 'font-semibold')}>
                      {columns.map((c) => (
                        <Table.Cell
                          key={c.key}
                          className={cn('h-11 border-b border-border py-1 whitespace-nowrap group-hover/row:bg-surface-secondary', !unread && 'text-foreground/75', c.key === 'Subject' && 'max-w-72 truncate')}
                        >
                          <CellValue r={r} col={c} />
                        </Table.Cell>
                      ))}
                      {box.decisions && <Table.Cell className="sticky end-0 z-10 h-11 w-px border-b border-border bg-surface py-1 group-hover/row:bg-surface-secondary">{events(r)}</Table.Cell>}
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

/* --- Uygulamalar karosu ----------------------------------------------------------------------- */

function AppTile({ app }: { app: MenuApp }) {
  const Icon = app.icon
  const pinLabel = app.pinned ? APPS_LABELS.unpin : APPS_LABELS.pin
  return (
    <Box role="listitem" className="relative flex min-w-0 flex-col items-center gap-2 rounded-2xl p-3 text-center transition-colors hover:bg-surface-secondary">
      {Icon ? (
        <IconTile icon={Icon} solid className="size-11" />
      ) : (
        <Box aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft">
          <Typography {...inline} className="text-xs font-bold text-accent-soft-foreground!">
            {initials(app.caption)}
          </Typography>
        </Box>
      )}
      {/* Bağlantı karoyu kaplar; yıldız sağ üstte, onun üstünde */}
      <Link href={v(app.href)} className="static block w-full min-w-0 truncate text-xs font-medium text-foreground no-underline after:absolute after:inset-0">
        {app.caption}
      </Link>
      <Tip label={pinLabel}>
        <ToggleButton
          isIconOnly
          size="sm"
          variant="ghost"
          isSelected={app.pinned}
          onChange={() => togglePin(app.id)}
          aria-label={`${pinLabel}: ${app.caption}`}
          className="absolute end-1 top-1 z-10 size-7 min-w-7 rounded-full text-muted data-selected:bg-transparent data-selected:text-accent-soft-foreground"
        >
          <Star {...IC} size={13} className={app.pinned ? 'fill-current' : undefined} />
        </ToggleButton>
      </Tip>
    </Box>
  )
}

function AppsTile() {
  const lists = useMenuApps()
  const [tab, setTab] = useState<'favorites' | 'recent'>('favorites')
  const ids = ['favorites', 'recent'] as const
  return (
    // Sağda dikey panel: sayfa boyunca uzanır, kendi içinde kayar
    <Card className={cn(PANEL, 'min-h-0 min-w-0 gap-0 p-4')}>
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(key as typeof tab)} className="min-h-0 flex-1 gap-3">
        <Tabs.ListContainer>
          <Tabs.List aria-label={`${APPS_LABELS.favorites} / ${APPS_LABELS.recent}`} className="w-full rounded-full">
            {ids.map((id) => (
              <Tabs.Tab key={id} id={id} className="flex-1 rounded-full px-3 text-xs leading-tight font-semibold data-[selected=true]:text-accent-foreground">
                <Tabs.Indicator className={cn('rounded-full', FILL)} />
                {APPS_LABELS[id]}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {ids.map((id) => (
          <Tabs.Panel key={id} id={id} className="mt-0 min-h-0 flex-1 overflow-y-auto p-0">
            {lists[id].length === 0 ? (
              <Empty text="Kullanılabilir öğe yok." className="py-6" />
            ) : (
              <ScrollShadow hideScrollBar className="h-full overflow-y-auto">
                <Box role="list" aria-label={APPS_LABELS[id]} className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-1">
                  {lists[id].map((a) => (
                    <AppTile key={a.id} app={a} />
                  ))}
                </Box>
              </ScrollShadow>
            )}
          </Tabs.Panel>
        ))}
      </Tabs>
    </Card>
  )
}
