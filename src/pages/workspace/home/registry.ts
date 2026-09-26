import type { LucideIcon } from 'lucide-react'
import { BellRing, CheckCheck, CircleDot, History, Inbox, Keyboard, Lightbulb, ListChecks, PenLine, Plus, Route } from 'lucide-react'
import { requestsOf } from '@/pages/workflows/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfa widget kataloğu ve hazır düzenler
 *
 * Her widget'ın başlığı, ikonu, görünüm kipleri, en küçük boyutu ve başlık / "…" menüsü ekleri
 * burada; gövdeleri `widgets.tsx`'teki `widgetBodies`'te. Düzenler 12 sütunlu ızgara biriminde
 * (react-grid-layout `LayoutItem` ile uyumlu `GridItem`). Hiçbir widget sayı göstermez.
 * ------------------------------------------------------------------------------------------------- */

export type WidgetId = 'next' | 'queue' | 'following' | 'drafts' | 'start' | 'fyi' | 'decided'

/** Katalog sırası ("Widget ekle" listesi bu sırada). */
export const widgetIds: WidgetId[] = ['next', 'queue', 'following', 'drafts', 'start', 'fyi', 'decided']

export interface WidgetMode {
  id: string
  label: string
}

/**
 * Widget'a özgü komut: başlıkta hayalet düğme (`header`) ya da "…" menüsünde öğe. Çalıştırılması
 * `commands.ts › useWidgetChrome`'da; çerçeve (`WidgetFrame`) yalnızca çizer.
 */
export interface WidgetCommandDef {
  id: string
  label: string
  icon: LucideIcon
  /** `header`: başlıkta düğme; iç genişlik `narrowBelowPx`'ten darsa "…" menüsüne taşınır. */
  place: 'header' | 'menu'
  /** Onay kutulu menü öğesi (seçili durumu `useWidgetChrome` verir). */
  toggle?: boolean
  narrowBelowPx?: number
}

export interface WidgetDef {
  id: WidgetId
  title: string
  /** Kipe göre başlık (ör. `next` › `secili` → "Seçili talep"). */
  titleByMode?: Partial<Record<string, string>>
  icon: LucideIcon
  /** İlki varsayılan kip. Tek kipli widget'ta kip seçici gösterilmez. */
  modes: WidgetMode[]
  /** Kipin gerektirdiği en küçük yükseklik; kip değişince `h` buna yükseltilir. */
  modeMinH?: Partial<Record<string, number>>
  minW: number
  minH: number
  /** Tek sütun görünümünde en fazla satır. */
  stackCap?: number
  /** `rows`: satır listesi ("Boşken gizle" seçeneği var). `card`: tek içerik. */
  listKind: 'rows' | 'card'
  /** "Tümünü gör" adresi; `following` kapsamdan hesaplanır (bkz. `seeAllHref`). */
  seeAll?: string
  commands?: WidgetCommandDef[]
}

export const widgetDefs: Record<WidgetId, WidgetDef> = {
  next: {
    id: 'next',
    title: 'Sıradaki iş',
    titleByMode: { secili: 'Seçili talep' },
    icon: CircleDot,
    modes: [
      { id: 'ozet', label: 'Özet' },
      { id: 'ayrintili', label: 'Ayrıntılı' },
      { id: 'secili', label: 'Seçili talep' },
    ],
    modeMinH: { ozet: 6, ayrintili: 9, secili: 9 },
    minW: 4,
    minH: 6,
    listKind: 'card',
  },
  queue: {
    id: 'queue',
    title: 'Onayınızı bekleyenler',
    icon: Inbox,
    modes: [
      { id: 'aciliyet', label: 'Aciliyete göre' },
      { id: 'surec', label: 'Sürece göre' },
      { id: 'sade', label: 'Sade' },
    ],
    minW: 4,
    minH: 4,
    stackCap: 8,
    listKind: 'rows',
    seeAll: '/is-akislari/bekleyen',
    commands: [
      // 30rem'in (480px) altında "…" menüsüne taşınır
      { id: 'sequence', label: 'Sırayla ilerle', icon: ListChecks, place: 'header', narrowBelowPx: 480 },
      { id: 'hints', label: 'Kısayol ipuçları', icon: Lightbulb, place: 'menu', toggle: true },
      { id: 'shortcuts', label: 'Klavye kısayolları', icon: Keyboard, place: 'menu' },
    ],
  },
  following: {
    id: 'following',
    title: 'Takip ettikleriniz',
    icon: Route,
    modes: [
      { id: 'nerede', label: 'Nerede?' },
      { id: 'adimlar', label: 'Adımlar' },
    ],
    minW: 4,
    minH: 5,
    stackCap: 5,
    listKind: 'rows',
  },
  drafts: {
    id: 'drafts',
    title: 'Yarım kalanlar',
    icon: PenLine,
    modes: [{ id: 'liste', label: 'Liste' }],
    minW: 3,
    minH: 3,
    stackCap: 3,
    listKind: 'rows',
    seeAll: '/is-akislari/taslaklar',
  },
  start: {
    id: 'start',
    title: 'Yeni talep başlat',
    icon: Plus,
    modes: [
      { id: 'hap', label: 'Hap' },
      { id: 'karo', label: 'Karo' },
    ],
    // Karo: 132px karo + başlık + dolgu; Rahat'ta dört, Sıkı'da tam dört birim
    modeMinH: { hap: 3, karo: 4 },
    minW: 4,
    minH: 3,
    listKind: 'card',
  },
  fyi: {
    id: 'fyi',
    title: 'Bilginize sunulanlar',
    icon: BellRing,
    modes: [{ id: 'liste', label: 'Liste' }],
    minW: 3,
    minH: 3,
    stackCap: 3,
    listKind: 'rows',
    seeAll: '/is-akislari/bilgilendirmeler',
    commands: [{ id: 'markAllRead', label: 'Tümünü okundu say', icon: CheckCheck, place: 'menu' }],
  },
  decided: {
    id: 'decided',
    title: 'Son kararlarınız',
    icon: History,
    modes: [{ id: 'liste', label: 'Liste' }],
    minW: 3,
    minH: 3,
    stackCap: 5,
    listKind: 'rows',
  },
}

export function isWidgetId(v: unknown): v is WidgetId {
  return typeof v === 'string' && v in widgetDefs
}

/** Widget'ın o anki kipi; kayıtlı kip geçersizse varsayılan (ilk) kip. */
export function resolveMode(id: WidgetId, mode: string | undefined) {
  const def = widgetDefs[id]
  return mode && def.modes.some((m) => m.id === mode) ? mode : def.modes[0].id
}

/** Kipe göre başlık. */
export function titleOf(id: WidgetId, mode: string) {
  const def = widgetDefs[id]
  return def.titleByMode?.[mode] ?? def.title
}

/** Kipin gerektirdiği en küçük yükseklik (ızgara birimi). */
export function minHOf(id: WidgetId, mode: string) {
  const def = widgetDefs[id]
  return Math.max(def.minH, def.modeMinH?.[mode] ?? 0)
}

/** "Tümünü gör" adresi; `following` seçili kapsamın kutusuna gider. */
export function seeAllHref(id: WidgetId, followScope: 'baslattiklarim' | 'devam-eden') {
  return id === 'following' ? `/is-akislari/${followScope}` : widgetDefs[id].seeAll
}

/* ---- Hazır düzenler ---------------------------------------------------------------------------- */

export type PresetId = 'gunluk' | 'onay-masasi' | 'talep-sahibi' | 'sade'

/** Izgara öğesi; react-grid-layout `LayoutItem` ile uyumlu, yalnızca kalıcı alanlar. */
export interface GridItem {
  i: WidgetId
  x: number
  y: number
  w: number
  h: number
}

export interface Preset {
  id: PresetId
  name: string
  hint: string
  grid: GridItem[]
  /** Tek sütun görünümündeki sıra. */
  stackOrder: WidgetId[]
  hidden: WidgetId[]
  modes: Partial<Record<WidgetId, string>>
  hideWhenEmpty: Partial<Record<WidgetId, boolean>>
  shortcutHints: boolean
  /** Verilirse "Takip ettikleriniz" kapsamını da ayarlar. */
  followScope?: 'baslattiklarim' | 'devam-eden'
}

const at = (i: WidgetId, x: number, y: number, w: number, h: number): GridItem => ({ i, x, y, w, h })

export const presets: Preset[] = [
  {
    // İlk ziyaret ve eski (v1) düzenler: sıradaki iş önde, kuyruk altında, talepler sağda
    id: 'gunluk',
    name: 'Günlük akış',
    hint: 'Sıradaki iş önde, talepleriniz yanda',
    grid: [at('next', 0, 0, 8, 6), at('queue', 0, 6, 8, 12), at('following', 8, 0, 4, 9), at('drafts', 8, 9, 4, 5), at('fyi', 8, 14, 4, 4), at('decided', 8, 18, 4, 4)],
    stackOrder: ['next', 'queue', 'following', 'drafts', 'fyi', 'decided'],
    hidden: ['start'],
    modes: { next: 'ozet', queue: 'aciliyet', following: 'nerede', drafts: 'liste', fyi: 'liste', decided: 'liste', start: 'hap' },
    hideWhenEmpty: { queue: true, drafts: true, fyi: true, decided: true },
    shortcutHints: false,
    followScope: 'baslattiklarim',
  },
  {
    // Yoğun onaycılar: solda kuyruk, sağda odaklanan talebin ayrıntısı ve karar günlüğü
    id: 'onay-masasi',
    name: 'Onay masası',
    hint: 'Listeden seçin, yanda karar verin',
    grid: [at('queue', 0, 0, 7, 16), at('next', 7, 0, 5, 11), at('decided', 7, 11, 5, 5)],
    stackOrder: ['queue', 'decided'],
    hidden: ['following', 'drafts', 'start', 'fyi'],
    modes: { queue: 'aciliyet', next: 'secili', decided: 'liste' },
    hideWhenEmpty: {},
    shortcutHints: true,
  },
  {
    // Talep sahipleri: yeni talep ve takip önde; onay kuyruğu küçük ve sade
    id: 'talep-sahibi',
    name: 'Taleplerim',
    hint: 'Yeni talep ve takip önde',
    grid: [at('start', 0, 0, 12, 4), at('following', 0, 4, 8, 12), at('drafts', 8, 4, 4, 4), at('fyi', 8, 8, 4, 4), at('queue', 8, 12, 4, 4)],
    stackOrder: ['start', 'following', 'drafts', 'queue', 'fyi'],
    hidden: ['next', 'decided'],
    modes: { start: 'karo', following: 'adimlar', drafts: 'liste', fyi: 'liste', queue: 'sade' },
    hideWhenEmpty: { drafts: true, fyi: true, queue: true },
    shortcutHints: false,
  },
  {
    // Ortada tek okuma sütunu: yalnızca sıradaki iş ve kalan kuyruk
    id: 'sade',
    name: 'Sade',
    hint: 'Tek sütun, yalnızca sıradaki iş',
    grid: [at('next', 2, 0, 8, 9), at('queue', 2, 9, 8, 7)],
    stackOrder: ['next', 'queue'],
    hidden: ['following', 'drafts', 'start', 'fyi', 'decided'],
    modes: { next: 'ayrintili', queue: 'sade' },
    hideWhenEmpty: { queue: true },
    shortcutHints: false,
  },
]

export function findPreset(id: string | undefined) {
  return presets.find((p) => p.id === id)
}

export function isPresetId(v: unknown): v is PresetId {
  return typeof v === 'string' && presets.some((p) => p.id === v)
}

/**
 * İlk ziyarette hangi düzen: onay bekleyen iş varsa "Günlük akış", yoksa "Taleplerim". Sayı
 * yalnızca bu karar için okunur, hiçbir yerde gösterilmez.
 */
export function pickPreset(): PresetId {
  return requestsOf('bekleyen').length > 0 ? 'gunluk' : 'talep-sahibi'
}
