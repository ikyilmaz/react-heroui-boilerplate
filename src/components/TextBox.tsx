import { useMemo, useRef, useState } from 'react'
import {
  Button,
  Description,
  FieldError,
  Input,
  InputGroup,
  Label,
  Popover,
  Separator,
  Surface,
  TextField,
  Tooltip,
  cn,
  popoverVariants,
} from '@heroui/react'
import { Languages, X } from 'lucide-react'
import { FIELD_AFFIX, FIELD_ICON_BUTTON, FIELD_ICON_SIZE } from '@/components/fieldIconButton'

/* -------------------------------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------------------------------- */

export interface TextBoxLanguage {
  /** BCP 47 ya da kısa kod; çeviri haritasının anahtarı. */
  code: string
  label: string
}

export interface TextBoxProps {
  /** Ana dilin değeri. Çok dilli modda listenin ilk diline karşılık gelir. */
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void

  label?: string
  placeholder?: string
  description?: string
  errorMessage?: string

  /** Değer varken alanın sonunda temizle (×) düğmesi. @default false */
  allowClear?: boolean
  /** Alt satırda karakter sayacı. `maxLength` verilirse "12 / 40" biçiminde. @default false */
  showCharacterCount?: boolean
  maxLength?: number

  /**
   * Çok dilli giriş. Verildiğinde sonekte bir düğme çıkar ve düğme diğer dilleri doldurmak için
   * bir popover açar. Listenin **ilk** dili ana alandır (`value` / `onChange`); geri kalanlar
   * `translations` haritasında tutulur.
   */
  languages?: TextBoxLanguage[]
  /** Yalnızca ikincil diller; anahtar `languages[1..].code`. */
  translations?: Record<string, string>
  onTranslationsChange?: (translations: Record<string, string>) => void

  isDisabled?: boolean
  isReadOnly?: boolean
  isRequired?: boolean
  isInvalid?: boolean
  name?: string
  className?: string
  /** Alanın erişilebilir adı; `label` yoksa gerekir. */
  'aria-label'?: string
}

/* -------------------------------------------------------------------------------------------------
 * TextBox
 *
 * HeroUI `TextField` + `InputGroup` üzerine ince bir sarmalayıcı. Sonek yuvası temizle ve
 * çeviri düğmelerini taşır; çeviri popover'ı `Popover.Root` yerine kontrollü
 * `Popover.Content` + `triggerRef` ile kurulur (Root bir `DialogTrigger` olduğu için yanındaki
 * temizle düğmesi de tetikleyici gibi davranırdı — aynı tuzağı `TimePicker`'da da yaşamıştık).
 * ------------------------------------------------------------------------------------------------- */

export function TextBox({
  value,
  defaultValue,
  onChange,
  label,
  placeholder,
  description,
  errorMessage,
  allowClear = false,
  showCharacterCount = false,
  maxLength,
  languages,
  translations,
  onTranslationsChange,
  isDisabled,
  isReadOnly,
  isRequired,
  isInvalid,
  name,
  className,
  'aria-label': ariaLabel,
}: TextBoxProps) {
  const [innerValue, setInnerValue] = useState(defaultValue ?? '')
  const metin = value !== undefined ? value : innerValue

  const [innerTranslations, setInnerTranslations] = useState<Record<string, string>>({})
  const ceviriler = translations ?? innerTranslations

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverSlots = useMemo(() => popoverVariants(), [])

  const yaz = (next: string) => {
    if (value === undefined) setInnerValue(next)
    onChange?.(next)
  }

  const ceviriYaz = (code: string, next: string) => {
    const harita = { ...ceviriler, [code]: next }
    if (translations === undefined) setInnerTranslations(harita)
    onTranslationsChange?.(harita)
  }

  const anaDil = languages?.[0]
  const digerDiller = languages?.slice(1) ?? []
  const doluCeviri = digerDiller.filter((d) => (ceviriler[d.code] ?? '').trim() !== '').length

  const duzenlenebilir = !isDisabled && !isReadOnly
  const temizleGorunur = allowClear && metin !== '' && duzenlenebilir
  const sonekVar = temizleGorunur || !!languages

  const sayac = maxLength ? `${metin.length} / ${maxLength}` : String(metin.length)

  return (
    /*
      Popover, `TextField`in **dışında**: içinde kalınca dış alanın RAC context'lerini
      (özellikle `TextContext`) miras alıyor ve içerideki `Label`/`Description` "A slot prop is
      required" ile patlıyordu.
    */
    <Surface variant="transparent" className={cn('w-80 max-w-full', className)}>
      <TextField
        aria-label={label ? undefined : ariaLabel}
        name={name}
        value={metin}
        onChange={yaz}
        isDisabled={isDisabled}
        isReadOnly={isReadOnly}
        isRequired={isRequired}
        isInvalid={isInvalid}
        fullWidth
      >
        {label && <Label>{label}</Label>}

        <InputGroup className="w-full">
          {/* Daralabilmeli: yoksa sonek kutunun dışına taşıyor (bkz. DataGrid filtre satırı) */}
          <InputGroup.Input
            className="min-w-0 flex-1"
            placeholder={placeholder}
            maxLength={maxLength}
          />

          {sonekVar && (
            <InputGroup.Suffix className={FIELD_AFFIX}>
              {temizleGorunur && (
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label="Temizle"
                  className={FIELD_ICON_BUTTON}
                  onPress={() => yaz('')}
                >
                  <X size={FIELD_ICON_SIZE} aria-hidden />
                </Button>
              )}

              {languages && (
                <Tooltip>
                  <Button
                    ref={triggerRef}
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={doluCeviri ? `Çeviriler (${doluCeviri} dil dolu)` : 'Çeviriler'}
                    className={cn(FIELD_ICON_BUTTON, doluCeviri && 'text-accent hover:text-accent')}
                    isDisabled={isDisabled}
                    onPress={() => setOpen((a) => !a)}
                  >
                    <Languages size={FIELD_ICON_SIZE} aria-hidden />
                  </Button>
                  <Tooltip.Content>Çeviriler</Tooltip.Content>
                </Tooltip>
              )}
            </InputGroup.Suffix>
          )}
        </InputGroup>

        {(description || showCharacterCount) && (
          <Surface
            variant="transparent"
            className="flex flex-row items-center justify-between gap-2"
          >
            <Description>{description}</Description>
            {showCharacterCount && (
              <Description className="shrink-0 tabular-nums">{sayac}</Description>
            )}
          </Surface>
        )}

        <FieldError>{errorMessage}</FieldError>
      </TextField>

      {languages && (
        <Popover.Content
          triggerRef={triggerRef}
          isOpen={open}
          onOpenChange={setOpen}
          placement="bottom end"
          offset={6}
          aria-label="Çeviriler"
          className={cn(popoverSlots.base(), 'flex w-72 flex-col gap-3 p-3')}
        >
          {anaDil && (
            <>
              <TextField
                fullWidth
                value={metin}
                onChange={yaz}
                isDisabled={isDisabled}
                isReadOnly={isReadOnly}
              >
                <Label>{anaDil.label}</Label>
                <Input placeholder={placeholder} maxLength={maxLength} />
              </TextField>
              <Separator />
            </>
          )}

          {digerDiller.map((dil) => (
            <TextField
              key={dil.code}
              fullWidth
              value={ceviriler[dil.code] ?? ''}
              onChange={(v) => ceviriYaz(dil.code, v)}
              isDisabled={isDisabled}
              isReadOnly={isReadOnly}
            >
              <Label>{dil.label}</Label>
              <Input placeholder={placeholder} maxLength={maxLength} />
            </TextField>
          ))}
        </Popover.Content>
      )}
    </Surface>
  )
}
