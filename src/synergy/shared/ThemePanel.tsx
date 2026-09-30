import { useId, type ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import {
  Button,
  Divider,
  Drawer,
  Flex,
  Form,
  Radio,
  Segmented,
  Select,
  Slider,
  Switch,
  Typography,
} from 'antd'
import { cn } from '@/synergy/ant/ui'
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
  type PageEffect,
  type Shadow,
  type ThemeKit,
  type ThemeSettings,
} from '@/synergy/shared/themeSettings'

const IC = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/* -------------------------------------------------------------------------------------------------
 * Tema paneli (sağdan çekmece): hazır temalar, birincil renk, vurgu gücü, köşe yuvarlaklığı,
 * düğme biçimi, zemin, yazı tipleri, ölçek, boşluk, gezinme konumu, kart stili, gölge, kontur ve animasyon. Değişiklikler anında uygulanır ve saklanır (`themeSettings.ts`).
 * Hazır temalar ve varsayılan `theme.ts`'ten gelir (`kit`).
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
  { id: 'medium', label: 'Orta' },
  { id: 'solid', label: 'Dolu' },
  { id: 'outline', label: 'Çizgili' },
  { id: 'ink', label: 'Koyu' },
]

const SHAPES: { id: ButtonShape; label: string }[] = [
  { id: 'default', label: 'Varsayılan' },
  { id: 'pill', label: 'Hap' },
  { id: 'square', label: 'Köşeli' },
]

/** Sayfa geçişi efektleri (ekran tümüyle değişince). */
const PAGE_EFFECTS: { id: PageEffect; label: string }[] = [
  { id: 'rise', label: 'Yükselme' },
  { id: 'fade', label: 'Solma' },
  { id: 'slide', label: 'Kayma' },
  { id: 'zoom', label: 'Yakınlaşma' },
  { id: 'blur', label: 'Bulanık' },
  { id: 'off', label: 'Kapalı' },
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

const { Text } = Typography

/** Seçili bölüm birincil renkte (kayan işaret de). */
const SEGMENT =
  'w-full [&_.ant-segmented-item-selected]:bg-accent! [&_.ant-segmented-item-selected]:text-accent-foreground! [&_.ant-segmented-thumb]:bg-accent!'

/** Çok seçenekli grup: üçerli satırlarda ayrı, çerçeveli düğmeler; seçili olan birincil renkte. */
const GRID_SEGMENT =
  'grid! w-full grid-cols-3 gap-1 [&_.ant-radio-button-wrapper]:rounded-lg! [&_.ant-radio-button-wrapper]:border! [&_.ant-radio-button-wrapper]:border-border! [&_.ant-radio-button-wrapper]:text-center [&_.ant-radio-button-wrapper]:before:hidden! [&_.ant-radio-button-wrapper-checked]:border-accent! [&_.ant-radio-button-wrapper-checked]:bg-accent! [&_.ant-radio-button-wrapper-checked]:text-accent-foreground!'

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
    <Flex vertical gap={10} role="group" aria-label={title}>
      <Flex align="baseline" justify="space-between" gap={8}>
        <Text strong className="text-sm">
          {title}
        </Text>
        {value != null && (
          <Text type="secondary" className="font-mono text-xs">
            {value}
          </Text>
        )}
      </Flex>
      {children}
    </Flex>
  )
}

/** Tek seçimli düğme grubu (segment). */
function Segments<T extends string | number>({
  label,
  value,
  options,
  onChange,
  grid = false,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  /** Çok seçenekte üçerli satırlar (tek satıra sığmayınca). */
  grid?: boolean
}) {
  const pick = (k: unknown) => {
    const hit = options.find((o) => String(o.id) === String(k))
    if (hit) onChange(hit.id)
  }
  if (grid)
    return (
      <Radio.Group
        aria-label={label}
        size="small"
        optionType="button"
        value={String(value)}
        onChange={(e) => pick(e.target.value)}
        options={options.map((o) => ({ value: String(o.id), label: o.label }))}
        className={GRID_SEGMENT}
      />
    )
  return (
    <Segmented
      aria-label={label}
      size="small"
      block
      value={String(value)}
      onChange={pick}
      options={options.map((o) => ({ value: String(o.id), label: o.label }))}
      className={SEGMENT}
    />
  )
}

/** Açıklamalı anahtar (tema paneli); etiket tıklanınca da değişir. */
function PanelSwitch({
  label,
  isSelected,
  onChange,
}: {
  label: string
  isSelected: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Flex component="label" align="center" gap={10} className="cursor-pointer">
      <Switch size="small" checked={isSelected} onChange={onChange} />
      <Text className="text-sm">{label}</Text>
    </Flex>
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
      ariaLabelForHandle={label}
      value={value}
      min={min}
      max={max}
      step={step}
      tooltip={{ open: false }}
      onChange={onChange}
      className="mx-1.5 my-1"
    />
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
  const id = useId()
  return (
    <Form.Item label={<Text className="text-xs text-muted">{label}</Text>} htmlFor={id}>
      <Select
        id={id}
        value={value}
        onChange={onChange}
        options={FONTS.map((f) => ({ value: f.id, label: f.label }))}
        className="w-full"
      />
    </Form.Item>
  )
}

/** Bölüm ayracı. */
const Separator = () => <Divider className="my-0" />

/** Kaydırıcı başlığı: ad ve değer. */
function RangeHead({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" className="text-xs">
      <Text type="secondary" className="text-xs">
        {label}
      </Text>
      <Text type="secondary" className="font-mono text-xs">
        {value}
      </Text>
    </Flex>
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
    <Drawer
      open={isOpen}
      onClose={onClose}
      placement="right"
      size={384}
      closable={{ placement: 'end' }}
      title={<Text className="font-display text-lg font-semibold">Tema</Text>}
      classNames={{ wrapper: 'max-w-full', body: 'flex flex-col gap-6 pb-6' }}
    >
      <Form layout="vertical" component={false}>
        {/* Hazır temalar */}
        <Section title="Hazır temalar">
          <Flex vertical gap={8} role="group" aria-label="Hazır temalar">
            {kit.presets.map((p) => (
              <Button
                key={p.id}
                type="text"
                aria-pressed={preset === p.id}
                onClick={() =>
                  onChange({
                    ...p.settings,
                    // Tercihler (animasyon, FPS, kaydırma gölgesi) hazır temayla değişmez
                    motion: settings.motion,
                    motionSpeed: settings.motionSpeed,
                    showFps: settings.showFps,
                    scrollShadow: settings.scrollShadow,
                  })
                }
                className={cn(
                  'h-auto w-full justify-start gap-3 rounded-xl border border-border px-3 py-2.5 text-start',
                  preset === p.id && 'border-accent bg-accent-soft! ring-1 ring-accent',
                )}
              >
                {/* Önizleme: zemin karesinde birincil renk */}
                <Flex
                  aria-hidden
                  align="center"
                  justify="center"
                  className={cn('size-10 shrink-0 rounded-lg ring-1 ring-border', p.surface)}
                >
                  <Flex className={cn('block size-5 rounded-full', p.swatch)} />
                </Flex>
                <Flex vertical className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold">{p.label}</Text>
                  <Text type="secondary" ellipsis className="text-xs">
                    {p.description}
                  </Text>
                </Flex>
                {preset === p.id && <Check {...IC} className="text-accent-soft-foreground" />}
              </Button>
            ))}
          </Flex>
          {!preset && (
            <Text type="secondary" className="text-xs">
              Özel ayarlar
            </Text>
          )}
        </Section>

        <Separator />

        {/* Birincil renk */}
        <Section title="Birincil renk" value={swatch ?? `${Math.round(settings.hue)}°`}>
          <Flex wrap gap={8} role="group" aria-label="Renk örnekleri">
            {SWATCHES.map((s) => (
              <Button
                key={s.label}
                shape="circle"
                type="text"
                aria-label={s.label}
                aria-pressed={swatch === s.label}
                onClick={() => set({ hue: s.hue, chroma: s.chroma, lightness: s.lightness })}
                icon={swatch === s.label ? <Check {...IC} size={14} /> : undefined}
                className={cn(
                  'size-8 min-w-8 rounded-full text-white! ring-offset-2 ring-offset-surface hover:opacity-90',
                  swatch === s.label && 'ring-2 ring-foreground',
                  // Tailwind katmanı antd'nin üstünde: üzerine gelince de örnek rengi kalır
                  s.cls,
                )}
              />
            ))}
          </Flex>
          <Flex vertical gap={12} className="pt-1">
            <Flex vertical gap={4}>
              <RangeHead label="Ton" value={`${Math.round(settings.hue)}°`} />
              <Range
                label="Ton"
                value={settings.hue}
                min={0}
                max={360}
                step={1}
                onChange={(hue) => set({ hue })}
              />
            </Flex>
            <Flex vertical gap={4}>
              <RangeHead
                label="Doygunluk"
                value={`${Math.round((settings.chroma / 0.24) * 100)}%`}
              />
              <Range
                label="Doygunluk"
                value={settings.chroma}
                min={0}
                max={0.24}
                step={0.005}
                onChange={(chroma) => set({ chroma })}
              />
            </Flex>
            <Flex vertical gap={4}>
              <RangeHead label="Koyuluk" value={`${Math.round((1 - settings.lightness) * 100)}%`} />
              <Range
                label="Koyuluk"
                value={settings.lightness}
                min={0.3}
                max={0.65}
                step={0.01}
                onChange={(lightness) => set({ lightness })}
              />
            </Flex>
          </Flex>
        </Section>

        <Section title="Vurgu gücü">
          <Segments
            label="Vurgu gücü"
            value={settings.accent}
            options={ACCENTS}
            onChange={(accent) => set({ accent })}
            grid
          />
          <Text type="secondary" className="text-xs">
            Karşılama kartı, başlık bantları ve öne çıkan karolar: birincil rengin açık ya da
            belirgin tonu, dolu rengi, beyaz zeminde çerçeve ya da koyu zemin.
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
                <Text type="secondary" className="text-xs">
                  Sistem hareketi azaltıyor; animasyonlar az düzeyde.
                </Text>
              )}
            </Section>
            <Section title="Sayfa geçişi">
              <Segments
                label="Sayfa geçişi"
                value={settings.pageTransition}
                options={PAGE_EFFECTS}
                onChange={(pageTransition) => set({ pageTransition })}
                grid
              />
            </Section>
            <Section title="Animasyon hızı" value={`${settings.motionSpeed.toFixed(1)}×`}>
              <Range
                label="Animasyon hızı"
                value={settings.motionSpeed}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(v) => set({ motionSpeed: Math.round(v * 10) / 10 })}
              />
              <Flex justify="space-between">
                {['0.1× yavaş', '1×', '3× hızlı'].map((t) => (
                  <Text key={t} type="secondary" className="font-mono text-[0.6875rem]">
                    {t}
                  </Text>
                ))}
              </Flex>
            </Section>
            <Section title="Kaydırma gölgesi">
              <PanelSwitch
                label="Kayan alanların kenarında gölge"
                isSelected={settings.scrollShadow}
                onChange={(scrollShadow) => set({ scrollShadow })}
              />
            </Section>
            <Section title="Performans">
              <PanelSwitch
                label="FPS'i göster"
                isSelected={settings.showFps}
                onChange={(showFps) => set({ showFps })}
              />
            </Section>
          </>
        )}

        <Button
          onClick={() => onChange(kit.defaults)}
          disabled={same(settings, kit.defaults)}
          icon={<RotateCcw {...IC} />}
          className="mt-2 border border-border bg-transparent"
        >
          Varsayılana dön
        </Button>
      </Form>
    </Drawer>
  )
}
