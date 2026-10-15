import { memo, type ReactNode } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Button, Divider, Drawer, Flex, Radio, Segmented, Select, Typography } from 'antd'
import { CARD, FLOATING_DRAWER, cn } from '@/synergy/ant/ui'
import {
  COLORS,
  DENSITIES,
  FONTS,
  FULL_MOTION,
  MINIMAL_MOTION,
  RADII,
  SQUIRCLE_SUPPORTED,
  same,
  type CardFill,
  type DetailStyle,
  type CornerShape,
  type Density,
  type MotionLevel,
  type Shadow,
  type ThemeKit,
  type ThemeSettings,
  type Toggle,
} from '@/synergy/shared/themeSettings'

const IC = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/* -------------------------------------------------------------------------------------------------
 * Tema paneli (sağdan yüzen çekmece): birincil renk, köşe yuvarlaklığı ve biçimi, yazı tipi,
 * yoğunluk, gezinme konumu, kartlar (dolgu, gölge, kontur, kabarık kenar; bir kutuda) ve animasyon. Değişiklikler anında
 * uygulanır ve saklanır (`themeSettings.ts`); varsayılan `theme.ts`'ten gelir (`kit`).
 * ------------------------------------------------------------------------------------------------- */

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

/** Detay sayfası: yan bilgilerin rafı bandın köşesine gömülü ya da formun yanında yüzen kart. */
const DETAIL_STYLES: { id: DetailStyle; label: string }[] = [
  { id: 'embedded', label: 'Gömülü' },
  { id: 'floating', label: 'Yüzen' },
]

const CARD_FILLS: { id: CardFill; label: string }[] = [
  { id: 'surface', label: 'Yüzey' },
  { id: 'background', label: 'Zemin' },
  { id: 'muted', label: 'Gri' },
  { id: 'tinted', label: 'Tonlu' },
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
  { id: 'full', label: 'Açık' },
  { id: 'reduced', label: 'Az' },
  { id: 'off', label: 'Kapalı' },
]

const TOGGLES: { id: Toggle; label: string }[] = [
  { id: 'on', label: 'Açık' },
  { id: 'off', label: 'Kapalı' },
]

const { Text } = Typography

/** Seçili bölüm birincil renkte (kayan işaret de); dar iç boşluk (beş seçenek kart kutusuna sığsın). */
const SEGMENT =
  'w-full [&_.ant-segmented-item-label]:px-1 [&_.ant-segmented-item-selected]:bg-accent! [&_.ant-segmented-item-selected]:text-accent-foreground! [&_.ant-segmented-thumb]:bg-accent!'

/** Çok seçenekli grup: satırlarda ayrı, çerçeveli düğmeler; seçili olan birincil renkte. */
const GRID_SEGMENT =
  'grid! w-full gap-1 [&_.ant-radio-button-wrapper]:rounded-lg! [&_.ant-radio-button-wrapper]:border! [&_.ant-radio-button-wrapper]:border-border! [&_.ant-radio-button-wrapper]:px-1 [&_.ant-radio-button-wrapper]:text-center [&_.ant-radio-button-wrapper]:before:hidden! [&_.ant-radio-button-wrapper-checked]:border-accent! [&_.ant-radio-button-wrapper-checked]:bg-accent! [&_.ant-radio-button-wrapper-checked]:text-accent-foreground!'

/** Izgaradaki sütun sayısı (sabit metin; Tailwind görsün). */
const GRID_COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' } as const

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

/** Gezinme önizlemesindeki kabuk: ekranın o kenarında ince çubuk. */
const NAV_BAR = {
  left: 'inset-y-[2px] start-[2px] w-[3px]',
  top: 'inset-x-[2px] top-[2px] h-[3px]',
  // Kompakt: yalnızca sol üstte küçük düğme
  compact: 'start-[2px] top-[2px] size-[3px]',
} as const

/** Gezinme seçeneğinin küçük önizlemesi: ekran ve kabuğun durduğu kenar (yazı renginde). */
function NavPreview({ side }: { side: keyof typeof NAV_BAR }) {
  return (
    <Flex
      component="span"
      aria-hidden
      className="relative block h-3 w-[18px] shrink-0 rounded-[3px] ring-1 ring-current/45"
    >
      <Flex
        component="span"
        className={cn('absolute block rounded-[1px] bg-current', NAV_BAR[side])}
      />
    </Flex>
  )
}

/**
 * Kart ayarlarının kutusu: başta o anki kart (sayfanın değişkenleriyle, `CARD`), altında dolgu,
 * gölge, kontur ve kabarık kenar.
 */
function CardBox({ children }: { children: ReactNode }) {
  return (
    <Flex
      vertical
      gap={20}
      role="group"
      aria-label="Kartlar"
      className="rounded-2xl p-3 ring-1 ring-border"
    >
      <Text strong className="text-sm">
        Kartlar
      </Text>
      {/* Önizleme: sayfanın zemininde bir kart */}
      {/* Zeminin köşesi önizleme kartınınkiyle eş merkezli: kartın köşesi + k × boşluk (`--corner-k`) */}
      <Flex
        aria-hidden
        className="block rounded-[calc(var(--radius)+var(--corner-k,1)*var(--spacing)*3)] bg-background p-3"
      >
        <Flex vertical gap={6} className={cn('rounded-lg bg-surface p-3', CARD)}>
          <Text className="font-display text-base leading-none font-bold">Aa</Text>
          <Flex className="block h-1.5 w-3/4 rounded-full bg-surface-tertiary" />
          <Flex className="block h-1.5 w-1/2 rounded-full bg-surface-tertiary" />
        </Flex>
      </Flex>
      {children}
    </Flex>
  )
}

/** Bölüm ayracı. */
const Separator = () => <Divider className="my-0" />

export const ThemePanel = memo(function ThemePanel({
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
  const color = COLORS.find((c) => c.id === settings.color)
  const onBackground = settings.cardFill === 'background'
  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      placement="right"
      // Yüzen: kutu kenarlardan 12px içeride (genişliğe iki yanın boşluğu eklenir)
      size="min(calc(384px + 1.5rem), 100vw)"
      closable={{ placement: 'end' }}
      title={<Text className="font-display text-lg font-semibold">Tema</Text>}
      classNames={{
        ...FLOATING_DRAWER,
        mask: 'bg-foreground/10',
        body: 'flex flex-col gap-6 pb-6',
      }}
    >
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
          options={kit.navOptions.map((o) => ({
            id: o.id,
            label: o.label,
            icon: o.side && <NavPreview side={o.side} />,
          }))}
          onChange={(nav) => set({ nav })}
          grid={3}
        />
      </Section>

      <Section title="Detay Sayfası">
        <Segments
          label="Detay Sayfası"
          value={settings.detail}
          options={DETAIL_STYLES}
          onChange={(detail) => set({ detail })}
        />
      </Section>

      <Separator />

      <CardBox>
        <Section title="Dolgu">
          <Segments
            label="Kart dolgusu"
            value={settings.cardFill}
            options={CARD_FILLS}
            // Zemin renkli kart konturu olmadan görünmez: kontur yoksa ince olur
            onChange={(cardFill) =>
              set({
                cardFill,
                border: cardFill === 'background' ? Math.max(settings.border, 1) : settings.border,
              })
            }
            grid={4}
          />
        </Section>
        <Section title="Gölge">
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
            options={onBackground ? BORDERS.filter((b) => b.id >= 1) : BORDERS}
            onChange={(border) => set({ border })}
          />
        </Section>
        <Section title="Kabarık kenar">
          <Segments
            label="Kabarık kenar"
            value={settings.raised}
            options={TOGGLES}
            onChange={(raised) => set({ raised })}
          />
        </Section>
      </CardBox>

      {kit.motion && (
        <>
          <Separator />
          <Section title="Animasyon">
            <Segments
              label="Animasyon"
              value={settings.motion}
              options={MOTIONS}
              // "Az" ve "Açık" alt ayarları hazır değerlerine getirir
              onChange={(motion) =>
                set({
                  motion,
                  ...(motion === 'reduced' ? MINIMAL_MOTION : motion === 'full' ? FULL_MOTION : {}),
                })
              }
            />
            {settings.motion !== 'off' && reducedBySystem && (
              <Text type="secondary" className="text-xs">
                Sistem hareketi azaltıyor; kayma, şerit ve sayılar kapalı, içerik yalnızca solar.
              </Text>
            )}
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
})
