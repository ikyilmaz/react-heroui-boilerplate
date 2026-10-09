import type { LucideIcon } from 'lucide-react'
import { FolderOpen, House, Landmark, ShieldCheck, ShoppingBag, UserCog, Users } from 'lucide-react'
import { findApp } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Sol menü ağacı (orijinal app-main/layouts/left-menu, "Tüm uygulamalar")
 *
 * Orijinalde menü sunucudan gelir (IMenuItem: caption, orderIndex, children, badgeCount); burada
 * örnek bir ağaç. Yapraklar menü uygulamalarına (`menuApps`) bağlanır; adı, ikonu ve adresi
 * oradan gelir. Klasörler açılır / kapanır. Sıralama sıra numarasına (`order`) ya da ada göre.
 * ------------------------------------------------------------------------------------------------- */

export interface MenuNode {
  id: string
  caption: string
  icon?: LucideIcon
  /** Yaprağın adresi (uygulama içi yol). Klasörde yok. */
  href?: string
  /** Sıra numarası (orijinal orderIndex). */
  order: number
  children?: MenuNode[]
}

/** Menü uygulamasından yaprak. */
const leaf = (id: string, order: number): MenuNode => {
  const a = findApp(id)!
  return { id, caption: a.caption, icon: a.icon, href: a.href, order }
}

const folder = (
  id: string,
  caption: string,
  icon: LucideIcon,
  order: number,
  children: MenuNode[],
): MenuNode => ({ id, caption, icon, order, children })

export const MENU_TREE: MenuNode[] = [
  { id: 'baslangic', caption: 'Başlangıç', icon: House, href: '/calisma-alani', order: 1 },
  leaf('is-akis-yonetimi', 2),
  folder('satin-alma', 'Satın Alma', ShoppingBag, 3, [
    leaf('satin-alma-talebi', 1),
    leaf('tedarikci-listesi', 2),
    leaf('stok-raporu', 3),
    leaf('sozlesme-talebi', 4),
  ]),
  folder('insan-kaynaklari', 'İnsan Kaynakları', Users, 4, [
    // İK modülünün sayfası (Kullanıcılar)
    {
      id: 'ik-kullanicilar',
      caption: 'Kullanıcılar',
      icon: UserCog,
      href: '/insan-kaynaklari/kullanicilar',
      order: 1,
    },
    leaf('personel-rehberi', 2),
    leaf('izin-talebi', 3),
    leaf('egitim-katalogu', 4),
  ]),
  folder('finans', 'Finans', Landmark, 5, [leaf('masraf-bildirimi', 1), leaf('butce-takip', 2)]),
  folder('idari-isler', 'İdari İşler', FolderOpen, 6, [
    leaf('arac-tahsis', 1),
    leaf('toplanti-odasi', 2),
    leaf('ziyaretci-kaydi', 3),
  ]),
  folder('kalite', 'Kalite Yönetim Sistemi', ShieldCheck, 7, [leaf('kalite-dokumanlari', 1)]),
]

/** Menü metinleri (tr_TR). */
export const MENU_LABELS = {
  allApps: 'Tüm uygulamalar', // 101880
  apps: 'Uygulamalar', // 101882
  close: 'Kapat', // 100824
  sortAlphabetic: 'Alfabetik sırala', // 103301
  sortOrder: 'Sıra numarasına göre sırala', // 103302
  searchAll: 'Tüm uygulamalarda ara', // 101728
  noResult: 'Arama sonucu bulunamadı', // 100216
} as const

export type MenuSort = 'order' | 'alphabetic'

const fold = (v: string) => v.toLocaleLowerCase('tr')

/** Ağacı sıralar (her seviyede): sıra numarasına ya da Türkçe ada göre. */
export function sortTree(nodes: MenuNode[], sort: MenuSort): MenuNode[] {
  const cmp =
    sort === 'order'
      ? (a: MenuNode, b: MenuNode) => a.order - b.order
      : (a: MenuNode, b: MenuNode) => a.caption.localeCompare(b.caption, 'tr')
  return [...nodes]
    .sort(cmp)
    .map((n) => (n.children ? { ...n, children: sortTree(n.children, sort) } : n))
}

/**
 * Aramada süzülen ağaç: adı eşleşen düğümler (klasör eşleşirse tüm içeriğiyle) ve eşleşen
 * torunu olan klasörler; eşleşme yolundaki klasörler açık gelir (orijinal filterMenuTree).
 */
export function filterTree(nodes: MenuNode[], query: string) {
  const q = fold(query.trim())
  const expanded = new Set<string>()
  if (!q) return { nodes, expanded }
  const walk = (list: MenuNode[]): MenuNode[] =>
    list.flatMap((n) => {
      if (fold(n.caption).includes(q)) return [n]
      const kids = n.children ? walk(n.children) : []
      if (!kids.length) return []
      expanded.add(n.id)
      return [{ ...n, children: kids }]
    })
  return { nodes: walk(nodes), expanded }
}

/** Alfabetik sıralamada üst seviye baş harfe göre gruplanır (orijinal groupedItems). */
export function groupByLetter(nodes: MenuNode[]) {
  const groups: { letter: string; nodes: MenuNode[] }[] = []
  for (const n of nodes) {
    const letter = n.caption[0]!.toLocaleUpperCase('tr')
    const last = groups[groups.length - 1]
    if (last?.letter === letter) last.nodes.push(n)
    else groups.push({ letter, nodes: [n] })
  }
  return groups
}
