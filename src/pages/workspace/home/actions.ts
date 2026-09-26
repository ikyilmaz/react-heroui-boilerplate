import type { ReactNode } from 'react'
import { toast } from '@heroui/react'
import { decide, undoDecision } from '@/pages/workflows/decisions'
import { answer, createStore, remind, snooze, unanswer, unsnooze, type SnoozeTarget } from '@/pages/workflows/triage'
import type { Decision, WorkRequest } from '@/pages/workflows/workflowData'
import type { WidgetId } from '@/pages/workspace/home/registry'
import type { DecideFrom } from '@/pages/workspace/home/types'
import type { GuidanceTarget, PeekContext } from '@/pages/workspace/home/useTriage'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfa eylemleri: karar, erteleme, hatırlatma ve yanıt — hepsi "Geri al"lı bildirimle
 *
 * Onay onaysız (tek tık) verilir; güveni bildirimdeki ve "Son kararlarınız"daki "Geri al" sağlar.
 * Satır önce 150ms solar (azaltılmış hareket tercihinde hiç beklemez), sonra karar işlenir ve
 * odak bir sonraki satıra, o yoksa bir öncekine, o da yoksa boş durum başlığına geçer.
 *
 * Odak ve kaydırma DOM'daki şu işaretlerle bulunur (bileşenler bunları koymalı):
 * - `data-widget="{id}"`       widget çerçevesinin kökü (`WidgetFrame` Card'ı)
 * - `data-row-id="{r.id}"`     odaklanabilir her satır (Table.Row, ListBox.Item)
 * - `data-next-approve` + `data-request-id="{r.id}"`  sıradaki iş kartındaki "Onayla"
 * - `data-empty-heading`       tümü bitti / boş durum başlığı (`tabIndex={-1}`)
 * - `data-menu-trigger="{id}"` widget'ın "…" düğmesi
 * ------------------------------------------------------------------------------------------------- */

/** Satırın solma süresi (ms); `index.css`'teki geçişle aynı. */
export const LEAVE_MS = 150

/** Bildirimlerin açık kalma süresi (ms). */
export const TOAST_MS = 6000

export function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Karar öncesi bekleme: 150ms, azaltılmış harekette 0. */
export function leaveDelay() {
  return prefersReducedMotion() ? 0 : LEAVE_MS
}

/* ---- Solan satırlar ---------------------------------------------------------------------------- */

const leavingStore = createStore<ReadonlySet<string>>(new Set())

/**
 * Şu an solmakta olan talepler. Satır / kart `leaving.has(r.id)` iken solma sınıfını alır
 * (opacity 0, 150ms) ve düğmeleri yeniden basılamaz.
 */
export function useLeaving(): ReadonlySet<string> {
  return leavingStore.use()
}

/** Talebi soldurur, ardından `commit`'i çalıştırır. Zaten soluyorsa `false`. */
function leave(id: string, commit: () => void) {
  if (leavingStore.get().has(id)) return false
  const delay = leaveDelay()
  if (delay === 0) {
    commit()
    return true
  }
  leavingStore.set((s) => new Set(s).add(id))
  window.setTimeout(() => {
    commit()
    leavingStore.set((s) => {
      const next = new Set(s)
      next.delete(id)
      return next
    })
  }, delay)
  return true
}

/* ---- Odak yardımcıları ------------------------------------------------------------------------- */

/** React yeniden çizdikten sonra çalıştırır (iki kare). */
export function afterPaint(fn: () => void) {
  requestAnimationFrame(() => requestAnimationFrame(fn))
}

const sel = (v: string) => (typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : v.replace(/"/g, '\\"'))
const q = (selector: string, root: ParentNode = document) => root.querySelector<HTMLElement>(selector)

export interface FocusOptions {
  /** Önce ortaya kaydır (azaltılmış harekette anında). */
  scroll?: boolean
}

/** Öğeye odaklanır; `scroll` ile `scrollIntoView({ block: 'center' })`. Bulamazsa `false`. */
export function focusEl(el: HTMLElement | null | undefined, opts: FocusOptions = {}) {
  if (!el || !el.isConnected) return false
  if (opts.scroll) el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  el.focus({ preventScroll: !!opts.scroll })
  return true
}

/** Widget çerçevesinin kökü. */
export function widgetEl(id: WidgetId) {
  return q(`[data-widget="${id}"]`)
}

/** Bir kök içindeki satır kimlikleri, çizim sırasıyla. */
export function rowIdsIn(root: ParentNode | null | undefined): string[] {
  if (!root) return []
  return [...root.querySelectorAll('[data-row-id]')].map((el) => el.getAttribute('data-row-id') ?? '').filter(Boolean)
}

/** `data-row-id` satırına odaklanır (`querySelector('[data-row-id=…]').focus()`). */
export function focusRow(id: string, root: ParentNode = document, opts?: FocusOptions) {
  return focusEl(q(`[data-row-id="${sel(id)}"]`, root), opts)
}

/** Sıradaki iş kartındaki "Onayla"ya odaklanır. */
export function focusNextApprove(opts?: FocusOptions) {
  return focusEl(q('[data-next-approve]'), opts)
}

/** Boş durum / tümü bitti başlığına odaklanır (`tabIndex={-1}` olmalı). */
export function focusEmptyHeading(root: ParentNode = document, opts?: FocusOptions) {
  return focusEl(q('[data-empty-heading]', root), opts)
}

/** Widget'ın "…" düğmesine odaklanır (taşımadan sonra). */
export function focusMenuTrigger(id: WidgetId) {
  return focusEl(q(`[data-menu-trigger="${id}"]`))
}

/** Talebin çizildiği yere odaklanır: satırı, yoksa sıradaki iş kartındaki "Onayla"sı. */
export function focusRequest(id: string, opts?: FocusOptions) {
  return focusRow(id, document, opts) || focusEl(q(`[data-next-approve][data-request-id="${sel(id)}"]`), opts)
}

/** Odak bir yere düşmediyse (ör. `body`) talebe geri döner; önizleme kapanınca kullanılır. */
export function restoreFocusSoon(id: string | null | undefined) {
  if (!id) return
  afterPaint(() => {
    const active = document.activeElement
    if (!active || active === document.body) focusRequest(id)
  })
}

/**
 * Karar / ertelemeden sonra odağın gideceği yer. Liste: aynı sıradaki satır (yani bir sonraki),
 * o yoksa bir önceki, o da yoksa widget'ın boş durum başlığı. Kart: yeni "Onayla" ya da tümü
 * bitti başlığı. Seçili talep kipinde kart kuyruğun odağını da bir sonrakine taşır.
 */
function planRefocus(r: WorkRequest, from: DecideFrom, setFocusedId?: (id: string | null) => void): () => void {
  if (from === 'peek') return () => {}

  if (from === 'next') {
    const queue = widgetEl('queue')
    const idx = rowIdsIn(queue).indexOf(r.id)
    return () => {
      if (setFocusedId && idx >= 0) {
        const ids = rowIdsIn(queue?.isConnected ? queue : widgetEl('queue'))
        setFocusedId(ids[idx] ?? ids[idx - 1] ?? null)
        afterPaint(() => void (focusNextApprove() || focusEmptyHeading()))
        return
      }
      if (focusNextApprove()) return
      if (focusEmptyHeading(widgetEl('next') ?? document)) return
      focusEmptyHeading()
    }
  }

  const rowEl = q(`[data-row-id="${sel(r.id)}"]`)
  const root = (rowEl?.closest('[data-widget]') as HTMLElement | null) ?? widgetEl(from === 'decided' ? 'decided' : 'queue')
  const idx = rowIdsIn(root).indexOf(r.id)
  return () => {
    const live = root?.isConnected ? root : null
    const ids = rowIdsIn(live)
    const target = idx >= 0 ? (ids[idx] ?? ids[idx - 1]) : ids[0]
    if (target && focusRow(target, live ?? document)) return
    if (live && focusEmptyHeading(live)) return
    if (!focusNextApprove()) focusEmptyHeading()
  }
}

/* ---- Bildirim ---------------------------------------------------------------------------------- */

/**
 * Bildirim gösterir; `onUndo` verilirse "Geri al" düğmesiyle (basınca bildirim kapanır).
 * `WorkspaceShell`'deki `<Toast.Provider placement="bottom end" className="soft-theme" />`
 * tarafından çizilir.
 */
export function toastUndo(title: string, opts: { description?: ReactNode; onUndo?: () => void; timeout?: number } = {}) {
  const { description, onUndo, timeout = TOAST_MS } = opts
  const key: string = toast(title, {
    description,
    timeout,
    actionProps: onUndo
      ? {
          children: 'Geri al',
          variant: 'secondary',
          size: 'sm',
          onPress: () => {
            toast.close(key)
            onUndo()
          },
        }
      : undefined,
  })
  return key
}

/* ---- Karar, erteleme, hatırlatma, yanıt -------------------------------------------------------- */

export interface DecideOptions {
  /** Nereden verildi (varsayılan `queue`); odağın gideceği yeri belirler. */
  from?: DecideFrom
  /** Seçili talep kipindeki kart: kuyruğun odağını bir sonraki satıra taşır. */
  setFocusedId?: (id: string | null) => void
}

/**
 * Onay / ret; onay istemez. Satır solar, karar işlenir, odak ilerler ve "Onaylandı" /
 * "Reddedildi" bildirimi "Geri al" ile çıkar (geri alınca talep öncelik yerine döner ve odak
 * satırı çiziliyorsa oraya gider). Ret notu boş olmamalı (`RejectPopover` denetler).
 */
export function decideWithUndo(r: WorkRequest, decision: Decision, note = '', opts: DecideOptions = {}) {
  const refocus = planRefocus(r, opts.from ?? 'queue', opts.setFocusedId)
  leave(r.id, () => {
    decide(r.id, decision, note.trim())
    afterPaint(refocus)
    toastUndo(decision === 'approved' ? 'Onaylandı' : 'Reddedildi', {
      description: r.template.title,
      onUndo: () => {
        undoDecision(r.id)
        afterPaint(() => void focusRequest(r.id))
      },
    })
  })
}

/** Erteler ("Sonra"); "Ertelendi · {başlık} · yarın sabah geri gelecek" + "Geri al". */
export function snoozeWithUndo(r: WorkRequest, target: SnoozeTarget, opts: DecideOptions = {}) {
  const refocus = planRefocus(r, opts.from ?? 'queue', opts.setFocusedId)
  leave(r.id, () => {
    snooze(r.id, target.until)
    afterPaint(refocus)
    toastUndo('Ertelendi', {
      description: `${r.template.title} · ${target.label.toLocaleLowerCase('tr')} geri gelecek`,
      onUndo: () => {
        unsnooze(r.id)
        afterPaint(() => void focusRequest(r.id))
      },
    })
  })
}

/** "Ertelediklerim" › "Geri getir": ertelemeyi kaldırır, çiziliyorsa satırına odaklanır. */
export function bringBack(id: string) {
  unsnooze(id)
  afterPaint(() => void focusRequest(id))
}

/**
 * "Son kararlarınız" › "Geri al" / önizleme › "Kararı geri al": talep kuyruğa öncelik yerinde
 * döner. `decided`: odak kuyruktaki satırına, çizilmiyorsa kararlar listesindeki bir sonraki
 * satıra gider. `peek`: odak önizlemede kalır (Drawer açık).
 */
export function undoDecisionWithFocus(r: WorkRequest, from: 'decided' | 'peek' = 'decided') {
  if (from === 'peek') {
    undoDecision(r.id)
    return
  }
  const refocus = planRefocus(r, from)
  undoDecision(r.id)
  afterPaint(() => {
    if (!focusRequest(r.id)) refocus()
  })
}

/** "Hatırlat": adım sahibine hatırlatma; satır "Hatırlatıldı" olur. */
export function remindWithToast(r: WorkRequest) {
  remind(r.id)
  toastUndo('Hatırlatma gönderildi', { description: r.progress?.holder.name })
}

/** "Yanıtı gönder": bilgi isteğine yanıt; "Yanıtınız iletildi" + "Geri al". */
export function answerWithUndo(r: WorkRequest, note: string) {
  answer(r.id, note.trim())
  toastUndo('Yanıtınız iletildi', { description: r.template.title, onUndo: () => unanswer(r.id) })
}

/* ---- Klavye ------------------------------------------------------------------------------------ */

type KeyLike = {
  key: string
  target: EventTarget | null
  currentTarget?: EventTarget | null
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/** Yazı alanında mı (input, textarea, contenteditable, textbox / searchbox / combobox). */
export function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false
  if (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return true
  return !!t.closest('[role="textbox"], [role="searchbox"], [role="combobox"], [contenteditable="true"]')
}

/** Etkileşimli bir denetimde mi (Boşluk orada düğmeyi basar; önizleme açmaz). */
function isControlTarget(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest('button, a[href], [role="button"], [role="link"], [role="menuitem"], [role="switch"], [role="checkbox"]')
}

/** Açık bir katman var mı (Modal, Drawer, Popover, menü). */
export function anyOverlayOpen() {
  return !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')
}

export type TriageKey = 'down' | 'up' | 'approve' | 'reject' | 'snooze' | 'peek' | 'toggleRead' | 'skip'

/**
 * Widget'ın `onKeyDown`'ında basılan tuşun anlamı (yalnızca `next` ve `queue`). Yazı alanında,
 * değiştirici tuşla, widget dışından (portal: menü, popover) gelen tuşta ya da tek tuş kısayolları
 * kapalıyken harfler yok sayılır; oklar ve Boşluk her zaman çalışır.
 * - liste: J / ↓ `down`, K / ↑ `up`, A `approve`, R `reject`, H `snooze`, Boşluk `peek`, E `toggleRead`
 *   (Enter'ı Table `onRowAction` zaten karşılar)
 * - kart:  → / J `skip`, A, R, H, Boşluk `peek`, E
 */
export function triageKey(e: KeyLike, keysOn: boolean, where: 'next' | 'list'): TriageKey | null {
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return null
  if (isTypingTarget(e.target)) return null
  const scope = e.currentTarget
  if (scope instanceof Element && e.target instanceof Node && !scope.contains(e.target)) return null

  if (e.key === ' ') return isControlTarget(e.target) ? null : 'peek'
  if (where === 'list') {
    if (e.key === 'ArrowDown') return 'down'
    if (e.key === 'ArrowUp') return 'up'
  } else if (e.key === 'ArrowRight') return 'skip'

  if (!keysOn || e.key.length !== 1) return null
  switch (e.key.toLocaleLowerCase('tr')) {
    case 'j':
      return where === 'list' ? 'down' : 'skip'
    case 'k':
      return where === 'list' ? 'up' : null
    case 'a':
      return 'approve'
    case 'r':
      return 'reject'
    case 'h':
      return 'snooze'
    case 'e':
      return 'toggleRead'
    default:
      return null
  }
}

/**
 * Sayfa geneli tuşlar (belgede dinlenir): N yeni talep, ? kısayollar. Yazı alanında ve katman
 * açıkken yok sayılır. "Tek tuş kısayolları" kapalıyken N (harf) çalışmaz; ? çalışmaya devam eder,
 * çünkü anahtarı yeniden açmanın tek yolu olan pencereyi açar (kuyruk gizliyse "…" menüsü de yok).
 */
export function pageKey(e: KeyLike, keysOn: boolean): 'new' | 'help' | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null
  if (isTypingTarget(e.target) || anyOverlayOpen()) return null
  if (e.key === '?') return 'help'
  if (keysOn && !e.shiftKey && e.key.toLocaleLowerCase('tr') === 'n') return 'new'
  return null
}

/* ---- Karşılama bağlantısı ---------------------------------------------------------------------- */

export interface GuidanceHost {
  isShown(id: WidgetId): boolean
  modeOf(id: WidgetId): string
  setFocusedId(id: string | null): void
  openPeek(id: string, context: PeekContext): void
}

/**
 * "Şimdi bakın" / "Göz atın": sıradaki iş görünüyorsa onun "Onayla"sına (seçili talep kipinde
 * önce o talebi seçer), değilse kuyruktaki satırına odaklanır ve ortaya kaydırır; ikisi de yoksa
 * önizlemeyi açar. "Yanıtlayın" / "Devam edin" önizlemeyi açar.
 */
export function runGuidance(target: GuidanceTarget, home: GuidanceHost) {
  if (target.kind === 'peek') {
    home.openPeek(target.id, target.context)
    return
  }
  if (home.isShown('next')) {
    if (home.modeOf('next') === 'secili') home.setFocusedId(target.id)
    afterPaint(() => void focusNextApprove({ scroll: true }))
    return
  }
  if (home.isShown('queue') && focusRow(target.id, widgetEl('queue') ?? document, { scroll: true })) return
  home.openPeek(target.id, 'queue')
}
