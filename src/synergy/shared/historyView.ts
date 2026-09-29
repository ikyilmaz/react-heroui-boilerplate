import { useState } from 'react'

/* Akış Tarihçesi › "Görünüm Seçenekleri" durumu (bileşen dosyasından ayrı: hızlı yenileme bozulmasın). */

export interface HistoryViewOptions {
  notify: boolean
  rawDate: boolean
}

const RAW_DATE_KEY = 'flowHistoryShowRawDate'

function readRawDate() {
  try {
    return localStorage.getItem(RAW_DATE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Görünüm seçenekleri durumu; "Tarih ve Saati Göster" tarayıcıda saklanır. */
export function useHistoryViewOptions() {
  const [options, setOptions] = useState<HistoryViewOptions>(() => ({ notify: true, rawDate: readRawDate() }))
  const update = (next: HistoryViewOptions) => {
    setOptions(next)
    try {
      localStorage.setItem(RAW_DATE_KEY, String(next.rawDate))
    } catch {
      // Depolama kapalıysa yalnızca bu oturumda geçerli
    }
  }
  return [options, update] as const
}
