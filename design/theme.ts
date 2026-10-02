/*
 * Tasarım paketinin tema ayarları: uygulamanın tema panelindeki hesapların (shared/themeSettings.ts)
 * Claude Design karşılığı. Tuvaldeki Tweaks değerleri buraya gelir; çıktı, tema kökünün satır içi
 * CSS değişkenleri ve gezinme / ölçek bilgisidir. Tuvaldeki bütün ekranlar bu tek kaynağı kullanır.
 */

export interface ThemeProps {
  /** Hazır tema. */
  preset?: string
  /** Açık / Koyu. */
  mode?: string
  /** Birincil renk ("Hazır tema", renk adı ya da "Özel"). */
  renk?: string
  ton?: number
  doygunluk?: number
  koyuluk?: number
  zemin?: string
  kart?: string
  kenarlik?: string
  /** Köşe yuvarlaklığı (px, metin) ya da "Hazır tema". */
  kose?: string
  olcek?: string
  bosluk?: string
  baslikFont?: string
  govdeFont?: string
  gezinme?: string
}

interface Preset {
  hue: number
  chroma: number
  lightness: number
  radius: number
  bg: string
  heading: string
  body: string
  scale: string
  spacing: string
  card: string
  border: string
  nav: string
}

/** Hazır temalar (uygulamadaki `theme.ts` ile aynı; ölçek ve boşluk Kompakt). */
export const PRESETS: Record<string, Preset> = {
  Karo: {
    hue: 262,
    chroma: 0.16,
    lightness: 0.5,
    radius: 0.5,
    bg: 'Serin',
    heading: 'Bricolage Grotesque',
    body: 'Inter',
    scale: 'Kompakt',
    spacing: 'Kompakt',
    card: 'Dolu',
    border: 'İnce',
    nav: 'Solda',
  },
  Okyanus: {
    hue: 210,
    chroma: 0.1,
    lightness: 0.5,
    radius: 0.75,
    bg: 'Renkli',
    heading: 'Plus Jakarta Sans',
    body: 'Plus Jakarta Sans',
    scale: 'Kompakt',
    spacing: 'Kompakt',
    card: 'Dolu',
    border: 'İnce',
    nav: 'Solda',
  },
  Orman: {
    hue: 155,
    chroma: 0.11,
    lightness: 0.47,
    radius: 0.375,
    bg: 'Sıcak',
    heading: 'Figtree',
    body: 'Figtree',
    scale: 'Kompakt',
    spacing: 'Kompakt',
    card: 'Çerçeveli',
    border: 'İnce',
    nav: 'Üstte',
  },
  Kehribar: {
    hue: 50,
    chroma: 0.15,
    lightness: 0.56,
    radius: 1,
    bg: 'Sıcak',
    heading: 'Bricolage Grotesque',
    body: 'Inter',
    scale: 'Kompakt',
    spacing: 'Kompakt',
    card: 'Dolu',
    border: 'İnce',
    nav: 'Solda',
  },
  Grafit: {
    hue: 260,
    chroma: 0.02,
    lightness: 0.32,
    radius: 0.25,
    bg: 'Nötr',
    heading: 'Geist',
    body: 'Geist',
    scale: 'Kompakt',
    spacing: 'Kompakt',
    card: 'Yükseltilmiş',
    border: 'İnce',
    nav: 'Solda',
  },
}

const SWATCHES: Record<string, [number, number, number]> = {
  Mavi: [262, 0.16, 0.5],
  Çivit: [280, 0.17, 0.5],
  Mor: [305, 0.18, 0.5],
  Gül: [355, 0.16, 0.55],
  Turuncu: [50, 0.15, 0.56],
  Yeşil: [155, 0.11, 0.47],
  Turkuaz: [190, 0.1, 0.5],
  Petrol: [210, 0.1, 0.5],
  Grafit: [260, 0.02, 0.32],
}
const FONTS: Record<string, string> = {
  'Bricolage Grotesque': "'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif",
  Inter: "'Inter', ui-sans-serif, system-ui, sans-serif",
  'Plus Jakarta Sans': "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
  Figtree: "'Figtree', ui-sans-serif, system-ui, sans-serif",
  Geist: "'Geist', ui-sans-serif, system-ui, sans-serif",
}
const SCALE: Record<string, number> = { Sıkı: 14, Kompakt: 15, Normal: 16, Geniş: 17 }
const SPACE: Record<string, number> = { Sıkı: 0.21, Kompakt: 0.23, Normal: 0.25, Ferah: 0.29 }
const BORDER: Record<string, number> = { Yok: 0, İnce: 1, Kalın: 2 }
const STRONG = '0 2px 4px 0 oklch(0 0 0 / 0.06), 0 14px 36px -10px oklch(0 0 0 / 0.22)'

const ok = (l: number, c: number, h: number, a?: number) =>
  `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)}${a != null ? ` / ${a}` : ''})`

type Tone = [number, number, number]
const BG: Record<'light' | 'dark', Record<string, (h: number) => Tone[]>> = {
  light: {
    Nötr: () => [
      [0.975, 0, 0],
      [1, 0, 0],
      [0.97, 0, 0],
      [0.95, 0, 0],
    ],
    Sıcak: () => [
      [0.968, 0.008, 80],
      [1, 0, 0],
      [0.972, 0.006, 80],
      [0.95, 0.008, 80],
    ],
    Renkli: (h) => [
      [0.965, 0.02, h],
      [1, 0, 0],
      [0.97, 0.012, h],
      [0.945, 0.02, h],
    ],
  },
  dark: {
    Nötr: () => [
      [0.16, 0, 0],
      [0.2, 0, 0],
      [0.225, 0, 0],
      [0.25, 0, 0],
    ],
    Sıcak: () => [
      [0.17, 0.008, 70],
      [0.21, 0.009, 70],
      [0.235, 0.01, 70],
      [0.26, 0.01, 70],
    ],
    Renkli: (h) => [
      [0.17, 0.02, h],
      [0.21, 0.022, h],
      [0.235, 0.024, h],
      [0.26, 0.026, h],
    ],
  },
}

export interface ResolvedTheme {
  dark: boolean
  /** Tema kökünün satır içi değişkenleri. */
  vars: Record<string, string>
  /** Ölçek (kök yazı boyutu / 16). */
  zoom: number
  nav: 'left' | 'top'
}

export function themeOf(props: ThemeProps): ResolvedTheme {
  const p = PRESETS[props.preset ?? 'Karo'] ?? PRESETS.Karo!
  const pick = <T>(v: T | undefined, fallback: T) =>
    v == null || v === 'Hazır tema' ? fallback : v
  const dark = props.mode === 'Koyu'
  let [h, c, l] = [p.hue, p.chroma, p.lightness]
  const colour = pick(props.renk, undefined as string | undefined)
  if (colour && SWATCHES[colour]) [h, c, l] = SWATCHES[colour]!
  if (colour === 'Özel')
    [h, c, l] = [props.ton ?? 262, props.doygunluk ?? 0.16, props.koyuluk ?? 0.5]
  const bg = pick(props.zemin, p.bg)
  const radius =
    props.kose == null || props.kose === 'Hazır tema' ? p.radius : Number(props.kose) / 16
  const scale = SCALE[pick(props.olcek, p.scale)] ?? 16
  const spacing = SPACE[pick(props.bosluk, p.spacing)] ?? 0.25
  const border = BORDER[pick(props.kenarlik, p.border)] ?? 1
  const card = pick(props.kart, p.card)
  const v: Record<string, string> = {}
  // Birincil renk (Karo mavisinde tema dosyasının değerleri geçerli)
  if (!(h === 262 && c === 0.16 && l === 0.5)) {
    const la = dark ? Math.max(l, 0.52) : l
    v['--accent'] = ok(la, c, h)
    v['--accent-soft'] = ok(la, c, h, 0.15)
    v['--accent-soft-foreground'] = dark ? ok(0.8, c * 0.7, h) : ok(Math.max(l - 0.03, 0.25), c, h)
    v['--focus'] = dark ? ok(0.72, c * 0.8, h) : ok(Math.min(l + 0.08, 0.75), c, h)
    v['--link'] = 'var(--accent-soft-foreground)'
  }
  // Zemin (Serin: tema dosyası)
  const table = BG[dark ? 'dark' : 'light'][bg]
  if (table) {
    const [b, s, s2, s3] = table(h)
    v['--background'] = ok(...b!)
    v['--surface'] = ok(...s!)
    v['--surface-secondary'] = ok(...s2!)
    v['--surface-tertiary'] = ok(...s3!)
    v['--overlay'] = dark ? ok(0.23, 0.008, 260) : ok(...s!)
    v['--field-background'] = ok(...s!)
    v['--default'] = ok(...s3!)
  }
  v['--radius'] = `${radius}rem`
  v['--border-width'] = `${card === 'Çerçeveli' ? Math.max(border, 1) : border}px`
  if (card === 'Çerçeveli') v['--surface'] = 'var(--background)'
  if (card === 'Yükseltilmiş') v['--surface-shadow'] = STRONG
  v['--font-display'] = FONTS[pick(props.baslikFont, p.heading)]!
  v['--font-sans'] = FONTS[pick(props.govdeFont, p.body)]!
  v['--spacing'] = `${spacing}rem`
  // Sekme kabı: birincil rengin zemine karışmış açık tonu (ajanda ve form sekmeleri)
  v['--tab-bg'] = 'color-mix(in oklab, var(--accent) 9%, var(--background))'
  return {
    dark,
    vars: v,
    zoom: scale / 16,
    nav: pick(props.gezinme, p.nav) === 'Üstte' ? 'top' : 'left',
  }
}
