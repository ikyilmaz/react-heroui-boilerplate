/*
 * Çalışma alanının (uygulama geneli sekmeler) saf durumunun ve adresinin sınaması
 * (`src/synergy/shared/workspace.ts`, `workspaceUrl.ts`): bağımlılık yok, Node'un kendi sınayıcısı
 * ve tür ayıklaması.
 *
 *   node --test scripts/tabs/workspace.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_SCREENS,
  START,
  START_PATH,
  activeScreen,
  activeTab,
  canGoBack,
  hasTabs,
  initWorkspace,
  isBlocked,
  screenOf,
  tabOf,
  workspaceReducer,
} from '../../src/synergy/shared/workspace.ts'
import { decodeWorkspace, encodeWorkspace } from '../../src/synergy/shared/workspaceUrl.ts'

const LIST = '/is-akislari/bekleyen/p1'
const LIST2 = '/is-akislari/taslaklar'
const REQ1 = '/talepler/bekleyen-1'
const REQ2 = '/talepler/bekleyen-2'
const REQ3 = '/talepler/bekleyen-3'
/** Listenin üstünde açılan talep (İş Akış Yönetimi sekmesinde). */
const ON_LIST = '/is-akislari/bekleyen/p1/bekleyen-2'
const ON_LIST3 = '/is-akislari/bekleyen/p1/bekleyen-3'
const APP = '/uygulamalar/satin-alma'
const HR = '/insan-kaynaklari/kullanicilar'
const CHILD1 = '/talepler/child-1'
const CHILD2 = '/talepler/child-2'
const CHILD3 = '/talepler/child-3'

const run = (s, ...actions) => actions.reduce(workspaceReducer, s)
const open = (path, extra = {}) => ({ type: 'open', path, where: 'tab', ...extra })
/** Sekmeler soldan sağa: ekranların adresi (yan yana `a | b`). */
const paths = (s) => s.tabs.map((t) => t.screens.map((k) => screenOf(s, k).path).join(' | '))
const activePath = (s) => activeScreen(s).path
const keyOf = (s, path) => s.screens.find((x) => x.path === path).key
const tabKeyOf = (s, path) => tabOf(s, keyOf(s, path)).key
const groupOf = (s, path) => tabOf(s, keyOf(s, path)).group

test('Başlangıç: tek sekme, şerit yok; kapanmaz, taşınmaz, yeri değişmez', () => {
  const s = initWorkspace()
  assert.equal(hasTabs(s), false)
  assert.equal(run(s, { type: 'close', screen: START }), s)
  assert.equal(run(s, { type: 'closeTab', tab: START }), s)
  assert.equal(run(s, { type: 'moveTab', tab: START, to: 1, group: null }), s)
  // Başlangıç'tan gezinme yeni sekme açar
  const t = run(s, { type: 'go', screen: START, path: REQ1 })
  assert.deepEqual(paths(t), [START_PATH, REQ1])
  assert.equal(activePath(t), REQ1)
  assert.equal(hasTabs(t), true)
})

test('açma: kabuktan sonda; aynı şey iki kez açılmaz', () => {
  const s = run(initWorkspace(), open(LIST), open(REQ1), open(APP))
  assert.deepEqual(paths(s), [START_PATH, LIST, REQ1, APP])
  assert.equal(activePath(s), APP)
  // Talep ve uygulama: açık olana geçilir (listenin üstündeki adresiyle de aynı talep)
  assert.equal(activePath(run(s, open(REQ1))), REQ1)
  assert.equal(run(s, open(REQ1)).screens.length, s.screens.length)
  assert.equal(activePath(run(s, open('/is-akislari/bekleyen/p1/bekleyen-1'))), REQ1)
  assert.equal(run(s, open(REQ1, { force: true })).screens.length, s.screens.length)
  // Liste: birebir aynıysa ona geçilir; zorla açılırsa yenisi
  assert.equal(activePath(run(s, open(LIST))), LIST)
  assert.equal(run(s, open(LIST)).screens.length, s.screens.length)
  assert.equal(run(s, open(LIST, { force: true })).screens.length, s.screens.length + 1)
  assert.equal(activeTab(run(s, open(START_PATH))).key, START)
})

test('açma: sekmeden açılan açanın ardında, sırayla; arka planda geçilmez', () => {
  let s = run(initWorkspace(), open(LIST), open(APP))
  const list = keyOf(s, LIST)
  const appTab = activeTab(s).key
  s = run(s, open(REQ1, { from: list, background: true }))
  s = run(s, open(REQ2, { from: list, background: true }))
  assert.deepEqual(paths(s), [START_PATH, LIST, REQ1, REQ2, APP])
  assert.equal(activeTab(s).key, appTab)
  s = run(s, open(REQ3, { from: list }))
  assert.deepEqual(paths(s), [START_PATH, LIST, REQ1, REQ2, REQ3, APP])
  assert.equal(activePath(s), REQ3)
})

test('yan yana açma: bölünmüş sekmede yanındaki kendi sekmesine çıkar; Başlangıç yan yana olmaz', () => {
  let s = run(initWorkspace(), open(LIST))
  const list = keyOf(s, LIST)
  s = run(s, open(REQ1, { from: list, where: 'side' }))
  assert.deepEqual(paths(s), [START_PATH, `${LIST} | ${REQ1}`])
  assert.equal(activePath(s), REQ1)
  s = run(s, open(REQ2, { from: list, where: 'side' }))
  assert.deepEqual(paths(s), [START_PATH, `${LIST} | ${REQ2}`, REQ1])
  const t = run(initWorkspace(), open(REQ1, { from: START, where: 'side' }))
  assert.deepEqual(paths(t), [START_PATH, REQ1])
})

test('listeden açılan form listenin üstünde; geri / kapat listeye döner', () => {
  let s = run(initWorkspace(), open(LIST))
  const list = keyOf(s, LIST)
  s = run(s, { type: 'go', screen: list, path: ON_LIST })
  const form = activeScreen(s).key
  assert.deepEqual(paths(s), [START_PATH, ON_LIST])
  // Liste takılı kalır, aynı sekmede
  assert.equal(screenOf(s, form).under, list)
  assert.equal(tabOf(s, list).key, activeTab(s).key)
  assert.equal(canGoBack(s, form), true)
  for (const back of [
    run(s, { type: 'back', screen: form }),
    run(s, { type: 'close', screen: form }),
  ]) {
    assert.deepEqual(paths(back), [START_PATH, LIST])
    assert.equal(activeScreen(back).key, list)
    assert.equal(back.screens.length, 2)
  }
  // Formdan başka listeye: form kapanır, liste oraya gider (geçmişinde eski liste)
  const away = run(s, { type: 'go', screen: form, path: LIST2 })
  assert.deepEqual(paths(away), [START_PATH, LIST2])
  assert.equal(activeScreen(away).key, list)
  assert.deepEqual(activeScreen(away).back, [{ path: LIST }])
  // Geri / İleri: form yerinde başka forma (geçmişe eklemeden), liste altta kalır
  const next = run(s, { type: 'go', screen: form, path: ON_LIST3, replace: true })
  assert.deepEqual(paths(next), [START_PATH, ON_LIST3])
  assert.equal(screenOf(next, form).under, list)
  assert.deepEqual(screenOf(next, form).back, [])
  // Başka sekmede açık form: oraya geçilir
  const elsewhere = run(initWorkspace(), open(REQ1), open(LIST))
  const moved = run(elsewhere, {
    type: 'go',
    screen: keyOf(elsewhere, LIST),
    path: '/is-akislari/bekleyen/p1/bekleyen-1',
  })
  assert.equal(activePath(moved), REQ1)
  assert.deepEqual(paths(moved), paths(elsewhere))
})

test('child 3: açanın ardında yeni sekme, otomatik grup; tek child; aile aynı grupta', () => {
  let s = run(initWorkspace(), open(REQ1), open(APP))
  const req = keyOf(s, REQ1)
  s = run(s, { type: 'select', tab: tabKeyOf(s, REQ1) })
  s = run(s, { type: 'child', from: req, path: CHILD1, size: 3 })
  assert.deepEqual(paths(s), [START_PATH, REQ1, CHILD1, APP])
  assert.equal(activePath(s), CHILD1)
  assert.equal(s.groups.length, 1)
  const g = s.groups[0]
  assert.equal(g.auto, true)
  assert.equal(groupOf(s, REQ1), g.key)
  assert.equal(groupOf(s, CHILD1), g.key)
  assert.equal(groupOf(s, APP), undefined)
  // Aynı child: ona geçilir
  const again = run(s, { type: 'select', tab: tabKeyOf(s, REQ1) }, { type: 'child', from: req, path: CHILD1, size: 3 })
  assert.equal(again.screens.length, s.screens.length)
  assert.equal(activePath(again), CHILD1)
  // İkinci child birincisini kapatır; grup sürer
  const second = run(s, { type: 'child', from: req, path: CHILD2, size: 3 })
  assert.deepEqual(paths(second), [START_PATH, REQ1, CHILD2, APP])
  assert.deepEqual(second.groups, s.groups)
  assert.equal(groupOf(second, CHILD2), g.key)
  // Child'ın child'ı aynı grupta, açanın ardında
  const third = run(second, { type: 'child', from: keyOf(second, CHILD2), path: CHILD3, size: 3 })
  assert.deepEqual(paths(third), [START_PATH, REQ1, CHILD2, CHILD3, APP])
  assert.equal(groupOf(third, CHILD3), g.key)
  // Son child kapanınca otomatik grup dağılır, açana dönülür
  const closed = run(s, { type: 'close', screen: keyOf(s, CHILD1) })
  assert.deepEqual(closed.groups, [])
  assert.equal(groupOf(closed, REQ1), undefined)
  assert.equal(activePath(closed), REQ1)
})

test('child 1 / 2: sekmeyi böler; bölünmüşse sığmayan çıkar ve child kapanınca döner', () => {
  let s = run(initWorkspace(), open(REQ1))
  s = run(s, { type: 'child', from: keyOf(s, REQ1), path: CHILD1, size: 1 })
  assert.deepEqual(paths(s), [START_PATH, `${REQ1} | ${CHILD1}`])
  assert.equal(activeTab(s).ratio, 200 / 3)
  assert.equal(activePath(s), CHILD1)
  const split = run(s, { type: 'child', from: keyOf(s, CHILD1), path: CHILD2, size: 2 })
  assert.deepEqual(paths(split), [START_PATH, REQ1, `${CHILD1} | ${CHILD2}`])
  assert.equal(activeTab(split).ratio, 100 / 3)
  const back = run(split, { type: 'close', screen: keyOf(split, CHILD2) })
  assert.deepEqual(paths(back), [START_PATH, `${REQ1} | ${CHILD1}`])
  assert.equal(activeTab(back).ratio, 200 / 3)
})

test('açan–child bağı taşınınca da sürer: açan kapanınca / gidince child kapanır', () => {
  let s = run(initWorkspace(), open(LIST), open(REQ1))
  const req = keyOf(s, REQ1)
  s = run(s, { type: 'child', from: req, path: CHILD1, size: 3 })
  const childTab = tabKeyOf(s, CHILD1)
  s = run(s, { type: 'leaveGroup', tab: childTab })
  assert.deepEqual(s.groups, [])
  s = run(s, { type: 'moveTab', tab: childTab, to: 1, group: null })
  assert.deepEqual(paths(s), [START_PATH, CHILD1, LIST, REQ1])
  const closed = run(s, { type: 'close', screen: req })
  assert.deepEqual(paths(closed), [START_PATH, LIST])
  assert.equal(activePath(closed), LIST)
  // Açan başka talebe gidince (Geri / İleri) de
  let t = run(initWorkspace(), open(REQ1))
  t = run(t, { type: 'child', from: keyOf(t, REQ1), path: CHILD1, size: 3 })
  t = run(t, { type: 'go', screen: keyOf(t, REQ1), path: REQ2, replace: true })
  assert.deepEqual(paths(t), [START_PATH, REQ2])
  assert.equal(activePath(t), REQ2)
  assert.deepEqual(t.groups, [])
})

test('otomatik grup kullanıcı değiştirince kullanıcının olur, tek sekmeyle de kalır', () => {
  let s = run(initWorkspace(), open(REQ1))
  s = run(s, { type: 'child', from: keyOf(s, REQ1), path: CHILD1, size: 3 })
  const g = s.groups[0].key
  s = run(s, { type: 'editGroup', group: g, name: 'Tedarik' })
  assert.equal(s.groups[0].auto, false)
  s = run(s, { type: 'close', screen: keyOf(s, CHILD1) })
  assert.equal(s.groups.length, 1)
  assert.equal(groupOf(s, REQ1), g)
})

test('gruplar: kurma, bölmeyen taşıma, grubu taşıma, daraltma, dağıtma', () => {
  let s = run(initWorkspace(), open(REQ1), open(REQ2), open(REQ3), open(APP))
  const [a, b, c, d] = s.tabs.slice(1).map((t) => t.key)
  s = run(s, { type: 'newGroup', tabs: [b, d], name: 'X' })
  assert.deepEqual(paths(s), [START_PATH, REQ1, REQ2, APP, REQ3])
  const g = s.groups[0]
  assert.equal(g.auto, false)
  assert.equal(groupOf(s, REQ2), g.key)
  assert.equal(groupOf(s, APP), g.key)
  // Grubu bölen taşıma olmaz
  assert.equal(run(s, { type: 'moveTab', tab: c, to: 3, group: null }), s)
  // Gruba bırakılan sekme gruba katılır
  const joined = run(s, { type: 'moveTab', tab: a, to: 3, group: g.key })
  assert.deepEqual(paths(joined), [START_PATH, REQ2, APP, REQ1, REQ3])
  assert.equal(groupOf(joined, REQ1), g.key)
  // Grup bir sıra olarak taşınır; grupsuz sekme de bir sıra
  const last = run(s, { type: 'moveUnit', key: g.key, to: 2 })
  assert.deepEqual(paths(last), [START_PATH, REQ1, REQ3, REQ2, APP])
  const first = run(s, { type: 'moveUnit', key: c, to: 0 })
  assert.deepEqual(paths(first), [START_PATH, REQ3, REQ1, REQ2, APP])
  // Daralan grupta seçili sekme varsa dışarıdaki en yakına geçilir; seçilince grup açılır
  const folded = run(s, { type: 'select', tab: b }, { type: 'collapse', group: g.key, collapsed: true })
  assert.equal(activeTab(folded).key, c)
  const reopened = run(folded, { type: 'select', tab: b })
  assert.equal(reopened.groups[0].collapsed, false)
  // Sekme gruptan çıkar, grubun ardına
  const left = run(s, { type: 'leaveGroup', tab: b })
  assert.deepEqual(paths(left), [START_PATH, REQ1, APP, REQ2, REQ3])
  // Dağıtma
  const loose = run(s, { type: 'ungroup', group: g.key })
  assert.deepEqual(loose.groups, [])
  assert.ok(loose.tabs.every((t) => t.group === undefined))
})

test('kapatma: seçili sekme kapanınca sağdakine, yoksa soldakine', () => {
  let s = run(initWorkspace(), open(REQ1), open(REQ2), open(REQ3))
  s = run(s, { type: 'select', tab: tabKeyOf(s, REQ2) }, { type: 'closeTab', tab: tabKeyOf(s, REQ2) })
  assert.equal(activePath(s), REQ3)
  s = run(s, { type: 'closeTab', tab: tabKeyOf(s, REQ3) })
  assert.equal(activePath(s), REQ1)
  s = run(s, { type: 'closeTab', tab: tabKeyOf(s, REQ1) })
  assert.equal(activeTab(s).key, START)
  assert.equal(hasTabs(s), false)
})

test('ayrı sekmeye taşıma: form (aynı ekran, child’larıyla) kendi sekmesine, liste yerine döner', () => {
  let s = run(initWorkspace(), open(LIST))
  const list = keyOf(s, LIST)
  s = run(s, { type: 'go', screen: list, path: ON_LIST })
  const form = activeScreen(s).key
  s = run(s, { type: 'child', from: form, path: CHILD1, size: 3 })
  s = run(s, { type: 'popOut', screen: form, path: REQ2 })
  assert.deepEqual(paths(s), [START_PATH, LIST, REQ2, CHILD1])
  assert.equal(activeScreen(s).key, form)
  assert.equal(screenOf(s, form).under, undefined)
  assert.equal(screenOf(s, keyOf(s, CHILD1)).parent, form)
  // Otomatik grup formla gider, liste gruptan çıkar
  assert.equal(groupOf(s, LIST), undefined)
  assert.ok(groupOf(s, REQ2))
  assert.equal(groupOf(s, REQ2), groupOf(s, CHILD1))
})

test('sınır: en çok MAX_SCREENS ekran; açık olan yine açılır', () => {
  let s = initWorkspace()
  for (let i = 0; i < MAX_SCREENS; i++) s = run(s, open(`/talepler/bekleyen-${i}`))
  assert.equal(s.screens.length, MAX_SCREENS + 1)
  const extra = open('/talepler/bekleyen-99')
  assert.equal(isBlocked(s, extra), true)
  assert.equal(run(s, extra), s)
  assert.equal(isBlocked(s, open('/talepler/bekleyen-0')), false)
})

test('yan yana: yanına alma, pay sınırları, yer değiştirme, ayırma', () => {
  let s = run(initWorkspace(), open(REQ1), open(REQ2))
  const [a, b] = s.tabs.slice(1).map((t) => t.key)
  // Başlangıç yan yana olmaz
  assert.equal(run(s, { type: 'pair', tab: a, with: START }), s)
  s = run(s, { type: 'pair', tab: b, with: a })
  assert.deepEqual(paths(s), [START_PATH, `${REQ1} | ${REQ2}`])
  assert.equal(activePath(s), REQ2)
  assert.equal(activeTab(run(s, { type: 'ratio', value: 31 })).ratio, 31)
  assert.equal(activeTab(run(s, { type: 'ratio', value: 34 })).ratio, 100 / 3)
  assert.equal(activeTab(run(s, { type: 'ratio', value: 90 })).ratio, 70)
  const swapped = run(s, { type: 'ratio', value: 40 }, { type: 'swap', tab: a })
  assert.deepEqual(paths(swapped), [START_PATH, `${REQ2} | ${REQ1}`])
  assert.equal(activeTab(swapped).ratio, 60)
  const apart = run(swapped, { type: 'unpair', tab: a })
  assert.deepEqual(paths(apart), [START_PATH, REQ2, REQ1])
  assert.equal(activePath(apart), REQ2)
})

/* Adres ------------------------------------------------------------------------------------------- */

test('adres: yalnızca Başlangıç; tek sekme parametresiz', () => {
  assert.equal(encodeWorkspace(initWorkspace()), START_PATH)
  const s = run(initWorkspace(), open(REQ1))
  assert.equal(encodeWorkspace(s), REQ1)
  const d = decodeWorkspace(REQ1, '')
  assert.deepEqual(paths(d), [START_PATH, REQ1])
  assert.equal(activePath(d), REQ1)
  // Başlangıç seçiliyken öbür sekmeler parametrede
  const home = run(s, { type: 'select', tab: START })
  assert.equal(encodeWorkspace(home), `${START_PATH}?sekmeler=t.bekleyen-1`)
})

test('adres: bütün düzen yazılır ve aynen okunur', () => {
  const L = '/is-akislari/bekleyen/p12'
  const R345 = '/talepler/bekleyen-345'
  const R778 = '/talepler/bekleyen-778'
  let s = run(initWorkspace(), open(L), open(APP), open(R345), open(R778), open(HR))
  s = run(s, { type: 'pair', tab: tabKeyOf(s, R778), with: tabKeyOf(s, R345) }, { type: 'ratio', value: 40 })
  s = run(s, { type: 'newGroup', tabs: [tabKeyOf(s, APP), tabKeyOf(s, R345)], name: 'Tedarik' })
  s = run(s, { type: 'editGroup', group: s.groups[0].key, color: 1 })
  s = run(s, { type: 'select', tab: tabKeyOf(s, R345), screen: keyOf(s, R345) })
  const url = encodeWorkspace(s)
  assert.equal(
    url,
    '/talepler/bekleyen-345?sekmeler=ia.bekleyen.p12,(Tedarik.2;u.satin-alma,*~t.bekleyen-778@40),ik.kullanicilar',
  )
  const [pathname, search] = url.split('?')
  const d = decodeWorkspace(pathname, `?${search}`)
  assert.deepEqual(paths(d), paths(s))
  assert.equal(activePath(d), R345)
  assert.equal(d.groups[0].name, 'Tedarik')
  assert.equal(d.groups[0].color, 1)
  assert.equal(encodeWorkspace(d), url)
})

test('adres: child ve otomatik grup yazılmaz; seçili child’sa ailenin kökü', () => {
  let s = run(initWorkspace(), open(LIST), open(REQ1))
  s = run(s, { type: 'child', from: keyOf(s, REQ1), path: CHILD1, size: 3 })
  assert.equal(activePath(s), CHILD1)
  assert.equal(encodeWorkspace(s), `${REQ1}?sekmeler=ia.bekleyen.p1,*`)
  let t = run(initWorkspace(), open(REQ1))
  t = run(t, { type: 'child', from: keyOf(t, REQ1), path: CHILD1, size: 1 })
  assert.equal(encodeWorkspace(t), REQ1)
})

test('adres: listedeki form listesiyle geri gelir', () => {
  let s = run(initWorkspace(), open(LIST))
  s = run(s, { type: 'go', screen: keyOf(s, LIST), path: ON_LIST })
  assert.equal(encodeWorkspace(s), ON_LIST)
  const d = decodeWorkspace(ON_LIST, '')
  assert.deepEqual(paths(d), [START_PATH, ON_LIST])
  assert.equal(screenOf(d, activeScreen(d).under).path, LIST)
})

test('adres: bozuk, bilinmeyen, artık olmayan ve tekrar eden atlanır', () => {
  const d = decodeWorkspace(
    START_PATH,
    '?sekmeler=zz.x,t.bekleyen-1,t.yok,t.bekleyen-1,(bozuk,t.bekleyen-2',
    (p) => !p.endsWith('/yok'),
  )
  assert.deepEqual(paths(d), [START_PATH, REQ1])
  assert.equal(activeTab(d).key, START)
  // Geçersiz yol: Başlangıç
  assert.equal(activeTab(decodeWorkspace('/talepler/yok', '', (p) => !p.endsWith('/yok'))).key, START)
})

test('adres: `*` yoksa seçili adres açıksa ona geçilir, değilse sonda açılır', () => {
  const a = decodeWorkspace(APP, '?sekmeler=t.bekleyen-1')
  assert.deepEqual(paths(a), [START_PATH, REQ1, APP])
  assert.equal(activePath(a), APP)
  const b = decodeWorkspace(REQ1, '?sekmeler=t.bekleyen-1,u.satin-alma')
  assert.deepEqual(paths(b), [START_PATH, REQ1, APP])
  assert.equal(activePath(b), REQ1)
})

test('adres: grup adı kaçırılır; daraltılmış grup ve renk', () => {
  let s = run(initWorkspace(), open(REQ1), open(REQ2))
  s = run(s, { type: 'newGroup', tabs: [tabKeyOf(s, REQ1)], name: 'Ar-Ge (2.Faz) ~ İş*' })
  const url = encodeWorkspace(s)
  assert.equal(
    url,
    `${REQ2}?sekmeler=(Ar-Ge%20%282%2EFaz%29%20%7E%20%C4%B0%C5%9F%2A.1;t.bekleyen-1),*`,
  )
  const [pathname, search] = url.split('?')
  assert.equal(decodeWorkspace(pathname, `?${search}`).groups[0].name, 'Ar-Ge (2.Faz) ~ İş*')

  const d = decodeWorkspace('/talepler/c', '?sekmeler=(.3.k;t.a,t.b),*')
  assert.deepEqual(paths(d), [START_PATH, '/talepler/a', '/talepler/b', '/talepler/c'])
  assert.equal(d.groups[0].collapsed, true)
  assert.equal(d.groups[0].color, 2)
  assert.equal(activePath(d), '/talepler/c')
  assert.equal(encodeWorkspace(d), '/talepler/c?sekmeler=(.3.k;t.a,t.b),*')
})
