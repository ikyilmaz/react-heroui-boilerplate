import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
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
