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
}

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

export interface Preset extends Omit<ThemeTweaks, 'preset'> {
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

export const defaultTweaks: ThemeTweaks = { preset: presets[0].id, ...presets[0] }

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
    return { ...defaultTweaks, ...(JSON.parse(raw) as Partial<ThemeTweaks>) }
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
  commit({ preset: id, ...values })
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
