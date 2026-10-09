#!/usr/bin/env node
/*
 * Sekme şeritlerinin görüntüleri (rapor ve göz denetimi için): çalışma alanının şeridi (tek sekme,
 * renkli grup, yan yana sekme, dar pencere: ikon kipi), iş akışı kutuları, Başlangıç kategorileri;
 * açık / koyu, DPR 1 / 2, Chrome yolu (`corner-shape`) ve zorlanmış yedek yol (kapakların
 * `supports-[corner-shape:scoop]` sınıfları sayfada silinir: Safari / Firefox'un çizdiği yol). Her
 * biri şeridin tamamı ve seçili sekmenin kavisleri büyütülmüş. Görüntü alanı yakalarken değişmez
 * (`captureBeyondViewport: false`: değişseydi şerit yeniden dizilirdi).
 *
 *   node scripts/perf/shots.mjs --out docs/tab-system [--url http://localhost:4173] [--quick]
 */
import { mkdirSync } from 'node:fs'
import { STRIP, URL_BASE, install, launch, opt, sleep, waitFor } from './harness.mjs'

const OUT = opt('out', 'docs/tab-system')
const QUICK = process.argv.includes('--quick')
mkdirSync(OUT, { recursive: true })

const browser = await launch()

/** Sayfa: renk kipi ve tema ayarları ilk betikten önce. */
async function open(dpr, mode, width = 1440) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 900, deviceScaleFactor: dpr })
  await page.evaluateOnNewDocument((m) => localStorage.setItem('synergy-color-mode', m), mode)
  await page.evaluateOnNewDocument(install, {})
  return page
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
    const strip = [...document.querySelectorAll(sel)].find((s) => s.checkVisibility())
    const tab =
      strip?.querySelector('[data-selected]') ?? strip?.querySelector('[aria-current=page]')?.parentElement
    if (!strip || !tab) return null
    const s = strip.getBoundingClientRect()
    const t = tab.getBoundingClientRect()
    // Tam sayı kırpma: kesirli kırpma görüntüyü yeniden örnekler (sahte ince çizgiler)
    const box = (x, y, w, h) => ({ x: Math.floor(x), y: Math.floor(y), width: Math.ceil(w), height: Math.ceil(h) })
    return {
      strip: box(Math.max(0, s.x - 12), s.y - 6, Math.min(s.width + 24, innerWidth - Math.max(0, s.x - 12)), s.height + 26),
      tab: box(t.x - 34, t.y - 6, t.width + 68, t.height + 26),
    }
  }, stripSel)
  if (!box) return console.error('bulunamadı:', name)
  await page.screenshot({ path: `${OUT}/${name}-strip.png`, clip: box.strip, captureBeyondViewport: false })
  await page.screenshot({ path: `${OUT}/${name}-tab.png`, clip: box.tab, captureBeyondViewport: false })
}

const WORKSPACE = [
  ['ws-tek', '/talepler/bekleyen-satin-alma-0?sekmeler=ia.bekleyen.masraf,*,ik.kullanicilar'],
  ['ws-grup', '/is-akislari/bekleyen/masraf?sekmeler=(Ekip.2;ik.kullanicilar,*,u.personel-rehberi),ia.bekleyen.dof'],
  ['ws-yan-yana', '/is-akislari/bekleyen/masraf?sekmeler=*~ik.kullanicilar,u.personel-rehberi'],
]
const DPRS = QUICK ? [2] : [1, 2]
const MODES = QUICK ? ['light'] : ['light', 'dark']

for (const mode of MODES)
  for (const dpr of DPRS)
    for (const path of ['chrome', 'fallback']) {
      const tag = `${mode}-dpr${dpr}-${path}`
      const page = await open(dpr, mode)
      for (const [name, url] of WORKSPACE) {
        await page.goto(URL_BASE + url, { waitUntil: 'networkidle0' })
        await waitFor(page, { css: STRIP, visible: false })
        await sleep(1500)
        if (path === 'fallback') await fallback(page)
        await capture(page, `${name}-${tag}`, STRIP)
      }
      // İş akışı kutuları ve Başlangıç kategorileri
      await page.goto(`${URL_BASE}/is-akislari/bekleyen`, { waitUntil: 'networkidle0' })
      await sleep(1200)
      if (path === 'fallback') await fallback(page)
      await capture(page, `agenda-${tag}`, '[role=navigation][aria-label="İş Akış Yönetimi"]')
      await page.goto(`${URL_BASE}/calisma-alani`, { waitUntil: 'networkidle0' })
      await sleep(1500)
      if (path === 'fallback') await fallback(page)
      await capture(page, `start-${tag}`, '[aria-label="Kategoriler"]')
      await page.close()
    }

// Dar pencere: sekmeler eşit pay, ikon kipi (seçili sekmede ikonun yerinde kapatma)
for (const width of [900, 640]) {
  const page = await open(2, 'light', width)
  await page.goto(
    `${URL_BASE}/is-akislari/bekleyen/masraf?sekmeler=ia.bekleyen.izin,ia.bekleyen.sozlesme,ia.bekleyen.dof,*,ia.bekleyen.egitim,ia.bekleyen.arac,ik.kullanicilar,ik.pozisyonlar,ik.departmanlar,u.personel-rehberi`,
    { waitUntil: 'networkidle0' },
  )
  await sleep(1500)
  await capture(page, `ws-dar-${width}`, STRIP)
  await page.close()
}
await browser.close()
console.error('yazıldı:', OUT)
