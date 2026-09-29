import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { SortDescriptor } from 'react-aria-components'
import { Button, Card, Chip, ListBox, Pagination, Select, Table, Typography, cn } from '@heroui/react'
import { FilterX } from 'lucide-react'
import { deleteDraft, isRead, markRead, useBoxRequests, useReadIds } from '@/synergy/shared/decisions'
import { useRemembered } from '@/synergy/shared/remembered'
import {
  DELETE_CONFIRM,
  cellValue,
  columnsFor,
  dateBucket,
  dateBuckets,
  dateOf,
  formatDateTime,
  groupByDate,
  inRange,
  boxProcessCaption,
  type Box as WorkBox,
  type Column,
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

/*
 * Talep ızgarası (orijinal wfProcessList). Sütunlar süreçten; satırlar tarih gruplarına ayrılır.
 * Sütun başlığıyla sıralama, okunmamışlar kalın, açınca okundu; arama / sıralama / sayfa kutu +
 * süreç başına hatırlanır. Bekleyen Onaylar'da "Olaylar", Taslaklar'da "Sil".
 */

const PAGE_SIZES = [10, 20, 30, 50] as const
const CLEAR_FILTERS = 'Filtreleri Temizle' // 100918

/* HeroUI `secondary` tablosunun üstüne: yumuşak birincil başlık şeridi (ayırıcısız), çizgisiz satırlar */
const HEAD_CELL = 'bg-accent-soft whitespace-nowrap text-foreground/72 after:content-none'
const ITEM_ROW = 'cursor-pointer *:h-11 *:border-b-0 *:py-1 hover:*:bg-accent-soft/50'
const BUCKET_ROW = '*:h-8 *:border-b-0 *:bg-surface-secondary *:py-0'

interface GridState {
  search: string
  sort: SortDescriptor | null
  page: number
  pageSize: number
}

function searchText(r: WorkRequest, columns: Column[]) {
  return columns
    .map((c) => {
      const v = cellValue(r, c.key)
      return v instanceof Date ? formatDateTime(v) : v == null ? '' : String(v)
    })
    .join(' ')
    .toLocaleLowerCase('tr')
}

function pageItems(page: number, count: number): (number | 'gap')[] {
  const out: (number | 'gap')[] = []
  for (let i = 1; i <= count; i++) {
    if (i === 1 || i === count || Math.abs(i - page) <= 1) out.push(i)
    else if (out[out.length - 1] !== 'gap') out.push('gap')
  }
  return out
}

export function RequestGrid({ box, process, range }: { box: WorkBox; process: Process; range?: DateRange }) {
  const navigate = useNavigate()
  const all = useBoxRequests(box.id)
  const readIds = useReadIds()
  const columns = useMemo(() => columnsFor(box, process), [box, process])
  const [grid, setGrid] = useRemembered<GridState>(`karo:grid:${box.id}/${process.id}`, () => ({ search: '', sort: null, page: 1, pageSize: 10 }))
  const [deleting, setDeleting] = useState<WorkRequest | null>(null)
  const flow = useKaroFlow(undefined)

  const dateCol = columns.find((c) => c.type === 'datetime')?.key
  const byDateAsc = grid.sort?.column === dateCol && grid.sort?.direction === 'ascending'
  const rows = useMemo(() => {
    const q = grid.search.trim().toLocaleLowerCase('tr')
    const own = all.filter((r) => r.processId === process.id && inRange(dateOf(r, box), range) && (!q || searchText(r, columns).includes(q)))
    const bucketIndex = (r: WorkRequest) => dateBuckets.findIndex((b) => b.id === dateBucket(dateOf(r, box)))
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

  const pageCount = Math.max(1, Math.ceil(rows.length / grid.pageSize))
  const page = Math.min(grid.page, pageCount)
  const from = (page - 1) * grid.pageSize
  const pageRows = rows.slice(from, page * grid.pageSize)
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
    <Table.Column key="__actions" id="__actions" className={cn(HEAD_CELL, 'w-px')}>
      <Text className="sr-only">İşlemler</Text>
    </Table.Column>
  )

  return (
    <Card className={cn('gap-4 p-5', card)}>
      <Box className="flex flex-wrap items-center gap-2">
        {/* `min-w-48`: telefonda araçların yanında tek harfe ("S") sıkışıyordu; sığmazsa alt satıra iner */}
        <Typography.Heading level={2} truncate className="min-w-48 flex-1 font-display text-lg">
          {boxProcessCaption(box, process)}
        </Typography.Heading>
        <KaroSearch value={grid.search} onChange={(search) => set({ search, page: 1 })} className="w-64" />
        <Tip label={CLEAR_FILTERS}>
          <Button isIconOnly variant="ghost" aria-label={CLEAR_FILTERS} isDisabled={!hasFilters} onPress={() => set({ search: '', sort: null, page: 1 })}>
            <FilterX {...IC} />
          </Button>
        </Tip>
        <Select aria-label="Sayfa boyutu" className="w-32" value={String(grid.pageSize)} onChange={(v) => v && set({ pageSize: Number(v), page: 1 })}>
          <Select.Trigger className="">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Sayfa boyutu seçenekleri">
              {PAGE_SIZES.map((n) => (
                <ListBox.Item key={n} id={String(n)} textValue={`${n} satır`}>
                  {n} satır
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </Box>

      <Table variant="secondary">
        <Table.ScrollContainer>
          <Table.Content aria-label={boxProcessCaption(box, process)} sortDescriptor={grid.sort ?? undefined} onSortChange={(sort) => set({ sort, page: 1 })}>
            <Table.Header>
              {[
                ...columns.map((c) => (
                  <Table.Column key={c.key} id={c.key} allowsSorting isRowHeader={c.key === rowHeader} className={HEAD_CELL}>
                    {({ sortDirection }) => <Table.SortableColumnHeader sortDirection={sortDirection}>{c.caption}</Table.SortableColumnHeader>}
                  </Table.Column>
                )),
                ...(actionsHead ? [actionsHead] : []),
              ]}
            </Table.Header>
            <Table.Body renderEmptyState={() => <EmptyNote text="Gösterilecek veri yok." />}>
              {groups.flatMap(({ bucket, rows: items }) => [
                <Table.Row key={`g-${bucket.id}`} id={`g-${bucket.id}`} className={BUCKET_ROW}>
                  <Table.Cell colSpan={span}>
                    <Box className="flex items-center gap-2">
                      <Text tone="primary" className="text-sm font-semibold">
                        {bucket.label}
                      </Text>
                      <Chip size="sm" color="accent" variant="soft" className="min-w-5 justify-center">
                        {items.length}
                      </Chip>
                    </Box>
                  </Table.Cell>
                </Table.Row>,
                ...items.map((r) => (
                  <Table.Row key={r.id} id={r.id} onAction={() => open(r)} className={cn(ITEM_ROW, !isRead(r, readIds) && 'font-semibold')}>
                    {[
                      ...columns.map((c) => (
                        <Table.Cell key={c.key} className={c.key === rowHeader ? 'min-w-48' : 'whitespace-nowrap'}>
                          <CellValue r={r} col={c} />
                        </Table.Cell>
                      )),
                      ...(hasActions
                        ? [
                            <Table.Cell key="__actions" className="w-px">
                              {box.decisions && <FastMenu request={r} onRun={(id) => flow.run(id, r)} />}
                              {box.draftDelete && <DeleteButton title={r.template.title} onPress={() => setDeleting(r)} />}
                            </Table.Cell>,
                          ]
                        : []),
                    ]}
                  </Table.Row>
                )),
              ])}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {rows.length > 0 && (
        <Pagination aria-label="Sayfalar" size="sm">
          <Pagination.Summary>
            <Typography type="body-xs" color="muted">
              {from + 1}–{from + pageRows.length} / {rows.length}
            </Typography>
          </Pagination.Summary>
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous aria-label="Önceki sayfa" isDisabled={page <= 1} onPress={() => set({ page: page - 1 })}>
                <Pagination.PreviousIcon />
              </Pagination.Previous>
            </Pagination.Item>
            {pageItems(page, pageCount).map((it, i) =>
              it === 'gap' ? (
                <Pagination.Item key={`gap-${i}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={it}>
                  <Pagination.Link aria-label={`Sayfa ${it}`} aria-current={it === page ? 'page' : undefined} isActive={it === page} onPress={() => set({ page: it })} className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground">
                    {it}
                  </Pagination.Link>
                </Pagination.Item>
              ),
            )}
            <Pagination.Item>
              <Pagination.Next aria-label="Sonraki sayfa" isDisabled={page >= pageCount} onPress={() => set({ page: page + 1 })}>
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
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
