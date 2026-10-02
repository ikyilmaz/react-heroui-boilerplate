import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'

/* -------------------------------------------------------------------------------------------------
 * Tema paneli ayarları
 *
 * Temel tema `src/themes/synergy.css`'te durur. Panelde değişen her ayar yalnızca kendi CSS
 * değişkenlerini <html>'e satır içi yazar (açık / koyu için ayrı hesaplanır); varsayılanda kalan
 * ayarlar hiçbir şey yazmaz, tema dosyası geçerli kalır. Düğme biçimi <html>'e sınıf olarak eklenir
 * (açılır pencereler de kapsansın). Vurgu gücü ve gezinme sayfalara `LookContext` ile gider.
 * Kabuktan çıkınca hepsi silinir. Varsayılan ve hazır temalar `synergy/theme.ts`'te (`ThemeKit`).
 * ------------------------------------------------------------------------------------------------- */

export type Background = 'neutral' | 'cool' | 'warm' | 'tinted'
export type FontId = 'bricolage' | 'inter' | 'jakarta' | 'figtree' | 'geist'
export type Shadow = 'none' | 'soft' | 'strong'
export type CardStyle = 'filled' | 'outlined' | 'elevated'
/**
 * `default`: uygulamanın kendi karışımı (karşılama dolu, talep başlığı beyaz). `medium`:
 * belirgin açık ton, `outline`: beyaz zemin + birincil çerçeve, `ink`: nötr koyu zemin.
 */
export type AccentStrength = 'default' | 'soft' | 'medium' | 'solid' | 'outline' | 'ink'
export type ButtonShape = 'default' | 'pill' | 'square'
/** Animasyon: tam, az (yalnızca solma; kayma / ölçek yok), kapalı. */
export type MotionLevel = 'full' | 'reduced' | 'off'
/** Sayfa geçişi efekti (ekran tümüyle değişince); `off` anında. */
export type PageEffect = 'off' | 'fade' | 'rise' | 'slide' | 'zoom' | 'blur'
/** Raftaki konum hapları: yumuşak ton ya da dolu birincil renk. */
export type TrailStyle = 'soft' | 'solid'

export interface ThemeSettings {
  /** Birincil renk (OKLCH): ton 0–360, doygunluk 0–0.24, açıklık 0.3–0.65. */
  hue: number
  chroma: number
  lightness: number
  /** Temel yarıçap (rem); alanlar bunun iki katı (en çok 1.25rem). */
  radius: number
  background: Background
  headingFont: FontId
  bodyFont: FontId
  /** Kök yazı boyutu (px); rem'e bağlı tüm ölçüler onunla büyür. */
  scale: number
  /** Boşluk birimi (rem, Tailwind `--spacing`): iç boşluk, aralık, satır yüksekliği; yazıya dokunmaz. */
  spacing: number
  /** Dolu (beyaz), çerçeveli (zemin rengi + çizgi), yükseltilmiş (belirgin gölge). */
  cardStyle: CardStyle
  /** Dolu kartta gölge. */
  shadow: Shadow
  /** Kart / kenarlık kalınlığı (px). */
  border: number
  accent: AccentStrength
  buttonShape: ButtonShape
  /** Gezinme konumu; seçenekler `ThemeKit.navOptions`, `default` uygulamanın kendisi. */
  nav: string
  /** Raftaki konum haplarının rengi (Yumuşak / Dolu). */
  trail: TrailStyle
  /** Animasyon düzeyi; sistem "hareketi azalt" diyorsa `full` da az sayılır. Hazır temalar buna dokunmaz. */
  motion: MotionLevel
  /** Animasyon hızı çarpanı (0.1–3; 2 = iki kat hızlı, süreler yarıya iner). */
  motionSpeed: number
  /** Sağ üstte FPS ve performans kutusu. */
  showFps: boolean
  /** Kayan alanlarda kenar gölgesi. */
  scrollShadow: boolean
  /** Sayfa geçişi efekti. */
  pageTransition: PageEffect
}

export interface ThemePreset {
  id: string
  label: string
  description: string
  settings: ThemeSettings
  /** Önizleme sınıfları (birincil renk ve zemin); Tailwind'in görmesi için sabit metin. */
  swatch: string
  surface: string
}

/** Tema paneli yapılandırması. */
export interface ThemeKit {
  /** Tarayıcı deposu anahtarı. */
  storageKey: string
  /** Tema dosyasının karşılığı; bu değerlerde hiçbir değişken yazılmaz. */
  defaults: ThemeSettings
  /** Beş hazır tema; ilki varsayılan. */
  presets: ThemePreset[]
  /** Gezinme konumu seçenekleri (ilki `default`). */
  navOptions: { id: string; label: string }[]
  /** Panelde Animasyon bölümü (animasyonlar `--motion-*` / `useLook().motion` ile okuyorsa). */
  motion?: boolean
}

/** Ortak varsayılanların yeni ayarları (`theme.ts` kendi değerlerini üstüne yazar). */
export const BASE_LOOK = {
  spacing: 0.25,
  cardStyle: 'filled',
  accent: 'default',
  buttonShape: 'default',
  nav: 'default',
  trail: 'soft',
  motion: 'full',
  motionSpeed: 1,
  showFps: false,
  scrollShadow: true,
  pageTransition: 'rise',
} as const

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  {
    id: 'bricolage',
    label: 'Bricolage Grotesque',
    stack: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  },
  { id: 'inter', label: 'Inter', stack: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  {
    id: 'jakarta',
    label: 'Plus Jakarta Sans',
    stack: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  },
  { id: 'figtree', label: 'Figtree', stack: "'Figtree', ui-sans-serif, system-ui, sans-serif" },
  { id: 'geist', label: 'Geist', stack: "'Geist', ui-sans-serif, system-ui, sans-serif" },
]

/**
 * Düğme ve etiket biçimi: <html>'e eklenen sınıflar (sabit metin; Tailwind görsün). antd `Button`
 * ve `Tag`'e uygulanır; liste seçeneği (`role=option`) ve aç / kapa (`aria-pressed`) düğmeleri
 * düğme sayılmaz.
 */
const SHAPE_CLASSES: Record<Exclude<ButtonShape, 'default'>, string[]> = {
  pill: [
    '[&_.ant-btn:not([role=option],[aria-pressed])]:rounded-full',
    '[&_.ant-tag]:rounded-full',
  ],
  square: ['[&_.ant-btn:not([role=option],[aria-pressed])]:rounded-md', '[&_.ant-tag]:rounded-sm'],
}
const ALL_SHAPE_CLASSES = Object.values(SHAPE_CLASSES).flat()

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
  '--border-width',
  '--surface-shadow',
  '--font-sans',
  '--font-display',
  '--spacing',
  '--motion-time',
  '--motion-shift',
] as const

type VarName = (typeof VARS)[number]

export const same = (
  a: ThemeSettings,
  b: ThemeSettings,
  skip: readonly (keyof ThemeSettings)[] = [],
) => (Object.keys(b) as (keyof ThemeSettings)[]).every((k) => skip.includes(k) || a[k] === b[k])

/** Görünüşten sayılmayan tercihler: hazır temalar bunlara dokunmaz, eşleşmede sayılmaz. */
export const PREFERENCES = [
  'motion',
  'motionSpeed',
  'showFps',
  'scrollShadow',
  'pageTransition',
] as const satisfies readonly (keyof ThemeSettings)[]

/** Ayarlar bir hazır temaya eşitse onun kimliği (tercihler görünüşten sayılmaz). */
export function presetOf(kit: ThemeKit, s: ThemeSettings) {
  return kit.presets.find((p) => same(p.settings, s, PREFERENCES))?.id ?? null
}

const ok = (l: number, c: number, h: number) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`

const SHADOWS: Record<Shadow, (dark: boolean) => string> = {
  none: (dark) => (dark ? '0 0 0 1px var(--border)' : 'none'),
  soft: () => '0 1px 2px 0 oklch(0 0 0 / 0.05), 0 6px 20px -8px oklch(0 0 0 / 0.12)',
  strong: () => '0 2px 4px 0 oklch(0 0 0 / 0.06), 0 14px 36px -10px oklch(0 0 0 / 0.22)',
}

/** Varsayılandan ayrılan ayarların değişkenleri (açık / koyu). */
function variables(
  s: ThemeSettings,
  d: ThemeSettings,
  dark: boolean,
  motion: MotionLevel,
): Partial<Record<VarName, string>> {
  const out: Partial<Record<VarName, string>> = {}
  const { hue: h, chroma: c, lightness: l } = s

  if (s.hue !== d.hue || s.chroma !== d.chroma || s.lightness !== d.lightness) {
    out['--accent'] = dark ? ok(Math.max(l, 0.52), c, h) : ok(l, c, h)
    out['--accent-soft-foreground'] = dark
      ? ok(0.8, c * 0.7, h)
      : ok(Math.max(l - 0.03, 0.25), c, h)
    out['--focus'] = dark ? ok(0.72, c * 0.8, h) : ok(Math.min(l + 0.08, 0.75), c, h)
    out['--link'] = 'var(--accent-soft-foreground)'
  }

  // Zemin (renkli zemin birincil tondan türediği için ton değişince de yenilenir)
  if (s.background !== d.background || (s.background === 'tinted' && s.hue !== d.hue)) {
    const bg: Record<Background, [string, string, string, string]> = dark
      ? {
          // zemin, yüzey, ikinci yüzey, üçüncü yüzey
          neutral: [ok(0.16, 0, 0), ok(0.2, 0, 0), ok(0.225, 0, 0), ok(0.25, 0, 0)],
          cool: [
            ok(0.17, 0.006, 260),
            ok(0.21, 0.007, 260),
            ok(0.235, 0.008, 260),
            ok(0.26, 0.008, 260),
          ],
          warm: [ok(0.17, 0.008, 70), ok(0.21, 0.009, 70), ok(0.235, 0.01, 70), ok(0.26, 0.01, 70)],
          tinted: [ok(0.17, 0.02, h), ok(0.21, 0.022, h), ok(0.235, 0.024, h), ok(0.26, 0.026, h)],
        }
      : {
          neutral: [ok(0.975, 0, 0), ok(1, 0, 0), ok(0.97, 0, 0), ok(0.95, 0, 0)],
          cool: [ok(0.96, 0.003, 250), ok(1, 0, 0), ok(0.975, 0.003, 250), ok(0.955, 0.004, 250)],
          warm: [ok(0.968, 0.008, 80), ok(1, 0, 0), ok(0.972, 0.006, 80), ok(0.95, 0.008, 80)],
          tinted: [ok(0.965, 0.02, h), ok(1, 0, 0), ok(0.97, 0.012, h), ok(0.945, 0.02, h)],
        }
    const [background, surface, secondary, tertiary] = bg[s.background]
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

  if (s.radius !== d.radius) {
    out['--radius'] = `${s.radius}rem`
    out['--field-radius'] = `${Math.min(s.radius * 2, 1.25)}rem`
  }
  if (s.border !== d.border) out['--border-width'] = `${s.border}px`

  // Kart stili gölgeyi de belirler; dolu kartta gölge ayarı geçerli
  if (s.cardStyle === 'outlined') {
    out['--surface'] = 'var(--background)'
    out['--surface-shadow'] = `0 0 0 ${Math.max(s.border, 1)}px var(--border)`
  } else if (s.cardStyle === 'elevated') {
    out['--surface-shadow'] = SHADOWS.strong(dark)
  } else if (s.shadow !== d.shadow || s.cardStyle !== d.cardStyle) {
    out['--surface-shadow'] = SHADOWS[s.shadow](dark)
  }

  const font = (id: FontId) => FONTS.find((f) => f.id === id)!.stack
  if (s.bodyFont !== d.bodyFont) out['--font-sans'] = font(s.bodyFont)
  if (s.headingFont !== d.headingFont) out['--font-display'] = font(s.headingFont)
  if (s.spacing !== d.spacing) out['--spacing'] = `${s.spacing}rem`
  // Animasyon: az = kayma / ölçek yok, kapalı = süre de yok
  if (motion !== 'full') out['--motion-shift'] = '0'
  // Hız çarpanı süreleri böler (2× → yarı süre); kapalıda süre 0
  if (motion === 'off') out['--motion-time'] = '0'
  else if (s.motionSpeed !== 1)
    out['--motion-time'] = String(Math.round((1 / s.motionSpeed) * 1000) / 1000)
  return out
}

function load(kit: ThemeKit): ThemeSettings {
  try {
    const raw = localStorage.getItem(kit.storageKey)
    return raw ? { ...kit.defaults, ...(JSON.parse(raw) as Partial<ThemeSettings>) } : kit.defaults
  } catch {
    return kit.defaults
  }
}

function clear(root: HTMLElement) {
  VARS.forEach((v) => root.style.removeProperty(v))
  root.style.removeProperty('font-size')
  root.classList.remove(...ALL_SHAPE_CLASSES)
}

/* --- Görünüm bağlamı (sayfalar okur) ---------------------------------------------------------- */

export interface Look {
  accent: AccentStrength
  nav: string
  /** Raftaki konum haplarının rengi. */
  trail: TrailStyle
  /** Geçerli animasyon düzeyi (sistem tercihi dahil). */
  motion: MotionLevel
  /** Animasyon hızı çarpanı. */
  speed: number
  showFps: boolean
  scrollShadow: boolean
  /** Sayfa geçişi efekti. */
  pageTransition: PageEffect
}

export const LookContext = createContext<Look>({
  accent: 'default',
  nav: 'default',
  trail: 'soft',
  motion: 'full',
  speed: 1,
  showFps: false,
  scrollShadow: true,
  pageTransition: 'rise',
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

/** Açık / koyu tercihi (tarayıcıda; eski anahtar da okunur). Tercih yoksa sistemin rengi. */
const MODE_KEY = 'synergy-color-mode'
const LEGACY_MODE_KEY = 'heroui-theme'

export type ColorMode = 'light' | 'dark'

function storedMode(): ColorMode {
  try {
    const v = localStorage.getItem(MODE_KEY) ?? localStorage.getItem(LEGACY_MODE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // Depolama kapalı: sistem tercihi
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
    if (settings.scale !== 16) root.style.fontSize = `${settings.scale}px`
    if (settings.buttonShape !== 'default')
      root.classList.add(...SHAPE_CLASSES[settings.buttonShape])
    return () => clear(root)
  }, [settings, dark, kit, motion])

  const update = (next: ThemeSettings) => {
    setSettings(next)
    try {
      if (same(next, kit.defaults)) localStorage.removeItem(kit.storageKey)
      else localStorage.setItem(kit.storageKey, JSON.stringify(next))
    } catch {
      // Depolama kapalıysa ayarlar yalnızca bu oturumda
    }
  }

  const look: Look = {
    accent: settings.accent,
    nav: settings.nav,
    trail: settings.trail,
    motion,
    speed: settings.motionSpeed,
    showFps: settings.showFps,
    scrollShadow: settings.scrollShadow,
    pageTransition: settings.pageTransition,
  }
  return [settings, update, look] as const
}
