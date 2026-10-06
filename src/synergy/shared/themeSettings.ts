import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

/* -------------------------------------------------------------------------------------------------
 * Tema paneli ayarları
 *
 * Temel tema `src/themes/synergy.css`'te durur. Panelde değişen her ayar yalnızca kendi CSS
 * değişkenlerini <html>'e satır içi yazar (açık / koyu için ayrı hesaplanır); varsayılanda kalan
 * ayarlar hiçbir şey yazmaz, tema dosyası geçerli kalır. Gezinme ve animasyon sayfalara
 * `LookContext` ile gider. Kabuktan çıkınca hepsi silinir. Varsayılan `synergy/theme.ts`'te
 * (`ThemeKit`).
 * ------------------------------------------------------------------------------------------------- */

export type ColorId =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'rose'
  | 'coral'
  | 'orange'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'petrol'
  | 'graphite'
/** Zemin: nötr / serin / sıcak / beyaz ve birincil renge göre dört uyumlu ton (`HARMONY`). */
export type Background =
  'neutral' | 'cool' | 'warm' | 'white' | 'analogous' | 'square' | 'triadic' | 'complement'
/** `synergy`: tema dosyasının eşi (başlıklar Bricolage Grotesque, metin Inter); diğerleri her yerde. */
export type FontId = 'synergy' | 'inter' | 'bricolage' | 'jakarta' | 'figtree' | 'geist' | 'outfit'
/** Yoğunluk: kök yazı boyutu ve boşluk birimi birlikte. */
export type Density = 'tight' | 'compact' | 'normal' | 'roomy'
/**
 * Kartın dolgusu: dolu (yüzey), çerçeveli (zemin rengi + çizgi), yükseltilmiş (kabarık alt
 * kenar), tonlu (birincil rengin çok açık tonu), gri (zeminden koyu, gömme).
 */
export type CardStyle = 'filled' | 'outlined' | 'elevated' | 'tinted' | 'muted'
/** `glow`: birincil renkle tonlanmış yumuşak gölge (kart rengini zemine yayar). */
export type Shadow = 'none' | 'subtle' | 'soft' | 'strong' | 'deep' | 'glow'
/** Köşe biçimi: yuvarlak (daire yayı) ya da squircle (süperelips; CSS `corner-shape`). */
export type CornerShape = 'round' | 'squircle'
/** Animasyon: tam, az (yalnızca solma; kayma / ölçek yok), kapalı. */
export type MotionLevel = 'full' | 'reduced' | 'off'
/** Raftaki konum hapları: yumuşak ton ya da dolu birincil renk. */
export type TrailStyle = 'soft' | 'solid'

export interface ThemeSettings {
  /** Birincil renk (`COLORS`). */
  color: ColorId
  /** Temel yarıçap (rem, `RADII`'den biri); alanlar bunun iki katı (en çok 1.25rem). */
  radius: number
  /** Köşe biçimi; tarayıcı squircle çizemiyorsa yuvarlak kalır (`SQUIRCLE_SUPPORTED`). */
  corner: CornerShape
  background: Background
  /** Yazı tipi: başlıklar ve metin. */
  font: FontId
  /** Kök yazı boyutu (rem'e bağlı tüm ölçüler) ve boşluk birimi (Tailwind `--spacing`). */
  density: Density
  /** Kartların dolgusu (kabuktaki ve sayfalardaki tüm kartlar, `CARD`). */
  cardStyle: CardStyle
  /** Kart gölgesi (her kart stilinde). */
  shadow: Shadow
  /** Kart konturu (px); çerçeveli kartta en az 1. */
  border: number
  /** Gezinme konumu; seçenekler `ThemeKit.navOptions`, `default` uygulamanın kendisi. */
  nav: string
  /** Raftaki konum haplarının rengi (Yumuşak / Dolu). */
  trail: TrailStyle
  /** Animasyon düzeyi; sistem "hareketi azalt" diyorsa `full` da az sayılır. */
  motion: MotionLevel
  /** Animasyon hızı çarpanı (0.1–3; 2 = iki kat hızlı, süreler yarıya iner). */
  motionSpeed: number
}

/** Tema paneli yapılandırması. */
export interface ThemeKit {
  /** Tarayıcı deposu anahtarı. */
  storageKey: string
  /** Tema dosyasının karşılığı; bu değerlerde hiçbir değişken yazılmaz. */
  defaults: ThemeSettings
  /** Gezinme konumu seçenekleri (ilki `default`). */
  navOptions: { id: string; label: string }[]
  /** Panelde Animasyon bölümü (animasyonlar `--motion-*` / `useLook().motion` ile okuyorsa). */
  motion?: boolean
  /** Hazır temalar (tema panelinin başında). */
  presets?: ThemePreset[]
}

/**
 * Hazır tema: görünüşü belirleyen ayarların bir bileşimi (`look`). Gezinme konumu, köşe biçimi ve
 * animasyon tercih sayılır, hazır tema onlara dokunmaz. Seçilince ayarlara yazılır; sonra her ayar
 * panelden ayrıca değiştirilebilir (eşleşme bozulunca "Özel").
 */
export interface ThemePreset {
  id: string
  label: string
  description: string
  look: Partial<Omit<ThemeSettings, 'nav' | 'corner' | 'motion' | 'motionSpeed'>>
}

/** Tarayıcı squircle köşe çizebiliyor mu (`corner-shape`); çizemiyorsa ayar hiçbir şey yazmaz. */
export const SQUIRCLE_SUPPORTED =
  typeof CSS !== 'undefined' && CSS.supports('corner-shape', 'squircle')

/** Köşe yuvarlaklığının üç boyu (rem): az, orta, çok; her biri yuvarlak ya da squircle. */
export const RADII = [0.25, 0.5, 1] as const

/**
 * Squircle aynı yarıçapta daireden az keser (45°'de kabaca yarısı, köşe sivri görünür); köşeler
 * aynı yuvarlaklıkta görünsün diye squircle'da yarıçap ve yarıçap tavanları (kart en çok 32px,
 * alan en çok 14px… `--corner-scale`) bu kadar büyür.
 */
export const SQUIRCLE_SCALE = 1.6

/** Birincil renkler (OKLCH); `cls` önizleme sınıfı (sabit metin; Tailwind görsün). */
export const COLORS: {
  id: ColorId
  label: string
  h: number
  c: number
  l: number
  cls: string
}[] = [
  { id: 'blue', label: 'Mavi', h: 262, c: 0.16, l: 0.5, cls: 'bg-[oklch(0.5_0.16_262)]' },
  { id: 'indigo', label: 'Çivit', h: 280, c: 0.17, l: 0.5, cls: 'bg-[oklch(0.5_0.17_280)]' },
  { id: 'purple', label: 'Mor', h: 305, c: 0.18, l: 0.5, cls: 'bg-[oklch(0.5_0.18_305)]' },
  { id: 'rose', label: 'Gül', h: 355, c: 0.16, l: 0.55, cls: 'bg-[oklch(0.55_0.16_355)]' },
  { id: 'coral', label: 'Mercan', h: 30, c: 0.17, l: 0.58, cls: 'bg-[oklch(0.58_0.17_30)]' },
  { id: 'orange', label: 'Turuncu', h: 50, c: 0.15, l: 0.56, cls: 'bg-[oklch(0.56_0.15_50)]' },
  { id: 'green', label: 'Yeşil', h: 155, c: 0.11, l: 0.47, cls: 'bg-[oklch(0.47_0.11_155)]' },
  { id: 'emerald', label: 'Zümrüt', h: 165, c: 0.13, l: 0.52, cls: 'bg-[oklch(0.52_0.13_165)]' },
  { id: 'teal', label: 'Turkuaz', h: 190, c: 0.1, l: 0.5, cls: 'bg-[oklch(0.5_0.1_190)]' },
  { id: 'petrol', label: 'Petrol', h: 210, c: 0.1, l: 0.5, cls: 'bg-[oklch(0.5_0.1_210)]' },
  { id: 'graphite', label: 'Grafit', h: 260, c: 0.02, l: 0.32, cls: 'bg-[oklch(0.32_0.02_260)]' },
]

const SANS = 'ui-sans-serif, system-ui, sans-serif'

export const FONTS: { id: FontId; label: string; stack?: string }[] = [
  { id: 'synergy', label: 'Bricolage Grotesque + Inter' },
  { id: 'inter', label: 'Inter', stack: `'Inter', ${SANS}` },
  { id: 'bricolage', label: 'Bricolage Grotesque', stack: `'Bricolage Grotesque', ${SANS}` },
  { id: 'jakarta', label: 'Plus Jakarta Sans', stack: `'Plus Jakarta Sans', ${SANS}` },
  { id: 'figtree', label: 'Figtree', stack: `'Figtree', ${SANS}` },
  { id: 'geist', label: 'Geist', stack: `'Geist', ${SANS}` },
  { id: 'outfit', label: 'Outfit', stack: `'Outfit', ${SANS}` },
]

/** Yoğunluk: kök yazı boyutu (px) ve boşluk birimi (rem). */
export const DENSITIES: Record<Density, { scale: number; spacing: number }> = {
  tight: { scale: 14, spacing: 0.22 },
  compact: { scale: 15, spacing: 0.235 },
  normal: { scale: 16, spacing: 0.25 },
  roomy: { scale: 17, spacing: 0.27 },
}

/** Yazılabilen tüm değişkenler (temizlik için). */
const VARS = [
  '--accent',
  '--accent-soft-foreground',
  '--focus',
  '--link',
  '--background',
  '--surface',
  '--surface-secondary',
  '--surface-tertiary',
  '--overlay',
  '--field-background',
  '--default',
  '--radius',
  '--field-radius',
  '--pill-radius',
  '--corner-shape',
  '--corner-concave',
  '--corner-scale',
  '--border-width',
  '--surface-shadow',
  '--field-fill',
  '--field-hover',
  '--field-border-width',
  '--field-shadow',
  '--font-sans',
  '--font-display',
  '--spacing',
  '--motion-time',
  '--motion-shift',
] as const

type VarName = (typeof VARS)[number]

export const same = (a: ThemeSettings, b: ThemeSettings) =>
  (Object.keys(b) as (keyof ThemeSettings)[]).every((k) => a[k] === b[k])

const ok = (l: number, c: number, h: number, a?: number) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)}${a == null ? '' : ` / ${a}`})`

/** Birincil rengin saydam tonu (yüzde); renkli gölgeler için. */
const tint = (pct: number) => `color-mix(in oklab, var(--accent) ${pct}%, transparent)`

/** Gölge katmanları; koyu zeminde gölge az görünür, opaklık artar. */
const SHADOWS: Record<Shadow, (dark: boolean) => string> = {
  // Boş gölge: `none` olmaz (halkayla aynı `box-shadow` listesinde geçersiz kalıp konturu da siler)
  none: () => '0 0 #0000',
  subtle: (d) => `0 1px 2px 0 ${ok(0, 0, 0, d ? 0.3 : 0.06)}`,
  soft: (d) =>
    `0 1px 2px 0 ${ok(0, 0, 0, d ? 0.25 : 0.05)}, 0 6px 20px -8px ${ok(0, 0, 0, d ? 0.45 : 0.12)}`,
  strong: (d) =>
    `0 2px 4px 0 ${ok(0, 0, 0, d ? 0.3 : 0.06)}, 0 14px 36px -10px ${ok(0, 0, 0, d ? 0.6 : 0.22)}`,
  deep: (d) =>
    `0 4px 8px -2px ${ok(0, 0, 0, d ? 0.3 : 0.06)}, 0 28px 60px -12px ${ok(0, 0, 0, d ? 0.7 : 0.3)}`,
  // Renkli: kartın altına birincil rengin yumuşak ışıması (gri gölge yerine)
  glow: (d) => `0 1px 2px 0 ${tint(d ? 25 : 12)}, 0 12px 32px -12px ${tint(d ? 55 : 38)}`,
}

/** Yükseltilmiş kartın kabarık kenarı: üstte ışık, altta koyu bir dudak. */
const RAISED = (dark: boolean) =>
  dark
    ? `inset 0 1px 0 0 ${ok(1, 0, 0, 0.07)}, 0 2px 0 0 ${ok(0, 0, 0, 0.45)}`
    : `inset 0 -1px 0 0 ${ok(0, 0, 0, 0.04)}, 0 2px 0 0 ${ok(0.21, 0.01, 260, 0.13)}`

/**
 * Form alanlarının (antd: Input, Select, DatePicker…) gölgesi: kart gölgesinin küçültülmüşü (alan
 * kartın içinde, aynı ışıkta; büyük gölge alanı boğar).
 */
const FIELD_SHADOWS: Record<Shadow, (dark: boolean) => string> = {
  none: () => '0 0 #0000',
  subtle: (d) => `0 1px 1px 0 ${ok(0, 0, 0, d ? 0.25 : 0.04)}`,
  soft: (d) => `0 1px 2px 0 ${ok(0, 0, 0, d ? 0.3 : 0.07)}`,
  strong: (d) =>
    `0 1px 2px 0 ${ok(0, 0, 0, d ? 0.3 : 0.06)}, 0 3px 8px -3px ${ok(0, 0, 0, d ? 0.45 : 0.14)}`,
  deep: (d) =>
    `0 1px 2px 0 ${ok(0, 0, 0, d ? 0.3 : 0.06)}, 0 6px 14px -6px ${ok(0, 0, 0, d ? 0.55 : 0.2)}`,
  glow: (d) => `0 1px 2px 0 ${tint(d ? 30 : 16)}, 0 4px 10px -5px ${tint(d ? 45 : 26)}`,
}

/** Yükseltilmiş kart stilinde alanların kabarık alt kenarı. */
const FIELD_RAISED = (dark: boolean) =>
  dark
    ? `inset 0 1px 0 0 ${ok(1, 0, 0, 0.06)}, 0 1px 0 0 ${ok(0, 0, 0, 0.4)}`
    : `0 1px 0 0 ${ok(0.21, 0.01, 260, 0.12)}`

/**
 * Alanın dolgusu ve üzerine gelince dolgusu, kart stiline göre: dolu kartta tema dosyasınınki (ikinci
 * yüzey), çerçeveli ve yükseltilmişte kartın kendisi (çizgi / kenar ayırır), tonluda birincil rengin
 * açık tonu, gri kartta beyaz alan.
 */
const FIELD_FILL: Record<CardStyle, [string, string] | null> = {
  filled: null,
  outlined: ['var(--surface)', 'var(--surface-secondary)'],
  elevated: ['var(--surface)', 'var(--surface-secondary)'],
  tinted: [
    'color-mix(in oklab, var(--accent) 7%, var(--surface))',
    'color-mix(in oklab, var(--accent) 12%, var(--surface))',
  ],
  muted: ['var(--field-background)', 'var(--surface-secondary)'],
}

/**
 * Birincil renge göre zeminlerin tonu (renk çemberinde birincil tondan uzaklık): benzer (komşu ton),
 * dörtlü (dik açı), üçlü (üçte bir tur) ve zıt (tam karşı). Hepsi çok açık / çok koyu, az doygun.
 */
const HARMONY = { analogous: -30, square: 90, triadic: 120, complement: 180 } as const

export const BACKGROUND_IDS = [
  'neutral',
  'cool',
  'warm',
  'white',
  ...(Object.keys(HARMONY) as (keyof typeof HARMONY)[]),
] as const

/** Zemin: zemin, yüzey, ikinci yüzey, üçüncü yüzey (son dördü birincil tondan). */
function backgrounds(dark: boolean, h: number): Record<Background, string[]> {
  const tint = (off: number) => {
    const t = (h + off + 360) % 360
    return dark
      ? [ok(0.18, 0.018, t), ok(0.22, 0.02, t), ok(0.245, 0.022, t), ok(0.27, 0.024, t)]
      : [ok(0.962, 0.022, t), ok(1, 0, 0), ok(0.972, 0.012, t), ok(0.948, 0.02, t)]
  }
  const harmony = Object.fromEntries(
    Object.entries(HARMONY).map(([id, off]) => [id, tint(off)]),
  ) as Record<keyof typeof HARMONY, string[]>
  return dark
    ? {
        neutral: [ok(0.16, 0, 0), ok(0.2, 0, 0), ok(0.225, 0, 0), ok(0.25, 0, 0)],
        cool: [
          ok(0.17, 0.006, 260),
          ok(0.21, 0.007, 260),
          ok(0.235, 0.008, 260),
          ok(0.26, 0.008, 260),
        ],
        warm: [ok(0.17, 0.008, 70), ok(0.21, 0.009, 70), ok(0.235, 0.01, 70), ok(0.26, 0.01, 70)],
        // Tek ton: zemin yüzeyle aynı, kartları kontur ayırır
        white: [
          ok(0.19, 0.005, 260),
          ok(0.19, 0.005, 260),
          ok(0.225, 0.006, 260),
          ok(0.25, 0.007, 260),
        ],
        ...harmony,
      }
    : {
        neutral: [ok(0.975, 0, 0), ok(1, 0, 0), ok(0.97, 0, 0), ok(0.95, 0, 0)],
        cool: [ok(0.96, 0.003, 250), ok(1, 0, 0), ok(0.975, 0.003, 250), ok(0.955, 0.004, 250)],
        warm: [ok(0.968, 0.008, 80), ok(1, 0, 0), ok(0.972, 0.006, 80), ok(0.95, 0.008, 80)],
        white: [ok(1, 0, 0), ok(1, 0, 0), ok(0.975, 0.002, 250), ok(0.955, 0.003, 250)],
        ...harmony,
      }
}

/** Zeminin rengi (tema panelindeki örnek nokta için). */
export function backgroundSwatch(bg: Background, color: ColorId, dark: boolean) {
  const { h } = COLORS.find((c) => c.id === color) ?? COLORS[0]
  return backgrounds(dark, h)[bg][0]
}

/** Kartın dolgusu (`surface`: zeminin kendi yüzeyi); dolu kartta yok. */
function cardFill(style: CardStyle, dark: boolean, surface: string): string | null {
  switch (style) {
    case 'outlined':
      return 'var(--background)'
    case 'tinted':
      return `color-mix(in oklab, var(--accent) ${dark ? 9 : 5}%, ${surface})`
    case 'muted':
      return `color-mix(in oklab, var(--foreground) ${dark ? 3 : 4}%, var(--background))`
    default:
      return null
  }
}

/** Varsayılandan ayrılan ayarların değişkenleri (açık / koyu). */
function variables(
  s: ThemeSettings,
  d: ThemeSettings,
  dark: boolean,
  motion: MotionLevel,
): Partial<Record<VarName, string>> {
  const out: Partial<Record<VarName, string>> = {}
  const { h, c, l } = COLORS.find((x) => x.id === s.color) ?? COLORS[0]

  if (s.color !== d.color) {
    out['--accent'] = dark ? ok(Math.max(l, 0.52), c, h) : ok(l, c, h)
    out['--accent-soft-foreground'] = dark
      ? ok(0.8, c * 0.7, h)
      : ok(Math.max(l - 0.03, 0.25), c, h)
    out['--focus'] = dark ? ok(0.72, c * 0.8, h) : ok(Math.min(l + 0.08, 0.75), c, h)
    out['--link'] = 'var(--accent-soft-foreground)'
  }

  // Zemin (renkli zeminler birincil tondan türediği için renk değişince de yenilenir)
  const hued = s.background in HARMONY
  if (s.background !== d.background || (hued && s.color !== d.color)) {
    const [background, surface, secondary, tertiary] = backgrounds(dark, h)[s.background]
    Object.assign(out, {
      '--background': background,
      '--surface': surface,
      '--surface-secondary': secondary,
      '--surface-tertiary': tertiary,
      '--overlay': dark ? ok(0.23, 0.008, 260) : surface,
      '--field-background': surface,
      '--default': tertiary,
    })
  }

  // Kart stili: dolgu yüzeyin yerine geçer (kartın içindeki tablolar, düğmeler de ona uyar)
  const fill = cardFill(s.cardStyle, dark, backgrounds(dark, h)[s.background][1])
  if (fill) {
    out['--surface'] = fill
    out['--surface-secondary'] = `color-mix(in oklab, var(--foreground) 3%, ${fill})`
    out['--surface-tertiary'] = `color-mix(in oklab, var(--foreground) 6%, ${fill})`
    out['--default'] = 'var(--surface-tertiary)'
  }

  // Squircle: köşe biçimi, büyütülmüş yarıçap ve tavanlar (tema dosyası yuvarlak; varsayılan olsa
  // da yazılır)
  const squircle = s.corner === 'squircle' && SQUIRCLE_SUPPORTED
  if (squircle) {
    out['--corner-shape'] = 'squircle'
    // İçbükey kavisler (sekmelerin kaba bağlandığı köşeler): squircle'ın içbükeyi (yoksa `scoop`)
    out['--corner-concave'] = 'superellipse(-2)'
    out['--corner-scale'] = String(SQUIRCLE_SCALE)
  }
  if (s.radius !== d.radius || squircle) {
    const f = squircle ? SQUIRCLE_SCALE : 1
    out['--radius'] = `${+(s.radius * f).toFixed(3)}rem`
    out['--field-radius'] = `${+(Math.min(s.radius * 2, 1.25) * f).toFixed(3)}rem`
    // Daire ve haplar: en büyük boyda tam yuvarlak, diğerlerinde alanların yarıçapı (AntTheme'deki
    // `borderRadius` ile aynı hesap; tema dosyasındaki karşılığı hesabı köke yazdığı için açık değer)
    out['--pill-radius'] =
      s.radius >= RADII[RADII.length - 1]
        ? '9999px'
        : `min(${+(14 * f).toFixed(2)}px, ${+(s.radius * 1.5 * f).toFixed(3)}rem)`
  }
  // Çerçeveli kartta kontur en az 1px; form alanlarının çerçevesi de aynı kalınlıkta (0: çerçevesiz)
  const border = s.cardStyle === 'outlined' ? Math.max(s.border, 1) : s.border
  if (border !== d.border) {
    out['--border-width'] = `${border}px`
    out['--field-border-width'] = `${border}px`
  }

  // Gölge: yükseltilmiş kartın kenarı seçilen gölgenin üstüne eklenir; alanlar küçüğünü alır
  const raised = s.cardStyle === 'elevated'
  if (s.shadow !== d.shadow || raised) {
    const shadow = SHADOWS[s.shadow](dark)
    const field = FIELD_SHADOWS[s.shadow](dark)
    out['--surface-shadow'] = raised ? `${RAISED(dark)}, ${shadow}` : shadow
    out['--field-shadow'] = raised ? `${FIELD_RAISED(dark)}, ${field}` : field
  }

  // Alanların dolgusu kart stiline göre
  const fieldFill = FIELD_FILL[s.cardStyle]
  if (fieldFill) [out['--field-fill'], out['--field-hover']] = fieldFill

  // Yazı tipi: seçilen tip başlıklarda ve metinde
  const font = FONTS.find((f) => f.id === s.font)?.stack
  if (font) {
    out['--font-sans'] = font
    out['--font-display'] = font
  }
  // Tema dosyasının aralığı normal yoğunluğunki; varsayılan yoğunluk ondan farklı olabilir
  if (s.density !== d.density || s.density !== 'normal')
    out['--spacing'] = `${DENSITIES[s.density].spacing}rem`
  // Animasyon: az = kayma / ölçek yok, kapalı = süre de yok
  if (motion !== 'full') out['--motion-shift'] = '0'
  // Hız çarpanı süreleri böler (2× → yarı süre); kapalıda süre 0
  if (motion === 'off') out['--motion-time'] = '0'
  else if (s.motionSpeed !== 1)
    out['--motion-time'] = String(Math.round((1 / s.motionSpeed) * 1000) / 1000)
  return out
}

/** Her ayarın değişkenini yazdıran karşılaştırma tabanı (hiçbir değer buna eşit değil). */
const NOTHING = {
  color: '',
  radius: -1,
  corner: '',
  background: '',
  font: '',
  density: '',
  cardStyle: '',
  shadow: '',
  border: -1,
  nav: '',
  trail: '',
  motion: 'full',
  motionSpeed: 1,
} as unknown as ThemeSettings

/**
 * Bir görünüşün bütün değişkenleri: bir kaba satır içi yazılınca o kabın içi o temayla çizilir
 * (tema panelindeki hazır tema önizlemesi; kabuğun o anki ayarlarından bağımsız).
 */
export function lookVars(look: ThemeSettings, dark: boolean) {
  const out: Record<string, string> = { ...variables(look, NOTHING, dark, 'full') }
  if (look.font === 'synergy') {
    out['--font-sans'] = `'Inter', ${SANS}`
    out['--font-display'] = `'Bricolage Grotesque', ${SANS}`
  }
  return out
}

/** Ayarlar bir hazır temaya uyuyorsa onun kimliği (yalnızca temanın belirlediği ayarlar karşılaştırılır). */
export function presetOf(kit: ThemeKit, s: ThemeSettings) {
  const match = (look: ThemePreset['look']) =>
    (Object.keys(look) as (keyof ThemePreset['look'])[]).every((k) => look[k] === s[k])
  return kit.presets?.find((p) => match(p.look))?.id ?? null
}

function load(kit: ThemeKit): ThemeSettings {
  try {
    const raw = localStorage.getItem(kit.storageKey)
    if (!raw) return kit.defaults
    // Yalnızca bilinen ayarlar (kaldırılmış eski anahtarlar taşınmaz)
    const saved = JSON.parse(raw) as Partial<ThemeSettings>
    // Seçeneği kaldırılmış değer (ör. eski bir zemin) varsayılana döner
    const valid: Partial<Record<keyof ThemeSettings, readonly unknown[]>> = {
      color: COLORS.map((c) => c.id),
      // Yarıçap üç boydan biri (kaydırıcıdan kalan ara değerler varsayılana döner)
      radius: RADII,
      corner: ['round', 'squircle'],
      background: BACKGROUND_IDS,
      font: FONTS.map((x) => x.id),
      density: Object.keys(DENSITIES),
      shadow: Object.keys(SHADOWS),
      cardStyle: Object.keys(FIELD_FILL),
    }
    const keys = Object.keys(kit.defaults) as (keyof ThemeSettings)[]
    return Object.fromEntries(
      keys.map((k) => {
        const v = saved[k]
        const keep = v != null && (valid[k]?.includes(v) ?? true)
        return [k, keep ? v : kit.defaults[k]]
      }),
    ) as unknown as ThemeSettings
  } catch {
    return kit.defaults
  }
}

function clear(root: HTMLElement) {
  VARS.forEach((v) => root.style.removeProperty(v))
  root.style.removeProperty('font-size')
}

/* --- Görünüm bağlamı (sayfalar okur) ---------------------------------------------------------- */

export interface Look {
  nav: string
  /** Raftaki konum haplarının rengi. */
  trail: TrailStyle
  /** Geçerli animasyon düzeyi (sistem tercihi dahil). */
  motion: MotionLevel
  /** Animasyon hızı çarpanı. */
  speed: number
}

export const LookContext = createContext<Look>({
  nav: 'default',
  trail: 'soft',
  motion: 'full',
  speed: 1,
})

const REDUCE = '(prefers-reduced-motion: reduce)'

/** Sistemin "hareketi azalt" tercihi (değişince güncellenir). */
function useSystemReduced() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(REDUCE).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(REDUCE)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

export const useLook = () => useContext(LookContext)

/**
 * Tema ayarlarının kendisi ve değiştirme (kabuk verir): başlangıçtaki "Denetimler" widget'ı
 * gibi ayarları sayfadan hızla açıp kapatan yerler için. Kabuk dışında `null`.
 */
export interface SettingsControl {
  settings: ThemeSettings
  update: (next: ThemeSettings) => void
  openPanel: () => void
}
export const SettingsContext = createContext<SettingsControl | null>(null)
export const useSettingsControl = () => useContext(SettingsContext)

/* --- Açık / koyu --------------------------------------------------------------------------------- */

/** Açık / koyu tercihi (tarayıcıda; eski anahtar da okunur). Tercih yoksa açık tema. */
const MODE_KEY = 'synergy-color-mode'
const LEGACY_MODE_KEY = 'heroui-theme'

export type ColorMode = 'light' | 'dark'

function storedMode(): ColorMode {
  try {
    const v = localStorage.getItem(MODE_KEY) ?? localStorage.getItem(LEGACY_MODE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // Depolama kapalı: varsayılan
  }
  return 'light'
}

/** Rengi <html>'e yazar (`light` / `dark` sınıfı ve `data-theme`; tema dosyası bunlara bakar). */
function applyMode(mode: ColorMode) {
  const root = document.documentElement
  root.classList.remove(mode === 'dark' ? 'light' : 'dark')
  root.classList.add(mode)
  root.dataset.theme = mode
}

/** Açılışta kayıtlı rengi uygular (`main.tsx`, ilk çizimden önce). */
export function initColorMode() {
  applyMode(storedMode())
}

/** Açık / koyu değiştirir ve saklar; `useIsDark` kullanan her yer güncellenir. */
export function setColorMode(mode: ColorMode) {
  applyMode(mode)
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Depolama kapalıysa yalnızca bu oturumda
  }
}

/* Koyu tema mı: <html>'in sınıfından okunur; sınıf değişimi izlenir, böylece tema nereden
   değişirse değişsin herkes güncellenir. */
function subscribeDark(onChange: () => void) {
  const mo = new MutationObserver(onChange)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  })
  return () => mo.disconnect()
}
const readDark = () => {
  const root = document.documentElement
  return root.classList.contains('dark') || root.dataset.theme === 'dark'
}

/** Koyu tema açık mı (tüm bileşenlerde ortak; değiştirmek için `setColorMode`). */
export function useIsDark() {
  return useSyncExternalStore(subscribeDark, readDark, () => false)
}

/** Kabukta: ayarları uygular (koyu / açık değişince yeniden), çıkınca temizler. */
export function useThemeSettings(kit: ThemeKit) {
  const [settings, setSettings] = useState<ThemeSettings>(() => load(kit))
  const dark = useIsDark()
  const systemReduced = useSystemReduced()
  const motion: MotionLevel =
    settings.motion === 'full' && systemReduced ? 'reduced' : settings.motion

  useEffect(() => {
    const root = document.documentElement
    clear(root)
    Object.entries(variables(settings, kit.defaults, dark, motion)).forEach(
      ([k, val]) => val && root.style.setProperty(k, val),
    )
    const { scale } = DENSITIES[settings.density]
    if (scale !== 16) root.style.fontSize = `${scale}px`
    return () => clear(root)
  }, [settings, dark, kit, motion])

  const update = useCallback(
    (next: ThemeSettings) => {
      setSettings(next)
      try {
        if (same(next, kit.defaults)) localStorage.removeItem(kit.storageKey)
        else localStorage.setItem(kit.storageKey, JSON.stringify(next))
      } catch {
        // Depolama kapalıysa ayarlar yalnızca bu oturumda
      }
    },
    [kit],
  )

  // Bağlamın değeri yalnızca görünüm değişince yenilenir: kabuk her çizildiğinde (ör. konum
  // değişince) `useLook` okuyan her bileşen, gizli form sekmeleri dahil, yeniden çizilmesin
  const { nav, trail, motionSpeed: speed } = settings
  const look = useMemo<Look>(() => ({ nav, trail, motion, speed }), [nav, trail, motion, speed])
  return [settings, update, look] as const
}
