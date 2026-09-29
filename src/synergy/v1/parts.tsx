import type { ReactElement } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownUp } from 'lucide-react'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import { I18nProvider } from 'react-aria-components'
import { Avatar, Button, Calendar, Chip, DateField, DatePicker, Dropdown, EmptyState, Header, Label, SearchField, Tooltip, Typography, cn } from '@heroui/react'
import {
  SORT_LABELS,
  cellValue,
  formatDateTime,
  relative,
  sortFieldsFor,
  type Box as WorkBox,
  type Column,
  type DateRange,
  type RequestStatus,
  type SortDirection,
  type SortField,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { RANGE_LABELS } from '@/synergy/shared/range'
import { inline, timeOf } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'

/* Sayfaların ortak küçük parçaları (yalnızca HeroUI JSX'ini gruplayan yerel işlevler) */

/** lucide, 1.75 çizgi; listelerde 16px, bloklarda 20px. */
export const IC = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const
export const IC_BLOCK = { ...IC, size: 20 } as const

/** Hafif vurgulu bant: yüzeyle karışmış açık birincil ton (opak), koyu metin (tema paneli › Vurgu gücü). */
export const SOFT_BAND = 'bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))] text-foreground'

/** İpucu (içerik portal ile basılır). */
export function Tip({ label, children, placement = 'top' }: { label: string; children: ReactElement; placement?: 'top' | 'bottom' | 'right' | 'left' }) {
  return (
    <Tooltip delay={400}>
      {children}
      <Tooltip.Content placement={placement}>{label}</Tooltip.Content>
    </Tooltip>
  )
}

/** Birincil rengin yumuşak tonunda ikon dairesi. */
export function TintIcon({ icon: Icon, className, size = 'md' }: { icon: LucideIcon; className?: string; size?: 'sm' | 'md' }) {
  return (
    <Avatar variant="soft" color="accent" size={size} className={className}>
      <Avatar.Fallback>
        <Icon {...IC} size={size === 'sm' ? 16 : 18} />
      </Avatar.Fallback>
    </Avatar>
  )
}

/** "Ara" alanı. */
export function KaroSearch({ value, onChange, label = 'Ara', className }: { value: string; onChange: (v: string) => void; label?: string; className?: string }) {
  return (
    <SearchField value={value} onChange={onChange} aria-label={label} className={cn('min-w-0', className)}>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input placeholder={label} />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  )
}

export interface SortValue {
  field: SortField
  direction: SortDirection
}

/** Sıralama menüsü: Sıralama alanı + Yön (kutunun alanları, `sortFieldsFor`). */
export function SortMenu({
  box,
  sort,
  onSort,
  trigger = 'icon',
  className,
}: {
  box: WorkBox
  sort: SortValue
  onSort: (s: SortValue) => void
  trigger?: 'icon' | 'label'
  className?: string
}) {
  const fields = sortFieldsFor(box)
  const current = fields.find((f) => f.id === sort.field)?.label ?? SORT_LABELS.title
  const section = (key: keyof SortValue, title: string, items: { id: string; label: string }[]) => (
    <Dropdown.Section
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[sort[key]]}
      onSelectionChange={(keys) => {
        const [id] = keys === 'all' ? [] : [...keys]
        if (id) onSort({ ...sort, [key]: id })
      }}
    >
      <Header>{title}</Header>
      {items.map((it) => (
        <Dropdown.Item key={it.id} id={it.id} textValue={it.label}>
          <Dropdown.ItemIndicator />
          {it.label}
        </Dropdown.Item>
      ))}
    </Dropdown.Section>
  )
  return (
    <Dropdown>
      {trigger === 'icon' ? (
        <Tip label={SORT_LABELS.title}>
          <Button isIconOnly size="sm" variant="ghost" aria-label={SORT_LABELS.title} className={cn('size-9', className)}>
            <ArrowDownUp {...IC} />
          </Button>
        </Tip>
      ) : (
        <Button variant="secondary" aria-label={`${SORT_LABELS.title}: ${current}`} className={className}>
          <ArrowDownUp {...IC} />
          {current}
        </Button>
      )}
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={SORT_LABELS.title}>
          {section('field', SORT_LABELS.field, fields)}
          {section(
            'direction',
            SORT_LABELS.direction,
            (['ascending', 'descending'] as const).map((d) => ({ id: d, label: SORT_LABELS[d] })),
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

/** Durum çipi: sonuçlar dolu durum renginde (durum renkleri yalnızca burada), süren işler nötr. */
export function StatusChip({ status }: { status: RequestStatus }) {
  const done = status === 'Tamamlandı'
  const final = done || status === 'Reddedildi'
  return (
    <Chip size="sm" variant={final ? 'primary' : 'soft'} color={final ? (done ? 'success' : 'danger') : 'warning'}>
      {status}
    </Chip>
  )
}

/** Üst öğenin yazı tipini ve rengini alan satır içi metin. */
const PLAIN = 'text-current [font:inherit]'

/** Hücre: tarih göreli (ipucunda tam), durum çipi, boşsa "-". */
export function CellValue({ r, col }: { r: WorkRequest; col: Column }) {
  const v = cellValue(r, col.key)
  if (col.type === 'status' && typeof v === 'string') return <StatusChip status={v as RequestStatus} />
  if (v == null || v === '') return <Text tone="muted">-</Text>
  if (v instanceof Date)
    return (
      <Typography {...inline} {...timeOf(v)} title={formatDateTime(v)} className={cn(PLAIN, 'whitespace-nowrap')}>
        {relative(v)}
      </Typography>
    )
  if (col.key === 'ProcessId')
    return (
      <Typography {...inline} className="font-mono text-sm font-medium text-current">
        {String(v)}
      </Typography>
    )
  if (col.key === 'Subject')
    return (
      <Typography {...inline} data-item-title className={PLAIN}>
        {String(v)}
      </Typography>
    )
  return String(v)
}

/** Hücre karşılaştırması (sütun sıralaması). */
export function compareBy(a: WorkRequest, b: WorkRequest, key: string) {
  const x = cellValue(a, key)
  const y = cellValue(b, key)
  if (x == null) return y == null ? 0 : 1
  if (y == null) return -1
  if (x instanceof Date && y instanceof Date) return x.getTime() - y.getTime()
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y), 'tr', { numeric: true })
}

/** Boş durum: kısa metin, isteğe bağlı ikon. */
export function EmptyNote({ text, icon, className }: { text: string; icon?: LucideIcon; className?: string }) {
  return (
    <EmptyState className={cn('flex flex-col items-center gap-3 px-4 py-12', className)}>
      {icon && <TintIcon icon={icon} />}
      <Typography type="body-sm" color="muted" align="center" className="max-w-xs">
        {text}
      </Typography>
    </EmptyState>
  )
}

/* --- Başlangıç / Bitiş Tarihi (geçmiş kutuları) ----------------------------------------------- */

/** Gün seçici; `end` ise seçilen gün 23:59:59'a çekilir (başlangıç zaten 00:00). */
function DayPicker({ label, value, end, onChange }: { label: string; value: Date | null; end?: boolean; onChange: (d: Date | null) => void }) {
  return (
    <DatePicker
      value={value && new CalendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate())}
      onChange={(v) => {
        const d = v ? v.toDate(getLocalTimeZone()) : null
        if (d && end) d.setHours(23, 59, 59, 999)
        onChange(d)
      }}
      shouldForceLeadingZeros
      className="w-44"
    >
      <Label className="text-xs text-current">{label}</Label>
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger aria-label={`${label} takvimini aç`}>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className="p-3">
        <Calendar aria-label={label}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>{({ year }) => <Calendar.YearPickerCell year={year} />}</Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  )
}

/** Başlangıç Tarihi / Bitiş Tarihi, yan yana; gün bazında. */
export function RangeFields({ value, onChange }: { value: DateRange; onChange: (next: DateRange) => void }) {
  return (
    <I18nProvider locale="tr-TR">
      <Box className="flex flex-wrap items-end gap-2">
        <DayPicker label={RANGE_LABELS.start} value={value.start} onChange={(start) => onChange({ ...value, start })} />
        <DayPicker label={RANGE_LABELS.end} value={value.end} end onChange={(end) => onChange({ ...value, end })} />
      </Box>
    </I18nProvider>
  )
}
