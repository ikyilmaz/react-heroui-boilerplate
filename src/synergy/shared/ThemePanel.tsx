import type { CSSProperties, ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Button, Divider, Drawer, Flex, Radio, Segmented, Select, Slider, Typography } from 'antd'
import { cn } from '@/synergy/ant/ui'
import {
  COLORS,
  DENSITIES,
  FONTS,
  RADII,
  SQUIRCLE_SUPPORTED,
  backgroundSwatch,
  lookVars,
  presetOf,
  same,
  textureSwatch,
  useIsDark,
  type Background,
  type CardStyle,
  type CornerShape,
  type Density,
  type MotionLevel,
  type Shadow,
  type Texture,
  type ThemeKit,
  type ThemeSettings,
  type TrailStyle,
} from '@/synergy/shared/themeSettings'

const IC = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/* -------------------------------------------------------------------------------------------------
 * Tema paneli (sağdan çekmece): birincil renk, köşe yuvarlaklığı ve biçimi, zemin ve dokusu, yazı
 * tipi, yoğunluk, gezinme konumu, kart stili, gölge, kontur ve animasyon. Değişiklikler anında
 * uygulanır ve saklanır (`themeSettings.ts`); varsayılan `theme.ts`'ten gelir (`kit`).
 * ------------------------------------------------------------------------------------------------- */

/** Zeminler; son dördü birincil renge göre uyumlu tonlar (`themeSettings.ts` › `HARMONY`). */
const BACKGROUNDS: { id: Background; label: string }[] = [
  { id: 'neutral', label: 'Nötr' },
  { id: 'cool', label: 'Serin' },
  { id: 'warm', label: 'Sıcak' },
  { id: 'white', label: 'Beyaz' },
  { id: 'analogous', label: 'Benzer' },
  { id: 'square', label: 'Dörtlü' },
  { id: 'triadic', label: 'Üçlü' },
  { id: 'complement', label: 'Zıt' },
]

/** Zemin dokuları: düz, iki desen, birincil renkten altı geçiş (`themeSettings.ts` › `TEXTURES`). */
const TEXTURES: { id: Texture; label: string }[] = [
  { id: 'none', label: 'Düz' },
  { id: 'dots', label: 'Nokta' },
  { id: 'grid', label: 'Kareli' },
  { id: 'top', label: 'Üstten' },
  { id: 'bottom', label: 'Alttan' },
  { id: 'corner', label: 'Köşe' },
  { id: 'spot', label: 'Işık' },
  { id: 'diagonal', label: 'Çapraz' },
  { id: 'aurora', label: 'Aurora' },
]

type Radius = (typeof RADII)[number]

const RADIUS_LABELS: Record<Radius, string> = { 0.25: 'Az', 0.5: 'Orta', 1: 'Çok' }

/**
 * Köşe önizlemesi (14px'lik kutunun sol üst köşesi): seçeneğin yarıçapı ölçekli, squircle'da
 * büyütülmüş (sayfadaki gibi); biçim sınıfta, sayfanın o anki biçiminden bağımsız. Sabit metin
 * (Tailwind görsün).
 */
const GLYPH: Record<CornerShape, Record<Radius, string>> = {
  round: {
    0.25: 'rounded-ss-[4px] [corner-shape:round]',
    0.5: 'rounded-ss-[7px] [corner-shape:round]',
    1: 'rounded-ss-[14px] [corner-shape:round]',
  },
  squircle: {
    0.25: 'rounded-ss-[6px] [corner-shape:squircle]',
    0.5: 'rounded-ss-[11px] [corner-shape:squircle]',
    1: 'rounded-ss-[14px] [corner-shape:squircle]',
  },
}

/** Köşe yuvarlaklığı: üst sıra yuvarlak, alt sıra squircle; her sırada az / orta / çok. */
const CORNERS = (['round', 'squircle'] as const).flatMap((corner) =>
  RADII.map((radius) => ({
    id: `${corner}:${radius}`,
    corner,
    radius,
    label: RADIUS_LABELS[radius],
    hint: corner === 'squircle' ? ', squircle' : ', yuvarlak',
    icon: (
      <Flex
        component="span"
        aria-hidden
        className={cn(
          'block size-3.5 shrink-0 border-s-2 border-t-2 border-current',
          GLYPH[corner][radius],
        )}
      />
    ),
    disabled: corner === 'squircle' && !SQUIRCLE_SUPPORTED,
  })),
)

const DENSITY_OPTIONS: { id: Density; label: string }[] = [
  { id: 'tight', label: 'Sıkı' },
  { id: 'compact', label: 'Kompakt' },
  { id: 'normal', label: 'Normal' },
  { id: 'roomy', label: 'Geniş' },
]

const CARD_STYLES: { id: CardStyle; label: string }[] = [
  { id: 'filled', label: 'Dolu' },
  { id: 'outlined', label: 'Çerçeveli' },
  { id: 'elevated', label: 'Yükseltilmiş' },
  { id: 'tinted', label: 'Tonlu' },
  { id: 'muted', label: 'Gri' },
]

const SHADOWS: { id: Shadow; label: string }[] = [
  { id: 'none', label: 'Yok' },
  { id: 'subtle', label: 'İnce' },
  { id: 'soft', label: 'Hafif' },
  { id: 'strong', label: 'Belirgin' },
  { id: 'deep', label: 'Derin' },
]

const BORDERS: { id: number; label: string }[] = [
  { id: 0, label: 'Yok' },
  { id: 0.5, label: 'Kıl' },
  { id: 1, label: 'İnce' },
  { id: 2, label: 'Kalın' },
  { id: 3, label: 'Çok kalın' },
]

const MOTIONS: { id: MotionLevel; label: string }[] = [
  { id: 'full', label: 'Tam' },
  { id: 'reduced', label: 'Az' },
  { id: 'off', label: 'Kapalı' },
]

/** Raftaki konum hapları (index.tsx › DockPath). */
const TRAILS: { id: TrailStyle; label: string }[] = [
  { id: 'soft', label: 'Yumuşak' },
  { id: 'solid', label: 'Dolu' },
]

const { Text } = Typography

/** Seçili bölüm birincil renkte (kayan işaret de). */
const SEGMENT =
  'w-full [&_.ant-segmented-item-selected]:bg-accent! [&_.ant-segmented-item-selected]:text-accent-foreground! [&_.ant-segmented-thumb]:bg-accent!'

/** Çok seçenekli grup: satırlarda ayrı, çerçeveli düğmeler; seçili olan birincil renkte. */
const GRID_SEGMENT =
  'grid! w-full gap-1 [&_.ant-radio-button-wrapper]:rounded-lg! [&_.ant-radio-button-wrapper]:border! [&_.ant-radio-button-wrapper]:border-border! [&_.ant-radio-button-wrapper]:px-1 [&_.ant-radio-button-wrapper]:text-center [&_.ant-radio-button-wrapper]:before:hidden! [&_.ant-radio-button-wrapper-checked]:border-accent! [&_.ant-radio-button-wrapper-checked]:bg-accent! [&_.ant-radio-button-wrapper-checked]:text-accent-foreground!'

/** Izgaradaki sütun sayısı (sabit metin; Tailwind görsün). */
const GRID_COLS = { 3: 'grid-cols-3', 4: 'grid-cols-4' } as const

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
          <Text type="secondary" className="text-xs">
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
  grid,
}: {
  label: string
  value: T
  /**
   * `dot`: seçeneğin önünde renk örneği (ör. zeminin rengi; birincil renge göre değişir); `icon`:
   * önünde küçük bir önizleme; `hint`: yalnızca ekran okuyucuda, adın ardından (aynı adlı
   * seçenekleri ayırır). Izgarada.
   */
  options: {
    id: T
    label: string
    dot?: string
    icon?: ReactNode
    hint?: string
    disabled?: boolean
  }[]
  onChange: (v: T) => void
  /** Tek satıra sığmayınca bu kadar sütunlu ızgara. */
  grid?: keyof typeof GRID_COLS
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
        options={options.map((o) => {
          const mark = o.dot ? (
            <Flex
              component="span"
              aria-hidden
              // Renk çalışma anında hesaplanır (birincil renk, açık / koyu)
              style={{ background: o.dot }}
              className="block size-2.5 shrink-0 rounded-full ring-1 ring-border"
            />
          ) : (
            o.icon
          )
          return {
            value: String(o.id),
            disabled: o.disabled,
            label:
              mark || o.hint ? (
                <Flex component="span" align="center" justify="center" gap={6}>
                  {mark}
                  {o.label}
                  {o.hint && <Text className="sr-only">{o.hint}</Text>}
                </Flex>
              ) : (
                o.label
              ),
          }
        })}
        className={cn(GRID_SEGMENT, GRID_COLS[grid])}
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

/**
 * Hazır temanın küçük önizlemesi: temanın bütün değişkenleri bu kaba yazılır (`lookVars`), içi o
 * temayla çizilir: zemin ve dokusu, kart (dolgu, kontur, gölge, köşe), başlık yazı tipi, birincil
 * renk.
 */
function PresetPreview({ look, dark }: { look: ThemeSettings; dark: boolean }) {
  return (
    <Flex
      aria-hidden
      vertical
      // Değişkenler çalışma anında hesaplanır (temanın ayarları, açık / koyu)
      style={lookVars(look, dark) as CSSProperties}
      className="h-24 w-full gap-1.5 rounded-xl bg-background bg-(image:--background-texture) bg-size-(--background-texture-size) p-2 font-sans text-foreground ring-1 ring-border"
    >
      {/* Üstte ince bir şerit: birincil renkli nokta ve iki çizgi */}
      <Flex align="center" gap={4} className="px-0.5">
        <Flex className="block size-2 rounded-full bg-accent" />
        <Flex className="block h-1 w-8 rounded-full bg-foreground/15" />
        <Flex className="block h-1 w-5 rounded-full bg-foreground/10" />
      </Flex>
      <Flex
        vertical
        gap={6}
        className="min-h-0 flex-1 rounded-lg bg-surface p-2 shadow-(--surface-shadow) ring-(length:--border-width) ring-border"
      >
        <Typography.Text className="font-display text-base leading-none font-bold text-current">
          Aa
        </Typography.Text>
        <Flex className="block h-1.5 w-3/4 rounded-full bg-surface-tertiary" />
        <Flex align="center" gap={4} className="mt-auto">
          <Flex className="block h-3.5 w-10 rounded-full bg-accent" />
          {/* Birincil rengin açık tonu (kabın kendi rengiyle; `--accent-soft` kökte çözülür) */}
          <Flex className="block h-3.5 w-7 rounded-full bg-[color-mix(in_oklab,var(--accent)_18%,transparent)]" />
        </Flex>
      </Flex>
    </Flex>
  )
}

/** Bölüm ayracı. */
const Separator = () => <Divider className="my-0" />

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
  const dark = useIsDark()
  const preset = presetOf(kit, settings)
  const atDefault = same(settings, kit.defaults)
  const color = COLORS.find((c) => c.id === settings.color)
  const outlined = settings.cardStyle === 'outlined'
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
      {kit.presets?.length ? (
        <>
          <Section
            title="Hazır temalar"
            value={preset ? undefined : atDefault ? 'Varsayılan' : 'Özel'}
          >
            <Flex className="grid grid-cols-2 gap-2" role="group" aria-label="Hazır temalar">
              {kit.presets.map((p) => {
                const on = preset === p.id
                return (
                  <Button
                    key={p.id}
                    type="text"
                    aria-pressed={on}
                    // Görünüş temadan; gezinme ve animasyon tercihleri olduğu gibi kalır
                    onClick={() => set(p.look)}
                    className={cn(
                      'relative h-auto flex-col items-stretch gap-2 rounded-2xl p-2 text-start font-normal ring-1 ring-border',
                      on && 'bg-accent-soft! ring-2 ring-accent',
                    )}
                  >
                    <PresetPreview look={{ ...settings, ...p.look }} dark={dark} />
                    <Flex vertical className="min-w-0 px-0.5 pb-0.5">
                      <Flex align="center" gap={6}>
                        <Text className="text-sm font-semibold text-current">{p.label}</Text>
                        {on && <Check {...IC} size={14} className="text-accent" />}
                      </Flex>
                      <Text type="secondary" className="line-clamp-2 text-xs whitespace-normal">
                        {p.description}
                      </Text>
                    </Flex>
                  </Button>
                )
              })}
            </Flex>
          </Section>
          <Separator />
        </>
      ) : null}

      <Section title="Birincil renk" value={color?.label}>
        <Flex wrap gap={8} role="group" aria-label="Renk örnekleri">
          {COLORS.map((c) => (
            <Button
              key={c.id}
              shape="circle"
              type="text"
              aria-label={c.label}
              aria-pressed={settings.color === c.id}
              onClick={() => set({ color: c.id })}
              icon={settings.color === c.id ? <Check {...IC} size={14} /> : undefined}
              className={cn(
                'size-8 min-w-8 rounded-full text-white! ring-offset-2 ring-offset-surface hover:opacity-90',
                settings.color === c.id && 'ring-2 ring-foreground',
                // Tailwind katmanı antd'nin üstünde: üzerine gelince de örnek rengi kalır
                c.cls,
              )}
            />
          ))}
        </Flex>
      </Section>

      <Section
        title="Köşe yuvarlaklığı"
        value={settings.corner === 'squircle' ? 'Squircle' : 'Yuvarlak'}
      >
        <Segments
          label="Köşe yuvarlaklığı"
          value={`${settings.corner}:${settings.radius}`}
          options={CORNERS}
          onChange={(id) => {
            const hit = CORNERS.find((o) => o.id === id)
            if (hit) set({ corner: hit.corner, radius: hit.radius })
          }}
          grid={3}
        />
        <Text type="secondary" className="text-xs">
          {SQUIRCLE_SUPPORTED
            ? 'Üst sıra yuvarlak, alt sıra squircle köşe.'
            : 'Üst sıra yuvarlak köşe; bu tarayıcı squircle çizemiyor.'}
        </Text>
      </Section>

      <Section title="Zemin">
        <Segments
          label="Zemin"
          value={settings.background}
          options={BACKGROUNDS.map((b) => ({
            ...b,
            dot: backgroundSwatch(b.id, settings.color, dark),
          }))}
          onChange={(background) => set({ background })}
          grid={4}
        />
        <Text type="secondary" className="text-xs">
          Son dördü birincil renge göre: benzer, dörtlü, üçlü ve zıt ton.
        </Text>
      </Section>

      <Section title="Zemin dokusu">
        <Segments
          label="Zemin dokusu"
          value={settings.texture}
          options={TEXTURES.map((t) => ({
            ...t,
            icon: (
              <Flex
                component="span"
                aria-hidden
                // Örnek çalışma anında hesaplanır (zemin, birincil renk, açık / koyu)
                style={textureSwatch(t.id, settings.background, settings.color, dark)}
                className="block size-3.5 shrink-0 rounded-[4px] ring-1 ring-border"
              />
            ),
          }))}
          onChange={(texture) => set({ texture })}
          grid={3}
        />
        <Text type="secondary" className="text-xs">
          Kartların arkasında; geçişler birincil renkten.
        </Text>
      </Section>

      <Separator />

      <Section title="Yazı tipi">
        <Select
          aria-label="Yazı tipi"
          value={settings.font}
          onChange={(font) => set({ font })}
          options={FONTS.map((f) => ({ value: f.id, label: f.label }))}
          className="w-full"
        />
      </Section>

      <Section
        title="Yoğunluk"
        value={`${Math.round((DENSITIES[settings.density].scale / 16) * 100)}%`}
      >
        <Segments
          label="Yoğunluk"
          value={settings.density}
          options={DENSITY_OPTIONS}
          onChange={(density) => set({ density })}
        />
        <Text type="secondary" className="text-xs">
          Yazı boyutu ve boşluklar birlikte.
        </Text>
      </Section>

      <Section title="Gezinme">
        <Segments
          label="Gezinme"
          value={settings.nav}
          options={kit.navOptions}
          onChange={(nav) => set({ nav })}
        />
      </Section>

      <Section title="Konum">
        <Segments
          label="Konum"
          value={settings.trail}
          options={TRAILS}
          onChange={(trail) => set({ trail })}
        />
      </Section>

      <Separator />

      <Section title="Kart stili">
        <Segments
          label="Kart stili"
          value={settings.cardStyle}
          options={CARD_STYLES}
          // Çerçeveli kart konturu olmadan görünmez: kontur yoksa ince olur
          onChange={(cardStyle) =>
            set({
              cardStyle,
              border: cardStyle === 'outlined' ? Math.max(settings.border, 1) : settings.border,
            })
          }
          grid={3}
        />
      </Section>

      <Section title="Kart gölgesi">
        <Segments
          label="Kart gölgesi"
          value={settings.shadow}
          options={SHADOWS}
          onChange={(shadow) => set({ shadow })}
        />
      </Section>

      <Section title="Kontur" value={`${settings.border}px`}>
        <Segments
          label="Kontur"
          value={settings.border}
          options={outlined ? BORDERS.filter((b) => b.id >= 1) : BORDERS}
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
                <Text key={t} type="secondary" className="text-[0.6875rem]">
                  {t}
                </Text>
              ))}
            </Flex>
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
    </Drawer>
  )
}
