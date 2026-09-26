import { useSyncExternalStore } from 'react'

/* -------------------------------------------------------------------------------------------------
 * Tema ayarları
 *
 * HeroUI teması tamamen CSS değişkenleriyle sürülüyor (`--accent`, `--radius`, `--border-width`...).
 * Türetilmiş token'lar (`--accent-soft`, `--accent-hover`, `--focus`, `--field-radius`) tema
 * dosyasında `color-mix`/`calc` ile bunlardan hesaplanıyor; dolayısıyla kökteki birkaç değişkeni
 * değiştirmek tüm bileşenlere yayılıyor. Değerleri `:root` üzerinde satır içi stil olarak
 * yazıyoruz: satır içi stil, stil sayfasındaki tanımları ezer.
 * ------------------------------------------------------------------------------------------------- */

export interface ThemeTweaks {
  /** Seçili hazır ayar; elle bir şey değiştirilince "custom" olur. */
  preset: string
  accent: string
  success: string
  warning: string
  danger: string
  /** Köşe yuvarlaklığı (rem). Tüm bileşenler bunun katlarını kullanır. */
  radius: number
  /** Genel kenarlık kalınlığı (px). */
  borderWidth: number
  /** Form alanlarının kenarlık kalınlığı (px). 0 = kenarlıksız. */
  fieldBorderWidth: number
  /** Tailwind boşluk birimi (rem). Tüm padding/gap ölçüleri bunun katı. */
  spacing: number
  /** `fonts` içindeki id. */
  font: string
  /** Kök yazı boyutu (px). rem tabanlı her ölçü bununla ölçeklenir. */
  fontSize: number
  /** Devre dışı bileşenlerin opaklığı. */
  disabledOpacity: number
  /**
   * Onay akışının yerleşimi: renk değil, bilgi hiyerarşisi ve etkileşim modeli. Renk hazır
   * ayarlarından bağımsızdır; hazır ayar seçmek yerleşimi değiştirmez.
   */
  layout: LayoutId
  /** Yumuşak kabuk sayfalarının zemin gradyanı (`backgrounds` içindeki id). */
  background: string
}

/* -------------------------------------------------------------------------------------------------
 * Zemin gradyanları
 *
 * Her birinin açık ve koyu mod hâli var. `applyTweaks` seçileni `--canvas-light` / `--canvas-dark`
 * olarak köke yazar; `.soft-canvas` bunları kullanır. Panel önizlemeleri de aynı dizelerden
 * çizilir. Tonlar bilerek düşük doygunlukta: yarı saydam yüzeyler ve metin okunur kalmalı.
 * ------------------------------------------------------------------------------------------------- */

export interface BackgroundOption {
  id: string
  name: string
  light: string
  dark: string
}

/** Köşelerde renkli ışık lekeleri, ortası nötr ("mesh" gradyan). */
const mesh = (base: string, a: string, b: string, c: string) =>
  `radial-gradient(at 12% 18%, ${a} 0, transparent 50%), radial-gradient(at 88% 8%, ${b} 0, transparent 45%), radial-gradient(at 72% 92%, ${c} 0, transparent 55%), linear-gradient(${base}, ${base})`

export const backgrounds: BackgroundOption[] = [
  {
    id: 'sis',
    name: 'Sis',
    light: 'linear-gradient(to bottom right, #e8ebf1, #dce2ed 50%, #c6d0e6)',
    dark: 'linear-gradient(to bottom right, #12151c, #171b25 50%, #1d2436)',
  },
  {
    id: 'safak',
    name: 'Şafak',
    light: 'linear-gradient(135deg, #fbe9df, #f2dff0 50%, #d9ddf6)',
    dark: 'linear-gradient(135deg, #1d1518, #211828 50%, #1a1d33)',
  },
  {
    id: 'nane',
    name: 'Nane',
    light: 'linear-gradient(160deg, #e5f5ee, #dcefef 50%, #cfe2f0)',
    dark: 'linear-gradient(160deg, #0f1a17, #11201f 50%, #13202b)',
  },
  {
    id: 'okyanus',
    name: 'Okyanus',
    light: 'linear-gradient(180deg, #e0f2f8, #cfe2f5 55%, #c2cbef)',
    dark: 'linear-gradient(180deg, #0b1620, #0e1a2b 55%, #121a36)',
  },
  {
    id: 'lavanta',
    name: 'Lavanta',
    light: 'linear-gradient(135deg, #f0eaf8, #e3ddf3 50%, #d2d2ef)',
    dark: 'linear-gradient(135deg, #16131f, #1b1728 50%, #1b1b30)',
  },
  {
    id: 'gun-batimi',
    name: 'Gün batımı',
    light: 'linear-gradient(200deg, #fdebd8, #f9d6d2 50%, #e8c9e4)',
    dark: 'linear-gradient(200deg, #1f1612, #25171a 50%, #231929)',
  },
  {
    id: 'kum',
    name: 'Kum',
    light: 'linear-gradient(135deg, #f5f0e7, #ede4d6 50%, #dfd7cc)',
    dark: 'linear-gradient(135deg, #1a1714, #1f1b17 50%, #221e1b)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    light: mesh('#eef1f6', '#d4f4e6', '#e2dafb', '#cde4fb'),
    dark: mesh('#12151c', '#123028', '#231d3d', '#12263d'),
  },
  {
    id: 'seftali',
    name: 'Şeftali',
    light: mesh('#f6f1ee', '#fde0cf', '#f8d9e6', '#e7e1f7'),
    dark: mesh('#17141a', '#33201a', '#2e1a26', '#1f1d33'),
  },
  {
    id: 'duz',
    name: 'Düz',
    light: 'linear-gradient(#e6e9ef, #e6e9ef)',
    dark: 'linear-gradient(#14171e, #14171e)',
  },
]

/* -------------------------------------------------------------------------------------------------
 * Yerleşimler
 *
 * "İş Akış Yönetimi" kutu sayfasının iki UX kurgusu. Aynı veri, farklı hiyerarşi: süreç mi önce
 * gelir, talep mi?
 * ------------------------------------------------------------------------------------------------- */

export type LayoutId = 'pano' | 'gelen-kutusu'

export interface LayoutOption {
  id: LayoutId
  name: string
  /** Panelde gösterilen tek satırlık fikir. */
  idea: string
}

export const layouts: LayoutOption[] = [
  { id: 'pano', name: 'Pano', idea: 'Süreç önce: süreç kartları, tıklayınca popover içinde talepler.' },
  { id: 'gelen-kutusu', name: 'Gelen Kutusu', idea: 'E-posta gibi üç sütun: kutular · talepler · detay. Sayfa değişmez.' },
]

/* -------------------------------------------------------------------------------------------------
 * Yazı tipleri
 * ------------------------------------------------------------------------------------------------- */

export interface FontOption {
  id: string
  name: string
  stack: string
  /** Google Fonts aile adı; yoksa sistem yazı tipidir ve ağdan bir şey indirilmez. */
  google?: string
}

const SYSTEM_STACK = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'

export const fonts: FontOption[] = [
  { id: 'system', name: 'Sistem', stack: SYSTEM_STACK },
  { id: 'inter', name: 'Inter', stack: `"Inter", ${SYSTEM_STACK}`, google: 'Inter' },
  { id: 'dm-sans', name: 'DM Sans', stack: `"DM Sans", ${SYSTEM_STACK}`, google: 'DM Sans' },
  { id: 'figtree', name: 'Figtree', stack: `"Figtree", ${SYSTEM_STACK}`, google: 'Figtree' },
  { id: 'manrope', name: 'Manrope', stack: `"Manrope", ${SYSTEM_STACK}`, google: 'Manrope' },
  { id: 'jakarta', name: 'Plus Jakarta Sans', stack: `"Plus Jakarta Sans", ${SYSTEM_STACK}`, google: 'Plus Jakarta Sans' },
  { id: 'poppins', name: 'Poppins', stack: `"Poppins", ${SYSTEM_STACK}`, google: 'Poppins' },
  { id: 'nunito', name: 'Nunito', stack: `"Nunito", ${SYSTEM_STACK}`, google: 'Nunito' },
  { id: 'ibm-plex', name: 'IBM Plex Sans', stack: `"IBM Plex Sans", ${SYSTEM_STACK}`, google: 'IBM Plex Sans' },
  { id: 'source-sans', name: 'Source Sans 3', stack: `"Source Sans 3", ${SYSTEM_STACK}`, google: 'Source Sans 3' },
  { id: 'space-grotesk', name: 'Space Grotesk', stack: `"Space Grotesk", ${SYSTEM_STACK}`, google: 'Space Grotesk' },
  { id: 'roboto', name: 'Roboto', stack: `"Roboto", ${SYSTEM_STACK}`, google: 'Roboto' },
]

/* -------------------------------------------------------------------------------------------------
 * Hazır ayarlar
 * ------------------------------------------------------------------------------------------------- */

export interface Preset extends Omit<ThemeTweaks, 'preset' | 'layout' | 'background'> {
  id: string
  name: string
}

const base = {
  success: '#17c964',
  warning: '#f5a524',
  danger: '#ff383c',
  spacing: 0.25,
  fontSize: 16,
  disabledOpacity: 0.5,
}

export const presets: Preset[] = [
  {
    ...base,
    id: 'heroui',
    name: 'HeroUI',
    accent: '#0485f7',
    radius: 0.5,
    borderWidth: 1,
    fieldBorderWidth: 0,
    font: 'system',
  },
  {
    ...base,
    id: 'kurumsal',
    name: 'Kurumsal',
    accent: '#1a609e',
    radius: 0.25,
    borderWidth: 1,
    fieldBorderWidth: 1,
    font: 'source-sans',
  },
  {
    ...base,
    id: 'keskin',
    name: 'Keskin',
    accent: '#6b727e',
    radius: 0,
    borderWidth: 1,
    fieldBorderWidth: 1,
    font: 'ibm-plex',
  },
  {
    ...base,
    id: 'yumusak',
    name: 'Yumuşak',
    accent: '#e97ab2',
    radius: 1,
    borderWidth: 0,
    fieldBorderWidth: 0,
    spacing: 0.28,
    font: 'nunito',
  },
  {
    ...base,
    id: 'zumrut',
    name: 'Zümrüt',
    accent: '#00ae75',
    radius: 0.75,
    borderWidth: 1,
    fieldBorderWidth: 0,
    font: 'figtree',
  },
  {
    ...base,
    id: 'menekse',
    name: 'Menekşe',
    accent: '#8851eb',
    radius: 0.625,
    borderWidth: 1,
    fieldBorderWidth: 0,
    font: 'jakarta',
  },
  {
    ...base,
    id: 'gunbatimi',
    name: 'Gün batımı',
    accent: '#f3680f',
    radius: 0.875,
    borderWidth: 0,
    fieldBorderWidth: 0,
    spacing: 0.26,
    font: 'poppins',
  },
  {
    // CLAUDE.md › Design language: siyah vurgu, mavi/mercan durum renkleri, çok yuvarlak köşeler
    ...base,
    id: 'buzlu-cam',
    name: 'Buzlu Cam',
    accent: '#0b0b0c',
    success: '#7e9bdb',
    danger: '#e0605a',
    radius: 1,
    borderWidth: 1,
    fieldBorderWidth: 1,
    font: 'manrope',
  },

]

/** Vurgu rengi için hızlı seçim paleti. */
export const accentSwatches = [
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#64748b',
]

export const defaultTweaks: ThemeTweaks = { preset: presets[0].id, ...presets[0], layout: 'pano', background: 'sis' }

/* -------------------------------------------------------------------------------------------------
 * Uygulama
 * ------------------------------------------------------------------------------------------------- */

const STORAGE_KEY = 'heroui-tweaks'
const FONT_LINK_ID = 'heroui-tweaks-font'

function loadFont(option: FontOption) {
  if (typeof document === 'undefined') return
  const existing = document.getElementById(FONT_LINK_ID)
  if (!option.google) {
    existing?.remove()
    return
  }
  // Statik ve değişken aileler için de çalışan ağırlık listesi
  const family = option.google.replace(/ /g, '+')
  const href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`
  const link = (existing as HTMLLinkElement | null) ?? document.createElement('link')
  if (link.getAttribute('href') === href) return
  link.id = FONT_LINK_ID
  link.rel = 'stylesheet'
  link.href = href
  if (!existing) document.head.appendChild(link)
}

export function applyTweaks(t: ThemeTweaks) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const s = root.style

  s.setProperty('--accent', t.accent)
  s.setProperty('--success', t.success)
  s.setProperty('--warning', t.warning)
  s.setProperty('--danger', t.danger)

  s.setProperty('--radius', `${t.radius}rem`)
  s.setProperty('--border-width', `${t.borderWidth}px`)
  s.setProperty('--field-border-width', `${t.fieldBorderWidth}px`)
  // Kalınlık 0 iken renk vermek gereksiz; verilince görünür bir kenarlık lazım
  s.setProperty('--field-border', t.fieldBorderWidth > 0 ? 'var(--border)' : 'transparent')
  s.setProperty('--spacing', `${t.spacing}rem`)
  s.setProperty('--disabled-opacity', String(t.disabledOpacity))

  const font = fonts.find((f) => f.id === t.font) ?? fonts[0]
  s.setProperty('--font-sans', font.stack)
  // Tailwind'in kök yazı tipi `--default-font-family` üzerinden gelir; doğrudan da veriyoruz
  s.fontFamily = font.stack
  s.fontSize = `${t.fontSize}px`
  loadFont(font)

  const bg = backgrounds.find((b) => b.id === t.background) ?? backgrounds[0]
  s.setProperty('--canvas-light', bg.light)
  s.setProperty('--canvas-dark', bg.dark)

}

/* -------------------------------------------------------------------------------------------------
 * Depo (küçük bir dış store; Provider'a gerek yok)
 * ------------------------------------------------------------------------------------------------- */

function load(): ThemeTweaks {
  if (typeof localStorage === 'undefined') return defaultTweaks
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultTweaks
    // Eksik/eski alanlar varsayılandan tamamlanır
    const saved = { ...defaultTweaks, ...(JSON.parse(raw) as Partial<ThemeTweaks>) }
    // Kaldırılan yerleşimler (odak, kanban, zaman tüneli) kayıtlıysa varsayılana dön
    if (!layouts.some((l) => l.id === saved.layout)) saved.layout = defaultTweaks.layout
    return saved
  } catch {
    return defaultTweaks
  }
}

let state = load()
const listeners = new Set<() => void>()

// İlk boyamadan önce uygula: modül React'ten önce çalışır, böylece tema sıçraması olmaz
applyTweaks(state)

function commit(next: ThemeTweaks) {
  state = next
  applyTweaks(next)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Depolama kapalıysa (gizli sekme) ayar yalnızca bu oturumda yaşar
  }
  for (const l of listeners) l()
}

/** Tek bir ayarı değiştirir; hazır ayardan sapıldığı için preset "custom" olur. */
export function setTweak<K extends keyof Omit<ThemeTweaks, 'preset'>>(key: K, value: ThemeTweaks[K]) {
  commit({ ...state, [key]: value, preset: 'custom' })
}

export function applyPreset(id: string) {
  const preset = presets.find((p) => p.id === id)
  if (!preset) return
  const { id: _id, name: _name, ...values } = preset
  // Yerleşim ve zemin renk hazır ayarının parçası değil; olduğu gibi kalır
  commit({ preset: id, ...values, layout: state.layout, background: state.background })
}

export function resetTweaks() {
  commit(defaultTweaks)
}

export function useThemeTweaks() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => defaultTweaks,
  )
}
