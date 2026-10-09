/*
 * Ölçüm betiklerinin ortak parçaları (puppeteer-core, üretim derlemesi): seçenekler, sayfaya ilk
 * betikten önce yüklenen ölçüm araçları (uzun kareler, ölçüm sayaçları, kare döngüsü, DOM
 * çalkantısı), iz kaydının dökümü ve çalışma alanının yardımcıları (sekmeler, bölmeler, oturma
 * denetimi).
 */
import puppeteer from 'puppeteer-core'

/* --- Seçenekler --------------------------------------------------------------------------------- */

const argv = process.argv.slice(2)
export const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
export const flag = (name) => argv.includes(`--${name}`)

export const URL_BASE = opt('url', 'http://localhost:4173')
export const CHROME = opt('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** Form sunucudan gelene kadar iskelet (`LOAD_MS` 1 s) + pay. */
export const LOAD_WAIT = 1800

/** Şerit ve bölmeler. */
export const STRIP = '[role=tablist][aria-label="Açık sekmeler"]'
export const PANE = '[id^="screen-pane-"]'

/**
 * Ölçüm senaryosunun düzeni: listenin üstünde talep (seçili; içinden yan yana child açılır), kendi
 * sekmesinde bir talep, İK, bir uygulama formu ve ayrı bir liste.
 */
export const SETUP_URL =
  '/is-akislari/bekleyen/satin-alma/bekleyen-satin-alma-0?sekmeler=*,t.bekleyen-satin-alma-1,ik.kullanicilar,u.personel-rehberi,ia.bekleyen.masraf'

export function launch({ width = 1512, height = 945, dpr = 1, headed = flag('headed') } = {}) {
  return puppeteer.launch({
    executablePath: CHROME,
    headless: !headed,
    defaultViewport: { width, height, deviceScaleFactor: dpr },
    args: [`--window-size=${width},${height + 120}`],
  })
}

/* --- Sayfaya yüklenen araçlar (ilk betikten önce) ------------------------------------------------ */

/** Tema ayarları ve bulma yardımcıları; `measure` ise ölçüm araçları da. */
export function install({ theme, measure }) {
  try {
    if (theme) localStorage.setItem('synergy-v2-theme', JSON.stringify(theme))
  } catch {
    // Depolama kapalı: varsayılan
  }

  /** Görünür öğe: seçici, isteğe bağlı metin (içerir), sıra (`nth`, `last`), içindeki öğe. */
  window.__all = (spec) =>
    [...document.querySelectorAll(spec.css)].filter((el) => {
      if (spec.visible !== false && !el.checkVisibility()) return false
      if (spec.text && !el.textContent.includes(spec.text)) return false
      if (spec.exact && el.textContent.trim() !== spec.exact) return false
      if (spec.has && el.querySelectorAll(spec.has).length < (spec.hasCount ?? 1)) return false
      return true
    })
  window.__find = (spec) => {
    const all = window.__all(spec)
    const el = spec.last ? all.at(-1) : all[spec.nth ?? 0]
    if (!el) return null
    return spec.inner ? el.querySelector(spec.inner) : el
  }
  if (!measure) return

  const realTimeout = window.setTimeout.bind(window)
  window.__realTimeout = realTimeout

  // Uzun animasyon kareleri (Chrome 123+): engelleme süresi ve zorunlu düzen
  window.__loaf = []
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      window.__loaf.push({
        start: Math.round(e.startTime),
        dur: Math.round(e.duration),
        block: Math.round(e.blockingDuration),
        render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0),
        style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0),
        scripts: e.scripts.map((s) => ({
          dur: Math.round(s.duration),
          fn: s.sourceFunctionName,
          inv: s.invoker,
          src: (s.sourceURL || '').split('/').pop() + ':' + s.sourceCharPosition,
          forced: Math.round(s.forcedStyleAndLayoutDuration),
        })),
      })
  }).observe({ type: 'long-animation-frame', buffered: true })

  // Ölçüm sayaçları (Motion getBoundingClientRect ile ölçer; offset* ve client* düzeni zorlar)
  window.__cnt = { gbcr: 0, offset: 0, client: 0, gcs: 0, timers: 0, raf: 0 }
  const P = Element.prototype
  const gbcr = P.getBoundingClientRect
  const gcs = window.getComputedStyle
  P.getBoundingClientRect = function () {
    window.__cnt.gbcr++
    return gbcr.call(this)
  }
  window.getComputedStyle = function () {
    window.__cnt.gcs++
    return gcs.apply(window, arguments)
  }
  for (const k of ['offsetWidth', 'offsetLeft', 'offsetTop', 'offsetHeight', 'offsetParent']) {
    const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, k)
    Object.defineProperty(HTMLElement.prototype, k, {
      configurable: true,
      get() {
        window.__cnt.offset++
        return d.get.call(this)
      },
    })
  }
  for (const k of ['clientWidth', 'clientHeight']) {
    const d = Object.getOwnPropertyDescriptor(Element.prototype, k)
    Object.defineProperty(Element.prototype, k, {
      configurable: true,
      get() {
        window.__cnt.client++
        return d.get.call(this)
      },
    })
  }
  const st = window.setTimeout
  const si = window.setInterval
  const raf = window.requestAnimationFrame
  window.setTimeout = function () {
    window.__cnt.timers++
    return st.apply(window, arguments)
  }
  window.setInterval = function () {
    window.__cnt.timers++
    return si.apply(window, arguments)
  }
  window.__realRaf = raf.bind(window)
  window.requestAnimationFrame = function () {
    window.__cnt.raf++
    return raf.apply(window, arguments)
  }

  /**
   * Bir etkileşim: 400 ms ısınma (kare döngüsü dönsün), eylem, `windowMs` izleme. Eylem: öğeye
   * tıklama (`spec`), ya da sayfadaki bir işlev (`run`: geri / ileri, Cmd+tık…). Tıklama görevi
   * eylemden sonraki ilk görevle (MessageChannel) kapanır: React'in eşzamanlı çizimi, düzen etkileri
   * ve Motion'ın ölçümü (mikro görevler) içinde.
   */
  window.__measure = async (label, spec, windowMs = 1500) => {
    const wait = (ms) => new Promise((r) => realTimeout(r, ms))
    const frames = []
    let stop = false
    const loop = (t) => {
      frames.push(t)
      if (!stop) window.__realRaf(loop)
    }
    window.__realRaf(loop)
    await wait(400)
    // Bölme başına DOM çalkantısı: name / type yazımı = React orada bir <input>'u yeniden çizdi;
    // eklenen / çıkan düğüm = içerik yeniden kuruldu
    const panes = [...document.querySelectorAll('[id^="screen-pane-"]')]
    const churn = new Map(
      panes.map((p) => [
        p.id,
        {
          hidden: getComputedStyle(p).contentVisibility === 'hidden',
          inputWrites: 0,
          styleWrites: 0,
          attrWrites: 0,
          nodes: 0,
        },
      ]),
    )
    const styled = new Map()
    let styleWrites = 0
    let attrWrites = 0
    let added = 0
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        const pane = (m.target.closest ? m.target : m.target.parentElement)?.closest?.('[id^="screen-pane-"]')
        const c = pane && churn.get(pane.id)
        if (m.type === 'childList') {
          added += m.addedNodes.length
          if (c) c.nodes += m.addedNodes.length + m.removedNodes.length
          continue
        }
        if (m.type !== 'attributes') continue
        if (m.attributeName === 'style') {
          styleWrites++
          styled.set(m.target, (styled.get(m.target) ?? 0) + 1)
        } else attrWrites++
        if (!c) continue
        if (m.attributeName === 'name' || m.attributeName === 'type') c.inputWrites++
        else if (m.attributeName === 'style') c.styleWrites++
        else c.attrWrites++
      }
    })
    mo.observe(document.body, { subtree: true, attributes: true, childList: true })
    const el = spec?.css ? window.__find(spec) : null
    if (spec?.css && !el) {
      stop = true
      mo.disconnect()
      return { label, error: `bulunamadı: ${JSON.stringify(spec)}` }
    }
    window.__cnt = { gbcr: 0, offset: 0, client: 0, gcs: 0, timers: 0, raf: 0 }
    window.__loaf = []
    const t0 = performance.now()
    let taskEnd = 0
    const ch = new MessageChannel()
    ch.port1.onmessage = () => {
      taskEnd = performance.now()
    }
    if (el) {
      if (spec.meta) {
        // Cmd+tık (arka planda yeni sekme)
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))
      } else el.click()
      ch.port2.postMessage(0)
    } else if (spec?.run) {
      window[spec.run]()
      ch.port2.postMessage(0)
    }
    await wait(windowMs)
    stop = true
    mo.disconnect()
    const counts = { ...window.__cnt }
    const after = frames.filter((t) => t >= t0 - 1)
    const warm = frames.filter((t) => t < t0)
    const gapsWarm = warm
      .slice(1)
      .map((t, i) => t - warm[i])
      .sort((a, b) => a - b)
    const interval = gapsWarm[Math.floor(gapsWarm.length / 2)] ?? 16.7
    const gaps = after.slice(1).map((t, i) => ({ at: after[i] - t0, gap: t - after[i] }))
    const dropped = gaps.reduce((n, g) => n + Math.max(0, Math.round(g.gap / interval) - 1), 0)
    const top = [...styled.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([n, c]) => ({
        el: `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}.${String(n.className?.baseVal ?? n.className ?? '')
          .split(' ')
          .slice(0, 3)
          .join('.')}`,
        writes: c,
      }))
    return {
      label,
      clickTask: el || spec?.run ? Math.round((taskEnd - t0) * 10) / 10 : 0,
      frames: after.length,
      interval: Math.round(interval * 10) / 10,
      maxGap: Math.round(Math.max(0, ...gaps.map((g) => g.gap))),
      maxGap500: Math.round(Math.max(0, ...gaps.filter((g) => g.at < 500).map((g) => g.gap))),
      over20: gaps.filter((g) => g.gap > 20).length,
      over20in500: gaps.filter((g) => g.at < 500 && g.gap > 20).length,
      dropped,
      counts,
      // `at`: eylemden kaç ms sonra başladı (açılışta ~1000: form iskeletten çıkınca)
      loaf: window.__loaf
        .filter((l) => l.start + l.dur >= t0)
        .map((l) => ({ ...l, at: Math.round(l.start - t0) })),
      styleWrites,
      styledElements: styled.size,
      attrWrites,
      added,
      topStyled: top,
      churn: Object.fromEntries(churn),
      dom: document.getElementsByTagName('*').length,
      panes: document.querySelectorAll('[id^="screen-pane-"]').length,
    }
  }
}

/* --- İz kaydı: tıklama görevinin dökümü --------------------------------------------------------- */

export const CATEGORIES = [
  ...(flag('invalidations') ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : []),
  ...(flag('stacks') ? ['disabled-by-default-devtools.timeline.stack'] : []),
  'toplevel',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'v8.execute',
]

const ACTION = (e) =>
  e.name === 'EventDispatch' && ['click', 'popstate'].includes(e.args?.data?.type)

/** Sayfanın ana iş parçacığı: eylemin (tıklama / popstate) olduğu, yoksa en kalabalık CrRendererMain. */
function mainThread(events) {
  const action = events.find(ACTION)
  if (action) return `${action.pid}:${action.tid}`
  const names = new Map()
  for (const e of events)
    if (e.ph === 'M' && e.name === 'thread_name') names.set(`${e.pid}:${e.tid}`, e.args.name)
  const count = new Map()
  for (const e of events) {
    const k = `${e.pid}:${e.tid}`
    if (names.get(k) === 'CrRendererMain') count.set(k, (count.get(k) ?? 0) + 1)
  }
  return [...count].sort((a, b) => b[1] - a[1])[0]?.[0]
}

/** Üst düzey görevler (iç içe olanlar dışarıdakinin içinde sayılır), başlangıca göre sıralı. */
function topTasks(onMain) {
  const tasks = onMain
    .filter((e) => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask')
    .sort((a, b) => a.ts - b.ts || b.dur - a.dur)
  const out = []
  for (const t of tasks) {
    const last = out.at(-1)
    if (last && t.ts < last.ts + last.dur) continue
    out.push(t)
  }
  return out
}

/** Ana iş parçacığında eylemin görevi: süre, zorunlu stil / düzen, betik; penceredeki görevler. */
export function analyze(trace) {
  const events = trace.traceEvents ?? trace
  const main = mainThread(events)
  if (!main) return null
  const onMain = events.filter((e) => e.ph === 'X' && `${e.pid}:${e.tid}` === main)
  const click = onMain.find(ACTION)
  const tasks = topTasks(onMain)
  const from = click?.ts ?? tasks[0]?.ts ?? 0
  const later = tasks.filter((t) => t.ts + t.dur >= from)
  const longTasks = later.filter((t) => t.dur > 50_000).map((t) => Math.round(t.dur / 100) / 10)
  const maxTask = Math.round(Math.max(0, ...later.map((t) => t.dur)) / 100) / 10
  // Eylemden sonraki 1 s içindeki ana iş parçacığı işi (React'in parçaları, kaydetme, Motion)
  const end = from + 1_000_000
  const busy =
    Math.round(
      later
        .filter((t) => t.ts < end)
        .reduce((n, t) => n + Math.min(t.ts + t.dur, end) - Math.max(t.ts, from), 0) / 100,
    ) / 10
  if (!click) return { clickTask: null, longTasks, maxTask, busy }
  const task = tasks.find((t) => t.ts <= click.ts && click.ts <= t.ts + t.dur)
  if (!task) return { clickTask: null, longTasks, maxTask, busy }
  const inside = onMain.filter((e) => e.ts >= task.ts && e.ts + e.dur <= task.ts + task.dur)
  const sum = (pred) => inside.filter(pred).reduce((n, e) => n + e.dur, 0) / 1000
  const style = sum((e) => e.name === 'UpdateLayoutTree' || e.name === 'RecalculateStyles')
  const layout = sum((e) => e.name === 'Layout')
  const gc = sum((e) => e.name === 'MinorGC' || e.name === 'MajorGC' || e.name === 'V8.GC_SCAVENGER')
  const dur = task.dur / 1000
  const r = (n) => Math.round(n * 10) / 10
  return {
    clickTask: r(dur),
    forcedStyle: r(style),
    forcedLayout: r(layout),
    forced: r(style + layout),
    script: r(dur - style - layout - gc),
    layouts: inside.filter((e) => e.name === 'Layout').length,
    longTasks,
    maxTask,
    busy,
  }
}

/** Penceredeki ana iş parçacığı işinin dökümü (ad başına toplam ms): betik, stil, düzen, boyama. */
export function rendering(trace) {
  const events = trace.traceEvents ?? trace
  const main = mainThread(events)
  const click = events.find(ACTION)
  const pick = new Set([
    'FunctionCall',
    'EvaluateScript',
    'RunMicrotasks',
    'FireAnimationFrame',
    'UpdateLayoutTree',
    'Layout',
    'PrePaint',
    'Paint',
    'Layerize',
    'Commit',
    'HitTest',
  ])
  const from = click ? click.ts : 0
  const out = {}
  for (const e of events) {
    if (e.ph !== 'X' || `${e.pid}:${e.tid}` !== main || !pick.has(e.name) || e.ts < from) continue
    out[e.name] = (out[e.name] ?? 0) + e.dur / 1000
  }
  // Betiğin zorladığı stil / düzen (betik olayının içindeki): karenin kendi düzeninden önce okunan
  // ölçüler. Karenin düzeni (betik dışında) sayılmaz
  const js = events
    .filter(
      (e) =>
        e.ph === 'X' &&
        `${e.pid}:${e.tid}` === main &&
        e.ts >= from &&
        ['FunctionCall', 'FireAnimationFrame', 'EvaluateScript', 'TimerFire', 'RunMicrotasks', 'EventDispatch'].includes(e.name),
    )
    .sort((a, b) => a.ts - b.ts)
  const inside = (e) => {
    let lo = 0
    let hi = js.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (js[mid].ts <= e.ts) lo = mid + 1
      else hi = mid - 1
    }
    for (let i = hi; i >= 0 && i > hi - 20; i--) if (js[i].ts + js[i].dur >= e.ts + e.dur) return true
    return false
  }
  let forced = 0
  let forcedCount = 0
  for (const e of events) {
    if (e.ph !== 'X' || `${e.pid}:${e.tid}` !== main || e.ts < from) continue
    if (e.name !== 'Layout' && e.name !== 'UpdateLayoutTree') continue
    if (!inside(e)) continue
    forced += e.dur / 1000
    if (e.name === 'Layout') forcedCount++
  }
  out.forcedInJs = Math.round(forced * 10) / 10
  out.forcedLayouts = forcedCount
  for (const k in out) out[k] = Math.round(out[k] * 10) / 10
  return out
}

/* --- Sayfa yardımcıları ------------------------------------------------------------------------- */

/** Görünür öğe çıkana kadar bekler. */
export async function waitFor(page, spec, timeout = 10_000) {
  await page.waitForFunction((s) => !!window.__find(s), { timeout, polling: 30 }, spec)
}
/** Öğeye programla tıklar. */
export async function click(page, spec) {
  await waitFor(page, spec)
  await page.evaluate((s) => window.__find(s).click(), spec)
}
/** Gerçek imleçle tıklama (üzerine gelme, genişlik donması imleç türüne bakar). */
export async function mouseClick(page, spec, opts) {
  await waitFor(page, spec)
  const r = await page.evaluate((s) => {
    const b = window.__find(s).getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }, spec)
  await page.mouse.move(r.x, r.y)
  await page.mouse.click(r.x, r.y, opts)
  return r
}

/** Şeridin sekmeleri: ekran anahtarı, adı, sekmesi, seçili mi. */
export const tabs = (page) =>
  page.evaluate((strip) => {
    const list = document.querySelector(strip)
    // Ad iki kez yazılı (biri kalın genişliği ayırır, görünmez)
    const nameOf = (t) => {
      const text = t.textContent.trim()
      const half = text.slice(0, text.length / 2)
      return text.length % 2 === 0 && half + half === text ? half : text
    }
    return [...(list?.querySelectorAll('[role=tab]') ?? [])].map((t) => ({
      screen: t.dataset.screen,
      tab: t.dataset.tabKey,
      name: nameOf(t),
      group: t.closest('[data-group]')?.dataset.group,
      selected: t.getAttribute('aria-selected') === 'true',
      current: t.tabIndex === 0,
    }))
  }, STRIP)

/** Ekranın şeritteki düğmesi. */
export const TAB = (screen) => ({ css: `${STRIP} [role=tab][data-screen="${screen}"]`, visible: false })
/** Görünen bölmedeki öğe (gizli bölmeler `content-visibility: hidden`: `checkVisibility` false). */
export const IN = (css, text) => ({ css: `${PANE} ${css}`, text })

/**
 * Oturunca her şey yerinde mi: yaprak seçili sekmenin üstünde (±1px), görünür bölmeler seçili
 * sekmenin ekranları (tam saydam, dönüşümsüz), diğerleri `content-visibility: hidden`; sekmelerde
 * dönüşüm / saydamlık kalmamış; bölmeler kabın içinde ve üst üste binmiyor.
 */
export const settled = (page) =>
  page.evaluate(
    (strip, paneSel) => {
      const out = []
      const list = document.querySelector(strip)
      if (!list) return ['şerit yok']
      const tab = list.querySelector('[data-tab][data-selected]')
      const sheet = list.querySelector(':scope > [aria-hidden].absolute')
      if (!tab || !sheet) out.push('seçili sekme ya da yaprak yok')
      else {
        const [, start, end] = sheet.children
        const t = tab.getBoundingClientRect()
        const l = start.getBoundingClientRect().left
        const r = end.getBoundingClientRect().right
        if (Math.abs(l - t.left) > 1 || Math.abs(r - t.right) > 1)
          out.push(
            `yaprak yerinde değil: ${l.toFixed(1)}..${r.toFixed(1)} sekme ${t.left.toFixed(1)}..${t.right.toFixed(1)}`,
          )
        if (getComputedStyle(sheet).opacity !== '1') out.push('yaprak görünmüyor')
      }
      const moved = (cs) => cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)'
      for (const el of list.querySelectorAll('[data-tab], [data-group]')) {
        const cs = getComputedStyle(el)
        if (moved(cs)) out.push(`sekmede dönüşüm kaldı: ${el.dataset.tab ?? el.dataset.group} ${cs.transform}`)
        if (cs.opacity !== '1') out.push(`sekme saydam: ${el.dataset.tab ?? el.dataset.group}`)
      }
      const want = new Set(
        [...(tab?.querySelectorAll('[role=tab][aria-selected=true]') ?? [])].map((b) =>
          b.getAttribute('aria-controls'),
        ),
      )
      const panes = [...document.querySelectorAll(paneSel)]
      const host = panes[0]?.parentElement?.getBoundingClientRect()
      const boxes = []
      for (const pane of panes) {
        const cs = getComputedStyle(pane)
        const skipped = cs.contentVisibility === 'hidden'
        if (want.has(pane.id)) {
          if (skipped) out.push(`görünmesi gereken bölme gizli: ${pane.id}`)
          if (Math.abs(parseFloat(cs.opacity) - 1) > 0.01) out.push(`bölme saydam: ${pane.id} ${cs.opacity}`)
          if (moved(cs)) out.push(`bölmede dönüşüm kaldı: ${pane.id} ${cs.transform}`)
          const b = pane.getBoundingClientRect()
          if (host && (b.left < host.left - 1 || b.right > host.right + 1))
            out.push(`bölme kabın dışında: ${pane.id} ${b.left.toFixed(0)}..${b.right.toFixed(0)}`)
          boxes.push([pane.id, b])
        } else if (!skipped) out.push(`gizli olması gereken bölme görünüyor: ${pane.id}`)
      }
      for (const w of want) if (!document.getElementById(w)) out.push(`bölme yok: ${w}`)
      if (boxes.length === 2) {
        const [[, a], [, b]] = boxes
        const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        if (overlap > 1) out.push(`yan yana bölmeler üst üste: ${overlap.toFixed(0)}px`)
      }
      return out
    },
    STRIP,
    PANE,
  )
