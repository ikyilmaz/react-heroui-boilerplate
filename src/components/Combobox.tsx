import { useState, type ReactNode } from 'react'
import { ChevronDown, X } from 'lucide-react'
import {
  Button,
  ComboBox,
  Description,
  EmptyState,
  FieldError,
  Input,
  Label,
  ListBox,
  Surface,
  Typography,
  cn,
} from '@heroui/react'

import { FIELD_ICON_BUTTON, FIELD_ICON_SIZE, fieldIconButton } from '@/components/fieldIconButton'

/** Typography varsayılan olarak <p> basar; satır içi metinlerde <span> gerekir. */
const inlineText = { elementType: 'span', slot: null } as unknown as Record<string, never>

/* -------------------------------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------------------------------- */

export interface ComboboxOption {
  value: string
  label: string
  /** Satırda etiketin solunda ve seçiliyken alanın başında görünür. */
  icon?: ReactNode
  description?: string
  disabled?: boolean
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string | null, option: ComboboxOption | null) => void
  placeholder?: string
  /**
   * Yazarak filtreleme. `false` ise alan salt okunur olur ve liste her açılışta tam gelir.
   * @default true
   */
  showSearch?: boolean
  /** Temizle (×) düğmesi. @default true */
  allowClear?: boolean
  label?: string
  description?: string
  errorMessage?: string
  notFoundContent?: ReactNode
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  name?: string
  className?: string
  /** Alanın erişilebilir adı; `label` yoksa gerekir. */
  'aria-label'?: string
}

/* -------------------------------------------------------------------------------------------------
 * Combobox
 *
 * HeroUI `ComboBox` üzerine antd tarzı bir sarmalayıcı. Filtreleme React Aria'nın kendi
 * `defaultFilter`'ı (contains) ile yapılır; liste, tetikleyiciden açıldığında tam gelir
 * (`useComboBoxState`: trigger "manual" ya da "focus" ise tüm öğeler gösterilir).
 *
 * `ComboBox.InputGroup` çocuklarının SONUNCUSUNU tetikleyici sayar; bu yüzden
 * `ComboBox.Trigger` her zaman en sonda olmalı.
 * ------------------------------------------------------------------------------------------------- */

export function Combobox({
  options,
  value,
  defaultValue,
  onChange,
  placeholder = 'Seçiniz',
  showSearch = true,
  allowClear = true,
  label,
  description,
  errorMessage,
  notFoundContent = 'Sonuç yok',
  isDisabled,
  isInvalid,
  isRequired,
  name,
  className,
  'aria-label': ariaLabel,
}: ComboboxProps) {
  const [innerValue, setInnerValue] = useState<string | null>(defaultValue ?? null)
  const selected = value !== undefined ? value : innerValue
  const selectedOption = options.find((o) => o.value === selected) ?? null

  const commit = (next: string | null) => {
    if (value === undefined) setInnerValue(next)
    onChange?.(next, options.find((o) => o.value === next) ?? null)
  }

  const disabledKeys = options.filter((o) => o.disabled).map((o) => o.value)
  const showClear = allowClear && selected != null && !isDisabled

  return (
    <ComboBox
      className={cn('w-80 max-w-full', className)}
      aria-label={label ? undefined : ariaLabel}
      name={name}
      value={selected}
      onChange={(key) => commit(key == null ? null : String(key))}
      disabledKeys={disabledKeys}
      // Arama kapalıyken odakla açılsın: kullanıcı yazamadığı için tetikleyici tek yol kalmasın
      menuTrigger={showSearch ? 'input' : 'focus'}
      // Eşleşme yoksa açılır kutu kapanmasın, "sonuç yok" görünsün
      allowsEmptyCollection
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      fullWidth
    >
      {label && <Label>{label}</Label>}

      {/*
        HeroUI'nin combo-box'ı önek/sonek yuvaları olan bir input-group DEĞİL: görünen kutu
        `Input`'un kendisi, chevron ise gruba `absolute end-0` ile biniyor
        (`.combo-box__input-group` yalnızca `relative isolate` bir sarmalayıcı).
        Bu yüzden ikonu ve temizle düğmesini de konumlandırıp Input'un dolgusunu açıyoruz;
        normal kardeş olarak bırakılırsa kutunun dışına düşüyorlar.
      */}
      <ComboBox.InputGroup>
        {selectedOption?.icon && (
          <Typography
            aria-hidden
            color="muted"
            className="pointer-events-none absolute start-3 top-1/2 z-10 inline-flex -translate-y-1/2"
            {...inlineText}
          >
            {selectedOption.icon}
          </Typography>
        )}
        <Input
          placeholder={placeholder}
          readOnly={!showSearch}
          // Utility'ler `components` katmanından sonra geldiği için `.input`'un px-3'ünü ezer
          className={cn(selectedOption?.icon && 'ps-9', showClear ? 'pe-15' : 'pe-8')}
        />
        {/*
          HeroUI'nin combo-box'ı gerçek bir sonek yuvası tanımıyor: chevron `absolute end-0` ile
          kutuya biniyor. Temizle düğmesini de aynı hizaya koyuyoruz — 4px kenar boşluğu, 4px
          aralık; diğer alanların sonekleriyle aynı ölçüler (bkz. `FIELD_AFFIX`).
        */}
        {showClear && (
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Temizle"
            className={cn(FIELD_ICON_BUTTON, 'absolute end-8 top-1/2 z-10 -translate-y-1/2')}
            onPress={() => commit(null)}
          >
            <X size={FIELD_ICON_SIZE} aria-hidden />
          </Button>
        )}
        <ComboBox.Trigger className={cn(fieldIconButton, 'end-1 pe-0')}>
          <ChevronDown size={FIELD_ICON_SIZE} aria-hidden />
        </ComboBox.Trigger>
      </ComboBox.InputGroup>

      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>

      <ComboBox.Popover>
        <ListBox
          aria-label={label ?? ariaLabel ?? 'Seçenekler'}
          renderEmptyState={() => (
            <EmptyState className="py-6">
              <Typography type="body-sm" color="muted" align="center">
                {notFoundContent}
              </Typography>
            </EmptyState>
          )}
        >
          {options.map((o) => (
            <ListBox.Item key={o.value} id={o.value} textValue={o.label}>
              {o.icon && (
                <Typography
                  color="muted"
                  aria-hidden
                  className="inline-flex shrink-0"
                  {...inlineText}
                >
                  {o.icon}
                </Typography>
              )}
              <Surface variant="transparent" className="flex min-w-0 flex-1 flex-col">
                <Typography type="body-sm" truncate {...inlineText}>
                  {o.label}
                </Typography>
                {o.description && (
                  <Typography type="body-xs" color="muted" truncate {...inlineText}>
                    {o.description}
                  </Typography>
                )}
              </Surface>
              {/* HeroUI yalnızca kendi checkmark SVG'sini seçili değilken gizliyor; lucide ikonu elle gizlenmeli */}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  )
}
