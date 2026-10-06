#!/usr/bin/env node
/*
 * Sekme sistemi ölçümü (FormTabs, iş akışı ajanda sekmeleri): üretim derlemesi üzerinde, puppeteer-core
 * ile. Senaryo: Satın Alma Talep Formu → "Tedarikçi Teklifi Ekle" (panel boyutu 2, yan yana) →
 * "Tedarikçi Kartını Aç" (boyut 1, kök kendi sekmesine çıkar) → Süreçler izinden 20014 (ikinci grup);
 * sonra A–H etkileşimleri. Her etkileşim önce bir ısınma turu koşar (ilk koşu antd'nin tek seferlik
 * stil basımını içerir), sonraki turların ortancası raporlanır (`--rounds`, varsayılan 3; uzun kareler ve kare
 * boşlukları en kötü tur). A–D ayrıca 4× işlemci yavaşlatmasıyla (60 Hz) kare boşlukları için.
 *
 *   npm run build && npx vite preview --port 4173 --strictPort &
 *   node scripts/perf/tabs.mjs --out scripts/perf/tabs-after.json
 *
 * Seçenekler: --url (http://localhost:4173), --chrome <yol>, --out <json> (yanına .md tablo),
 * --motion full|reduced|off (tema paneli › Animasyon), --dpr 2, --width 1512 --height 945,
 * --headed (görünür pencere), --no-trace (iz kaydı olmadan; tıklama görevinin dökümü çıkmaz),
 * --no-throttle (4× koşusunu atla), --save-traces <klasör> (izleri yazar), --invalidations (izde stil
 * geçersizleme kaynakları), --stacks (zorunlu düzenin çağrı yığını).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'

/* --- Seçenekler --------------------------------------------------------------------------------- */

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const flag = (name) => argv.includes(`--${name}`)

const URL_BASE = opt('url', 'http://localhost:4173')
const CHROME = opt('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const OUT = opt('out', null)
const MOTION = opt('motion', 'full')
const DPR = Number(opt('dpr', '2'))
const WIDTH = Number(opt('width', '1512'))
const HEIGHT = Number(opt('height', '945'))
const TRACE = !flag('no-trace')
/** Ölçülen tur sayısı (ısınmadan sonra); sonuç ortanca, kare boşlukları ve uzun kareler en kötü tur. */
const ROUNDS = Number(opt('rounds', '3'))
const THROTTLE = !flag('no-throttle')
/** İzleri dosyaya yazar (DevTools › Performance'ta açılabilir). */
const TRACES = opt('save-traces', null)
const ROUTE = '/is-akislari/bekleyen/satin-alma/bekleyen-satin-alma-0'
/** Form sunucudan gelene kadar iskelet (`LOAD_MS` 1 s) + pay. */
const LOAD_WAIT = 1800

/* --- Sayfaya yüklenen ölçüm araçları (ilk betikten önce) ---------------------------------------- */

function install(motion) {
  // Tema paneli › Animasyon (kayıtlı ayarların yalnızca bu anahtarı; geri kalanı varsayılan)
  if (motion !== 'full') {
    try {
      localStorage.setItem('synergy-v2-theme', JSON.stringify({ motion }))
    } catch {
      // Depolama kapalı: varsayılan
    }
  }
  // Ölçüm betiğinin kendi zamanlayıcıları sayılmasın
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
        scripts: e.scripts.map((s) => ({
          dur: Math.round(s.duration),
          fn: s.sourceFunctionName,
          inv: s.invoker,
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

  /** Görünür öğe: seçici, isteğe bağlı metin (içerir), sıra. */
  window.__find = (spec) => {
    const all = [...document.querySelectorAll(spec.css)].filter((el) => {
      if (spec.visible !== false && !el.checkVisibility()) return false
      if (spec.text && !el.textContent.includes(spec.text)) return false
      if (spec.has && el.querySelectorAll(spec.has).length < (spec.hasCount ?? 1)) return false
      return true
    })
    const el = all[spec.nth ?? 0]
    if (!el) return null
    return spec.inner ? el.querySelector(spec.inner) : el
  }

  /**
   * Bir etkileşim: 400 ms ısınma (kare döngüsü dönsün), tıklama, 1.5 s izleme. Tıklama görevi
   * tıklamadan sonraki ilk görevle (MessageChannel) kapanır: React'in eşzamanlı çizimi, düzen
   * etkileri ve Motion'ın ölçümü (mikro görevler) içinde.
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
    // Bölme başına DOM çalkantısı: name / type yazımı = React orada bir <input>'u yeniden çizdi
    const panes = [...document.querySelectorAll('[id^="form-pane-"]')]
    const churn = new Map(
      panes.map((p) => [
        p.id,
        {
          hidden: !p.checkVisibility(),
          inputWrites: 0,
          styleWrites: 0,
          attrWrites: 0,
        },
      ]),
    )
    const styled = new Map()
    let styleWrites = 0
    let attrWrites = 0
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type !== 'attributes') continue
        if (m.attributeName === 'style') {
          styleWrites++
          styled.set(m.target, (styled.get(m.target) ?? 0) + 1)
        } else attrWrites++
        const pane = m.target.closest?.('[id^="form-pane-"]')
        const c = pane && churn.get(pane.id)
        if (!c) continue
        if (m.attributeName === 'name' || m.attributeName === 'type') c.inputWrites++
        else if (m.attributeName === 'style') c.styleWrites++
        else c.attrWrites++
      }
    })
    mo.observe(document.body, { subtree: true, attributes: true })
    const el = spec ? window.__find(spec) : null
    if (spec && !el) {
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
      el.click()
      ch.port2.postMessage(0)
    }
    await wait(windowMs)
    stop = true
    mo.disconnect()
    const counts = { ...window.__cnt }
    const after = frames.filter((t) => t >= t0 - 1)
    const warm = frames.filter((t) => t < t0)
    const gapsWarm = warm.slice(1).map((t, i) => t - warm[i]).sort((a, b) => a - b)
    const interval = gapsWarm[Math.floor(gapsWarm.length / 2)] ?? 16.7
    const gaps = after.slice(1).map((t, i) => ({ at: after[i] - t0, gap: t - after[i] }))
    const dropped = gaps.reduce((n, g) => n + Math.max(0, Math.round(g.gap / interval) - 1), 0)
    // Elemente göre stil yazımı (en çok yazılanlar): hangi öğeler her karede yazılıyor
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
      clickTask: el ? Math.round((taskEnd - t0) * 10) / 10 : 0,
      frames: after.length,
      interval: Math.round(interval * 10) / 10,
      maxGap: Math.round(Math.max(0, ...gaps.map((g) => g.gap))),
      maxGap500: Math.round(Math.max(0, ...gaps.filter((g) => g.at < 500).map((g) => g.gap))),
      over20: gaps.filter((g) => g.gap > 20).length,
      over20in500: gaps.filter((g) => g.at < 500 && g.gap > 20).length,
      dropped,
      counts,
      loaf: window.__loaf.filter((l) => l.start + l.dur >= t0),
      styleWrites,
      styledElements: styled.size,
      attrWrites,
      topStyled: top,
      churn: Object.fromEntries(churn),
      dom: document.getElementsByTagName('*').length,
      inputs: document.querySelectorAll('input, textarea').length,
      forms: document.querySelectorAll('[id^="form-pane-"]').length,
    }
  }
}

/* --- İz kaydı: tıklama görevinin dökümü --------------------------------------------------------- */

const CATEGORIES = [
  ...(flag('invalidations') ? ['disabled-by-default-devtools.timeline.invalidationTracking'] : []),
  ...(flag('stacks') ? ['disabled-by-default-devtools.timeline.stack'] : []),
  'toplevel',
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'v8.execute',
]

/** Ana iş parçacığında tıklamanın görevi: süre, zorunlu stil / düzen, betik; penceredeki uzun görevler. */
function analyze(trace) {
  const events = trace.traceEvents ?? trace
  const click = events.find((e) => e.name === 'EventDispatch' && e.args?.data?.type === 'click')
  const names = new Map()
  for (const e of events)
    if (e.ph === 'M' && e.name === 'thread_name') names.set(`${e.pid}:${e.tid}`, e.args.name)
  const main =
    (click && `${click.pid}:${click.tid}`) ??
    [...names].find(([, v]) => v === 'CrRendererMain')?.[0]
  if (!main) return null
  const onMain = events.filter((e) => e.ph === 'X' && `${e.pid}:${e.tid}` === main)
  const tasks = onMain.filter((e) => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask')
  const longTasks = tasks.filter((t) => t.dur > 50_000).map((t) => Math.round(t.dur / 100) / 10)
  const maxTask = Math.round(Math.max(0, ...tasks.map((t) => t.dur)) / 100) / 10
  if (!click) return { clickTask: null, longTasks, maxTask }
  const task = tasks
    .filter((t) => t.ts <= click.ts && click.ts <= t.ts + t.dur)
    .sort((a, b) => a.dur - b.dur)[0]
  if (!task) return { clickTask: null, longTasks, maxTask }
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
  }
}

/** Penceredeki ana iş parçacığı işinin dökümü (ad başına toplam ms): betik, stil, düzen, boyama. */
function rendering(trace) {
  const events = trace.traceEvents ?? trace
  const click = events.find((e) => e.name === 'EventDispatch' && e.args?.data?.type === 'click')
  const names = new Map()
  for (const e of events)
    if (e.ph === 'M' && e.name === 'thread_name') names.set(`${e.pid}:${e.tid}`, e.args.name)
  const main =
    (click && `${click.pid}:${click.tid}`) ??
    [...names].find(([, v]) => v === 'CrRendererMain')?.[0]
  const pick = new Set([
    'FunctionCall', 'EvaluateScript', 'RunMicrotasks', 'FireAnimationFrame', 'UpdateLayoutTree',
    'Layout', 'PrePaint', 'Paint', 'Layerize', 'Commit', 'UpdateLayer', 'HitTest',
  ])
  const from = click ? click.ts : 0
  const out = {}
  for (const e of events) {
    if (e.ph !== 'X' || `${e.pid}:${e.tid}` !== main || !pick.has(e.name) || e.ts < from) continue
    out[e.name] = (out[e.name] ?? 0) + e.dur / 1000
  }
  for (const k in out) out[k] = Math.round(out[k] * 10) / 10
  return out
}

/* --- Koşu --------------------------------------------------------------------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** 4× koşusunda mı (iz dosyalarının adı için). */
let THROTTLED = false

/** Etkileşimin başında gizli olan bölmelerdeki input yazımı (React orada bir <input>'u yeniden çizdi). */
const hiddenWrites = (m) =>
  Object.values(m.churn ?? {})
    .filter((c) => c.hidden)
    .reduce((n, c) => n + c.inputWrites, 0)

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: !flag('headed'),
  defaultViewport: { width: WIDTH, height: HEIGHT, deviceScaleFactor: DPR },
  args: [`--window-size=${WIDTH},${HEIGHT + 120}`],
})
const version = await browser.version()
const page = await browser.newPage()
await page.evaluateOnNewDocument(install, MOTION)
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})

/** Görünür öğe çıkana kadar bekler. */
async function waitFor(spec, timeout = 10_000) {
  await page.waitForFunction((s) => !!window.__find(s), { timeout, polling: 50 }, spec)
}
/** Öğeye programla tıklar (ölçümsüz kurulum adımları). */
async function click(spec) {
  await waitFor(spec)
  await page.evaluate((s) => window.__find(s).click(), spec)
}

/** Bir etkileşimi ölçer (isteğe bağlı iz kaydıyla). */
async function measure(label, spec, windowMs) {
  if (spec) await waitFor(spec)
  if (TRACE) await page.tracing.start({ categories: CATEGORIES })
  const m = await page.evaluate((l, s, w) => window.__measure(l, s, w), label, spec, windowMs)
  if (TRACE) {
    const buf = await page.tracing.stop()
    const json = JSON.parse(Buffer.from(buf).toString('utf8'))
    m.trace = analyze(json)
    m.render = rendering(json)
    if (TRACES) {
      mkdirSync(TRACES, { recursive: true })
      writeFileSync(`${TRACES}/${THROTTLED ? 't-' : ''}${label}-${Date.now()}.json`, Buffer.from(buf))
    }
  }
  await sleep(300)
  return m
}

const B = (text) => ({ css: 'button', text })
const SCENARIOS = {
  A: { title: 'Grup geçişi (g1 → g0)', spec: { css: '[data-tab^="g0:"] [role=tab]' } },
  B: {
    title: 'Sekme geçişi: yan yana sekmeye',
    spec: { css: '[data-tab^="g0:"]', has: '[role=tab]', hasCount: 2, inner: '[role=tab]' },
  },
  C: { title: 'Sekme geçişi: tek formlu sekmeye', spec: { css: '[data-tab^="g0:"] [role=tab]' } },
  D: { title: 'Grup geçişi (g0 → g1)', spec: { css: '[data-tab^="g1:"] [role=tab]' } },
  E: { title: 'Child aç, panel boyutu 3 (yeni sekme)', spec: B('Mevcut Sözleşmeyi Aç') },
  F: { title: 'Sekme geçişi: g1 kökü', spec: { css: '[data-tab^="g1:"] [role=tab]' } },
  G: { title: 'Child sekmesini kapat', spec: { css: '[aria-label^="Kapat: Bakım"]' } },
  H: { title: 'Boşta 1.5 s', spec: null },
}

/** Sayısal alanların ortancası (zamanlama gürültülü: birkaç tur), kare ve uzun kare için en kötüsü. */
function aggregate(list) {
  const med = (xs) => {
    const v = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b)
    return v.length ? v[Math.floor((v.length - 1) / 2)] : null
  }
  const last = list[list.length - 1]
  const worst = ['maxGap', 'maxGap500', 'over20', 'over20in500', 'dropped']
  const out = { ...last, rounds: list.length }
  for (const k of ['clickTask', 'frames', 'styleWrites', 'styledElements', 'attrWrites'])
    out[k] = med(list.map((m) => m[k]))
  for (const k of worst) out[k] = Math.max(...list.map((m) => m[k] ?? 0))
  out.counts = Object.fromEntries(Object.keys(last.counts).map((k) => [k, med(list.map((m) => m.counts[k]))]))
  if (last.trace)
    out.trace = Object.fromEntries(
      Object.keys(last.trace).map((k) => [
        k,
        Array.isArray(last.trace[k]) ? list.flatMap((m) => m.trace?.[k] ?? []) : med(list.map((m) => m.trace?.[k])),
      ]),
    )
  // Uzun kareler: bütün turların (en kötü durum)
  out.loaf = list.flatMap((m) => m.loaf)
  out.loafPerRound = list.map((m) => m.loaf.length)
  // Gizli bölmelere yazım: turların toplamı (sıfır olmalı)
  out.hiddenWrites = list.reduce((n, m) => n + hiddenWrites(m), 0)
  return out
}

/** Bir kez ısınma turu (ilk koşu antd'nin tek seferlik stil basımını içerir), sonra `ROUNDS` tur. */
async function run(ids) {
  const all = Object.fromEntries(ids.map((id) => [id, []]))
  for (let round = 0; round <= ROUNDS; round++)
    for (const id of ids) {
      const m = await measure(id, SCENARIOS[id].spec)
      if (m.error) throw new Error(`${id}: ${m.error}`)
      // Etkileşim yeni form açtıysa form gelene kadar bekle
      if (id === 'E') await sleep(LOAD_WAIT - 1500 + 200)
      if (round > 0) all[id].push(m)
    }
  return Object.fromEntries(ids.map((id) => [id, { title: SCENARIOS[id].title, ...aggregate(all[id]) }]))
}

console.error(`Chrome ${version}, ${WIDTH}×${HEIGHT} @${DPR}x, animasyon: ${MOTION}`)
await page.goto(URL_BASE + ROUTE, { waitUntil: 'networkidle0' })
// Kurulum: yan yana (2), kök kendi sekmesine (1), ikinci grup (Süreçler izinden 20014)
await waitFor(B('Tedarikçi Teklifi Ekle'))
await click(B('Tedarikçi Teklifi Ekle'))
await sleep(LOAD_WAIT)
await click(B('Tedarikçi Kartını Aç'))
await sleep(LOAD_WAIT)
await click({ css: '[data-tab^="g0:"] [role=tab]' })
await sleep(600)
await click({ css: 'button[aria-label^="Süreçler"]' })
await waitFor({ css: '.ant-popover .ant-table-row', text: '20014' })
await sleep(300)
await click({ css: '.ant-popover .ant-table-row', text: '20014' })
await sleep(LOAD_WAIT)

const normal = { ...(await run(['A', 'B', 'C', 'D'])), ...(await run(['E', 'F', 'G'])) }
normal.H = { title: SCENARIOS.H.title, ...aggregate([await measure('H', null), await measure('H', null)]) }
// Kare boşlukları: 4× yavaşlatma, 60 Hz (başsız Chrome'un varsayılanı)
let throttled = null
if (THROTTLE) {
  THROTTLED = true
  await page.emulateCPUThrottling(4)
  throttled = await run(['A', 'B', 'C', 'D'])
  await page.emulateCPUThrottling(null)
}
await browser.close()

let commit = ''
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  // git yok
}
const result = {
  meta: {
    date: new Date().toISOString(),
    chrome: version,
    viewport: `${WIDTH}x${HEIGHT}@${DPR}`,
    motion: MOTION,
    url: URL_BASE + ROUTE,
    commit,
    trace: TRACE,
  },
  normal,
  throttled,
  errors,
}

/* --- Tablo -------------------------------------------------------------------------------------- */

const lines = [
  `Chrome ${version} · ${WIDTH}×${HEIGHT} @${DPR}x · animasyon ${MOTION} · ${result.meta.date}`,
  '',
  '| Senaryo | Tıklama görevi (ms) | Betik (ms) | Zorunlu stil/düzen (ms) | En uzun görev (ms) | LoAF >50 ms | gBCR | offset* / client* | gCS | Gizli bölmede input yazımı | Stil yazımı (öğe) | >20 ms kare | En büyük boşluk (ms) |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
]
for (const [id, m] of Object.entries(normal)) {
  const t = m.trace ?? {}
  lines.push(
    `| ${id} ${m.title} | ${t.clickTask ?? m.clickTask} | ${t.script ?? '–'} | ${t.forced ?? '–'} | ${t.maxTask ?? '–'} | ${m.loaf.length ? `${m.loaf.length} (${Math.max(...m.loaf.map((l) => l.dur))})` : 0} | ${m.counts.gbcr} | ${m.counts.offset} / ${m.counts.client} | ${m.counts.gcs} | ${m.hiddenWrites} | ${m.styleWrites} (${m.styledElements}) | ${m.over20} | ${m.maxGap} |`,
  )
}
if (throttled) {
  lines.push('', '4× yavaşlatma, 60 Hz: tıklamadan sonraki 500 ms', '')
  lines.push('| Senaryo | Tıklama görevi (ms) | En büyük boşluk, ilk 500 ms (ms) | >20 ms kare, ilk 500 ms | LoAF >50 ms |')
  lines.push('|---|---|---|---|---|')
  for (const [id, m] of Object.entries(throttled))
    lines.push(
      `| ${id} ${m.title} | ${m.trace?.clickTask ?? m.clickTask} | ${m.maxGap500} | ${m.over20in500} | ${m.loaf.length ? `${m.loaf.length} (${Math.max(...m.loaf.map((l) => l.dur))})` : 0} |`,
    )
}
if (errors.length) lines.push('', `Konsol hataları: ${errors.length}`, ...errors.map((e) => `- ${e}`))
const table = lines.join('\n')
console.log(table)
if (OUT) {
  writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n')
  writeFileSync(OUT.replace(/\.json$/, '.md'), table + '\n')
  console.error(`yazıldı: ${OUT}`)
}
