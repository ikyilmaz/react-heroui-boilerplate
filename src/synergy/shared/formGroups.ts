import { activeView, initTabs, tabsReducer, type TabsAction, type TabsState } from '@/synergy/shared/formTabs'
import type { BoxId } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Form grupları (FormTabs.tsx çizer). Açık istek üzerine eklendi, orijinalde yok. Her grup bir kök
 * talep (ya da menüden açılan uygulama formu, kökü `app:<uygulama>`) ve ondan açılan formlar; grubun içindeki sekmeler `formTabs.ts`'in durumu (panel boyutu,
 * tek child, kapanan formun child'ları... aynen). Saf işlevler, React yok; `useReducer` ile.
 * - Talep yeni grupta açılır (etkin grubun hemen sağında); zaten bir grubun kökü olarak açıksa o
 *   gruba geçilir. En çok `MAX_GROUPS` grup: sınırda açılmaz (`canOpen`, çağıran uyarır).
 * - Yalnızca etkin grup açık; diğerleri tek sekmeye daralır.
 * - Geri / İleri grubun kökünü değiştirir (`replace`): açtığı formlar kapanır, liste aynı kalır.
 *   Gidilen talep başka grubun köküyse o gruba geçilir.
 * - Kök sekmenin kapatması bütün grubu kapatır; etkin grup kapanınca sağdaki (yoksa soldaki) açılır.
 *   Son grup kapanmaz (çağıran sayfadan çıkar).
 * - Sekmeler grup içinde sıralanır, kökün sekmesi hep başta; gruplar kendi aralarında sıralanır.
 *   Sekmeler gruplar arası taşınmaz (child'ın açanı kendi grubunda).
 * - Her grubun bir rengi var (`GROUP_COLORS`): açılışta kullanılmayan ilk renk; Geri / İleri'de
 *   değişmez.
 * Değişiklik yoksa aynı durum döner (React yeniden çizmez).
 * ------------------------------------------------------------------------------------------------- */

export const MAX_GROUPS = 6

/** Grup renklerinin adları (sıra tema dosyasındaki `--group-1` … `--group-6`; grup sınırı kadar). */
export const GROUP_COLORS = ['Turkuaz', 'Lavanta', 'Kum', 'Pembe', 'Mavi', 'Gri'] as const

/** Kökün açıldığı liste: Geri / İleri ve Süreçler izi bunun içinde gezer. */
export interface GroupNav {
  ids: string[]
  box: BoxId
}

export interface Group {
  /** Grubun anahtarı: kök değişse de (Geri / İleri) aynı kalır. */
  key: string
  tabs: TabsState
  nav: GroupNav | null
  /** Rengin sırası (`GROUP_COLORS`). */
  color: number
}

export interface GroupsState {
  groups: Group[]
  active: string
  seq: number
}

export type GroupsAction =
  | { type: 'open'; root: string; nav: GroupNav | null }
  | { type: 'activate'; key: string }
  | { type: 'replace'; key: string; root: string }
  | { type: 'close'; key: string }
  /** Grubun içindeki sekme işlemi (`formTabs.ts`). */
  | { type: 'tabs'; key: string; action: TabsAction }
  /** Formu gösterir: grubuna geçer, sekmesini seçer (konum çubuğu). */
  | { type: 'reveal'; key: string; form: string }
  /** Sekmeyi grubun içinde `to` sırasına taşır (kök sekmesi başta kalır). */
  | { type: 'moveTab'; key: string; view: string; to: number }
  /** Grubu `to` sırasına taşır. */
  | { type: 'moveGroup'; key: string; to: number }

export const initGroups = ({ root, nav }: { root: string; nav: GroupNav | null }): GroupsState => ({
  groups: [{ key: 'g0', tabs: initTabs(root), nav, color: 0 }],
  active: 'g0',
  seq: 1,
})

export const activeGroup = (s: GroupsState) =>
  s.groups.find((g) => g.key === s.active) ?? s.groups[0]!

/** Talebi kök olarak açmış grup. */
export const groupOf = (s: GroupsState, root: string) => s.groups.find((g) => g.tabs.rootId === root)

/** Talep açılabilir mi: zaten açıksa (o gruba geçilir) ya da sınıra gelinmediyse. */
export const canOpen = (s: GroupsState, root: string) =>
  !!groupOf(s, root) || s.groups.length < MAX_GROUPS

/** Grubun etkin formu: seçili sekmenin odaktaki formu. */
export const activeForm = (g: Group) => activeView(g.tabs).focus

/** Formun grup içindeki yolu: kökten forma (açanlar zinciri). */
export function formPath(g: Group, form: string): string[] {
  const parent = new Map(g.tabs.entries.map((e) => [e.id, e.parent]))
  const path = [form]
  for (let at = parent.get(form); at; at = parent.get(at)) path.unshift(at)
  return path
}

/** Kökün sekmesi hep başta (ayırma kökü sağa düşürebilir). */
function pinRoot(t: TabsState): TabsState {
  const i = t.views.findIndex((v) => v.ids.includes(t.rootId))
  if (i <= 0) return t
  const views = [...t.views]
  const [root] = views.splice(i, 1)
  return { ...t, views: [root!, ...views] }
}

function withTabs(s: GroupsState, key: string, tabs: TabsState): GroupsState {
  const g = s.groups.find((x) => x.key === key)
  if (!g || g.tabs === tabs) return s
  return { ...s, groups: s.groups.map((x) => (x === g ? { ...x, tabs } : x)) }
}

function move<T>(list: T[], from: number, to: number): T[] {
  const out = [...list]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item!)
  return out
}

export function groupsReducer(s: GroupsState, a: GroupsAction): GroupsState {
  switch (a.type) {
    case 'open': {
      const known = groupOf(s, a.root)
      if (known) return known.key === s.active ? s : { ...s, active: known.key }
      if (s.groups.length >= MAX_GROUPS) return s
      const key = `g${s.seq}`
      // Kullanılmayan ilk renk (hepsi kullanılıyorsa sırayla)
      const used = new Set(s.groups.map((g) => g.color))
      const free = GROUP_COLORS.findIndex((_, i) => !used.has(i))
      const groups = [...s.groups]
      groups.splice(s.groups.indexOf(activeGroup(s)) + 1, 0, {
        key,
        tabs: initTabs(a.root),
        nav: a.nav,
        color: free >= 0 ? free : s.seq % GROUP_COLORS.length,
      })
      return { groups, active: key, seq: s.seq + 1 }
    }
    case 'activate':
      return a.key === s.active || !s.groups.some((g) => g.key === a.key)
        ? s
        : { ...s, active: a.key }
    case 'replace': {
      const g = s.groups.find((x) => x.key === a.key)
      if (!g || g.tabs.rootId === a.root) return s
      const known = groupOf(s, a.root)
      if (known) return { ...s, active: known.key }
      return {
        ...s,
        active: g.key,
        groups: s.groups.map((x) => (x === g ? { ...x, tabs: initTabs(a.root) } : x)),
      }
    }
    case 'close': {
      const i = s.groups.findIndex((g) => g.key === a.key)
      if (i < 0 || s.groups.length === 1) return s
      const groups = s.groups.filter((_, n) => n !== i)
      const active = a.key === s.active ? (groups[i] ?? groups[i - 1])!.key : s.active
      return { ...s, groups, active }
    }
    case 'tabs': {
      const g = s.groups.find((x) => x.key === a.key)
      if (!g) return s
      return withTabs(s, g.key, pinRoot(tabsReducer(g.tabs, a.action)))
    }
    case 'reveal': {
      const g = s.groups.find((x) => x.key === a.key)
      const v = g?.tabs.views.find((x) => x.ids.includes(a.form))
      if (!g || !v) return s
      const next = withTabs(s, g.key, tabsReducer(g.tabs, { type: 'focus', view: v.key, id: a.form }))
      return next.active === g.key ? next : { ...next, active: g.key }
    }
    case 'moveTab': {
      const g = s.groups.find((x) => x.key === a.key)
      if (!g) return s
      const from = g.tabs.views.findIndex((v) => v.key === a.view)
      // Kökün sekmesi yerinden oynamaz, önüne de geçilmez
      const to = Math.min(Math.max(a.to, 1), g.tabs.views.length - 1)
      if (from <= 0 || from === to) return s
      return withTabs(s, g.key, { ...g.tabs, views: move(g.tabs.views, from, to) })
    }
    case 'moveGroup': {
      const from = s.groups.findIndex((g) => g.key === a.key)
      const to = Math.min(Math.max(a.to, 0), s.groups.length - 1)
      if (from < 0 || from === to) return s
      return { ...s, groups: move(s.groups, from, to) }
    }
  }
}
