import { useCallback, useState } from 'react'
import { createStore } from '@/pages/workflows/triage'
import { findProcess, matchesProcess, processes, requestsOf, type Process } from '@/pages/workflows/workflowData'
import { useDemo } from '@/pages/workspace/home/useTriage'

/* -------------------------------------------------------------------------------------------------
 * Sık kullanılan süreçler ("Yeni talep başlat" widget'ı ve "Yeni talep" penceresi)
 *
 * Kişiye özel; tarayıcıda `workspace-home-favs-v1` anahtarında süreç kimlikleri olarak saklanır
 * (her okuma / yazma try/catch içinde). Hiç yıldızlanmadıysa varsayılan, kullanıcının başlattığı
 * ve taslakta bekleyen taleplerin süreçleri (en yeni önce). `?durum=bos` gösteriminde liste boş
 * başlar ve değişiklikler kaydedilmez.
 * ------------------------------------------------------------------------------------------------- */

export const FAVS_STORAGE_KEY = 'workspace-home-favs-v1'

/** Maket geçmişinden varsayılan: başlatılan ∪ taslak taleplerin süreçleri, en yeni önce, tekil. */
function defaultFavorites(): string[] {
  const history = [...requestsOf('baslattiklarim'), ...requestsOf('taslaklar')].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return [...new Set(history.map((r) => r.processId))]
}

let cached: readonly string[] | undefined

/** Depodaki liste (bir kez okunur); yoksa ya da bozuksa varsayılan. */
function readFavorites(): readonly string[] {
  if (cached === undefined) cached = loadFavorites()
  return cached
}

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVS_STORAGE_KEY)
    if (raw !== null) {
      const v: unknown = JSON.parse(raw)
      if (Array.isArray(v)) return [...new Set(v.filter((x): x is string => typeof x === 'string' && !!findProcess(x)))]
    }
  } catch {
    // Bozuk ya da erişilemeyen depo: varsayılana düş
  }
  return defaultFavorites()
}

function writeFavorites(ids: readonly string[]) {
  try {
    localStorage.setItem(FAVS_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // Depolama kapalı: yalnızca bu oturumda kalır
  }
}

/** `null`: henüz okunmadı (ilk kullanımda depodan okunur). Widget ve pencere aynı depoyu paylaşır. */
const favStore = createStore<readonly string[] | null>(null)
/** `?durum=bos` gösterimi için ayrı, kaydedilmeyen liste. */
const demoStore = createStore<readonly string[]>([])

/**
 * `[ids, toggle, snapshot]`:
 * - `ids`: şu an yıldızlı süreçler (sıra: eklenme / varsayılan sırası)
 * - `toggle(id)`: yıldızı açar / kapatır ve kaydeder
 * - `snapshot`: çizim sırası; bileşen ilk çizildiğindeki liste, sonradan yıldızlananlar sona
 *   eklenir, yıldızı kaldırılan yerinde kalır (imlecin altındaki karo kaymaz ya da kaybolmaz)
 */
export function useFavorites(): [ids: readonly string[], toggle: (id: string) => void, snapshot: readonly string[]] {
  const demo = useDemo()
  const stored = favStore.use()
  const demoIds = demoStore.use()
  const ids = demo === 'bos' ? demoIds : (stored ?? readFavorites())

  const toggle = useCallback(
    (id: string) => {
      if (!findProcess(id)) return
      const flip = (list: readonly string[]) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
      if (demo === 'bos') {
        demoStore.set(flip)
        return
      }
      const next = flip(favStore.get() ?? readFavorites())
      favStore.set(next)
      writeFavorites(next)
    },
    [demo],
  )

  // Çizim sırası: ilk çizimdeki liste; yeni yıldızlananlar sona eklenir, çıkarılanlar kalır
  const [order, setOrder] = useState<readonly string[]>(ids)
  const missing = ids.filter((x) => !order.includes(x))
  if (missing.length) setOrder([...order, ...missing])
  const snapshot = missing.length ? [...order, ...missing] : order

  return [ids, toggle, snapshot]
}

/**
 * "Yeni talep" kataloğu: aramaya (`matchesProcess`: ad, birim, eş anlamlılar) uyan süreçler;
 * önce "Sık kullandıklarınız", sonra birimlere göre (birimlerin `processes` içinde ilk göründüğü
 * sırayla). Sık kullanılanlar birim gruplarında da yer alır. Boş sonuç → "Bu adla bir süreç
 * bulunamadı. Farklı bir kelime deneyin."
 */
export function processCatalog(query: string, favoriteIds: readonly string[]): { favorites: Process[]; departments: { department: string; processes: Process[] }[] } {
  const hits = processes.filter((p) => matchesProcess(p, query))
  const favorites = favoriteIds.flatMap((id) => hits.filter((p) => p.id === id))
  const departments: { department: string; processes: Process[] }[] = []
  for (const p of hits) {
    const group = departments.find((d) => d.department === p.department)
    if (group) group.processes.push(p)
    else departments.push({ department: p.department, processes: [p] })
  }
  return { favorites, departments }
}
