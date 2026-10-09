import {
  Activity,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import {
  AnimatePresence,
  animate,
  frame,
  useMotionValue,
  usePresence,
  type MotionStyle,
} from 'framer-motion'
import { Flex } from 'antd'
import { cn, MotionFlex } from '@/synergy/ant/ui'
import { clampRatio, SPLIT_MAX, SPLIT_MIN } from '@/synergy/shared/workspace'
import { PaneContext } from '@/synergy/tabs/context'
import { TRAVEL, type TabMotion } from '@/synergy/tabs/motion'

/* -------------------------------------------------------------------------------------------------
 * Çalışma alanının bölmeleri (Workspace.tsx kurar): her ekran bir bölme. Bölmeler DOM'da hiç yer
 * değiştirmez ve ekran başına bir kez çizilir; sekme geçişi yalnızca görünürlüğü değiştirir.
 *
 * Her bölmenin kabın içinde kendi sabit kutusu var (mutlak konum) ve kendi içinde kayar: tek
 * ekranlı sekmenin ekranı kabın tamamında, yan yana sekmenin ekranları solda / sağda (kendi
 * paylarıyla).
 * Gizli bölme `content-visibility: hidden`: içi atlanır (çizilmez, isabet testine girmez, odak ve
 * ekran okuyucu giremez) ama işleme durumu (stil, düzen, kaydırma yeri) korunur; kutusu sabit
 * olduğundan (mutlak, boyu içeriğinden değil) boyut sınırlaması bir şey değiştirmez. Açıp kapamak
 * yalnızca bölmenin kendi stilini değiştirir; `visibility`, `pointer-events` ya da `inert` bütün alt
 * ağacın stilini yeniden hesaplatırdı (form başına 5–20 ms), `display: none` görününce yeniden
 * dizerdi. İçindeki gözlemciler sıfır boyla tetiklenmez.
 *
 * Hareket: yalnızca dönüşüm ve saydamlık (MotionValue, React çizmez). Form (talep, menü uygulaması)
 * sunucudan gelene kadar iskelet (`LOAD_MS`); liste ve sayfalar hemen.
 * - Sekme geçişi: yeni bölme sekmenin yönünden 30px kayıp solarak gelir, eski bölme yerinde
 *   söner (ikisi aynı kutuda üst üste; eskisi altta), bitince gizlenir.
 * - Yan bölme açılınca (aynı sekmede) kabın kenarından iterek girer, açan form aynı karede Motion
 *   düzen animasyonuyla daralır; kapanınca kendi kenarına itilerek çıkar. Tek görünen form
 *   kapanınca yerinde söner.
 * - Düzen animasyonu (`layout`) yalnızca bölme hem önce hem sonra görünürken ölçülür
 *   (`layoutDependency={moved}`); içerik `layout="position"` (ölçek geri alınır).
 * ------------------------------------------------------------------------------------------------- */

/** Bölmenin yeri: kabın tamamı, sol, sağ. */
export type PaneSlot = 'single' | 'left' | 'right'

/** Yeni görünen bölmenin gelişi: `push` aynı sekmede açılan yan bölme, değilse sekme geçişi. */
export interface Entered {
  n: number
  push: boolean
}

/** Formun sunucudan gelişi (maket): yeni giren form bu süre iskelet olarak görünür. */
export const LOAD_MS = 1000

/** Bölmelerin kutusu (kabın 0.75rem iç payı, aradaki bölücü 0.75rem); yan yanada genişlik `paneWidth`. */
const BOX: Record<PaneSlot, string> = {
  single: 'inset-3',
  left: 'inset-y-3 start-3',
  right: 'inset-y-3 end-3',
}

/**
 * Yan yana bölmenin genişliği (satır içi stil: yalnızca o öğe geçersizlenir; kalıtılan bir CSS
 * değişkeni kabın bütün alt ağacının stilini yeniden hesaplatırdı). `share`: sol payı (0–1).
 */
const paneWidth = (slot: PaneSlot, share: number) =>
  slot === 'single'
    ? undefined
    : `calc((100% - 2.25rem) * ${slot === 'left' ? share : 1 - share})`

/** Bölücünün yeri (sol bölmenin bittiği yer). */
const dividerLeft = (share: number) => `calc(0.75rem + (100% - 2.25rem) * ${share})`

/**
 * Başlık kartındaki süreç adı ve durum çipi (`data-tab-cue`) bölme gelirken sayaçlardaki gibi
 * aşağıdan kısa kayar (`data-entering` gelişin süresince).
 */
const CUE =
  '[&[data-entering]_[data-tab-cue]]:animate-[tick-up_calc(0.18s*var(--motion-time,1))_cubic-bezier(0.22,1,0.36,1)_both]'

export const Pane = memo(function Pane({
  ref,
  id,
  visible,
  slot,
  share,
  moved,
  entered,
  dir,
  paired,
  slide,
  radius,
  motion,
  placeholder,
  onFocus,
  children,
}: {
  ref?: Ref<HTMLElement>
  /** Bölmenin anahtarı (ekranın). */
  id: string
  /** Seçili sekmenin ekranı. */
  visible: boolean
  /** Kutusu: görünürken bulunduğu, gizliyken sekmesinin yeri (gizliyken de kutusu değişmez). */
  slot: PaneSlot
  /** Yan yana sekmenin sol payı (0–1; bölücü sürüklenirken doğrudan genişliğe yazılır). */
  share: number
  /** Bölmenin son ölçüldüğü adım (değişince Motion eski yerinden götürür). */
  moved: number
  /** Son görünüşü ve gelişi. */
  entered?: Entered
  /** Değişimin yönü: 1 sağdan, -1 soldan gelir. */
  dir: 1 | -1
  /** Yan yana iki bölmeden biri: kapanınca kendi kenarına itilerek çıkar. */
  paired: boolean
  /** Kayarak gelir (geniş ekran; telefonda yalnızca solma). */
  slide: boolean
  /** Yaprağın köşesi (px; Motion ölçeğe göre düzeltir). */
  radius?: number
  motion: TabMotion
  /** Form gelene kadar duran iskelet (sabit öğe); yoksa içerik hemen. */
  placeholder?: ReactNode
  /** Bölmeye tıklanınca / odaklanılınca (yan yanayken; sabit işlev). */
  onFocus?: (id: string) => void
  /** Form (sabit öğe: bölme yeniden çizilse de form çizilmez). */
  children: ReactNode
}) {
  const { level } = motion
  // Kaydırma kabı bağlam için durumda (yalnızca öğe gelince yazılır), hareket için ref'te
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const node = useRef<HTMLElement | null>(null)
  const attach = useCallback(
    (el: HTMLElement | null) => {
      node.current = el
      if (el) setScroller(el)
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )
  const x = useMotionValue(0)
  const opacity = useMotionValue(1)

  // Görünürken ayrılan bölme yerinde (eski kutusunda) söner; bitince gizlenir
  const [seen, setSeen] = useState({ visible, slot })
  const [leaving, setLeaving] = useState<PaneSlot | null>(null)
  if (seen.visible !== visible || (visible && seen.slot !== slot)) {
    setSeen({ visible, slot })
    setLeaving(!visible && seen.visible && level !== 'off' ? seen.slot : null)
  }
  useLayoutEffect(() => {
    if (!leaving) return
    const run = animate(opacity, 0, motion.contentOut)
    void run.then(() => setLeaving(null))
    return () => run.stop()
  }, [leaving, opacity, motion])

  // Gelir: sekme geçişinde yönden kısa kayıp solarak, yan bölme kabın kenarından iterek. Hareket
  // Motion'ın kare döngüsünde (`frame.update`) başlar, düzen animasyonuyla aynı karede: kenarı
  // daralan formun kenarıyla birlikte ilerler
  const played = useRef<number | undefined>(undefined)
  useLayoutEffect(() => {
    const el = node.current
    if (!entered || !el || played.current === entered.n) return
    played.current = entered.n
    if (level === 'off') {
      x.jump(0)
      opacity.jump(1)
      return
    }
    el.setAttribute('data-entering', '')
    const done = () => el.removeAttribute('data-entering')
    if (entered.push && level === 'full') {
      const box = el.offsetParent as HTMLElement | null
      x.jump((box?.clientWidth ?? el.offsetLeft) - el.offsetLeft)
      opacity.jump(1)
      frame.update(() => void animate(x, 0, motion.pane).then(done))
      return
    }
    x.jump(slide && level === 'full' ? dir * TRAVEL : 0)
    opacity.jump(0)
    void animate(x, 0, motion.contentIn)
    void animate(opacity, 1, motion.contentIn).then(done)
  }, [entered, dir, slide, level, motion, x, opacity])

  // Kapanınca (`AnimatePresence`): yan yanaysa kendi kenarına itilir, değilse yerinde söner; bitince
  // kaldırılır. Çıkış bir kez başlar (çıkan bölme yeniden çizilse de)
  const [present, safeToRemove] = usePresence()
  const remove = useRef(safeToRemove)
  const exiting = useRef(false)
  useLayoutEffect(() => {
    remove.current = safeToRemove
    if (present) {
      exiting.current = false
      return
    }
    if (exiting.current) return
    exiting.current = true
    const done = () => remove.current?.()
    const el = node.current
    if (!el || level === 'off') {
      frame.postRender(done)
      return
    }
    if (paired && level === 'full') {
      const box = el.offsetParent as HTMLElement | null
      const to = slot === 'right' ? (box?.clientWidth ?? 0) - el.offsetLeft : -el.offsetLeft - el.offsetWidth
      frame.update(() => void animate(x, to, motion.pane).then(done))
    } else void animate(opacity, 0, motion.fade).then(done)
  }, [present, safeToRemove, paired, slot, level, motion, x, opacity])

  // Form sunucudan gelene kadar iskelet (bölme gizliyken de sürer). Form geçişle (`startTransition`)
  // çizilir: React işi parçalara böler, uzun görev olmaz. İskeletsiz bölme hemen
  const waits = placeholder != null
  const [loaded, setLoaded] = useState(!waits)
  useEffect(() => {
    if (!waits) return
    const t = setTimeout(() => startTransition(() => setLoaded(true)), LOAD_MS)
    return () => clearTimeout(t)
  }, [waits])

  const shown = visible || leaving !== null
  const place = leaving ?? slot
  return (
    <MotionFlex
      ref={attach}
      id={`screen-pane-${id}`}
      role="tabpanel"
      aria-labelledby={`screen-tab-${id}`}
      layout
      layoutScroll
      layoutDependency={moved}
      transition={{ layout: motion.pane }}
      style={
        {
          x,
          opacity,
          width: paneWidth(place, share),
          ...(radius !== undefined && { borderRadius: radius }),
        } as MotionStyle
      }
      onPointerDownCapture={visible && onFocus ? () => onFocus(id) : undefined}
      onFocusCapture={visible && onFocus ? () => onFocus(id) : undefined}
      aria-busy={!loaded || undefined}
      className={cn(
        '@container min-w-0 rounded-2xl',
        // Kendi kutusu, kendi içinde kayar (yan kaydırma yok: hareket boyunca içerik yaprağı taşar);
        // yapışkan öğeler yaprağın tepesine yapışır. Zemini şeffaf: kartların arasında kabın rengi
        // görünür
        'absolute block min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [--chrome-top:0px]',
        BOX[place],
        // Görünen üstte, sönen altında (yeni bölme aynı kutuda üstünü örter, imleci o alır); gizlinin
        // içi atlanır (`content-visibility`: çizilmez, odaklanmaz, durumu ve kaydırma yeri kalır)
        visible ? 'z-1' : shown ? 'z-0' : 'z-0 [content-visibility:hidden]',
        CUE,
      )}
    >
      <PaneContext value={scroller}>
        {/* `relative`: iskelet solarken formun üstünde durur (`popLayout`) */}
        <MotionFlex
          layout="position"
          layoutDependency={moved}
          transition={{ layout: motion.pane }}
          className="relative block p-3"
        >
          {/* İskelet: form gelince söner (`popLayout`: formun üstünde kalır) */}
          <AnimatePresence initial={false} mode="popLayout">
            {!loaded && (
              <MotionFlex
                key="placeholder"
                exit={{ opacity: 0, transition: motion.reveal }}
                className="block"
              >
                {placeholder}
              </MotionFlex>
            )}
          </AnimatePresence>
          {/*
           * Form iskeletin arkasında, boşta önceden çizilir (`Activity` gizli: React düşük öncelikle
           * çizer, etkileri kurmaz); süre dolunca yalnızca görünür olur ve bir kez belirir. Kurulumun
           * işi böylece tek bir uzun göreve yığılmaz. Animasyon kapalıyken doğrudan görünür
           */}
          <Activity mode={loaded ? 'visible' : 'hidden'}>
            <MotionFlex
              // İskeletsiz bölmede belirme yok (bölmenin kendi gelişi yeter)
              initial={!waits || level === 'off' ? false : { opacity: 0, y: level === 'full' ? 8 : 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={motion.reveal}
              className="block"
            >
              {children}
            </MotionFlex>
          </Activity>
        </MotionFlex>
      </PaneContext>
    </MotionFlex>
  )
})

/**
 * Yan yana sekmenin bölücüsü: sürüklerken pay doğrudan iki bölmenin genişliğine ve bölücünün yerine
 * yazılır (React çizmez, Motion devreye girmez), bırakınca kaydedilir. Oklar küçük adım (Shift büyük), Home / End uçlar,
 * Enter ve çift tık panel boyutunun payı; bu değişimlerde bölmelerle birlikte yeni yerine kayar.
 */
export function Divider({
  ratio,
  base,
  panes,
  motion,
  onRatio,
  onNudge,
}: {
  /** Sol payı (%). */
  ratio: number
  /** Yan yana iki bölmenin anahtarı (sürüklerken genişlikleri doğrudan yazılır). */
  panes: [string, string]
  /** Panel boyutunun payı (%). */
  base: number
  motion: TabMotion
  onRatio: (value: number) => void
  onNudge: (delta: number) => void
}) {
  const sep = useRef<HTMLElement | null>(null)
  const drag = useRef<{
    left: number
    width: number
    ratio: number
    host: HTMLElement
    sides: (HTMLElement | null)[]
  } | null>(null)
  // Pay değişince (klavye, çift tık) bölmelerle aynı eğride yeni yerine kayar: eski yerinden
  // başlayan dönüşüm (Motion düzen düğümü değil: takılınca ölçülmez)
  const x = useMotionValue(0)
  const prev = useRef(ratio)
  useLayoutEffect(() => {
    const from = prev.current
    prev.current = ratio
    const el = sep.current
    const host = el?.parentElement
    if (from === ratio || !el || !host || drag.current || motion.level === 'off') return
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    x.jump(((from - ratio) / 100) * (host.clientWidth - 2.25 * rem))
    frame.update(() => void animate(x, 0, motion.pane))
  }, [ratio, motion, x])
  const onDown = (e: PointerEvent<HTMLElement>) => {
    const host = e.currentTarget.parentElement
    if (!host || e.button !== 0) return
    e.preventDefault()
    // Pay, bölmelerin toplam genişliğine göre (iki yandaki 0.75rem dolgu ve bölücü hariç); imleç
    // bölücünün ortasında kalır
    const rect = host.getBoundingClientRect()
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    drag.current = {
      left: rect.left + 1.125 * rem,
      width: rect.width - 2.25 * rem,
      ratio,
      host,
      sides: panes.map((key) => document.getElementById(`screen-pane-${key}`)),
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    // Sürüklerken imleç her yerde bölücünün; bölmeler imleci almaz (React çizmez)
    host.setAttribute('data-resizing', '')
  }
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    d.ratio = clampRatio(((e.clientX - d.left) / d.width) * 100)
    const share = d.ratio / 100
    const [l, r] = d.sides
    if (l) l.style.width = paneWidth('left', share) ?? ''
    if (r) r.style.width = paneWidth('right', share) ?? ''
    e.currentTarget.style.left = dividerLeft(share)
    sep.current?.setAttribute('aria-valuenow', String(Math.round(d.ratio)))
  }
  const onUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    d.host.removeAttribute('data-resizing')
    // Sürüklenen pay zaten yerinde: kaydedilince kaymaz
    prev.current = d.ratio
    onRatio(d.ratio)
  }
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    const by = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') onNudge(e.key === 'ArrowLeft' ? -by : by)
    else if (e.key === 'Home') onRatio(SPLIT_MIN)
    else if (e.key === 'End') onRatio(SPLIT_MAX)
    else if (e.key === 'Enter') onRatio(base)
    else return
    e.preventDefault()
  }
  return (
    <MotionFlex
      ref={sep}
      role="separator"
      aria-orientation="vertical"
      aria-label="Bölücü"
      aria-valuemin={SPLIT_MIN}
      aria-valuemax={SPLIT_MAX}
      aria-valuenow={Math.round(ratio)}
      tabIndex={0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
      // Çift tık: panel boyutunun payına döner
      onDoubleClick={() => onRatio(base)}
      style={{ left: dividerLeft(ratio / 100), x }}
      className="group/divider absolute inset-y-3 z-2 flex w-3 animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out] cursor-col-resize touch-none justify-center py-6 outline-none"
    >
      {/* İnce çizgi; üstüne gelince, sürüklerken ve klavye odağında kalınlaşıp renklenir */}
      <Flex
        aria-hidden
        className={cn(
          'block w-px rounded-full bg-border transition-[width,background-color] duration-[calc(150ms*var(--motion-time,1))]',
          'group-hover/divider:w-[3px] group-hover/divider:bg-accent/40 group-focus-visible/divider:w-[3px] group-focus-visible/divider:bg-accent',
          'group-data-[resizing]/panes:w-[3px] group-data-[resizing]/panes:bg-accent!',
        )}
      />
    </MotionFlex>
  )
}
