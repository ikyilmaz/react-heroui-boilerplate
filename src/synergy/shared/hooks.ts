import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'

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
 * kadar). `--fill-h` değişkenini verir; öğe `lg:h-(--fill-h)` gibi sınıfla kullanır.
 */
export function useFillHeight(bottom = '1.5rem') {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [top, setTop] = useState(0)
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => setTop(el.getBoundingClientRect().top + window.scrollY)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [el])
  return [setEl, { '--fill-h': `calc(100dvh - ${top}px - ${bottom})` } as CSSProperties] as const
}
