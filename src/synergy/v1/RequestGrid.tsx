import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { SortDescriptor } from 'react-aria-components'
import { Button, Card, Table, Typography, cn } from '@heroui/react'
import { FilterX } from 'lucide-react'
import {
  deleteDraft,
  isRead,
  markRead,
  useBoxRequests,
  useReadIds,
} from '@/synergy/shared/decisions'
import { useRemembered } from '@/synergy/shared/remembered'
import {
  DELETE_CONFIRM,
  columnsFor,
  dateBucket,
  dateBuckets,
  dateOf,
  groupByDate,
  inRange,
  boxProcessCaption,
  type Box as WorkBox,
  type DateRange,
  type DetailNavState,
  type Process,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { card } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { requestLink } from '@/synergy/v1/paths'
import { CellValue, EmptyNote, IC, KaroSearch, Tip, compareBy } from '@/synergy/v1/parts'
import { DeleteButton, FastMenu } from '@/synergy/v1/rows'
import { KaroConfirm, useKaroFlow } from '@/synergy/v1/flow'
import { useLeaving } from '@/synergy/v1/motion'
import { searchText } from '@/synergy/shared/grid'
import {
  CardGroup,
  CardList,
  GRID_CELL,
  GRID_CONTENT,
  GRID_GROUP_ROW,
  GRID_HEAD,
  GRID_LEAD,
  GRID_ROW,
  GridCard,
  GridFooter,
  GroupLabel,
  ViewSwitch,
  useGridView,
} from '@/synergy/v1/DataGrid'

/*
 * Talep ızgarası (orijinal wfProcessList). Sütunlar süreçten; satırlar tarih gruplarına ayrılır.
 * Sütun başlığıyla sıralama, okunmamışlar kalın, açınca okundu; arama / sıralama / sayfa kutu +
 * süreç başına hatırlanır. Bekleyen Onaylar'da "Olaylar", Taslaklar'da "Sil". Tablo ya da kart
 * görünümü (DataGrid.tsx); seçim tüm iş akışı ızgaralarında ortak.
 */

const PAGE_SIZES = [10, 20, 30, 50] as const
const CLEAR_FILTERS = 'Filtreleri Temizle' // 100918

interface GridState {
  search: string
  sort: SortDescriptor | null
  page: number
  pageSize: number
}

export function RequestGrid({
  box,
  process,
  range,
}: {
  box: WorkBox
  process: Process
  range?: DateRange
}) {
  const navigate = useNavigate()
  const all = useBoxRequests(box.id)
  const readIds = useReadIds()
  const columns = useMemo(() => columnsFor(box, process), [box, process])
  const [grid, setGrid] = useRemembered<GridState>(`karo:grid:${box.id}/${process.id}`, () => ({
    search: '',
    sort: null,
    page: 1,
    pageSize: 10,
  }))
  const [deleting, setDeleting] = useState<WorkRequest | null>(null)
  const flow = useKaroFlow(undefined)
  const [view, setView] = useGridView('workflow')

  const dateCol = columns.find((c) => c.type === 'datetime')?.key
  const byDateAsc = grid.sort?.column === dateCol && grid.sort?.direction === 'ascending'
  const rows = useMemo(() => {
    const q = grid.search.trim().toLocaleLowerCase('tr')
    const own = all.filter(
      (r) =>
        r.processId === process.id &&
        inRange(dateOf(r, box), range) &&
        (!q || searchText(r, columns).includes(q)),
    )
    const bucketIndex = (r: WorkRequest) =>
      dateBuckets.findIndex((b) => b.id === dateBucket(dateOf(r, box)))
    return own.sort((a, b) => {
      const g = bucketIndex(a) - bucketIndex(b)
      if (g) return byDateAsc ? -g : g
      if (grid.sort) {
        const d = compareBy(a, b, String(grid.sort.column))
        return grid.sort.direction === 'ascending' ? d : -d
      }
      return dateOf(b, box).getTime() - dateOf(a, box).getTime()
    })
  }, [all, process, box, range, grid.search, grid.sort, columns, byDateAsc])

  // Karar / silme ile düşen satır yerinde kalıp sağa kayarak çıkar
  const [kept, leaving] = useLeaving(rows)
  const pageCount = Math.max(1, Math.ceil(rows.length / grid.pageSize))
  const page = Math.min(grid.page, pageCount)
  const from = (page - 1) * grid.pageSize
  const pageRows = kept.slice(from, page * grid.pageSize + (kept.length - rows.length))
  const groups = groupByDate(pageRows, (r) => dateOf(r, box))
  if (byDateAsc) groups.reverse()

  const set = (patch: Partial<GridState>) => setGrid((g) => ({ ...g, ...patch }))
  const open = (r: WorkRequest) => {
    markRead(r.id)
    navigate(requestLink(r), { state: { ids: rows.map((x) => x.id) } satisfies DetailNavState })
  }
  const hasFilters = !!grid.search || !!grid.sort
  const rowHeader = box.draftDelete ? 'flowCaption' : 'Subject'
  const hasActions = box.decisions || box.draftDelete
  const span = columns.length + (hasActions ? 1 : 0)
  const actionsHead = hasActions && (
    <Table.Column key="__actions" id="__actions" className={cn(GRID_HEAD, 'w-px')}>
      <Text className="sr-only">İşlemler</Text>
    </Table.Column>
  )
  const actions = (r: WorkRequest) => (
    <>
      {box.decisions && <FastMenu request={r} onRun={(id) => flow.run(id, r)} />}
      {box.draftDelete && <DeleteButton title={r.template.title} onPress={() => setDeleting(r)} />}
    </>
  )
  // Kartta: numara üstte, durum rozet, tarih altta; kalan sütunlar alan
  const lead = columns.find((c) => c.key === rowHeader)
  const noCol = columns.find((c) => c.key === 'ProcessId')
  const statusCol = columns.find((c) => c.type === 'status')
  const dateColumn = columns.find((c) => c.type === 'datetime')
  const rest = columns.filter((c) => ![lead, noCol, statusCol, dateColumn].includes(c))
  const label = boxProcessCaption(box, process)

  return (
    <Card className={cn('gap-4 p-5 lg:min-h-0 lg:flex-1', card)}>
      <Box className="flex shrink-0 flex-wrap items-center gap-2">
        {/* `min-w-48`: telefonda araçların yanında tek harfe ("S") sıkışıyordu; sığmazsa alt satıra iner */}
        <Typography.Heading level={2} truncate className="min-w-48 flex-1 font-display text-lg">
          {label}
        </Typography.Heading>
        <KaroSearch
          value={grid.search}
          onChange={(search) => set({ search, page: 1 })}
          className="w-64"
        />
        <Tip label={CLEAR_FILTERS}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={CLEAR_FILTERS}
            isDisabled={!hasFilters}
            onPress={() => set({ search: '', sort: null, page: 1 })}
          >
            <FilterX {...IC} />
          </Button>
        </Tip>
        <ViewSwitch view={view} onChange={setView} />
      </Box>

      {view === 'cards' ? (
        // Kart görünümü: tarih grupları başlıklı kart ızgaraları; geniş ekranda kendi içinde kayar
        <CardList className="lg:min-h-0 lg:flex-1">
          {groups.length === 0 && <EmptyNote text="Gösterilecek veri yok." />}
          {groups.map(({ bucket, rows: items }) => (
            <CardGroup key={bucket.id} label={bucket.label} count={items.length} listLabel={label}>
              {items.map((r) => (
                <GridCard
                  key={r.id}
                  onOpen={() => open(r)}
                  strong={!isRead(r, readIds)}
                  className={leaving(r.id) || undefined}
                  title={lead ? <CellValue r={r} col={lead} /> : r.template.title}
                  eyebrow={noCol && <CellValue r={r} col={noCol} />}
                  badge={statusCol && <CellValue r={r} col={statusCol} />}
                  footer={dateColumn && <CellValue r={r} col={dateColumn} />}
                  fields={rest.map((c) => ({
                    label: c.caption,
                    value: <CellValue r={r} col={c} />,
                  }))}
                  actions={hasActions ? actions(r) : undefined}
                />
              ))}
            </CardGroup>
          ))}
        </CardList>
      ) : (
        // Geniş ekranda tablo kalan yüksekliği doldurur ve içinde kayar; başlık satırı üstte kalır
        <Table variant="secondary" className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <Table.ScrollContainer className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            <Table.Content
              aria-label={label}
              className={GRID_CONTENT}
              sortDescriptor={grid.sort ?? undefined}
              onSortChange={(sort) => set({ sort, page: 1 })}
            >
              <Table.Header className="sticky top-0 z-10">
                {[
                  ...columns.map((c) => (
                    <Table.Column
                      key={c.key}
                      id={c.key}
                      allowsSorting
                      isRowHeader={c.key === rowHeader}
                      className={GRID_HEAD}
                    >
                      {({ sortDirection }) => (
                        <Table.SortableColumnHeader sortDirection={sortDirection}>
                          {c.caption}
                        </Table.SortableColumnHeader>
                      )}
                    </Table.Column>
                  )),
                  ...(actionsHead ? [actionsHead] : []),
                ]}
              </Table.Header>
              <Table.Body renderEmptyState={() => <EmptyNote text="Gösterilecek veri yok." />}>
                {groups.flatMap(({ bucket, rows: items }) => [
                  <Table.Row
                    key={`g-${bucket.id}`}
                    id={`g-${bucket.id}`}
                    className={GRID_GROUP_ROW}
                  >
                    <Table.Cell colSpan={span}>
                      <GroupLabel label={bucket.label} count={items.length} />
                    </Table.Cell>
                  </Table.Row>,
                  ...items.map((r) => {
                    const unread = !isRead(r, readIds)
                    return (
                      <Table.Row
                        key={r.id}
                        id={r.id}
                        onAction={() => open(r)}
                        className={cn(GRID_ROW, leaving(r.id), unread && 'font-semibold')}
                      >
                        {[
                          ...columns.map((c) => (
                            <Table.Cell
                              key={c.key}
                              className={cn(
                                c.key === rowHeader ? GRID_LEAD : GRID_CELL,
                                unread && 'text-foreground',
                              )}
                            >
                              <CellValue r={r} col={c} />
                            </Table.Cell>
                          )),
                          ...(hasActions
                            ? [
                                <Table.Cell key="__actions" className="w-px">
                                  {actions(r)}
                                </Table.Cell>,
                              ]
                            : []),
                        ]}
                      </Table.Row>
                    )
                  }),
                ])}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      {rows.length > 0 && (
        <GridFooter
          page={page}
          pageCount={pageCount}
          from={from}
          shown={Math.min(pageRows.length, rows.length - from)}
          total={rows.length}
          pageSize={grid.pageSize}
          sizes={PAGE_SIZES}
          onPage={(p) => set({ page: p })}
          onPageSize={(pageSize) => set({ pageSize, page: 1 })}
        />
      )}

      {box.decisions && flow.element}
      {box.draftDelete && (
        <KaroConfirm
          isOpen={deleting !== null}
          tone="danger"
          message={DELETE_CONFIRM}
          onNo={() => setDeleting(null)}
          onYes={() => {
            if (deleting) deleteDraft(deleting.id)
            setDeleting(null)
          }}
        />
      )}
    </Card>
  )
}
