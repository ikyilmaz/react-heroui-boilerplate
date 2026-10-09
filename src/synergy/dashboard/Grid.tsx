import { useCallback, useEffect, useState, type PointerEvent, type ReactNode } from 'react'
import { Maximize2 } from 'lucide-react'
import { Flex } from 'antd'
import { IC, cn } from '@/synergy/ant/ui'
import { COLS, GAP, limitsOf, type PlacedWidget, type WidgetKind } from '@/synergy/dashboard/model'

/*
 * Panonun ızgarası (react-grid-layout yerine, yalın): `COLS` sütun, satır yüksekliği dışarıdan,
 * hücreler ve kenarlar arasında `GAP`. Hücreler mutlak konumlu (satır içi `transform` / boyut).
 * Düzenlemede hücre tutulup taşınır, sağ alt tutamaktan boyutlandırılır: imleç hareketinde sürüklenen
 * hücreye doğrudan yazılır (React çizimi yok), yalnızca hedef ızgara hücresi değişince yeniden
 * çizilir (yer tutucu ve itilen komşular). Yerleşim dikey sıkıştırılır: widget'lar yukarı yaslanır,
 * çakışan aşağı itilir. Bırakınca yeni yerleşim `onCommit` ile verilir.
 */

/** Düzenleme modunda hücreyi taşımayan öğelerin sınıfı (düğmeler). */
export const NO_DRAG = 'dash-no-drag'

/** Sürüklemenin başlaması için gereken en küçük imleç kayması (px). */
const THRESHOLD = 4

const overlaps = (a: PlacedWidget, b: PlacedWidget) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

/**
 * Dikey sıkıştırma: `fixed` (taşınan / boyutlandırılan) yerinde kalır; diğerleri yukarıdan aşağı
 * sırayla olabildiğince yukarı yaslanır, çakışırsa aşağı itilir.
 */
function arrange(items: PlacedWidget[], fixed?: PlacedWidget): PlacedWidget[] {
  const placed: PlacedWidget[] = fixed ? [fixed] : []
  const rest = items.filter((p) => p.kind !== fixed?.kind).sort((a, b) => a.y - b.y || a.x - b.x)
  for (const p of rest) {
    const q = { ...p }
    while (q.y > 0 && !placed.some((o) => overlaps(o, { ...q, y: q.y - 1 }))) q.y--
    while (placed.some((o) => overlaps(o, q))) q.y++
    placed.push(q)
  }
  return placed
}

/** Kabın genişliği (ResizeObserver); ölçülene kadar `null`. */
export function useWidth() {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [width, setWidth] = useState<number | null>(null)
  // Ayrılma (`null`) yok sayılır: öğe gidip gelince ölçü sıfırlanmasın
  const ref = useCallback((node: HTMLElement | null) => {
    if (node) setEl(node)
  }, [])
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      // Gizli bölmede kutu yok: son ölçü kalır
      if (e && e.contentRect.width > 0) setWidth(Math.round(e.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return { ref, el, width }
}

interface Drag {
  kind: WidgetKind
  mode: 'move' | 'resize'
  /** İmlecin başlangıcı ve hücrenin başlangıç kutusu (px). */
  sx: number
  sy: number
  box: Box
  el: HTMLElement
  started: boolean
  /** Son hedef (ızgara) ve ona göre dizilmiş yerleşim. */
  target: PlacedWidget
  layout: PlacedWidget[]
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

/** Hücre kutusunu öğeye doğrudan yazar (sürüklemede ve bırakınca). */
function place(el: HTMLElement, b: Box) {
  el.style.transform = `translate(${b.left}px, ${b.top}px)`
  el.style.width = `${b.width}px`
  el.style.height = `${b.height}px`
}

const same = (a: PlacedWidget, b: PlacedWidget) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h

export function Grid({
  items,
  width,
  rowHeight,
  edit,
  onCommit,
  renderCell,
  className,
}: {
  items: PlacedWidget[]
  width: number
  rowHeight: number
  edit: boolean
  onCommit: (items: PlacedWidget[]) => void
  renderCell: (p: PlacedWidget) => ReactNode
  className?: string
}) {
  const col = (width - GAP * (COLS + 1)) / COLS
  const xStep = col + GAP
  const yStep = rowHeight + GAP
  const boxOf = (p: PlacedWidget): Box => ({
    left: GAP + p.x * xStep,
    top: GAP + p.y * yStep,
    width: p.w * col + (p.w - 1) * GAP,
    height: p.h * rowHeight + (p.h - 1) * GAP,
  })

  // Sürüklemedeki görünüm: dizilmiş yerleşim ve yer tutucu (hedef değişince güncellenir)
  const [view, setView] = useState<Pick<Drag, 'kind' | 'layout' | 'target' | 'box'> | null>(null)

  const begin = (e: PointerEvent<HTMLElement>, p: PlacedWidget, mode: Drag['mode']) => {
    const cell = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-grid-cell]')
    const target = e.target as HTMLElement
    // Portaldan (boyut menüsü, ipucu) gelen olaylar ve düğmeler taşımaz
    if (!edit || e.button !== 0 || !cell?.contains(target)) return
    if (mode === 'move' && target.closest(`.${NO_DRAG}, [data-grid-handle]`)) return
    e.preventDefault()
    e.stopPropagation()
    const d: Drag = {
      kind: p.kind,
      mode,
      sx: e.clientX,
      sy: e.clientY,
      box: boxOf(p),
      el: cell,
      started: false,
      target: p,
      layout: items,
    }
    const lim = limitsOf(p.kind)

    const move = (ev: globalThis.PointerEvent) => {
      const dx = ev.clientX - d.sx
      const dy = ev.clientY - d.sy
      if (!d.started && mode === 'move' && Math.hypot(dx, dy) < THRESHOLD) return
      let t: PlacedWidget
      if (mode === 'move') {
        place(d.el, { ...d.box, left: d.box.left + dx, top: d.box.top + dy })
        t = {
          ...p,
          x: Math.min(COLS - p.w, Math.max(0, Math.round((d.box.left + dx - GAP) / xStep))),
          y: Math.max(0, Math.round((d.box.top + dy - GAP) / yStep)),
        }
      } else {
        const w = Math.max(col, d.box.width + dx)
        const h = Math.max(rowHeight, d.box.height + dy)
        place(d.el, { ...d.box, width: w, height: h })
        t = {
          ...p,
          w: Math.min(COLS - p.x, Math.max(lim.minW, Math.round((w + GAP) / xStep))),
          h: Math.max(lim.minH, Math.round((h + GAP) / yStep)),
        }
      }
      // Hedef hücre değişmedikçe React çizimi yok
      if (d.started && same(t, d.target)) return
      d.started = true
      d.target = t
      d.layout = arrange(items, t)
      setView({ kind: p.kind, layout: d.layout, target: t, box: d.box })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setView(null)
      if (!d.started) return
      const next = arrange(d.layout)
      const mine = next.find((q) => q.kind === p.kind) ?? p
      // Bırakılan yere oturur (React aynı değeri yazmayacağı için elle; konum değişmediyse de)
      place(d.el, boxOf(mine))
      if (next.some((q) => !same(q, items.find((o) => o.kind === q.kind) ?? q))) onCommit(next)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const shown = view ? view.layout : items
  const rows = Math.max(1, ...shown.map((p) => p.y + p.h))
  const ghost = view && boxOf(view.target)

  return (
    <Flex className={cn('relative block', className)} style={{ height: rows * yStep + GAP }}>
      {ghost && (
        <Flex
          aria-hidden
          className="absolute top-0 left-0 block rounded-3xl bg-accent/12 ring-2 ring-accent/40 ring-inset"
          style={{
            transform: `translate(${ghost.left}px, ${ghost.top}px)`,
            width: ghost.width,
            height: ghost.height,
          }}
        />
      )}
      {shown.map((p) => {
        const active = view?.kind === p.kind
        // Sürüklenen hücre imleç hareketinde doğrudan yazılır: çizimde başlangıç kutusu kalır
        // (React aynı değeri yeniden yazmaz, hedef değişince imlecin yerini ezmez)
        const b = active ? view.box : boxOf(p)
        return (
          <Flex
            key={p.kind}
            data-grid-cell
            onPointerDown={edit ? (e) => begin(e, p, 'move') : undefined}
            className={cn(
              'absolute top-0 left-0 block',
              edit && 'touch-none',
              active
                ? 'z-30'
                : 'transition-transform duration-[calc(200ms*var(--motion-time,1))] ease-out',
            )}
            style={{
              transform: `translate(${b.left}px, ${b.top}px)`,
              width: b.width,
              height: b.height,
            }}
          >
            {renderCell(p)}
            {edit && (
              <Flex
                aria-hidden
                data-grid-handle
                onPointerDown={(e) => begin(e, p, 'resize')}
                className="absolute end-1.5 bottom-1.5 z-20 grid size-6 cursor-se-resize touch-none place-items-center rounded-full bg-accent text-accent-foreground shadow-sm"
              >
                <Maximize2 {...IC} size={12} className="rotate-90" />
              </Flex>
            )}
          </Flex>
        )
      })}
    </Flex>
  )
}
