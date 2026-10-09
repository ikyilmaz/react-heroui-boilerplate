#!/usr/bin/env node
/*
 * Çalışma alanının (uygulama genelindeki sekmeler) etkileşim sınamaları: üretim derlemesi,
 * puppeteer-core. Her sınama kendi sayfasında koşar; sonunda (1 s bekleyip) her şey yerinde mi
 * denetlenir (`settled`: yaprak seçili sekmenin üstünde, görünür bölmeler seçili sekmenin ekranları
 * — tam saydam, dönüşümsüz, kabın içinde, üst üste binmeden —, gizliler `content-visibility:
 * hidden`, sekmelerde dönüşüm yok) ve sayfada hata yok mu. Sınamalar:
 *   Başlangıç (şerit, yeni sekmede açma), geçişler yarıda kesilince, child (yan yana / yeni sekme,
 *   otomatik grup, ebeveynle kapanma), listenin üstünde form (geri / ileri / kabuğun Geri'si, liste
 *   durumunu korur), ayrı sekmeye taşıma, iki kez açmama, Cmd / orta tık, sağ tık menüsü, raf,
 *   sürükleme, klavye, bölücü, yer değiştir / ayır, kapatırken genişlik donması, adresten kurulum,
 *   ekran sınırı, sekme menüsü, bağlantıyı kopyala, yan yana düğmesi, gezinme konumları, animasyon
 *   "Az" ve "Kapalı".
 *
 *   npm run build && npx vite preview --port 4173 --strictPort &
 *   node scripts/perf/interactions.mjs [--url http://localhost:4173] [--headed] [--only ad,ad]
 */
import {
  IN,
  LOAD_WAIT,
  PANE,
  SETUP_URL,
  STRIP,
  TAB,
  URL_BASE,
  click,
  install,
  launch,
  mouseClick,
  opt,
  settled,
  sleep,
  tabs,
  waitFor,
} from './harness.mjs'

const ONLY = opt('only', null)?.split(',')
const browser = await launch({ dpr: 1 })
const results = []

/* --- Çerçeve ------------------------------------------------------------------------------------ */

async function open({ width = 1512, height = 945, theme } = {}) {
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.evaluateOnNewDocument(install, { theme })
  page.errors = errors
  return page
}

async function goto(page, path, wait = 600) {
  await page.goto(URL_BASE + path, { waitUntil: 'networkidle0' })
  await waitFor(page, { css: STRIP, visible: false })
  await sleep(wait)
}

/** Bir sınama: kendi sayfası, beklentiler (`expect`), sonunda oturma denetimi. */
async function test(name, fn, opts) {
  if (ONLY && !ONLY.some((o) => name.includes(o))) return
  const page = await open(opts)
  const issues = []
  const expect = (cond, msg) => {
    if (!cond) issues.push(msg)
  }
  try {
    await fn(page, expect)
    await sleep(1000)
    issues.push(...(await settled(page)))
  } catch (e) {
    issues.push(String(e).split('\n')[0])
  }
  issues.push(...page.errors.splice(0))
  results.push({ name, ok: issues.length === 0, issues })
  console.log(`${issues.length ? 'HATA ' : 'TAMAM'}  ${name}${issues.length ? '\n   ' + issues.join('\n   ') : ''}`)
  await page.close()
}

const url = (page) => page.evaluate(() => decodeURI(location.pathname + location.search))
const selectedNames = async (page) =>
  (await tabs(page)).filter((t) => t.selected).map((t) => t.name)
const names = async (page) => (await tabs(page)).map((t) => t.name)
const screenOf = async (page, name, nth = 0) =>
  (await tabs(page)).filter((t) => t.name.includes(name))[nth]?.screen
/** Kurulum düzeninin ekranları (listenin üstünde talep + kendi sekmesinde talep, İK, uygulama, liste). */
async function setup(page) {
  await goto(page, SETUP_URL, LOAD_WAIT)
  const t = await tabs(page)
  const pick = (name, nth = 0) => t.filter((x) => x.name.includes(name))[nth]?.screen
  return {
    form: pick('Satın Alma Talep Formu', 0),
    own: pick('Satın Alma Talep Formu', 1),
    hr: pick('Kullanıcılar'),
    app: pick('Personel Rehberi'),
    list: pick('Masraf Bildirimi'),
  }
}
/** Ekranın bölmesindeki öğe. */
const INPANE = (screen, css, text) => ({ css: `#screen-pane-${screen} ${css}`, text })
const ROW = (screen, nth = 0) => ({ css: `#screen-pane-${screen} tr[data-open-path]`, nth })
/** Açık menünün öğesi (antd açılır menü). */
const MENU_ITEM = (text) => ({ css: '.ant-dropdown:not(.ant-dropdown-hidden) li[role=menuitem]', text })

/* --- Başlangıç ----------------------------------------------------------------------------------- */

await test('Başlangıç tek başına: şerit görünür, yaprak Başlangıç’ın altında', async (page, expect) => {
  await goto(page, '/calisma-alani')
  const t = await tabs(page)
  expect(t.length === 1 && t[0].screen === 'start' && t[0].selected, `sekmeler: ${JSON.stringify(t)}`)
  expect((await url(page)) === '/calisma-alani', `adres ${await url(page)}`)
})

await test('Başlangıç’tan açılan yeni sekmede, Başlangıç yerinde kalır', async (page, expect) => {
  await goto(page, '/calisma-alani')
  await click(page, INPANE('start', '[role=option][aria-label^="Satın Alma Yönetimi"]'))
  await waitFor(page, ROW('start'))
  await click(page, ROW('start', 1))
  await sleep(LOAD_WAIT)
  const t = await tabs(page)
  expect(t.length === 2, `sekme sayısı ${t.length}`)
  expect(t[1]?.selected && t[1]?.name === 'Satın Alma Talep Formu', `seçili: ${await selectedNames(page)}`)
  expect((await url(page)).startsWith('/is-akislari/bekleyen/satin-alma/'), `adres ${await url(page)}`)
  // Başlangıç'a dönünce iş akışları bloğu aynı (süreç seçili kalır)
  await click(page, TAB('start'))
  await sleep(500)
  const sel = await page.evaluate(
    () => !!document.querySelector('#screen-pane-start [role=option][aria-selected=true]'),
  )
  expect(sel, 'Başlangıç’ın seçili süreci kayboldu')
})

/* --- Geçişler --------------------------------------------------------------------------------------- */

for (const [motion, tag] of [
  ['full', ''],
  ['reduced', ' (animasyon Az)'],
  ['off', ' (animasyon Kapalı)'],
]) {
  const theme = motion === 'full' ? undefined : { motion }
  await test(`hızlı tıklamalar (geçişler yarıda kesilir)${tag}`, async (page) => {
    const K = await setup(page)
    for (const k of [K.hr, 'start', K.form, K.app, K.list, K.own, 'start', K.hr]) {
      await click(page, TAB(k))
      await sleep(35)
    }
  }, { theme })

  await test(`child yan yana açılıp hemen kapanır${tag}`, async (page, expect) => {
    const K = await setup(page)
    await click(page, IN('button', 'Tedarikçi Teklifi Ekle'))
    await sleep(60)
    await click(page, { css: `${STRIP} button[aria-label="Kapat: Tedarikçi Teklif Formu"]`, visible: false })
    await sleep(300)
    const t = await tabs(page)
    expect(!t.some((x) => x.name === 'Tedarikçi Teklif Formu'), 'child sekmede duruyor')
    expect((await selectedNames(page)).join() === 'Satın Alma Talep Formu', `seçili ${await selectedNames(page)}`)
    expect(!!K.form, 'kurulum')
  }, { theme })

  await test(`bir sekme gelirken başkası kapanır${tag}`, async (page) => {
    const K = await setup(page)
    await click(page, TAB(K.own))
    await sleep(500)
    await click(page, IN('button', 'Mevcut Sözleşmeyi Aç'))
    await sleep(30)
    await click(page, { css: `${STRIP} button[aria-label="Kapat: Personel Rehberi"]`, visible: false })
  }, { theme })
}

/* --- Child formlar ------------------------------------------------------------------------------- */

await test('child boyut 2: açanın sekmesi yan yana; kapanınca tek', async (page, expect) => {
  await setup(page)
  await click(page, IN('button', 'Tedarikçi Teklifi Ekle'))
  await sleep(LOAD_WAIT)
  const t = await tabs(page)
  const pair = t.filter((x) => x.tab === t.find((y) => y.name === 'Tedarikçi Teklif Formu')?.tab)
  expect(pair.length === 2, `yan yana değil: ${JSON.stringify(pair.map((x) => x.name))}`)
  const share = await page.evaluate((sel) => {
    const panes = [...document.querySelectorAll(sel)].filter(
      (p) => getComputedStyle(p).contentVisibility !== 'hidden',
    )
    const w = panes.map((p) => p.getBoundingClientRect().width)
    return w.length === 2 ? Math.max(...w) / (w[0] + w[1]) : null
  }, PANE)
  // Boyut 2: child ⅔
  expect(share !== null && Math.abs(share - 2 / 3) < 0.03, `pay ${share}`)
})

await test('child boyut 3: yeni sekme, otomatik grup; açan kapanınca child da kapanır', async (page, expect) => {
  const K = await setup(page)
  await click(page, TAB(K.own))
  await sleep(500)
  await click(page, IN('button', 'Mevcut Sözleşmeyi Aç'))
  await sleep(LOAD_WAIT)
  let t = await tabs(page)
  const opener = t.findIndex((x) => x.screen === K.own)
  const child = t[opener + 1]
  expect(child?.name === 'Bakım Sözleşmesi Formu' && child.selected, `açanın sağında değil: ${await names(page)}`)
  expect(child?.group && child.group === t[opener].group, 'otomatik grup yok')
  // Adreste child yazılmaz (ailenin kökü seçili)
  expect((await url(page)).startsWith('/talepler/bekleyen-satin-alma-1'), `adres ${await url(page)}`)
  await click(page, { css: `${STRIP} button[aria-label="Kapat: Satın Alma Talep Formu"]`, visible: false, nth: 1 })
  await sleep(600)
  t = await tabs(page)
  expect(!t.some((x) => x.name === 'Bakım Sözleşmesi Formu'), `child kapanmadı: ${await names(page)}`)
})

/* --- Listenin üstünde form ------------------------------------------------------------------------ */

await test('listenin üstünde form: geri / ileri / kabuğun Geri’si; liste aynı kalır', async (page, expect) => {
  await goto(page, '/is-akislari/bekleyen/masraf')
  const list = (await tabs(page))[1].screen
  // Liste ikinci sayfada; bölme işaretlenir (yeniden takılırsa işaret gider)
  await click(page, INPANE(list, '.ant-pagination-item-2'))
  await sleep(400)
  await page.evaluate((s) => {
    document.getElementById(`screen-pane-${s}`).querySelector('table').__mark = 1
  }, list)
  await click(page, ROW(list, 1))
  await sleep(LOAD_WAIT)
  expect((await names(page)).length === 2, `sekme sayısı ${(await names(page)).length}`)
  expect((await selectedNames(page)).join() === 'Masraf Bildirim Formu', `seçili ${await selectedNames(page)}`)
  const formUrl = await url(page)
  expect(formUrl.startsWith('/is-akislari/bekleyen/masraf/'), `adres ${formUrl}`)
  await page.goBack()
  await sleep(800)
  expect((await url(page)) === '/is-akislari/bekleyen/masraf', `geri: ${await url(page)}`)
  const kept = await page.evaluate((s) => {
    const pane = document.getElementById(`screen-pane-${s}`)
    return {
      mark: pane.querySelector('table')?.__mark === 1,
      page2: !!pane.querySelector('.ant-pagination-item-2.ant-pagination-item-active'),
    }
  }, list)
  expect(kept.mark, 'liste yeniden kuruldu')
  expect(kept.page2, 'listenin sayfası kayboldu')
  await page.goForward()
  await sleep(LOAD_WAIT)
  expect((await url(page)) === formUrl, `ileri: ${await url(page)}`)
  await click(page, { css: 'button[aria-label="Geri"]:not([id^="screen-pane-"] button)' })
  await sleep(800)
  expect((await url(page)) === '/is-akislari/bekleyen/masraf', `kabuk geri: ${await url(page)}`)
})

await test('ayrı sekmeye taşı: form yeni sekmede, liste geri gelir', async (page, expect) => {
  await goto(page, '/is-akislari/bekleyen/masraf')
  const list = (await tabs(page))[1].screen
  await click(page, ROW(list, 0))
  await sleep(LOAD_WAIT)
  await click(page, IN('button[aria-label="Ayrı sekmeye taşı"]'))
  await sleep(800)
  const t = await tabs(page)
  expect(t.length === 3, `sekmeler: ${t.map((x) => x.name)}`)
  expect(t[1]?.name === 'Finans – Masraf Bildirimi', `liste dönmedi: ${t[1]?.name}`)
  expect(t[2]?.name === 'Masraf Bildirim Formu' && t[2]?.selected, `form yeni sekmede değil`)
  expect((await url(page)).startsWith('/talepler/'), `adres ${await url(page)}`)
})

/* --- Açma yolları --------------------------------------------------------------------------------- */

await test('aynı talep ikinci kez açılmaz: Başlangıç’tan açınca sekmesine geçilir', async (page, expect) => {
  await setup(page)
  const before = (await tabs(page)).length
  await click(page, TAB('start'))
  await sleep(400)
  await click(page, INPANE('start', '[role=option][aria-label^="Satın Alma Yönetimi"]'))
  await waitFor(page, ROW('start'))
  // bekleyen-satin-alma-1 kendi sekmesinde açık
  const row = await page.evaluate(() =>
    [...document.querySelectorAll('#screen-pane-start tr[data-open-path]')].findIndex((r) =>
      r.dataset.openPath.endsWith('/bekleyen-satin-alma-1'),
    ),
  )
  expect(row >= 0, 'satır yok')
  await click(page, ROW('start', row))
  await sleep(800)
  const t = await tabs(page)
  expect(t.length === before, `yeni sekme açıldı (${before} → ${t.length})`)
  expect((await url(page)).startsWith('/talepler/bekleyen-satin-alma-1'), `adres ${await url(page)}`)
})

await test('Cmd + tık ve orta tık: arka planda yeni sekme; talep tek', async (page, expect) => {
  const K = await setup(page)
  await click(page, TAB(K.list))
  await sleep(500)
  const n0 = (await tabs(page)).length
  const meta = (nth, opts) =>
    page.evaluate(
      (s, n, o) => {
        const el = document.querySelectorAll(s)[n]
        el.dispatchEvent(new MouseEvent(o.type, { bubbles: true, cancelable: true, button: o.button, metaKey: o.meta }))
      },
      `#screen-pane-${K.list} tr[data-open-path]`,
      nth,
      opts,
    )
  await meta(0, { type: 'click', button: 0, meta: true })
  await sleep(400)
  await meta(1, { type: 'auxclick', button: 1, meta: false })
  await sleep(400)
  await meta(0, { type: 'click', button: 0, meta: true })
  await sleep(LOAD_WAIT)
  const t = await tabs(page)
  expect(t.length === n0 + 2, `sekme sayısı ${n0} → ${t.length}`)
  expect((await selectedNames(page)).join() === 'Finans – Masraf Bildirimi', `seçim değişti: ${await selectedNames(page)}`)
})

await test('sağ tık menüsü: Yan yana aç', async (page, expect) => {
  const K = await setup(page)
  await click(page, TAB(K.list))
  await sleep(500)
  const r = await page.evaluate((s) => {
    const b = document.querySelector(s).getBoundingClientRect()
    return { x: b.x + 40, y: b.y + b.height / 2 }
  }, `#screen-pane-${K.list} tr[data-open-path]`)
  await page.mouse.click(r.x, r.y, { button: 'right' })
  await sleep(300)
  const items = await page.evaluate(() =>
    [...document.querySelectorAll('.ant-dropdown:not(.ant-dropdown-hidden) li[role=menuitem]')].map((l) =>
      l.textContent.trim(),
    ),
  )
  expect(items.join('|') === 'Aç|Yeni sekmede aç|Yan yana aç', `menü: ${items}`)
  await click(page, MENU_ITEM('Yan yana aç'))
  await sleep(LOAD_WAIT)
  expect((await selectedNames(page)).length === 2, `yan yana değil: ${await selectedNames(page)}`)
})

await test('raf: açık uygulamaya geçer; sağ tık ve Cmd + tık yenisini açar', async (page, expect) => {
  await setup(page)
  const n0 = (await tabs(page)).length
  const HR = '[role=list][aria-label="Uygulamalar"] a[aria-label="İnsan Kaynakları"]'
  await click(page, { css: HR })
  await sleep(500)
  expect((await selectedNames(page)).join() === 'Kullanıcılar', `seçili ${await selectedNames(page)}`)
  expect((await tabs(page)).length === n0, 'raf yeni sekme açtı')
  await mouseClick(page, { css: HR }, { button: 'right' })
  await sleep(300)
  await click(page, MENU_ITEM('Yeni sekmede aç'))
  await sleep(600)
  expect((await tabs(page)).length === n0 + 1, `sağ tık: ${(await tabs(page)).length}`)
  const sel = await selectedNames(page)
  await page.evaluate((s) => {
    document.querySelector(s).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }))
  }, HR)
  await sleep(600)
  expect((await tabs(page)).length === n0 + 2, `Cmd + tık: ${(await tabs(page)).length}`)
  expect((await selectedNames(page)).join() === sel.join(), 'Cmd + tık seçimi değiştirdi')
})

/* --- Düzen ---------------------------------------------------------------------------------------- */

await test('sürükleyerek taşıma: sekme sola geçer, adres sırayı izler', async (page, expect) => {
  const K = await setup(page)
  const before = await names(page)
  const from = await page.evaluate((s) => {
    const b = document.querySelector(s).closest('[data-tab]').getBoundingClientRect()
    return { x: b.x + 30, y: b.y + b.height / 2 }
  }, `${STRIP} [role=tab][data-screen="${K.app}"]`)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 24; i++) {
    await page.mouse.move(from.x - i * 12, from.y)
    await sleep(16)
  }
  await page.mouse.up()
  await sleep(600)
  const after = await names(page)
  expect(after.indexOf('Personel Rehberi') < before.indexOf('Personel Rehberi'), `sıra değişmedi: ${after}`)
  const u = await url(page)
  expect(u.indexOf('u.personel-rehberi') < u.indexOf('ik.kullanicilar'), `adres sırası: ${u}`)
})

await test('sekme menüsü: Sağa taşı', async (page, expect) => {
  const K = await setup(page)
  const before = await names(page)
  await mouseClick(page, TAB(K.hr), { button: 'right' })
  await sleep(300)
  await click(page, MENU_ITEM('Sağa taşı'))
  await sleep(600)
  const after = await names(page)
  expect(after.indexOf('Kullanıcılar') === before.indexOf('Kullanıcılar') + 1, `sıra: ${after}`)
})

await test('bağlantıyı kopyala: sekmenin kendi adresi', async (page, expect) => {
  const K = await setup(page)
  await browser.defaultBrowserContext().overridePermissions(URL_BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write'])
  await mouseClick(page, TAB(K.hr), { button: 'right' })
  await sleep(300)
  await click(page, MENU_ITEM('Bağlantıyı kopyala'))
  await sleep(400)
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text === `${URL_BASE}/insan-kaynaklari/kullanicilar`, `kopyalanan: ${text}`)
})

await test('yan yana al (sağ tık), yer değiştir, ayır; sekmede düğme yok', async (page, expect) => {
  const K = await setup(page)
  await click(page, TAB(K.list))
  await sleep(500)
  const buttons = await page.evaluate(
    (s) => document.querySelectorAll(`${s} button[aria-label^="Yan yana aç"]`).length,
    STRIP,
  )
  expect(buttons === 0, `sekmede yan yana düğmesi var (${buttons})`)
  await mouseClick(page, TAB(K.hr), { button: 'right' })
  await sleep(300)
  await click(page, MENU_ITEM('Yan yana aç'))
  await sleep(800)
  expect((await selectedNames(page)).join('+') === 'Finans – Masraf Bildirimi+Kullanıcılar', `yan yana: ${await selectedNames(page)}`)
  // Yan yanayken başka sekmenin menüsünde "Yan yana aç" yok
  await mouseClick(page, TAB(K.app), { button: 'right' })
  await sleep(300)
  const items = await page.evaluate(() =>
    [...document.querySelectorAll('.ant-dropdown:not(.ant-dropdown-hidden) li[role=menuitem]')].map((l) => l.textContent.trim()),
  )
  expect(!items.includes('Yan yana aç'), `yan yanayken menüde: ${items}`)
  await page.keyboard.press('Escape')
  await sleep(300)
  // Yer değiştir ve ayır yalnızca yan yana sekmenin menüsünde
  await mouseClick(page, TAB(K.hr), { button: 'right' })
  await sleep(300)
  await click(page, MENU_ITEM('Yer değiştir'))
  await sleep(800)
  expect((await selectedNames(page)).join('+') === 'Kullanıcılar+Finans – Masraf Bildirimi', `yer değiştir: ${await selectedNames(page)}`)
  await mouseClick(page, TAB(K.hr), { button: 'right' })
  await sleep(300)
  await click(page, MENU_ITEM('Ayrı sekmelere ayır'))
  await sleep(800)
  expect((await selectedNames(page)).length === 1, `ayrılmadı: ${await selectedNames(page)}`)
})

await test('seçim sekme genişliğini değiştirmez (geniş ve dar şerit)', async (page, expect) => {
  for (const width of [1512, 1000]) {
    await page.setViewport({ width, height: 945, deviceScaleFactor: 1 })
    await goto(
      page,
      '/calisma-alani?sekmeler=ia.bekleyen.masraf,ia.bekleyen.izin,ik.kullanicilar,u.personel-rehberi,ia.bekleyen.dof,ik.pozisyonlar,ia.bekleyen.egitim',
    )
    const widths = () =>
      page.evaluate((s) => [...document.querySelectorAll(`${s} [data-tab]`)].map((t) => Math.round(t.getBoundingClientRect().width)).join(','), STRIP)
    const w0 = await widths()
    for (const t of (await tabs(page)).slice(1, 5)) {
      await click(page, TAB(t.screen))
      await sleep(400)
      const w = await widths()
      expect(w === w0, `${width}px, ${t.name} seçilince: ${w0} → ${w}`)
    }
  }
})

await test('bölücü klavyesi: End %70, Home %30', async (page, expect) => {
  await goto(page, '/is-akislari/bekleyen/masraf?sekmeler=*~ik.kullanicilar')
  const share = () =>
    page.evaluate((sel) => {
      const panes = [...document.querySelectorAll(sel)].filter(
        (p) => getComputedStyle(p).contentVisibility !== 'hidden',
      )
      const [a, b] = panes.map((p) => p.getBoundingClientRect()).sort((x, y) => x.left - y.left)
      return a && b ? a.width / (a.width + b.width) : null
    }, PANE)
  await page.evaluate((sel) => {
    // Görünen bölücü (Başlangıç'ın iş akışları bloğunda da bir bölücü var)
    const sep = [...document.querySelectorAll('[role=separator][aria-label="Bölücü"]')].find(
      (s) => s.checkVisibility() && !s.closest(sel),
    )
    sep.focus()
  }, PANE)
  await page.keyboard.press('End')
  await sleep(800)
  let s = await share()
  expect(Math.abs(s - 0.7) < 0.02, `End: ${s}`)
  await page.keyboard.press('Home')
  await sleep(800)
  s = await share()
  expect(Math.abs(s - 0.3) < 0.02, `Home: ${s}`)
  expect((await url(page)).includes('@30'), `adres payı: ${await url(page)}`)
})

await test('klavye: oklar odağı taşır, Enter seçer, Delete kapatır', async (page, expect) => {
  const K = await setup(page)
  await page.evaluate((s) => document.querySelector(`${s} [role=tab][tabindex="0"]`).focus(), STRIP)
  await page.keyboard.press('ArrowRight')
  const focused = await page.evaluate(() => document.activeElement?.dataset.screen)
  expect(focused === K.own, `odak ${focused}`)
  await page.keyboard.press('Enter')
  await sleep(500)
  expect((await selectedNames(page)).join() === 'Satın Alma Talep Formu', `seçili ${await selectedNames(page)}`)
  const n = (await tabs(page)).length
  await page.keyboard.press('Delete')
  await sleep(600)
  expect((await tabs(page)).length === n - 1, 'Delete kapatmadı')
  const after = await page.evaluate(() => document.activeElement?.getAttribute('role'))
  expect(after === 'tab', `odak sekmeye dönmedi (${after})`)
})

await test('kapatırken genişlik donması (dar pencere, çok sekme)', async (page, expect) => {
  await goto(
    page,
    '/calisma-alani?sekmeler=ia.bekleyen.masraf,ia.bekleyen.izin,ia.bekleyen.sozlesme,ia.bekleyen.dof,ia.bekleyen.egitim,ia.bekleyen.arac,ia.bekleyen.yetki,ik.kullanicilar,ik.pozisyonlar,ik.departmanlar,ik.sirketler',
  )
  const widths = () =>
    page.evaluate((s) =>
      Object.fromEntries(
        [...document.querySelectorAll(`${s} [data-tab]`)].map((t) => [t.dataset.tab, Math.round(t.getBoundingClientRect().width)]),
      ),
    STRIP)
  // Daralmış: sekme adları kesiliyor
  const tight = await page.evaluate(
    (s) => [...document.querySelectorAll(`${s} [data-label]`)].some((l) => l.scrollWidth > l.clientWidth + 1),
    STRIP,
  )
  const w0 = await widths()
  const victim = (await tabs(page))[3]
  await page.evaluate((s) => {
    document.querySelector(s).closest('[data-tab]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  }, `${STRIP} [role=tab][data-screen="${victim.screen}"]`)
  const at = await mouseClick(page, { css: `${STRIP} button[aria-label="Kapat: ${victim.name}"]`, visible: false })
  await sleep(600)
  const w1 = await widths()
  const frozen = Object.keys(w1).every((k) => !(k in w0) || Math.abs(w1[k] - w0[k]) <= 1)
  await page.mouse.move(at.x, at.y + 300)
  await sleep(800)
  const w2 = await widths()
  const grew = Object.keys(w2).some((k) => k in w1 && w2[k] > w1[k] + 2)
  expect(tight, 'şerit daralmadı (sınama geçersiz)')
  expect(frozen, `genişlikler değişti: ${JSON.stringify(w0)} → ${JSON.stringify(w1)}`)
  expect(grew, `imleç ayrılınca genişlemedi: ${JSON.stringify(w1)} → ${JSON.stringify(w2)}`)
  // Sekmeler sıkışık ama adlı (kapatma düğmeli) kalacak genişlik: gezinme solda (sol sütun 76px);
  // daha darda ikon kipine düşerler, seçili olmayanın kapatması olmaz
}, { width: 1180 })

/* --- Adres ---------------------------------------------------------------------------------------- */

await test('adresten kurulum: kullanıcı grubu, yan yana pay, seçili; yenileyince aynı', async (page, expect) => {
  const want =
    '/is-akislari/bekleyen/masraf?sekmeler=(Ekip.2;*~ik.kullanicilar@40,u.personel-rehberi),ia.bekleyen.izin'
  await goto(page, want)
  expect((await url(page)) === want, `adres değişti: ${await url(page)}`)
  const named = await page.evaluate(
    (s) => [...document.querySelectorAll(`${s} [data-group]`)].some((g) => g.textContent.includes('Ekip')),
    STRIP,
  )
  expect(named, 'grup adı yok')
  expect((await selectedNames(page)).join('+') === 'Finans – Masraf Bildirimi+Kullanıcılar', `seçili ${await selectedNames(page)}`)
  await page.reload({ waitUntil: 'networkidle0' })
  await sleep(800)
  expect((await url(page)) === want, `yenileyince: ${await url(page)}`)
})

await test('sınır: en çok 12 ekran, fazlası uyarır', async (page, expect) => {
  await goto(
    page,
    '/calisma-alani?sekmeler=ia.bekleyen.masraf,ia.bekleyen.izin,ia.bekleyen.sozlesme,ia.bekleyen.dof,ia.bekleyen.egitim,ia.bekleyen.arac,ia.bekleyen.yetki,ik.kullanicilar,ik.pozisyonlar,ik.departmanlar,ik.sirketler,ik.unvanlar,ik.gruplar',
  )
  const n = (await tabs(page)).length
  expect(n === 13, `adresten ${n - 1} ekran (12 bekleniyordu)`)
  await mouseClick(page, { css: '[role=list][aria-label="Uygulamalar"] a[aria-label="İnsan Kaynakları"]' }, { button: 'right' })
  await sleep(300)
  await click(page, MENU_ITEM('Yeni sekmede aç'))
  await sleep(500)
  expect((await tabs(page)).length === n, 'sınır aşıldı')
  const warned = await page.evaluate(() => document.body.textContent.includes('En çok 12 ekran açılabilir'))
  expect(warned, 'uyarı yok')
})

/* --- Kabuk ve veri --------------------------------------------------------------------------------- */

await test('uyuyan sekmeler: adresten açılınca hemen seçilen sekme içeriğiyle gelir', async (page, expect) => {
  await page.goto(URL_BASE + SETUP_URL, { waitUntil: 'domcontentloaded' })
  await waitFor(page, { css: STRIP, visible: false })
  const hr = await screenOf(page, 'Kullanıcılar')
  await click(page, TAB(hr))
  await waitFor(page, INPANE(hr, 'tr.ant-table-row'), 3000)
  const rows = await page.evaluate((s) => document.querySelectorAll(`#screen-pane-${s} tr.ant-table-row`).length, hr)
  expect(rows > 0, 'İK tablosu boş')
})

await test('başlat kutusu: uygulama açınca kapanır, uygulama yeni sekmede', async (page, expect) => {
  await goto(page, '/calisma-alani')
  await click(page, { css: 'button[aria-label="Başlat"]' })
  await waitFor(page, { css: '[role=dialog][aria-label="Başlat"]' })
  await click(page, { css: '[role=dialog][aria-label="Başlat"] button', text: 'Personel Rehberi' })
  await sleep(LOAD_WAIT)
  const open = await page.evaluate(() => !!document.querySelector('[role=dialog][aria-label="Başlat"]'))
  expect(!open, 'başlat kutusu açık kaldı')
  expect((await selectedNames(page)).join() === 'Personel Rehberi', `seçili ${await selectedNames(page)}`)
})

await test('tüm uygulamalar: seçili sekmenin uygulaması işaretli', async (page, expect) => {
  const K = await setup(page)
  await click(page, TAB(K.app))
  await sleep(400)
  await click(page, { css: 'button[aria-label="Tüm uygulamalar"]' })
  await sleep(600)
  const current = await page.evaluate(() =>
    [...document.querySelectorAll('.ant-drawer [aria-current=page]')].map((b) => b.textContent.trim()),
  )
  expect(current.join() === 'Personel Rehberi', `işaretli: ${current}`)
  await page.keyboard.press('Escape')
  // Köşedeki "Tüm uygulamalar" tutamacı yalnızca gezinme üstteyken
}, { theme: { nav: 'top' } })

await test('karar: gizli liste ve Başlangıç’ın sayıları güncellenir', async (page, expect) => {
  await goto(page, '/is-akislari/bekleyen/izin')
  const list = (await tabs(page))[1].screen
  const rows = () =>
    page.evaluate((s) => document.querySelectorAll(`#screen-pane-${s} tr[data-open-path]`).length, list)
  const pending = () =>
    page.evaluate(() => {
      const tab = [...document.querySelectorAll('#screen-pane-start [role=tab]')].find((t) =>
        t.textContent.includes('Bekleyen Onaylar'),
      )
      return Number(tab?.textContent.replace(/\D+/g, ' ').trim().split(' ').pop())
    })
  const r0 = await rows()
  const p0 = await pending()
  await click(page, ROW(list, 0))
  await sleep(LOAD_WAIT)
  await click(page, IN('button', 'Onayla'))
  await sleep(800)
  await page.goBack()
  await sleep(800)
  expect((await rows()) === r0 - 1, `liste: ${r0} → ${await rows()}`)
  expect((await pending()) === p0 - 1, `Başlangıç sayısı: ${p0} → ${await pending()}`)
})

/* --- Gezinme konumları ------------------------------------------------------------------------------ */

for (const nav of ['default', 'top']) {
  await test(`gezinme ${nav}: çalışma alanı ekranda, kabukla çakışmaz`, async (page, expect) => {
    await setup(page)
    const r = await page.evaluate((sel) => {
      const host = document.querySelector(sel).parentElement.getBoundingClientRect()
      const chrome = [...document.querySelectorAll('[role=navigation][aria-label="Ana menü"]')].map((n) =>
        n.getBoundingClientRect(),
      )
      // Geri / ileri ve eylemler sekme satırında (bölmelerin üstünde)
      const row = ['Geri', 'Tema ayarları'].map((l) => document.querySelector(`button[aria-label="${l}"]:not([id^="screen-pane-"] button)`)?.getBoundingClientRect())
      return { host: { l: host.left, r: host.right, t: host.top, b: host.bottom }, chrome: chrome.map((c) => ({ l: c.left, r: c.right, t: c.top, b: c.bottom })), row: row.map((b) => b && { t: b.top, b: b.bottom, l: b.left, r: b.right }), w: innerWidth, h: innerHeight }
    }, PANE)
    const { host, chrome, row, w, h } = r
    for (const b of row) expect(b && b.b <= host.t + 1 && b.l >= host.l - 1 && b.r <= host.r + 1, `sekme satırında değil: ${JSON.stringify(b)}`)
    expect(host.l >= 0 && host.r <= w && host.t >= 0 && host.b <= h, `alan ekranın dışında: ${JSON.stringify(host)}`)
    for (const c of chrome) {
      const overlap = Math.min(host.r, c.r) - Math.max(host.l, c.l) > 0 && Math.min(host.b, c.b) - Math.max(host.t, c.t) > 0
      expect(!overlap, `raf alanın üstünde: ${JSON.stringify(c)}`)
    }
  }, { theme: { nav } })
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length} / ${results.length} sınama geçti`)
process.exit(failed.length ? 1 : 0)
