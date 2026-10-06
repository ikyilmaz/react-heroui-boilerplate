#!/usr/bin/env node
/*
 * Sekme sisteminin etkileşim sınamaları (üretim derlemesi, puppeteer-core): her geçiş yarıda
 * kesilebilir ve oturunca hiçbir şey yanlış yerde kalmaz. Her sınamadan sonra (1 s bekleyip):
 *   - yaprak seçili sekmenin üstünde (±1px), görünür bölmeler seçili sekmenin formları, tam
 *     saydam ve dönüşümsüz; gizli bölmelerin içi atlanmış (`content-visibility: hidden`),
 *   - sekmelerde dönüşüm kalmamış, sayfada hata yok.
 * Sınamalar: sayfa kipi (tek form) ve sekmelerden ona dönüş; menü formları (form gruplarında açılır,
 * ikinci kez açılmaz, talep grubuyla birlikte, kapanınca Başlangıç); beş hızlı sekme tıklaması; child açıp hemen kapatma; bir sekme gelirken başka birini
 * kapatma; grubu sürükleyerek taşıma; klavye (oklar, Enter, Delete); bölücü klavyesi; kapatırken
 * genişlik donması (dar pencere, altı grup); animasyon "Az" ve "Kapalı".
 *
 *   node scripts/perf/interactions.mjs [--url http://localhost:4173] [--headed]
 */
import puppeteer from 'puppeteer-core'

const argv = process.argv.slice(2)
const opt = (n, d) => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 ? argv[i + 1] : d
}
const URL_BASE = opt('url', 'http://localhost:4173')
const CHROME = opt('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const ROUTE = '/is-akislari/bekleyen/satin-alma/bekleyen-satin-alma-0'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({ executablePath: CHROME, headless: !argv.includes('--headed') })
const results = []

async function open({ width = 1512, motion = 'full' } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 945, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.evaluateOnNewDocument((m) => {
    if (m !== 'full') localStorage.setItem('synergy-v2-theme', JSON.stringify({ motion: m }))
    window.__find = (spec) =>
      [...document.querySelectorAll(spec.css)].filter(
        (el) =>
          el.checkVisibility() &&
          (!spec.text || el.textContent.includes(spec.text)) &&
          (!spec.has || el.querySelectorAll(spec.has).length >= (spec.hasCount ?? 1)),
      )[spec.nth ?? 0]
  }, motion)
  page.errors = errors
  return page
}
const find = (page, spec, timeout = 8000) =>
  page.waitForFunction((s) => !!window.__find(s), { polling: 10, timeout }, spec)
async function click(page, spec) {
  await find(page, spec)
  await page.evaluate((s) => {
    const el = window.__find(s)
    ;(s.inner ? el.querySelector(s.inner) : el).click()
  }, spec)
}
/** Gerçek imleçle tıklama (genişlik donması imleç türüne bakar). */
async function mouseClick(page, spec) {
  await find(page, spec)
  const r = await page.evaluate((s) => {
    const b = window.__find(s).getBoundingClientRect()
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }, spec)
  await page.mouse.move(r.x, r.y)
  await page.mouse.click(r.x, r.y)
  return r
}
const B = (text) => ({ css: 'button', text })
const TAB = (g, nth = 0) => ({ css: `[data-tab^="${g}:"] [role=tab]`, nth })
const SPLIT = { css: '[data-tab^="g0:"]', has: '[role=tab]', hasCount: 2, inner: '[role=tab]' }

/** Kurulum: yan yana, kök kendi sekmesinde, ikinci grup (ölçüm betiğiyle aynı). */
async function setup(page) {
  await page.goto(URL_BASE + ROUTE)
  await click(page, B('Tedarikçi Teklifi Ekle'))
  await sleep(1800)
  await click(page, B('Tedarikçi Kartını Aç'))
  await sleep(1800)
  await click(page, TAB('g0'))
  await sleep(600)
  await click(page, { css: 'button[aria-label^="Süreçler"]' })
  await sleep(400)
  await click(page, { css: '.ant-popover .ant-table-row', text: '20014' })
  await sleep(1800)
}

/** Oturunca: yaprak, bölmeler, sekmeler yerinde mi. */
async function check(page, name, extra) {
  await sleep(1000)
  const issues = await page.evaluate(() => {
    const out = []
    const strip = document.querySelector('[role=tablist][aria-label="Açık formlar"]')
    if (strip) {
      const tab = strip.querySelector('[data-selected]')
      const sheet = strip.querySelector(':scope > [aria-hidden].absolute')
      if (!tab || !sheet) out.push('seçili sekme ya da yaprak yok')
      else {
        const [, start, end] = sheet.children
        const t = tab.getBoundingClientRect()
        const l = start.getBoundingClientRect().left
        const r = end.getBoundingClientRect().right
        if (Math.abs(l - t.left) > 1 || Math.abs(r - t.right) > 1)
          out.push(`yaprak yerinde değil: ${l.toFixed(1)}..${r.toFixed(1)} sekme ${t.left.toFixed(1)}..${t.right.toFixed(1)}`)
        if (getComputedStyle(sheet).opacity !== '1') out.push('yaprak görünmüyor')
      }
      for (const el of strip.querySelectorAll('[data-tab]')) {
        const cs = getComputedStyle(el)
        if (cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)')
          out.push(`sekmede dönüşüm kaldı: ${el.dataset.tab} ${cs.transform}`)
        if (cs.opacity !== '1') out.push(`sekme saydam: ${el.dataset.tab}`)
      }
      // Görünmesi gerekenler: seçili sekmenin formları
      const want = new Set(
        [...tab.querySelectorAll('[role=tab][aria-selected=true]')].map((b) =>
          b.getAttribute('aria-controls'),
        ),
      )
      for (const pane of document.querySelectorAll('[id^="form-pane-"]')) {
        const cs = getComputedStyle(pane)
        const skipped = cs.contentVisibility === 'hidden'
        if (want.has(pane.id)) {
          if (skipped) out.push(`görünmesi gereken bölme gizli: ${pane.id}`)
          if (Math.abs(parseFloat(cs.opacity) - 1) > 0.01) out.push(`bölme saydam: ${pane.id} ${cs.opacity}`)
          if (cs.transform !== 'none' && cs.transform !== 'matrix(1, 0, 0, 1, 0, 0)')
            out.push(`bölmede dönüşüm kaldı: ${pane.id} ${cs.transform}`)
        } else if (!skipped) out.push(`gizli olması gereken bölme görünüyor: ${pane.id}`)
      }
    }
    return out
  })
  if (extra) issues.push(...(await extra()))
  issues.push(...page.errors.splice(0))
  results.push({ name, ok: issues.length === 0, issues })
  console.log(`${issues.length ? 'HATA' : 'TAMAM'}  ${name}${issues.length ? '\n   ' + issues.join('\n   ') : ''}`)
}

/* --- Sınamalar --------------------------------------------------------------------------------- */

// 0. Sayfa kipi (sekme yok): bölme kabın tamamını kaplar, sayfa kayar
{
  const page = await open()
  await page.goto(URL_BASE + ROUTE)
  await find(page, B('Tedarikçi Teklifi Ekle'))
  await sleep(500)
  const pageMode = () =>
    page.evaluate(() => {
      const box = document.querySelector('[id^="form-pane-"]')?.parentElement?.getBoundingClientRect()
      const pane = document.querySelector('[id^="form-pane-"]')?.getBoundingClientRect()
      if (!box || !pane) return ['bölme yok']
      const out = []
      if (Math.abs(pane.width - box.width) > 1)
        out.push(`bölme kabı kaplamıyor: ${Math.round(pane.width)} / ${Math.round(box.width)}`)
      if (document.documentElement.scrollHeight <= innerHeight) out.push('sayfa kaymıyor')
      return out
    })
  await check(page, 'sayfa kipi', pageMode)
  // Child açılıp kapanınca yine sayfa kipi
  await click(page, B('Bütçe Kontrolü Başlat'))
  await sleep(1800)
  await click(page, { css: '[aria-label^="Kapat: "]' })
  await check(page, 'sekmelerden sayfa kipine dönüş', pageMode)
  await page.close()
}

// 0b. Menü formları: form gruplarında açılır; aynı uygulama ikinci kez açılınca grubuna geçilir
{
  const page = await open()
  /** Başlat menüsünden (Favoriler) uygulama açar. */
  const app = async (caption) => {
    await click(page, { css: 'button[aria-label="Başlat"]' })
    await sleep(500)
    await click(page, { css: '[role=dialog][aria-label="Başlat"] button', text: caption })
    await sleep(1800)
  }
  const state = () =>
    page.evaluate(() => ({
      path: location.pathname,
      groups: document.querySelectorAll('[role=presentation][data-group]').length,
      strip: !!document.querySelector('[role=tablist][aria-label="Açık formlar"]'),
      selected: document.querySelector('[data-tab] [role=tab][tabindex="0"]')?.dataset.form,
      title: [...document.querySelectorAll('[id^="form-pane-"] h1')]
        .filter((h) => h.checkVisibility())
        .map((h) => h.textContent),
      labels: [...document.querySelectorAll('[id^="form-pane-"] label')]
        .filter((l) => l.checkVisibility())
        .map((l) => l.textContent),
    }))
  const expect = (cond, msg) => (cond ? [] : [msg])

  await page.goto(URL_BASE + '/uygulamalar/satin-alma-talebi')
  await find(page, { css: '[id^="form-pane-"] label', text: 'Bütçe kodu' })
  await check(page, 'menü formu: sayfa kipi', async () => {
    const s = await state()
    return [
      ...expect(!s.strip, 'tek formda şerit var'),
      ...expect(s.title.join() === 'Satın Alma Talebi', `başlık: ${s.title}`),
      ...expect(
        (await page.$$eval('button', (b) => b.map((x) => x.textContent))).join('|').includes('Gönder'),
        'Gönder yok',
      ),
    ]
  })

  await app('Personel Rehberi')
  await check(page, 'menü formu: ikinci uygulama yeni grupta', async () => {
    const s = await state()
    return [
      ...expect(s.strip && s.groups === 2, `grup sayısı ${s.groups}`),
      ...expect(s.path === '/uygulamalar/personel-rehberi', `adres ${s.path}`),
      ...expect(s.selected === 'app:personel-rehberi', `seçili ${s.selected}`),
      ...expect(s.title.join() === 'Personel Rehberi', `başlık: ${s.title}`),
    ]
  })

  await app('Satın Alma Talebi')
  await check(page, 'menü formu: açık uygulama ikinci kez açılmaz', async () => {
    const s = await state()
    return [
      ...expect(s.groups === 2, `grup sayısı ${s.groups}`),
      ...expect(s.path === '/uygulamalar/satin-alma-talebi', `adres ${s.path}`),
      ...expect(s.selected === 'app:satin-alma-talebi', `seçili ${s.selected}`),
      // Girilen değerler kalır: form yeniden kurulmadı (iskelet yok)
      ...expect(s.labels.includes('Bütçe kodu'), 'form yeniden kuruldu'),
    ]
  })

  // Talep de aynı şeritte: adres talebe gidince yeni grup
  await page.evaluate((r) => {
    history.pushState(null, '', r)
    dispatchEvent(new PopStateEvent('popstate'))
  }, ROUTE)
  await sleep(1800)
  await click(page, TAB('g0'))
  await sleep(600)
  await check(page, 'menü formu: talep grubuyla birlikte', async () => {
    const s = await state()
    return [
      ...expect(s.groups === 3, `grup sayısı ${s.groups}`),
      ...expect(s.path === '/uygulamalar/satin-alma-talebi', `adres ${s.path}`),
    ]
  })

  // "İptal" grubu kapatır; son grupta "Kapat" Başlangıç'a döner
  await click(page, B('İptal'))
  await sleep(800)
  // Sıra: g0 (Satın Alma Talebi), g2 (talep, etkin grubun sağında açıldı), g1 (Personel Rehberi);
  // g0 kapanınca yerindeki talep grubu etkin, onu da şeritten kapat
  await click(page, { css: '[data-group="g2"] [aria-label^="Grubu kapat"]' })
  await sleep(800)
  await check(page, 'menü formu: gruplar kapanır', async () => {
    const s = await state()
    return [
      ...expect(!s.strip, `şerit duruyor (${s.groups} grup)`),
      ...expect(s.path === '/uygulamalar/personel-rehberi', `adres ${s.path}`),
    ]
  })
  await click(page, B('Kapat'))
  await sleep(800)
  const end = await page.evaluate(() => location.pathname)
  results.push({ name: 'menü formu: son grup Başlangıç’a döner', ok: end === '/calisma-alani', issues: [end] })
  console.log(`${end === '/calisma-alani' ? 'TAMAM' : 'HATA'}  menü formu: son grup Başlangıç’a döner (${end})`)
  await page.close()
}

for (const motion of ['full', 'reduced', 'off']) {
  const page = await open({ motion })
  await setup(page)
  const tag = motion === 'full' ? '' : ` (animasyon ${motion === 'reduced' ? 'Az' : 'Kapalı'})`

  // 1. Beş hızlı sekme tıklaması (geçişler yarıda kesilir)
  for (const spec of [TAB('g0'), SPLIT, TAB('g1'), TAB('g0'), SPLIT]) {
    await click(page, spec)
    await sleep(40)
  }
  await check(page, `beş hızlı tıklama${tag}`)

  // 2. Child açıp hemen kapatma
  await click(page, TAB('g1'))
  await sleep(500)
  await click(page, B('Mevcut Sözleşmeyi Aç'))
  await click(page, { css: '[aria-label^="Kapat: Bakım"]' })
  await check(page, `açıp hemen kapatma${tag}`, () =>
    page.evaluate(() =>
      document.querySelector('[aria-label^="Kapat: Bakım"]') ? ['kapanan sekme duruyor'] : [],
    ),
  )

  // 3. Bir sekme gelirken başka birini kapatma
  await click(page, B('Mevcut Sözleşmeyi Aç'))
  await sleep(30)
  await click(page, { css: '[aria-label^="Kapat: Tedarikçi Kartı"]' })
  await check(page, `gelirken kapatma${tag}`)
  await page.close()
}

// 4. Grubu sürükleyerek taşıma (kök sekmesinden), 5. klavye, 6. bölücü
{
  const page = await open()
  await setup(page)
  const order = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[role=presentation][data-group]')].map((g) => g.dataset.group).join(','),
    )
  const before = await order()
  const from = await page.evaluate(() => {
    const b = document.querySelector('[data-tab^="g1:"]').getBoundingClientRect()
    return { x: b.x + 30, y: b.y + b.height / 2 }
  })
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 30; i++) {
    await page.mouse.move(from.x - i * 25, from.y)
    await sleep(16)
  }
  await page.mouse.up()
  await check(page, 'grubu sürükleyerek taşıma', async () => {
    const after = await order()
    return after === 'g1,g0' ? [] : [`grup sırası ${before} → ${after} (g1,g0 bekleniyordu)`]
  })

  // Klavye: seçili sekmeden ok sola odak önceki sekmeye, Enter seçer
  await page.evaluate(() => document.querySelector('[role=tablist] [role=tab][tabindex="0"]')?.focus())
  const focusBefore = await page.evaluate(() => document.activeElement?.id)
  await page.keyboard.press('ArrowRight')
  const focusAfter = await page.evaluate(() => document.activeElement?.id)
  await page.keyboard.press('Enter')
  await check(page, 'klavye: ok ve Enter', async () =>
    focusBefore === focusAfter ? [`ok tuşu odağı taşımadı (${focusBefore})`] : [],
  )

  // Bölücü: yan yana sekmede End payı en yükseğe (70) taşır
  await click(page, SPLIT)
  await sleep(800)
  await page.evaluate(() => document.querySelector('[role=separator][aria-label="Bölücü"]')?.focus())
  await page.keyboard.press('End')
  await check(page, 'bölücü klavyesi (End)', () =>
    page.evaluate(() => {
      const sep = document.querySelector('[role=separator][aria-label="Bölücü"]')
      const panes = [...document.querySelectorAll('[id^="form-pane-"]')].filter(
        (p) => getComputedStyle(p).contentVisibility !== 'hidden',
      )
      const host = sep?.parentElement?.getBoundingClientRect()
      if (!sep || panes.length !== 2 || !host) return ['yan yana iki bölme yok']
      const left = Math.min(...panes.map((p) => p.getBoundingClientRect().width))
      const big = Math.max(...panes.map((p) => p.getBoundingClientRect().width))
      const share = big / (left + big)
      return sep.getAttribute('aria-valuenow') === '70' && Math.abs(share - 0.7) < 0.02
        ? []
        : [`pay ${sep.getAttribute('aria-valuenow')}, genişlik payı ${share.toFixed(3)}`]
    }),
  )

  // Delete: odaktaki child sekmesini kapatır
  await click(page, TAB('g0'))
  await sleep(400)
  await page.evaluate(() =>
    document.querySelector('[role=tab][data-form="child-tedarikci-karti-0"]')?.focus(),
  )
  await page.keyboard.press('Delete')
  await check(page, 'klavye: Delete', () =>
    page.evaluate(() =>
      document.querySelector('[data-form="child-tedarikci-karti-0"]') ? ['kapanmadı'] : [],
    ),
  )
  await page.close()
}

// 7. Kapatırken genişlik donması: dar pencere, altı grup (sekmeler daralır)
{
  const page = await open({ width: 1100 })
  await page.goto(URL_BASE + ROUTE)
  await find(page, B('Tedarikçi Teklifi Ekle'))
  await sleep(1300)
  for (let n = 0; n < 5; n++) {
    await click(page, { css: 'button[aria-label^="Süreçler"]' })
    await sleep(400)
    // Talep satırları (tarih grubu başlığı değil), açık olan değil
    await click(page, { css: '.ant-popover .ant-table-row[tabindex="0"]:not([aria-current])', nth: n })
    await sleep(1500)
    await click(page, TAB('g0'))
    await sleep(500)
  }
  const widths = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('[data-tab]')].map((t) => [t.dataset.tab, Math.round(t.getBoundingClientRect().width)]),
      ),
    )
  const tight = await page.evaluate(() =>
    [...document.querySelectorAll('[data-tab] [data-label]')].some((l) => l.scrollWidth > l.clientWidth + 1),
  )
  const w0 = await widths()
  // İkinci grubun kökünü fareyle kapat (grubu kapatır)
  const groups = await page.evaluate(() =>
    [...document.querySelectorAll('[role=presentation][data-group]')].map((g) => g.dataset.group),
  )
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('[role=presentation][data-group]')][1]?.querySelector('[data-tab]')
    t?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })
  const at = await mouseClick(page, { css: `[data-group="${groups[1]}"] [aria-label^="Grubu kapat"]` })
  await sleep(600)
  const w1 = await widths()
  const frozen = Object.keys(w1).every((k) => !(k in w0) || Math.abs(w1[k] - w0[k]) <= 1)
  // İmleç şeritten ayrılınca çözülür
  await page.mouse.move(at.x, at.y + 300)
  await sleep(800)
  const w2 = await widths()
  const grew = Object.keys(w2).some((k) => k in w1 && w2[k] > w1[k] + 2)
  await check(page, 'kapatırken genişlik donması', async () => {
    const out = []
    if (!tight) out.push('şerit daralmadı (sınama geçersiz)')
    if (!frozen) out.push(`genişlikler değişti: ${JSON.stringify(w0)} → ${JSON.stringify(w1)}`)
    if (!grew) out.push(`imleç ayrılınca genişlemedi: ${JSON.stringify(w1)} → ${JSON.stringify(w2)}`)
    return out
  })
  await page.close()
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} / ${results.length} sınama geçti`)
process.exit(failed.length ? 1 : 0)
