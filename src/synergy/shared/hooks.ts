import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { cancelFrame, frame } from 'framer-motion'

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
 * (`useTabScroller`); yoksa (çalışma alanının dışında) ekranın genişliği. Ölçüm boyut gözlemcisinde
 * (düzen hazırken, boyamadan önce): karar ekrandakinden (başta ekran genişliğinin sorgusu) farklıysa
 * hemen çizilir (yanlış yerleşim bir kare görünmez), aynıysa sayfa yeniden çizilmez. Gizli bölmede
 * son değer kalır.
 */
export function usePaneMin(rem: number, pane: HTMLElement | null) {
  const viewport = useMediaQuery(`(min-width: ${rem}rem)`)
  const [match, setMatch] = useState<boolean | null>(null)
  const shown = pane && match !== null ? match : viewport
  const latest = useRef(shown)
  useLayoutEffect(() => {
    latest.current = shown
  })
  useEffect(() => {
    if (!pane) return
    const ro = new ResizeObserver(() => {
      if (!pane.getClientRects().length) return
      const px = rem * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16)
      const next = pane.clientWidth >= px
      if (next !== latest.current) flushSync(() => setMatch(next))
    })
    ro.observe(pane)
    return () => ro.disconnect()
  }, [pane, rem])
  return shown
}

/** Çözülmüş yarıçaplar (px), CSS ifadesine göre: bütün kancalar ortak okur. */
const radii = new Map<string, number>()
const radiusListeners = new Set<() => void>()
let radiusObserver: MutationObserver | null = null

/** Yarıçapın px değeri: görünmez bir öğede çözülür (stili zorlar; yalnızca ilk kez ve tema değişince). */
function readRadius(css: string) {
  const probe = document.createElement('i')
  probe.style.cssText = `position:absolute;visibility:hidden;border-radius:${css}`
  document.body.append(probe)
  const px = parseFloat(getComputedStyle(probe).borderTopLeftRadius) || 0
  probe.remove()
  return px
}

/** Tema değişince (<html>'in sınıfı / stili) bütün yarıçaplar bir kez yeniden okunur. */
function watchRadii(listener: () => void) {
  radiusListeners.add(listener)
  if (!radiusObserver) {
    radiusObserver = new MutationObserver(() => {
      for (const css of radii.keys()) radii.set(css, readRadius(css))
      radiusListeners.forEach((l) => l())
    })
    radiusObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })
  }
  return () => {
    radiusListeners.delete(listener)
    if (radiusListeners.size) return
    // İzleyen kalmadı: önbellek de bırakılır (izlenmezken tema değişebilir)
    radiusObserver?.disconnect()
    radiusObserver = null
    radii.clear()
  }
}

/**
 * Bir CSS yarıçapının px değeri. Motion boyut değişiminde köşeyi ölçeğe göre düzeltir (köşe
 * basıklaşmaz), ama yalnızca `style` ile verilen px değerini; tema değişkeni çözülüp okunur, tema
 * paneli değiştirince (<html>'in sınıfı / stili) yeniden. Değerler ortak: yeni takılan parça (ör.
 * açılan form) önbellekteki değerle çizilir, ölçmez ve yeniden çizilmez.
 */
export function useRadiusPx(css: string) {
  const [px, setPx] = useState(() => radii.get(css))
  useEffect(() => {
    const sync = () => {
      let value = radii.get(css)
      if (value === undefined) radii.set(css, (value = readRadius(css)))
      setPx(value)
    }
    sync()
    return watchRadii(sync)
  }, [css])
  return px
}

/** Sayfa (ya da `root` verilirse o kaydırma kabı) `px` kadar aşağı kaydırıldı mı. */
export function useScrolled(px: number, root?: HTMLElement | null) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const target: HTMLElement | Window = root ?? window
    const on = () => setScrolled((root ? root.scrollTop : window.scrollY) > px)
    // İlk okuma karenin okuma adımında: takılır takılmaz okumak (ör. form iskeletten çıkınca) düzeni
    // zorlardı
    frame.read(on)
    target.addEventListener('scroll', on, { passive: true })
    return () => {
      cancelFrame(on)
      target.removeEventListener('scroll', on)
    }
  }, [px, root])
  return scrolled
}

/**
 * Ekranın kalanını dolduran yükseklik: öğenin sayfadaki yerinden ölçülür (alt boşluk `bottom`
 * kadar); `root` verilirse o kaydırma kabının kalanı. `--fill-h` değişkenini öğeye doğrudan yazar
 * (React çizmez); öğe `@4xl:h-(--fill-h)` gibi sınıfla kullanır. Bağlayıcıyı öğenin `ref`'ine verin.
 * Ölçüm boyut gözlemcisinde (düzen hazırken, boyamadan önce): form iskeletten çıkınca ne düzeni
 * zorlar ne de formu yeniden çizer. Gizli bölmede (kutusu yok) son değer kalır.
 */
export function useFillHeight(bottom = '1.5rem', root?: HTMLElement | null) {
  return useCallback(
    (el: HTMLElement | null) => {
      if (!el) return
      const measure = () => {
        if (!el.getClientRects().length) return
        const top = root
          ? el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
          : el.getBoundingClientRect().top + window.scrollY
        const total = root ? `${root.clientHeight}px` : '100dvh'
        el.style.setProperty('--fill-h', `calc(${total} - ${top}px - ${bottom})`)
      }
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      if (root) ro.observe(root)
      window.addEventListener('resize', measure)
      return () => {
        ro.disconnect()
        window.removeEventListener('resize', measure)
      }
    },
    [bottom, root],
  )
}
