import type { PanelSize } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Çalışma alanı: uygulama genelindeki sekmeler (Workspace.tsx çizer; adres `workspaceUrl.ts`). Sekme
 * bir ekran (Başlangıç, İş Akış Yönetimi, talep, menü uygulaması, İK) ve o ekranın kendi geçmişi;
 * formların child'ları da ekran. Saf işlevler, React yok; `useReducer` ile kullanılır. Kurallar:
 * - Başlangıç ilk sekme ve sabit: kapanmaz, taşınmaz, yanına açılmaz, yeri değişmez (oradan ya da
 *   kabuktan açılan her şey yeni sekmede).
 * - Üç açılış: burada (ekran gider), yeni sekmede, yan yana. Aynı şey iki kez açılmaz: talep ve
 *   menü uygulaması açıksa ona geçilir; liste yalnızca birebir aynı adreste açıksa (`force` hariç).
 * - Listeden açılan form listenin üstüne açılır: liste altta takılı kalır (süzgeç, kaydırma, sayfa),
 *   form kapanınca (ya da geri gidilince) aynen görünür. "Ayrı sekmeye taşı" formu kendi sekmesine
 *   alır, liste yerine döner.
 * - Child form (formdaki düğme) panel boyutuyla açılır: 1 / 2 açanın sekmesini böler (sığmayan
 *   ekran kendi sekmesine çıkar, child kapanınca döner), 3 açanın hemen ardında yeni sekmede, açanın
 *   grubunda; açan grupsuzsa ikisine otomatik grup kurulur. Bir formun tek child'ı olur.
 * - Açan–child bağı sekmeler nereye taşınırsa taşınsın sürer: açan kapanınca ya da başka yere
 *   gidince child'ları (ve onların child'ları) kapanır.
 * - Gruplar bitişik sekmelerdir. Otomatik grup kullanıcı onu değiştirene kadar otomatik: adreste
 *   saklanmaz, tek sekmeye inince dağılır. Kullanıcının grubu tek sekmeyle de kalır.
 * - Başlangıç dışında en çok `MAX_SCREENS` ekran (hepsi takılı); fazlası açılmaz (`isBlocked`,
 *   çağıran uyarır).
 * Değişiklik yoksa aynı durum döner (React yeniden çizmez).
 * ------------------------------------------------------------------------------------------------- */

/** Başlangıç'ın adresi (kabuğun `BASE`'i; dosya Node sınamasında da çalışsın diye burada). */
export const START_PATH = '/calisma-alani'
/** Başlangıç'ın ekranı ve sekmesi. */
export const START = 'start'
/** Başlangıç dışında en çok açık ekran (listenin altında duran liste de sayılır: takılı). */
export const MAX_SCREENS = 12
/** En çok grup (renk sayısı kadar). */
export const MAX_GROUPS = 6

/** Grup renklerinin adları (sıra tema dosyasındaki `--group-1` … `--group-6`). */
export const GROUP_COLORS = ['Turkuaz', 'Lavanta', 'Kum', 'Pembe', 'Mavi', 'Gri'] as const

/** Bölücü sınırları (%) ve tutunma noktaları (üçte bir, yarı, üçte iki). */
export const SPLIT_MIN = 30
export const SPLIT_MAX = 70
const SNAPS = [100 / 3, 50, 200 / 3]

export function clampRatio(v: number) {
  const c = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, v))
  return SNAPS.find((p) => Math.abs(p - c) < 1.5) ?? c
}

/** Child'ın panel boyutuna göre sol bölmenin (açanın) payı. */
const LEFT_SHARE = { 1: 200 / 3, 2: 100 / 3 } as const

/* Adresler ---------------------------------------------------------------------------------------- */

/** Sondaki eğik çizgi atılır; kök Başlangıç. */
export function normalizePath(path: string) {
  const p = path.replace(/\/+$/, '')
  return p === '' ? START_PATH : p
}

const segments = (path: string) => normalizePath(path).split('/').slice(1)

/**
 * Adresin kimliği: talep ve menü uygulaması nerede açık olursa olsun aynı şey (`form`; listenin
 * üstünde de kendi sekmesinde de), liste kendi adresiyle.
 */
export function identityOf(path: string) {
  const [head, a, , c] = segments(path)
  if (head === 'talepler' && a) return { key: `talep:${a}`, form: true }
  if (head === 'is-akislari' && c) return { key: `talep:${c}`, form: true }
  if (head === 'uygulamalar' && a) return { key: `uygulama:${a}`, form: true }
  return { key: normalizePath(path), form: false }
}

/** Listeden açılan formun altındaki liste (İş Akış Yönetimi'nde talep: kutu ve süreç). */
export function listUnder(path: string) {
  const p = segments(path)
  return p[0] === 'is-akislari' && p.length === 4 ? `/${p.slice(0, 3).join('/')}` : undefined
}

/* Durum ------------------------------------------------------------------------------------------- */

/** Ekranın bir konumu (geçmiş kaydı). */
export interface Loc {
  path: string
  /** Gezinme durumu (yönlendiricinin `location.state`'i; ör. Geri / İleri listesi). */
  state?: unknown
}

/** Child yan yana açılınca bölmeden çıkarılan ekran: child kapanınca yerine döner. */
interface Undo {
  /** Child'ın açıldığı sekme. */
  tab: string
  /** Çıkarılan ekranın sekmesi. */
  out: string
  /** Çıkarılan ekran solda mıydı. */
  left: boolean
  /** Sekmenin önceki payları. */
  ratio: number
  base: number
}

/** Ekran: sekmenin (ya da yan yana sekmenin bir yarısının) gösterdiği yer ve kendi geçmişi. */
export interface Screen extends Loc {
  key: string
  back: Loc[]
  forward: Loc[]
  /** Açan form (child form): bağ, sekmeler nereye taşınırsa taşınsın sürer. */
  parent?: string
  /** Listeden açılan formun altındaki liste ekranı (takılı, gizli; form kapanınca yerine döner). */
  under?: string
  undo?: Undo
}

/** Sekme: bir ekran ya da yan yana iki ekran. */
export interface Tab {
  key: string
  /** Görünen ekranlar, soldan sağa (bir ya da iki). */
  screens: string[]
  /** Odaktaki ekran: sekmede vurgulu, dar ekranda görünen. */
  focus: string
  /** Sol bölmenin payı (%). */
  ratio: number
  /** Panel boyutundan gelen pay: bölücüye çift tıklanınca buna dönülür. */
  base: number
  group?: string
  /** Açıldığı sekme (yalnızca yeri için: art arda açılanlar sırayla dizilir). */
  opener?: string
}

/** Grup: bitişik sekmeler. */
export interface Group {
  key: string
  /** Ad (boşsa yalnızca renk). */
  name: string
  /** Rengin sırası (`GROUP_COLORS`). */
  color: number
  collapsed: boolean
  /**
   * Otomatik grup (form ve yeni sekmede açtığı child'lar): kullanıcı adını / rengini değiştirene ya
   * da başka bir sekme ekleyene kadar. Adreste saklanmaz, tek sekmeye inince dağılır.
   */
  auto: boolean
}

export interface WorkspaceState {
  /** Açık ekranlar (açılış sırasıyla), Başlangıç başta. */
  screens: Screen[]
  /** Sekmeler soldan sağa; Başlangıç hep başta. */
  tabs: Tab[]
  groups: Group[]
  /** Seçili sekme. */
  active: string
  /** Yeni anahtarlar için sayaç. */
  seq: number
}

export type Where = 'here' | 'tab' | 'side'

export type WorkspaceAction =
  /**
   * Bir yeri açar: burada, yeni sekmede (`background`: geçmeden, Ctrl / orta tık) ya da yan yana.
   * `from` yoksa ya da Başlangıç'sa hep yeni sekmede (şeridin sonunda).
   */
  | {
      type: 'open'
      path: string
      state?: unknown
      from?: string
      where: Where
      background?: boolean
      /** Liste açıksa bile yenisi (rafın sağ tık menüsü); talep ve uygulama yine tek. */
      force?: boolean
    }
  /** Formdaki düğmeyle child form; `size`: dar ekran düzeltmesinden geçmiş panel boyutu. */
  | { type: 'child'; from: string; path: string; size: PanelSize }
  /** Ekranın içinde gezinme (bağlantı); `replace` geçmişe eklemez (ör. Geri / İleri). */
  | { type: 'go'; screen: string; path: string; state?: unknown; replace?: boolean }
  | { type: 'back'; screen: string }
  | { type: 'forward'; screen: string }
  | { type: 'select'; tab: string; screen?: string }
  /** Ekranı (ve açtığı formları) kapatır; listenin üstündeki form kapanınca liste döner. */
  | { type: 'close'; screen: string }
  | { type: 'closeTab'; tab: string }
  | { type: 'closeGroup'; group: string }
  /** Listenin üstündeki formu kendi sekmesine taşır (`path`: formun kendi adresi). */
  | { type: 'popOut'; screen: string; path: string }
  | { type: 'swap'; tab: string }
  | { type: 'unpair'; tab: string }
  /** Tek ekranlı `tab`'ı tek ekranlı `with`'in yanına alır (sürükleyip bırakma, "Yan yana aç"). */
  | { type: 'pair'; tab: string; with: string; side?: 'left' | 'right' }
  /** Seçili sekmenin sol bölme payı: kesin değer ya da öncekine eklenen. */
  | { type: 'ratio'; value: number }
  | { type: 'nudge'; delta: number }
  /** Sekmeyi `to` sırasına taşır; `group` bırakıldığı grup (yoksa grupsuz). Grubu bölemez. */
  | { type: 'moveTab'; tab: string; to: number; group: string | null }
  /**
   * Sırayı (grup ya da grupsuz sekme; anahtarı) `to` sırasına taşır. Sıralar Başlangıç hariç sayılır.
   */
  | { type: 'moveUnit'; key: string; to: number }
  | { type: 'newGroup'; tabs: string[]; name?: string }
  | { type: 'addToGroup'; tab: string; group: string }
  | { type: 'leaveGroup'; tab: string }
  | { type: 'ungroup'; group: string }
  | { type: 'editGroup'; group: string; name?: string; color?: number }
  | { type: 'collapse'; group: string; collapsed: boolean }

const single = (key: string, screen: string, group?: string): Tab => ({
  key,
  screens: [screen],
  focus: screen,
  ratio: 50,
  base: 50,
  ...(group && { group }),
})

export const initWorkspace = (): WorkspaceState => ({
  screens: [{ key: START, path: START_PATH, back: [], forward: [] }],
  tabs: [single(START, START)],
  groups: [],
  active: START,
  seq: 0,
})

export const screenOf = (s: WorkspaceState, key: string) => s.screens.find((x) => x.key === key)

export const activeTab = (s: WorkspaceState) => s.tabs.find((t) => t.key === s.active) ?? s.tabs[0]!

export const activeScreen = (s: WorkspaceState) => screenOf(s, activeTab(s).focus)!

/** Başlangıç'tan başka sekme açık mı. */
export const hasTabs = (s: WorkspaceState) => s.tabs.length > 1

/** Ekranın görünen hâli: listenin altında duruyorsa üstündeki form. */
function shownAs(s: WorkspaceState, key: string) {
  if (s.tabs.some((t) => t.screens.includes(key))) return key
  return s.screens.find((x) => x.under === key)?.key
}

/** Ekranın sekmesi (altta duran listeninki üstündeki formun sekmesi). */
export function tabOf(s: WorkspaceState, key: string) {
  const shown = shownAs(s, key)
  return shown === undefined ? undefined : s.tabs.find((t) => t.screens.includes(shown))
}

/** Ekranın açtığı formlar ve onların açtıkları (kapanınca hepsi kapanır; kapatma ipucu). */
export function descendantsOf(s: WorkspaceState, key: string): string[] {
  const out: string[] = []
  const walk = (k: string) => {
    for (const x of s.screens)
      if (x.parent === k) {
        out.push(x.key)
        walk(x.key)
      }
  }
  walk(key)
  return out
}

/** Ailenin kökü: açanlar zincirinin başı (child değilse kendisi). */
export function rootOf(s: WorkspaceState, key: string) {
  let root = key
  for (let p = screenOf(s, key)?.parent; p; p = screenOf(s, p)?.parent) root = p
  return root
}

/**
 * Adresi zaten gösteren ekran: talep / uygulama her yerde (child'lar hariç: her açanın kendi
 * child'ı), liste birebir aynı adreste ve görünürse; `force` listede yenisini açtırır.
 */
export function findOpen(s: WorkspaceState, path: string, force = false) {
  const target = normalizePath(path)
  if (target === START_PATH) return screenOf(s, START)
  const id = identityOf(target)
  if (!id.form && force) return undefined
  return s.screens.find(
    (x) =>
      x.key !== START &&
      !x.parent &&
      (id.form
        ? identityOf(x.path).key === id.key
        : x.path === target && shownAs(s, x.key) === x.key),
  )
}

/** Uygulamanın (adres öneki) açık ekranı: raf "açıksa ona geç" (formun altındaki liste de sayılır). */
export function findApp(s: WorkspaceState, prefix: string) {
  const p = normalizePath(prefix)
  return s.screens.find((x) => !x.parent && (x.path === p || x.path.startsWith(`${p}/`)))
}

export const canGoBack = (s: WorkspaceState, key: string) => {
  const x = screenOf(s, key)
  return !!x && (x.back.length > 0 || !!x.under)
}

export const canGoForward = (s: WorkspaceState, key: string) =>
  (screenOf(s, key)?.forward.length ?? 0) > 0

/* Yardımcılar ------------------------------------------------------------------------------------- */

/** Konum (durumsuzsa `state` alanı yok). */
const loc = (path: string, state?: unknown): Loc => (state === undefined ? { path } : { path, state })

/** Ekranı konuma götürür. */
function moveTo(x: Screen, to: Loc, back: Loc[], forward: Loc[]): Screen {
  const next: Screen = { ...x, path: to.path, back, forward }
  if (to.state === undefined) delete next.state
  else next.state = to.state
  return next
}

function withGroup(t: Tab, group: string | undefined): Tab {
  if (t.group === group) return t
  const next = { ...t }
  if (group) next.group = group
  else delete next.group
  return next
}

const isCollapsed = (s: WorkspaceState, t: Tab) =>
  !!t.group && !!s.groups.find((g) => g.key === t.group)?.collapsed

/** Kullanılmayan ilk renk (hepsi kullanılıyorsa sırayla). */
function freeColor(groups: Group[]) {
  const used = new Set(groups.map((g) => g.color))
  const free = GROUP_COLORS.findIndex((_, i) => !used.has(i))
  return free >= 0 ? free : groups.length % GROUP_COLORS.length
}

/** Her grup tek parça mı. */
function contiguous(tabs: Tab[]) {
  const seen = new Set<string>()
  let prev: string | undefined
  for (const t of tabs) {
    if (t.group && t.group !== prev) {
      if (seen.has(t.group)) return false
      seen.add(t.group)
    }
    prev = t.group
  }
  return true
}

/** Başlangıç dışındaki sıralar: grup bir sıra, grupsuz her sekme bir sıra. */
function unitsOf(tabs: Tab[]) {
  const units: Tab[][] = []
  for (const t of tabs.slice(1)) {
    const last = units.at(-1)
    if (last && t.group && last[0]!.group === t.group) last.push(t)
    else units.push([t])
  }
  return units
}

function move<T>(list: T[], from: number, to: number): T[] {
  const out = [...list]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item!)
  return out
}

/** Boş grupları siler, tek sekmeye inen otomatik grubu dağıtır. */
function tidy(s: WorkspaceState): WorkspaceState {
  const counts = new Map<string, number>()
  for (const t of s.tabs) if (t.group) counts.set(t.group, (counts.get(t.group) ?? 0) + 1)
  const gone = new Set(
    s.groups.filter((g) => (counts.get(g.key) ?? 0) < (g.auto ? 2 : 1)).map((g) => g.key),
  )
  if (gone.size === 0) return s
  return {
    ...s,
    groups: s.groups.filter((g) => !gone.has(g.key)),
    tabs: s.tabs.map((t) => (t.group && gone.has(t.group) ? withGroup(t, undefined) : t)),
  }
}

/** Seçili sekme daraltılmış gruptaysa grup açılır. */
function expand(s: WorkspaceState): WorkspaceState {
  const key = activeTab(s).group
  const g = key ? s.groups.find((x) => x.key === key && x.collapsed) : undefined
  return g ? { ...s, groups: s.groups.map((x) => (x === g ? { ...x, collapsed: false } : x)) } : s
}

/** Grubu kullanıcıya geçirir (artık otomatik değil). */
const claim = (groups: Group[], key: string) =>
  groups.map((g) => (g.key === key && g.auto ? { ...g, auto: false } : g))

/** Yeni ekran(lar): listeden açılan formun adresi altındaki listeyle birlikte kurulur. */
function create(s: WorkspaceState, to: Loc, parent?: string) {
  let seq = s.seq
  const added: Screen[] = []
  const list = listUnder(to.path)
  const under = list ? `s${seq++}` : undefined
  if (list) added.push({ key: under!, path: list, back: [], forward: [] })
  const key = `s${seq++}`
  added.push({
    key,
    ...loc(to.path, to.state),
    back: [],
    forward: [],
    ...(under && { under }),
    ...(parent && { parent }),
  })
  return { s: { ...s, screens: [...s.screens, ...added], seq }, key }
}

/** Sekmeden açılan yeni sekmenin yeri: açanın (grubunun) ardında, ondan önce açılanların sonunda. */
function afterOpener(tabs: Tab[], host: Tab) {
  let i = tabs.indexOf(host)
  if (host.group) while (tabs[i + 1]?.group === host.group) i++
  while (tabs[i + 1] && tabs[i + 1]!.opener === host.key && !tabs[i + 1]!.group) i++
  return i + 1
}

/* İşlemler ---------------------------------------------------------------------------------------- */

function selectIn(s: WorkspaceState, key: string, screen?: string): WorkspaceState {
  const t = s.tabs.find((x) => x.key === key)
  if (!t) return s
  const focus = screen && t.screens.includes(screen) ? screen : t.focus
  if (s.active === key && t.focus === focus && !isCollapsed(s, t)) return s
  // Daraltılmış grubun sekmesi seçilince grup açılır
  return expand({
    ...s,
    active: key,
    tabs: t.focus === focus ? s.tabs : s.tabs.map((x) => (x === t ? { ...x, focus } : x)),
  })
}

/** Ekranı gösterir: sekmesi seçilir, ekran odaklanır (altta duran listede üstündeki form). */
function reveal(s: WorkspaceState, key: string) {
  const shown = shownAs(s, key)
  const t = shown === undefined ? undefined : s.tabs.find((x) => x.screens.includes(shown))
  return t ? selectIn(s, t.key, shown) : s
}

/**
 * Ekranları kapatır: açtıkları ve üstlerindeki formlar da kapanır. Kapanan form listenin
 * üstündeyse liste yerine döner; child yan yana açılırken çıkardığı ekran yerine döner. Seçili
 * sekme kapandıysa kapanan formun açanına, yoksa sağdaki (yoksa soldaki) sekmeye geçilir. Grupları
 * toplamaz (`tidy` çağıranda).
 */
function closeRaw(s: WorkspaceState, keys: Iterable<string>): WorkspaceState {
  const gone = new Set<string>()
  for (const k of keys) if (k !== START && screenOf(s, k)) gone.add(k)
  if (gone.size === 0) return s
  let grew = true
  while (grew) {
    grew = false
    for (const x of s.screens)
      if (
        !gone.has(x.key) &&
        ((x.parent && gone.has(x.parent)) || (x.under && gone.has(x.under)))
      ) {
        gone.add(x.key)
        grew = true
      }
  }
  // Listenin üstündeki form kapanınca liste yerine geçer
  const back = new Map<string, string>()
  for (const k of gone) {
    const under = screenOf(s, k)!.under
    if (under && !gone.has(under)) back.set(k, under)
  }

  let tabs: Tab[] = []
  for (const t of s.tabs) {
    const ids = t.screens.flatMap((x) => (gone.has(x) ? (back.has(x) ? [back.get(x)!] : []) : [x]))
    if (ids.length === 0) continue
    if (ids.length === t.screens.length && ids.every((x, i) => x === t.screens[i])) {
      tabs.push(t)
      continue
    }
    const focus = ids.includes(t.focus) ? t.focus : (back.get(t.focus) ?? ids[0]!)
    tabs.push({ ...t, screens: ids, focus })
  }

  // En yeni açılıştan geriye: child hâlâ açıldığı sekmedeyse ve iki taraf da tek ekranlıysa
  // çıkarılan ekran yerine döner
  const merged = new Map<string, string>()
  for (const x of [...s.screens].reverse()) {
    const u = x.undo
    if (!u || !gone.has(x.key)) continue
    const host = tabs.find((t) => t.key === u.tab)
    const out = tabs.find((t) => t.key === u.out)
    const stayed = s.tabs.find((t) => t.key === u.tab)?.screens.includes(x.key)
    if (!host || !out || !stayed || host.screens.length !== 1 || out.screens.length !== 1) continue
    const ids = u.left ? [out.screens[0]!, host.screens[0]!] : [host.screens[0]!, out.screens[0]!]
    tabs = tabs
      .filter((t) => t !== out)
      .map((t) => (t === host ? { ...t, screens: ids, ratio: u.ratio, base: u.base } : t))
    merged.set(out.key, host.key)
  }

  let active = merged.get(s.active) ?? s.active
  if (!tabs.some((t) => t.key === active)) {
    const prev = activeTab(s)
    let p = screenOf(s, prev.focus)?.parent
    while (p && gone.has(p)) p = screenOf(s, p)?.parent
    const home = p === undefined ? undefined : tabs.find((t) => t.screens.includes(p!))
    if (home) {
      active = home.key
      tabs = tabs.map((t) => (t === home ? { ...t, focus: p! } : t))
    } else {
      const i = s.tabs.indexOf(prev)
      const alive = (t: Tab) => tabs.some((x) => x.key === t.key) && !isCollapsed(s, t)
      active = (s.tabs.slice(i + 1).find(alive) ?? s.tabs.slice(0, i).reverse().find(alive) ?? s.tabs[0]!).key
    }
  }
  return expand({ ...s, screens: s.screens.filter((x) => !gone.has(x.key)), tabs, active })
}

const closeSet = (s: WorkspaceState, keys: Iterable<string>) => tidy(closeRaw(s, keys))

/** Sekmelerin ekranları ve altlarındaki listeler. */
const screensOfTabs = (s: WorkspaceState, tabs: Tab[]) =>
  tabs.flatMap((t) =>
    t.screens.flatMap((x) => {
      const under = screenOf(s, x)?.under
      return under ? [x, under] : [x]
    }),
  )

function openIn(s: WorkspaceState, a: Extract<WorkspaceAction, { type: 'open' }>): WorkspaceState {
  const target = normalizePath(a.path)
  const src = a.from === undefined ? undefined : screenOf(s, a.from)
  // Başlangıç'ın yeri değişmez, yanına da açılmaz: oradan (ya da kabuktan) açılan her şey yeni sekmede
  const where = !src || src.key === START ? 'tab' : a.where
  if (where === 'here') return goIn(s, src!.key, loc(target, a.state), false)
  const known = findOpen(s, target, a.force)
  if (known) return a.background ? s : reveal(s, known.key)

  const host = src && src.key !== START ? tabOf(s, src.key) : undefined
  const made = create(s, loc(target, a.state))
  const next = made.s
  const tabs = [...next.tabs]
  if (where === 'side' && host) {
    const self = shownAs(s, src!.key)!
    let seq = next.seq
    const at = tabs.indexOf(host)
    // Sekme bölünmüşse yanındaki ekran kendi sekmesine çıkar (aynı grupta, hemen yanında)
    if (host.screens.length === 2) {
      const other = host.screens.find((x) => x !== self)!
      tabs.splice(host.screens[0] === other ? at : at + 1, 0, single(`t${seq++}`, other, host.group))
    }
    tabs[tabs.indexOf(host)] = {
      ...host,
      screens: [self, made.key],
      focus: made.key,
      ratio: 50,
      base: 50,
    }
    return expand({ ...next, seq, tabs, active: host.key })
  }
  const tab: Tab = { ...single(`t${next.seq}`, made.key), ...(host && { opener: host.key }) }
  tabs.splice(host ? afterOpener(tabs, host) : tabs.length, 0, tab)
  return { ...next, seq: next.seq + 1, tabs, active: a.background ? s.active : tab.key }
}

/**
 * Ekranın içinde gezinme. Başlangıç gitmez (yeni sekme açılır); başka yerde açık form oraya
 * geçirir; listeden forma gidilince form listenin üstüne açılır; üstteki formdan listeye
 * gidilince form kapanır (alttaki liste de gerekiyorsa gider). Ekran başka yere gidince açtığı
 * formlar kapanır.
 */
function goIn(s: WorkspaceState, key: string, to: Loc, replace: boolean): WorkspaceState {
  const x = screenOf(s, key)
  if (!x) return s
  const target = normalizePath(to.path)
  if (key === START) return openIn(s, { type: 'open', path: target, state: to.state, where: 'tab' })
  if (target === START_PATH) return reveal(s, START)
  const id = identityOf(target)
  if (id.form) {
    const known = findOpen(s, target)
    if (known && known.key !== key) return reveal(s, known.key)
  }
  // Listeden açılan form listenin üstüne
  if (id.form && !identityOf(x.path).form) return stackIn(s, x, loc(target, to.state))
  // Üstteki formdan listeye: form kapanır, alttaki liste yerine döner (gerekirse oraya gider)
  if (!id.form && x.under) {
    const list = screenOf(s, x.under)!
    const popped = closeSet(s, [key])
    return list.path === target ? popped : goIn(popped, list.key, loc(target, to.state), replace)
  }
  if (x.path === target) {
    if (x.state === to.state) return s
    const at = loc(target, to.state)
    return { ...s, screens: s.screens.map((y) => (y === x ? moveTo(y, at, y.back, y.forward) : y)) }
  }
  const next = closeSet(s, descendantsOf(s, key))
  const here = loc(x.path, x.state)
  return {
    ...next,
    screens: next.screens.map((y) =>
      y.key !== key
        ? y
        : moveTo(
            y,
            loc(target, to.state),
            replace ? y.back : [...y.back, here],
            replace ? y.forward : [],
          ),
    ),
  }
}

/** Listeden açılan form: listenin yerine geçer, liste altında takılı kalır. */
function stackIn(s: WorkspaceState, list: Screen, to: Loc): WorkspaceState {
  const tab = s.tabs.find((t) => t.screens.includes(list.key))
  if (!tab) return s
  const key = `s${s.seq}`
  const screen: Screen = { key, ...loc(to.path, to.state), back: [], forward: [], under: list.key }
  return {
    ...s,
    seq: s.seq + 1,
    screens: [...s.screens, screen],
    tabs: s.tabs.map((t) =>
      t !== tab
        ? t
        : {
            ...t,
            screens: t.screens.map((x) => (x === list.key ? key : x)),
            focus: t.focus === list.key ? key : t.focus,
          },
    ),
  }
}

/** Ekranın geçmişinde bir adım; listenin üstündeki formun geçmişi bittiyse geri listeye döner. */
function stepIn(s: WorkspaceState, key: string, dir: -1 | 1): WorkspaceState {
  const x = screenOf(s, key)
  if (!x) return s
  const to = (dir < 0 ? x.back : x.forward).at(-1)
  if (!to) return dir < 0 && x.under ? closeSet(s, [key]) : s
  const next = closeSet(s, descendantsOf(s, key))
  const here = loc(x.path, x.state)
  return {
    ...next,
    screens: next.screens.map((y) =>
      y.key !== key
        ? y
        : dir < 0
          ? moveTo(y, to, y.back.slice(0, -1), [...y.forward, here])
          : moveTo(y, to, [...y.back, here], y.forward.slice(0, -1)),
    ),
  }
}

function childIn(s: WorkspaceState, from: string, path: string, size: PanelSize): WorkspaceState {
  const target = normalizePath(path)
  if (from === START || !screenOf(s, from) || !tabOf(s, from)) return s
  // Zaten açtığı child'sa ona geçilir
  const own = s.screens.find(
    (x) => x.parent === from && identityOf(x.path).key === identityOf(target).key,
  )
  if (own) return reveal(s, own.key)
  // Formun tek child'ı olur: açık child'ı kapanır (çıkardığı ekran yerine döner). Grup sonda
  // toplanır: otomatik grup yeni child'la sürer
  const cleared = closeRaw(
    s,
    s.screens.filter((x) => x.parent === from).map((x) => x.key),
  )
  const host = tabOf(cleared, from)!
  const made = create(cleared, loc(target), from)
  const next = made.s
  const tabs = [...next.tabs]
  const at = tabs.indexOf(host)
  let seq = next.seq

  if (size === 3) {
    // Yeni sekme açanın hemen ardında, açanın grubunda; açan grupsuzsa ikisine otomatik grup
    let groups = next.groups
    let group = host.group
    if (!group && groups.length < MAX_GROUPS) {
      group = `g${seq++}`
      groups = [...groups, { key: group, name: '', color: freeColor(groups), collapsed: false, auto: true }]
      tabs[at] = withGroup(host, group)
    }
    const tab = single(`t${seq++}`, made.key, group)
    tabs.splice(at + 1, 0, tab)
    return tidy({ ...next, seq, tabs, groups, active: tab.key })
  }

  // 1 / 2: açanın yanında. Sekme zaten bölünmüşse yanındaki ekran kendi sekmesine çıkar
  let undo: Undo | undefined
  if (host.screens.length === 2) {
    const left = host.screens[1] === from
    const out = single(`t${seq++}`, host.screens.find((x) => x !== from)!, host.group)
    tabs.splice(left ? at : at + 1, 0, out)
    undo = { tab: host.key, out: out.key, left, ratio: host.ratio, base: host.base }
  }
  const ratio = LEFT_SHARE[size]
  tabs[tabs.indexOf(host)] = { ...host, screens: [from, made.key], focus: made.key, ratio, base: ratio }
  return tidy({
    ...next,
    seq,
    tabs,
    active: host.key,
    screens: undo ? next.screens.map((x) => (x.key === made.key ? { ...x, undo } : x)) : next.screens,
  })
}

/**
 * "Ayrı sekmeye taşı": listenin üstündeki form (aynı ekran, yeniden kurulmaz; child'ları onda
 * kalır) kendi sekmesine, sekmenin hemen ardına geçer; liste yerine döner. Form otomatik grubun
 * köküyse grup formla gider.
 */
function popOutIn(s: WorkspaceState, key: string, path: string): WorkspaceState {
  const x = screenOf(s, key)
  const under = x?.under
  const host = under ? s.tabs.find((t) => t.screens.includes(key)) : undefined
  if (!x || !under || !host) return s
  const g = host.group ? s.groups.find((y) => y.key === host.group) : undefined
  const tab = single(`t${s.seq}`, key, host.group)
  const back: Tab = {
    ...host,
    screens: host.screens.map((y) => (y === key ? under : y)),
    focus: host.focus === key ? under : host.focus,
  }
  const at = s.tabs.indexOf(host)
  const build = (list: Tab) => {
    const tabs = [...s.tabs]
    tabs.splice(at, 1, list, tab)
    return tabs
  }
  // Otomatik grupta liste gruptan çıkar (grup formun ailesi); grubu bölecekse kalır
  const leaving = g?.auto ? build(withGroup(back, undefined)) : undefined
  const tabs = leaving && contiguous(leaving) ? leaving : build(back)
  const moved: Screen = { ...x, path: normalizePath(path) }
  delete moved.under
  return tidy({
    ...s,
    seq: s.seq + 1,
    screens: s.screens.map((y) => (y === x ? moved : y)),
    tabs,
    active: tab.key,
  })
}

/** Yan yana sekmenin bölmelerinin yerini değiştirir (paylar da yer değiştirir). */
function swapIn(s: WorkspaceState, key: string): WorkspaceState {
  const t = s.tabs.find((x) => x.key === key)
  if (!t || t.screens.length < 2) return s
  const next = { ...t, screens: [t.screens[1]!, t.screens[0]!], ratio: 100 - t.ratio, base: 100 - t.base }
  return { ...s, tabs: s.tabs.map((x) => (x === t ? next : x)) }
}

/** Yan yana sekmeyi iki sekmeye ayırır (aynı grupta); odaktaki ekran seçili kalır. */
function unpairIn(s: WorkspaceState, key: string): WorkspaceState {
  const i = s.tabs.findIndex((t) => t.key === key)
  const t = s.tabs[i]
  if (!t || t.screens.length < 2) return s
  const [a, b] = t.screens as [string, string]
  const other = single(`t${s.seq}`, b, t.group)
  const tabs = [...s.tabs]
  tabs.splice(i, 1, { ...t, screens: [a], focus: a, ratio: 50, base: 50 }, other)
  const active = s.active === key && t.focus === b ? other.key : s.active
  return { ...s, tabs, active, seq: s.seq + 1 }
}

/** Tek ekranlı sekmeyi tek ekranlı başka bir sekmenin yanına alır. Başlangıç yan yana olmaz. */
function pairIn(s: WorkspaceState, key: string, withKey: string, side: 'left' | 'right'): WorkspaceState {
  const other = s.tabs.find((t) => t.key === key)
  const host = s.tabs.find((t) => t.key === withKey)
  if (!other || !host || other === host || key === START || withKey === START) return s
  if (other.screens.length > 1 || host.screens.length > 1) return s
  const [h, o] = [host.screens[0]!, other.screens[0]!]
  const screens = side === 'right' ? [h, o] : [o, h]
  return tidy(
    expand({
      ...s,
      tabs: s.tabs
        .filter((t) => t !== other)
        .map((t) => (t === host ? { ...t, screens, focus: o, ratio: 50, base: 50 } : t)),
      active: host.key,
    }),
  )
}

function ratioIn(s: WorkspaceState, value: number): WorkspaceState {
  const t = activeTab(s)
  const ratio = clampRatio(value)
  if (t.screens.length < 2 || t.ratio === ratio) return s
  return { ...s, tabs: s.tabs.map((x) => (x === t ? { ...x, ratio } : x)) }
}

function moveTabIn(s: WorkspaceState, key: string, to: number, group: string | null): WorkspaceState {
  const from = s.tabs.findIndex((t) => t.key === key)
  const t = s.tabs[from]
  const into = group ?? undefined
  if (from <= 0 || !t || (into && !s.groups.some((g) => g.key === into))) return s
  const tabs = [...s.tabs]
  tabs.splice(from, 1)
  const at = Math.min(Math.max(to, 1), tabs.length)
  if (at === from && t.group === into) return s
  tabs.splice(at, 0, withGroup(t, into))
  // Grubu bölen taşıma olmaz
  if (!contiguous(tabs)) return s
  // Başka bir gruba alınan sekme o grubu kullanıcıya geçirir
  const groups = into && into !== t.group ? claim(s.groups, into) : s.groups
  return tidy({ ...s, tabs, groups })
}

/** Başlangıç dışındaki sıraların anahtarı: grubun ya da grupsuz sekmenin. */
export const unitKeys = (s: WorkspaceState) =>
  unitsOf(s.tabs).map((u) => u[0]!.group ?? u[0]!.key)

function moveUnitIn(s: WorkspaceState, key: string, to: number): WorkspaceState {
  const units = unitsOf(s.tabs)
  const from = units.findIndex((u) => (u[0]!.group ?? u[0]!.key) === key)
  const at = Math.min(Math.max(to, 0), units.length - 1)
  if (from < 0 || from === at) return s
  return { ...s, tabs: [s.tabs[0]!, ...move(units, from, at).flat()] }
}

/** Sekmelerden yeni grup: ilk üyenin yerinde, şeritteki sıralarıyla bir araya gelirler. */
function newGroupIn(s: WorkspaceState, keys: string[], name = ''): WorkspaceState {
  const members = s.tabs.filter((t) => t.key !== START && keys.includes(t.key))
  if (members.length === 0 || s.groups.length >= MAX_GROUPS) return s
  const key = `g${s.seq}`
  const first = s.tabs.indexOf(members[0]!)
  const rest = s.tabs.filter((t) => !members.includes(t))
  let at = s.tabs.slice(0, first).filter((t) => !members.includes(t)).length
  // Başka bir grubun ortasına düşmesin
  while (at < rest.length && rest[at - 1]?.group && rest[at - 1]!.group === rest[at]!.group) at++
  rest.splice(at, 0, ...members.map((t) => withGroup(t, key)))
  return tidy({
    ...s,
    seq: s.seq + 1,
    tabs: rest,
    groups: [...s.groups, { key, name, color: freeColor(s.groups), collapsed: false, auto: false }],
  })
}

/** Sekme grubun sonuna katılır (grup kullanıcıya geçer). */
function addToGroupIn(s: WorkspaceState, key: string, group: string): WorkspaceState {
  const t = s.tabs.find((x) => x.key === key)
  if (!t || key === START || t.group === group || !s.groups.some((g) => g.key === group)) return s
  const rest = s.tabs.filter((x) => x !== t)
  rest.splice(rest.findLastIndex((x) => x.group === group) + 1, 0, withGroup(t, group))
  return tidy({ ...s, tabs: rest, groups: claim(s.groups, group) })
}

/** Sekme gruptan çıkar, grubun hemen ardına. */
function leaveGroupIn(s: WorkspaceState, key: string): WorkspaceState {
  const i = s.tabs.findIndex((x) => x.key === key)
  const t = s.tabs[i]
  if (!t?.group) return s
  const rest = s.tabs.filter((x) => x !== t)
  const last = rest.findLastIndex((x) => x.group === t.group)
  rest.splice(last < 0 ? i : last + 1, 0, withGroup(t, undefined))
  return tidy({ ...s, tabs: rest })
}

function ungroupIn(s: WorkspaceState, key: string): WorkspaceState {
  if (!s.groups.some((g) => g.key === key)) return s
  return expand({
    ...s,
    groups: s.groups.filter((g) => g.key !== key),
    tabs: s.tabs.map((t) => (t.group === key ? withGroup(t, undefined) : t)),
  })
}

function editGroupIn(s: WorkspaceState, key: string, name?: string, color?: number): WorkspaceState {
  const g = s.groups.find((x) => x.key === key)
  if (!g) return s
  const next: Group = {
    ...g,
    auto: false,
    ...(name !== undefined && { name }),
    ...(color !== undefined && { color: Math.min(Math.max(Math.round(color), 0), GROUP_COLORS.length - 1) }),
  }
  if (!g.auto && next.name === g.name && next.color === g.color) return s
  return { ...s, groups: s.groups.map((x) => (x === g ? next : x)) }
}

/** Grubu daraltır / açar; seçili sekme daralan gruptaysa dışarıdaki en yakın sekmeye geçilir. */
function collapseIn(s: WorkspaceState, key: string, collapsed: boolean): WorkspaceState {
  const g = s.groups.find((x) => x.key === key)
  if (!g || g.collapsed === collapsed) return s
  const next = { ...s, groups: s.groups.map((x) => (x === g ? { ...x, collapsed } : x)) }
  const t = activeTab(s)
  if (!collapsed || t.group !== key) return next
  const i = s.tabs.indexOf(t)
  const ok = (x: Tab) => x.group !== key && !isCollapsed(next, x)
  const active = (s.tabs.slice(i + 1).find(ok) ?? s.tabs.slice(0, i).reverse().find(ok) ?? s.tabs[0]!).key
  return { ...next, active }
}

/** Sınır gözetilmeden (sınır `workspaceReducer`'da). */
function reduce(s: WorkspaceState, a: WorkspaceAction): WorkspaceState {
  switch (a.type) {
    case 'open':
      return openIn(s, a)
    case 'child':
      return childIn(s, a.from, a.path, a.size)
    case 'go':
      return goIn(s, a.screen, loc(a.path, a.state), a.replace ?? false)
    case 'back':
      return stepIn(s, a.screen, -1)
    case 'forward':
      return stepIn(s, a.screen, 1)
    case 'select':
      return selectIn(s, a.tab, a.screen)
    case 'close':
      return closeSet(s, [a.screen])
    case 'closeTab': {
      const t = s.tabs.find((x) => x.key === a.tab)
      return t ? closeSet(s, screensOfTabs(s, [t])) : s
    }
    case 'closeGroup':
      return closeSet(s, screensOfTabs(s, s.tabs.filter((t) => t.group === a.group)))
    case 'popOut':
      return popOutIn(s, a.screen, a.path)
    case 'swap':
      return swapIn(s, a.tab)
    case 'unpair':
      return unpairIn(s, a.tab)
    case 'pair':
      return pairIn(s, a.tab, a.with, a.side ?? 'right')
    case 'ratio':
      return ratioIn(s, a.value)
    case 'nudge':
      return ratioIn(s, activeTab(s).ratio + a.delta)
    case 'moveTab':
      return moveTabIn(s, a.tab, a.to, a.group)
    case 'moveUnit':
      return moveUnitIn(s, a.key, a.to)
    case 'newGroup':
      return newGroupIn(s, a.tabs, a.name)
    case 'addToGroup':
      return addToGroupIn(s, a.tab, a.group)
    case 'leaveGroup':
      return leaveGroupIn(s, a.tab)
    case 'ungroup':
      return ungroupIn(s, a.group)
    case 'editGroup':
      return editGroupIn(s, a.group, a.name, a.color)
    case 'collapse':
      return collapseIn(s, a.group, a.collapsed)
  }
}

/** İşlemin ekranı sınırı aşması: ekran ekleyip `MAX_SCREENS`'i geçiyor. */
const overLimit = (s: WorkspaceState, next: WorkspaceState) =>
  next.screens.length > s.screens.length && next.screens.length - 1 > MAX_SCREENS

/** İşlem ekran sınırına takılıyor mu (çağıran uyarır, işlem yapılmaz). */
export const isBlocked = (s: WorkspaceState, a: WorkspaceAction) => overLimit(s, reduce(s, a))

export function workspaceReducer(s: WorkspaceState, a: WorkspaceAction): WorkspaceState {
  const next = reduce(s, a)
  return overLimit(s, next) ? s : next
}
