#!/usr/bin/env node
/*
 * Çalışma alanı (uygulama genelindeki sekmeler) ölçümü: üretim derlemesi üzerinde, puppeteer-core ile.
 * Düzen (`SETUP_URL`): Başlangıç, listenin üstünde talep + yan yana child (panel boyutu 2), kendi
 * sekmesinde talep, İK, uygulama formu, ayrı bir liste; yedi ekran takılı. Sonra etkileşimler:
 *   A–F sekme geçişleri (Başlangıç, yan yana, tek form, İK, uygulama, liste),
 *   G–H child aç (boyut 3, yeni sekme) / kapat,
 *   I–L listede: talebi yerinde aç, tarayıcı geri, ileri, kabuğun Geri düğmesi,
 *   M–N Cmd+tık (arka planda yeni sekme) / o sekmeyi kapat,
 *   O–P yan yana al / ayır, Q–R raf (İK, İş Akış Yönetimi), Z boşta.
 * Her etkileşim önce bir ısınma turu koşar (ilk koşu antd'nin tek seferlik stil basımını içerir),
 * sonraki turların ortancası raporlanır (`--rounds`, varsayılan 3; uzun kareler ve kare boşlukları en
 * kötü tur). A–F ayrıca 4× işlemci yavaşlatmasıyla (60 Hz) kare boşlukları için.
 *
 *   npm run build && npx vite preview --port 4173 --strictPort &
 *   node scripts/perf/tabs.mjs --out scripts/perf/workspace-after.json
 *
 * Seçenekler: --url (http://localhost:4173), --chrome <yol>, --out <json> (yanına .md tablo),
 * --motion full|reduced|off (tema paneli › Animasyon), --dpr 2, --width 1512 --height 945,
 * --headed, --no-trace (iz kaydı olmadan), --no-throttle (4× koşusunu atla), --only A,B,…,
 * --save-traces <klasör> (izleri yazar), --invalidations, --stacks.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import {
  CATEGORIES,
  IN,
  LOAD_WAIT,
  SETUP_URL,
  STRIP,
  TAB,
  URL_BASE,
  analyze,
  click,
  flag,
  install,
  launch,
  mouseClick,
  opt,
  rendering,
  settled,
  sleep,
  tabs,
  waitFor,
} from './harness.mjs'

const OUT = opt('out', null)
const MOTION = opt('motion', 'full')
const DPR = Number(opt('dpr', '2'))
const WIDTH = Number(opt('width', '1512'))
const HEIGHT = Number(opt('height', '945'))
const TRACE = !flag('no-trace')
const ROUNDS = Number(opt('rounds', '3'))
const THROTTLE = !flag('no-throttle')
const TRACES = opt('save-traces', null)
const ONLY = opt('only', null)?.split(',')

const browser = await launch({ width: WIDTH, height: HEIGHT, dpr: DPR })
const version = await browser.version()
const page = await browser.newPage()
// Görünüm sabit (eski derlemeyle karşılaştırırken de aynı: Sıkı yoğunluk, gölgesiz)
await page.evaluateOnNewDocument(install, {
  measure: true,
  theme: { density: 'tight', shadow: 'none', ...(MOTION === 'full' ? {} : { motion: MOTION }) },
})
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
let THROTTLED = false

/** Bir etkileşimi ölçer (isteğe bağlı iz kaydıyla). */
async function measure(label, spec, windowMs) {
  if (spec?.css) await waitFor(page, spec).catch(() => {
    throw new Error(`${label}: bulunamadı ${JSON.stringify(spec)}`)
  })
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
  m.settled = await settled(page)
  await sleep(300)
  return m
}

/* --- Kurulum ------------------------------------------------------------------------------------ */

console.error(`Chrome ${version}, ${WIDTH}×${HEIGHT} @${DPR}x, animasyon: ${MOTION}`)
await page.goto(URL_BASE + SETUP_URL, { waitUntil: 'networkidle0' })
await waitFor(page, IN('button', 'Tedarikçi Teklifi Ekle'))
await click(page, IN('button', 'Tedarikçi Teklifi Ekle'))
await sleep(LOAD_WAIT)
// Ekranların anahtarları şeritten (adlarıyla)
const initial = await tabs(page)
const key = (name, nth = 0) => initial.filter((t) => t.name.includes(name))[nth]?.screen
const K = {
  start: 'start',
  form: key('Satın Alma Talep Formu', 0),
  child: key('Tedarikçi Teklif Formu'),
  own: key('Satın Alma Talep Formu', 1),
  hr: key('Kullanıcılar'),
  app: key('Personel Rehberi'),
  list: key('Masraf Bildirimi'),
}
for (const [k, v] of Object.entries(K)) if (!v) throw new Error(`kurulum: ${k} sekmesi yok`)

/** Sayfa içi eylemler (`run`): tarayıcı geri / ileri. */
await page.evaluate(() => {
  window.__back = () => history.back()
  window.__forward = () => history.forward()
})

const ROW = { css: `#screen-pane-${K.list} tr[data-open-path]`, nth: 3 }
/** Son açılan arka plan sekmesinin kapatma düğmesi (şeridin sonundaki sekme). */
const LAST_CLOSE = { css: `${STRIP} button[aria-label^="Kapat: "]`, visible: false, last: true }

const SCENARIOS = {
  A: { title: 'Geçiş: Başlangıç', spec: TAB(K.start) },
  B: { title: 'Geçiş: yan yana sekme', spec: TAB(K.form) },
  C: { title: 'Geçiş: tek form', spec: TAB(K.own) },
  D: { title: 'Geçiş: İK', spec: TAB(K.hr) },
  E: { title: 'Geçiş: uygulama formu', spec: TAB(K.app) },
  F: { title: 'Geçiş: liste', spec: TAB(K.list) },
  G: { title: 'Child aç, boyut 3 (yeni sekme)', spec: IN('button', 'Mevcut Sözleşmeyi Aç'), wait: LOAD_WAIT - 1500 + 200 },
  H: { title: 'Child sekmesini kapat', spec: { css: `${STRIP} button[aria-label="Kapat: Bakım Sözleşmesi Formu"]`, visible: false } },
  I: { title: 'Listede talebi yerinde aç', spec: ROW, wait: LOAD_WAIT - 1500 + 200 },
  // Her turda başka (ilk kez açılan) talep: okundu olur, gizli listeler ve sayılar güncellenir
  I2: {
    title: 'Listede ilk kez açılan talep',
    spec: (round) => ({ css: `#screen-pane-${K.list} tr[data-open-path]`, nth: 4 + round }),
    wait: LOAD_WAIT - 1500 + 200,
  },
  J: { title: 'Tarayıcı geri (form kapanır)', spec: { run: '__back' } },
  K: { title: 'Tarayıcı ileri (form açılır)', spec: { run: '__forward' }, wait: LOAD_WAIT - 1500 + 200 },
  L: { title: 'Kabuğun Geri düğmesi (listeye dönüş)', spec: { css: 'button[aria-label="Geri"]:not([id^="screen-pane-"] button)' } },
  M: { title: 'Cmd+tık: arka planda yeni sekme', spec: { ...ROW, meta: true }, wait: LOAD_WAIT - 1500 + 200 },
  N: { title: 'Arka plandaki sekmeyi kapat', spec: LAST_CLOSE },
  O: {
    title: 'Yan yana al (sekmenin menüsünden)',
    spec: { css: '.ant-dropdown:not(.ant-dropdown-hidden) li[role=menuitem]', text: 'Yan yana aç' },
  },
  P: { title: 'Ayrı sekmelere ayır', spec: { css: 'button[aria-label="Ayrı sekmelere ayır"]' } },
  Q: { title: 'Raf: İK sekmesine geç', spec: { css: '[role=list][aria-label="Uygulamalar"] a[aria-label="İnsan Kaynakları"]' } },
  R: { title: 'Raf: İş Akış Yönetimi sekmesine geç', spec: { css: '[role=list][aria-label="Uygulamalar"] a[aria-label="İş Akış Yönetimi"]' } },
  Z: { title: 'Boşta 1.5 s', spec: null },
}

/** Turdan önce (ölçülmeyen) hazırlık: etkileşimin başlangıç durumu. */
const BEFORE = {
  G: async () => {
    await click(page, TAB(K.own))
    await sleep(600)
  },
  I: async () => {
    await click(page, TAB(K.list))
    await sleep(600)
  },
  I2: async () => {
    await click(page, TAB(K.list))
    await sleep(600)
  },
  M: async () => {
    await click(page, TAB(K.list))
    await sleep(600)
  },
  O: async () => {
    await click(page, TAB(K.list))
    await sleep(600)
    // Kendi sekmesindeki talebin menüsü (sağ tık)
    await mouseClick(page, TAB(K.own), { button: 'right' })
    await sleep(400)
  },
  Q: async () => {
    await click(page, TAB(K.start))
    await sleep(600)
  },
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
  for (const k of ['clickTask', 'frames', 'styleWrites', 'styledElements', 'attrWrites', 'added'])
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
  if (last.render)
    out.render = {
      ...last.render,
      forcedInJs: med(list.map((m) => m.render?.forcedInJs)),
      forcedLayouts: med(list.map((m) => m.render?.forcedLayouts)),
    }
  out.loaf = list.flatMap((m) => m.loaf)
  out.loafPerRound = list.map((m) => m.loaf.length)
  // Gizli kalan bölmelere yazım ve düğüm çalkantısı: turların toplamı (sıfır olmalı)
  out.hiddenWrites = list.reduce(
    (n, m) => n + Object.values(m.churn).filter((c) => c.hidden).reduce((s, c) => s + c.inputWrites, 0),
    0,
  )
  out.hiddenNodes = list.reduce(
    (n, m) =>
      n +
      Object.entries(m.churn)
        .filter(([, c]) => c.hidden)
        .reduce((s, [, c]) => s + c.nodes, 0),
    0,
  )
  out.settled = [...new Set(list.flatMap((m) => m.settled))]
  return out
}

/** Bir kez ısınma turu, sonra `ROUNDS` tur; her tur kimlikleri sırayla koşar. */
async function run(ids) {
  ids = ids.filter((id) => !ONLY || ONLY.includes(id))
  if (!ids.length) return {}
  const all = Object.fromEntries(ids.map((id) => [id, []]))
  for (let round = 0; round <= ROUNDS; round++)
    for (const id of ids) {
      await BEFORE[id]?.()
      const s = SCENARIOS[id]
      if (flag('verbose')) console.error(`  tur ${round} ${id}`)
      const m = await measure(id, typeof s.spec === 'function' ? s.spec(round) : s.spec)
      if (m.error) throw new Error(`${id}: ${m.error}`)
      if (s.wait > 0) await sleep(s.wait)
      if (round > 0) all[id].push(m)
    }
  return Object.fromEntries(ids.map((id) => [id, { title: SCENARIOS[id].title, ...aggregate(all[id]) }]))
}

const normal = {
  ...(await run(['A', 'B', 'C', 'D', 'E', 'F'])),
  ...(await run(['G', 'H'])),
  ...(await run(['I', 'J', 'K', 'L'])),
  ...(await run(['I2', 'L'])),
  ...(await run(['M', 'N'])),
  ...(await run(['O', 'P'])),
  ...(await run(['Q', 'R'])),
}
if (!ONLY || ONLY.includes('Z'))
  normal.Z = { title: SCENARIOS.Z.title, ...aggregate([await measure('Z', null), await measure('Z', null)]) }
// Kare boşlukları: 4× yavaşlatma, 60 Hz (başsız Chrome'un varsayılanı)
let throttled = null
if (THROTTLE) {
  THROTTLED = true
  await page.emulateCPUThrottling(4)
  throttled = await run(['A', 'B', 'C', 'D', 'E', 'F'])
  await page.emulateCPUThrottling(null)
}
const finalTabs = await tabs(page)
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
    url: URL_BASE + SETUP_URL,
    commit,
    trace: TRACE,
    screens: K,
    finalTabs,
  },
  normal,
  throttled,
  errors,
}

/* --- Tablo -------------------------------------------------------------------------------------- */

/** Uzun kareler: sayı (en uzun ms @ eylemden sonraki ms). */
const loafText = (m) => {
  if (!m.loaf.length) return 0
  const worst = m.loaf.reduce((a, b) => (b.dur > a.dur ? b : a))
  return `${m.loaf.length} (${worst.dur} @${worst.at})`
}
const lines = [
  `Chrome ${version} · ${WIDTH}×${HEIGHT} @${DPR}x · animasyon ${MOTION} · ${result.meta.date}`,
  '',
  '| Senaryo | Tıklama görevi (ms) | Zorunlu stil/düzen, tıklamada (ms) | Betiğin zorladığı stil/düzen, pencerede (ms) | En uzun görev (ms) | 1 s içinde iş (ms) | LoAF >50 ms | gBCR | offset* / client* | Gizli bölmede yazım / düğüm | Stil yazımı (öğe) | >20 ms kare | En büyük boşluk (ms) | Oturma |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
]
for (const [id, m] of Object.entries(normal)) {
  const t = m.trace ?? {}
  lines.push(
    `| ${id} ${m.title} | ${t.clickTask ?? m.clickTask} | ${t.forced ?? '–'} | ${m.render?.forcedInJs ?? '–'} | ${t.maxTask ?? '–'} | ${t.busy ?? '–'} | ${loafText(m)} | ${m.counts.gbcr} | ${m.counts.offset} / ${m.counts.client} | ${m.hiddenWrites} / ${m.hiddenNodes} | ${m.styleWrites} (${m.styledElements}) | ${m.over20} | ${m.maxGap} | ${m.settled.length ? m.settled.join('; ') : 'tamam'} |`,
  )
}
if (throttled && Object.keys(throttled).length) {
  lines.push('', '4× yavaşlatma, 60 Hz: tıklamadan sonraki 500 ms', '')
  lines.push('| Senaryo | Tıklama görevi (ms) | En uzun görev (ms) | En büyük boşluk, ilk 500 ms (ms) | >20 ms kare, ilk 500 ms | LoAF >50 ms |')
  lines.push('|---|---|---|---|---|---|')
  for (const [id, m] of Object.entries(throttled))
    lines.push(
      `| ${id} ${m.title} | ${m.trace?.clickTask ?? m.clickTask} | ${m.trace?.maxTask ?? '–'} | ${m.maxGap500} | ${m.over20in500} | ${loafText(m)} |`,
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
