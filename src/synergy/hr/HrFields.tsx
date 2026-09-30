import { useId, type ReactNode } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { Check } from 'lucide-react'
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
  Switch,
  TimePicker,
  Typography,
} from 'antd'
import { HR_LABELS, STATUSES, hrRecords, type HrStatus } from '@/synergy/shared/hrData'
import { IC, cn } from '@/synergy/ant/ui'
import { refLabel, type Field } from '@/synergy/hr/modules'

/*
 * İK formunun alanları (antd): Input, InputNumber, DatePicker, TimePicker, Select (aranabilir);
 * etiket ve hata `Form.Item`'da. Durum bölümlü seçici, şirketler seçilebilir haplar. Değerler
 * kayıtta düz metin / sayı ("2026-03-01", "08:30"). Çağıran bir `Form` (`component={false}`,
 * dikey) içinde basar.
 */

/** Durumun işaret rengi (yalnızca durum için renk). */
export const STATUS_DOT: Record<HrStatus, string> = {
  Aktif: 'bg-success',
  Pasif: 'bg-muted',
  'Geçici Pasif': 'bg-warning',
}

const DATE = 'YYYY-MM-DD'
const TIME = 'HH:mm'

const toDate = (v: unknown) => (typeof v === 'string' && v ? dayjs(v) : null)
const toTime = (v: unknown) => {
  if (typeof v !== 'string' || !v) return null
  const [h, m] = v.split(':').map(Number)
  return dayjs()
    .hour(h ?? 0)
    .minute(m ?? 0)
    .second(0)
}
const fromDay = (d: Dayjs | null, format: string) => (d ? d.format(format) : '')

/** Para: binlik ayırıcı nokta (tam sayı). */
const groupDigits = (v: string | number | undefined) =>
  v === undefined || v === '' ? '' : String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Alan kabı: etiket, zorunluluk işareti ve hata metni. */
function Item({
  id,
  label,
  required,
  error,
  children,
}: {
  id?: string
  label: ReactNode
  required?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <Form.Item
      label={label}
      htmlFor={id}
      required={required}
      validateStatus={error ? 'error' : undefined}
      help={error}
      className="w-full"
    >
      {children}
    </Form.Item>
  )
}

export function HrField({
  field,
  value,
  onChange,
  invalid,
}: {
  field: Field
  value: unknown
  onChange: (v: unknown) => void
  invalid: boolean
}) {
  const id = useId()
  const { label, required } = field
  const error = invalid ? HR_LABELS.required : undefined
  const item = (control: ReactNode) => (
    <Item id={id} label={label} required={required} error={error}>
      {control}
    </Item>
  )
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return item(
        <Input
          id={id}
          type={field.type === 'text' ? 'text' : field.type === 'email' ? 'email' : 'tel'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full"
        />,
      )
    case 'textarea':
      return item(
        <Input.TextArea
          id={id}
          rows={3}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-none"
        />,
      )
    case 'number':
    case 'money':
      return item(
        <InputNumber<number>
          id={id}
          value={typeof value === 'number' ? value : null}
          onChange={(v) => onChange(v)}
          {...(field.type === 'money'
            ? {
                precision: 0,
                formatter: groupDigits,
                parser: (s?: string) => Number((s ?? '').replace(/\./g, '')),
              }
            : { decimalSeparator: ',' })}
          className="w-full"
        />,
      )
    case 'date':
      return item(
        // İK tarihleri gün bazında
        <DatePicker
          id={id}
          value={toDate(value)}
          format="DD.MM.YYYY"
          onChange={(d) => onChange(fromDay(d, DATE))}
          className="w-full"
        />,
      )
    case 'time':
      return item(
        <TimePicker
          id={id}
          value={toTime(value)}
          format={TIME}
          needConfirm={false}
          onChange={(t) => onChange(fromDay(t, TIME))}
          className="w-full"
        />,
      )
    case 'select':
      return item(
        <Select
          id={id}
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="Seçiniz"
          options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
          value={(value as string) || null}
          onChange={(v) => onChange(v ?? '')}
          allowClear={!required}
          className="w-full"
        />,
      )
    case 'ref':
      return item(
        <Select
          id={id}
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="Seçiniz"
          options={hrRecords(field.ref!).map((r) => ({
            value: r.id,
            label: refLabel(field.ref, r.id),
          }))}
          value={(value as string) || null}
          onChange={(v) => onChange(v ?? null)}
          allowClear={!required}
          className="w-full"
        />,
      )
    case 'refMany':
      return <RefMany field={field} value={(value as string[]) ?? []} onChange={onChange} />
    case 'bool':
      return (
        <Flex align="end" className="h-full pb-2">
          <Flex align="center" gap={8}>
            <Switch id={id} aria-label={label} checked={!!value} onChange={onChange} />
            {/* Etikete basınca da değişir (ekran okuyucu adı anahtarın kendisinden) */}
            <Typography.Text
              aria-hidden
              onClick={() => onChange(!value)}
              className="cursor-pointer"
            >
              {label}
            </Typography.Text>
          </Flex>
        </Flex>
      )
    case 'status':
      return (
        <StatusField label={label} value={(value as HrStatus) ?? 'Aktif'} onChange={onChange} />
      )
  }
}

/** Durum: bölümlü seçici; seçili bölüm dolu, yanında durum rengi işareti. */
function StatusField({
  label,
  value,
  onChange,
}: {
  label: string
  value: HrStatus
  onChange: (v: unknown) => void
}) {
  return (
    <Item label={label}>
      <Segmented<HrStatus>
        block
        aria-label={label}
        value={value}
        onChange={onChange}
        className="rounded-xl bg-surface-secondary p-1 [&_.ant-segmented-item-selected]:font-semibold"
        options={STATUSES.map((s) => ({
          value: s,
          label: (
            <Flex align="center" justify="center" gap={6}>
              <Flex aria-hidden className={cn('block size-2 rounded-full', STATUS_DOT[s])} />
              {s}
            </Flex>
          ),
        }))}
      />
    </Item>
  )
}

/** Çoklu başvuru (şirketler): seçilebilir haplar. */
function RefMany({
  field,
  value,
  onChange,
}: {
  field: Field
  value: string[]
  onChange: (v: unknown) => void
}) {
  const options = hrRecords(field.ref!)
  return (
    <Item label={field.label}>
      <Flex role="group" aria-label={field.label} wrap gap={6}>
        {options.map((o) => {
          const on = value.includes(o.id)
          return (
            <Button
              key={o.id}
              size="small"
              shape="round"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
              icon={on ? <Check {...IC} size={14} /> : undefined}
              className={cn(
                'border border-border bg-transparent px-3 text-foreground transition-colors',
                on && 'border-accent bg-accent-soft text-accent-soft-foreground',
              )}
            >
              {refLabel(field.ref, o.id)}
            </Button>
          )
        })}
      </Flex>
    </Item>
  )
}
