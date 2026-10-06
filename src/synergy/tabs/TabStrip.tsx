import {
  Children,
  createContext,
  memo,
  startTransition,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { Link } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { X } from 'lucide-react'
import {
  AnimatePresence,
  animate,
  frame,
  useIsPresent,
  useMotionValue,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from 'framer-motion'
import { Button, Dropdown, Flex, Typography, type ButtonProps, type MenuProps } from 'antd'
import { cn, IC, MotionFlex, Tip } from '@/synergy/ant/ui'
import { useRadiusPx } from '@/synergy/shared/hooks'
import { useTabMotion, type TabMotion } from '@/synergy/tabs/motion'
import {
  CAP_END,
  CAP_START,
  GROUP_DOT,
  GROUP_LINE,
  PILL,
  PILL_TONED,
  SEPARATOR,
  SHEET_MIDDLE,
  STRIP_VARS,
  TAB_RADIUS,
} from '@/synergy/tabs/shape'
import {
  dragThreshold,
  freeze,
  insideStrip,
  isCompact,
  swapTarget,
  topRadius,
  TOUCH_RELEASE_MS,
  type Span,
} from '@/synergy/tabs/widths'

/* -------------------------------------------------------------------------------------------------
 * Sekme şeridi: uygulamadaki bütün sekme yapılarının ortak gövdesi (form sekmeleri, iş akışı
 * kutuları, Başlangıç kategorileri). Görünüş Google Chrome'un şeridi: seçili olmayan sekmeler
 * zeminsiz, aralarında ince çizgi, üzerine gelince hap; seçili sekme kaba kaynaşan bir yaprak
 * (içbükey kavislerle), sekmeden sekmeye kayar. Renkli grupta grubun noktası, alt çizgisi ve
 * seçili yaprağın çerçevesi grubun renginde; çizgi seçili sekmenin çevresinden dolaşır.
 *
 * Yapı: `TabStrip` › `TabGroup` › `Tab` (yuva) › içerik (`TabButton`, `TabClose` ya da tüketicinin
 * kendi düğmesi). Tüketici sekmeyi ve grubu kendisi kurar (sekmenin içi üç yerde farklı: yan yana
 * sekmede iki form, ajandada bağlantı, kategoride sayı).
 *
 * Başarım: sekme geçişinde hiçbir şey ölçülmez. Yaprak üç parça ve yalnızca dönüşümle kayar
 * (MotionValue, React çizmez); hedefi sekmelerin önbellekteki konumu. Konumlar düzen temizken
 * okunur: ResizeObserver geri çağrısında ve yapı (`layoutKey`) değişince. Sekmeler Motion'ın düzen
 * animasyonuyla (`layout="position"`) yalnızca yapı değişince ölçülür; sürükleme elle (Motion
 * `drag` her çizimde ölçtürür).
 *
 * Genişlik (`sizing="chrome"`): sekmeler eşit paydan büyür, doğal genişlikte durur; daralınca
 * seçili sekme en az 9rem kalır, diğerleri ikona iner (ad ipucunda, kapatma gizli); o da sığmazsa
 * şerit kayar. Fareyle art arda kapatırken genişlikler donar (`widths.ts`).
 * ------------------------------------------------------------------------------------------------- */

export type StripSizing = 'chrome' | 'content' | 'fill'

/** Sekmenin satıra göre yeri (`x`), üst öğesine göre yeri (`px`) ve genişliği. */
interface Slot extends Span {
  px: number
}

interface DragSource {
  /** Sekmenin anahtarı ya da `group:<anahtar>`. */
  key: string
  el: HTMLElement
  mv: MotionValue<number>
  /** Sürüklenenle aynı sıradaki kardeşlerin anahtarları (DOM sırası). */
  siblings: () => string[]
  /** Bu sıranın önüne geçilmez (grubun kök sekmesi). */
  min: number
  onMove: (to: number) => void
  /** Seçili sekme sürüklenenin içinde: yaprak da birlikte gelir. */
  carries: boolean
}

interface DragSession extends DragSource {
  id: number
  /** Şeridin ekrandaki yeri (kenara yaklaşınca kaydırmak için; başta okunur). */
  rect: DOMRect
  startX: number
  scroll0: number
  threshold: number
  started: boolean
  /** Yeni sıra çizilene kadar ikinci kez taşınmaz. */
  busy: boolean
  /** Öğenin yuvasının yeri; yer değiştirince kayan yuva kadar telafi edilir. */
  base: number
  shift: number
}

interface StripApi {
  sizing: StripSizing
  motion: TabMotion
  register: (key: string, el: HTMLElement | null) => void
  slot: (key: string) => Slot | undefined
  /** Kapatma düğmesine basıldı (genişlik donması): sekme ya da bütün grubu kalkar. */
  closing: (el: HTMLElement, pointer: string, removes: 'tab' | 'group') => void
  dragStart: (e: ReactPointerEvent<HTMLElement>, source: DragSource) => void
}

const StripContext = createContext<StripApi | null>(null)
/** Şeridin düzen imzası (donma, daralmışken seçim) ve sürüklenen öğe: geçişte değişmez. */
const LayoutContext = createContext<{ dep: string; dragging: string | null }>({
  dep: '',
  dragging: null,
})

function useStrip() {
  const api = useContext(StripContext)
  if (!api) throw new Error('TabStrip dışında')
  return api
}

/**
 * Öğenin satıra göre yeri, kesirli (sekmeler esnek kutuda kesirli genişlikte; `offsetLeft` her
 * basamakta yuvarlar). Motion'ın sürmekte olan kaydırması (sürükleme, düzen animasyonu) çıkarılır:
 * öğenin düzendeki yeri. `px`: üst öğesine göre (çıkarken mutlak konum için).
 */
function slotOf(el: HTMLElement, root: HTMLElement, rootLeft: number): Slot {
  const rect = el.getBoundingClientRect()
  let x = rect.left - rootLeft
  for (let n: HTMLElement | null = el; n && n !== root; n = n.parentElement)
    if (n.style.transform && n.style.transform !== 'none')
      x -= new DOMMatrixReadOnly(getComputedStyle(n).transform).e
  return { x, w: rect.width, px: el.offsetLeft }
}

/** Satırın genişlik davranışı. */
const ROW = {
  chrome: 'w-full',
  content: 'w-max',
  fill: 'w-full',
} as const

export function TabStrip({
  label,
  nav = false,
  selected,
  sizing = 'chrome',
  sheet,
  layoutKey = '',
  inset,
  onDelete,
  end,
  className,
  children,
}: {
  /** Şeridin adı (`aria-label`). */
  label: string
  /** Bağlantı sekmeleri (gezinme): `role="navigation"`, ok tuşları yok. */
  nav?: boolean
  /** Seçili sekmenin anahtarı (yaprak onda); yoksa yaprak yok. */
  selected?: string
  sizing?: StripSizing
  /** Yaprağın görünüşü (`shape.ts`: `SHEET`, `SHEET_RING` + grup rengi, `SHEET_ON_SURFACE`). */
  sheet: string
  /** Sekmelerin yapısı (sıra, gruplar, yan yana): değişince sekmeler ölçülür ve kayar. */
  layoutKey?: string
  /** Satırın iç boşluğu: soldan kabın köşesi + kavis (yaprağın kavsi kabın düz kenarına otursun). */
  inset: string
  /** Delete tuşu: odaktaki sekmeyi kapatır. */
  onDelete?: (tab: HTMLElement) => void
  /** Şeridin sonunda, kaymayan alan (ör. yan yana sekmenin düğmeleri). */
  end?: ReactNode
  /** Kapsayıcının sınıfı (sekme boyu `--tab-h`, renk değişkenleri). */
  className?: string
  /** `TabGroup` öğeleri. */
  children: ReactNode
}) {
  const motion = useTabMotion()
  const radius = useRadiusPx(TAB_RADIUS)
  const R = radius === undefined ? undefined : Math.round(radius)
  const scroller = useRef<HTMLElement | null>(null)
  const row = useRef<HTMLElement | null>(null)
  const sheetEl = useRef<HTMLElement | null>(null)
  // Kayıtlı sekmeler ve gruplar (`group:<anahtar>`), satıra göre yerleri
  const [tabs] = useState(() => new Map<string, HTMLElement>())
  const [groups] = useState(() => new Map<string, HTMLElement>())
  const [slots] = useState(() => new Map<string, Slot>())
  // Olay işleyicileri ve gözlemci son değerleri okur
  const latest = useRef({ selected, sizing, motion, R, tight: false })
  useLayoutEffect(() => {
    latest.current = { ...latest.current, selected, sizing, motion, R }
  })

  /* --- Yaprak: üç parça, yalnızca dönüşüm (MotionValue) ---------------------------------------- */
  const sx = useMotionValue(0)
  const sw = useMotionValue(0)
  const sr = useMotionValue(R ?? 0)
  const shown = useMotionValue(0)
  // Orta parça kapakların altına bir aygıt pikseli taşar: birleşim yerinde kenar yumuşatmasından
  // kalan en ince aralık da kapanır (kapak düz kenarıyla üstünü örter)
  const px = 1 / (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)
  const midX = useTransform(() => sx.get() + sr.get() - px)
  const midScale = useTransform(() => Math.max(0, sw.get() - 2 * sr.get() + 2 * px) / 100)
  const endX = useTransform(() => sx.get() + sw.get())
  /** Yaprağın oturduğu sekme ve son hedefi. */
  const placed = useRef<string | undefined>(undefined)
  const target = useRef<{ x: number; w: number } | null>(null)
  /**
   * Yaprak katmanının sayfadaki yeri (düzen temizken okunur: gözlemcide, şerit kayınca). Hedef aygıt
   * piksellerine oturtulur: katman kesirli bir yerde dururken parçaların kenarları pikselin ortasına
   * düşer, yan yana iki kenar arasında ince çizgi kalırdı.
   */
  const origin = useRef(0)
  /** Sekmenin kenarları aygıt piksellerine oturtulur (sol ve sağ ayrı ayrı). */
  const snap = useCallback((s: Span) => {
    const dpr = window.devicePixelRatio || 1
    const o = origin.current
    const left = Math.round((s.x + o) * dpr) / dpr - o
    const right = Math.round((s.x + s.w + o) * dpr) / dpr - o
    return { x: left, w: right - left }
  }, [])
  const drag = useRef<DragSession | null>(null)

  /** Bütün sekmelerin yeri (düzen temizken ucuz: gözlemci geri çağrısında, yapı değişince). */
  const readSlots = useCallback(() => {
    const r = row.current
    if (!r) return
    // Satırın kendi kaydırması yok (şerit kabı kayar, satır onun içinde)
    const left = r.getBoundingClientRect().left
    for (const [key, el] of tabs) slots.set(key, slotOf(el, r, left))
    for (const [key, el] of groups) slots.set(key, slotOf(el, r, left))
  }, [tabs, groups, slots])

  /** Yaprağı sekmenin yerine götürür: kayarak (`slide` geçiş, `shift` yapı) ya da anında. */
  const moveSheet = useCallback(
    (s: Slot, how: 'slide' | 'shift' | 'jump') => {
      const { R: r, motion: t } = latest.current
      if (r === undefined) return
      const { x: tx, w: tw } = snap(s)
      target.current = { x: tx, w: tw }
      sheetEl.current?.style.setProperty('--tab-rt', `${topRadius(tw, r)}px`)
      sr.jump(r)
      const d = drag.current
      if (d?.started && d.carries) {
        // Sürüklenen sekmeyle birlikte (imleci izler)
        sx.jump(tx + d.mv.get())
        sw.jump(tw)
        return
      }
      if (how === 'jump' || t.level !== 'full') {
        sx.jump(tx)
        sw.jump(tw)
        return
      }
      const tr = how === 'slide' ? t.sheet : t.shift
      void animate(sx, tx, tr)
      void animate(sw, tw, tr)
    },
    [sx, sw, sr, snap],
  )

  /** Seçili sekme görünür alanın dışındaysa oraya kayar (sonraki karede, düzen temizken). */
  const reveal = useCallback(
    (key: string) => {
      const sc = scroller.current
      const s = slots.get(key)
      if (!sc || !s) return
      const pad = (latest.current.R ?? 16) + 8
      const behavior = latest.current.motion.level === 'full' ? 'smooth' : 'auto'
      if (s.x - pad < sc.scrollLeft) sc.scrollTo({ left: s.x - pad, behavior })
      else if (s.x + s.w + pad > sc.scrollLeft + sc.clientWidth)
        sc.scrollTo({ left: s.x + s.w + pad - sc.clientWidth, behavior })
    },
    [slots],
  )

  /* --- Genişlik donması (kapatırken) ------------------------------------------------------------ */
  // `at`: donmadan sonraki ilk yapı; yapı yeniden değişirse (sekme eklendi / taşındı) çözülür
  const [frozen, setFrozen] = useState<{ width: number; at?: string } | null>(null)
  if (frozen && frozen.at === undefined) setFrozen({ ...frozen, at: layoutKey })
  else if (frozen?.at !== undefined && frozen.at !== layoutKey) setFrozen(null)
  const lock = frozen && (frozen.at === undefined || frozen.at === layoutKey) ? frozen.width : null
  const lockRef = useRef<number | null>(null)
  const release = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    lockRef.current = lock
    if (lock === null) {
      release.current?.()
      release.current = null
    }
  }, [lock])

  // Daralmış mı (doğal genişliklerin altında): yalnızca değişince çizilir; daralmışken seçim
  // sekme genişliklerini değiştirir (seçili sekmenin en azı), o zaman sekmeler de ölçülür
  const [tight, setTight] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  // Sekmelerin düzen imzası: grubun kendi yapısı (`TabGroup` › `layoutKey`) + şeridin donması ve
  // daralmışken seçim. Yapı imzası (`layoutKey`) grubun yerini etkileyen her şeyi içerir
  const stripDep = `${lock ?? ''}|${tight ? (selected ?? '') : ''}`
  const dep = `${layoutKey}|${stripDep}`

  /* --- Gözlemci: sekmelerin yeri, doğal genişliği, ikon kipi ------------------------------------ */
  const onResize = useCallback(() => {
    const r = row.current
    if (!r) return
    readSlots()
    if (sheetEl.current) origin.current = sheetEl.current.getBoundingClientRect().left
    if (latest.current.sizing === 'chrome') {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      // Daralmış: satırda boş yer kalmamış (sekmeler eşit paydan büyür; doğal genişliğinin altında
      // kalan sekme varken boş yeri o alır). Ad tavanından (22 / 15rem) kesilen sekme daralmış sayılmaz
      const pad = parseFloat(getComputedStyle(r).paddingInlineEnd) || 0
      let end = 0
      for (const s of slots.values()) end = Math.max(end, s.x + s.w)
      const isTight = r.scrollWidth > r.clientWidth + 1 || end >= r.clientWidth - pad - 1
      for (const el of tabs.values()) {
        const sel = el.hasAttribute('data-selected')
        const w = el.offsetWidth
        const compact = isCompact(w, rem, sel)
        el.toggleAttribute('data-compact', compact)
        if (compact) continue
        // Doğal genişlik (seçili sekmenin en azı için): kesilen adların tamamı eklenir
        let nat = w
        el.querySelectorAll<HTMLElement>('[data-label]').forEach((l) => {
          nat += l.scrollWidth - l.clientWidth
        })
        el.style.setProperty('--nat', `${Math.ceil(nat)}px`)
      }
      if (isTight !== latest.current.tight) {
        latest.current.tight = isTight
        setTight(isTight)
      }
      // Kalan sekmeler doğal genişliklerine sığdı: donma gereksiz
      if (!isTight && lockRef.current !== null) setFrozen(null)
    }
    // Yaprak yeni yerine: kayıyorsa yeni hedefe kayar, duruyorsa (pencere boyu) hemen oturur
    const key = latest.current.selected
    const s = key ? slots.get(key) : undefined
    const t = target.current
    const n = s && snap(s)
    if (s && n && placed.current === key && (!t || t.x !== n.x || t.w !== n.w))
      moveSheet(s, sx.isAnimating() ? 'shift' : 'jump')
  }, [readSlots, moveSheet, snap, tabs, slots, sx])
  const resizeRef = useRef(onResize)
  useLayoutEffect(() => {
    resizeRef.current = onResize
  }, [onResize])
  // Gözlemci şeritle kurulur; kayıtlı (daha önce bağlanmış) sekmeleri ve grupları da izler
  const observer = useRef<ResizeObserver | null>(null)
  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => resizeRef.current())
    observer.current = ro
    for (const el of [row.current, scroller.current, ...tabs.values(), ...groups.values()])
      if (el) ro.observe(el)
    return () => {
      ro.disconnect()
      observer.current = null
    }
  }, [tabs, groups])
  // Şerit kayınca katmanın yeri değişir: kayma bitince yaprak yeniden piksele oturur
  useLayoutEffect(() => {
    const sc = scroller.current
    if (!sc) return
    const settle = () => resizeRef.current()
    sc.addEventListener('scrollend', settle)
    return () => sc.removeEventListener('scrollend', settle)
  }, [])

  /* --- Yapı değişince: yerler, sürüklemenin telafisi, yaprak ------------------------------------ */
  useLayoutEffect(() => {
    readSlots()
    const d = drag.current
    if (d?.started) {
      const s = slots.get(d.key)
      if (s && s.x !== d.base) {
        const delta = s.x - d.base
        d.base = s.x
        d.shift += delta
        d.mv.set(d.mv.get() - delta)
      }
      d.busy = false
    }
    const key = latest.current.selected
    const s = key ? slots.get(key) : undefined
    if (s && placed.current === key) moveSheet(s, 'shift')
  }, [dep, readSlots, moveSheet, slots])

  /* --- Seçim değişince: yaprak kayar (yer önbellekten; ölçüm yok) ------------------------------- */
  useLayoutEffect(() => {
    if (!selected || R === undefined) {
      placed.current = undefined
      target.current = null
      shown.jump(0)
      return
    }
    let s = slots.get(selected)
    if (!s) {
      // Yeni sekme (henüz okunmadı): yapı zaten değişti, düzen ölçülecek
      readSlots()
      if (sheetEl.current) origin.current = sheetEl.current.getBoundingClientRect().left
      s = slots.get(selected)
    }
    if (!s) return
    const first = placed.current === undefined
    placed.current = selected
    moveSheet(s, first ? 'jump' : 'slide')
    shown.jump(1)
    frame.read(() => reveal(selected))
  }, [selected, R, slots, readSlots, moveSheet, reveal, shown])

  /* --- Sürükleme -------------------------------------------------------------------------------- */
  // Pencereye bağlanan sabit dinleyiciler; güncel işleyicileri çağırır
  const listeners = useMemo(() => {
    const move = (e: PointerEvent) => handlers.current.move(e)
    const end = (e: PointerEvent) => handlers.current.end(e)
    return {
      attach: () => {
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', end)
        window.addEventListener('pointercancel', end)
      },
      detach: () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', end)
        window.removeEventListener('pointercancel', end)
      },
    }
  }, [])
  const onDragMove = useCallback(
    (ev: PointerEvent) => {
      const d = drag.current
      const sc = scroller.current
      if (!d || ev.pointerId !== d.id || !sc) return
      const raw = ev.clientX - d.startX + (sc.scrollLeft - d.scroll0)
      if (!d.started) {
        if (Math.abs(raw) < d.threshold) return
        d.started = true
        d.el.setAttribute('data-dragging', '')
        setDragging(d.key)
      }
      const dx = raw - d.shift
      d.mv.set(dx)
      if (d.carries && target.current) sx.jump(target.current.x + dx)
      // Kenara 48px kala şerit o yöne kayar
      const edge = ev.clientX < d.rect.left + 48 ? -1 : ev.clientX > d.rect.right - 48 ? 1 : 0
      if (edge) sc.scrollLeft += edge * 12
      if (d.busy) return
      const keys = d.siblings()
      const spans = keys.map((k) => slots.get(k) ?? { x: 0, w: 0 })
      const to = swapTarget(spans, keys.indexOf(d.key), dx, d.min)
      if (to < 0) return
      d.busy = true
      d.onMove(to)
    },
    [slots, sx],
  )
  const onDragEnd = useCallback(
    (ev: PointerEvent) => {
      const d = drag.current
      if (!d || ev.pointerId !== d.id) return
      drag.current = null
      listeners.detach()
      if (!d.started) return
      const t = latest.current.motion
      // Bırakınca yuvasına oturur (yaprak da)
      void animate(d.mv, 0, t.drop).then(() => d.el.removeAttribute('data-dragging'))
      if (d.carries && target.current) void animate(sx, target.current.x, t.drop)
      setDragging(null)
      // Sürüklemenin sonundaki tıklama sekmeyi seçmesin
      const r = row.current
      const stop = (e: Event) => {
        e.stopPropagation()
        e.preventDefault()
      }
      r?.addEventListener('click', stop, { capture: true, once: true })
      setTimeout(() => r?.removeEventListener('click', stop, { capture: true }))
    },
    [sx, listeners],
  )
  const handlers = useRef({ move: onDragMove, end: onDragEnd })
  useLayoutEffect(() => {
    handlers.current = { move: onDragMove, end: onDragEnd }
  }, [onDragMove, onDragEnd])

  /* --- Alt öğelerin kullandığı arayüz (sabit) --------------------------------------------------- */
  const api = useMemo<StripApi>(
    () => ({
      sizing,
      motion,
      register: (key, el) => {
        const map = key.startsWith('group:') ? groups : tabs
        const prev = map.get(key)
        if (prev && prev !== el) observer.current?.unobserve(prev)
        if (el) {
          map.set(key, el)
          observer.current?.observe(el)
        } else {
          map.delete(key)
          slots.delete(key)
        }
      },
      slot: (key) => slots.get(key),
      closing: (el, pointer, removes) => {
        const r = row.current
        const sc = scroller.current
        const tab = el.closest<HTMLElement>('[data-tab]')
        if (latest.current.sizing !== 'chrome' || !r || !sc || !tab) return
        // Kalkan genişlik: sekme, ya da grubun bloğu ve gruplar arasındaki boşluk
        const block = removes === 'group' ? tab.closest<HTMLElement>('[data-group]') : null
        const gap = block ? parseFloat(getComputedStyle(r).columnGap) || 0 : 0
        const gone = (block ?? tab).getBoundingClientRect().width + gap
        // Şeridin son sekmesi mi (satıra göre yerlerden)
        const own = slots.get(tab.dataset.tab ?? '')
        const last = !!own && [...tabs.keys()].every((k) => (slots.get(k)?.x ?? 0) <= own.x)
        const width = freeze(lockRef.current, {
          type: 'close',
          pointer,
          row: r.getBoundingClientRect().width,
          tab: gone,
          tight: latest.current.tight,
          last,
          overflow: r.scrollWidth > sc.clientWidth + 1,
        })
        release.current?.()
        release.current = null
        // Geçiş olarak: kapatma da geçişse (FormTabs) sekmenin kalkmasıyla aynı çizimde
        startTransition(() => setFrozen(width === null ? null : { width }))
        if (width === null) return
        if (pointer === 'touch') {
          const timer = setTimeout(() => setFrozen(null), TOUCH_RELEASE_MS)
          release.current = () => clearTimeout(timer)
          return
        }
        // İmleç şeridi (payıyla) terk edince çözülür
        const rect = sc.getBoundingClientRect()
        const watch = (e: PointerEvent) => {
          if (!insideStrip(rect, e.clientX, e.clientY)) setFrozen(null)
        }
        document.addEventListener('pointermove', watch)
        release.current = () => document.removeEventListener('pointermove', watch)
      },
      dragStart: (e, source) => {
        const sc = scroller.current
        const r = row.current
        if (e.button !== 0 || e.pointerType === 'touch' || !sc || !r || drag.current) return
        readSlots()
        const s = slots.get(source.key)
        drag.current = {
          ...source,
          id: e.pointerId,
          rect: sc.getBoundingClientRect(),
          startX: e.clientX,
          scroll0: sc.scrollLeft,
          threshold: dragThreshold(source.el.offsetWidth),
          started: false,
          busy: false,
          base: s?.x ?? 0,
          shift: 0,
        }
        listeners.attach()
      },
    }),
    [sizing, motion, tabs, groups, slots, readSlots, listeners],
  )
  const layout = useMemo(() => ({ dep: stripDep, dragging }), [stripDep, dragging])

  // Klavye (WAI-ARIA sekmeleri): oklar / Home / End sekmeler arasında gezer, Delete kapatır
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (nav) return
    const list = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')]
    const i = list.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    const go = (n: number) => {
      e.preventDefault()
      list[(n + list.length) % list.length]?.focus()
    }
    if (e.key === 'ArrowRight') go(i + 1)
    else if (e.key === 'ArrowLeft') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(list.length - 1)
    else if (e.key === 'Delete' && onDelete) {
      e.preventDefault()
      // Kapanınca odak şeritte kalsın: soldaki sekmeye
      const el = list[i]!
      list[i - 1]?.focus()
      onDelete(el)
    }
  }

  return (
    <Flex className={cn('relative flex min-w-0 items-end', STRIP_VARS, className)}>
      {/* Kayan şerit Motion öğesi (`layoutScroll`): kaydırılmışken de düzen animasyonu doğru */}
      <MotionFlex
        ref={scroller}
        layoutScroll
        className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
      >
        <Flex
          ref={row}
          role={nav ? 'navigation' : 'tablist'}
          aria-label={label}
          onKeyDown={onKeyDown}
          style={lock === null ? undefined : { width: lock, flex: 'none' }}
          className={cn('relative isolate flex items-end pt-1 select-none', ROW[sizing], inset)}
        >
          {R !== undefined && (
            <MotionFlex
              ref={sheetEl}
              aria-hidden
              style={{ opacity: shown, '--tab-r': `${R}px` } as MotionStyle}
              className={cn(
                'pointer-events-none absolute bottom-0 start-0 z-1 block h-(--tab-h) w-0',
                sheet,
              )}
            >
              {/* Orta önce: kapaklar onun üstünde */}
              <MotionFlex className={SHEET_MIDDLE} style={{ x: midX, scaleX: midScale }} />
              <MotionFlex className={CAP_START} style={{ x: sx }} />
              <MotionFlex className={CAP_END} style={{ x: endX }} />
            </MotionFlex>
          )}
          <StripContext value={api}>
            <LayoutContext value={layout}>
              <AnimatePresence initial={false}>{children}</AnimatePresence>
            </LayoutContext>
          </StripContext>
        </Flex>
      </MotionFlex>
      {end}
    </Flex>
  )
}

/* --- Grup --------------------------------------------------------------------------------------- */

const GroupContext = createContext<{
  key: string
  toned: boolean
  /** Grubun ve sekmelerinin düzen imzası (grubun yapısı + şeridinki). */
  dep: string
  /** Grubu sürükler (kök sekmesinden tutulur). */
  dragStart?: (e: ReactPointerEvent<HTMLElement>, carries: boolean) => void
} | null>(null)

/** Grubun genişlik davranışı: daralırken sekme sayısıyla orantılı pay (sekmeler eşit kalsın). */
const GROUP_SIZING = {
  chrome: 'max-w-max',
  content: 'flex-none',
  fill: 'flex-1',
} as const

/**
 * Sekme grubu: başında grubun adı (ajandada "Geçmiş") ya da renkli noktası, altında renkli çizgisi.
 * `onMove` verilirse bütün olarak sürüklenir (ilk sekmesinden tutulur; `handle` sekmesi).
 */
export const TabGroup = memo(function TabGroup({
  ref,
  id,
  label,
  tone,
  toned = false,
  layoutKey = '',
  onMove,
  siblings,
  children,
}: {
  ref?: Ref<HTMLElement>
  id: string
  /**
   * Grubun yerini ve sekmelerinin genişliğini etkileyen yapı (kendi sekmeleri ve önceki grupların
   * yapısı): yalnızca bu değişince grup ve sekmeleri ölçülür (Motion `layoutDependency`).
   */
  layoutKey?: string
  /** Grubun adı (renksiz grup). */
  label?: string
  /** Grubun rengi (`GROUP_TONE`). */
  tone?: string
  /** Renkli: nokta, alt çizgi, hap grubun renginde. */
  toned?: boolean
  /** Grubu sıradaki yerine taşır (sürükleyerek). */
  onMove?: (to: number) => void
  /** Grupların anahtarları sırayla (sürüklerken komşular). */
  siblings?: string[]
  children: ReactNode
}) {
  const api = useStrip()
  const { dep, dragging } = useContext(LayoutContext)
  const present = useIsPresent()
  const mv = useMotionValue(0)
  const el = useRef<HTMLElement | null>(null)
  const key = `group:${id}`
  const attach = useCallback(
    (node: HTMLElement | null) => {
      el.current = node
      api.register(key, node)
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [api, key, ref],
  )
  const order = siblings?.join('|')
  const groupDep = `${layoutKey}|${dep}`
  const group = useMemo(
    () => ({
      key: id,
      toned,
      dep: groupDep,
      dragStart: onMove
        ? (e: ReactPointerEvent<HTMLElement>, c: boolean) => {
            if (!el.current) return
            api.dragStart(e, {
              key,
              el: el.current,
              mv,
              siblings: () => (order ? order.split('|').map((g) => `group:${g}`) : []),
              min: 0,
              onMove,
              carries: c,
            })
          }
        : undefined,
    }),
    [id, toned, groupDep, onMove, api, key, mv, order],
  )
  // Çıkan grup bulunduğu yerde söner (akıştan çıkar, komşular kayar)
  const out = present ? undefined : api.slot(key)
  const count = Children.count(children)
  return (
    <MotionFlex
      ref={attach}
      data-group={id}
      role="presentation"
      layout="position"
      layoutDependency={dragging === key ? 'drag' : groupDep}
      transition={{ layout: api.motion.shift }}
      exit={{ opacity: 0, transition: api.motion.tabOut }}
      style={{
        x: mv,
        ...(api.sizing === 'chrome' && { flex: `${Math.max(1, count)} 1 0px` }),
        ...(out && { position: 'absolute', left: out.px, width: out.w, bottom: 0 }),
      }}
      className={cn(
        'relative flex h-(--tab-h) min-w-min items-stretch data-[dragging]:z-3',
        GROUP_SIZING[api.sizing],
        tone,
        !present && 'pointer-events-none',
      )}
    >
      {label && (
        <Typography.Text
          type="secondary"
          className="relative z-2 ms-4 me-2 self-center text-xs font-medium whitespace-nowrap"
        >
          {label}
        </Typography.Text>
      )}
      {/* Grubun noktası: seçili sekme çizgiyi örtse de grup belli olur */}
      {toned && <Flex aria-hidden className={cn(GROUP_DOT, 'ms-3 me-2')} />}
      <Flex className="relative flex min-w-0 flex-1 items-stretch">
        {toned && <Flex aria-hidden className={GROUP_LINE} />}
        <GroupContext value={group}>
          <AnimatePresence initial={false}>{children}</AnimatePresence>
        </GroupContext>
      </Flex>
    </MotionFlex>
  )
})

/* --- Sekme -------------------------------------------------------------------------------------- */

/** Sekmenin genişlik davranışı (`TabStrip` › `sizing`). */
const TAB_SIZING = {
  chrome: 'flex-[1_1_0px] max-w-max min-w-[2.75rem]',
  content: 'flex-none',
  fill: 'flex-[1_1_0px] min-w-0',
} as const

/**
 * Sekmenin yuvası: hap, ayırıcı çizgi, sürükleme ve sağ tık menüsü. İçerik (`children`) yaprağın
 * ve hapın üstünde. Yeni sekme yuvasının solundan kısa kayarak belirir, kapanan yerinde söner
 * (akıştan çıkar, komşular kayar).
 */
export const Tab = memo(function Tab({
  ref,
  id,
  selected,
  handle = false,
  menu,
  onMove,
  siblings,
  min = 0,
  className,
  children,
}: {
  ref?: Ref<HTMLElement>
  /** Sekmenin anahtarı (`data-tab`). */
  id: string
  selected: boolean
  /** Grubun tutamağı: sürükleyince bütün grup gelir. */
  handle?: boolean
  /** Sağ tık menüsü (klavyede menü tuşu / Shift+F10). */
  menu?: MenuProps['items']
  /** Sekmeyi grubun içinde `to` sırasına taşır (sürükleyerek). */
  onMove?: (to: number) => void
  /** Grubun sekmelerinin anahtarları sırayla. */
  siblings?: string[]
  /** Bu sıranın önüne geçilmez (kök sekmesi). */
  min?: number
  className?: string
  children: ReactNode
}) {
  const api = useStrip()
  const group = useContext(GroupContext)
  const { dep: stripDep, dragging } = useContext(LayoutContext)
  const dep = group?.dep ?? stripDep
  const present = useIsPresent()
  const mv = useMotionValue(0)
  const el = useRef<HTMLElement | null>(null)
  const attach = useCallback(
    (node: HTMLElement | null) => {
      el.current = node
      api.register(id, node)
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [api, id, ref],
  )
  const order = siblings?.join('|')
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (handle) return group?.dragStart?.(e, selected)
    if (!onMove || !el.current) return
    api.dragStart(e, {
      key: id,
      el: el.current,
      mv,
      siblings: () => (order ? order.split('|') : []),
      min,
      onMove,
      carries: selected,
    })
  }
  const frozen = dragging === id || dragging === `group:${group?.key}`
  const out = present ? undefined : api.slot(id)
  const t = api.motion
  const slot = (
    <MotionFlex
      ref={attach}
      data-tab={id}
      data-selected={selected || undefined}
      role="presentation"
      layout="position"
      layoutDependency={frozen ? 'drag' : dep}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: t.tabOut }}
      transition={{ layout: t.shift, x: t.tabIn, opacity: t.tabIn }}
      style={{
        x: mv,
        ...(out && { position: 'absolute', left: out.px, width: out.w, top: 0 }),
      }}
      onPointerDown={onPointerDown}
      className={cn(
        'group/tab relative flex h-(--tab-h) items-stretch data-[dragging]:z-3',
        TAB_SIZING[api.sizing],
        // Seçili sekme en az 9rem (doğal genişliği daha azsa o kadar; `--nat` gözlemciden)
        api.sizing === 'chrome' && selected && 'min-w-[min(9rem,var(--nat,9rem))]',
        SEPARATOR,
        !present && 'pointer-events-none',
        className,
      )}
    >
      <Flex aria-hidden className={cn(PILL, group?.toned && PILL_TONED)} />
      {children}
    </MotionFlex>
  )
  return menu ? (
    <Dropdown trigger={['contextMenu']} menu={{ items: menu }}>
      {slot}
    </Dropdown>
  ) : (
    slot
  )
})

/* --- Sekmenin içi ------------------------------------------------------------------------------- */

const TAB_BUTTON = cn(
  'relative z-2 flex h-full min-w-0 flex-[0_1_auto] items-center justify-start gap-2 rounded-(--tab-r) border-0 bg-transparent px-3 text-sm no-underline shadow-none outline-none',
  'hover:bg-transparent! hover:no-underline active:bg-transparent! focus-visible:outline-none! focus-visible:[box-shadow:inset_0_0_0_2px_var(--focus)]',
  // İkon kipinde (dar, seçili olmayan sekme) ikon ortada
  'group-[[data-compact]:not([data-selected])]/tab:justify-center group-[[data-compact]:not([data-selected])]/tab:gap-0',
)

/**
 * Sekmenin düğmesi (ya da bağlantısı): ikon ve ad. Ad kalın yazının genişliğini baştan ayırır
 * (seçilince sekme genişlemez); sığmazsa kesilir, ikon kipinde gizlenir (ad ipucunda). Odaktaki
 * (seçili) sekme birincil renkte; renkli grupta yazı rengi nötr, kalın.
 */
export function TabButton({
  label,
  icon: Icon,
  current,
  toned = false,
  href,
  extra,
  labelClassName,
  iconClassName,
  className,
  ...rest
}: {
  label: string
  icon?: LucideIcon
  /** Odaktaki sekme (yan yana sekmede odaktaki form). */
  current: boolean
  /** Renkli grup: seçili yazı nötr. */
  toned?: boolean
  /** Bağlantı sekmesi (gezinme). */
  href?: string
  /** Adın yanında (ör. sayı). */
  extra?: ReactNode
  labelClassName?: string
  iconClassName?: string
  className?: string
} & Omit<ButtonProps, 'icon' | 'type' | 'children' | 'className' | 'href'>) {
  const tone = current
    ? toned
      ? 'text-foreground'
      : 'text-accent-soft-foreground'
    : 'text-foreground/70 hover:text-foreground!'
  const icon = Icon && (
    <Icon
      {...IC}
      className={cn(
        'shrink-0 transition-colors duration-[calc(150ms*var(--motion-time,1))]',
        current && !toned ? 'text-accent-soft-foreground' : 'text-muted',
        iconClassName,
      )}
    />
  )
  const text = (
    <Typography.Text
      className={cn(
        'grid min-w-0 text-sm text-current',
        'group-[[data-compact]:not([data-selected])]/tab:w-0 group-[[data-compact]:not([data-selected])]/tab:overflow-hidden',
        labelClassName,
      )}
    >
      {/* Kalın yazının genişliği (görünmez; doğal genişlik bundan ölçülür) */}
      <Typography.Text
        aria-hidden
        data-label
        className="invisible col-start-1 row-start-1 truncate font-semibold text-current"
      >
        {label}
      </Typography.Text>
      <Typography.Text
        className={cn(
          'col-start-1 row-start-1 truncate text-current transition-colors duration-[calc(150ms*var(--motion-time,1))]',
          current ? 'font-semibold' : 'font-medium',
        )}
      >
        {label}
      </Typography.Text>
    </Typography.Text>
  )
  if (href)
    return (
      <Link
        to={href}
        aria-current={current ? 'page' : undefined}
        className={cn(TAB_BUTTON, 'transition-colors', tone, className)}
      >
        {icon}
        {text}
        {extra}
      </Link>
    )
  return (
    <Button
      type="text"
      icon={icon}
      className={cn(TAB_BUTTON, tone, className)}
      {...rest}
    >
      {text}
      {extra}
    </Button>
  )
}

/**
 * Sekmenin kapatma düğmesi: seçili sekmede hep, diğerlerinde üzerine gelince / odakta görünür;
 * ikon kipinde gizli. `removes` genişlik donması için: sekme mi, bütün grup mu kalkıyor (yan yana
 * sekmenin bir formu kapanınca sekme kalır: donma yok).
 */
export function TabClose({
  label,
  tip = 'Kapat',
  removes = 'tab',
  onClose,
}: {
  label: string
  tip?: string
  /** Kapatınca kalkan: sekme, bütün grup (kökün sekmesi) ya da hiçbiri (yan yana sekmenin bir formu). */
  removes?: 'tab' | 'group' | false
  onClose: () => void
}) {
  const api = useStrip()
  return (
    <Tip label={tip}>
      <Button
        type="text"
        size="small"
        aria-label={label}
        icon={<X {...IC} size={14} />}
        // Kapatma sekmeyi sürüklemeye başlatmasın
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          const pointer = (e.nativeEvent as PointerEvent).pointerType ?? ''
          if (removes) api.closing(e.currentTarget, pointer, removes)
          onClose()
        }}
        className={cn(
          'relative z-2 -ms-1 me-1 shrink-0 self-center rounded-full text-muted opacity-0 transition-opacity duration-[calc(150ms*var(--motion-time,1))] hover:text-foreground! focus-visible:opacity-100',
          'group-hover/tab:opacity-100 group-data-[selected]/tab:opacity-100',
          'group-[[data-compact]:not([data-selected])]/tab:hidden',
        )}
      />
    </Tip>
  )
}
