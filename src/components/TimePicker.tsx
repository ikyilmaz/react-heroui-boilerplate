import { useMemo, useRef, useState } from 'react'
import { Time } from '@internationalized/date'
import { I18nProvider } from 'react-aria-components'
import {
  Button,
  Description,
  FieldError,
  Label,
  Popover,
  Separator,
  TimeField,
  Toolbar,
  cn,
  popoverVariants,
} from '@heroui/react'
import { Clock, X } from 'lucide-react'
import { FIELD_AFFIX, FIELD_ICON_BUTTON, FIELD_ICON_SIZE } from '@/components/fieldIconButton'
import { TimePanel, type TimeOptions } from '@/components/TimePanel'

/* -------------------------------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------------------------------- */

export interface TimePickerProps extends TimeOptions {
  value?: Time | null
  defaultValue?: Time | null
  onChange?: (value: Time | null) => void
  label?: string
  description?: string
  errorMessage?: string
  minValue?: Time
  maxValue?: Time
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  /** Temizle (×) butonunu göster. @default true */
  isClearable?: boolean
  /** BCP 47 dil etiketi. @default "tr-TR" */
  locale?: string
  /** Arayüz metinleri (Şimdi, Tamam, Saat, ...). */
  texts?: Partial<PickerTexts>
  name?: string
  className?: string
  popoverClassName?: string
  /** Alanın erişilebilir adı; `label` yoksa gerekir. */
  'aria-label'?: string
}

type PickerTexts = typeof defaultTexts

const defaultTexts = {
  now: 'Şimdi',
  ok: 'Tamam',
  hour: 'Saat',
  minute: 'Dakika',
  second: 'Saniye',
  clear: 'Temizle',
  openPicker: 'Saat seçiciyi aç',
}

/* -------------------------------------------------------------------------------------------------
 * TimePicker
 *
 * Alan HeroUI `TimeField`'dır (segment girişi, klavyeyle yazılabilir); açılır panel
 * `DateTimePicker` ile aynı `TimePanel`'dir. Popover, `Popover.Root` yerine kontrollü
 * `Popover.Content` + `triggerRef` ile kurulur: Root bir DialogTrigger olduğu için içindeki
 * temizle düğmesi de tetikleyici gibi davranırdı.
 * ------------------------------------------------------------------------------------------------- */

export function TimePicker({
  value,
  defaultValue,
  onChange,
  label,
  description,
  errorMessage,
  showSecond = false,
  hourStep,
  minuteStep,
  secondStep,
  minValue,
  maxValue,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  isClearable = true,
  locale = 'tr-TR',
  texts: textsProp,
  name,
  className,
  popoverClassName,
  'aria-label': ariaLabel,
}: TimePickerProps) {
  const texts: PickerTexts = { ...defaultTexts, ...textsProp }
  const options: TimeOptions = { showSecond, hourStep, minuteStep, secondStep }

  const [innerValue, setInnerValue] = useState<Time | null>(defaultValue ?? null)
  const current = value !== undefined ? value : innerValue

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverSlots = useMemo(() => popoverVariants(), [])

  const commit = (next: Time | null) => {
    if (value === undefined) setInnerValue(next)
    onChange?.(next)
  }

  return (
    <I18nProvider locale={locale}>
      <TimeField
        className={cn('w-44', className)}
        aria-label={label ? undefined : ariaLabel}
        name={name}
        value={current}
        onChange={commit}
        granularity={showSecond ? 'second' : 'minute'}
        hourCycle={24}
        shouldForceLeadingZeros
        minValue={minValue}
        maxValue={maxValue}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={isRequired}
        isInvalid={isInvalid}
      >
        {label && <Label>{label}</Label>}

        <TimeField.Group fullWidth>
          <TimeField.Input>{(segment) => <TimeField.Segment segment={segment} />}</TimeField.Input>
          {/* HeroUI suffix'i pointer-events: none; kendi tetikleyicisi gibi biz de geri açıyoruz */}
          {/* `me-0`: HeroUI soneki `me-3` veriyor; bütün alanlarda kenar boşluğu 4px */}
          <TimeField.Suffix className={cn(FIELD_AFFIX, 'pointer-events-auto me-0')}>
            {isClearable && current && !isDisabled && !isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={texts.clear}
                className={FIELD_ICON_BUTTON}
                onPress={() => commit(null)}
              >
                <X size={FIELD_ICON_SIZE} aria-hidden />
              </Button>
            )}
            <Button
              ref={triggerRef}
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={texts.openPicker}
              aria-expanded={open}
              isDisabled={isDisabled || isReadOnly}
              className={FIELD_ICON_BUTTON}
              onPress={() => setOpen((o) => !o)}
            >
              <Clock size={FIELD_ICON_SIZE} aria-hidden />
            </Button>
          </TimeField.Suffix>
        </TimeField.Group>

        {description && <Description>{description}</Description>}
        <FieldError>{errorMessage}</FieldError>
      </TimeField>

      <Popover.Content
        triggerRef={triggerRef}
        isOpen={open}
        onOpenChange={setOpen}
        placement="bottom end"
        offset={6}
        aria-label={label ?? ariaLabel ?? texts.openPicker}
        className={cn(popoverSlots.base(), 'flex w-fit flex-col p-0', popoverClassName)}
      >
        <TimePanel value={current} onChange={commit} options={options} texts={texts} fullWidth />
        <Separator />
        <Toolbar aria-label={texts.now} className="flex justify-between p-2">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => {
              const d = new Date()
              commit(new Time(d.getHours(), d.getMinutes(), showSecond ? d.getSeconds() : 0))
            }}
          >
            {texts.now}
          </Button>
          <Button variant="primary" size="sm" onPress={() => setOpen(false)}>
            {texts.ok}
          </Button>
        </Toolbar>
      </Popover.Content>
    </I18nProvider>
  )
}
