import { CalendarDateTime, Time } from '@internationalized/date'
import { Check } from 'lucide-react'
import {
  FieldError,
  Label,
  Switch,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  cn,
} from '@heroui/react'
import { TextBox } from '@/components/TextBox'
import { NumberBox } from '@/components/NumberBox'
import { DateTimePicker } from '@/components/DateTimePicker'
import { TimePicker } from '@/components/TimePicker'
import { Combobox } from '@/components/Combobox'
import { HR_LABELS, STATUSES, hrRecords, type HrStatus } from '@/synergy/shared/hrData'
import { Box } from '@/synergy/shared/ui'
import { IC } from '@/synergy/v1/parts'
import { refLabel, type Field } from '@/synergy/v1/hr/modules'

/*
 * İK formunun alanları: boilerplate'in gerçek bileşenleri (TextBox, NumberBox, DateTimePicker,
 * TimePicker, Combobox). Durum bölümlü seçici, şirketler seçilebilir haplar. Değerler kayıtta düz
 * metin / sayı ("2026-03-01", "08:30").
 */

/** Durumun işaret rengi (yalnızca durum için renk). */
export const STATUS_DOT: Record<HrStatus, string> = {
  Aktif: 'bg-success',
  Pasif: 'bg-muted',
  'Geçici Pasif': 'bg-warning',
}

const toDate = (v: unknown) => {
  if (typeof v !== 'string' || !v) return null
  const [y, m, d] = v.split('-').map(Number)
  return new CalendarDateTime(y!, m!, d!)
}
const fromDate = (d: CalendarDateTime | null) =>
  d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : ''

const toTime = (v: unknown) => {
  if (typeof v !== 'string' || !v) return null
  const [h, m] = v.split(':').map(Number)
  return new Time(h, m)
}
const fromTime = (t: Time | null) =>
  t ? `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}` : ''

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
  const { label, required } = field
  const error = invalid ? HR_LABELS.required : undefined
  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      return (
        <TextBox
          label={label}
          value={(value as string) ?? ''}
          onChange={onChange}
          isRequired={required}
          isInvalid={invalid}
          errorMessage={error}
          className="w-full"
        />
      )
    case 'textarea':
      return (
        <TextField
          value={(value as string) ?? ''}
          onChange={onChange}
          isInvalid={invalid}
          fullWidth
        >
          <Label>{label}</Label>
          <TextArea rows={3} className="w-full resize-none" />
          <FieldError>{error}</FieldError>
        </TextField>
      )
    case 'number':
    case 'money':
      return (
        <NumberBox
          label={label}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
          isRequired={required}
          isInvalid={invalid}
          errorMessage={error}
          formatOptions={
            field.type === 'money' ? { maximumFractionDigits: 0 } : { maximumFractionDigits: 2 }
          }
          className="w-full"
        />
      )
    case 'date':
      return (
        <DateTimePicker
          label={label}
          value={toDate(value)}
          onChange={(d) => onChange(fromDate(d))}
          // İK tarihleri gün bazında
          showTime={false}
          isRequired={required}
          isInvalid={invalid}
          errorMessage={error}
          className="w-full"
        />
      )
    case 'time':
      return (
        <TimePicker
          label={label}
          value={toTime(value)}
          onChange={(t) => onChange(fromTime(t))}
          isRequired={required}
          isInvalid={invalid}
          errorMessage={error}
          className="w-full"
        />
      )
    case 'select':
      return (
        <Combobox
          label={label}
          options={(field.options ?? []).map((o) => ({ value: o, label: o }))}
          value={(value as string) || null}
          onChange={(v) => onChange(v ?? '')}
          allowClear={!required}
          isRequired={required}
          isInvalid={invalid}
          errorMessage={error}
          className="w-full"
        />
      )
    case 'ref':
      return (
        <Combobox
          label={label}
          showSearch
          options={hrRecords(field.ref!).map((r) => ({
            value: r.id,
            label: refLabel(field.ref, r.id),
          }))}
          value={(value as string) || null}
          onChange={(v) => onChange(v)}
          allowClear={!required}
          isRequired={required}
          isInvalid={invalid}
          errorMessage={error}
          className="w-full"
        />
      )
    case 'refMany':
      return <RefMany field={field} value={(value as string[]) ?? []} onChange={onChange} />
    case 'bool':
      return (
        <Box className="flex h-full items-end pb-2">
          <Switch isSelected={!!value} onChange={onChange}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              {label}
            </Switch.Content>
          </Switch>
        </Box>
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
    <Box className="flex flex-col gap-1.5">
      <Label className="text-sm">{label}</Label>
      <ToggleButtonGroup
        aria-label={label}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[value]}
        onSelectionChange={(keys) => onChange([...keys][0])}
        className="w-full rounded-xl bg-surface-secondary p-1"
        isDetached
      >
        {STATUSES.map((s) => (
          <ToggleButton
            key={s}
            id={s}
            size="sm"
            variant="ghost"
            className="flex-1 gap-1.5 rounded-lg transition-colors data-selected:bg-surface data-selected:font-semibold data-selected:shadow-sm"
          >
            <Box aria-hidden className={cn('size-2 rounded-full', STATUS_DOT[s])} />
            {s}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
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
    <Box className="flex flex-col gap-1.5">
      <Label className="text-sm">{field.label}</Label>
      <ToggleButtonGroup
        aria-label={field.label}
        selectionMode="multiple"
        selectedKeys={value}
        onSelectionChange={(keys) => onChange([...keys].map(String))}
        isDetached
        className="flex flex-wrap gap-1.5"
      >
        {options.map((o) => (
          <ToggleButton
            key={o.id}
            id={o.id}
            size="sm"
            variant="ghost"
            className="group gap-1.5 rounded-full border border-border px-3 transition-colors data-selected:border-accent data-selected:bg-accent-soft data-selected:text-accent-soft-foreground"
          >
            <Check {...IC} size={14} className="hidden group-data-selected:block" />
            {refLabel(field.ref, o.id)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}
