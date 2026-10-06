#!/usr/bin/env node
/*
 * Sekme şeritlerinin görüntüleri (rapor için): form sekmeleri (tek grup ve iki renkli grup), iş akışı
 * kutuları, Başlangıç kategorileri; açık / koyu, DPR 1 / 1.25 / 2, Chrome yolu (`corner-shape`) ve
 * zorlanmış yedek yol (kapakların `supports-[corner-shape:scoop]` sınıfları sayfada silinir: Safari /
 * Firefox'un çizdiği yol). Her biri şeridin tamamı ve seçili sekmenin kavisleri büyütülmüş.
 *
 *   node scripts/perf/shots.mjs --out docs/tab-system [--url http://localhost:4173] [--quick]
 */
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 ? argv[i + 1] : d
}
const OUT = opt('out', 'docs/tab-system')
const URL_BASE = opt('url', 'http://localhost:4173')
const CHROME = opt('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const QUICK = argv.includes('--quick')
/** Yalnızca açık / koyu ve DPR 1 / 2 (eski derlemeyle karşılaştırma için kısa takım). */
const SHORT = argv.includes('--short')
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })

/** Sayfa: renk kipi ve tema ayarları ilk betikten önce. */
async function open(dpr, mode, settings) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: dpr })
  await page.evaluateOnNewDocument(
    (m, s) => {
      localStorage.setItem('synergy-color-mode', m)
      if (s) localStorage.setItem('synergy-v2-theme', JSON.stringify(s))
      window.__find = (spec) =>
        [...document.querySelectorAll(spec.css)].find(
          (el) => el.checkVisibility() && (!spec.text || el.textContent.includes(spec.text)),
        )
    },
    mode,
    settings,
  )
  return page
}
async function click(page, spec) {
  await page.waitForFunction((s) => !!window.__find(s), { polling: 50, timeout: 15000 }, spec)
  await page.evaluate((s) => window.__find(s).click(), spec)
}
/** Yedek yolu zorlar: kapakların `corner-shape` sınıfları silinir. */
async function fallback(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[class*="supports-[corner-shape:scoop]"]'))
      el.className = el.className
        .split(' ')
        .filter((c) => !c.startsWith('supports-[corner-shape:scoop]'))
        .join(' ')
  })
  await sleep(100)
}
/** Şerit ve seçili sekmenin çevresi (kavisler). */
async function capture(page, name, stripSel) {
  const box = await page.evaluate((sel) => {
    const strip = document.querySelector(sel)
    // Seçili sekme (yeni şerit `data-selected`; eski yapılar için seçili düğmenin / bağlantının yuvası)
    const tab =
      strip?.querySelector('[data-selected]') ??
      strip?.querySelector('[data-tab]:has([aria-selected=true])') ??
      strip?.querySelector('[aria-current=page]')?.parentElement ??
      strip?.querySelector('[aria-pressed=true]')?.parentElement
    if (!strip || !tab) return null
    const s = strip.getBoundingClientRect()
    const t = tab.getBoundingClientRect()
    // Tam sayı kırpma: kesirli kırpma görüntüyü yeniden örnekler (sahte ince çizgiler)
    const box = (x, y, w, h) => ({ x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) })
    return {
      strip: box(s.x, s.y - 6, Math.min(s.width, 1440 - s.x), s.height + 26),
      tab: box(t.x - 34, t.y - 6, t.width + 68, t.height + 26),
    }
  }, stripSel)
  if (!box) return console.error('bulunamadı:', name)
  await page.screenshot({ path: `${OUT}/${name}-strip.png`, clip: box.strip })
  await page.screenshot({ path: `${OUT}/${name}-tab.png`, clip: box.tab })
}

const DPRS = QUICK ? [2] : SHORT ? [1, 2] : [1, 1.25, 2]
const MODES = QUICK ? ['light'] : ['light', 'dark']
const STRIP = '[role=tablist],[role=navigation][aria-label="İş Akış Yönetimi"]'

for (const mode of MODES)
  for (const dpr of DPRS)
    for (const path of ['chrome', 'fallback']) {
      if (path === 'fallback' && dpr === 1.25 && !QUICK) continue
      const tag = `${mode}-dpr${dpr}-${path}`
      // Başlangıç kategorileri
      let page = await open(dpr, mode)
      await page.goto(`${URL_BASE}/calisma-alani`)
      await sleep(2200)
      if (path === 'fallback') await fallback(page)
      await capture(page, `start-${tag}`, '[aria-label="Kategoriler"]')
      // İş akışı kutuları
      await page.goto(`${URL_BASE}/is-akislari/bekleyen`)
      await sleep(1200)
      if (path === 'fallback') await fallback(page)
      await capture(page, `agenda-${tag}`, '[role=navigation][aria-label="İş Akış Yönetimi"]')
      // Form sekmeleri: tek grup (yan yana sekme seçili), sonra iki renkli grup
      await page.goto(`${URL_BASE}/is-akislari/bekleyen/satin-alma/bekleyen-satin-alma-0`)
      await click(page, { css: 'button', text: 'Tedarikçi Teklifi Ekle' })
      await sleep(1800)
      await click(page, { css: 'button', text: 'Bütçe Kontrolü Başlat' }).catch(() => {})
      await sleep(1800)
      if (path === 'fallback') await fallback(page)
      await capture(page, `form-${tag}`, '[role=tablist][aria-label="Açık formlar"]')
      await click(page, { css: 'button[aria-label^="Süreçler"]' })
      await sleep(500)
      await click(page, { css: '.ant-popover .ant-table-row', text: '20014' })
      await sleep(1800)
      if (path === 'fallback') await fallback(page)
      await capture(page, `groups-${tag}`, '[role=tablist][aria-label="Açık formlar"]')
      await page.close()
    }

// Köşe çeşitleri (açık, DPR 2): yarıçap Az / Çok, squircle
for (const [name, s] of SHORT ? [] : [
  ['radius-az', { radius: 0.25 }],
  ['radius-cok', { radius: 1 }],
  ['squircle-orta', { corner: 'squircle', radius: 0.5 }],
  ['squircle-cok', { corner: 'squircle', radius: 1 }],
]) {
  const page = await open(2, 'light', s)
  await page.goto(`${URL_BASE}/calisma-alani`)
  await sleep(2200)
  await capture(page, `start-${name}`, '[aria-label="Kategoriler"]')
  await page.goto(`${URL_BASE}/is-akislari/bekleyen/satin-alma/bekleyen-satin-alma-0`)
  await click(page, { css: 'button', text: 'Tedarikçi Teklifi Ekle' })
  await sleep(1800)
  await click(page, { css: 'button[aria-label^="Süreçler"]' })
  await sleep(500)
  await click(page, { css: '.ant-popover .ant-table-row', text: '20014' })
  await sleep(1800)
  await capture(page, `groups-${name}`, '[role=tablist][aria-label="Açık formlar"]')
  await page.close()
}
await browser.close()
console.error('yazıldı:', OUT)
