import { useCallback, useState, type SetStateAction } from 'react'

/* -------------------------------------------------------------------------------------------------
 * Panel ayarlarının oturum belleği
 *
 * Orijinalde açık panellerin arama, sıralama, tarih aralığı ve ızgara durumu redux'ta durur
 * (wfList panel durumu, `WF_<projectId>_<flowName>` ızgara ayarları); bir talebi açıp geri
 * gelince liste aynı yerde bulunur. Burada aynı davranış bellekteki küçük bir haritayla: anahtar
 * kutu (süreç listesi) ya da kutu + süreç (talep ızgarası). Sayfa yenilenince sıfırlanır.
 * ------------------------------------------------------------------------------------------------- */

const memory = new Map<string, unknown>()

/** `useState` gibi; değer `key` altında saklanır ve bileşen yeniden kurulunca geri gelir. */
export function useRemembered<T>(key: string, initial: () => T): [T, (next: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => (memory.has(key) ? (memory.get(key) as T) : initial()))
  const set = useCallback(
    (next: SetStateAction<T>) => {
      setValue((prev) => {
        const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        memory.set(key, v)
        return v
      })
    },
    [key],
  )
  return [value, set]
}
