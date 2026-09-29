import type { ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import {
  Button,
  Drawer,
  Label,
  ListBox,
  Select,
  Separator,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  cn,
} from '@heroui/react'
import { inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import {
  FONTS,
  presetOf,
  same,
  type AccentStrength,
  type Background,
  type ButtonShape,
  type CardStyle,
  type FontId,
  type MotionLevel,
  type Shadow,
  type ThemeKit,
  type ThemeSettings,
} from '@/synergy/shared/themeSettings'

const IC = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/* -------------------------------------------------------------------------------------------------
 * Tema paneli (sağdan çekmece): hazır temalar, birincil renk, vurgu gücü, köşe yuvarlaklığı,
 * düğme biçimi, zemin, yazı tipleri, ölçek, boşluk, gezinme konumu, kart stili, gölge, kontur ve (sürüm destekliyorsa) animasyon. Değişiklikler anında uygulanır ve saklanır (`themeSettings.ts`).
 * Hazır temalar ve varsayılan sürümden gelir (`kit`).
 * ------------------------------------------------------------------------------------------------- */

/** Birincil renk örnekleri; sınıflar Tailwind'in görmesi için sabit metin. */
const SWATCHES: { label: string; hue: number; chroma: number; lightness: number; cls: string }[] = [
  { label: 'Mavi', hue: 262, chroma: 0.16, lightness: 0.5, cls: 'bg-[oklch(0.5_0.16_262)]' },
  { label: 'Çivit', hue: 280, chroma: 0.17, lightness: 0.5, cls: 'bg-[oklch(0.5_0.17_280)]' },
  { label: 'Mor', hue: 305, chroma: 0.18, lightness: 0.5, cls: 'bg-[oklch(0.5_0.18_305)]' },
  { label: 'Gül', hue: 355, chroma: 0.16, lightness: 0.55, cls: 'bg-[oklch(0.55_0.16_355)]' },
  { label: 'Turuncu', hue: 50, chroma: 0.15, lightness: 0.56, cls: 'bg-[oklch(0.56_0.15_50)]' },
  { label: 'Yeşil', hue: 155, chroma: 0.11, lightness: 0.47, cls: 'bg-[oklch(0.47_0.11_155)]' },
  { label: 'Turkuaz', hue: 190, chroma: 0.1, lightness: 0.5, cls: 'bg-[oklch(0.5_0.1_190)]' },
  { label: 'Petrol', hue: 210, chroma: 0.1, lightness: 0.5, cls: 'bg-[oklch(0.5_0.1_210)]' },
  { label: 'Grafit', hue: 260, chroma: 0.02, lightness: 0.32, cls: 'bg-[oklch(0.32_0.02_260)]' },
]

const BACKGROUNDS: { id: Background; label: string }[] = [
  { id: 'neutral', label: 'Nötr' },
  { id: 'cool', label: 'Serin' },
  { id: 'warm', label: 'Sıcak' },
  { id: 'tinted', label: 'Renkli' },
]

const SHADOWS: { id: Shadow; label: string }[] = [
  { id: 'none', label: 'Yok' },
  { id: 'soft', label: 'Hafif' },
  { id: 'strong', label: 'Belirgin' },
]

const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: 'filled', label: 'Dolu' },
  { id: 'outlined', label: 'Çerçeveli' },
  { id: 'elevated', label: 'Yükseltilmiş' },
]

const ACCENTS: { id: AccentStrength; label: string }[] = [
  { id: 'default', label: 'Varsayılan' },
  { id: 'soft', label: 'Hafif' },
  { id: 'solid', label: 'Dolu' },
]

const SHAPES: { id: ButtonShape; label: string }[] = [
  { id: 'default', label: 'Varsayılan' },
  { id: 'pill', label: 'Hap' },
  { id: 'square', label: 'Köşeli' },
]

const MOTIONS: { id: MotionLevel; label: string }[] = [
  { id: 'full', label: 'Tam' },
  { id: 'reduced', label: 'Az' },
  { id: 'off', label: 'Kapalı' },
]

const SPACINGS = [
  { id: 0.21, label: 'Sıkı' },
  { id: 0.23, label: 'Kompakt' },
  { id: 0.25, label: 'Normal' },
  { id: 0.29, label: 'Ferah' },
]

const SEGMENT = 'flex-1 data-selected:bg-accent data-selected:text-accent-foreground'

function Section({
  title,
  value,
  children,
}: {
  title: string
  value?: ReactNode
  children: ReactNode
}) {
  return (
    <Box role="group" aria-label={title} className="flex flex-col gap-2.5">
      <Box className="flex items-baseline justify-between gap-2">
        <Typography type="body-sm" weight="semibold">
          {title}
        </Typography>
        {value != null && (
          <Text tone="muted" className="font-mono text-xs">
            {value}
          </Text>
        )}
      </Box>
      {children}
    </Box>
  )
}

/** Tek seçimli düğme grubu (segment). */
function Segments<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      size="sm"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[String(value)]}
      onSelectionChange={(keys) => {
        const [k] = [...keys]
        const hit = options.find((o) => String(o.id) === String(k))
        if (hit) onChange(hit.id)
      }}
      className="w-full"
    >
      {options.map((o) => (
        <ToggleButton key={String(o.id)} id={String(o.id)} className={SEGMENT}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <Slider
      aria-label={label}
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      onChange={(v) => onChange(Array.isArray(v) ? v[0]! : v)}
      className="w-full"
    >
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  )
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: FontId
  onChange: (v: FontId) => void
}) {
  return (
    <Select value={value} onChange={(v) => v && onChange(v as FontId)} className="w-full">
      <Label className="text-xs text-muted">{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={label}>
          {FONTS.map((f) => (
            <ListBox.Item key={f.id} id={f.id} textValue={f.label}>
              {f.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

export function ThemePanel({
  kit,
  isOpen,
  onClose,
  settings,
  onChange,
  reducedBySystem = false,
}: {
  kit: ThemeKit
  isOpen: boolean
  onClose: () => void
  settings: ThemeSettings
  onChange: (s: ThemeSettings) => void
  /** Sistem "hareketi azalt" diyor (Animasyon bölümünde not). */
  reducedBySystem?: boolean
}) {
  const set = (patch: Partial<ThemeSettings>) => onChange({ ...settings, ...patch })
  const preset = presetOf(kit, settings)
  const swatch = SWATCHES.find(
    (s) =>
      s.hue === settings.hue && s.chroma === settings.chroma && s.lightness === settings.lightness,
  )?.label
  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Trigger className="hidden" aria-hidden />
      <Drawer.Content placement="right">
        <Drawer.Dialog className="w-96 max-w-full">
          <Drawer.Header>
            <Drawer.Heading className="font-display text-lg font-semibold">Tema</Drawer.Heading>
            <Drawer.CloseTrigger />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6 pb-6">
            {/* Hazır temalar */}
            <Section title="Hazır temalar">
              <ToggleButtonGroup
                aria-label="Hazır temalar"
                isDetached
                selectionMode="single"
                selectedKeys={preset ? [preset] : []}
                onSelectionChange={(keys) => {
                  const p = kit.presets.find((x) => x.id === [...keys][0])
                  if (p) onChange({ ...p.settings, motion: settings.motion })
                }}
                className="grid grid-cols-1 gap-2"
              >
                {kit.presets.map((p) => (
                  <ToggleButton
                    key={p.id}
                    id={p.id}
                    variant="ghost"
                    className="h-auto w-full justify-start gap-3 rounded-xl border border-border px-3 py-2.5 text-start data-selected:border-accent data-selected:bg-accent-soft data-selected:ring-1 data-selected:ring-accent"
                  >
                    {/* Önizleme: zemin karesinde birincil renk */}
                    <Box
                      aria-hidden
                      className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-lg ring-1 ring-border',
                        p.surface,
                      )}
                    >
                      <Box className={cn('size-5 rounded-full', p.swatch)} />
                    </Box>
                    <Box className="min-w-0 flex-1">
                      <Typography
                        {...inline}
                        className="block text-sm font-semibold text-foreground"
                      >
                        {p.label}
                      </Typography>
                      <Typography {...inline} className="block truncate text-xs text-muted!">
                        {p.description}
                      </Typography>
                    </Box>
                    {preset === p.id && <Check {...IC} className="text-accent-soft-foreground" />}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              {!preset && (
                <Text tone="muted" className="text-xs">
                  Özel ayarlar
                </Text>
              )}
            </Section>

            <Separator />

            {/* Birincil renk */}
            <Section title="Birincil renk" value={swatch ?? `${Math.round(settings.hue)}°`}>
              <ToggleButtonGroup
                aria-label="Renk örnekleri"
                isDetached
                selectionMode="single"
                selectedKeys={swatch ? [swatch] : []}
                onSelectionChange={(keys) => {
                  const s = SWATCHES.find((x) => x.label === [...keys][0])
                  if (s) set({ hue: s.hue, chroma: s.chroma, lightness: s.lightness })
                }}
                className="flex flex-wrap justify-start gap-2"
              >
                {SWATCHES.map((s) => (
                  <ToggleButton
                    key={s.label}
                    id={s.label}
                    isIconOnly
                    aria-label={s.label}
                    className={cn(
                      'size-8 min-w-8 rounded-full text-white ring-offset-2 ring-offset-surface data-selected:ring-2 data-selected:ring-foreground',
                      s.cls,
                    )}
                  >
                    {swatch === s.label && <Check {...IC} size={14} />}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Box className="flex flex-col gap-3 pt-1">
                <Box className="flex flex-col gap-1">
                  <Box className="flex justify-between text-xs text-muted">
                    <Text className="text-current">Ton</Text>
                    <Text className="font-mono text-current">{Math.round(settings.hue)}°</Text>
                  </Box>
                  <Range
                    label="Ton"
                    value={settings.hue}
                    min={0}
                    max={360}
                    step={1}
                    onChange={(hue) => set({ hue })}
                  />
                </Box>
                <Box className="flex flex-col gap-1">
                  <Box className="flex justify-between text-xs text-muted">
                    <Text className="text-current">Doygunluk</Text>
                    <Text className="font-mono text-current">
                      {Math.round((settings.chroma / 0.24) * 100)}%
                    </Text>
                  </Box>
                  <Range
                    label="Doygunluk"
                    value={settings.chroma}
                    min={0}
                    max={0.24}
                    step={0.005}
                    onChange={(chroma) => set({ chroma })}
                  />
                </Box>
                <Box className="flex flex-col gap-1">
                  <Box className="flex justify-between text-xs text-muted">
                    <Text className="text-current">Koyuluk</Text>
                    <Text className="font-mono text-current">
                      {Math.round((1 - settings.lightness) * 100)}%
                    </Text>
                  </Box>
                  <Range
                    label="Koyuluk"
                    value={settings.lightness}
                    min={0.3}
                    max={0.65}
                    step={0.01}
                    onChange={(lightness) => set({ lightness })}
                  />
                </Box>
              </Box>
            </Section>

            <Section title="Vurgu gücü">
              <Segments
                label="Vurgu gücü"
                value={settings.accent}
                options={ACCENTS}
                onChange={(accent) => set({ accent })}
              />
              <Text tone="muted" className="text-xs">
                Karşılama kartı, başlık bantları ve öne çıkan karolar birincil rengin açık tonunda
                mı, dolu renkte mi dursun.
              </Text>
            </Section>

            <Separator />

            <Section title="Köşe yuvarlaklığı" value={`${Math.round(settings.radius * 16)}px`}>
              <Range
                label="Köşe yuvarlaklığı"
                value={settings.radius}
                min={0}
                max={1.25}
                step={0.125}
                onChange={(radius) => set({ radius })}
              />
            </Section>

            <Section title="Düğme ve etiket biçimi">
              <Segments
                label="Düğme ve etiket biçimi"
                value={settings.buttonShape}
                options={SHAPES}
                onChange={(buttonShape) => set({ buttonShape })}
              />
            </Section>

            <Section title="Zemin">
              <Segments
                label="Zemin"
                value={settings.background}
                options={BACKGROUNDS}
                onChange={(background) => set({ background })}
              />
            </Section>

            <Separator />

            <Section title="Yazı tipleri">
              <FontSelect
                label="Başlıklar"
                value={settings.headingFont}
                onChange={(headingFont) => set({ headingFont })}
              />
              <FontSelect
                label="Metin"
                value={settings.bodyFont}
                onChange={(bodyFont) => set({ bodyFont })}
              />
            </Section>

            <Section title="Ölçek" value={`${Math.round((settings.scale / 16) * 100)}%`}>
              <Segments
                label="Ölçek"
                value={settings.scale}
                options={[
                  { id: 14, label: 'Sıkı' },
                  { id: 15, label: 'Kompakt' },
                  { id: 16, label: 'Normal' },
                  { id: 17, label: 'Geniş' },
                ]}
                onChange={(scale) => set({ scale })}
              />
            </Section>

            <Section title="Boşluk" value={`${Math.round((settings.spacing / 0.25) * 100)}%`}>
              <Segments
                label="Boşluk"
                value={settings.spacing}
                options={SPACINGS}
                onChange={(spacing) => set({ spacing })}
              />
            </Section>

            <Section title="Gezinme">
              <Segments
                label="Gezinme"
                value={settings.nav}
                options={kit.navOptions}
                onChange={(nav) => set({ nav })}
              />
            </Section>

            <Separator />

            <Section title="Kart stili">
              <Segments
                label="Kart stili"
                value={settings.cardStyle}
                options={CARD_STYLES}
                onChange={(cardStyle) => set({ cardStyle })}
              />
            </Section>

            {settings.cardStyle === 'filled' && (
              <Section title="Kart gölgesi">
                <Segments
                  label="Kart gölgesi"
                  value={settings.shadow}
                  options={SHADOWS}
                  onChange={(shadow) => set({ shadow })}
                />
              </Section>
            )}

            <Section title="Kontur" value={`${settings.border}px`}>
              <Segments
                label="Kontur"
                value={settings.border}
                options={[
                  { id: 0, label: 'Yok' },
                  { id: 1, label: 'İnce' },
                  { id: 2, label: 'Kalın' },
                ]}
                onChange={(border) => set({ border })}
              />
            </Section>

            {kit.motion && (
              <>
                <Separator />
                <Section title="Animasyon">
                  <Segments
                    label="Animasyon"
                    value={settings.motion}
                    options={MOTIONS}
                    onChange={(motion) => set({ motion })}
                  />
                  {settings.motion === 'full' && reducedBySystem && (
                    <Text tone="muted" className="text-xs">
                      Sistem hareketi azaltıyor; animasyonlar az düzeyde.
                    </Text>
                  )}
                </Section>
              </>
            )}

            <Button
              variant="outline"
              onPress={() => onChange(kit.defaults)}
              isDisabled={same(settings, kit.defaults)}
              className="mt-2"
            >
              <RotateCcw {...IC} />
              Varsayılana dön
            </Button>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Root>
  )
}
