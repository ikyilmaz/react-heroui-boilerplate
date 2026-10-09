/* -------------------------------------------------------------------------------------------------
 * Kaydırma çubuğunun boyu: `@rc-component/util`'in `getScrollBarSize` modülünün yerine
 * (`vite.config.ts` › `resolve.alias`). Özgün modül antd tablosunun her takılışında (ve açılır
 * pencerenin kaydırma kilidinde) ölçüyordu: belgeye bir `<style>` ekleyip ölçme öğesini gövdeye
 * takıyor, okuyor, ikisini de kaldırıyordu. Stil sayfası eklenip çıkınca bütün sayfanın stili ve
 * düzeni yeniden hesaplanır: her yeni sekmede (liste, İK, form) 10–25 ms zorunlu düzen.
 *
 * Uygulamada her öğenin çubuğu aynı (`src/index.css`: `scrollbar-width: thin`): bir kez ölçülür,
 * hep o döner. Sabit başlıklı / yapışkan tablo (çubuğun payını isteyen) kullanılmıyor.
 * ------------------------------------------------------------------------------------------------- */

interface ScrollBarSize {
  width: number
  height: number
}

let cached: ScrollBarSize | undefined

/** Bir kez: sayfanın çubuk stiliyle (ince) kaydırılan bir öğe ölçülür. */
function measure(): ScrollBarSize {
  const el = document.createElement('div')
  el.style.cssText =
    'position:absolute;top:0;left:0;width:100px;height:100px;overflow:scroll;visibility:hidden;pointer-events:none'
  document.body.appendChild(el)
  const size = { width: el.offsetWidth - el.clientWidth, height: el.offsetHeight - el.clientHeight }
  el.remove()
  return size
}

// Açılıştan sonra boşta ölçülür: ilk tablo (yeni bir sekmenin açılışında) ölçmeye düşmesin
if (typeof window !== 'undefined') {
  const early = () => {
    cached ??= measure()
  }
  if ('requestIdleCallback' in window) requestIdleCallback(early, { timeout: 2000 })
  else setTimeout(early, 300)
}

export default function getScrollBarSize(fresh?: boolean): number {
  if (typeof document === 'undefined') return 0
  if (fresh || cached === undefined) cached = measure()
  return cached.width
}

export function getTargetScrollBarSize(target: HTMLElement): ScrollBarSize {
  if (typeof document === 'undefined' || !(target instanceof Element)) return { width: 0, height: 0 }
  cached ??= measure()
  return cached
}
