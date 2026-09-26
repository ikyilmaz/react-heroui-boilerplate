import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useDebounced } from '@/components/useDebounced'

/* -------------------------------------------------------------------------------------------------
 * useBufferedValue
 *
 * Kontrollü bir alanla onu besleyen dış durum arasına konan tampon. Alan yazılanı hemen gösterir;
 * dış duruma yazma, yazmaya ara verilince (`delay`) olur. Yerel kopya alanın kendi state'inde
 * durduğu için her tuş yalnızca alanı yeniden render eder; dış durumu tutan bileşen (ve onun
 * beslediği pahalı ağaç) duraklama başına bir kez çalışır.
 *
 * Dış değer değişince yerel kopya ona döner ve bekleyen yazma düşer: temizle / sıfırla gibi dış
 * yazımlar yazılmakta olanı ezer. Kendi yazdığımız değerin geri yansıması (`onCommit` sonrası dış
 * değerin aynı değere gelmesi) bundan ayrı tutulur; o arada yazılmış yeni harfler kaybolmaz.
 * ------------------------------------------------------------------------------------------------- */

export interface BufferedValue<T> {
  /** Alanın göstereceği değer. */
  value: T
  /** Yerel değeri yazar; dışarı yazma `delay` sonra olur. Kimliği sabittir. */
  set: (next: T) => void
  /** Bekleyen değeri hemen dışarı yazar; bekleyen yoksa bir şey yapmaz. Kimliği sabittir. */
  flush: () => void
  /** Bekleyen değeri düşürür. Kimliği sabittir. */
  cancel: () => void
}

export interface BufferedOptions {
  /** Bileşen sökülürken bekleyen değer dışarı yazılsın mı? (bkz. `useDebounced`) @default false */
  flushOnUnmount?: boolean
  /**
   * Dış yazımı fark etmek için izlenen kimlik; varsayılan `external`ın kendisi. Aynı değerin
   * yeniden yazılmasının da (zaten boş bir filtreyi temizlemek gibi) alanı sıfırlaması gerekiyorsa
   * her yazımda yenilenen bir nesne verin — DataGrid filtre hücreleri `{ op, value }` dilimini verir.
   */
  syncKey?: unknown
}

export function useBufferedValue<T>(
  external: T,
  onCommit: (value: T) => void,
  delay: number,
  { flushOnUnmount = false, syncKey = external }: BufferedOptions = {},
): BufferedValue<T> {
  const [local, setLocal] = useState(external)
  const localRef = useRef(external)
  /** Yazılıp henüz dışarı verilmemiş bir değer var mı? */
  const dirty = useRef(false)
  /** Son dışarı yazılan değer ve yansımasının hâlâ beklenip beklenmediği. */
  const echo = useRef<{ value: T; pending: boolean } | null>(null)

  const debounced = useDebounced(
    () => {
      if (!dirty.current) return
      dirty.current = false
      echo.current = { value: localRef.current, pending: true }
      onCommit(localRef.current)
    },
    delay,
    { flushOnUnmount },
  )

  /*
    Dış yazım. `useLayoutEffect`: yerel kopya boyamadan önce dış değere döner, ara kare görünmez.
    Kendi yazdığımızın yansımasıysa dokunulmaz — yansıma gelene kadar (zamanlayıcı süresi içinde)
    yazılmış yeni harfler yerinde kalır.
  */
  useLayoutEffect(() => {
    const e = echo.current
    if (e?.pending && Object.is(e.value, external)) {
      e.pending = false
      return
    }
    dirty.current = false
    debounced.cancel()
    localRef.current = external
    setLocal(external)
  }, [external, syncKey, debounced])

  const set = useCallback(
    (next: T) => {
      localRef.current = next
      dirty.current = true
      setLocal(next)
      debounced.run()
    },
    [debounced],
  )

  const flush = useCallback(() => debounced.flush(), [debounced])

  const cancel = useCallback(() => {
    dirty.current = false
    debounced.cancel()
  }, [debounced])

  return { value: local, set, flush, cancel }
}
