import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/** Medya sorgusu eşleşiyor mu; değişince yeniden çizer. */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

/**
 * Bir CSS yarıçapının px değeri. Motion boyut değişiminde köşeyi ölçeğe göre düzeltir (köşe
 * basıklaşmaz), ama yalnızca `style` ile verilen px değerini; tema değişkeni çözülüp okunur, tema
 * paneli değiştirince (<html>'in sınıfı / stili) yeniden.
 */
export function useRadiusPx(css: string) {
  const [px, setPx] = useState<number>()
  useEffect(() => {
    const read = () => {
      const probe = document.createElement('i')
      probe.style.cssText = `position:absolute;visibility:hidden;border-radius:${css}`
      document.body.append(probe)
      setPx(parseFloat(getComputedStyle(probe).borderTopLeftRadius) || 0)
      probe.remove()
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })
    return () => mo.disconnect()
  }, [css])
  return px
}

/** Sayfa (ya da `root` verilirse o kaydırma kabı) `px` kadar aşağı kaydırıldı mı. */
export function useScrolled(px: number, root?: HTMLElement | null) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const target: HTMLElement | Window = root ?? window
    const on = () => setScrolled((root ? root.scrollTop : window.scrollY) > px)
    on()
    target.addEventListener('scroll', on, { passive: true })
    return () => target.removeEventListener('scroll', on)
  }, [px, root])
  return scrolled
}

/**
 * Ekranın kalanını dolduran yükseklik: öğenin sayfadaki yerinden ölçülür (alt boşluk `bottom`
 * kadar); `root` verilirse o kaydırma kabının kalanı. `--fill-h` değişkenini verir; öğe
 * `lg:h-(--fill-h)` gibi sınıfla kullanır.
 */
export function useFillHeight(bottom = '1.5rem', root?: HTMLElement | null) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  // `root` verilirse (kaydırma kabı, ör. form sekmesinin bölmesi) yer ve boy onun içinde ölçülür
  const [box, setBox] = useState<{ top: number; height: number | null }>({ top: 0, height: null })
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => {
      // Gizli form sekmesinde (display: none) kutu yok: son ölçü kalır, görününce yeniden çizilmez
      if (!el.getClientRects().length) return
      const next = root
        ? {
            top: el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop,
            height: root.clientHeight,
          }
        : { top: el.getBoundingClientRect().top + window.scrollY, height: null }
      setBox((b) => (b.top === next.top && b.height === next.height ? b : next))
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = root ? new ResizeObserver(measure) : null
    if (root) ro?.observe(root)
    return () => {
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [el, root])
  const total = box.height === null ? '100dvh' : `${box.height}px`
  // Yalnızca öğe gelince yazılır: form sekmesi gizlenip görününce (`Activity` bağı kopartıp yeniden
  // bağlar) durum değişip yeniden çizim olmasın
  const attach = useCallback((node: HTMLElement | null) => {
    if (node) setEl(node)
  }, [])
  return [
    attach,
    { '--fill-h': `calc(${total} - ${box.top}px - ${bottom})` } as CSSProperties,
  ] as const
}

const HISTORY_MAX_KEY = 'synergy-history-max'

/** Tarayıcı geçmişindeki sıra (react-router her kayda `idx` yazar). */
const historyIndex = () => (window.history.state as { idx?: number } | null)?.idx ?? 0

/**
 * Uygulama içi geri / ileri gidilebilir mi (yalnızca rota geçmişi). Geri: sıra 0'dan büyükse.
 * İleri: tarayıcı ileride kaç kayıt olduğunu söylemez; gidilen en ileri sıra tutulur. Yeni bir
 * yere gidince (PUSH) ilerideki kayıtlar silindiği için en ileri sıra şimdiki olur. Sayfa
 * yenilenince ilerideki kayıtlar durduğu için değer oturumda (`sessionStorage`) saklanır.
 */
export function useRouteHistory() {
  const { key } = useLocation()
  const type = useNavigationType()
  const idx = historyIndex()
  const [max, setMax] = useState(() => {
    try {
      return Math.max(idx, Number(sessionStorage.getItem(HISTORY_MAX_KEY) ?? 0))
    } catch {
      return idx
    }
  })
  useEffect(() => {
    setMax((m) => {
      const next = type === 'PUSH' ? idx : Math.max(m, idx)
      try {
        sessionStorage.setItem(HISTORY_MAX_KEY, String(next))
      } catch {
        // Depolama kapalıysa yalnızca bu oturumda
      }
      return next
    })
    // Her gezinmede (konum anahtarı değişince) yeniden hesaplanır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { canBack: idx > 0, canForward: idx < max }
}
