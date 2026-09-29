import { useLayoutEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import type { SortDescriptor } from 'react-aria-components'
import { AnimatePresence } from 'framer-motion'
import { ChevronDown, FilterX, Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  Link,
  ListBox,
  Pagination,
  Select,
  Table,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  cn,
  toast,
} from '@heroui/react'
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
import { card, inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { START_CRUMB, useFrame } from '@/synergy/v1/paths'
import { EmptyNote, IC, KaroSearch, Scroll, Tip, useBand } from '@/synergy/v1/parts'
import { KaroConfirm } from '@/synergy/v1/flow'
import { Indicator, MotionBox, useLeaving, useTransition } from '@/synergy/v1/motion'
import { Cell, cellValue } from '@/synergy/v1/hr/HrCells'
import { STATUS_DOT } from '@/synergy/v1/hr/HrFields'
import { HrInspector } from '@/synergy/v1/hr/HrInspector'
import { CompanyAdmins, PropertyRelations } from '@/synergy/v1/hr/HrSpecial'
import { MENU, MODULES, PARENTS, findModule, type ModuleDef } from '@/synergy/v1/hr/modules'

/*
 * İnsan Kaynakları (/insan-kaynaklari/:module[/:recordId]). Solda modül gezgini (sayılarıyla;
 * Organizasyon Bakımı ve Özellik Tanımları açılır), sağda modülün bandı (arama, şirket, durum,
 * Filtreleri Temizle, Yeni) ve listesi. Bir satıra basınca (ya da Yeni) sağdan düzenleme kartı
 * açılır; kayıt adreste durur. Süzgeçler modül başına oturumda hatırlanır.
 */

export const HR_BASE = '/insan-kaynaklari'
const hrLink = (module: HrModule, id?: string) => `${HR_BASE}/${module}${id ? `/${id}` : ''}`

const PAGE_SIZES = [10, 20, 50] as const

interface ListState {
  search: string
  /** Durum süzgeci; varsayılan Aktif (orijinaldeki gibi). */
  status: string
  /** Şirket: Tümü, Atanmamış ya da şirket kimliği. */
  company: string
  sort: SortDescriptor | null
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
    <Box
      ref={setRoot}
      style={{ '--hr-h': `calc(100dvh - ${top}px - 1.5rem)` } as CSSProperties}
      className="flex items-start gap-3 xl:h-(--hr-h) xl:items-stretch"
    >
      <HrNav current={def} />
      <Box className="flex min-w-0 flex-1 flex-col gap-3 xl:min-h-0">
        {def.view === 'table' ? (
          <ModuleView key={def.id} def={def} recordId={params.recordId} />
        ) : (
          <SpecialView key={def.id} def={def} />
        )}
      </Box>
    </Box>
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
      href={hrLink(m.id)}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm no-underline transition-colors hover:no-underline',
        nested && 'ms-4 h-9',
        current
          ? 'font-semibold text-accent-foreground'
          : 'text-foreground/80 hover:bg-surface-secondary',
      )}
    >
      {/* Seçili modülün zemini modülden modüle kayar */}
      {current && <Indicator id="hr-nav" className="bg-accent" />}
      <Icon {...IC} className="relative shrink-0" />
      <Text className="relative min-w-0 flex-1 truncate text-current">{m.label}</Text>
      <Typography
        {...inline}
        className={cn('relative font-mono text-xs text-current!', !current && 'opacity-60')}
      >
        {n}
      </Typography>
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
      className={cn(card, 'hidden w-64 shrink-0 p-0 xl:flex')}
    >
      <Scroll className="flex min-h-0 flex-1 flex-col gap-0.5 p-2">
        {MENU.map((item, i) => {
          if (item === '-')
            return <Box key={`sep-${i}`} aria-hidden className="mx-3 my-1.5 h-px bg-border" />
          if (item === 'bakim' || item === 'ozellik') {
            const p = PARENTS[item]
            const children = MODULES.filter((m) => m.parent === item)
            const isOpen = !!open[item] || current.parent === item
            const Icon = p.icon
            return (
              <Box key={item} className="flex flex-col">
                <Button
                  variant="ghost"
                  aria-expanded={isOpen}
                  onPress={() => setOpen((o) => ({ ...o, [item]: !isOpen }))}
                  className="h-10 w-full justify-start gap-3 rounded-xl px-3 text-sm font-normal text-foreground/80"
                >
                  <Icon {...IC} className="shrink-0" />
                  <Text className="min-w-0 flex-1 truncate text-start text-current">{p.label}</Text>
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
                    <MotionBox
                      key="children"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={grow}
                      className="flex flex-col gap-0.5 overflow-hidden"
                    >
                      {children.map((m) => (
                        <NavItem key={m.id} m={m} current={m.id === current.id} nested />
                      ))}
                    </MotionBox>
                  )}
                </AnimatePresence>
              </Box>
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
      className={cn('w-56 xl:hidden', className)}
    >
      <Select.Trigger className="bg-surface text-foreground">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={HR_LABELS.title}>
          {MODULES.map((m) => (
            <ListBox.Item key={m.id} id={m.id} textValue={m.label}>
              <m.icon {...IC} className="text-muted" />
              {m.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

/* --- Band -------------------------------------------------------------------------------------- */

/** Modül bandı: simge, ad, kayıt sayısı; sağda modülün denetimleri. Vurgu gücüne uyar. */
function Band({ def, count, children }: { def: ModuleDef; count: number; children?: ReactNode }) {
  const band = useBand()
  const Icon = def.icon
  const parent = def.parent ? PARENTS[def.parent].label : null
  return (
    <Card className={cn('gap-4 p-5 [--field-background:var(--surface)]', band.band)}>
      <Box className="flex flex-wrap items-center gap-3">
        <ModuleSwitcher current={def} />
        <Box
          aria-hidden
          className="hidden size-11 shrink-0 place-items-center rounded-xl bg-current/10 xl:grid"
        >
          <Icon {...IC} size={22} />
        </Box>
        <Box className="flex min-w-48 flex-1 flex-col">
          <Typography type="body-xs" className="text-current! opacity-75">
            {parent ? `${HR_LABELS.title} · ${parent}` : HR_LABELS.title}
          </Typography>
          <Box className="flex items-baseline gap-3">
            <Typography.Heading
              level={1}
              truncate
              className="font-display text-2xl font-bold text-current!"
            >
              {def.label}
            </Typography.Heading>
            <Typography
              {...inline}
              className="font-display text-lg font-semibold text-current! opacity-70"
            >
              {count}
            </Typography>
          </Box>
        </Box>
        <Box className="flex flex-wrap items-center gap-2">{children}</Box>
      </Box>
    </Card>
  )
}

/* --- Tablo modülleri --------------------------------------------------------------------------- */

function pageItems(page: number, count: number): (number | 'gap')[] {
  const out: (number | 'gap')[] = []
  for (let i = 1; i <= count; i++) {
    if (i === 1 || i === count || Math.abs(i - page) <= 1) out.push(i)
    else if (out[out.length - 1] !== 'gap') out.push('gap')
  }
  return out
}

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
        <KaroSearch
          value={st.search}
          onChange={(search) => set({ search, page: 1 })}
          className="w-64"
        />
        {def.company && (
          <Select
            aria-label={HR_LABELS.company}
            placeholder={HR_LABELS.companyPlaceholder}
            value={st.company}
            onChange={(v) => v && set({ company: String(v), page: 1 })}
            className="w-56"
          >
            <Select.Trigger className="bg-surface text-foreground">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox aria-label={HR_LABELS.company}>
                {[
                  { id: 'Tümü', label: HR_LABELS.all },
                  { id: 'Atanmamış', label: HR_LABELS.unassigned },
                  ...companies.map((c) => ({ id: c.id, label: c.description as string })),
                ].map((o) => (
                  <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                    {o.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
        <Tip label={HR_LABELS.clearFilters}>
          <Button
            isIconOnly
            variant="ghost"
            aria-label={HR_LABELS.clearFilters}
            isDisabled={!hasFilters}
            onPress={() =>
              set({ search: '', sort: null, status: 'Aktif', company: 'Tümü', page: 1 })
            }
            className="text-current data-hovered:bg-current/10"
          >
            <FilterX {...IC} />
          </Button>
        </Tip>
        <Button onPress={() => navigate(hrLink(def.id, 'yeni'))} className={onBand}>
          <Plus {...IC} />
          {HR_LABELS.new}
        </Button>
      </Band>

      <Box className="flex flex-col items-start gap-3 xl:min-h-0 xl:flex-1 xl:flex-row xl:items-stretch">
        <Card className={cn(card, 'w-full min-w-0 flex-1 gap-3 p-4 xl:min-h-0')}>
          {/* Durum süzgeci: bölümlü seçici, sayılarıyla */}
          {def.status && (
            <ToggleButtonGroup
              aria-label={HR_LABELS.status}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[st.status]}
              onSelectionChange={(k) => set({ status: String([...k][0]), page: 1 })}
              isDetached
              className="w-fit gap-1 rounded-xl bg-surface-secondary p-1"
            >
              {[...STATUSES, 'Tümü'].map((s) => (
                <ToggleButton
                  key={s}
                  id={s}
                  size="sm"
                  variant="ghost"
                  className="relative gap-1.5 rounded-lg px-3 data-selected:bg-transparent data-selected:font-semibold"
                >
                  {({ isSelected }) => (
                    <>
                      {isSelected && (
                        <Indicator id={`hr-status-${def.id}`} className="bg-surface shadow-sm" />
                      )}
                      {s !== 'Tümü' && (
                        <Box
                          aria-hidden
                          className={cn(
                            'relative size-2 rounded-full',
                            STATUS_DOT[s as keyof typeof STATUS_DOT],
                          )}
                        />
                      )}
                      <Text className="relative text-current">
                        {s === 'Tümü' ? HR_LABELS.all : s}
                      </Text>
                      <Typography {...inline} className="relative font-mono text-xs text-muted!">
                        {s === 'Tümü' ? all.length : all.filter((r) => r.status === s).length}
                      </Typography>
                    </>
                  )}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          <Table variant="secondary" className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
            {/* Tablo kendi içinde kayar; başlık satırı üstte kalır */}
            <Table.ScrollContainer className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              <Table.Content
                aria-label={def.label}
                sortDescriptor={st.sort ?? undefined}
                onSortChange={(sort) => set({ sort, page: 1 })}
                onRowAction={(key) => navigate(hrLink(def.id, String(key)))}
              >
                <Table.Header className="sticky top-0 z-10">
                  {[
                    ...def.columns.map((c, i) => (
                      <Table.Column
                        key={c.key}
                        id={c.key}
                        allowsSorting
                        isRowHeader={i === 0}
                        className="whitespace-nowrap after:content-none"
                      >
                        {({ sortDirection }) => (
                          <Table.SortableColumnHeader sortDirection={sortDirection}>
                            {c.label}
                          </Table.SortableColumnHeader>
                        )}
                      </Table.Column>
                    )),
                    ...(def.deletable
                      ? [
                          <Table.Column key="__del" id="__del" className="w-px after:content-none">
                            <Text className="sr-only">{HR_LABELS.delete}</Text>
                          </Table.Column>,
                        ]
                      : []),
                  ]}
                </Table.Header>
                <Table.Body renderEmptyState={() => <EmptyNote text={HR_LABELS.noData} />}>
                  {pageRows.map((r) => (
                    <Table.Row
                      key={r.id}
                      id={r.id}
                      className={cn(
                        'cursor-pointer transition-colors *:h-12 *:border-b-0 hover:*:bg-accent-soft/40',
                        r.id === recordId && '*:bg-accent-soft/70 hover:*:bg-accent-soft/70',
                        leaving(r.id),
                      )}
                    >
                      {[
                        ...def.columns.map((c) => (
                          <Table.Cell key={c.key} className="whitespace-nowrap">
                            <Cell r={r} col={c} />
                          </Table.Cell>
                        )),
                        ...(def.deletable
                          ? [
                              <Table.Cell key="__del" className="w-px">
                                <Tip label={HR_LABELS.delete}>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="ghost"
                                    aria-label={`${HR_LABELS.delete}: ${def.titleOf(r)}`}
                                    onPress={() => setDeleting(r)}
                                    className="text-muted data-hovered:text-danger"
                                  >
                                    <Trash2 {...IC} />
                                  </Button>
                                </Tip>
                              </Table.Cell>,
                            ]
                          : []),
                      ]}
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>

          {rows.length > 0 && (
            <Box className="flex flex-wrap items-center justify-between gap-3">
              <Select
                aria-label="Sayfa boyutu"
                value={String(st.pageSize)}
                onChange={(v) => v && set({ pageSize: Number(v), page: 1 })}
                className="w-32"
              >
                <Select.Trigger>
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
              <Pagination aria-label="Sayfalar" size="sm">
                <Pagination.Summary>
                  <Typography type="body-xs" color="muted">
                    {from + 1}–{Math.min(from + st.pageSize, rows.length)} / {rows.length}
                  </Typography>
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      aria-label="Önceki sayfa"
                      isDisabled={page <= 1}
                      onPress={() => set({ page: page - 1 })}
                    >
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
                        <Pagination.Link
                          aria-label={`Sayfa ${it}`}
                          aria-current={it === page ? 'page' : undefined}
                          isActive={it === page}
                          onPress={() => set({ page: it })}
                          className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                        >
                          {it}
                        </Pagination.Link>
                      </Pagination.Item>
                    ),
                  )}
                  <Pagination.Item>
                    <Pagination.Next
                      aria-label="Sonraki sayfa"
                      isDisabled={page >= pageCount}
                      onPress={() => set({ page: page + 1 })}
                    >
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </Box>
          )}
        </Card>

        {/* Düzenleme kartı: geniş ekranda sağdan genişleyerek açılır, dar ekranda tablonun altında */}
        <AnimatePresence initial={false}>
          {inspectorOpen && (
            <MotionBox
              key="inspector"
              initial={wide ? { width: 0, opacity: 0 } : { opacity: 0, y: 12 }}
              animate={wide ? { width: 480, opacity: 1 } : { opacity: 1, y: 0 }}
              exit={wide ? { width: 0, opacity: 0 } : { opacity: 0, y: 12 }}
              transition={slide}
              className="w-full shrink-0 overflow-hidden xl:h-full"
            >
              <Box className="w-full xl:h-full xl:w-[30rem]">
                <HrInspector
                  key={recordId}
                  def={def}
                  record={editing ?? undefined}
                  onClose={() => navigate(hrLink(def.id))}
                  onSaved={(id) => navigate(hrLink(def.id, id), { replace: true })}
                />
              </Box>
            </MotionBox>
          )}
        </AnimatePresence>
      </Box>

      {def.deletable && (
        <KaroConfirm
          isOpen={deleting !== null}
          tone="danger"
          message={HR_LABELS.deleteConfirm}
          onNo={() => setDeleting(null)}
          onYes={() => {
            if (deleting) {
              deleteRecord(def.id, deleting.id)
              toast.success(HR_LABELS.success, { description: def.titleOf(deleting) })
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
