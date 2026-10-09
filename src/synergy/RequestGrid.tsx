import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Card, Flex, Table, Typography, type TableColumnsType } from 'antd'
import type { SortOrder } from 'antd/es/table/interface'
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
import { requestLink } from '@/synergy/paths'
import { DeleteButton, FastMenu, OpenTabButton } from '@/synergy/rows'
import { useScreen } from '@/synergy/tabs/context'
import { ConfirmDialog, useFlow } from '@/synergy/flow'
import { useLeaving } from '@/synergy/motion'
import { searchText } from '@/synergy/shared/grid'
import { CARD, IC, Tip, cn } from '@/synergy/ant/ui'
import { CellValue, EmptyNote, GroupLabel, SearchField, compareBy } from '@/synergy/ant/parts'
import {
  CardGroup,
  CardList,
  GRID_CELL,
  GRID_GROUP_ROW,
  GRID_LEAD,
  GRID_ROW,
  GRID_TABLE,
  GridCard,
  GridFooter,
  ViewSwitch,
  useGridView,
} from '@/synergy/ant/grid'

/*
 * Talep ızgarası (orijinal wfProcessList). Sütunlar süreçten; satırlar tarih gruplarına ayrılır.
 * Sütun başlığıyla sıralama, okunmamışlar kalın, açınca okundu; arama / sıralama / sayfa kutu +
 * süreç başına hatırlanır. Bekleyen Onaylar'da "Olaylar", Taslaklar'da "Sil". Tablo ya da kart
 * görünümü (`ant/grid.tsx`); seçim tüm iş akışı ızgaralarında ortak. antd `Table`: tarih grubu
 * başlıkları tüm satırı kaplayan ayrı satırlar; sıralama denetimli (antd kendisi sıralamaz).
 */

const PAGE_SIZES = [10, 20, 30, 50] as const
const CLEAR_FILTERS = 'Filtreleri Temizle' // 100918

interface GridSort {
  column: string
  direction: 'ascending' | 'descending'
}

interface GridState {
  search: string
  sort: GridSort | null
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
  const screen = useScreen()
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
  const flow = useFlow(undefined)
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
  // Yeni sekmede (ya da sağ tık / Ctrl / Cmd / orta tıkla): talep kendi sekmesinde
  const own = (r: WorkRequest) => `/talepler/${r.id}`
  const openTab = (r: WorkRequest) =>
    screen?.open(own(r), 'tab', { ids: rows.map((x) => x.id) } satisfies DetailNavState)
  const hasFilters = !!grid.search || !!grid.sort
  const rowHeader = box.draftDelete ? 'flowCaption' : 'Subject'
  const hasActions = !!screen || box.decisions || box.draftDelete
  const span = columns.length + (hasActions ? 1 : 0)
  // Eylemler tek satırda (dar sütunda alt alta binmesin)
  const actions = (r: WorkRequest) => (
    <Flex align="center" className="flex-nowrap justify-end">
      {screen && <OpenTabButton title={r.template.title} onPress={() => openTab(r)} />}
      {box.decisions && <FastMenu request={r} onRun={(id) => flow.run(id, r)} />}
      {box.draftDelete && <DeleteButton title={r.template.title} onPress={() => setDeleting(r)} />}
    </Flex>
  )
  // Kartta: numara üstte, durum rozet, tarih altta; kalan sütunlar alan
  const lead = columns.find((c) => c.key === rowHeader)
  const noCol = columns.find((c) => c.key === 'ProcessId')
  const statusCol = columns.find((c) => c.type === 'status')
  const dateColumn = columns.find((c) => c.type === 'datetime')
  const rest = columns.filter((c) => ![lead, noCol, statusCol, dateColumn].includes(c))
  const label = boxProcessCaption(box, process)

  // Tablo satırları: tarih grubu başlığı + o grubun talepleri
  const data: GridRow[] = groups.flatMap(({ bucket, rows: items }) => [
    { key: `g-${bucket.id}`, group: { label: bucket.label, count: items.length } },
    ...items.map((r) => ({ key: r.id, r })),
  ])
  // Grup satırında ilk hücre tüm satırı kaplar, diğerleri çizilmez
  const groupCell = (row: GridRow, first: boolean) =>
    row.group ? { colSpan: first ? span : 0 } : {}
  const order = (key: string): SortOrder =>
    grid.sort?.column === key ? (grid.sort.direction === 'ascending' ? 'ascend' : 'descend') : null
  const tableColumns: TableColumnsType<GridRow> = [
    ...columns.map((c, i) => ({
      key: c.key,
      dataIndex: c.key,
      title: c.caption,
      sorter: true,
      sortOrder: order(c.key),
      showSorterTooltip: false,
      className: c.key === rowHeader ? GRID_LEAD : GRID_CELL,
      onCell: (row: GridRow) => groupCell(row, i === 0),
      render: (_: unknown, row: GridRow) =>
        row.group ? (
          <GroupLabel label={row.group.label} count={row.group.count} />
        ) : (
          <CellValue r={row.r!} col={c} />
        ),
    })),
    ...(hasActions
      ? [
          {
            key: '__actions',
            title: <Typography.Text className="sr-only">İşlemler</Typography.Text>,
            width: 1,
            onCell: (row: GridRow) => groupCell(row, false),
            render: (_: unknown, row: GridRow) => row.r && actions(row.r),
          },
        ]
      : []),
  ]

  return (
    <Card
      className={cn(CARD, '@4xl:flex @4xl:min-h-0 @4xl:flex-1 @4xl:flex-col')}
      classNames={{ body: 'flex flex-col gap-4 p-5 @4xl:min-h-0 @4xl:flex-1' }}
    >
      <Flex wrap align="center" gap={8} className="shrink-0">
        {/* `min-w-48`: telefonda araçların yanında tek harfe ("S") sıkışıyordu; sığmazsa alt satıra iner */}
        <Typography.Title level={2} ellipsis className="m-0 min-w-48 flex-1 font-display text-lg">
          {label}
        </Typography.Title>
        <SearchField
          value={grid.search}
          onChange={(search) => set({ search, page: 1 })}
          className="w-64"
        />
        <Tip label={CLEAR_FILTERS}>
          <Button
            type="text"
            aria-label={CLEAR_FILTERS}
            icon={<FilterX {...IC} />}
            disabled={!hasFilters}
            onClick={() => set({ search: '', sort: null, page: 1 })}
          />
        </Tip>
        <ViewSwitch view={view} onChange={setView} />
      </Flex>

      {view === 'cards' ? (
        // Kart görünümü: tarih grupları başlıklı kart ızgaraları; geniş ekranda kendi içinde kayar
        <CardList className="@4xl:min-h-0 @4xl:flex-1">
          {groups.length === 0 && <EmptyNote text="Gösterilecek veri yok." />}
          {groups.map(({ bucket, rows: items }) => (
            <CardGroup key={bucket.id} label={bucket.label} count={items.length} listLabel={label}>
              {items.map((r) => (
                <GridCard
                  key={r.id}
                  onOpen={() => open(r)}
                  openPath={own(r)}
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
        // Geniş ekranda tablo kalan yüksekliği doldurur ve kabın içinde kayar; başlık satırı üstte kalır
        <Flex vertical className="overflow-auto @4xl:min-h-0 @4xl:flex-1">
          <Table<GridRow>
            aria-label={label}
            size="middle"
            pagination={false}
            columns={tableColumns}
            dataSource={data}
            className={GRID_TABLE}
            locale={{ emptyText: <EmptyNote text="Gösterilecek veri yok." /> }}
            rowClassName={(row) =>
              row.group
                ? GRID_GROUP_ROW
                : (cn(
                    GRID_ROW,
                    'group/row',
                    leaving(row.key),
                    !isRead(row.r!, readIds) && 'font-semibold',
                  ) ?? '')
            }
            onRow={(row) =>
              row.r
                ? {
                    'data-open-path': own(row.r),
                    onClick: () => open(row.r!),
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' && e.target === e.currentTarget) open(row.r!)
                    },
                    tabIndex: 0,
                  }
                : {}
            }
            onChange={(_, __, sorter, extra) => {
              if (extra.action !== 'sort') return
              const s = Array.isArray(sorter) ? sorter[0] : sorter
              set({
                sort: s?.order
                  ? {
                      column: String(s.columnKey),
                      direction: s.order === 'ascend' ? 'ascending' : 'descending',
                    }
                  : null,
                page: 1,
              })
            }}
          />
        </Flex>
      )}

      {rows.length > 0 && (
        <GridFooter
          page={page}
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
        <ConfirmDialog
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

/** Tablo satırı: tarih grubu başlığı ya da talep. */
interface GridRow {
  key: string
  group?: { label: string; count: number }
  r?: WorkRequest
}
