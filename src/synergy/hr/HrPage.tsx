import { useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { AnimatePresence } from 'framer-motion'
import { ChevronDown, FilterX, Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  Flex,
  Segmented,
  Select,
  Table,
  Typography,
  type TableColumnsType,
} from 'antd'
import type { SortOrder } from 'antd/es/table/interface'
import {
  HR_LABELS,
  STATUSES,
  deleteRecord,
  hrRecord,
  useCompanyAdmins,
  useHrRecords,
  type HrModule,
  type HrRecord,
} from '@/synergy/shared/hrData'
import { useRemembered } from '@/synergy/shared/remembered'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { START_CRUMB, useFrame } from '@/synergy/paths'
import { useBand, EmptyNote, SearchField } from '@/synergy/ant/parts'
import { ConfirmDialog } from '@/synergy/flow'
import { useLeaving, useTransition } from '@/synergy/motion'
import { CARD, IC, MotionFlex, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { Indicator } from '@/synergy/ant/motion'
import { useNotify } from '@/synergy/ant/hr'
import { Cell, cellValue } from '@/synergy/hr/HrCells'
import { STATUS_DOT } from '@/synergy/hr/HrFields'
import { HrInspector } from '@/synergy/hr/HrInspector'
import { CompanyAdmins, PropertyRelations } from '@/synergy/hr/HrSpecial'
import {
  CardGroup,
  CardList,
  GRID_CELL,
  GRID_ROW,
  GRID_ROW_SELECTED,
  GRID_TABLE,
  GridCard,
  GridFooter,
  ViewSwitch,
  useGridView,
} from '@/synergy/ant/grid'
import { MENU, MODULES, PARENTS, findModule, type ModuleDef } from '@/synergy/hr/modules'

/*
 * İnsan Kaynakları (/insan-kaynaklari/:module[/:recordId]). Solda modül gezgini (sayılarıyla;
 * Organizasyon Bakımı ve Özellik Tanımları açılır), sağda modülün bandı (arama, şirket, durum,
 * Filtreleri Temizle, Yeni) ve listesi. Bir satıra basınca (ya da Yeni) sağdan düzenleme kartı
 * açılır; kayıt adreste durur. Süzgeçler modül başına oturumda hatırlanır.
 */

export const HR_BASE = '/insan-kaynaklari'
const hrLink = (module: HrModule, id?: string) => `${HR_BASE}/${module}${id ? `/${id}` : ''}`

const PAGE_SIZES = [10, 20, 50] as const

/** Düzenleme kartının genişliği (geniş ekran); açılış animasyonu da bu değere gider. */
const INSPECTOR_W = '30rem'

interface HrSort {
  column: string
  direction: 'ascending' | 'descending'
}

interface ListState {
  search: string
  /** Durum süzgeci; varsayılan Aktif (orijinaldeki gibi). */
  status: string
  /** Şirket: Tümü, Atanmamış ya da şirket kimliği. */
  company: string
  sort: HrSort | null
  page: number
  pageSize: number
}

const initial = (): ListState => ({
  search: '',
  status: 'Aktif',
  company: 'Tümü',
  sort: null,
  page: 1,
  pageSize: 10,
})

export function HrPage() {
  const params = useParams()
  const def = findModule(params.module)
  // Geniş ekranda alan ekranın kalanını doldurur; paneller kendi içinde kayar
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const [top, setTop] = useState(0)
  useLayoutEffect(() => {
    if (!root) return
    const measure = () => setTop(root.getBoundingClientRect().top + window.scrollY)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [root])
  if (!def) return <Navigate to={hrLink('kullanicilar')} replace />
  return (
    <Flex
      ref={setRoot}
      align="start"
      gap={12}
      style={{ '--hr-h': `calc(100dvh - ${top}px - 1.5rem)` } as CSSProperties}
      className="xl:h-(--hr-h) xl:items-stretch"
    >
      <HrNav current={def} />
      <Flex vertical gap={12} className="min-w-0 flex-1 xl:min-h-0">
        {def.view === 'table' ? (
          <ModuleView key={def.id} def={def} recordId={params.recordId} />
        ) : (
          <SpecialView key={def.id} def={def} />
        )}
      </Flex>
    </Flex>
  )
}

/* --- Gezgin ------------------------------------------------------------------------------------ */

function useCount(m: ModuleDef) {
  const list = useHrRecords(m.id)
  const admins = useCompanyAdmins()
  if (m.view === 'admins') return Object.values(admins).reduce((n, l) => n + l.length, 0)
  return list.length
}

function NavItem({
  m,
  current,
  nested = false,
}: {
  m: ModuleDef
  current: boolean
  nested?: boolean
}) {
  const n = useCount(m)
  const Icon = m.icon
  return (
    <Link
      to={hrLink(m.id)}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm no-underline transition-colors hover:no-underline',
        nested && 'ms-4 h-9 w-[calc(100%-1rem)]',
        current
          ? 'font-semibold text-accent-foreground hover:text-accent-foreground'
          : 'text-foreground/80 hover:bg-surface-secondary hover:text-foreground/80',
      )}
    >
      {/* Seçili modülün zemini modülden modüle kayar */}
      {current && <Indicator id="hr-nav" className="bg-accent" />}
      <Icon {...IC} className="relative shrink-0" />
      <Typography.Text ellipsis className="relative min-w-0 flex-1 text-current [font:inherit]">
        {m.label}
      </Typography.Text>
      <Typography.Text
        className={cn('relative font-mono text-xs text-current', !current && 'opacity-60')}
      >
        {n}
      </Typography.Text>
    </Link>
  )
}

function HrNav({ current }: { current: ModuleDef }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    current.parent ? { [current.parent]: true } : {},
  )
  const grow = useTransition({ duration: 0.25, ease: [0.22, 1, 0.36, 1] })
  return (
    <Card
      role="navigation"
      aria-label={HR_LABELS.title}
      className={cn(CARD, 'hidden w-64 shrink-0 xl:flex xl:flex-col')}
      classNames={{ body: 'flex min-h-0 flex-1 flex-col p-0' }}
    >
      <Scroll className="min-h-0 flex-1 gap-0.5 p-2">
        {MENU.map((item, i) => {
          if (item === '-')
            return (
              <Flex key={`sep-${i}`} aria-hidden className="mx-3 my-1.5 block h-px bg-border" />
            )
          if (item === 'bakim' || item === 'ozellik') {
            const p = PARENTS[item]
            const children = MODULES.filter((m) => m.parent === item)
            const isOpen = !!open[item] || current.parent === item
            const Icon = p.icon
            return (
              <Flex key={item} vertical>
                <Button
                  type="text"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((o) => ({ ...o, [item]: !isOpen }))}
                  className="h-10 w-full justify-start gap-3 rounded-xl px-3 text-sm font-normal text-foreground/80"
                >
                  <Icon {...IC} className="shrink-0" />
                  <Typography.Text
                    ellipsis
                    className="min-w-0 flex-1 text-start text-current [font:inherit]"
                  >
                    {p.label}
                  </Typography.Text>
                  <ChevronDown
                    {...IC}
                    size={14}
                    className={cn(
                      'shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )}
                  />
                </Button>
                {/* Alt modüller yüksekliği açılıp kapanarak gelir */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <MotionFlex
                      key="children"
                      vertical
                      gap={2}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={grow}
                      className="overflow-hidden"
                    >
                      {children.map((m) => (
                        <NavItem key={m.id} m={m} current={m.id === current.id} nested />
                      ))}
                    </MotionFlex>
                  )}
                </AnimatePresence>
              </Flex>
            )
          }
          const m = findModule(item)!
          return <NavItem key={m.id} m={m} current={m.id === current.id} />
        })}
      </Scroll>
    </Card>
  )
}

/** Dar ekranda gezgin yerine bandın başında modül seçici. */
function ModuleSwitcher({ current, className }: { current: ModuleDef; className?: string }) {
  const navigate = useNavigate()
  return (
    <Select
      aria-label={HR_LABELS.title}
      value={current.id}
      onChange={(v) => v && navigate(hrLink(v as HrModule))}
      options={MODULES.map((m) => ({
        value: m.id,
        label: (
          <Flex align="center" gap={8}>
            <m.icon {...IC} className="shrink-0 text-muted" />
            {m.label}
          </Flex>
        ),
      }))}
      className={cn('w-56 bg-surface xl:hidden', className)}
    />
  )
}

/* --- Band -------------------------------------------------------------------------------------- */

/** Modül bandı: simge, ad, kayıt sayısı; sağda modülün denetimleri. Vurgu gücüne uyar. */
function Band({ def, count, children }: { def: ModuleDef; count: number; children?: ReactNode }) {
  const band = useBand()
  const Icon = def.icon
  const parent = def.parent ? PARENTS[def.parent].label : null
  return (
    <Card className={cn('shrink-0', band.band)} classNames={{ body: 'p-5' }}>
      <Flex wrap align="center" gap={12}>
        <ModuleSwitcher current={def} />
        <Flex
          aria-hidden
          align="center"
          justify="center"
          className="hidden size-11 shrink-0 rounded-xl bg-current/10 xl:flex"
        >
          <Icon {...IC} size={22} />
        </Flex>
        <Flex vertical className="min-w-48 flex-1">
          <Typography.Text className="text-xs text-current opacity-75">
            {parent ? `${HR_LABELS.title} · ${parent}` : HR_LABELS.title}
          </Typography.Text>
          <Flex align="baseline" gap={12} className="min-w-0">
            <Typography.Title
              level={1}
              ellipsis
              className="m-0 min-w-0 font-display text-2xl font-bold text-current"
            >
              {def.label}
            </Typography.Title>
            <Typography.Text className="font-display text-lg font-semibold text-current opacity-70">
              {count}
            </Typography.Text>
          </Flex>
        </Flex>
        <Flex wrap align="center" gap={8}>
          {children}
        </Flex>
      </Flex>
    </Card>
  )
}

/* --- Tablo modülleri --------------------------------------------------------------------------- */

function ModuleView({ def, recordId }: { def: ModuleDef; recordId: string | undefined }) {
  const navigate = useNavigate()
  const all = useHrRecords(def.id)
  const companies = useHrRecords('sirketler')
  const [st, setSt] = useRemembered<ListState>(`hr:${def.id}`, initial)
  const set = (patch: Partial<ListState>) => setSt((s) => ({ ...s, ...patch }))
  const [deleting, setDeleting] = useState<HrRecord | null>(null)
  const onBand = useBand().on
  const wide = useMediaQuery('(min-width: 1280px)')
  const slide = useTransition({ duration: 0.3, ease: [0.22, 1, 0.36, 1] })
  const notify = useNotify()

  const editing = recordId === 'yeni' ? null : recordId ? hrRecord(def.id, recordId) : undefined
  const inspectorOpen = recordId === 'yeni' || !!editing
  // Adresteki kayıt yoksa (silinmiş) liste adresine dönülür (hook'lardan sonra)
  const missingRecord = !!recordId && recordId !== 'yeni' && !editing

  const rows = useMemo(() => {
    const q = st.search.trim().toLocaleLowerCase('tr')
    const found = all.filter((r) => {
      if (def.status && st.status !== 'Tümü' && r.status !== st.status) return false
      if (def.company && st.company !== 'Tümü') {
        const list = (r.companies as string[] | undefined) ?? []
        if (st.company === 'Atanmamış' ? list.length > 0 : !list.includes(st.company)) return false
      }
      if (!q) return true
      return (
        def.columns.some((c) => String(cellValue(r, c)).toLocaleLowerCase('tr').includes(q)) ||
        def.titleOf(r).toLocaleLowerCase('tr').includes(q)
      )
    })
    if (!st.sort) return found
    const col = def.columns.find((c) => c.key === st.sort!.column)
    if (!col) return found
    const dir = st.sort.direction === 'descending' ? -1 : 1
    return [...found].sort((a, b) => {
      const x = cellValue(a, col)
      const y = cellValue(b, col)
      return (
        dir *
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y), 'tr', { numeric: true }))
      )
    })
  }, [all, def, st])

  // Silinen satır yerinde kalıp sağa kayarak çıkar
  const [kept, leaving] = useLeaving(rows)
  const pageCount = Math.max(1, Math.ceil(rows.length / st.pageSize))
  const page = Math.min(st.page, pageCount)
  const from = (page - 1) * st.pageSize
  const pageRows = kept.slice(from, page * st.pageSize + (kept.length - rows.length))
  const hasFilters =
    !!st.search ||
    !!st.sort ||
    (def.status && st.status !== 'Aktif') ||
    (def.company && st.company !== 'Tümü')

  const [view, setView] = useGridView(`hr:${def.id}`)
  const statusCol = def.columns.find((c) => c.kind === 'status')
  const open = (r: HrRecord) => navigate(hrLink(def.id, r.id))
  // Satır eylemi: tıklama satıra (kaydı açmaya) geçmez
  const deleteButton = (r: HrRecord) => (
    <Tip label={HR_LABELS.delete}>
      <Button
        type="text"
        size="small"
        aria-label={`${HR_LABELS.delete}: ${def.titleOf(r)}`}
        icon={<Trash2 {...IC} />}
        onClick={(e) => {
          e.stopPropagation()
          setDeleting(r)
        }}
        className="text-muted hover:text-danger!"
      />
    </Tip>
  )

  const order = (key: string): SortOrder =>
    st.sort?.column === key ? (st.sort.direction === 'ascending' ? 'ascend' : 'descend') : null
  const columns: TableColumnsType<HrRecord> = [
    ...def.columns.map((c, i) => ({
      key: c.key,
      title: c.label,
      sorter: true,
      sortOrder: order(c.key),
      showSorterTooltip: false,
      className: cn(GRID_CELL, i === 0 && 'font-medium text-foreground'),
      render: (_: unknown, r: HrRecord) => <Cell r={r} col={c} />,
    })),
    ...(def.deletable
      ? [
          {
            key: '__del',
            title: <Typography.Text className="sr-only">{HR_LABELS.delete}</Typography.Text>,
            width: 1,
            render: (_: unknown, r: HrRecord) => deleteButton(r),
          },
        ]
      : []),
  ]

  useFrame([
    START_CRUMB,
    { label: HR_LABELS.title, href: hrLink('kullanicilar'), icon: 'hr' },
    ...(def.parent ? [{ label: PARENTS[def.parent].label, icon: `hr-parent:${def.parent}` }] : []),
    { label: def.label, href: hrLink(def.id), icon: `hr:${def.id}` },
    ...(recordId === 'yeni'
      ? [{ label: HR_LABELS.new, icon: 'hr-record' }]
      : editing
        ? [{ label: def.titleOf(editing), icon: 'hr-record' }]
        : []),
  ])

  if (missingRecord) return <Navigate to={hrLink(def.id)} replace />

  return (
    <>
      <Band def={def} count={rows.length}>
        <SearchField
          value={st.search}
          onChange={(search) => set({ search, page: 1 })}
          className="w-64 bg-surface"
        />
        {def.company && (
          <Select
            aria-label={HR_LABELS.company}
            placeholder={HR_LABELS.companyPlaceholder}
            value={st.company}
            onChange={(v) => v && set({ company: String(v), page: 1 })}
            options={[
              { value: 'Tümü', label: HR_LABELS.all },
              { value: 'Atanmamış', label: HR_LABELS.unassigned },
              ...companies.map((c) => ({ value: c.id, label: c.description as string })),
            ]}
            className="w-56 bg-surface"
          />
        )}
        <Tip label={HR_LABELS.clearFilters}>
          <Button
            type="text"
            aria-label={HR_LABELS.clearFilters}
            icon={<FilterX {...IC} />}
            disabled={!hasFilters}
            onClick={() =>
              set({ search: '', sort: null, status: 'Aktif', company: 'Tümü', page: 1 })
            }
            className="text-current hover:bg-current/10! disabled:text-current/40!"
          />
        </Tip>
        <Button
          onClick={() => navigate(hrLink(def.id, 'yeni'))}
          icon={<Plus {...IC} />}
          className={cn('border-0', onBand)}
        >
          {HR_LABELS.new}
        </Button>
      </Band>

      <Flex
        vertical
        align="start"
        gap={12}
        className="xl:min-h-0 xl:flex-1 xl:flex-row xl:items-stretch"
      >
        <Card
          className={cn(CARD, 'w-full min-w-0 flex-1 xl:flex xl:min-h-0 xl:flex-col')}
          classNames={{ body: 'flex flex-col gap-3 p-4 xl:min-h-0 xl:flex-1' }}
        >
          {/* Solda durum süzgeci (bölümlü seçici, sayılarıyla), sağda tablo / kart seçici */}
          <Flex wrap align="center" gap={12} className="shrink-0">
            {def.status && (
              <Segmented<string>
                aria-label={HR_LABELS.status}
                value={st.status}
                onChange={(status) => set({ status, page: 1 })}
                className="w-fit rounded-xl bg-surface-secondary p-1 [&_.ant-segmented-item-selected]:font-semibold"
                options={[...STATUSES, 'Tümü'].map((s) => ({
                  value: s,
                  label: (
                    <Flex align="center" gap={6} className="px-1">
                      {s !== 'Tümü' && (
                        <Flex
                          aria-hidden
                          className={cn(
                            'block size-2 rounded-full',
                            STATUS_DOT[s as keyof typeof STATUS_DOT],
                          )}
                        />
                      )}
                      <Typography.Text className="text-current [font:inherit]">
                        {s === 'Tümü' ? HR_LABELS.all : s}
                      </Typography.Text>
                      <Typography.Text type="secondary" className="font-mono text-xs">
                        {s === 'Tümü' ? all.length : all.filter((r) => r.status === s).length}
                      </Typography.Text>
                    </Flex>
                  ),
                }))}
              />
            )}
            <ViewSwitch view={view} onChange={setView} className="ms-auto" />
          </Flex>

          {view === 'cards' ? (
            // Kart görünümü: ilk sütun başlık, durum rozet, kalan sütunlar alan; kendi içinde kayar
            <CardList className="xl:min-h-0 xl:flex-1">
              {pageRows.length === 0 && <EmptyNote text={HR_LABELS.noData} />}
              {pageRows.length > 0 && (
                <CardGroup listLabel={def.label}>
                  {pageRows.map((r) => (
                    <GridCard
                      key={r.id}
                      onOpen={() => open(r)}
                      selected={r.id === recordId}
                      className={leaving(r.id) || undefined}
                      title={<Cell r={r} col={def.columns[0]!} />}
                      badge={statusCol && <Cell r={r} col={statusCol} />}
                      fields={def.columns
                        .slice(1)
                        .filter((c) => c !== statusCol)
                        .map((c) => ({ label: c.label, value: <Cell r={r} col={c} /> }))}
                      actions={def.deletable && deleteButton(r)}
                    />
                  ))}
                </CardGroup>
              )}
            </CardList>
          ) : (
            // Tablo kendi içinde kayar; başlık satırı üstte kalır
            <Flex vertical className="w-full overflow-auto xl:min-h-0 xl:flex-1">
              <Table<HrRecord>
                aria-label={def.label}
                size="middle"
                pagination={false}
                rowKey="id"
                columns={columns}
                dataSource={pageRows}
                className={GRID_TABLE}
                locale={{ emptyText: <EmptyNote text={HR_LABELS.noData} /> }}
                rowClassName={(r) =>
                  cn(GRID_ROW, r.id === recordId && GRID_ROW_SELECTED, leaving(r.id))
                }
                onRow={(r) => ({
                  onClick: () => open(r),
                  onKeyDown: (e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) open(r)
                  },
                  tabIndex: 0,
                })}
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
              pageCount={pageCount}
              from={from}
              shown={Math.min(st.pageSize, rows.length - from)}
              total={rows.length}
              pageSize={st.pageSize}
              sizes={PAGE_SIZES}
              onPage={(p) => set({ page: p })}
              onPageSize={(pageSize) => set({ pageSize, page: 1 })}
            />
          )}
        </Card>

        {/* Düzenleme kartı: geniş ekranda sağdan genişleyerek açılır, dar ekranda tablonun altında */}
        <AnimatePresence initial={false}>
          {inspectorOpen && (
            <MotionFlex
              key="inspector"
              vertical
              initial={wide ? { width: 0, opacity: 0 } : { opacity: 0, y: 12 }}
              // Kartın kendi genişliğiyle aynı birim (rem): tema ölçeği değişince sağda boşluk kalmasın
              animate={wide ? { width: INSPECTOR_W, opacity: 1 } : { opacity: 1, y: 0 }}
              exit={wide ? { width: 0, opacity: 0 } : { opacity: 0, y: 12 }}
              transition={slide}
              className="w-full shrink-0 overflow-hidden xl:h-full"
            >
              {/* Genişlik `INSPECTOR_W` ile aynı */}
              <Flex vertical className="w-full xl:h-full xl:w-[30rem]">
                <HrInspector
                  key={recordId}
                  def={def}
                  record={editing ?? undefined}
                  onClose={() => navigate(hrLink(def.id))}
                  onSaved={(id) => navigate(hrLink(def.id, id), { replace: true })}
                />
              </Flex>
            </MotionFlex>
          )}
        </AnimatePresence>
      </Flex>

      {def.deletable && (
        <ConfirmDialog
          isOpen={deleting !== null}
          tone="danger"
          message={HR_LABELS.deleteConfirm}
          onNo={() => setDeleting(null)}
          onYes={() => {
            if (deleting) {
              deleteRecord(def.id, deleting.id)
              notify.success(HR_LABELS.success, def.titleOf(deleting))
              if (deleting.id === recordId) navigate(hrLink(def.id))
            }
            setDeleting(null)
          }}
        />
      )}
    </>
  )
}

/* --- Tablo dışı görünümler --------------------------------------------------------------------- */

function SpecialView({ def }: { def: ModuleDef }) {
  useFrame([
    START_CRUMB,
    { label: HR_LABELS.title, href: hrLink('kullanicilar'), icon: 'hr' },
    ...(def.parent ? [{ label: PARENTS[def.parent].label, icon: `hr-parent:${def.parent}` }] : []),
    { label: def.label, icon: `hr:${def.id}` },
  ])
  const header = (controls: ReactNode, count: number) => (
    <Band def={def} count={count}>
      {controls}
    </Band>
  )
  return def.view === 'admins' ? (
    <CompanyAdmins header={header} />
  ) : (
    <PropertyRelations module={def.id} header={header} />
  )
}
