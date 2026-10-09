/*
 * Sekme şeridinin saf kararlarının sınaması (`src/synergy/tabs/widths.ts`): bağımlılık yok,
 * Node'un kendi sınayıcısı ve tür ayıklaması.
 *
 *   node --test scripts/tabs/widths.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ICON_MIN,
  LABEL_MIN,
  dragThreshold,
  freeze,
  insideStrip,
  fairShare,
  isCompact,
  swapTarget,
  topRadius,
} from '../../src/synergy/tabs/widths.ts'

test('ikon kipi: dar sekme, seçimden bağımsız', () => {
  assert.equal(isCompact(LABEL_MIN * 16 - 1, 16), true)
  assert.equal(isCompact(LABEL_MIN * 16, 16), false)
  assert.equal(isCompact(ICON_MIN * 16, 16), true)
})

test('eşit pay: doğal genişliğinde duranlar payı bırakır', () => {
  assert.equal(fairShare([100, 100], 300), Infinity)
  assert.equal(fairShare([100, 300], 300), 200)
  assert.equal(fairShare([400, 400, 400], 300), 100)
  assert.equal(fairShare([50, 400, 400], 350), 150)
})

test('dar sekmede üst köşe: üstün en az üçte biri düz', () => {
  assert.equal(topRadius(200, 16), 16)
  assert.equal(topRadius(5 * 16, 16), 16)
  assert.equal(topRadius(50, 16), 6)
  assert.equal(topRadius(20, 16), 0)
})

test('sürükleme eşiği sekmeyle orantılı, en az 3px', () => {
  assert.equal(dragThreshold(256), 16)
  assert.equal(dragThreshold(128), 8)
  assert.equal(dragThreshold(20), 3)
})

test('yer değiştirme: ön kenar komşunun ortasını geçince bir adım', () => {
  const spans = [
    { x: 0, w: 100 },
    { x: 100, w: 100 },
    { x: 200, w: 100 },
  ]
  // Sağa: sağ kenar (100 + 49) komşunun ortasına (150) varmadı / geçti
  assert.equal(swapTarget(spans, 0, 49), -1)
  assert.equal(swapTarget(spans, 0, 51), 1)
  // Sola: sol kenar komşunun ortasını geçince
  assert.equal(swapTarget(spans, 2, -49), -1)
  assert.equal(swapTarget(spans, 2, -51), 1)
  // Uçlar ve kilitli sıra (kök sekmesinin önüne geçilmez)
  assert.equal(swapTarget(spans, 2, 500), -1)
  assert.equal(swapTarget(spans, 1, -60, 1), -1)
  assert.equal(swapTarget(spans, 1, -60, 0), 0)
  assert.equal(swapTarget(spans, 1, 0), -1)
})

test('kapatırken donma: yalnızca imleçle ve daralmışken; her kapatma kilidi azaltır', () => {
  const close = { type: 'close', pointer: 'mouse', row: 1000, tab: 150, tight: true, last: false, overflow: false }
  assert.equal(freeze(null, close), 850)
  assert.equal(freeze(850, { ...close, row: 850, tab: 150 }), 700)
  // Klavye (imleç yok), daralmamış şerit, taşmayan şeridin son sekmesi: kilit yok
  assert.equal(freeze(null, { ...close, pointer: '' }), null)
  assert.equal(freeze(null, { ...close, tight: false }), null)
  assert.equal(freeze(null, { ...close, last: true }), null)
  // Taşan şeritte son sekme: kilit sürer
  assert.equal(freeze(null, { ...close, last: true, overflow: true }), 850)
  // Çözülür: ayrılma, süre, ekleme, taşıma, sığma
  for (const type of ['leave', 'timeout', 'added', 'moved', 'fits']) assert.equal(freeze(700, { type }), null)
})

test('imleç payı: altta 40px, sonda 60px', () => {
  const r = { left: 0, top: 0, right: 500, bottom: 40 }
  assert.equal(insideStrip(r, 250, 20), true)
  assert.equal(insideStrip(r, 250, 79), true)
  assert.equal(insideStrip(r, 250, 81), false)
  assert.equal(insideStrip(r, 559, 20), true)
  assert.equal(insideStrip(r, 561, 20), false)
  assert.equal(insideStrip(r, -1, 20), false)
})
