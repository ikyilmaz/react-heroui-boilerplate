import { memo, useCallback, useMemo, useRef, useState } from 'react'
import {
  AlignLeft,
  AlignRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Equal,
  EqualNot,
  FilterX,
  type LucideIcon,
  Pencil,
  Search,
  SearchX,
  Trash2,
  X,
} from 'lucide-react'
import type { CalendarDateTime } from '@internationalized/date'
import type { KeyboardEvent, ReactNode, RefObject } from 'react'
import {
  AlertDialog,
  Avatar,
  Button,
  Checkbox,
  Chip,
  EmptyState,
  InputGroup,
  ListBox,
  Pagination,
  ProgressBar,
  Select,
  Surface,
  Table,
  TextField,
  Tooltip,
  Typography,
  cn,
  type Selection,
  type SortDescriptor,
} from '@heroui/react'

import {
  FIELD_AFFIX,
  ICON_MUTED,
  FIELD_ICON_BUTTON,
  FIELD_ICON_SIZE,
  fieldIconButton,
} from '@/components/fieldIconButton'
import { FieldSelectIndicator } from '@/components/FieldSelectIndicator'
import { DateTimePicker } from '@/components/DateTimePicker'
import { NumberBox } from '@/components/NumberBox'
import {
  rowCells,
  dateOperators,
  emptyFilters,
  enumOperators,
  numberOperators,
  statusMeta,
  textOperators,
  EMPTY_ROW_ID,
  FILTER_ROW_ID,
  type DateOperator,
  type EnumOperator,
  type FilterState,
  type Filters,
  type NumberOperator,
  type Request,
  type Status,
  type TextOperator,
} from '@/components/useDataGrid'

/* -------------------------------------------------------------------------------------------------
 * Sunum
 * ------------------------------------------------------------------------------------------------- */

/**
 * Sütun genişlikleri: tablo kabı kaplar (`w-full`), dar ekranda `min-w` ile yatay kaydırılır.
 * Hücrelerde max-w-0, auto düzende min-content'in metne göre büyümesini engeller; truncate çalışır.
 */
/** Seçim ve işlemler ayrı birer kolon; ikisi de kendi dolgusunu kullanır. */
const COL_SELECT = 'w-12 whitespace-nowrap px-3'
const COL_ACTIONS = 'w-26 whitespace-nowrap'
const CELL = 'overflow-hidden max-w-0'
const CELL_SELECT = 'whitespace-nowrap px-3'
const CELL_ACTIONS = 'whitespace-nowrap'

/** Alanlar hücreyi kaplasın: bileşenlerin kendi sabit genişlikleri burada geçersiz. */
const FIELD = 'w-full min-w-0'

/**
 * İlerleme 0–100 ölçeğinde tutuluyor; `style: "percent"` değeri kesir sayacağı için
 * (45 -> %4.500) birim biçimi kullanılıyor: 45 -> "%45".
 */
const PERCENT_FORMAT: Intl.NumberFormatOptions = {
  style: 'unit',
  unit: 'percent',
  unitDisplay: 'narrow',
  maximumFractionDigits: 0,
}

/**
 * Filtre hücresi: solda işlem seçici, sağda alanın kendisi — tek bir denetim gibi bitişik.
 * Seçicinin bitiş köşeleri ve bitiş kenarlığı kaldırılır, alanın başlangıç köşeleri düzleşir;
 * aradaki tek çizgi alanın kendi başlangıç kenarlığıdır.
 */
const FILTER_CELL = 'flex items-center'

/**
 * Filtre alanı. `relative focus-within:z-10`: işlem seçicinin tetikleyicisi `relative isolate`
 * olduğu için konumlanmamış komşusunun odak halkasını örtüyordu.
 */
const FILTER_FIELD = 'w-full min-w-0 relative focus-within:z-10'

/**
 * İşlem seçici ikonları. Metin işlemleri için arama/hizalama, sayı ve tarih için
 * karşılaştırma okları. `eq`/`ne` hem sayıda hem durumda geçerli; aynı ikonu paylaşırlar.
 */
const OPERATOR_ICONS: Record<string, LucideIcon> = {
  contains: Search,
  notContains: SearchX,
  startsWith: AlignLeft,
  endsWith: AlignRight,
  equals: Equal,
  eq: Equal,
  ne: EqualNot,
  gt: ChevronRight,
  gte: ChevronsRight,
  lt: ChevronLeft,
  lte: ChevronsLeft,
  on: Equal,
  after: ChevronRight,
  onOrAfter: ChevronsRight,
  before: ChevronLeft,
  onOrBefore: ChevronsLeft,
}

/**
 * Kolonun filtre işlemini seçer (içerir, ile başlar, büyüktür...). Tetikleyici yalnızca ikondur;
 * seçili işlem erişilebilir ada yazılır, çünkü `Select.Value` yokken RAC düğmenin adını
 * `aria-labelledby` ile etiketten kurar ve içerideki metni okumaz.
 */
function FilterOperator<Op extends string>({
  label,
  operators,
  value,
  onChange,
}: {
  label: string
  operators: { id: Op; label: string }[]
  value: Op
  onChange: (op: Op) => void
}) {
  const current = operators.find((o) => o.id === value) ?? operators[0]
  const Icon = OPERATOR_ICONS[current.id]
  return (
    <Select
      aria-label={`${label} filtre işlemi: ${current.label}`}
      className="shrink-0"
      value={value}
      onChange={(v) => v && onChange(v as Op)}
    >
      {/*
        `Select.Trigger` yerine sıradan bir `Button`: RAC'in `Select`i tetikleyicisini
        `ButtonContext` ile veriyor, yani içindeki herhangi bir `Button` tetikleyici olur.
        `.select__trigger`ın kendi zemini/kenarlığı devreye girmediği için temizle düğmeleriyle
        birebir aynı `ghost` görünümü ve yuvarlak hover'ı alıyoruz.
      */}
      <Button variant="ghost" size="sm" isIconOnly className={cn('mx-1', FIELD_ICON_BUTTON)}>
        <Icon size={FIELD_ICON_SIZE} aria-hidden />
      </Button>
      <Select.Popover>
        <ListBox aria-label={`${label} filtre işlemleri`}>
          {operators.map((o) => {
            const ItemIcon = OPERATOR_ICONS[o.id]
            return (
              <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                <ItemIcon size={14} aria-hidden />
                {o.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

/**
 * Satır vurgusunun (hover / seçili / düzenleme) köşeleri.
 *
 * `tr` yuvarlanamaz; HeroUI de zemini hücrelere basıyor (table.css: "applied to cells so
 * Firefox clips bg to border-radius"). Bu yüzden satırın ilk/son hücresinin dış köşelerini
 * yuvarlıyoruz. `secondary` varyantı gövdenin ilk/son satırına ayrıca `rounded-none` veriyor;
 * utility'ler `components` katmanından sonra geldiği için düşük özgüllükle de onu eziyoruz.
 * Ölçü tema yarıçapını izler, 16px'te sınırlanır.
 */
const ROW_CORNERS =
  '[&>td:first-child]:rounded-s-[min(16px,var(--radius-2xl))] [&>td:last-child]:rounded-e-[min(16px,var(--radius-2xl))]'

/**
 * Düzenleme zemini hücrelere basılır — `tr`'ye basılsaydı hücre köşeleri onu kırpamazdı.
 * Utility katmanı sayesinde hover zemininin de önüne geçer.
 */
const EDIT_ROW_BG = '[&>td]:bg-accent-soft/30'

/**
 * Seçili satır: zemin yine hücrelere basılır (köşe yarıçapı ancak öyle kırpıyor).
 * RAC seçimi `tr` üzerinde `data-selected` ile işaretler.
 */
const SELECTED_ROW_BG = '[&[data-selected=true]>td]:bg-accent-soft'

/** Filtre ve boş durum satırları gerçek kayıt değil; hover vurgusu almasınlar. */
const NO_HOVER = '[&:hover>td]:bg-transparent [&[data-hovered=true]>td]:bg-transparent'

/**
 * Ayraç düzeni: satır arası yatay çizgiler kalkar, yerine kolon arasına dikey ayraç gelir.
 *
 * Çizgi tavandan tabana değil, HeroUI'nin başlıkta yaptığı gibi kısa ve ortalıdır
 * (`.table__column::after`); hücre zeminine kenarlık basmak satır vurgusunun yuvarlak
 * köşelerini kesiyordu. Pseudo-element kuralı `index.css`te `.data-grid` altında.
 */
const DIVIDERS = '[&_tr]:border-b-0 [&_td]:border-b-0 data-grid'

/**
 * Kompakt satır: yükseklik 2.75rem, hücre dolgusu kısaltılmış. İçerideki denetimler 2rem
 * olduğu için bu yükseklik düzenleme modunda da yetiyor.
 */
const ROW = 'h-11 [&>td]:py-1'

/**
 * Satırlar arasındaki boşluk. Tablo zaten `border-separate` + `border-spacing-0`; dikey
 * aralığı açmak satır vurgularını birbirinden ayırıyor (marj `tr`'ye uygulanamıyor).
 * Başlık şeridiyle filtre satırı arasındaki boşluk da buradan geliyor.
 */
const ROW_GAP = 'border-spacing-y-1'

/** Typography varsayılan olarak <p> basar; arama vurgusu satır içi <mark> olmalı. */
const markText = { elementType: 'mark', slot: null } as unknown as Record<string, never>

/**
 * Hücre metnini arama terimine göre parçalayıp eşleşen kısımları `<mark>` ile boyar.
 * Terim yokken hiç düğüm üretmez.
 *
 * Türkçe küçültme bazı harflerde uzunluğu değiştirebilir ("İ" gibi); uzunluk kaymışsa
 * konumlar güvenilmez olacağı için vurgulamadan vazgeçip düz metni basıyoruz.
 */
const Highlight = memo(function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim()
  if (!needle) return <>{text}</>

  const haystack = text.toLocaleLowerCase('tr')
  const target = needle.toLocaleLowerCase('tr')
  if (haystack.length !== text.length || target.length !== needle.length) return <>{text}</>

  const parts: ReactNode[] = []
  let cursor = 0
  for (let at = haystack.indexOf(target); at !== -1; at = haystack.indexOf(target, cursor)) {
    if (at > cursor) parts.push(text.slice(cursor, at))
    parts.push(
      <Typography
        key={at}
        {...markText}
        className="rounded-sm bg-warning-soft text-warning-soft-foreground"
      >
        {text.slice(at, at + needle.length)}
      </Typography>,
    )
    cursor = at + needle.length
  }
  if (!parts.length) return <>{text}</>
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
})

/**
 * Hücre metni: aramayı vurgular ve üstüne gelince tam metni ipucu olarak gösterir.
 *
 * Tetikleyici `Tooltip.Trigger` olmak zorunda: RAC ipucu olaylarını `useFocusable` üzerinden
 * bağlıyor, sıradan bir kutu (`Surface`) bunları almadığı için ipucu hiç açılmıyordu.
 * Kısaltma `truncate` ile hücrede kalıyor, tam metin ipucunda.
 */
const CellText = memo(function CellText({
  text,
  query,
  className,
  weight,
  color,
}: {
  text: string
  query: string
  className?: string
  weight?: 'medium'
  color?: 'muted'
}) {
  return (
    <Tooltip delay={500}>
      <Tooltip.Trigger className="min-w-0">
        <Typography weight={weight} color={color} className={className} truncate>
          <Highlight text={text} query={query} />
        </Typography>
      </Tooltip.Trigger>
      <Tooltip.Content>{text}</Tooltip.Content>
    </Tooltip>
  )
})

/** 1 … 4 5 6 … 12 — ilk ve son sayfa her zaman görünür. */
function pageItems(page: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: (number | 'gap')[] = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(total - 1, page + 1)
  if (from > 2) items.push('gap')
  for (let i = from; i <= to; i++) items.push(i)
  if (to < total - 1) items.push('gap')
  items.push(total)
  return items
}

const PAGE_SIZES = [10, 20, 50]

/**
 * `AlertDialog.CloseTrigger` zaten bir düğme; içlerine `Button` koymak yerine
 * buton stilini sınıf olarak veriyoruz (aynı yaklaşım HeroUI'nin kendi örneklerinde de var).
 */

/**
 * Sıralanabilir başlık.
 *
 * Önce `sortableHeader(label)` her render'da **yeni bir bileşen türü** üretiyordu; React bunu
 * farklı bir tip sayıp başlık hücrelerini her seferinde söküp yeniden kuruyordu. Artık tek bir
 * sabit bileşen var, etiket prop olarak geçiyor.
 */
const SortableHeader = memo(function SortableHeader({
  label,
  sortDirection,
}: {
  label: string
  sortDirection?: 'ascending' | 'descending'
}) {
  return (
    <Table.SortableColumnHeader sortDirection={sortDirection}>
      <Typography type="body-xs" weight="medium" color="muted" truncate title={label}>
        {label}
      </Typography>
    </Table.SortableColumnHeader>
  )
})

const sortableHeader =
  (label: string) =>
  ({ sortDirection }: { sortDirection?: 'ascending' | 'descending' }) => (
    <SortableHeader label={label} sortDirection={sortDirection} />
  )

/* -------------------------------------------------------------------------------------------------
 * Satır
 *
 * `memo`: tabloda tek bir şey değişse bile (arama kutusuna bir harf, bir satırın seçilmesi,
 * sayfa değişimi) bütün satırların yeniden render edilmesi en pahalı iş. Satır yalnızca kendi
 * prop'ları değişince render olsun diye dışarıdan gelen her geri çağrı `useCallback` ile sabit
 * tutuluyor; `draft` de yalnızca düzenlenen satıra veriliyor, diğerlerine `null`.
 * ------------------------------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------------------------------
 * Filtre satırı
 *
 * `memo`: satırın içinde yedi karmaşık alan (iki tarih seçici, üç sayı alanı, bir select, bir
 * metin alanı) ve yedi işlem seçici var. Sayfa değişimi, seçim ya da satır düzenleme gibi
 * filtrelerle ilgisi olmayan her güncellemede bunların hepsini yeniden render etmek tablodaki
 * en pahalı işlerden biriydi.
 * ------------------------------------------------------------------------------------------------- */

/** Başlık satırı tamamen durağan; sıralama durumunu RAC kendi içinde taşıyor. */
const GridHeader = memo(function GridHeader() {
  return (
    <Table.Header className="sticky top-0 z-10">
      <Table.Column className={COL_SELECT}>
        <Checkbox aria-label="Sayfadaki tümünü seç" slot="selection" variant="secondary">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Content>
        </Checkbox>
      </Table.Column>
      <Table.Column className={COL_ACTIONS}>
        <Typography type="body-xs" weight="medium" color="muted">
          İşlemler
        </Typography>
      </Table.Column>
      <Table.Column id="requestNo" isRowHeader allowsSorting className={cn('w-[13%]', CELL)}>
        {sortableHeader('İstek No')}
      </Table.Column>
      <Table.Column id="starter" allowsSorting className={cn('w-[12%]', CELL)}>
        {sortableHeader('Süreci Başlatan')}
      </Table.Column>
      <Table.Column id="status" allowsSorting className={cn('w-[11%]', CELL)}>
        {sortableHeader('Durum')}
      </Table.Column>
      <Table.Column id="processStart" allowsSorting className={cn('w-[15%]', CELL)}>
        {sortableHeader('Süreç Başlangıcı')}
      </Table.Column>
      <Table.Column id="requestDate" allowsSorting className={cn('w-[13%]', CELL)}>
        {sortableHeader('İstek Tarihi')}
      </Table.Column>
      <Table.Column id="amount" allowsSorting className={cn('w-[14%]', CELL)}>
        {sortableHeader('Tutar')}
      </Table.Column>
      <Table.Column id="progress" allowsSorting className={CELL}>
        {sortableHeader('İlerleme')}
      </Table.Column>
    </Table.Header>
  )
})

/**
 * Sayfalama şeridi. `memo`: filtre yazarken ya da satır düzenlerken sayfa bilgisi değişmiyor,
 * ama her render'da sayfa düğmeleri ve sayfa boyutu select'i yeniden kuruluyordu.
 */
interface GridFooterProps {
  page: number
  pages: (number | 'gap')[]
  totalPages: number
  totalRows: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const GridFooter = memo(function GridFooter({
  page,
  pages,
  totalPages,
  totalRows,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: GridFooterProps) {
  /**
   * Dışarıdan gelen sayfa boyutu hazır seçeneklerden biri olmayabilir (ör. `defaultPageSize: 5`);
   * listede yoksa Select eşleşme bulamayıp yer tutucu gösteriyordu.
   */
  const boyutlar = useMemo(
    () =>
      PAGE_SIZES.includes(pageSize) ? PAGE_SIZES : [...PAGE_SIZES, pageSize].sort((a, b) => a - b),
    [pageSize],
  )
  // `.pagination` zaten w-full + justify-between: Summary solda, Content sağda
  return (
    <Pagination aria-label="Sayfalar" size="sm" className="px-1">
      <Pagination.Summary>
        {/* Yuvarlaklık sayfa düğmeleriyle aynı olsun: onlar `rounded-3xl` + `size-8`, yani daire */}
        <Select
          aria-label="Sayfa boyutu"
          className="w-26"
          value={String(pageSize)}
          onChange={(v) => v && onPageSizeChange(Number(v))}
        >
          <Select.Trigger className="h-8 min-h-0 items-center rounded-full py-1 pe-8">
            <Select.Value />
            <FieldSelectIndicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Sayfa boyutu seçenekleri">
              {boyutlar.map((n) => (
                <ListBox.Item key={n} id={String(n)} textValue={`${n} satır`}>
                  {n} satır
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Typography type="body-xs" color="muted" className="tabular-nums">
          {totalRows} kayıt
        </Typography>
      </Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            aria-label="Önceki sayfa"
            isDisabled={page <= 1}
            onPress={() => onPageChange(page - 1)}
          >
            <Pagination.PreviousIcon />
          </Pagination.Previous>
        </Pagination.Item>
        {pages.map((it, i) =>
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
                onPress={() => onPageChange(it)}
              >
                {it}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}
        <Pagination.Item>
          <Pagination.Next
            aria-label="Sonraki sayfa"
            isDisabled={page >= totalPages}
            onPress={() => onPageChange(page + 1)}
          >
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  )
})

interface FilterRowProps {
  filters: Filters
  activeFilterCount: number
  onClearFilters: () => void
  onRowTabKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  /** Kolon başına sabit tutulan geri çağrılar; hücrelerin memo'su bunlara dayanıyor. */
  valueHandlers: FilterHandlers
  opHandlers: FilterOpHandlers
  keyDownHandlers: Record<keyof Filters, (e: KeyboardEvent<HTMLElement>) => void>
}

type FilterHandlers = {
  [K in keyof Filters]: (value: Filters[K]['value']) => void
}
type FilterOpHandlers = {
  [K in keyof Filters]: (op: Filters[K]['op']) => void
}

/**
 * Filtre hücreleri tek tek memo'lu.
 *
 * Tek bir `FilterRow` yeterli değildi: bir alana harf yazmak `filters` nesnesini değiştirdiği
 * için satırın yedi alanı birden yeniden render oluyordu. Her hücre artık yalnızca kendi
 * `{ op, value }` dilimini ve kimliği sabit üç geri çağrıyı alıyor.
 */

interface FilterCellProps<Op extends string, Value> {
  label: string
  state: FilterState<Op, Value>
  operators: { id: Op; label: string }[]
  onValueChange: (value: Value) => void
  onOpChange: (op: Op) => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
}

/** Sayı filtreleri (İstek No, Tutar, İlerleme) — biçim ve sınırlar dışarıdan. */
const NumberFilterCell = memo(function NumberFilterCell({
  label,
  state,
  operators,
  onValueChange,
  onOpChange,
  onKeyDown,
  minValue,
  maxValue,
  step,
  formatOptions,
}: FilterCellProps<NumberOperator, number | null> & {
  minValue?: number
  maxValue?: number
  step?: number
  formatOptions?: Intl.NumberFormatOptions
}) {
  return (
    <Surface variant="transparent" className={FILTER_CELL} onKeyDown={onKeyDown}>
      <NumberBox
        aria-label={`${label} filtresi`}
        className={FILTER_FIELD}
        compact
        isClearable
        prefix={
          <FilterOperator
            label={label}
            operators={operators}
            value={state.op}
            onChange={onOpChange}
          />
        }
        value={state.value}
        onChange={onValueChange}
        showControls={false}
        minValue={minValue}
        maxValue={maxValue}
        step={step}
        formatOptions={formatOptions}
      />
    </Surface>
  )
})

/** Tarih filtreleri (Süreç Başlangıcı, İstek Tarihi) — gün çözünürlüğünde karşılaştırılır. */
const DateFilterCell = memo(function DateFilterCell({
  label,
  state,
  operators,
  onValueChange,
  onOpChange,
  onKeyDown,
}: FilterCellProps<DateOperator, CalendarDateTime | null>) {
  return (
    <Surface variant="transparent" className={FILTER_CELL} onKeyDown={onKeyDown}>
      <DateTimePicker
        aria-label={`${label} filtresi`}
        className={FILTER_FIELD}
        compact
        prefix={
          <FilterOperator
            label={label}
            operators={operators}
            value={state.op}
            onChange={onOpChange}
          />
        }
        value={state.value}
        onChange={onValueChange}
        showTime={false}
      />
    </Surface>
  )
})

/** Metin filtresi (Süreci Başlatan). */
const TextFilterCell = memo(function TextFilterCell({
  label,
  state,
  operators,
  onValueChange,
  onOpChange,
  onKeyDown,
}: FilterCellProps<TextOperator, string>) {
  const temizle = useCallback(() => onValueChange(''), [onValueChange])
  return (
    <Surface variant="transparent" className={FILTER_CELL} onKeyDown={onKeyDown}>
      <TextField
        fullWidth
        className={FILTER_FIELD}
        aria-label={`${label} filtresi`}
        value={state.value}
        onChange={onValueChange}
      >
        <InputGroup className="h-8 min-h-0 w-full">
          {/* Ayraç seçicinin kendi bitiş kenarlığından geliyor; prefix kendi kenarlığını çizmesin */}
          <InputGroup.Prefix className="border-0 px-0">
            <FilterOperator
              label={label}
              operators={operators}
              value={state.op}
              onChange={onOpChange}
            />
          </InputGroup.Prefix>
          {/*
            `min-w-0 flex-1`: daralabilmeli, yoksa sonek (temizle düğmesi) kutunun dışına taşıyor.
            `ps-3`: HeroUI prefix varken input'un başlangıç dolgusunu sıfırlıyor
            (`.input-group:has(prefix) .input-group__input { ps-0 }`) çünkü normalde boşluğu
            prefix'in kendi `px-3`'ü verir — biz onu `px-0` yaptığımız için dolguyu geri veriyoruz.
          */}
          <InputGroup.Input className="min-w-0 flex-1 py-1 ps-3" />
          {state.value !== '' && (
            <InputGroup.Suffix className={FIELD_AFFIX}>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={`${label} filtresini temizle`}
                className={FIELD_ICON_BUTTON}
                onPress={temizle}
              >
                <X size={FIELD_ICON_SIZE} aria-hidden />
              </Button>
            </InputGroup.Suffix>
          )}
        </InputGroup>
      </TextField>
    </Surface>
  )
})

/** Durum filtresi — işlem seçici tetikleyicinin üstüne bindirilmiş katman (bkz. README). */
const StatusFilterCell = memo(function StatusFilterCell({
  state,
  onValueChange,
  onOpChange,
  onKeyDown,
}: Omit<FilterCellProps<EnumOperator, Status | 'all'>, 'label' | 'operators'>) {
  const secim = useCallback(
    (v: string | number | null) => onValueChange((v ?? 'all') as Status | 'all'),
    [onValueChange],
  )
  return (
    <Surface variant="transparent" className={cn(FILTER_CELL, 'relative')} onKeyDown={onKeyDown}>
      <Select
        aria-label="Durum filtresi"
        className={FILTER_FIELD}
        value={state.value}
        onChange={secim}
        fullWidth
      >
        <Select.Trigger className="h-8 min-h-0 items-center py-1 pe-8 ps-10">
          <Select.Value />
          {/* "Tümü" zaten filtresiz demek; temizle yalnızca gerçek bir seçim varken */}
          {/* `Select.ClearButton` bir `span`; `Button` koyamayız — RAC'in `ButtonContext`i
              onu tetikleyiciye çevirirdi. Görünümü `buttonVariants` ile eşitliyoruz. */}
          {state.value !== 'all' && (
            <Select.ClearButton className={fieldIconButton}>
              <X size={FIELD_ICON_SIZE} aria-hidden />
            </Select.ClearButton>
          )}
          <FieldSelectIndicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label="Durum filtresi seçenekleri">
            <ListBox.Item id="all" textValue="Tümü">
              Tümü
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {(Object.keys(statusMeta) as Status[]).map((st) => (
              <ListBox.Item key={st} id={st} textValue={statusMeta[st].label}>
                {statusMeta[st].label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <Surface variant="transparent" className="absolute start-0 top-1/2 z-10 -translate-y-1/2">
        <FilterOperator
          label="Durum"
          operators={enumOperators}
          value={state.op}
          onChange={onOpChange}
        />
      </Surface>
    </Surface>
  )
})

const AMOUNT_FORMAT: Intl.NumberFormatOptions = {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
}
const REQUEST_NO_FORMAT: Intl.NumberFormatOptions = { useGrouping: false, maximumFractionDigits: 0 }

const FilterRow = memo(function FilterRow({
  filters,
  activeFilterCount,
  onClearFilters,
  onRowTabKeyDown,
  valueHandlers,
  opHandlers,
  keyDownHandlers,
}: FilterRowProps) {
  return (
    <Table.Row id={FILTER_ROW_ID} textValue="Filtreler" className={cn(ROW, NO_HOVER)}>
      {/* Seçim kolonu filtre satırında boş kalır */}
      <Table.Cell className={CELL_SELECT} />
      <Table.Cell className={CELL_ACTIONS}>
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label="Filtreleri temizle"
          className={ICON_MUTED}
          isDisabled={activeFilterCount === 0}
          onPress={onClearFilters}
          onKeyDown={onRowTabKeyDown}
        >
          <FilterX size={FIELD_ICON_SIZE} aria-hidden />
        </Button>
      </Table.Cell>

      <Table.Cell className={CELL}>
        <NumberFilterCell
          label="İstek No"
          state={filters.requestNo}
          operators={numberOperators}
          onValueChange={valueHandlers.requestNo}
          onOpChange={opHandlers.requestNo}
          onKeyDown={keyDownHandlers.requestNo}
          minValue={0}
          formatOptions={REQUEST_NO_FORMAT}
        />
      </Table.Cell>

      <Table.Cell className={CELL}>
        <TextFilterCell
          label="Süreci Başlatan"
          state={filters.starter}
          operators={textOperators}
          onValueChange={valueHandlers.starter}
          onOpChange={opHandlers.starter}
          onKeyDown={keyDownHandlers.starter}
        />
      </Table.Cell>

      <Table.Cell className={CELL}>
        <StatusFilterCell
          state={filters.status}
          onValueChange={valueHandlers.status}
          onOpChange={opHandlers.status}
          onKeyDown={keyDownHandlers.status}
        />
      </Table.Cell>

      {/* Tarih filtreleri gün çözünürlüğünde karşılaştırılır (bkz. useDataGrid) */}
      <Table.Cell className={CELL}>
        <DateFilterCell
          label="Süreç Başlangıcı"
          state={filters.processStart}
          operators={dateOperators}
          onValueChange={valueHandlers.processStart}
          onOpChange={opHandlers.processStart}
          onKeyDown={keyDownHandlers.processStart}
        />
      </Table.Cell>

      <Table.Cell className={CELL}>
        <DateFilterCell
          label="İstek Tarihi"
          state={filters.requestDate}
          operators={dateOperators}
          onValueChange={valueHandlers.requestDate}
          onOpChange={opHandlers.requestDate}
          onKeyDown={keyDownHandlers.requestDate}
        />
      </Table.Cell>

      <Table.Cell className={CELL}>
        <NumberFilterCell
          label="Tutar"
          state={filters.amount}
          operators={numberOperators}
          onValueChange={valueHandlers.amount}
          onOpChange={opHandlers.amount}
          onKeyDown={keyDownHandlers.amount}
          minValue={0}
          step={500}
          formatOptions={AMOUNT_FORMAT}
        />
      </Table.Cell>

      <Table.Cell className={CELL}>
        <NumberFilterCell
          label="İlerleme"
          state={filters.progress}
          operators={numberOperators}
          onValueChange={valueHandlers.progress}
          onOpChange={opHandlers.progress}
          onKeyDown={keyDownHandlers.progress}
          minValue={0}
          maxValue={100}
          step={5}
          formatOptions={PERCENT_FORMAT}
        />
      </Table.Cell>
    </Table.Row>
  )
})

interface DataGridRowProps {
  row: Request
  search: string
  /** Yalnızca bu satır düzenleniyorsa dolu; diğer satırlar için `null`. */
  draft: Request | null
  /** Düzenleyiciler hep açık: taslak yerine satırın kendisi düzenlenir. */
  alwaysEditing: boolean
  onDraftChange: (draft: Request) => void
  onRowChange: (row: Request) => void
  onStartEdit: (row: Request) => void
  /** Onay diyaloğunu açar; silme işini tablo düzeyindeki tek diyalog yapar. */
  onRequestDelete: (row: Request) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onRowTabKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  onEditKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  onFieldKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  registerEditButton?: (id: string, el: HTMLButtonElement | null) => void
}

const DataGridRow = memo(function DataGridRow({
  row: r,
  search,
  draft,
  alwaysEditing,
  onDraftChange,
  onRowChange,
  onStartEdit,
  onRequestDelete,
  onSaveEdit,
  onCancelEdit,
  onRowTabKeyDown,
  onEditKeyDown,
  onFieldKeyDown,
  registerEditButton,
}: DataGridRowProps) {
  // Hep-açık modda satırın kendisi düzenlenir; normalde yalnızca taslağı olan satır
  const taslak = alwaysEditing ? r : draft
  const editing = taslak != null
  const yaz = useCallback(
    (next: Request) => (alwaysEditing ? onRowChange(next) : onDraftChange(next)),
    [alwaysEditing, onDraftChange, onRowChange],
  )
  // Aramanın taradığı metinlerin aynısı; vurgulama ile filtre hiç ayrışmasın
  const cells = useMemo(() => rowCells(r), [r])

  const kaydetDugmeRef = useCallback(
    (el: HTMLButtonElement | null) => registerEditButton?.(r.id, el),
    [registerEditButton, r.id],
  )
  const duzenlemeyiAc = useCallback(() => onStartEdit(r), [onStartEdit, r])
  const sil = useCallback(() => onRequestDelete(r), [onRequestDelete, r])

  const silDugmesi = (
    <Tooltip>
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        aria-label={`#${r.requestNo} satırını sil`}
        // Diğer ikon düğmeleriyle aynı ton; tehlike rengi yalnızca etkileşimde
        className={cn(ICON_MUTED, 'hover:text-danger')}
        onPress={sil}
      >
        <Trash2 size={FIELD_ICON_SIZE} aria-hidden />
      </Button>
      <Tooltip.Content>Satırı sil</Tooltip.Content>
    </Tooltip>
  )

  return (
    <Table.Row
      key={r.id}
      id={r.id}
      textValue={`#${r.requestNo}, ${r.starter}, ${statusMeta[r.status].label}`}
      // Düzenleme ve seçim zeminleri çakışmasın; biri kazansın
      className={cn(
        ROW,
        ROW_CORNERS,
        // Hep-açık modda bütün satırlar düzenlemede; vurgu seçime kalsın
        editing && !alwaysEditing ? EDIT_ROW_BG : SELECTED_ROW_BG,
      )}
    >
      {/* Seçim */}
      <Table.Cell className={CELL_SELECT}>
        <Checkbox aria-label={`#${r.requestNo} seç`} slot="selection" variant="secondary">
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Content>
        </Checkbox>
      </Table.Cell>

      {/* İşlemler — düzenlemede kaydet/vazgeç, normalde düzenle/sil, hep-açık modda yalnızca sil */}
      <Table.Cell className={CELL_ACTIONS}>
        <Surface
          variant="transparent"
          role="group"
          aria-label={`#${r.requestNo} işlemleri`}
          className="flex items-center gap-1"
        >
          {alwaysEditing ? (
            // Hep-açık modda düzenle/kaydet/vazgeç anlamsız; yalnızca silme kalıyor
            silDugmesi
          ) : editing ? (
            <>
              <Button
                size="sm"
                variant="primary"
                isIconOnly
                aria-label="Kaydet (Enter)"
                onPress={onSaveEdit}
                onKeyDown={onRowTabKeyDown}
              >
                <Check size={16} aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Vazgeç (Escape)"
                onPress={onCancelEdit}
                onKeyDown={onRowTabKeyDown}
              >
                <X size={16} aria-hidden />
              </Button>
            </>
          ) : (
            <>
              <Tooltip>
                <Button
                  ref={kaydetDugmeRef}
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label={`#${r.requestNo} satırını düzenle`}
                  className={ICON_MUTED}
                  onPress={duzenlemeyiAc}
                >
                  <Pencil size={FIELD_ICON_SIZE} aria-hidden />
                </Button>
                <Tooltip.Content>Satırı düzenle</Tooltip.Content>
              </Tooltip>
              {silDugmesi}
            </>
          )}
        </Surface>
      </Table.Cell>

      {/* İstek No */}
      <Table.Cell className={CELL}>
        {editing ? (
          <Surface variant="transparent" onKeyDown={onFieldKeyDown}>
            <NumberBox
              aria-label="İstek No"
              className={FIELD}
              compact
              isClearable
              value={taslak.requestNo}
              onChange={(v) => yaz({ ...taslak, requestNo: v })}
              minValue={0}
              formatOptions={{ useGrouping: false, maximumFractionDigits: 0 }}
            />
          </Surface>
        ) : (
          <CellText
            text={cells.requestNo}
            query={search}
            weight="medium"
            className="tabular-nums"
          />
        )}
      </Table.Cell>

      {/* Süreci Başlatan */}
      <Table.Cell className={CELL}>
        {editing ? (
          <TextField
            fullWidth
            aria-label="Süreci Başlatan"
            value={taslak.starter}
            onChange={(v) => yaz({ ...taslak, starter: v })}
            onKeyDown={onEditKeyDown}
          >
            <InputGroup className="h-8 min-h-0 w-full">
              <InputGroup.Input className="min-w-0 flex-1 py-1" />
              {taslak.starter !== '' && (
                <InputGroup.Suffix className={FIELD_AFFIX}>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label="Süreci Başlatan'ı temizle"
                    className={FIELD_ICON_BUTTON}
                    onPress={() => yaz({ ...taslak, starter: '' })}
                  >
                    <X size={FIELD_ICON_SIZE} aria-hidden />
                  </Button>
                </InputGroup.Suffix>
              )}
            </InputGroup>
          </TextField>
        ) : (
          <Surface variant="transparent" className="flex min-w-0 items-center gap-2">
            <Avatar size="sm" variant="soft" aria-hidden>
              <Avatar.Fallback>{initials(r.starter)}</Avatar.Fallback>
            </Avatar>
            <CellText text={cells.starter} query={search} />
          </Surface>
        )}
      </Table.Cell>

      {/* Durum */}
      <Table.Cell className={CELL}>
        {editing ? (
          <Select
            aria-label="Durum"
            value={taslak.status}
            onChange={(v) => v && yaz({ ...taslak, status: v as Status })}
            fullWidth
          >
            <Select.Trigger
              onKeyDown={onRowTabKeyDown}
              className="h-8 min-h-0 items-center py-1 pe-8"
            >
              <Select.Value />
              <FieldSelectIndicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox aria-label="Durum seçenekleri">
                {(Object.keys(statusMeta) as Status[]).map((s) => (
                  <ListBox.Item key={s} id={s} textValue={statusMeta[s].label}>
                    {statusMeta[s].label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        ) : (
          <Tooltip delay={500}>
            <Tooltip.Trigger className="w-fit" tabIndex={-1}>
              <Chip size="sm" variant="soft" color={statusMeta[r.status].color}>
                <Highlight text={cells.status} query={search} />
              </Chip>
            </Tooltip.Trigger>
            <Tooltip.Content>{cells.status}</Tooltip.Content>
          </Tooltip>
        )}
      </Table.Cell>

      {/* Süreç Başlangıcı — düzenlemede saatli DateTimePicker */}
      <Table.Cell className={CELL}>
        {editing ? (
          <Surface variant="transparent" onKeyDown={onFieldKeyDown}>
            <DateTimePicker
              aria-label="Süreç Başlangıcı"
              className={FIELD}
              compact
              value={taslak.processStart}
              onChange={(v) => yaz({ ...taslak, processStart: v })}
            />
          </Surface>
        ) : (
          <CellText
            text={cells.processStart}
            query={search}
            color="muted"
            className="tabular-nums"
          />
        )}
      </Table.Cell>

      {/* İstek Tarihi — saatsiz */}
      <Table.Cell className={CELL}>
        {editing ? (
          <Surface variant="transparent" onKeyDown={onFieldKeyDown}>
            <DateTimePicker
              aria-label="İstek Tarihi"
              className={FIELD}
              compact
              value={taslak.requestDate}
              onChange={(v) => yaz({ ...taslak, requestDate: v })}
              showTime={false}
            />
          </Surface>
        ) : (
          <CellText
            text={cells.requestDate}
            query={search}
            color="muted"
            className="tabular-nums"
          />
        )}
      </Table.Cell>

      {/* Tutar — düzenlemede NumberBox */}
      <Table.Cell className={CELL}>
        {editing ? (
          <Surface variant="transparent" onKeyDown={onFieldKeyDown}>
            <NumberBox
              aria-label="Tutar"
              className={FIELD}
              compact
              isClearable
              value={taslak.amount}
              onChange={(v) => yaz({ ...taslak, amount: v })}
              step={500}
              minValue={0}
              formatOptions={{
                style: 'currency',
                currency: 'TRY',
                maximumFractionDigits: 0,
              }}
            />
          </Surface>
        ) : (
          <CellText text={cells.amount} query={search} className="tabular-nums" />
        )}
      </Table.Cell>

      {/* İlerleme — düzenlemede NumberBox, görüntüde çubuk */}
      <Table.Cell className={CELL}>
        {editing ? (
          <Surface variant="transparent" onKeyDown={onFieldKeyDown}>
            <NumberBox
              aria-label="İlerleme"
              className={FIELD}
              compact
              isClearable
              value={taslak.progress}
              onChange={(v) => yaz({ ...taslak, progress: v })}
              step={5}
              minValue={0}
              maxValue={100}
              formatOptions={PERCENT_FORMAT}
            />
          </Surface>
        ) : (
          <ProgressBar
            aria-label={`#${r.requestNo} ilerleme`}
            value={r.progress ?? 0}
            size="sm"
            color={r.progress === 100 ? 'success' : 'accent'}
            className="gap-1"
          >
            <Typography type="body-xs" color="muted" className="tabular-nums">
              <Highlight text={cells.progress} query={search} />
            </Typography>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        )}
      </Table.Cell>
    </Table.Row>
  )
})

export interface DataGridProps {
  id?: string
  className?: string
  'aria-label': string
  'aria-describedby'?: string

  /** Filtre, arama, sıralama ve sayfalama uygulanmış satırlar. */
  rows: Request[]
  activeFilterCount: number

  /**
   * Genel arama terimi. Alanın kendisi widget başlığında durur; burada yalnızca eşleşmeleri
   * hücrede boyamak için kullanılır.
   */
  search: string
  /** Filtre + arama sonrası toplam kayıt (sayfalanmadan önce). */
  totalRows: number

  page: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize: number
  onPageSizeChange: (size: number) => void

  filters: Filters
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]['value']) => void
  onFilterOperatorChange: <K extends keyof Filters>(key: K, op: Filters[K]['op']) => void
  onClearFilters: () => void

  sort: SortDescriptor
  onSortChange: (sort: SortDescriptor) => void

  selectedKeys: Selection
  onSelectionChange: (keys: Selection) => void
  /** Filtre ve boş durum satırlarının anahtarları; seçilemezler. */
  disabledKeys: string[]

  /**
   * Satır içi düzenleyiciler hep açık kalsın. Bu modda taslak yoktur: değişiklikler doğrudan
   * satıra yazılır, düzenle / kaydet / vazgeç düğmeleri görünmez.
   */
  showEditorAlways?: boolean

  editingId: string | null
  draft: Request | null
  onDraftChange: (draft: Request) => void
  /** `showEditorAlways` modunda değişiklikleri doğrudan yazar. */
  onRowChange: (row: Request) => void
  onStartEdit: (row: Request) => void
  onDeleteRow: (row: Request) => void
  onSaveEdit: () => void
  onCancelEdit: () => void

  /** Odak geri dönüşü için düğme kayıtları; durumu tutan taraf (bkz. `useDataGrid`) doldurur. */
  editButtonRefs?: RefObject<Map<string, HTMLButtonElement>>
}

/**
 * DevExtreme tarzı veri tablosu: canlı filtre satırı, sıralanabilir başlıklar, çoklu seçim ve
 * satır içi düzenleme. Kendi durumu yoktur; hepsi prop'tan gelir.
 */
export function DataGrid({
  id,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  rows,
  activeFilterCount,
  search,
  totalRows,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  filters,
  onFilterChange,
  onFilterOperatorChange,
  onClearFilters,
  sort,
  onSortChange,
  selectedKeys,
  onSelectionChange,
  disabledKeys,
  showEditorAlways = false,
  editingId,
  draft,
  onDraftChange,
  onRowChange,
  onStartEdit,
  onDeleteRow,
  onSaveEdit,
  onCancelEdit,
  editButtonRefs,
}: DataGridProps) {
  /**
   * RAC Table bir ARIA grid'dir: Tab yalnızca aynı hücre içinde dolaşır, hücrede başka odaklanabilir
   * öğe yoksa tabloyu terk eder. Filtre ve düzenleme satırlarında Tab/Shift+Tab'ı aynı satırın
   * alanları arasında dolaştırıyoruz; ok tuşlarıyla hücre gezinmesi olduğu gibi kalır.
   */
  const onRowTabKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab') return
    const target = e.target as HTMLElement
    const row = target.closest<HTMLElement>('[role="row"]')
    if (!row) return
    const focusables = [
      ...row.querySelectorAll<HTMLElement>('input, button, [tabindex="0"]'),
    ].filter(
      (el) =>
        el.tabIndex >= 0 &&
        !el.hasAttribute('disabled') &&
        // Hücrenin kendisi değil, içindeki denetimler: RAC gezinme için etkin hücreye de
        // `tabindex=0` veriyor, o da sıraya karışıyordu.
        !el.matches('td, th, [role="gridcell"], [role="rowheader"]') &&
        // React Aria'nın gizli doğrulama input'u `hidden` + `display:none` ama `tabIndex` 0;
        // odaklanamadığı için `focus()` sessizce başarısız oluyor ve odak yerinde kalıyordu.
        el.getClientRects().length > 0 &&
        !el.closest('[aria-hidden="true"]'),
    )
    const i = focusables.indexOf(target)
    const next = focusables[i + (e.shiftKey ? -1 : 1)]
    if (next) {
      e.preventDefault()
      e.stopPropagation()
      next.focus()
    }
  }, [])

  /** Düzenleme alanlarında Enter kaydeder, Escape vazgeçer, Tab satır içinde dolaşır. */
  const onEditKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSaveEdit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancelEdit()
      } else {
        onRowTabKeyDown(e)
      }
    },
    [onCancelEdit, onRowTabKeyDown, onSaveEdit],
  )

  /**
   * Tarih/sayı alanları kendi tuşlarını yönetir (segment okları, artırma/azaltma). Enter ve
   * Escape'i yine satır düzeyinde yakalıyoruz ama alanın kendi işini bozmuyoruz.
   */
  const onFieldKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') onEditKeyDown(e)
    },
    [onEditKeyDown],
  )

  /**
   * Filtre alanlarında Escape alanı temizler, Tab satır içinde dolaşır.
   *
   * Kolon başına bir kez üretilip saklanıyor: her render'da yeni fonksiyon üretmek filtre
   * hücrelerinin memo'sunu boşa düşürüyordu.
   */
  const filterKeyDownHandlers = useMemo(() => {
    const keys = Object.keys(emptyFilters) as (keyof Filters)[]
    return Object.fromEntries(
      keys.map((key) => [
        key,
        (e: KeyboardEvent<HTMLElement>) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onFilterChange(key, emptyFilters[key].value)
          } else {
            onRowTabKeyDown(e)
          }
        },
      ]),
    ) as Record<keyof Filters, (e: KeyboardEvent<HTMLElement>) => void>
  }, [onFilterChange, onRowTabKeyDown])
  /** Kolon başına sabit değer ve işlem geri çağrıları; filtre hücrelerinin memo'su bunlara bağlı. */
  const filterValueHandlers = useMemo(() => {
    const keys = Object.keys(emptyFilters) as (keyof Filters)[]
    return Object.fromEntries(
      keys.map((key) => [key, (value: unknown) => onFilterChange(key, value as never)]),
    ) as FilterHandlers
  }, [onFilterChange])

  const filterOpHandlers = useMemo(() => {
    const keys = Object.keys(emptyFilters) as (keyof Filters)[]
    return Object.fromEntries(
      keys.map((key) => [key, (op: unknown) => onFilterOperatorChange(key, op as never)]),
    ) as FilterOpHandlers
  }, [onFilterOperatorChange])

  /** Odak geri dönüşü için kalem düğmelerini kaydeder; kimliği sabit olsun ki satırlar memo kalsın. */
  const registerEditButton = useCallback(
    (rowId: string, el: HTMLButtonElement | null) => {
      if (!editButtonRefs) return
      if (el) editButtonRefs.current.set(rowId, el)
      else editButtonRefs.current.delete(rowId)
    },
    [editButtonRefs],
  )

  /**
   * Silme onayı için tablo düzeyinde **tek** diyalog. Önce her satır kendi `AlertDialog`ını
   * kuruyordu; on satır = on diyalog ağacı, hepsi her render'da yeniden kuruluyordu.
   * Burada tutulan tek durum bu: hangi satır için onay soruluyor.
   */
  const [silinecek, setSilinecek] = useState<Request | null>(null)
  /**
   * Diyaloğu açan düğme. RAC odağı kendi tetikleyicisine geri verir ama bizim tetikleyicimiz
   * kökteki görünmez yer tutucu; onu odaklayamadığı için odak hücreye düşüyordu.
   */
  const silTetikleyici = useRef<HTMLElement | null>(null)

  const requestDelete = useCallback((row: Request) => {
    silTetikleyici.current = document.activeElement as HTMLElement | null
    setSilinecek(row)
  }, [])

  const silmeyiKapat = useCallback(() => {
    setSilinecek(null)
    const el = silTetikleyici.current
    silTetikleyici.current = null
    // Kapanma odağı geri alabiliyor; bir kare sonra veriyoruz
    if (el?.isConnected) requestAnimationFrame(() => el.focus())
  }, [])

  const silmeyiOnayla = useCallback(() => {
    if (silinecek) onDeleteRow(silinecek)
    // Satır kalkıyor: tetikleyici artık DOM'da yok, odağı geri vermeye çalışmıyoruz
    silTetikleyici.current = null
    setSilinecek(null)
  }, [onDeleteRow, silinecek])

  const pages = useMemo(() => pageItems(page, totalPages), [page, totalPages])

  return (
    <Surface variant="transparent" className={cn('flex min-h-0 w-full flex-col gap-3', className)}>
      {/* secondary: kök arka plansız; başlık kendi şeridi, satırlar yalnızca alt çizgili */}
      <Table id={id} variant="secondary" className="min-h-0 w-full flex-1">
        <Table.ScrollContainer className="h-full overflow-auto">
          <Table.Content
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            // Kabı kaplar; sütunlar sığmazsa yatay kaydırılır
            className={cn('w-full min-w-[104rem] table-auto', DIVIDERS, ROW_GAP)}
            sortDescriptor={sort}
            onSortChange={onSortChange}
            selectionMode="multiple"
            selectedKeys={selectedKeys}
            onSelectionChange={onSelectionChange}
            disabledKeys={disabledKeys}
            disabledBehavior="selection"
          >
            <GridHeader />

            <Table.Body>
              {/* ---- Canlı filtre satırı (DevExtreme filter row) ---- */}
              <FilterRow
                filters={filters}
                activeFilterCount={activeFilterCount}
                onClearFilters={onClearFilters}
                onRowTabKeyDown={onRowTabKeyDown}
                valueHandlers={filterValueHandlers}
                opHandlers={filterOpHandlers}
                keyDownHandlers={filterKeyDownHandlers}
              />

              {/* ---- Boş durum: filtre satırı gövdeyi hiç boş bırakmadığı için kendimiz çiziyoruz ---- */}
              {rows.length === 0 && (
                <Table.Row id={EMPTY_ROW_ID} textValue="Kayıt yok" className={NO_HOVER}>
                  <Table.Cell colSpan={9}>
                    <EmptyState className="py-16">
                      <Typography type="body-sm" color="muted" align="center">
                        Kayıt yok
                      </Typography>
                    </EmptyState>
                  </Table.Cell>
                </Table.Row>
              )}

              {/* ---- Satırlar ---- */}
              {rows.map((r) => (
                <DataGridRow
                  key={r.id}
                  row={r}
                  search={search}
                  draft={editingId === r.id ? draft : null}
                  alwaysEditing={showEditorAlways}
                  onDraftChange={onDraftChange}
                  onRowChange={onRowChange}
                  onStartEdit={onStartEdit}
                  onRequestDelete={requestDelete}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onRowTabKeyDown={onRowTabKeyDown}
                  onEditKeyDown={onEditKeyDown}
                  onFieldKeyDown={onFieldKeyDown}
                  registerEditButton={registerEditButton}
                />
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {/* Tek onay diyaloğu; tetikleyicisi satırlardaki çöp kutusu düğmeleri */}
      {/*
        Kök şart: `AlertDialog.Header` / `Body` / `Footer` düzen sınıflarını kökün sağladığı
        context'ten alıyor. Kökü atlayıp `Backdrop`ı denetleyince slot'lar boş kalıyor ve başlıkla
        düğmeler üst üste biniyordu.

        Kök aynı zamanda RAC'in `DialogTrigger`ıdır, ilk çocuğunu tetikleyici sayar ve pressable
        olmasını bekler ("PressResponder was rendered without a pressable child"). Gerçek
        tetikleyiciler satırlardaki çöp kutusu düğmeleri olduğu için buraya görünmez bir yer
        tutucu koyuyoruz.
      */}
      <AlertDialog isOpen={silinecek != null} onOpenChange={(acik) => !acik && silmeyiKapat()}>
        <AlertDialog.Trigger className="hidden" aria-hidden tabIndex={-1} />
        {/*
          `Backdrop` şart: RAC'in `ModalOverlay`ı odur ve diyaloğu ekrana sabitleyen katmandır.
          Yalnızca `Container` (RAC `Modal`) bırakılınca diyalog normal akışta, sayfanın en
          altında render oluyor — görünmüyor ama modal etkileşimi kilitliyordu.
        */}
        {/*
          `isKeyboardDismissDisabled` HeroUI'de varsayılan `true` (uyarı diyaloğu açık bir eylem
          bekler). Silme onayında Escape = "vazgeç", yani güvenli seçenek; açıkça izin veriyoruz.
        */}
        <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
          <AlertDialog.Container>
            <AlertDialog.Dialog role="alertdialog">
              <AlertDialog.Header>
                <AlertDialog.Heading>#{silinecek?.requestNo} silinsin mi?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <Typography type="body-sm" color="muted">
                  Bu işlem geri alınamaz.
                </Typography>
              </AlertDialog.Body>
              {/*
              `AlertDialog.CloseTrigger` köşedeki "×" düğmesidir (`absolute end-4 top-4`); alt
              şeritte kullanınca iki düğme üst üste biniyordu. Sıradan `Button` kullanıp diyaloğu
              durumdan kapatıyoruz.
            */}
              <AlertDialog.Footer className="justify-end gap-2">
                <Button size="sm" variant="ghost" onPress={silmeyiKapat}>
                  Vazgeç
                </Button>
                <Button size="sm" variant="danger" onPress={silmeyiOnayla}>
                  Sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <GridFooter
        page={page}
        pages={pages}
        totalPages={totalPages}
        totalRows={totalRows}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </Surface>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
