import type { ReactElement, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownUp } from 'lucide-react'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import { I18nProvider } from 'react-aria-components'
import {
  Avatar,
  Button,
  Calendar,
  Card,
  Chip,
  DateField,
  DatePicker,
  Dropdown,
  EmptyState,
  Header,
  Label,
  SearchField,
  Separator,
  Tooltip,
  Typography,
  cn,
} from '@heroui/react'
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
import { useLook } from '@/synergy/shared/themeSettings'

/* -------------------------------------------------------------------------------------------------
 * Bento (v2) yapı taşları
 *
 * Dil: farklı boyutlarda, büyük yarıçaplı karolar (bento ızgara). Degrade yok, renk düz: öne çıkan
 * karolar birincil rengin opak açık tonunda (koyu metin), diğerleri beyaz, seçili olanlar açık tonda.
 * Düğme, seçili hap ve ikon karelerinde düz birincil renk.
 * ------------------------------------------------------------------------------------------------- */

/** lucide; satırlarda 16px. */
export const IC = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/** Küçük soluk etiket (bölüm başlıkları, sütun adları). */
export const LABEL = 'text-xs font-medium text-muted'

/** Başlık / büyük sayı sınıfı. */
export const DISPLAY = 'font-display font-extrabold tracking-tight'

/** Karo: büyük yarıçap, ince kenarlık, yumuşak renkli gölge. */
export const PANEL = 'rounded-3xl border border-border bg-surface p-0 shadow-(--surface-shadow)'

/** Birincil dolgu (düğme, seçili hap, avatar, ikon karesi): düz birincil renk, üstünde beyaz metin. */
export const FILL = 'bg-accent text-accent-foreground'

/** Öne çıkan karo: birincil rengin opak açık tonu, koyu metin, ince birincil kenarlık. */
export const HERO =
  'border border-accent/15 bg-[color-mix(in_oklab,var(--accent)_9%,var(--surface))] text-foreground shadow-(--surface-shadow)'

/** Öne çıkan karonun üstündeki cam hap (tarih, durum, numaralar, Geri / İleri). */
export const GLASS = 'border border-border bg-surface/75 text-foreground backdrop-blur'

/** Açık ton (seçili karo, ikincil vurgu): birincil rengin yüzeyle karışmış tonu. */
export const TINT = 'bg-[color-mix(in_oklab,var(--accent)_7%,var(--surface))]'

/** Birincil renkte metin (büyük sayılar). */
export const ACCENT_TEXT = 'text-accent-soft-foreground!'

/** Dolu vurgulu öne çıkan karo (tema paneli › Vurgu gücü › Dolu): düz birincil renk; içindeki metin ve çizgiler beyaz. */
const HERO_SOLID =
  'border-0 bg-accent text-accent-foreground shadow-(--surface-shadow) [--border:color-mix(in_oklab,var(--accent-foreground)_22%,transparent)] [--foreground:var(--accent-foreground)] [--muted:color-mix(in_oklab,var(--accent-foreground)_72%,transparent)]'

/** Dolu karonun cam hapı. */
const GLASS_SOLID = 'border border-accent-foreground/25 bg-accent-foreground/15 text-accent-foreground backdrop-blur'

/** Dolu karonun içindeki beyaz denetimler (arama, sıralama, tarih) kendi koyu rengine döner. */
export const ON_SOLID_RESET = '[--border:var(--field-border)] [--foreground:var(--surface-foreground)] [--muted:var(--field-placeholder)]'

/** Öne çıkan karo sınıfları, vurgu gücüne göre (varsayılan / hafif: açık ton, dolu: birincil renk). */
export function useHero() {
  const solid = useLook().accent === 'solid'
  return {
    solid,
    hero: solid ? HERO_SOLID : HERO,
    glass: solid ? GLASS_SOLID : GLASS,
    /** Karonun içindeki ikon karesi / seçili hap: açıkta birincil dolgu, dolu karoda beyaz. */
    fill: solid ? 'bg-accent-foreground text-accent' : FILL,
    reset: solid ? ON_SOLID_RESET : '',
  }
}

/** Seçili satır: yumuşak birincil zemin ve metin. */
export const SELECTED = 'data-selected:bg-accent-soft data-selected:text-accent-soft-foreground'

export function Tip({ label, children, placement = 'top' }: { label: string; children: ReactElement; placement?: 'top' | 'bottom' | 'right' | 'left' }) {
  return (
    <Tooltip delay={400}>
      {children}
      <Tooltip.Content placement={placement}>{label}</Tooltip.Content>
    </Tooltip>
  )
}

/** İkon karesi: yumuşak birincil ya da (`solid`) düz birincil renk. */
export function IconTile({ icon: Icon, size = 'md', solid, className }: { icon: LucideIcon; size?: 'sm' | 'md'; solid?: boolean; className?: string }) {
  return (
    <Avatar aria-hidden className={cn('shrink-0 rounded-xl', size === 'sm' ? 'size-8' : 'size-10', className)}>
      <Avatar.Fallback className={cn('rounded-xl', solid ? FILL : 'bg-accent-soft text-accent-soft-foreground')}>
        <Icon {...IC} size={size === 'sm' ? 16 : 18} />
      </Avatar.Fallback>
    </Avatar>
  )
}

/** Sayfa başlığı: başlık, altında isteğe bağlı açıklama; sağda araçlar. */
export function PageHeader({ title, description, actions, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <Box role="group" aria-label="Sayfa başlığı" className="flex flex-col gap-4">
      <Box className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Box className="flex min-w-0 flex-col gap-1">
          <Typography.Heading level={1} className={cn(DISPLAY, 'text-3xl text-balance')}>
            {title}
          </Typography.Heading>
          {description && <Box className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">{description}</Box>}
        </Box>
        {actions && <Box className="flex flex-wrap items-center gap-2">{actions}</Box>}
      </Box>
      {children}
    </Box>
  )
}

/** Kart: üstte başlık şeridi (isteğe bağlı ikon / araçlar), altında içerik. */
export function Panel({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  highlight,
}: {
  title?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  highlight?: boolean
}) {
  return (
    <Card className={cn(PANEL, 'gap-0 overflow-hidden', highlight && 'border-warning ring-2 ring-warning/40', className)}>
      {title && (
        <>
          <Box className="flex min-h-16 items-center gap-3 px-6 py-4">
            {icon && <IconTile icon={icon} size="sm" />}
            <Typography.Heading level={2} className="flex-1 text-sm font-semibold">
              {title}
            </Typography.Heading>
            {actions}
          </Box>
          <Separator />
        </>
      )}
      <Box className={cn('p-6', bodyClassName)}>{children}</Box>
    </Card>
  )
}

/** Durum çipi: sonuçlar dolu durum renginde, süren işler amber, taslak nötr (durum renkleri yalnızca burada). */
export function StatusMark({ status }: { status: RequestStatus }) {
  const color = status === 'Tamamlandı' ? 'success' : status === 'Reddedildi' ? 'danger' : status === 'Taslak' ? 'default' : 'warning'
  return (
    <Chip size="sm" variant="soft" color={color} className="gap-1.5 whitespace-nowrap">
      <Box aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      <Chip.Label>{status}</Chip.Label>
    </Chip>
  )
}

/** Hücre: tarih göreli (ipucunda tam), durum çipi, boşsa "—". */
export function CellValue({ r, col }: { r: WorkRequest; col: Column }) {
  const val = cellValue(r, col.key)
  if (col.type === 'status' && typeof val === 'string') return <StatusMark status={val as RequestStatus} />
  if (val == null || val === '') return <Text tone="muted">—</Text>
  if (val instanceof Date)
    return (
      <Typography {...inline} {...timeOf(val)} title={formatDateTime(val)} className="whitespace-nowrap text-current [font:inherit]">
        {relative(val)}
      </Typography>
    )
  if (col.key === 'ProcessId' || col.type === 'number')
    return (
      <Typography {...inline} className="font-mono text-[0.8125rem] text-current tabular-nums">
        {String(val)}
      </Typography>
    )
  return (
    <Typography {...inline} data-item-title={col.key === 'Subject' || undefined} className="text-current [font:inherit]">
      {String(val)}
    </Typography>
  )
}

/** Boş durum: kısa metin, isteğe bağlı ikon. */
export function Empty({ text, icon, className }: { text: string; icon?: LucideIcon; className?: string }) {
  return (
    <EmptyState className={cn('flex flex-col items-center gap-3 px-4 py-14 text-center', className)}>
      {icon && <IconTile icon={icon} />}
      <Typography type="body-sm" color="muted" className="max-w-sm">
        {text}
      </Typography>
    </EmptyState>
  )
}

/** "Ara" alanı. */
export function Search({ value, onChange, label = 'Ara', className }: { value: string; onChange: (v: string) => void; label?: string; className?: string }) {
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

/** Sıralama: alan adıyla düğme; menüde Sıralama alanı + Yön (kutunun alanları). */
export function SortMenu({ box, sort, onSort, className }: { box: WorkBox; sort: SortValue; onSort: (s: SortValue) => void; className?: string }) {
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
      <Button variant="outline" aria-label={`${SORT_LABELS.title}: ${current}`} className={cn('gap-2 bg-surface', className)}>
        <ArrowDownUp {...IC} className="text-muted" />
        {current}
      </Button>
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

/* --- Başlangıç / Bitiş Tarihi (geçmiş kutuları) ----------------------------------------------- */

function DayPicker({ label, value, end, onChange }: { label: string; value: Date | null; end?: boolean; onChange: (d: Date | null) => void }) {
  return (
    <DatePicker
      value={value && new CalendarDate(value.getFullYear(), value.getMonth() + 1, value.getDate())}
      onChange={(d) => {
        const date = d ? d.toDate(getLocalTimeZone()) : null
        if (date && end) date.setHours(23, 59, 59, 999)
        onChange(date)
      }}
      shouldForceLeadingZeros
      className="w-44"
    >
      <Label className={LABEL}>{label}</Label>
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
      <Box className="flex flex-wrap items-end gap-3">
        <DayPicker label={RANGE_LABELS.start} value={value.start} onChange={(start) => onChange({ ...value, start })} />
        <DayPicker label={RANGE_LABELS.end} value={value.end} end onChange={(end) => onChange({ ...value, end })} />
      </Box>
    </I18nProvider>
  )
}
