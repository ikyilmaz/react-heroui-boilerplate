import { useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDownUp, Check, Search } from 'lucide-react'
import dayjs from 'dayjs'
import { Button, DatePicker, Dropdown, Flex, Form, Input, Tag, Typography } from 'antd'
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
import { IC, StatusTag, TintIcon, Tip, cn } from '@/synergy/ant/ui'

/* antd sayfalarının ortak parçaları: arama, sıralama menüsü, tarih aralığı, boş durum, hücre değeri */

const { Text } = Typography

/** "Ara" alanı (temizleme düğmeli). */
export function SearchField({
  value,
  onChange,
  label = 'Ara',
  autoFocus,
  className,
}: {
  value: string
  onChange: (v: string) => void
  label?: string
  autoFocus?: boolean
  className?: string
}) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoFocus={autoFocus}
      aria-label={label}
      placeholder={label}
      allowClear
      prefix={<Search {...IC} className="text-muted" />}
      className={cn('min-w-0', className)}
    />
  )
}

/** Sıralama menüsü: Sıralama alanı + Yön (kutunun alanları, `sortFieldsFor`); seçili olan işaretli. */
export function SortMenu({
  box,
  sort,
  onSort,
  className,
}: {
  box: WorkBox
  sort: SortValue
  onSort: (s: SortValue) => void
  className?: string
}) {
  const fields = sortFieldsFor(box)
  const item = (group: keyof SortValue, id: string, label: string) => ({
    key: `${group}:${id}`,
    label,
    // Seçili seçenek onay işaretiyle (antd menüsünde tek seçim için gösterge yok)
    extra: sort[group] === id ? <Check {...IC} size={14} className="text-accent" /> : null,
  })
  return (
    // İpucu kabın üstünde: antd'de iç içe iki tetikleyici (ipucu + menü) aynı düğmede çalışmıyor
    <Tip label={SORT_LABELS.title}>
      <Flex className="inline-flex shrink-0">
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            'aria-label': SORT_LABELS.title,
            className: 'min-w-56',
            onClick: ({ key }) => {
              const [group, id] = key.split(':') as [keyof SortValue, string]
              onSort({ ...sort, [group]: id })
            },
            items: [
              {
                type: 'group',
                key: 'field',
                label: SORT_LABELS.field,
                children: fields.map((f) => item('field', f.id, f.label)),
              },
              { type: 'divider' },
              {
                type: 'group',
                key: 'direction',
                label: SORT_LABELS.direction,
                children: (['ascending', 'descending'] as const).map((d) =>
                  item('direction', d, SORT_LABELS[d]),
                ),
              },
            ],
          }}
        >
          <Button
            type="text"
            aria-label={SORT_LABELS.title}
            icon={<ArrowDownUp {...IC} />}
            className={cn('shrink-0', className)}
          />
        </Dropdown>
      </Flex>
    </Tip>
  )
}

/** Hücre: tarih göreli (ipucunda tam), durum etiketi, boşsa "-". */
export function CellValue({ r, col }: { r: WorkRequest; col: Column }) {
  const v = cellValue(r, col.key)
  if (col.type === 'status' && typeof v === 'string')
    return <StatusTag status={v as RequestStatus} />
  if (v == null || v === '') return <Text type="secondary">-</Text>
  if (v instanceof Date)
    return (
      <Text title={formatDateTime(v)} className="whitespace-nowrap text-current [font:inherit]">
        {relative(v)}
      </Text>
    )
  if (col.key === 'ProcessId')
    return <Text className="text-sm font-medium text-current">{String(v)}</Text>
  return <Text className="text-current [font:inherit]">{String(v)}</Text>
}

/** Boş durum: kısa metin, isteğe bağlı ikon. */
export function EmptyNote({
  text,
  icon,
  className,
}: {
  text: string
  icon?: LucideIcon
  className?: string
}) {
  return (
    <Flex vertical align="center" gap={12} className={cn('px-4 py-12', className)}>
      {icon && <TintIcon icon={icon} />}
      <Text type="secondary" className="max-w-xs text-center text-sm">
        {text}
      </Text>
    </Flex>
  )
}

/** Grup başlığı (tarih grubu): ad ve sayı. Tabloda ve kartlarda aynı. */
export function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <Flex align="center" gap={8}>
      <Text className="text-xs font-semibold tracking-[0.06em] text-foreground/80 uppercase">
        {label}
      </Text>
      <Tag
        variant="filled"
        className="me-0 min-w-5 rounded-full border-0 bg-accent/12 px-1.5 text-center text-[0.6875rem] leading-5 text-accent-soft-foreground"
      >
        {count}
      </Tag>
    </Flex>
  )
}

/* --- Başlangıç / Bitiş Tarihi (geçmiş kutuları) ----------------------------------------------- */

/** Gün seçici; `end` ise seçilen gün 23:59:59'a çekilir (başlangıç zaten 00:00). */
function DayPicker({
  label,
  value,
  end,
  fill,
  onChange,
}: {
  label: string
  value: Date | null
  end?: boolean
  fill: boolean
  onChange: (d: Date | null) => void
}) {
  const id = useId()
  return (
    <Form.Item label={label} htmlFor={id} className={fill ? 'w-full' : 'w-44'}>
      <DatePicker
        id={id}
        value={value && dayjs(value)}
        format="DD.MM.YYYY"
        onChange={(v) => {
          const d = v ? (end ? v.endOf('day') : v.startOf('day')).toDate() : null
          onChange(d)
        }}
        className="w-full"
      />
    </Form.Item>
  )
}

/** Başlangıç Tarihi / Bitiş Tarihi, yan yana (dar kartta alt alta); gün bazında. */
export function RangeFields({
  value,
  onChange,
  stacked = false,
}: {
  value: DateRange
  onChange: (next: DateRange) => void
  /** Dar kartta: alanlar alt alta, tam genişlik. */
  stacked?: boolean
}) {
  return (
    <Form layout="vertical" component={false}>
      <Flex vertical={stacked} wrap={!stacked} align={stacked ? undefined : 'end'} gap={8}>
        <DayPicker
          label={RANGE_LABELS.start}
          value={value.start}
          fill={stacked}
          onChange={(start) => onChange({ ...value, start })}
        />
        <DayPicker
          label={RANGE_LABELS.end}
          value={value.end}
          end
          fill={stacked}
          onChange={(end) => onChange({ ...value, end })}
        />
      </Flex>
    </Form>
  )
}

/* --- Sıralama ve bant ------------------------------------------------------------------------- */

/** Sıralama seçimi (alan + yön). */
export interface SortValue {
  field: SortField
  direction: SortDirection
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

export interface BandStyle {
  /** Bandın zemini ve yazı rengi. */
  band: string
  /** Bandın üstündeki dolu denetim (Yeni, Sıralama, kutu seçici). */
  on: string
  /** Açık zemin mi (koyu yazı); değilse koyu zemin, açık yazı. */
  light: boolean
}

const BANDS = {
  accent: {
    band: 'bg-accent text-accent-foreground',
    on: 'bg-accent-foreground text-accent',
    light: false,
  },
  white: {
    band: 'bg-surface text-foreground',
    on: 'bg-accent text-accent-foreground',
    light: true,
  },
} satisfies Record<string, BandStyle>

/**
 * Bandın görünüşü. `hero` (karşılama, kutu bandı, İK bandı): dolu birincil renk; `record` (talep
 * başlığı): beyaz.
 */
export function useBand(kind: 'hero' | 'record' = 'hero'): BandStyle {
  return kind === 'record' ? BANDS.white : BANDS.accent
}
