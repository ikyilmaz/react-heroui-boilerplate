import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDateTime } from '@internationalized/date'
import type { Selection, SortDescriptor } from '@heroui/react'

/* -------------------------------------------------------------------------------------------------
 * Tipler
 * ------------------------------------------------------------------------------------------------- */

export type Status = 'waiting' | 'urgent' | 'info' | 'approved'

/**
 * Satır içi düzenlenen alanların hepsinde temizle (×) düğmesi var, bu yüzden `null` olabilirler;
 * boş hücre boş metin olarak görünür, sıralamada sona düşer, filtreyle eşleşmez.
 * `id` ve `status` zorunlu: biri kimlik, diğeri kapalı bir kümeden geliyor.
 */
export interface Request {
  id: string
  requestNo: number | null
  starter: string
  /** Süreç başlangıcı — alanda `DateTimePicker` ile düzenlenir ve filtrelenir. */
  processStart: CalendarDateTime | null
  /** İstek tarihi — saatsiz `DateTimePicker`. */
  requestDate: CalendarDateTime | null
  /** Tutar (TRY) — alanda `NumberBox` ile düzenlenir. */
  amount: number | null
  /** Tamamlanma yüzdesi (0–100) — `NumberBox` ile düzenlenir, çubukla gösterilir. */
  progress: number | null
  status: Status
}

export type ColumnKey = keyof Omit<Request, 'id'>

/* -------------------------------------------------------------------------------------------------
 * Filtre işlemleri
 *
 * Her kolon tipinin kendi işlem kümesi var; filtre hücresinin solundaki seçiciden değişir.
 * ------------------------------------------------------------------------------------------------- */

export type TextOperator = 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'equals'
export type NumberOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
export type DateOperator = 'on' | 'after' | 'onOrAfter' | 'before' | 'onOrBefore'
export type EnumOperator = 'eq' | 'ne'

export interface FilterState<Op, Value> {
  op: Op
  value: Value
}

export const textOperators: { id: TextOperator; label: string }[] = [
  { id: 'contains', label: 'İçerir' },
  { id: 'notContains', label: 'İçermez' },
  { id: 'startsWith', label: 'İle başlar' },
  { id: 'endsWith', label: 'İle biter' },
  { id: 'equals', label: 'Eşittir' },
]

export const numberOperators: { id: NumberOperator; label: string }[] = [
  { id: 'eq', label: 'Eşittir' },
  { id: 'ne', label: 'Eşit değildir' },
  { id: 'gt', label: 'Büyüktür' },
  { id: 'gte', label: 'Büyük veya eşittir' },
  { id: 'lt', label: 'Küçüktür' },
  { id: 'lte', label: 'Küçük veya eşittir' },
]

export const dateOperators: { id: DateOperator; label: string }[] = [
  { id: 'on', label: 'Tarihinde' },
  { id: 'after', label: 'Sonrasında' },
  { id: 'onOrAfter', label: 'Tarihinde veya sonrasında' },
  { id: 'before', label: 'Öncesinde' },
  { id: 'onOrBefore', label: 'Tarihinde veya öncesinde' },
]

export const enumOperators: { id: EnumOperator; label: string }[] = [
  { id: 'eq', label: 'Eşittir' },
  { id: 'ne', label: 'Eşit değildir' },
]

/** Filtre satırı. Boş değer: metinde "", sayı/tarihte `null`, durumda "all". */
export type Filters = {
  requestNo: FilterState<NumberOperator, number | null>
  starter: FilterState<TextOperator, string>
  status: FilterState<EnumOperator, Status | 'all'>
  processStart: FilterState<DateOperator, CalendarDateTime | null>
  requestDate: FilterState<DateOperator, CalendarDateTime | null>
  amount: FilterState<NumberOperator, number | null>
  progress: FilterState<NumberOperator, number | null>
}

export const emptyFilters: Filters = {
  requestNo: { op: 'eq', value: null },
  starter: { op: 'contains', value: '' },
  status: { op: 'eq', value: 'all' },
  processStart: { op: 'on', value: null },
  requestDate: { op: 'on', value: null },
  amount: { op: 'gte', value: null },
  progress: { op: 'gte', value: null },
}

/** Kolonun filtresi gerçekten uygulanıyor mu? (İşlem seçimi tek başına filtre saymaz.) */
export function isFilterSet(key: keyof Filters, filters: Filters) {
  const { value } = filters[key]
  if (key === 'status') return value !== 'all'
  return value !== '' && value !== null
}

export const statusMeta: Record<
  Status,
  { label: string; color: 'accent' | 'danger' | 'default' | 'success' }
> = {
  waiting: { label: 'Bekliyor', color: 'accent' },
  urgent: { label: 'Acil', color: 'danger' },
  info: { label: 'Bilgi', color: 'default' },
  approved: { label: 'Onaylandı', color: 'success' },
}

/** Filtre ve boş durum satırları gerçek kayıt değil; seçilemezler. */
export const FILTER_ROW_ID = '__filters'
export const EMPTY_ROW_ID = '__empty'

/* -------------------------------------------------------------------------------------------------
 * Biçimlendirme yardımcıları — hem hücrelerde hem sıralamada aynı sonucu versin
 * ------------------------------------------------------------------------------------------------- */

const currency = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
})
export const formatAmount = (value: number | null) => (value == null ? '' : currency.format(value))

const dateTime = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
const dateOnly = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short' })

export function formatDateTime(value: CalendarDateTime | null, withTime = true) {
  if (!value) return ''
  const d = new Date(value.year, value.month - 1, value.day, value.hour, value.minute)
  return (withTime ? dateTime : dateOnly).format(d)
}

/**
 * Satırın hücrelerinde **görünen** metinler.
 *
 * Genel arama da vurgulama da buradan beslenir; böylece aranan şey ile boyanan şey hiç ayrışmaz
 * (ör. "%45" ya da "₺48.500" yazıp aratmak çalışır).
 */
export function rowCells(r: Request): Record<ColumnKey, string> {
  return {
    requestNo: r.requestNo == null ? '' : `#${r.requestNo}`,
    starter: r.starter,
    status: statusMeta[r.status].label,
    processStart: formatDateTime(r.processStart),
    requestDate: formatDateTime(r.requestDate, false),
    amount: formatAmount(r.amount),
    progress: r.progress == null ? '' : `%${r.progress}`,
  }
}

/** Genel arama: görünen hücre metinlerinden herhangi biri eşleşirse satır kalır. */
export function matchesSearch(r: Request, query: string) {
  const needle = query.trim().toLocaleLowerCase('tr')
  if (!needle) return true
  return Object.values(rowCells(r)).some((text) => text.toLocaleLowerCase('tr').includes(needle))
}

/* -------------------------------------------------------------------------------------------------
 * Filtre eşleştirme — seçili işleme göre
 * ------------------------------------------------------------------------------------------------- */

/** Gün çözünürlüğünde karşılaştırma: saat farkı tarih filtrelerini etkilemesin. */
function compareDay(a: CalendarDateTime, b: CalendarDateTime) {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

function matchText(hay: string, { op, value }: FilterState<TextOperator, string>) {
  const needle = value.trim().toLocaleLowerCase('tr')
  if (!needle) return true
  const h = hay.toLocaleLowerCase('tr')
  switch (op) {
    case 'contains':
      return h.includes(needle)
    case 'notContains':
      return !h.includes(needle)
    case 'startsWith':
      return h.startsWith(needle)
    case 'endsWith':
      return h.endsWith(needle)
    case 'equals':
      return h === needle
  }
}

function matchNumber(v: number | null, { op, value }: FilterState<NumberOperator, number | null>) {
  if (value === null) return true
  if (v === null) return false
  switch (op) {
    case 'eq':
      return v === value
    case 'ne':
      return v !== value
    case 'gt':
      return v > value
    case 'gte':
      return v >= value
    case 'lt':
      return v < value
    case 'lte':
      return v <= value
  }
}

function matchDate(
  v: CalendarDateTime | null,
  { op, value }: FilterState<DateOperator, CalendarDateTime | null>,
) {
  if (value === null) return true
  if (v === null) return false
  const cmp = compareDay(v, value)
  switch (op) {
    case 'on':
      return cmp === 0
    case 'after':
      return cmp > 0
    case 'onOrAfter':
      return cmp >= 0
    case 'before':
      return cmp < 0
    case 'onOrBefore':
      return cmp <= 0
  }
}

function matchEnum<T>(v: T, { op, value }: FilterState<EnumOperator, T | 'all'>) {
  if (value === 'all') return true
  return op === 'eq' ? v === value : v !== value
}

/* -------------------------------------------------------------------------------------------------
 * Durum makinesi
 *
 * `DataGrid` tamamen sunum amaçlıdır (prop girer, JSX çıkar). Filtre / sıralama / seçim /
 * satır içi düzenleme / sayfalama mantığı burada toplanır.
 * ------------------------------------------------------------------------------------------------- */

export interface UseDataGridOptions {
  /** Ham kayıtlar (filtresiz, sırasız). Kimliği sabit olmalı; gerekirse `useMemo` ile sar. */
  rows: Request[]
  /** Kayıt değişikliklerini (düzenleme kaydetme, yeni satır, toplu onay) yukarı taşır. */
  onRowsChange: (updater: (rows: Request[]) => Request[]) => void
  /** Ekran okuyucu duyuruları; sayfa kendi canlı bölgesine yazar. */
  onAnnounce?: (message: string) => void
  defaultPageSize?: number
  defaultSort?: SortDescriptor
}

export function useDataGrid({
  rows,
  onRowsChange,
  onAnnounce,
  defaultPageSize = 10,
  defaultSort = { column: 'requestDate', direction: 'ascending' },
}: UseDataGridOptions) {
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [search, setSearch] = useState('')

  /** Yeni eklenen satır: sıralamadan bağımsız olarak listenin başında tutulur. */
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortDescriptor>(defaultSort)
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Request | null>(null)

  // Odak geri dönüşü: düzenlemeden çıkınca kalem düğmesine
  const returnFocusRowId = useRef<string | null>(null)
  const editButtonRefs = useRef(new Map<string, HTMLButtonElement>())

  /**
   * Dışarıdan gelen geri çağrıları ref'te tutuyoruz. Çağıran taraf bunları `useCallback` ile
   * sarmasa bile buradaki handler'ların kimliği sabit kalır; `tableProps` değişmediği için
   * DataGrid ve satırlar gereksiz yere render olmaz.
   */
  const disariRef = useRef({ onRowsChange, onAnnounce })
  useEffect(() => {
    disariRef.current = { onRowsChange, onAnnounce }
  })

  const announce = useCallback((message: string) => disariRef.current.onAnnounce?.(message), [])
  const applyRows = useCallback(
    (updater: (rows: Request[]) => Request[]) => disariRef.current.onRowsChange(updater),
    [],
  )

  const activeFilterCount = (Object.keys(filters) as (keyof Filters)[]).filter((k) =>
    isFilterSet(k, filters),
  ).length

  const filteredRows = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        matchesSearch(r, search) &&
        matchNumber(r.requestNo, filters.requestNo) &&
        matchText(r.starter, filters.starter) &&
        matchEnum(r.status, filters.status) &&
        matchDate(r.processStart, filters.processStart) &&
        matchDate(r.requestDate, filters.requestDate) &&
        matchNumber(r.amount, filters.amount) &&
        matchNumber(r.progress, filters.progress),
    )

    const col = sort.column as ColumnKey
    const dir = sort.direction === 'descending' ? -1 : 1
    const sorted = [...filtered].sort((a, b) => {
      if (col === 'status')
        return statusMeta[a.status].label.localeCompare(statusMeta[b.status].label, 'tr') * dir
      const av = a[col]
      const bv = b[col]
      // Boş hücreler yön ne olursa olsun sonda kalsın
      if (av == null || bv == null) return av == null ? (bv == null ? 0 : 1) : -1
      if (av instanceof CalendarDateTime && bv instanceof CalendarDateTime)
        return av.compare(bv) * dir
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv), 'tr') * dir
    })

    // Yeni satır sıralamanın ortasına düşüp gözden kaybolmasın
    const at = pinnedId ? sorted.findIndex((r) => r.id === pinnedId) : -1
    if (at > 0) sorted.unshift(...sorted.splice(at, 1))
    return sorted
  }, [rows, filters, search, sort, pinnedId])

  const pageRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  )

  /** Filtre ve boş durum satırları seçilemez; butonları çalışır (disabledBehavior="selection"). */
  const disabledKeys = useMemo(() => [FILTER_ROW_ID, EMPTY_ROW_ID], [])

  const selectedCount = selectedKeys === 'all' ? filteredRows.length : selectedKeys.size

  const setFilterValue = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]['value']) => {
      setFilters((f) => ({ ...f, [key]: { ...f[key], value } }) as Filters)
      setPage(1)
    },
    [],
  )

  const setFilterOperator = useCallback(<K extends keyof Filters>(key: K, op: Filters[K]['op']) => {
    setFilters((f) => ({ ...f, [key]: { ...f[key], op } }) as Filters)
    setPage(1)
  }, [])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))

  const changeSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const changePage = useCallback(
    (next: number) => setPage(Math.min(Math.max(1, next), totalPages)),
    [totalPages],
  )

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters)
    setPage(1)
    announce('Filtreler temizlendi.')
  }, [announce])

  const restoreFocus = useCallback(() => {
    const id = returnFocusRowId.current
    returnFocusRowId.current = null
    if (!id) return
    requestAnimationFrame(() => editButtonRefs.current.get(id)?.focus())
  }, [])

  const startEdit = useCallback(
    (r: Request) => {
      returnFocusRowId.current = r.id
      setEditingId(r.id)
      setDraft({ ...r })
      announce(`#${r.requestNo} düzenleme modunda. Kaydetmek için Enter, vazgeçmek için Escape.`)
    },
    [announce],
  )

  const cancelEdit = useCallback(
    (silent = false) => {
      setEditingId(null)
      setDraft(null)
      if (!silent) {
        announce('Düzenleme iptal edildi.')
        restoreFocus()
      }
    },
    [announce, restoreFocus],
  )

  const saveEdit = useCallback(() => {
    if (!draft) return
    applyRows((prev) => prev.map((r) => (r.id === draft.id ? draft : r)))
    setEditingId(null)
    setDraft(null)
    announce(`#${draft.requestNo} kaydedildi.`)
    restoreFocus()
  }, [announce, applyRows, draft, restoreFocus])

  const deleteRow = useCallback(
    (r: Request) => {
      applyRows((prev) => prev.filter((x) => x.id !== r.id))
      setSelectedKeys((keys) => {
        if (keys === 'all') return keys
        const next = new Set(keys)
        next.delete(r.id)
        return next
      })
      if (editingId === r.id) cancelEdit(true)
      if (pinnedId === r.id) setPinnedId(null)
      announce(`#${r.requestNo} silindi.`)
    },
    [announce, applyRows, cancelEdit, editingId, pinnedId],
  )

  /**
   * Satırı doğrudan günceller (taslak yok).
   * `showEditorAlways` modunda editörler satırın kendisine bağlı olduğu için bu kullanılır.
   */
  const updateRow = useCallback(
    (next: Request) => applyRows((prev) => prev.map((r) => (r.id === next.id ? next : r))),
    [applyRows],
  )

  /** Dışarıya açılan sürüm: varsayılan parametresi yüzünden `cancelEdit` doğrudan verilemiyor. */
  const cancelEditPublic = useCallback(() => cancelEdit(), [cancelEdit])

  const addRow = useCallback(() => {
    const now = new Date()
    const stamp = new CalendarDateTime(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
    )
    const row: Request = {
      id: `r${Date.now()}`,
      requestNo: 152600 + Math.floor(Math.random() * 100),
      starter: 'Yeni Kullanıcı',
      processStart: stamp,
      requestDate: stamp,
      amount: 0,
      progress: 0,
      status: 'waiting',
    }
    applyRows((prev) => [row, ...prev])
    // Aktif filtre/arama yeni satırı gizleyebilir; başa sabitlemenin anlamlı olması için temizliyoruz
    setFilters(emptyFilters)
    setSearch('')
    setPinnedId(row.id)
    setPage(1)
    setEditingId(row.id)
    setDraft({ ...row })
    announce(`Yeni istek #${row.requestNo} en üste eklendi ve düzenleme modunda.`)
  }, [announce, applyRows])

  const approveSelected = useCallback(() => {
    const ids =
      selectedKeys === 'all'
        ? new Set(filteredRows.map((r) => r.id))
        : new Set([...selectedKeys].map(String))
    applyRows((prev) =>
      prev.map((r) => (ids.has(r.id) ? { ...r, status: 'approved', progress: 100 } : r)),
    )
    setSelectedKeys(new Set())
    announce(`${ids.size} istek onaylandı.`)
  }, [announce, applyRows, filteredRows, selectedKeys])

  const changePageSize = useCallback(
    (n: number) => {
      setPageSize(n)
      setPage(1)
      announce(`Sayfa boyutu ${n} olarak ayarlandı.`)
    },
    [announce],
  )

  /** Kaynak veri değişince tabloyu başa al. */
  const reset = useCallback(() => {
    setPage(1)
    setPinnedId(null)
    setSelectedKeys(new Set())
    cancelEdit(true)
  }, [cancelEdit])

  /**
   * `<DataGrid {...tableProps} aria-label="…" />` olarak dağıtılır.
   *
   * `useMemo`: her render'da yeni bir nesne üretmek DataGrid'i (ve dolayısıyla bütün satırları)
   * boşuna yeniden render ettiriyordu.
   */
  const tableProps = useMemo(
    () => ({
      rows: pageRows,
      activeFilterCount,
      search,
      onSearchChange: changeSearch,
      page,
      totalPages,
      onPageChange: changePage,
      pageSize,
      onPageSizeChange: changePageSize,
      totalRows: filteredRows.length,
      filters,
      onFilterChange: setFilterValue,
      onFilterOperatorChange: setFilterOperator,
      onClearFilters: clearFilters,
      sort,
      onSortChange: setSort,
      selectedKeys,
      onSelectionChange: setSelectedKeys,
      disabledKeys,
      editingId,
      draft,
      onDraftChange: setDraft,
      onRowChange: updateRow,
      onStartEdit: startEdit,
      onDeleteRow: deleteRow,
      onSaveEdit: saveEdit,
      onCancelEdit: cancelEditPublic,
      editButtonRefs,
    }),
    [
      activeFilterCount,
      cancelEditPublic,
      changePage,
      changePageSize,
      changeSearch,
      clearFilters,
      deleteRow,
      disabledKeys,
      draft,
      editButtonRefs,
      editingId,
      filteredRows.length,
      filters,
      page,
      pageRows,
      pageSize,
      saveEdit,
      search,
      selectedKeys,
      setDraft,
      setFilterOperator,
      setFilterValue,
      setSelectedKeys,
      setSort,
      sort,
      startEdit,
      totalPages,
      updateRow,
    ],
  )

  return {
    filteredRows,
    pageRows,
    search,
    changeSearch,
    page,
    setPage: changePage,
    totalPages,
    pageSize,
    changePageSize,
    selectedCount,
    activeFilterCount,
    clearFilters,
    addRow,
    deleteRow,
    approveSelected,
    reset,
    tableProps,
  }
}
