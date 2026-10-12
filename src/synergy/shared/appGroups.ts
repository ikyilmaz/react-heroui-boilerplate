import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from '@/synergy/shared/grid'

/* -------------------------------------------------------------------------------------------------
 * Kullanıcının uygulama grupları (açık istek üzerine eklendi; orijinalde yok)
 *
 * Başlangıç'taki Favoriler / Son Kullanılan Uygulamalar widget'ında her grup bir sekme: kullanıcı grup
 * oluşturur, adını değiştirir, siler; istediği uygulamayı istediği gruba koyar (karonun sağ tık
 * menüsü, grup sekmesindeki "Uygulama ekle"). Tarayıcıda saklanır (`localStorage`), bütün Başlangıç
 * örnekleri (pano, başlat menüsü) aynı listeyi görür.
 * ------------------------------------------------------------------------------------------------- */

export interface AppGroup {
  id: string
  name: string
  /** Uygulama kimlikleri (eklenme sırasıyla). */
  apps: string[]
}

export const GROUP_LABELS = {
  newGroup: 'Yeni grup',
  groupName: 'Grup adı',
  create: 'Oluştur',
  save: 'Kaydet',
  cancel: 'İptal',
  rename: 'Yeniden adlandır',
  remove: 'Grubu sil',
  addTo: 'Gruba ekle',
  removeFrom: 'Gruptan çıkar',
  addApps: 'Uygulama ekle',
  noGroups: 'Önce bir grup oluşturun.',
  empty: 'Bu grupta uygulama yok.',
} as const

const KEY = 'synergy.app-groups'

const valid = (v: unknown): v is AppGroup[] =>
  Array.isArray(v) &&
  v.every(
    (g) =>
      g &&
      typeof g === 'object' &&
      typeof (g as AppGroup).id === 'string' &&
      typeof (g as AppGroup).name === 'string' &&
      Array.isArray((g as AppGroup).apps),
  )

/** Hiç kaydedilmemişse başlangıçtaki iki örnek grup. */
const DEFAULT_GROUPS: AppGroup[] = [
  {
    id: 'insan-kaynaklari',
    name: 'İnsan Kaynakları',
    apps: ['izin-talebi', 'personel-rehberi', 'egitim-katalogu'],
  },
  {
    id: 'satin-alma',
    name: 'Satın Alma',
    apps: ['satin-alma-talebi', 'tedarikci-listesi', 'butce-takip', 'stok-raporu'],
  },
]

let groups: AppGroup[] = (() => {
  const v = readJson<unknown>(KEY, null)
  return v === null ? DEFAULT_GROUPS : valid(v) ? v : []
})()
const listeners = new Set<() => void>()

function commit(next: AppGroup[]) {
  groups = next
  writeJson(KEY, next)
  for (const l of listeners) l()
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const get = () => groups

/** Güncel gruplar (değişince yeniden çizer). */
export function useAppGroups(): AppGroup[] {
  return useSyncExternalStore(subscribe, get, get)
}

/** Yeni grup; kimliğini döner. Boş ad olmaz (kırpılır). */
export function createGroup(name: string): string | undefined {
  const n = name.trim()
  if (!n) return
  const id = `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  commit([...groups, { id, name: n, apps: [] }])
  return id
}

export function renameGroup(id: string, name: string) {
  const n = name.trim()
  if (!n) return
  commit(groups.map((g) => (g.id === id ? { ...g, name: n } : g)))
}

export function deleteGroup(id: string) {
  commit(groups.filter((g) => g.id !== id))
}

/** Uygulamayı gruba ekler ya da gruptan çıkarır. */
export function toggleInGroup(id: string, appId: string) {
  commit(
    groups.map((g) =>
      g.id !== id
        ? g
        : {
            ...g,
            apps: g.apps.includes(appId) ? g.apps.filter((a) => a !== appId) : [...g.apps, appId],
          },
    ),
  )
}
