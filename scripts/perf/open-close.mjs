#!/usr/bin/env node
/*
 * Sekme açma ve kapama ölçümü (üretim derlemesi, puppeteer-core): Başlangıç'tan yeni sekme (talep,
 * uygulama), raftan yeni sekme, tek sekmeyi kapatıp Başlangıç'a dönme, seçili sekmeyi kapatma
 * (komşusu gelir), bütün sekmeleri art arda kapatma. Her tur temiz sayfada (adresten kurulur, 2.5 s
 * boşta: uyuyan bölmeler uyanır); `warm` senaryolar önce aynı türden bir aç / kapa yapar (antd'nin
 * tek seferlik stil basımı dışarıda kalır). Tıklama görevi, en uzun görev, uzun kareler (betik /
 * zorunlu düzen / çizim dökümüyle), kare boşlukları, Motion'ın ölçümleri (gBCR), betiğin zorladığı
 * stil / düzen, boyama.
 *
 *   node scripts/perf/open-close.mjs [--cpu 4] [--rounds 3] [--only S1,S4] [--out <json>]
 */
import { writeFileSync } from 'node:fs'
import {
  CATEGORIES,
  LOAD_WAIT,
  STRIP,
  TAB,
  URL_BASE,
  analyze,
  click,
  install,
  launch,
  opt,
  rendering,
  sleep,
  tabs,
  waitFor,
} from './harness.mjs'

const CPU = Number(opt('cpu', '1'))
const ROUNDS = Number(opt('rounds', '3'))
const ONLY = opt('only', null)?.split(',')
const OUT = opt('out', null)
const DPR = Number(opt('dpr', '2'))

const browser = await launch({ dpr: DPR })
const ROW = (n) => ({ css: '#screen-pane-start tr[data-open-path]', nth: n })
const PROCESS = { css: '#screen-pane-start [role=option][aria-label^="Satın Alma Yönetimi"]' }
const CLOSE = (name) => ({ css: `${STRIP} button[aria-label="Kapat: ${name}"]`, visible: false })
const SELECTED_CLOSE = { css: `${STRIP} [data-tab][data-selected] button[aria-label^="Kapat: "]`, visible: false }

/** Başlangıç'ta süreç seçili, satırlar gelmiş. */
async function startWithRows(page) {
  await click(page, PROCESS)
  await waitFor(page, ROW(0))
  await sleep(500)
}

const SCENARIOS = {
  S1: {
    title: 'Başlangıç → yeni sekmede talep',
    url: '/calisma-alani',
    setup: startWithRows,
    spec: ROW(0),
    window: 1800,
  },
  S1w: {
    title: 'Başlangıç → yeni sekmede talep (ikinci kez)',
    url: '/calisma-alani',
    setup: async (page) => {
      await startWithRows(page)
      await click(page, ROW(1))
      await sleep(LOAD_WAIT)
      await click(page, SELECTED_CLOSE)
      await sleep(900)
    },
    spec: ROW(0),
    window: 1800,
  },
  S2: {
    title: 'Başlangıç → Favoriler’den uygulama',
    url: '/calisma-alani',
    spec: { css: '#screen-pane-start a', text: 'Personel Rehberi' },
    window: 1800,
  },
  S3: {
    title: 'Raf → İK (yeni sekme)',
    url: '/calisma-alani',
    spec: { css: '[role=list][aria-label="Uygulamalar"] a[aria-label="İnsan Kaynakları"]' },
  },
  S4: {
    title: 'Tek sekme (talep) kapanır → Başlangıç',
    url: '/talepler/bekleyen-satin-alma-0',
    spec: CLOSE('Satın Alma Talep Formu'),
  },
  S5: {
    title: 'Tek sekme (İK) kapanır → Başlangıç',
    url: '/insan-kaynaklari/kullanicilar',
    spec: CLOSE('Kullanıcılar'),
  },
  S6: {
    title: 'Seçili sekme kapanır → komşusu gelir',
    url: '/insan-kaynaklari/kullanicilar?sekmeler=ia.bekleyen.masraf,*,u.personel-rehberi',
    spec: CLOSE('Kullanıcılar'),
  },
  S7: {
    title: 'Dört sekme art arda kapanır → Başlangıç',
    url: '/insan-kaynaklari/kullanicilar?sekmeler=ia.bekleyen.masraf,u.personel-rehberi,t.bekleyen-satin-alma-1,*',
    spec: { run: '__closeAll' },
    window: 2600,
  },
  S8: {
    title: 'Başlangıç’a geç (sekmeler açık kalır)',
    url: '/insan-kaynaklari/kullanicilar?sekmeler=ia.bekleyen.masraf,u.personel-rehberi,*',
    spec: TAB('start'),
  },
}

async function round(id) {
  const s = SCENARIOS[id]
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(install, {
    measure: true,
    theme: { density: 'tight', shadow: 'none' },
  })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(URL_BASE + s.url, { waitUntil: 'networkidle0' })
  await waitFor(page, { css: STRIP, visible: false })
  await sleep(2500)
  await s.setup?.(page)
  // Seçili sekmeyi 4 kez art arda kapatır (her biri 350 ms sonra)
  await page.evaluate((sel) => {
    window.__closeAll = () => {
      let n = 0
      const next = () => {
        document.querySelector(sel)?.click()
        if (++n < 4) window.__realTimeout(next, 350)
      }
      next()
    }
  }, SELECTED_CLOSE.css)
  if (CPU > 1) await page.emulateCPUThrottling(CPU)
  if (s.spec.css) await waitFor(page, s.spec)
  await page.tracing.start({ categories: CATEGORIES })
  const m = await page.evaluate((l, sp, w) => window.__measure(l, sp, w), id, s.spec, s.window ?? 1500)
  const buf = await page.tracing.stop()
  const json = JSON.parse(Buffer.from(buf).toString('utf8'))
  m.trace = analyze(json)
  m.render = rendering(json)
  if (CPU > 1) await page.emulateCPUThrottling(null)
  m.tabs = (await tabs(page)).map((t) => t.name)
  m.errors = errors
  await page.close()
  if (m.error) throw new Error(`${id}: ${m.error}`)
  return m
}

const med = (xs) => {
  const v = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b)
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null
}

const results = {}
for (const id of Object.keys(SCENARIOS).filter((k) => !ONLY || ONLY.includes(k))) {
  const runs = []
  for (let r = 0; r < ROUNDS; r++) runs.push(await round(id))
  const loaf = runs.flatMap((m) => m.loaf)
  const worst = loaf.reduce((a, b) => (b && (!a || b.dur > a.dur) ? b : a), null)
  results[id] = {
    title: SCENARIOS[id].title,
    clickTask: med(runs.map((m) => m.trace?.clickTask ?? m.clickTask)),
    maxTask: med(runs.map((m) => m.trace?.maxTask)),
    busy: med(runs.map((m) => m.trace?.busy)),
    forcedInJs: med(runs.map((m) => m.render?.forcedInJs)),
    paint: med(runs.map((m) => m.render?.Paint)),
    layerize: med(runs.map((m) => m.render?.Layerize)),
    style: med(runs.map((m) => m.render?.UpdateLayoutTree)),
    layout: med(runs.map((m) => m.render?.Layout)),
    gbcr: med(runs.map((m) => m.counts.gbcr)),
    styleWrites: med(runs.map((m) => m.styleWrites)),
    maxGap: Math.max(...runs.map((m) => m.maxGap)),
    maxGap500: Math.max(...runs.map((m) => m.maxGap500)),
    dropped: med(runs.map((m) => m.dropped)),
    loaf: loaf.length,
    worst,
    tabs: runs[0].tabs,
    errors: runs.flatMap((m) => m.errors),
  }
  const x = results[id]
  console.error(`${id} ${x.title}: görev ${x.maxTask} ms, boşluk ${x.maxGap} ms, LoAF ${x.loaf}`)
}
await browser.close()

const lines = [
  `Sekme aç / kapa · ${CPU}× işlemci · DPR ${DPR} · ${ROUNDS} tur · ${new Date().toISOString()}`,
  '',
  '| Senaryo | Tıklama görevi | En uzun görev | 1 s içinde iş | Betiğin zorladığı stil/düzen | Stil / düzen / boyama / katman (ms) | gBCR | Stil yazımı | En büyük boşluk (ilk 500 ms) | Düşen kare | Uzun kare (en kötüsü: süre @ms, betik / zorunlu / çizim) |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
]
for (const [id, x] of Object.entries(results)) {
  const w = x.worst
  const worst = w
    ? `${x.loaf}: ${w.dur} @${w.at} (${w.scripts.reduce((n, s) => n + s.dur, 0)} / ${w.scripts.reduce((n, s) => n + s.forced, 0)} / ${w.render})`
    : 0
  lines.push(
    `| ${id} ${x.title} | ${x.clickTask} | ${x.maxTask} | ${x.busy} | ${x.forcedInJs} | ${x.style} / ${x.layout} / ${x.paint} / ${x.layerize} | ${x.gbcr} | ${x.styleWrites} | ${x.maxGap} (${x.maxGap500}) | ${x.dropped} | ${worst} |`,
  )
}
const errs = Object.values(results).flatMap((x) => x.errors)
if (errs.length) lines.push('', 'Hatalar:', ...errs.map((e) => `- ${e}`))
console.log(lines.join('\n'))
if (OUT) {
  writeFileSync(OUT, JSON.stringify(results, null, 2) + '\n')
  writeFileSync(OUT.replace(/\.json$/, '.md'), lines.join('\n') + '\n')
}
