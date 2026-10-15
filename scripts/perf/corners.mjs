#!/usr/bin/env node
/*
 * İç içe köşelerin eş merkezlilik denetimi (üretim derlemesi): görünen her yuvarlak kutunun her
 * köşesi, kenarı görünen (dolgu / kenarlık / gölge) en yakın yuvarlak atasının aynı köşesinin
 * içindeyse beklenen yarıçapla karşılaştırılır:
 *
 *   beklenen = max(0, R − k × d)   R: atanın köşesi, d: köşeye uzaklık (iki eksende yaklaşık eşit)
 *
 * k yuvarlak köşede 1; squircle'da (`superellipse(2)`, üs 4) aradaki boşluk 45°'de de d kalsın diye
 * (1 − 1/√2) / (1 − 2^(−1/4)) ≈ 1.84. Yarıçaplar tarayıcının kullandığı değer (yüzde çözülür, kutuya
 * sığmayan köşeler orantılı küçülür). Sapması `--tol` (px) üstündekiler, sınıf imzasına göre tekil.
 *
 *   node scripts/perf/corners.mjs [--out docs/corners.md] [--tol 2] [--only squircle-orta]
 */
import { writeFileSync } from 'node:fs'
import { URL_BASE, click, install, launch, opt, sleep, waitFor } from './harness.mjs'

const TOL = +opt('tol', 2)
const OUT = opt('out', '')
const ONLY = opt('only', '')
const K_SQUIRCLE = (1 - Math.SQRT1_2) / (1 - 2 ** -0.25)

const THEMES = [
  ['squircle-orta', { corner: 'squircle', radius: 0.5 }],
  ['squircle-az', { corner: 'squircle', radius: 0.25 }],
  ['squircle-cok', { corner: 'squircle', radius: 1 }],
  ['round-orta', { corner: 'round', radius: 0.5 }],
  ['round-cok', { corner: 'round', radius: 1 }],
]

/** Ekranlar: adres ve isteğe bağlı açma adımı. */
const SCREENS = [
  ['Başlangıç', '/calisma-alani'],
  ['Başlat menüsü', '/calisma-alani', async (page) => {
    await click(page, { css: 'button[aria-label="Başlat"]' })
    await waitFor(page, { css: '[role=dialog][aria-label="Başlat"]' })
  }],
  ['Başlat › İş Akış Yönetimi', '/calisma-alani', async (page) => {
    await click(page, { css: 'button[aria-label="Başlat"]' })
    await click(page, { css: '[role=dialog][aria-label="Başlat"] [role=tab]', text: 'İş Akış' })
  }],
  ['İş akışı listesi', '/is-akislari/bekleyen/satin-alma'],
  ['Talep', '/talepler/bekleyen-satin-alma-0'],
  ['İK', '/insan-kaynaklari/kullanicilar'],
  ['Uygulama formu', '/uygulamalar/personel-rehberi'],
  ['Tema paneli', '/calisma-alani', async (page) => {
    await click(page, { css: 'button[aria-label="Tema ayarları"]' })
  }],
]

/** Sayfada çalışır: sapan köşeler. */
function audit({ k, tol }) {
  const MIN = 6
  // antd form kontrolleri: kendi (alan) yarıçapları var, köşede durması tesadüf
  const CONTROL =
    '.ant-select, .ant-input-affix-wrapper, .ant-input, .ant-picker, .ant-pagination *, .ant-btn:not(.ant-btn-icon-only), .ant-segmented, .ant-input-number'
  const CORNERS = [
    ['tl', 'TopLeft', (c, p) => [c.left - p.left, c.top - p.top]],
    ['tr', 'TopRight', (c, p) => [p.right - c.right, c.top - p.top]],
    ['bl', 'BottomLeft', (c, p) => [c.left - p.left, p.bottom - c.bottom]],
    ['br', 'BottomRight', (c, p) => [p.right - c.right, p.bottom - c.bottom]],
  ]
  const alpha = (color) => {
    const m = color.match(/[\d.]+/g)
    if (!m || color === 'transparent') return 0
    return color.startsWith('rgba') || color.includes('/') ? +m.at(-1) : 1
  }
  /** Köşesi görünen kenarlar: dolgu / gölge her köşeyi, kenarlık yalnızca iki kenarı da olan köşeyi çizer. */
  const corners = (cs) => {
    const fill =
      alpha(cs.backgroundColor) > 0.01 ||
      cs.backgroundImage !== 'none' ||
      (cs.boxShadow !== 'none' && !/^(rgba\(0, 0, 0, 0\)|transparent) 0px 0px 0px 0px$/.test(cs.boxShadow))
    const w = (side) => parseFloat(cs[`border${side}Width`]) > 0
    return {
      tl: fill || (w('Top') && w('Left')),
      tr: fill || (w('Top') && w('Right')),
      bl: fill || (w('Bottom') && w('Left')),
      br: fill || (w('Bottom') && w('Right')),
    }
  }
  /** Kullanılan yarıçaplar (yüzde çözülür, sığmayan köşeler orantılı küçülür). */
  const radii = (el, cs, b) => {
    const val = (s, size) => (s.endsWith('%') ? (parseFloat(s) / 100) * size : parseFloat(s))
    const r = {}
    for (const [key, name] of CORNERS) {
      const [h, v = h] = cs[`border${name}Radius`].split(' ')
      r[key] = [val(h, b.width), val(v, b.height)]
    }
    const f = Math.min(
      1,
      b.width / (r.tl[0] + r.tr[0] || 1),
      b.width / (r.bl[0] + r.br[0] || 1),
      b.height / (r.tl[1] + r.bl[1] || 1),
      b.height / (r.tr[1] + r.br[1] || 1),
    )
    for (const key in r) r[key] = Math.min(r[key][0], r[key][1]) * f
    return r
  }
  const label = (el) => {
    const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/)
    const keep = cls.filter((c) => /rounded|^p[xytblrse]?-|^ant-|^size-|^h-|^w-/.test(c)).slice(0, 8)
    const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30)
    return `${el.tagName.toLowerCase()}.${keep.join('.')}${text ? ` «${text}»` : ''}`
  }
  const info = new Map()
  const get = (el) => {
    if (!info.has(el)) {
      const cs = getComputedStyle(el)
      const b = el.getBoundingClientRect()
      const r = radii(el, cs, b)
      const shown = corners(cs)
      info.set(el, { cs, b, r, shown, round: Object.values(r).some((v) => v > 0.5), vis: Object.values(shown).some(Boolean) })
    }
    return info.get(el)
  }
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    const c = get(el)
    if (!c.vis || c.b.width < 8 || c.b.height < 8) continue
    if (c.b.bottom < 0 || c.b.top > innerHeight || c.b.right < 0 || c.b.left > innerWidth) continue
    let p = el.parentElement
    while (p && p !== document.body) {
      const pi = get(p)
      if (pi.round && pi.vis) break
      p = p.parentElement
    }
    if (!p || p === document.body) continue
    const pi = get(p)
    for (const [key, , off] of CORNERS) {
      const R = pi.r[key]
      if (R < 1 || !pi.shown[key] || !c.shown[key]) continue
      const [dx, dy] = off(c.b, pi.b)
      if (dx < -0.5 || dy < -0.5 || dx >= R || dy >= R) continue
      if (Math.abs(dx - dy) > 2) continue
      const d = (dx + dy) / 2
      const want = Math.max(0, R - k * d)
      // Köşeden uzak (beklenen küçük) öğede eş merkezlilik anlamsız: rozet, ikon kutusu…
      if (want < MIN) continue
      const dev = c.r[key] - want
      if (Math.abs(dev) <= tol) continue
      const control = el.matches(CONTROL)
      out.push({ control, child: label(el), parent: label(p), corner: key, R: +R.toFixed(1), d: +d.toFixed(1), r: +c.r[key].toFixed(1), want: +want.toFixed(1), dev: +dev.toFixed(1) })
    }
  }
  return out
}

const browser = await launch()
const report = []
const seen = new Set()
for (const [theme, settings] of THEMES) {
  if (ONLY && theme !== ONLY) continue
  const k = settings.corner === 'squircle' ? K_SQUIRCLE : 1
  for (const [screen, path, step] of SCREENS) {
    const page = await browser.newPage()
    await page.evaluateOnNewDocument(install, { theme: settings })
    await page.goto(URL_BASE + path, { waitUntil: 'networkidle0' })
    await sleep(1800)
    try {
      if (step) await step(page)
    } catch (e) {
      report.push({ theme, screen, error: e.message })
      await page.close()
      continue
    }
    await sleep(1200)
    const rows = await page.evaluate(audit, { k, tol: TOL })
    // Aynı imza (çocuk, ata, köşe) bir kez
    for (const row of rows) {
      const sig = `${theme}|${row.child.replace(/«.*»/, '')}|${row.parent.replace(/«.*»/, '')}|${row.corner}`
      if (seen.has(sig)) continue
      seen.add(sig)
      report.push({ theme, screen, ...row })
    }
    await page.close()
  }
}
await browser.close()

const lines = [`# Köşe denetimi (tol ${TOL}px, k squircle ${K_SQUIRCLE.toFixed(2)})`, '']
for (const [theme] of THEMES) {
  const rows = report.filter((r) => r.theme === theme)
  if (!rows.length && ONLY && theme !== ONLY) continue
  lines.push(`## ${theme} (${rows.length})`, '')
  rows.sort((a, b) => (a.control === b.control ? 0 : a.control ? 1 : -1))
  for (const r of rows)
    lines.push(
      r.error
        ? `- ${r.screen}: HATA ${r.error}`
        : `- ${r.control ? '(kontrol) ' : ''}${r.screen} · ${r.corner} · R ${r.R} d ${r.d} → r ${r.r} (beklenen ${r.want}, ${r.dev > 0 ? '+' : ''}${r.dev})\n  - çocuk: \`${r.child}\`\n  - ata: \`${r.parent}\``,
    )
  lines.push('')
}
const text = lines.join('\n')
if (OUT) writeFileSync(OUT, text)
console.log(text)
