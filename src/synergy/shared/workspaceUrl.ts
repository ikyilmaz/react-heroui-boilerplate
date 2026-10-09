// Göreli `.ts` içe aktarma: dosya Node'un sınayıcısında da çalışır (`scripts/tabs/workspace.test.mjs`)
import {
  GROUP_COLORS,
  START,
  START_PATH,
  activeTab,
  initWorkspace,
  isBlocked,
  normalizePath,
  rootOf,
  screenOf,
  tabOf,
  workspaceReducer,
  type Group,
  type Tab,
  type WorkspaceAction,
  type WorkspaceState,
} from './workspace.ts'

/* -------------------------------------------------------------------------------------------------
 * Çalışma alanının adresi: düzenin tamamı adreste (yenileyince ve paylaşınca aynı sekmeler).
 * - Yol seçili sekmenin adresi (rotalar olduğu gibi): bağlantı bakılan şeyi gösterir.
 * - `?sekmeler=` öbür sekmeler, sırayla; `*` seçili sekmenin yeri. Başlangıç yazılmaz (hep başta).
 *   Seçili sekmeden başka sekme yoksa parametre de yok (`/talepler/x` tek başına aynı düzen).
 * - Ekran: ilk kesim kısaltılır, kesimler noktayla (`ia.bekleyen.p12`, `t.<talep>`,
 *   `u.<uygulama>`, `ik.<modül>.<kayıt>`). Listeden açılan formun adresi altındaki listeyi de
 *   söyler (`ia.<kutu>.<süreç>.<talep>`).
 * - Yan yana: `a~b`, sol pay %50 değilse `@40`. Grup: `(ad.renk[.k];sekme,sekme)`, renk 1–6, `k`
 *   daraltılmış. Yalnızca kullanıcının grupları; otomatik gruplar yazılmaz.
 * - Child formlar yazılmaz (yalnızca kökleri): seçili sekme child'sa yol ve `*` ailenin kökünde.
 * - Okurken bozuk, bilinmeyen ya da artık olmayan (`valid`) ekran atlanır; aynı form ikinci kez
 *   açılmaz; sınırdan fazlası alınmaz. Düzen işlemlerle kurulur (`workspaceReducer`): kurallar aynı.
 * Yapı karakterleri (`, ; ( ) ~ * . @`) sorgu dizgesinde olduğu gibi kalır; kesimlerde ve grup adında
 * yüzdeyle kaçırılır. Okuma `URLSearchParams`'sız (o kaçırılanları da çözerdi).
 * ------------------------------------------------------------------------------------------------- */

export const TABS_PARAM = 'sekmeler'

/** İlk kesimin kısaltması. */
const SHORT = new Map([
  ['is-akislari', 'ia'],
  ['talepler', 't'],
  ['uygulamalar', 'u'],
  ['insan-kaynaklari', 'ik'],
])
const LONG = new Map([...SHORT].map(([long, short]) => [short, long]))

/** Kesim ve grup adı: `encodeURIComponent`'in bıraktığı yapı karakterleri de kaçırılır. */
const escape = (text: string) =>
  encodeURIComponent(text).replace(/[.~*()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

const unescape = (text: string) => {
  try {
    return decodeURIComponent(text)
  } catch {
    return undefined
  }
}

/** Adresin kısaltması; bilinmeyen adres yazılmaz. */
export function tokenOf(path: string) {
  const [head, ...rest] = normalizePath(path).split('/').slice(1)
  const short = head === undefined ? undefined : SHORT.get(head)
  return short && [short, ...rest.map(escape)].join('.')
}

/** Kısaltmanın adresi; bozuksa yok. */
export function pathOf(token: string) {
  const [head, ...rest] = token.split('.')
  const long = LONG.get(head!)
  const parts = rest.map(unescape)
  if (!long || parts.some((x) => !x || x.includes('/'))) return undefined
  return `/${[long, ...parts].join('/')}`
}

/* Yazma ------------------------------------------------------------------------------------------- */

/** Sekmenin yazısı: child'lar atlanır, seçili yer `*`. */
function tabText(s: WorkspaceState, t: Tab, anchor: string) {
  const parts = t.screens
    .filter((k) => !screenOf(s, k)!.parent)
    .map((k) => (k === anchor ? '*' : tokenOf(screenOf(s, k)!.path)))
    .filter((x): x is string => !!x)
  if (parts.length === 0) return undefined
  const ratio = Math.round(t.ratio)
  return parts.join('~') + (parts.length === 2 && ratio !== 50 ? `@${ratio}` : '')
}

const headerOf = (g: Group) => `${escape(g.name)}.${g.color + 1}${g.collapsed ? '.k' : ''}`

/** Durumun adresi: yol + `?sekmeler=` (gerekmiyorsa yalnızca yol). */
export function encodeWorkspace(s: WorkspaceState) {
  // Child formlar yazılmaz: seçili sekme child'sa ailenin kökü
  const anchor = rootOf(s, activeTab(s).focus)
  const pathname = screenOf(s, anchor)!.path
  const parts: string[] = []
  let open: { group: Group; tabs: string[] } | undefined
  const flush = () => {
    if (open?.tabs.length) parts.push(`(${headerOf(open.group)};${open.tabs.join(',')})`)
    open = undefined
  }
  for (const t of s.tabs.slice(1)) {
    const g = t.group ? s.groups.find((x) => x.key === t.group && !x.auto) : undefined
    if (open && open.group !== g) flush()
    const text = tabText(s, t, anchor)
    if (!text) continue
    if (!g) {
      parts.push(text)
      continue
    }
    open ??= { group: g, tabs: [] }
    open.tabs.push(text)
  }
  flush()
  const list = parts.join(',')
  return list === '' || list === '*' ? pathname : `${pathname}?${TABS_PARAM}=${list}`
}

/* Okuma ------------------------------------------------------------------------------------------- */

interface ParsedTab {
  screens: string[]
  ratio?: number
}

interface ParsedUnit {
  tabs: ParsedTab[]
  group?: { name: string; color?: number; collapsed: boolean }
}

/** Parametrenin ham değeri (çözülmeden). */
function readParam(search: string, name: string) {
  for (const part of search.replace(/^\?/, '').split('&')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1)
  }
  return undefined
}

/** Üst düzey virgüllerden böler (grup parantezinin içi bütün kalır). */
function splitTop(text: string) {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (c === ',' && depth === 0) {
      out.push(text.slice(start, i))
      start = i + 1
    }
  }
  out.push(text.slice(start))
  return out.filter(Boolean)
}

function parseTab(text: string): ParsedTab {
  const at = text.lastIndexOf('@')
  const ratio = at >= 0 ? Number(text.slice(at + 1)) : NaN
  const screens = (at >= 0 ? text.slice(0, at) : text).split('~').filter(Boolean).slice(0, 2)
  return Number.isFinite(ratio) ? { screens, ratio } : { screens }
}

function parseUnit(text: string): ParsedUnit | undefined {
  if (!text.startsWith('(')) return text.includes(')') ? undefined : { tabs: [parseTab(text)] }
  const inner = text.endsWith(')') ? text.slice(1, -1) : undefined
  const semi = inner?.indexOf(';') ?? -1
  if (inner === undefined || semi < 0 || /[()]/.test(inner)) return undefined
  const [name = '', color, flag] = inner.slice(0, semi).split('.')
  const decoded = unescape(name)
  if (decoded === undefined) return undefined
  const c = Number(color)
  return {
    group: {
      name: decoded,
      ...(Number.isInteger(c) && c >= 1 && c <= GROUP_COLORS.length && { color: c - 1 }),
      collapsed: flag === 'k',
    },
    tabs: inner.slice(semi + 1).split(',').filter(Boolean).map(parseTab),
  }
}

/**
 * Adresin durumu. `valid`: ekranın adresi hâlâ geçerli mi (ör. silinmiş taslak); geçersiz ekran
 * atlanır.
 */
export function decodeWorkspace(
  pathname: string,
  search: string,
  valid: (path: string) => boolean = () => true,
): WorkspaceState {
  const here = normalizePath(pathname)
  const current = here !== START_PATH && tokenOf(here) && valid(here) ? here : undefined
  const units = splitTop(readParam(search, TABS_PARAM) ?? '')
    .map(parseUnit)
    .filter((u) => !!u)
  let s = initWorkspace()
  let anchor: string | undefined

  /** Ekranı açar (yeni sekmede ya da `from`'un yanında); açılan görünen ekranın anahtarı. */
  const add = (token: string, from?: string) => {
    const star = token === '*'
    const path = star ? (anchor === undefined ? current : undefined) : pathOf(token)
    if (!path || !valid(path)) return undefined
    const before = s
    s = workspaceReducer(
      s,
      from ? { type: 'open', path, from, where: 'side' } : { type: 'open', path, where: 'tab' },
    )
    // Açılmadı (zaten açık ya da sınır): atlanır
    if (s.screens.length === before.screens.length) {
      s = before
      return undefined
    }
    const key = s.screens.at(-1)!.key
    if (star) anchor = key
    return key
  }

  for (const u of units) {
    const keys: string[] = []
    for (const t of u.tabs) {
      const [a, b] = t.screens
      const first = a === undefined ? undefined : add(a)
      // İlki açılamadıysa ikincisi tek başına
      const second = b === undefined ? undefined : add(b, first)
      if (first && second && t.ratio !== undefined)
        s = workspaceReducer(s, { type: 'ratio', value: t.ratio })
      const shown = first ?? second
      const tab = shown && tabOf(s, shown)
      if (tab && !keys.includes(tab.key)) keys.push(tab.key)
    }
    if (!u.group || keys.length === 0) continue
    const count = s.groups.length
    s = workspaceReducer(s, { type: 'newGroup', tabs: keys, name: u.group.name })
    const g = s.groups.length > count ? s.groups.at(-1)! : undefined
    if (!g) continue
    if (u.group.color !== undefined)
      s = workspaceReducer(s, { type: 'editGroup', group: g.key, color: u.group.color })
    if (u.group.collapsed) s = workspaceReducer(s, { type: 'collapse', group: g.key, collapsed: true })
  }

  if (anchor) return workspaceReducer(s, { type: 'select', tab: tabOf(s, anchor)!.key, screen: anchor })
  // `*` yoksa (paylaşılan tek adres): açıksa ona geçilir, değilse sonda açılır
  const open: WorkspaceAction = { type: 'open', path: current ?? START_PATH, where: 'tab' }
  if (current && !isBlocked(s, open)) return workspaceReducer(s, open)
  return workspaceReducer(s, { type: 'select', tab: START })
}
