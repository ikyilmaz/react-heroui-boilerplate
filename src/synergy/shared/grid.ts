import { cellValue, formatDateTime, type Column, type WorkRequest } from '@/synergy/shared/workflowData'

/* Talep listelerinin tasarımdan bağımsız yardımcıları: sıralama, arama metni, sayfa numaraları. */

/** Hücre karşılaştırması (sütun sıralaması). */
export function compareBy(a: WorkRequest, b: WorkRequest, key: string) {
  const x = cellValue(a, key)
  const y = cellValue(b, key)
  if (x == null) return y == null ? 0 : 1
  if (y == null) return -1
  if (x instanceof Date && y instanceof Date) return x.getTime() - y.getTime()
  if (typeof x === 'number' && typeof y === 'number') return x - y
  return String(x).localeCompare(String(y), 'tr', { numeric: true })
}

/** Satırın aranabilir metni: sütun değerleri (tarihler tam biçimde), Türkçe küçük harf. */
export function searchText(r: WorkRequest, columns: Column[]) {
  return columns
    .map((c) => {
      const v = cellValue(r, c.key)
      return v instanceof Date ? formatDateTime(v) : v == null ? '' : String(v)
    })
    .join(' ')
    .toLocaleLowerCase('tr')
}

/** Sayfa düğmeleri: ilk, son ve seçilinin komşuları; aradakiler boşluk. */
export function pageItems(page: number, count: number): (number | 'gap')[] {
  const out: (number | 'gap')[] = []
  for (let i = 1; i <= count; i++) {
    if (i === 1 || i === count || Math.abs(i - page) <= 1) out.push(i)
    else if (out[out.length - 1] !== 'gap') out.push('gap')
  }
  return out
}

/** Tarayıcı deposundan JSON; kapalıysa ya da bozuksa varsayılan. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Depolama kapalıysa yalnızca bu oturumda
  }
}
