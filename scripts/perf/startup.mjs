#!/usr/bin/env node
/*
 * Açılış ölçümü (üretim derlemesi, puppeteer-core): adresten kurulan çalışma alanı ilk boyamaya ne
 * kadar sürede gelir, en uzun kare, uzun karelerin toplamı ve gizli bölmelerin içinde okunan
 * ölçüler (`content-visibility: hidden` alt ağacını düzene zorlar). Gizli kurulan bölmeler uyur
 * (`Panes.tsx`): ilk çizim yalnızca görünen ekranlar kadar olmalı, gizli bölmede ölçüm olmamalı.
 * Her adres 3 kez (ortanca), 4 s izlenir (uyuyan bölmeler boşta uyanır).
 *
 *   node scripts/perf/startup.mjs [--url http://localhost:4173] [--dpr 2] [--out <json>]
 */
import { writeFileSync } from 'node:fs'
import { SETUP_URL, URL_BASE, launch, opt, sleep } from './harness.mjs'

const DPR = Number(opt('dpr', '2'))
const OUT = opt('out', null)
const PAGES = [
  ['Yalnız Başlangıç', '/calisma-alani'],
  ['Tek liste', '/is-akislari/bekleyen/masraf'],
  ['Altı sekme (ölçüm düzeni)', SETUP_URL],
  [
    'On iki ekran',
    '/calisma-alani?sekmeler=ia.bekleyen.masraf,ia.bekleyen.izin,ia.bekleyen.sozlesme,ia.bekleyen.dof,ia.bekleyen.egitim,ia.bekleyen.arac,ia.bekleyen.yetki,ik.kullanicilar,ik.pozisyonlar,ik.departmanlar,ik.sirketler,*',
  ],
]

/** Uzun kareler ve gizli bölmedeki ölçüm okumaları (ilk betikten önce). */
function probe() {
  window.__loaf = []
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) window.__loaf.push({ start: e.startTime, dur: e.duration })
  }).observe({ type: 'long-animation-frame', buffered: true })
  window.__hidden = 0
  const hidden = (el) => {
    const p = el?.closest?.('[id^="screen-pane-"]')
    return !!p && p !== el && getComputedStyle(p).contentVisibility === 'hidden'
  }
  const count = (el) => {
    if (hidden(el)) window.__hidden++
  }
  const P = Element.prototype
  const gbcr = P.getBoundingClientRect
  P.getBoundingClientRect = function () {
    count(this)
    return gbcr.call(this)
  }
  for (const k of ['offsetWidth', 'offsetHeight', 'offsetLeft', 'offsetTop']) {
    const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, k)
    Object.defineProperty(HTMLElement.prototype, k, {
      configurable: true,
      get() {
        count(this)
        return d.get.call(this)
      },
    })
  }
  for (const k of ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight']) {
    const d = Object.getOwnPropertyDescriptor(Element.prototype, k)
    Object.defineProperty(Element.prototype, k, {
      configurable: true,
      get() {
        count(this)
        return d.get.call(this)
      },
    })
  }
}

const browser = await launch({ dpr: DPR })
const rows = []
for (const [title, path] of PAGES) {
  const runs = []
  for (let i = 0; i < 4; i++) {
    const page = await browser.newPage()
    await page.evaluateOnNewDocument(probe)
    await page.goto(URL_BASE + path, { waitUntil: 'networkidle0' })
    await sleep(4000)
    const r = await page.evaluate(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0
      const loaf = window.__loaf.map((l) => l.dur)
      return {
        fcp: Math.round(fcp),
        worst: Math.round(Math.max(0, ...loaf)),
        total: Math.round(loaf.reduce((a, b) => a + b, 0)),
        frames: loaf.length,
        hidden: window.__hidden,
        tabs: document.querySelectorAll('[role=tablist][aria-label="Açık sekmeler"] [data-tab]').length,
      }
    })
    await page.close()
    // İlk koşu ısınma (önbellek, derleme)
    if (i > 0) runs.push(r)
  }
  const med = (k) => runs.map((r) => r[k]).sort((a, b) => a - b)[1]
  rows.push({ title, path, fcp: med('fcp'), worst: med('worst'), total: med('total'), frames: med('frames'), hidden: med('hidden'), tabs: runs[0].tabs })
}
await browser.close()

const lines = [
  `Açılış · DPR ${DPR} · ${new Date().toISOString()}`,
  '',
  '| Adres | Sekme | İlk boyama (ms) | En uzun kare (ms) | Uzun karelerin toplamı (ms) | Uzun kare | Gizli bölmede ölçüm |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.title} | ${r.tabs} | ${r.fcp} | ${r.worst} | ${r.total} | ${r.frames} | ${r.hidden} |`),
]
console.log(lines.join('\n'))
if (OUT) {
  writeFileSync(OUT, JSON.stringify(rows, null, 2) + '\n')
  writeFileSync(OUT.replace(/\.json$/, '.md'), lines.join('\n') + '\n')
}
