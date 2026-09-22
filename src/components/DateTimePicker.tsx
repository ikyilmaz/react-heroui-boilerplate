import { useContext, useMemo, type ReactNode } from 'react'
import {
  CalendarDateTime,
  getLocalTimeZone,
  now,
  toCalendarDateTime,
  today,
} from '@internationalized/date'
import { DateFieldStateContext, DatePickerStateContext, I18nProvider } from 'react-aria-components'
import type { DateValue } from 'react-aria-components'
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Description,
  FieldError,
  Label,
  Separator,
  Surface,
  Toolbar,
  cn,
} from '@heroui/react'
import { X } from 'lucide-react'
import { TimePanel, type TimeOptions } from '@/components/TimePanel'
// HeroUI de 'Calendar' dışa veriyor (takvim bileşeni); lucide ikonunu adlandırarak ayırıyoruz
import { Calendar as CalendarIcon } from 'lucide-react'
import {
  FIELD_AFFIX,
  FIELD_ICON_BUTTON,
  FIELD_ICON_SIZE,
  fieldIconButton,
} from '@/components/fieldIconButton'
import {
  buildSegments,
  fieldPropsFromFormat,
  parseDateFormat,
  type EngineSegment,
  type FormatToken,
  type SegmentSource,
} from '@/components/dateFormat'

/* -------------------------------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------------------------------- */

export type ShowTimeOptions = TimeOptions

/**
 * React Aria'nın `FieldOptions` tipiyle aynı şekil (react-stately'den geçişli olarak import etmek
 * yerine burada yazıyoruz; `state.formatValue` tam olarak bunu bekliyor).
 */
export interface DateFieldFormatOptions {
  year?: 'numeric' | '2-digit'
  month?: 'numeric' | '2-digit' | 'narrow' | 'short' | 'long'
  day?: 'numeric' | '2-digit'
  hour?: 'numeric' | '2-digit'
  minute?: 'numeric' | '2-digit'
  second?: 'numeric' | '2-digit'
}

export interface DateTimePickerProps {
  value?: CalendarDateTime | null
  defaultValue?: CalendarDateTime | null
  onChange?: (value: CalendarDateTime | null) => void
  label?: string
  description?: string
  errorMessage?: string
  /**
   * antd ile aynı: `true` ya da ayar nesnesi. `false` verilirse yalnızca tarih seçilir.
   * @default true
   */
  showTime?: boolean | ShowTimeOptions
  /**
   * Değerin uzun okunuşunu alanın altında gösterir. Biçimlendirmeyi React Aria'nın kendi
   * `state.formatValue()` motoru yapar; yerel ayar, granularity, hourCycle ve takvim ondan gelir.
   * Örn. `{ month: 'long' }` → "27 Şubat 2001 12:23:00".
   *
   * Not: Segmentli girişin ay kutusunu "Şubat" olarak bastırmanın bir yolu yok —
   * `useDateFieldState` segment biçimini `getFormatOptions({}, ...)` ile sabitliyor. Bu yüzden
   * segmentler (düzenlenebilir, erişilebilir) olduğu gibi kalır, uzun okunuş alanın açıklaması olur.
   */
  formatOptions?: DateFieldFormatOptions
  /**
   * moment/dayjs tarzı format dizgesi; alanın hangi segmentleri, hangi sırada ve hangi ayraçlarla
   * göstereceğini belirler. Örn. `"dddd, MMMM D, YYYY h:mm A"`.
   *
   * Segmentleri yine React Aria üretir; biz yalnızca sırasını ve metnini format'a göre yazarız.
   * Ok tuşlarıyla değiştirme, rakam yazma, odak yönetimi ve ARIA aynen korunur.
   * Verildiğinde `showTime` yok sayılır: granularity, 12/24 saat ve saniye format'tan türetilir.
   *
   * Desteklenen: YYYY YY · MMMM MMM MM M · DD D · dddd ddd · HH H hh h · mm m · ss s · A a · [düz metin]
   */
  format?: string
  minValue?: DateValue
  maxValue?: DateValue
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  /** Temizle (×) butonunu göster. @default true */
  isClearable?: boolean
  /** Tablo satırı ve filtre satırı gibi dar yerler için alçak alan. */
  compact?: boolean
  /**
   * Alanın başına, kenarlığın **içine** yerleşen içerik (ör. filtre işlemi seçici). Odak halkası
   * alan grubunda olduğu için prefix'i de kapsar.
   */
  prefix?: ReactNode
  /** BCP 47 dil etiketi. @default "tr-TR" */
  locale?: string
  /** Arayüz metinleri (Şimdi, Tamam, Saat, ...). */
  texts?: Partial<PickerTexts>
  name?: string
  className?: string
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
  openCalendar: 'Takvimi aç',
}

/* -------------------------------------------------------------------------------------------------
 * DateTimePicker
 * ------------------------------------------------------------------------------------------------- */

export function DateTimePicker({
  value,
  defaultValue,
  onChange,
  label,
  description,
  errorMessage,
  showTime = true,
  formatOptions,
  format,
  minValue,
  maxValue,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  isClearable = true,
  compact,
  prefix,
  locale = 'tr-TR',
  texts: textsProp,
  name,
  className,
  'aria-label': ariaLabel,
}: DateTimePickerProps) {
  const texts: PickerTexts = { ...defaultTexts, ...textsProp }

  // Format verildiyse alanın şekli ondan türer; verilmediyse eski `showTime` davranışı sürer.
  const tokens = useMemo(() => (format ? parseDateFormat(format) : null), [format])
  const fromFormat = useMemo(() => (tokens ? fieldPropsFromFormat(tokens) : null), [tokens])

  const timeOptions: ShowTimeOptions | null = fromFormat
    ? fromFormat.hasTime
      ? { showSecond: fromFormat.showSecond }
      : null
    : showTime === false
      ? null
      : showTime === true
        ? {}
        : showTime
  const granularity =
    fromFormat?.granularity ??
    (timeOptions ? (timeOptions.showSecond ? 'second' : 'minute') : 'day')

  return (
    <I18nProvider locale={locale}>
      <DatePicker
        // Sabit genişlik: alanlar format'tan bağımsız olarak hizalı dursun. En uzun makul
        // format ("dddd, MMMM D, YYYY h:mm A" ≈ 330px) sığacak kadar geniş; daha uzun bir
        // format verilirse `className` ile büyütülür.
        className={cn(
          'w-96 max-w-full',
          // Grubun h-9'u ve segmentlerin py-2'si inmeli; ölçüler alan grubunda, kökte değil
          compact &&
            '[&_[data-slot=date-input-group]]:h-8 [&_[data-slot=date-input-group-input]]:py-1',

          className,
        )}
        aria-label={label ? undefined : ariaLabel}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onChange={(v) => onChange?.(v ? toCalendarDateTime(v) : null)}
        granularity={granularity}
        hourCycle={fromFormat?.hourCycle ?? 24}
        hideTimeZone
        shouldForceLeadingZeros
        // Saat seçimi varken tarih tıklanınca popover kapanmasın (antd davranışı)
        shouldCloseOnSelect={!timeOptions}
        minValue={minValue}
        maxValue={maxValue}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={isRequired}
        isInvalid={isInvalid}
      >
        {label && <Label>{label}</Label>}

        <DateField.Group fullWidth>
          {/* HeroUI prefix'e `pointer-events: none` veriyor; içine tıklanabilir bir şey koyunca geri açmak gerekiyor */}
          {/* HeroUI prefix'e `pointer-events: none` ve `ms-3` veriyor; ikisini de geri alıyoruz */}
          {prefix && (
            <DateField.Prefix className="pointer-events-auto mx-0">{prefix}</DateField.Prefix>
          )}
          <DateField.Input>
            {(segment) =>
              tokens ? (
                <FormatSegments segment={segment} tokens={tokens} locale={locale} />
              ) : (
                <DateField.Segment segment={segment} />
              )
            }
          </DateField.Input>
          {/* `me-0`: HeroUI soneki `me-3` veriyor; diğer alanlarda kenar boşluğu 4px */}
          <DateField.Suffix className={cn(FIELD_AFFIX, 'me-0')}>
            {isClearable && !isDisabled && !isReadOnly && <ClearButton label={texts.clear} />}
            <DatePicker.Trigger
              // `rounded-full`: `.date-picker__trigger`ın `rounded-field`i buton yarıçapını eziyor
              className={fieldIconButton}
              aria-label={texts.openCalendar}
            >
              <DatePicker.TriggerIndicator>
                <CalendarIcon size={FIELD_ICON_SIZE} aria-hidden />
              </DatePicker.TriggerIndicator>
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>

        {formatOptions && <ValueReadout locale={locale} fieldOptions={formatOptions} />}
        {description && <Description>{description}</Description>}
        <FieldError>{errorMessage}</FieldError>

        <DatePicker.Popover className="p-0">
          <Surface variant="transparent" className="flex flex-col">
            <Surface variant="transparent" className="flex">
              <Surface variant="transparent" className="p-3">
                <Calendar aria-label={label ?? ariaLabel ?? 'Tarih'}>
                  <Calendar.Header>
                    <Calendar.YearPickerTrigger>
                      <Calendar.YearPickerTriggerHeading />
                      <Calendar.YearPickerTriggerIndicator />
                    </Calendar.YearPickerTrigger>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                  <Calendar.YearPickerGrid>
                    <Calendar.YearPickerGridBody>
                      {({ year }) => <Calendar.YearPickerCell year={year} />}
                    </Calendar.YearPickerGridBody>
                  </Calendar.YearPickerGrid>
                </Calendar>
              </Surface>

              {timeOptions && (
                <>
                  <Separator orientation="vertical" />
                  <PickerTimePanel options={timeOptions} texts={texts} />
                </>
              )}
            </Surface>

            <Separator />
            <PickerFooter texts={texts} hasTime={!!timeOptions} />
          </Surface>
        </DatePicker.Popover>
      </DatePicker>
    </I18nProvider>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Clear (×) button — input suffix
 * ------------------------------------------------------------------------------------------------- */

function ClearButton({ label }: { label: string }) {
  const state = useContext(DatePickerStateContext)
  if (!state?.value) return null

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      aria-label={label}
      className={FIELD_ICON_BUTTON}
      onPress={() => state.setValue(null)}
    >
      <X size={FIELD_ICON_SIZE} aria-hidden />
    </Button>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Format'a göre segmentler
 *
 * `DateInput` motorun segment dizisi üzerinde dönüp her biri için bu render fonksiyonunu çağırıyor.
 * Sırayı ve metni biz belirleyeceğimiz için tüm listeyi ilk çağrıda basıp kalan çağrılara boş
 * dönüyoruz. Segment nesnelerinin `value`/`minValue`/`maxValue`/`isEditable` alanları motordan
 * geldiği gibi taşındığından `DateSegment` her zamanki spinbutton davranışını sürdürür.
 * ------------------------------------------------------------------------------------------------- */

function FormatSegments({
  segment,
  tokens,
  locale,
}: {
  segment: EngineSegment
  tokens: FormatToken[]
  locale: string
}) {
  const state = useContext(DateFieldStateContext) as SegmentSource | null

  if (!state || segment !== state.segments[0]) return <></>

  return (
    <>
      {buildSegments(state, tokens, locale).map((s, i) => (
        // eslint-disable-next-line react/no-array-index-key -- segment listesi format'la sabit
        <DateField.Segment key={i} segment={s as never} />
      ))}
    </>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Uzun okunuş — biçimlendirmeyi React Aria'nın kendi motoru yapar
 * ------------------------------------------------------------------------------------------------- */

function ValueReadout({
  locale,
  fieldOptions,
}: {
  locale: string
  fieldOptions: DateFieldFormatOptions
}) {
  const state = useContext(DatePickerStateContext)
  if (!state?.value) return null

  // `formatValue` alanın granularity/hourCycle/takvim ayarlarını zaten biliyor; biz yalnızca
  // hangi alanın nasıl yazılacağını (ör. month: 'long') söylüyoruz.
  return <Description>{state.formatValue(locale, fieldOptions)}</Description>
}

/* -------------------------------------------------------------------------------------------------
 * Saat paneli — DatePicker durumunu paylaşılan TimePanel'e bağlar
 * ------------------------------------------------------------------------------------------------- */

function PickerTimePanel({ options, texts }: { options: TimeOptions; texts: PickerTexts }) {
  const state = useContext(DatePickerStateContext)
  if (!state) return null

  return (
    <TimePanel
      value={state.timeValue}
      onChange={(time) => {
        // antd: saat seçilirken henüz tarih yoksa bugünü kullan
        if (!state.dateValue) state.setDateValue(today(getLocalTimeZone()))
        state.setTimeValue(time)
      }}
      options={options}
      texts={texts}
    />
  )
}
/* -------------------------------------------------------------------------------------------------
 * Footer — "Şimdi" / "Tamam"
 * ------------------------------------------------------------------------------------------------- */

function PickerFooter({ texts, hasTime }: { texts: PickerTexts; hasTime: boolean }) {
  const state = useContext(DatePickerStateContext)
  if (!state) return null

  const setNow = () => {
    const n = toCalendarDateTime(now(getLocalTimeZone()))
    state.setValue(hasTime ? n : n.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }))
    if (!hasTime) state.setOpen(false)
  }

  const confirm = () => {
    if (!state.value) setNow()
    state.setOpen(false)
  }

  return (
    <Toolbar aria-label={texts.now} className="flex justify-between p-2">
      <Button variant="ghost" size="sm" onPress={setNow}>
        {texts.now}
      </Button>
      {hasTime && (
        <Button variant="primary" size="sm" onPress={confirm}>
          {texts.ok}
        </Button>
      )}
    </Toolbar>
  )
}
