import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'

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
 * Bölme en az `rem` genişlikte mi: sayfanın bölmeye göre kap sorgularıyla (`@6xl` = 72rem…) aynı
 * eşik, böylece yerleşim ve davranış birlikte değişir. `pane`: ekranın kaydırma kabı
 * (`useTabScroller`); yoksa (çalışma alanının dışında) ekranın genişliği. Gizli bölmede son değer kalır.
 */
export function usePaneMin(rem: number, pane: HTMLElement | null) {
  const viewport = useMediaQuery(`(min-width: ${rem}rem)`)
  const [match, setMatch] = useState<boolean | null>(null)
  useLayoutEffect(() => {
    if (!pane) return
    const measure = () => {
      if (!pane.getClientRects().length) return
      const px = rem * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16)
      setMatch(pane.clientWidth >= px)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(pane)
    return () => ro.disconnect()
  }, [pane, rem])
  return pane && match !== null ? match : viewport
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
