import type { ReactNode } from 'react'
import { I18nProvider } from 'react-aria-components'
import { Button, Description, FieldError, Label, NumberField, Surface, cn } from '@heroui/react'
import { Minus, Plus, X } from 'lucide-react'
import { FIELD_ICON_BUTTON, FIELD_ICON_SIZE } from '@/components/fieldIconButton'

/* -------------------------------------------------------------------------------------------------
 * NumberBox
 *
 * HeroUI `NumberField` üzerine ince bir sarmalayıcı. Artırma/azaltma düğmeleri, adım, alt/üst
 * sınır ve biçimlendirme React Aria'dan gelir: `formatOptions` doğrudan `Intl.NumberFormat`
 * seçenekleridir, yazılan metni de aynı yerel ayara göre React Aria ayrıştırır (para birimi,
 * yüzde, birim ve binlik ayracı dâhil).
 * ------------------------------------------------------------------------------------------------- */

export interface NumberBoxProps {
  /** Kontrollü değer. Boş alan `null`'dır. */
  value?: number | null
  defaultValue?: number
  onChange?: (value: number | null) => void
  /** Ok tuşu ve düğmelerin adımı. @default 1 */
  step?: number
  minValue?: number
  maxValue?: number
  /** `Intl.NumberFormat` seçenekleri: para birimi, yüzde, birim, ondalık basamak... */
  formatOptions?: Intl.NumberFormatOptions
  /** − / + düğmeleri. @default true */
  showControls?: boolean
  /** Alan zemini; kart/panel üstünde "secondary" görünür kalır. @default "primary" */
  variant?: 'primary' | 'secondary'
  /** Tablo satırı ve filtre satırı gibi dar yerler için alçak alan. */
  compact?: boolean
  /**
   * Alanın başına, kenarlığın **içine** yerleşen içerik (ör. filtre işlemi seçici).
   * `NumberField.Group` bir grid; şablonu prefix'e göre açılıyor.
   */
  prefix?: ReactNode
  /** Değer varken alanın sonunda bir temizle (×) düğmesi. */
  isClearable?: boolean
  label?: string
  description?: string
  errorMessage?: string
  placeholder?: string
  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  /** BCP 47 dil etiketi. @default "tr-TR" */
  locale?: string
  name?: string
  className?: string
  /** Alanın erişilebilir adı; `label` yoksa gerekir. */
  'aria-label'?: string
}

export function NumberBox({
  value,
  defaultValue,
  onChange,
  step = 1,
  minValue,
  maxValue,
  formatOptions,
  showControls = true,
  variant,
  compact,
  prefix,
  isClearable,
  label,
  description,
  errorMessage,
  placeholder,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  locale = 'tr-TR',
  name,
  className,
  'aria-label': ariaLabel,
}: NumberBoxProps) {
  // Kontrolsüz kullanımda değeri bilmiyoruz; temizleme yalnızca kontrollü alanlarda anlamlı
  const clearVisible = Boolean(isClearable && value != null && !isDisabled && !isReadOnly)

  return (
    <I18nProvider locale={locale}>
      <NumberField
        className={cn('w-80 max-w-full', className)}
        variant={variant}
        aria-label={label ? undefined : ariaLabel}
        name={name}
        // React Aria boş alanı NaN ile temsil eder; dışarıya `null` olarak veriyoruz
        value={value === undefined ? undefined : (value ?? Number.NaN)}
        defaultValue={defaultValue}
        onChange={(next) => onChange?.(Number.isNaN(next) ? null : next)}
        step={step}
        minValue={minValue}
        maxValue={maxValue}
        formatOptions={formatOptions}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={isRequired}
        isInvalid={isInvalid}
        fullWidth
      >
        {label && <Label>{label}</Label>}

        {/*
          Düğmeler alanın iki yanında; HeroUI onları `slot="decrement"/"increment"` ile tanıyor.
          Grup `flex`: HeroUI'nin ızgarası düğmelere 40px sütun ayırıyor (düğmeler 24px), önek /
          temizle için de ayrı şablon gerekiyordu; flex'te her parça kendi genişliğinde.
        */}
        <NumberField.Group className={cn('flex items-center', compact && 'h-8')}>
          {prefix && (
            <Surface variant="transparent" className="flex items-center">
              {prefix}
            </Surface>
          )}
          {/*
            `NumberField.DecrementButton` kendi kenarlığını çiziyor ve varyant almıyor; RAC'in
            belgelediği yol olan `slot` ile sıradan bir `Button` kullanıyoruz. Böylece temizle
            düğmeleriyle aynı `ghost` görünümü ve yuvarlak hover'ı alıyor.
          */}
          {showControls && (
            <Button
              slot="decrement"
              variant="ghost"
              size="sm"
              isIconOnly
              className={cn('mx-1', FIELD_ICON_BUTTON)}
            >
              <Minus size={FIELD_ICON_SIZE} aria-hidden />
            </Button>
          )}
          <NumberField.Input
            placeholder={placeholder}
            className={cn('flex-1', showControls && 'px-1', compact && 'h-8 py-1')}
          />
          {showControls && (
            <Button
              slot="increment"
              variant="ghost"
              size="sm"
              isIconOnly
              className={cn('mx-1', FIELD_ICON_BUTTON)}
            >
              <Plus size={FIELD_ICON_SIZE} aria-hidden />
            </Button>
          )}
          {clearVisible && (
            <Button
              // RAC'in NumberField grubu düğmelere `slot` dayatıyor (increment/decrement);
              // bu düğme onlardan biri değil, context'ten çıkmak için `slot={null}`
              slot={null}
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label="Temizle"
              className={cn('me-1', FIELD_ICON_BUTTON)}
              onPress={() => onChange?.(null)}
            >
              <X size={FIELD_ICON_SIZE} aria-hidden />
            </Button>
          )}
        </NumberField.Group>

        {description && <Description>{description}</Description>}
        <FieldError>{errorMessage}</FieldError>
      </NumberField>
    </I18nProvider>
  )
}
