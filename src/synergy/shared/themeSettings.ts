import { createContext, useContext, useEffect, useState } from 'react'
import { useTheme } from '@heroui/react'

/* -------------------------------------------------------------------------------------------------
 * Tema paneli ayarları (sürümlerden bağımsız)
 *
 * Temel tema sürümün tema dosyasında durur. Panelde değişen her ayar yalnızca kendi CSS
 * değişkenlerini <html>'e satır içi yazar (açık / koyu için ayrı hesaplanır); varsayılanda kalan
 * ayarlar hiçbir şey yazmaz, tema dosyası geçerli kalır. Düğme biçimi <html>'e sınıf olarak eklenir
 * (açılır pencereler de kapsansın). Vurgu gücü ve gezinme sayfalara `LookContext` ile gider.
 * Kabuktan çıkınca hepsi silinir. Her sürüm varsayılanını ve hazır temalarını verir (`ThemeKit`).
 * ------------------------------------------------------------------------------------------------- */

export type Background = 'neutral' | 'cool' | 'warm' | 'tinted'
export type FontId = 'bricolage' | 'inter' | 'jakarta' | 'figtree' | 'geist'
export type Shadow = 'none' | 'soft' | 'strong'
export type CardStyle = 'filled' | 'outlined' | 'elevated'
/** `default`: sürümün kendi karışımı (ör. v1'de karşılama dolu, talep başlığı beyaz). */
export type AccentStrength = 'default' | 'soft' | 'solid'
export type ButtonShape = 'default' | 'pill' | 'square'

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
  /** Boşluk birimi (rem, HeroUI `--spacing`): iç boşluk, aralık, satır yüksekliği; yazıya dokunmaz. */
  spacing: number
  /** Dolu (beyaz), çerçeveli (zemin rengi + çizgi), yükseltilmiş (belirgin gölge). */
  cardStyle: CardStyle
  /** Dolu kartta gölge. */
  shadow: Shadow
  /** Kart / kenarlık kalınlığı (px). */
  border: number
  accent: AccentStrength
  buttonShape: ButtonShape
  /** Gezinme konumu; seçenekler sürüme göre (`ThemeKit.navOptions`), `default` sürümün kendisi. */
  nav: string
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

/** Bir sürümün tema paneli yapılandırması. */
export interface ThemeKit {
  /** Tarayıcı deposu anahtarı. */
  storageKey: string
  /** Tema dosyasının karşılığı; bu değerlerde hiçbir değişken yazılmaz. */
  defaults: ThemeSettings
  /** Beş hazır tema; ilki varsayılan. */
  presets: ThemePreset[]
  /** Gezinme konumu seçenekleri (ilki `default`). */
  navOptions: { id: string; label: string }[]
}

/** Ortak varsayılanların yeni ayarları (sürümler kendi değerlerini üstüne yazar). */
export const BASE_LOOK = { spacing: 0.25, cardStyle: 'filled', accent: 'default', buttonShape: 'default', nav: 'default' } as const

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  { id: 'bricolage', label: 'Bricolage Grotesque', stack: "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif" },
  { id: 'inter', label: 'Inter', stack: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { id: 'jakarta', label: 'Plus Jakarta Sans', stack: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif" },
  { id: 'figtree', label: 'Figtree', stack: "'Figtree', ui-sans-serif, system-ui, sans-serif" },
  { id: 'geist', label: 'Geist', stack: "'Geist', ui-sans-serif, system-ui, sans-serif" },
]

/** Düğme ve çip biçimi: <html>'e eklenen sınıflar (sabit metin; Tailwind görsün). */
const SHAPE_CLASSES: Record<Exclude<ButtonShape, 'default'>, string[]> = {
  pill: ['[&_.button]:rounded-full', '[&_.chip]:rounded-full'],
  square: ['[&_.button]:rounded-md', '[&_.chip]:rounded-sm'],
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
] as const

type VarName = (typeof VARS)[number]

const same = (a: ThemeSettings, b: ThemeSettings) => (Object.keys(b) as (keyof ThemeSettings)[]).every((k) => a[k] === b[k])

/** Ayarlar bir hazır temaya eşitse onun kimliği. */
export function presetOf(kit: ThemeKit, s: ThemeSettings) {
  return kit.presets.find((p) => same(p.settings, s))?.id ?? null
}

const ok = (l: number, c: number, h: number) => `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`

const SHADOWS: Record<Shadow, (dark: boolean) => string> = {
  none: (dark) => (dark ? '0 0 0 1px var(--border)' : 'none'),
  soft: () => '0 1px 2px 0 oklch(0 0 0 / 0.05), 0 6px 20px -8px oklch(0 0 0 / 0.12)',
  strong: () => '0 2px 4px 0 oklch(0 0 0 / 0.06), 0 14px 36px -10px oklch(0 0 0 / 0.22)',
}

/** Varsayılandan ayrılan ayarların değişkenleri (açık / koyu). */
function variables(s: ThemeSettings, d: ThemeSettings, dark: boolean): Partial<Record<VarName, string>> {
  const out: Partial<Record<VarName, string>> = {}
  const { hue: h, chroma: c, lightness: l } = s

  if (s.hue !== d.hue || s.chroma !== d.chroma || s.lightness !== d.lightness) {
    out['--accent'] = dark ? ok(Math.max(l, 0.52), c, h) : ok(l, c, h)
    out['--accent-soft-foreground'] = dark ? ok(0.8, c * 0.7, h) : ok(Math.max(l - 0.03, 0.25), c, h)
    out['--focus'] = dark ? ok(0.72, c * 0.8, h) : ok(Math.min(l + 0.08, 0.75), c, h)
    out['--link'] = 'var(--accent-soft-foreground)'
  }

  // Zemin (renkli zemin birincil tondan türediği için ton değişince de yenilenir)
  if (s.background !== d.background || (s.background === 'tinted' && s.hue !== d.hue)) {
    const bg: Record<Background, [string, string, string, string]> = dark
      ? {
          // zemin, yüzey, ikinci yüzey, üçüncü yüzey
          neutral: [ok(0.16, 0, 0), ok(0.2, 0, 0), ok(0.225, 0, 0), ok(0.25, 0, 0)],
          cool: [ok(0.17, 0.006, 260), ok(0.21, 0.007, 260), ok(0.235, 0.008, 260), ok(0.26, 0.008, 260)],
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
}

export const LookContext = createContext<Look>({ accent: 'default', nav: 'default' })

export const useLook = () => useContext(LookContext)

/** Kabukta: ayarları uygular (koyu / açık değişince yeniden), çıkınca temizler. */
export function useThemeSettings(kit: ThemeKit) {
  const [settings, setSettings] = useState<ThemeSettings>(() => load(kit))
  const { resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  useEffect(() => {
    const root = document.documentElement
    clear(root)
    Object.entries(variables(settings, kit.defaults, dark)).forEach(([k, val]) => val && root.style.setProperty(k, val))
    if (settings.scale !== 16) root.style.fontSize = `${settings.scale}px`
    if (settings.buttonShape !== 'default') root.classList.add(...SHAPE_CLASSES[settings.buttonShape])
    return () => clear(root)
  }, [settings, dark, kit])

  const update = (next: ThemeSettings) => {
    setSettings(next)
    try {
      if (same(next, kit.defaults)) localStorage.removeItem(kit.storageKey)
      else localStorage.setItem(kit.storageKey, JSON.stringify(next))
    } catch {
      // Depolama kapalıysa ayarlar yalnızca bu oturumda
    }
  }

  const look: Look = { accent: settings.accent, nav: settings.nav }
  return [settings, update, look] as const
}
