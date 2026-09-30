import { useCallback, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  CalendarDays,
  Clock3,
  CloudSun,
  Hand,
  LayoutDashboard,
  Sparkles,
  SlidersHorizontal,
  StickyNote,
} from 'lucide-react'
import { readJson, writeJson } from '@/synergy/shared/grid'

/* -------------------------------------------------------------------------------------------------
 * Başlangıç widget panosu: model
 *
 * Pano 12 sütunlu bir ızgara (satır yüksekliği `ROW_HEIGHT`). Her widget türü desteklediği
 * boyutları (sütun × satır) tanımlar; kullanıcı boyutlandırınca en yakın desteklenen boyuta
 * oturur ve widget o boyutun görünümünü çizer (ör. uygulamalar: yatay şerit / dikey liste /
 * kare ızgara). Hazır düzenler (preset) arasında geçilir; bir düzende yapılan değişiklik o düzene
 * yazılır (tarayıcıda), "Sıfırla" düzeni hazır hâline döndürür. Her tür panoda en fazla bir kez.
 * ------------------------------------------------------------------------------------------------- */

export const COLS = 12
/** Satır yüksekliğinin alt sınırı (px): pano ekrana sığdırılırken daha fazla küçülmez. */
export const MIN_ROW_HEIGHT = 40
/** Dar ekranda (alt alta dizilince) satır yüksekliği. */
export const ROW_HEIGHT = 64
export const GAP = 12

export type WidgetKind =
  | 'greeting'
  | 'apps'
  | 'work'
  | 'clock'
  | 'weather'
  | 'assistant'
  | 'calendar'
  | 'controls'
  | 'notes'

export interface WidgetSize {
  id: string
  label: string
  w: number
  h: number
}

export interface WidgetDef {
  kind: WidgetKind
  title: string
  description: string
  icon: LucideIcon
  /** Desteklenen boyutlar; ilki eklenirkenki boyut. */
  sizes: WidgetSize[]
}

const size = (id: string, label: string, w: number, h: number): WidgetSize => ({ id, label, w, h })

export const WIDGETS: Record<WidgetKind, WidgetDef> = {
  greeting: {
    kind: 'greeting',
    title: 'Karşılama',
    description: 'Selamlama ve bekleyen onay sayısı',
    icon: Hand,
    sizes: [
      size('m', 'Orta', 5, 2),
      size('s', 'Küçük', 3, 2),
      size('l', 'Geniş', 7, 2),
      size('xs', 'Şerit', 3, 1),
    ],
  },
  apps: {
    kind: 'apps',
    title: 'Favoriler / Son Kullanılan Uygulamalar',
    description: 'Sabitlenen ve son kullanılan uygulamalar',
    icon: AppWindow,
    sizes: [
      size('wide', 'Yatay', 7, 2),
      size('tall', 'Dikey', 3, 6),
      size('column', 'Sütun', 3, 9),
      size('square', 'Kare', 4, 4),
      size('full', 'Tam genişlik', 12, 2),
    ],
  },
  work: {
    kind: 'work',
    title: 'İş Akışları',
    description: 'Kategoriler, süreç grupları ve talepler',
    icon: LayoutDashboard,
    // Alana ihtiyacı olan widget: yalnızca geniş boyutlar
    sizes: [
      size('l', 'Geniş', 12, 7),
      size('s', 'Orta', 9, 7),
      size('m', 'Yan', 9, 9),
      size('xl', 'Tam ekran', 12, 9),
    ],
  },
  clock: {
    kind: 'clock',
    title: 'Saat',
    description: 'Saat, tarih ve dünya saatleri',
    icon: Clock3,
    sizes: [
      size('m', 'Orta', 3, 2),
      size('s', 'Küçük', 2, 2),
      size('l', 'Büyük', 3, 4),
      size('xs', 'Şerit', 3, 1),
    ],
  },
  weather: {
    kind: 'weather',
    title: 'Hava Durumu',
    description: 'Anlık hava ve günlük tahmin (örnek veri)',
    icon: CloudSun,
    sizes: [
      size('m', 'Orta', 4, 2),
      size('s', 'Küçük', 2, 2),
      size('l', 'Büyük', 4, 4),
      size('xs', 'Şerit', 3, 1),
    ],
  },
  assistant: {
    kind: 'assistant',
    title: 'Asistan',
    description: 'Uygulama hakkında soru sorun',
    icon: Sparkles,
    sizes: [size('m', 'Orta', 4, 5), size('tall', 'Uzun', 4, 7), size('wide', 'Geniş', 6, 5)],
  },
  calendar: {
    kind: 'calendar',
    title: 'Takvim',
    description: 'Ay görünümü ve bugün',
    icon: CalendarDays,
    sizes: [size('m', 'Orta', 3, 4), size('l', 'Büyük', 4, 5)],
  },
  controls: {
    kind: 'controls',
    title: 'Denetimler',
    description: 'Tema ve görünüm ayarlarını hızla açıp kapatın',
    icon: SlidersHorizontal,
    sizes: [
      size('wide', 'Yatay', 4, 2),
      size('compact', 'Kompakt', 3, 2),
      size('square', 'Kare', 3, 3),
    ],
  },
  notes: {
    kind: 'notes',
    title: 'Notlar',
    description: 'Kısa notlar (bu tarayıcıda saklanır)',
    icon: StickyNote,
    sizes: [size('m', 'Orta', 3, 3), size('l', 'Büyük', 4, 4), size('tall', 'Uzun', 4, 7)],
  },
}

export const WIDGET_ORDER = Object.keys(WIDGETS) as WidgetKind[]

export interface PlacedWidget {
  kind: WidgetKind
  x: number
  y: number
  w: number
  h: number
}

export interface Preset {
  id: string
  name: string
  description: string
  items: PlacedWidget[]
}

const at = (kind: WidgetKind, x: number, y: number, sizeId: string): PlacedWidget => {
  const s = WIDGETS[kind].sizes.find((z) => z.id === sizeId)!
  return { kind, x, y, w: s.w, h: s.h }
}

/**
 * Hazır düzenler: hepsi 12 sütun × 9 satırlık ızgarayı boşluksuz doldurur (satır yüksekliği
 * ekrana göre hesaplandığından pano görünen alanı tam kaplar, sayfa kaymaz).
 */
export const PRESETS: Preset[] = [
  {
    id: 'default',
    name: 'Varsayılan',
    description: 'Karşılama, saat, hava ve iş akışları; sağda uygulamalar sütunu',
    // sol 9: 3 + 2 + 4 | 9 × 7 · sağ 3 × 9
    items: [
      at('greeting', 0, 0, 's'),
      at('clock', 3, 0, 's'),
      at('weather', 5, 0, 'm'),
      at('work', 0, 2, 's'),
      at('apps', 9, 0, 'column'),
    ],
  },
  {
    id: 'focus',
    name: 'Odak',
    description: 'Küçük karşılama, saat, hava ve denetimler; altta iş akışları',
    // 3 + 2 + 4 + 3 | 12 × 7
    items: [
      at('greeting', 0, 0, 's'),
      at('clock', 3, 0, 's'),
      at('weather', 5, 0, 'm'),
      at('controls', 9, 0, 'compact'),
      at('work', 0, 2, 'l'),
    ],
  },
  {
    id: 'sidebar',
    name: 'Yan panel',
    description: 'Solda dikey uygulamalar ve denetimler, sağda iş akışları',
    // sol 3 × (6 + 3) | sağ 9 × 9
    items: [at('apps', 0, 0, 'tall'), at('controls', 0, 6, 'square'), at('work', 3, 0, 'm')],
  },
  {
    id: 'personal',
    name: 'Kişisel',
    description: 'Asistan, takvim, notlar ve hava durumu',
    // 5 + 3 + 4 | 4 × 7 · 4 × (5 + 2) · 4 × 7
    items: [
      at('greeting', 0, 0, 'm'),
      at('clock', 5, 0, 'm'),
      at('weather', 8, 0, 'm'),
      at('assistant', 0, 2, 'tall'),
      at('calendar', 4, 2, 'l'),
      at('controls', 4, 7, 'wide'),
      at('notes', 8, 2, 'tall'),
    ],
  },
]

/** Boyutlandırmadan sonra en yakın desteklenen boyut (sütun farkı satırdan biraz ağır basar). */
export function nearestSize(kind: WidgetKind, w: number, h: number): WidgetSize {
  const sizes = WIDGETS[kind].sizes
  return sizes.reduce((best, s) =>
    Math.abs(s.w - w) * 1.2 + Math.abs(s.h - h) < Math.abs(best.w - w) * 1.2 + Math.abs(best.h - h)
      ? s
      : best,
  )
}

/** Widget'ın o anki boyutu (w × h desteklenmiyorsa en yakını). */
export const sizeOf = (p: PlacedWidget) => nearestSize(p.kind, p.w, p.h)

/** Boyutlandırma sınırları (desteklenen boyutların en küçüğü / en büyüğü). */
export function limitsOf(kind: WidgetKind) {
  const s = WIDGETS[kind].sizes
  return {
    minW: Math.min(...s.map((z) => z.w)),
    maxW: Math.max(...s.map((z) => z.w)),
    minH: Math.min(...s.map((z) => z.h)),
    maxH: Math.max(...s.map((z) => z.h)),
  }
}

/**
 * Boşlukları doldurur: pano dikdörtgen bir alan olsun diye her boş hücre komşu bir widget'ın
 * genişlemesiyle kapanır. Sırayla denenir (değişiklik kalmayana kadar): boşluğun sağındaki
 * widget sola uzar (ör. karşılama küçülünce yanındaki uygulamalar büyür), soldaki sağa, üstteki
 * aşağı, alttaki yukarı. Toplam satır sayısı en alttaki widget'ın bitişi. Widget, genişleyince
 * görünümünü en yakın desteklenen boyuta göre seçer (`sizeOf`).
 */
export function fillGaps(items: PlacedWidget[]): PlacedWidget[] {
  const out = items.map((p) => ({ ...p }))
  const rows = Math.max(0, ...out.map((p) => p.y + p.h))
  const free = (x: number, y: number, self: PlacedWidget) =>
    x >= 0 &&
    x < COLS &&
    y >= 0 &&
    y < rows &&
    !out.some((p) => p !== self && x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)
  const column = (p: PlacedWidget, x: number) =>
    Array.from({ length: p.h }, (_, i) => p.y + i).every((y) => free(x, y, p))
  const row = (p: PlacedWidget, y: number) =>
    Array.from({ length: p.w }, (_, i) => p.x + i).every((x) => free(x, y, p))
  // Yönler öncelik sırasıyla aşama aşama: bir yön tükenince sonrakine geçilir, bir büyüme olunca
  // baştan başlanır (önce hep sola uzama denensin)
  const grow = [
    (p: PlacedWidget) => column(p, p.x - 1) && ((p.x -= 1), (p.w += 1), true),
    (p: PlacedWidget) => column(p, p.x + p.w) && ((p.w += 1), true),
    (p: PlacedWidget) => row(p, p.y + p.h) && ((p.h += 1), true),
    (p: PlacedWidget) => row(p, p.y - 1) && ((p.y -= 1), (p.h += 1), true),
  ]
  for (let guard = 0; guard < 500; guard++) {
    const step = grow.find((g) => out.some((p) => g(p)))
    if (!step) break
  }
  return out
}

/* --- Saklama ----------------------------------------------------------------------------------- */

const STORE_KEY = 'synergy-dashboard-v1'

interface Stored {
  preset: string
  /** Düzen başına kullanıcının değiştirdiği yerleşim. */
  layouts: Record<string, PlacedWidget[]>
}

const valid = (items: unknown): items is PlacedWidget[] =>
  Array.isArray(items) &&
  items.every(
    (i) =>
      i &&
      typeof i === 'object' &&
      (i as PlacedWidget).kind in WIDGETS &&
      ['x', 'y', 'w', 'h'].every((k) => typeof (i as Record<string, unknown>)[k] === 'number'),
  )

function load(): Stored {
  const s = readJson<Partial<Stored>>(STORE_KEY, {})
  const preset = PRESETS.some((p) => p.id === s.preset) ? s.preset! : PRESETS[0]!.id
  const layouts: Record<string, PlacedWidget[]> = {}
  for (const [k, v] of Object.entries(s.layouts ?? {})) if (valid(v)) layouts[k] = v
  return { preset, layouts }
}

/** Pano durumu: seçili düzen, yerleşim, değiştirildi mi; düzen seçme, yerleşimi yazma, sıfırlama. */
export function useDashboard() {
  const [state, setState] = useState<Stored>(load)
  const save = useCallback((next: Stored) => {
    setState(next)
    writeJson(STORE_KEY, next)
  }, [])
  const preset = PRESETS.find((p) => p.id === state.preset)!
  const items = state.layouts[preset.id] ?? preset.items
  return {
    preset,
    items,
    changed: !!state.layouts[preset.id],
    choose: (id: string) => save({ ...state, preset: id }),
    setItems: (next: PlacedWidget[]) =>
      save({ ...state, layouts: { ...state.layouts, [preset.id]: next } }),
    reset: () => {
      const layouts = { ...state.layouts }
      delete layouts[preset.id]
      save({ ...state, layouts })
    },
  }
}
