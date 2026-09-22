import { Select, Surface, cn } from '@heroui/react'
import { ChevronDown } from 'lucide-react'
import { FIELD_ICON_SIZE, fieldIconButton } from '@/components/fieldIconButton'

/**
 * Select'lerin chevron'u. HeroUI'nin `.select__indicator`ı 16px'lik düz bir ikon ve `end-2`de
 * duruyor; diğer alanların sonekleri ise 24x24 yuvarlak kutular ve kenardan 4px. Aynı görünümü
 * vermek için ikonu bir kutuya alıp konumunu `end-1`e çekiyoruz.
 *
 * `Select.Indicator` çocuğunu klonlayıp className'i ona geçiriyor — o yüzden kutu çocuk olmalı.
 * Tetikleyici de `pe-8` almalı (HeroUI `pe-7` veriyor) ki metin kutunun altına girmesin.
 */
export function FieldSelectIndicator() {
  return (
    <Select.Indicator className={cn(fieldIconButton, 'end-1')}>
      <Surface variant="transparent">
        <ChevronDown size={FIELD_ICON_SIZE} aria-hidden />
      </Surface>
    </Select.Indicator>
  )
}
