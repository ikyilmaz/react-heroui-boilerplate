import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Flex, Typography } from 'antd'
import { cn } from '@/synergy/ant/ui'

/*
 * FPS ve performans kutusu (tema paneli › Performans › FPS'i göster): ekranın sağ üstünde, yarı
 * saydam ve bulanık zeminde, tıklamaları engellemeden. requestAnimationFrame ile kare süreleri
 * ölçülür; yarım saniyede bir özetlenir.
 */

const WINDOW_MS = 500
const HISTORY = 40
/** Takılan kare eşiği (ms) ve sayıldığı süre. */
const JANK_MS = 50
const JANK_SPAN_MS = 5000

interface Stats {
  fps: number
  avg: number
  max: number
  jank: number
  heap: number | null
  nodes: number
  history: number[]
}

/** Performans verisi: kare hızı, kare süresi, takılan kareler, bellek (Chromium), DOM öğeleri. */
function usePerf(): Stats {
  const [stats, setStats] = useState<Stats>({
    fps: 0,
    avg: 0,
    max: 0,
    jank: 0,
    heap: null,
    nodes: 0,
    history: [],
  })
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let windowStart = last
    let frames = 0
    let sum = 0
    let max = 0
    const janks: number[] = []
    const history: number[] = []
    const loop = (now: number) => {
      const dt = now - last
      last = now
      frames++
      sum += dt
      if (dt > max) max = dt
      if (dt > JANK_MS) janks.push(now)
      if (now - windowStart >= WINDOW_MS) {
        const fps = Math.round((frames * 1000) / (now - windowStart))
        history.push(fps)
        if (history.length > HISTORY) history.shift()
        while (janks.length && now - janks[0]! > JANK_SPAN_MS) janks.shift()
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        setStats({
          fps,
          avg: sum / frames,
          max,
          jank: janks.length,
          heap: memory ? memory.usedJSHeapSize / 1048576 : null,
          nodes: document.getElementsByTagName('*').length,
          history: [...history],
        })
        windowStart = now
        frames = 0
        sum = 0
        max = 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return stats
}

/** FPS'in durum rengi (yalnızca durum için renk): akıcı, idare eder, takılıyor. */
const tone = (fps: number) =>
  fps >= 55 ? 'text-success' : fps >= 30 ? 'text-warning' : 'text-danger'
const barTone = (fps: number) => (fps >= 55 ? 'bg-success' : fps >= 30 ? 'bg-warning' : 'bg-danger')

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Flex align="baseline" justify="space-between" gap={12}>
      <Typography.Text className="whitespace-nowrap text-current opacity-70">
        {label}
      </Typography.Text>
      <Typography.Text className="font-mono whitespace-nowrap text-current tabular-nums">
        {value}
      </Typography.Text>
    </Flex>
  )
}

export function PerfOverlay() {
  const s = usePerf()
  return createPortal(
    <Flex
      vertical
      role="status"
      aria-live="off"
      aria-label="Performans"
      className="pointer-events-none fixed end-3 top-3 z-[2147483000] w-60 rounded-xl bg-background/70 p-3 text-[0.6875rem] leading-5 text-foreground shadow-[0_8px_24px_-12px_oklch(0_0_0/0.35)] ring-1 ring-border backdrop-blur-md"
    >
      <Flex align="baseline" justify="space-between" className="mb-1.5">
        <Typography.Text className="font-semibold text-current">FPS</Typography.Text>
        <Typography.Text className={cn('font-mono text-xl font-bold tabular-nums', tone(s.fps))}>
          {s.fps}
        </Typography.Text>
      </Flex>
      {/* Son 20 saniyenin kare hızı (yarım saniyelik çubuklar; 60 FPS tam boy) */}
      <Flex aria-hidden align="flex-end" className="mb-2 h-6 gap-px">
        {Array.from({ length: HISTORY }, (_, i) => {
          const v = s.history[i - (HISTORY - s.history.length)]
          return (
            // `block`: antd'de içi boş `Flex` gizlenir
            <Flex
              key={i}
              style={{ height: v == null ? 1 : `${Math.max(6, Math.min(100, (v / 60) * 100))}%` }}
              className={cn(
                'block flex-1 rounded-sm',
                v == null ? 'bg-border' : barTone(v),
                'opacity-80',
              )}
            />
          )
        })}
      </Flex>
      <Row label="Kare (ort.)" value={`${s.avg.toFixed(1)} ms`} />
      <Row label="Kare (en uzun)" value={`${s.max.toFixed(1)} ms`} />
      <Row label="Takılan kare (5 sn)" value={String(s.jank)} />
      {s.heap != null && <Row label="JS belleği" value={`${s.heap.toFixed(1)} MB`} />}
      <Row label="DOM öğesi" value={s.nodes.toLocaleString('tr-TR')} />
    </Flex>,
    document.body,
  )
}
