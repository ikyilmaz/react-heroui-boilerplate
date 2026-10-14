import { useSyncExternalStore } from 'react'
import type { MenuApp, PanelSize } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Form destesi: modal ya da drawer'da açılan formlar (orijinal: menü öğesinin "Şurada aç" seçeneği
 * Modal / Drawer, `openOnType`; modal ya da drawer'da açılmış formun child'ı da aynı yerde açılır,
 * `handleOpenChildForm`). `FormDeck.tsx` çizer. Açığa çekme ve kenara park etme açık istek üzerine.
 * - Menüden açılan form destenin ilk kartı (kök). Açık deste aynı uygulamanınsa yeni deste açılmaz
 *   (kenardaysa geri gelir); başka bir uygulamanınsa yerini yenisi alır (tek deste).
 * - Kartların açanı (`parent`) ve önden arkaya sırası (`order`) ayrı; açan / child ilişkisi değişmez.
 * - Açığa çekme (`revealed`): arkadaki karta basınca kart öne alınmaz (sıra değişmez), görünür olur:
 *   drawer'da sola çekilir, modalda diğer kartlar ekranın sağına kayar. Öndeki karta (modalda
 *   kenardaki kartlara) basmak, Esc ya da kartın "yerine koy" düğmesi desteyi toplar.
 * - Child öndeki karttan açılır, en öne gelir. Kartın aynı anda tek child'ı olur (orijinaldeki
 *   gibi): başka bir child açılınca öncekisi child'larıyla kapanır; aynı form zaten onun child'ıysa
 *   yeniden açılmaz, öne gelir (yazılanlar kaybolmasın).
 * - Kart kapanınca child'ları da kapanır; kök kapanınca deste kapanır.
 * - Park: deste ekranın sağ kenarına çekilir, sayfa kullanılabilir; dokununca geri gelir.
 * Bellekte, sayfa yenilenince sıfırlanır; her değişiklik yeni nesne (`useSyncExternalStore`).
 * ------------------------------------------------------------------------------------------------- */

export type DeckPlace = 'modal' | 'drawer'

export interface DeckCard {
  /** Kartın anahtarı (aynı form bir kez kapanıp açılınca yeni kart). */
  key: string
  /** Formun kimliği: menü uygulaması ya da child form (`appForms.ts` › `deckFormOf`). */
  form: string
  /** Açan kart (kökte `null`). */
  parent: string | null
}

export interface FormDeck {
  /** Destenin anahtarı (yeni deste yeni anahtar: eskisi çıkışını oynar). */
  key: string
  /** Kökün menü uygulaması. */
  app: string
  place: DeckPlace
  /** Menü öğesinin panel boyutu: destedeki bütün kartların genişliği. */
  size: PanelSize
  /** Kartlar açılış sırasıyla (ilk kart kök). */
  cards: DeckCard[]
  /** Kartların anahtarları arkadan öne (sonuncusu öndeki). */
  order: string[]
  /** Ekranın sağ kenarına çekilmiş mi. */
  parked: boolean
  /** Açığa çekilmiş arkadaki kart (yoksa `null`). */
  revealed: string | null
}

let deck: FormDeck | null = null
let seq = 0
const listeners = new Set<() => void>()

function commit(next: FormDeck | null) {
  if (next === deck) return
  deck = next
  listeners.forEach((l) => l())
}

const nextKey = () => `k${seq++}`

/** Kart ve bütün child'ları (açan zinciri üzerinden). */
function withDescendants(d: FormDeck, key: string) {
  const out = new Set([key])
  for (const c of d.cards) if (c.parent && out.has(c.parent)) out.add(c.key)
  return out
}

/** Kartları (ve child'larını) desteden çıkarır. */
function without(d: FormDeck, key: string): FormDeck {
  const gone = withDescendants(d, key)
  return {
    ...d,
    cards: d.cards.filter((c) => !gone.has(c.key)),
    order: d.order.filter((k) => !gone.has(k)),
    revealed: d.revealed && gone.has(d.revealed) ? null : d.revealed,
  }
}

/** Öndeki kartın anahtarı. */
export const frontOf = (d: FormDeck) => d.order[d.order.length - 1]

/** Menü uygulamasının formunu destede açar (uygulamanın `openOn`'u yoksa bir şey yapmaz). */
export function openDeck(app: MenuApp) {
  if (!app.openOn) return
  if (deck?.app === app.id) return commit(deck.parked ? { ...deck, parked: false } : deck)
  const key = nextKey()
  commit({
    key: nextKey(),
    app: app.id,
    place: app.openOn,
    size: app.panelSize ?? 2,
    cards: [{ key, form: app.id, parent: null }],
    order: [key],
    parked: false,
    revealed: null,
  })
}

/** `from` kartının child'ını açar (öncekisi kapanır; aynı formsa öne gelir). */
export function openDeckChild(from: string, form: string) {
  if (!deck || !deck.cards.some((c) => c.key === from)) return
  const current = deck.cards.find((c) => c.parent === from)
  if (current?.form === form) return raiseDeckCard(current.key)
  const base = current ? without(deck, current.key) : deck
  const key = nextKey()
  commit({
    ...base,
    cards: [...base.cards, { key, form, parent: from }],
    order: [...base.order, key],
    revealed: null,
  })
}

/** Kartı child'larıyla birlikte kapatır; kökse deste kapanır. */
export function closeDeckCard(key: string) {
  if (!deck || !deck.cards.some((c) => c.key === key)) return
  commit(deck.cards[0]!.key === key ? null : without(deck, key))
}

/** Kartı öne alır (diğerlerinin sırası değişmez; zaten child olan form yeniden açılınca). */
function raiseDeckCard(key: string) {
  if (!deck || !deck.order.includes(key)) return
  const order = frontOf(deck) === key ? deck.order : [...deck.order.filter((k) => k !== key), key]
  commit({ ...deck, order, revealed: null })
}

/** Arkadaki kartı açığa çeker (öne almadan); öndeki kart ya da `null` desteyi toplar. */
export function revealDeckCard(key: string | null) {
  if (!deck) return
  const next = key && key !== frontOf(deck) && deck.order.includes(key) ? key : null
  if (deck.revealed !== next) commit({ ...deck, revealed: next })
}

/** Desteyi ekranın sağ kenarına çeker (açığa çekilen kart yerine döner) ya da geri getirir. */
export function parkDeck(parked: boolean) {
  if (!deck || deck.parked === parked) return
  commit({ ...deck, parked, revealed: parked ? null : deck.revealed })
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Açık deste (yoksa `null`). */
export const useFormDeck = () =>
  useSyncExternalStore(
    subscribe,
    () => deck,
    () => deck,
  )
