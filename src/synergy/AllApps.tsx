import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  AppWindow,
  ArrowDownAZ,
  ArrowLeft,
  ChevronRight,
  GripVertical,
  ListOrdered,
  Search,
} from 'lucide-react'
import { Button, Drawer, Flex, Tag, Typography } from 'antd'
import { useBoxCounts } from '@/synergy/shared/decisions'
import { readJson, writeJson } from '@/synergy/shared/grid'
import {
  MENU_LABELS,
  MENU_TREE,
  filterTree,
  groupByLetter,
  sortTree,
  type MenuNode,
  type MenuSort,
} from '@/synergy/shared/menuTree'
import { k } from '@/synergy/paths'
import { IC, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { EmptyNote, SearchField } from '@/synergy/ant/parts'

/*
 * "Tüm uygulamalar" (orijinal sol menünün ayrıntılı ekranı): soldan açılan panel. Üstte geri ve
 * sıralama (sıra numarası ↔ alfabetik; tercih tarayıcıda), altında arama, sonra uygulama ağacı.
 * Klasörler açılır (içerik solda ince bir çizgiyle girintili); aramada eşleşen yol açık gelir ve
 * eşleşen metin vurgulanır. Alfabetik sıralamada üst seviye baş harfe göre gruplanır. Bir
 * uygulamaya basınca gidilir ve panel kapanır. Menü düzenleme (tasarımcı) yok.
 */

const SORT_KEY = 'synergy-menu-sort'

/** Arama metnini vurgular (orijinal highlightText). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLocaleLowerCase('tr')
  const at = q ? text.toLocaleLowerCase('tr').indexOf(q) : -1
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <Typography.Text className="rounded-sm bg-accent-soft text-accent-soft-foreground">
        {text.slice(at, at + q.length)}
      </Typography.Text>
      {text.slice(at + q.length)}
    </>
  )
}

interface TreeProps {
  query: string
  open: ReadonlySet<string>
  onToggle: (id: string) => void
  onPick: (n: MenuNode) => void
  activeId: string | undefined
  badges: ReadonlyMap<string, number>
}

function TreeNode({ n, ...p }: TreeProps & { n: MenuNode }) {
  // İkonu olmayan uygulama (orijinalde baş harfler) varsayılan ikonla; satırlar hizalı kalır
  const Icon = n.icon ?? AppWindow
  const isFolder = !!n.children?.length
  const expanded = isFolder && p.open.has(n.id)
  const active = n.id === p.activeId
  const badge = p.badges.get(n.id)
  return (
    <Flex vertical role="listitem">
      <Button
        type="text"
        aria-expanded={isFolder ? expanded : undefined}
        aria-current={active ? 'page' : undefined}
        onClick={() => (isFolder ? p.onToggle(n.id) : p.onPick(n))}
        className={cn(
          'h-10 w-full justify-start gap-3 rounded-xl px-2.5 text-start font-normal',
          active
            ? 'bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground'
            : 'text-foreground hover:bg-surface-secondary hover:text-foreground',
        )}
      >
        <Icon {...IC} size={18} className={cn('shrink-0', !active && 'text-muted')} />
        <Typography.Text ellipsis className="min-w-0 flex-1 text-sm text-current">
          <Highlight text={n.caption} query={p.query} />
        </Typography.Text>
        {badge ? (
          <Tag
            variant="filled"
            className={cn(
              'me-0 h-5 min-w-5 rounded-full border-0 px-1.5 text-center text-[0.6875rem] leading-5',
              active ? 'bg-accent-foreground text-accent' : 'bg-accent text-accent-foreground',
            )}
          >
            {badge}
          </Tag>
        ) : null}
        {isFolder && (
          <ChevronRight
            {...IC}
            size={16}
            aria-hidden
            className={cn(
              'shrink-0 text-muted transition-transform duration-[calc(200ms*var(--motion-time,1))]',
              expanded && 'rotate-90',
            )}
          />
        )}
      </Button>
      {isFolder && (
        // Açılıp kapanma yükseklik geçişiyle (grid 0fr ↔ 1fr); kapalıyken içerik odak almaz
        <Flex
          {...({ inert: !expanded } as Record<string, unknown>)}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-[calc(240ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <Flex vertical className="min-h-0 overflow-hidden">
            <Flex
              vertical
              role="list"
              aria-label={n.caption}
              className="ms-[1.3rem] mt-0.5 gap-0.5 border-s border-border ps-1.5"
            >
              {n.children!.map((c) => (
                <TreeNode key={c.id} n={c} {...p} />
              ))}
            </Flex>
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}

function TreeList({ nodes, label, ...p }: TreeProps & { nodes: MenuNode[]; label: string }) {
  return (
    <Flex vertical role="list" aria-label={label} className="gap-0.5">
      {nodes.map((n) => (
        <TreeNode key={n.id} n={n} {...p} />
      ))}
    </Flex>
  )
}

/** Adresin hangi yaprağa ait olduğu (en uzun eşleşen adres). */
function activeLeaf(nodes: MenuNode[], pathname: string): string | undefined {
  let best: { id: string; len: number } | undefined
  const walk = (list: MenuNode[]) =>
    list.forEach((n) => {
      if (n.href) {
        const h = k(n.href)
        if ((pathname === h || pathname.startsWith(`${h}/`)) && h.length > (best?.len ?? 0))
          best = { id: n.id, len: h.length }
      }
      if (n.children) walk(n.children)
    })
  walk(nodes)
  return best?.id
}

/**
 * Uygulama ağacının durumu ve listesi (tüm uygulamalar paneli ve başlat kutusu ortak): arama,
 * sıralama (tercih tarayıcıda), açık klasörler, rozetler. `onPicked`: uygulamaya basıldıktan sonra.
 */
export function useAppTree(onPicked: () => void) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<MenuSort>(() => readJson<MenuSort>(SORT_KEY, 'order'))
  const [userOpen, setUserOpen] = useState<ReadonlySet<string>>(new Set())
  const counts = useBoxCounts()
  // Rozet (orijinal badgeCount): İş Akış Yönetimi'nde bekleyen onaylar
  const badges = useMemo(
    () => new Map([['is-akis-yonetimi', counts.get('bekleyen') ?? 0]]),
    [counts],
  )

  const sorted = useMemo(() => sortTree(MENU_TREE, sort), [sort])
  const { nodes, expanded } = useMemo(() => filterTree(sorted, query), [sorted, query])
  // Aramada eşleşme yolu açık; aramasızken kullanıcının açtıkları
  const open = query.trim() ? expanded : userOpen
  const toggle = (id: string) =>
    setUserOpen((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const pick = (n: MenuNode) => {
    if (n.href) navigate(k(n.href))
    onPicked()
  }
  const changeSort = () => {
    const next: MenuSort = sort === 'order' ? 'alphabetic' : 'order'
    writeJson(SORT_KEY, next)
    setSort(next)
  }
  const tree = {
    query,
    open,
    onToggle: toggle,
    onPick: pick,
    activeId: activeLeaf(MENU_TREE, pathname),
    badges,
  }
  // Düğme, basınca geçilecek sıralamayı anlatır (o an aktif olanı değil)
  const sortLabel = sort === 'order' ? MENU_LABELS.sortAlphabetic : MENU_LABELS.sortOrder
  const SortIcon = sort === 'order' ? ArrowDownAZ : ListOrdered

  let list: ReactNode
  if (!nodes.length) list = null
  else if (sort === 'alphabetic')
    list = (
      <Flex vertical className="gap-3">
        {groupByLetter(nodes).map((g) => (
          <Flex vertical key={g.letter} className="gap-1">
            <Typography.Text type="secondary" className="px-2.5 text-xs font-semibold">
              {g.letter}
            </Typography.Text>
            <TreeList nodes={g.nodes} label={g.letter} {...tree} />
          </Flex>
        ))}
      </Flex>
    )
  else list = <TreeList nodes={nodes} label={MENU_LABELS.apps} {...tree} />

  return { query, setQuery, changeSort, sortLabel, SortIcon, list }
}

export { Highlight }

/**
 * Yüzen panelin kutusu: raf ve başlat kutusuyla aynı yüzey ve köşe (StartMenu › `CHROME_PANEL`).
 * Kutu, kenardan 12px boşluklu şeffaf kabın içinde: kayarak çıkarken boşlukla birlikte tamamen
 * ekran dışına gider; boşluğa tıklamak paneli kapatır.
 */
const FLOATING = {
  wrapper: 'p-3 shadow-none',
  section:
    'rounded-[min(calc(32px*var(--corner-scale,1)),calc(var(--radius)*3))] border border-border bg-surface shadow-(--overlay-shadow)',
}

export function AllAppsPanel({
  isOpen,
  onOpenChange,
  floating = false,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Gezinme › Üstte: sol kenardan içeride yüzen kutu (köşedeki tutamaçtan açılır). */
  floating?: boolean
}) {
  // Arama panel kapanınca korunur (orijinaldeki gibi); geri düğmesi temizleyerek kapatır
  const { query, setQuery, changeSort, sortLabel, SortIcon, list } = useAppTree(() =>
    onOpenChange(false),
  )
  return (
    <Drawer
      open={isOpen}
      onClose={() => onOpenChange(false)}
      placement="left"
      closable={false}
      size={floating ? 'min(calc(23.75rem + 1.5rem), 100vw)' : 'min(23.75rem, 100vw)'}
      aria-label={MENU_LABELS.allApps}
      classNames={
        floating
          ? { ...FLOATING, mask: 'bg-foreground/10', body: 'flex flex-col p-0' }
          : { section: 'bg-background', body: 'flex flex-col p-0' }
      }
    >
      {/* Başlık satırı: geri, başlık, sıralama */}
      <Flex align="center" className="gap-1 px-4 pt-4 pb-3">
        <Tip label={MENU_LABELS.close} placement="bottom">
          <Button
            type="text"
            aria-label={MENU_LABELS.close}
            icon={<ArrowLeft {...IC} size={20} />}
            onClick={() => {
              setQuery('')
              onOpenChange(false)
            }}
            className="size-10"
          />
        </Tip>
        <Typography.Title level={2} className="m-0 flex-1 font-display text-lg font-semibold">
          {MENU_LABELS.allApps}
        </Typography.Title>
        <Tip label={sortLabel} placement="bottom">
          <Button
            type="text"
            aria-label={sortLabel}
            icon={<SortIcon {...IC} size={20} />}
            onClick={changeSort}
            className="size-10"
          />
        </Tip>
      </Flex>
      <Flex vertical className="px-4 pb-3">
        {/* Temizle düğmesi aramanın kendisinde */}
        <SearchField
          value={query}
          onChange={setQuery}
          label={MENU_LABELS.searchAll}
          className="w-full"
        />
      </Flex>
      <Scroll className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {list ?? <EmptyNote text={MENU_LABELS.noResult} icon={Search} />}
      </Scroll>
    </Drawer>
  )
}

/** Raftaki "Tüm uygulamalar" düğmesi (orijinal menü alt bandı); dar rafta yalnızca ikon. */
export function AllAppsButton({ expanded, onPress }: { expanded: boolean; onPress: () => void }) {
  const button = (
    <Button
      type="text"
      aria-label={MENU_LABELS.allApps}
      onClick={onPress}
      className={cn(
        // Raftaki öğelerle aynı beyaz zemin; üzerine gelince birincil rengin yumuşak tonu
        'h-11 bg-surface text-accent-soft-foreground hover:bg-accent-soft hover:text-accent-soft-foreground',
        expanded ? 'w-full justify-start gap-3 px-3' : 'size-11 p-0',
      )}
    >
      <Search {...IC} size={20} />
      {expanded && (
        <>
          <Typography.Text className="flex-1 text-start text-sm font-medium text-current">
            {MENU_LABELS.allApps}
          </Typography.Text>
          <ChevronRight {...IC} size={16} />
        </>
      )}
    </Button>
  )
  return expanded ? (
    button
  ) : (
    <Tip label={MENU_LABELS.allApps} placement="right">
      {button}
    </Tip>
  )
}

/**
 * Gezinme › Üstte: ekranın sol üst köşesinde, sol kenara yapışık tutamaç (içinde noktalar); basınca
 * tüm uygulamalar paneli soldan yüzerek açılır. Sol çizgisi ekranın dışında kalır (kenardan çıkan
 * dil gibi); üzerine gelince biraz dışarı çekilir. Konumu kabuktan (`className`).
 */
export function AllAppsHandle({
  open,
  onPress,
  className,
}: {
  open: boolean
  onPress: () => void
  className?: string
}) {
  return (
    <Tip label={MENU_LABELS.allApps} placement="right">
      <Button
        type="text"
        aria-label={MENU_LABELS.allApps}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onPress}
        className={cn(
          // Piksel ölçüler: kabuk gibi temanın boşluk ölçeğinden bağımsız
          'h-[36px] w-[20px] min-w-0 rounded-s-none rounded-e-[min(calc(20px*var(--corner-scale,1)),calc(var(--radius)*2))] bg-surface p-0 ps-px text-muted shadow-(--overlay-shadow) transition-[width,color] duration-[calc(200ms*var(--motion-time,1))] ease-out hover:w-[26px] hover:bg-surface! hover:text-foreground!',
          open && 'w-[26px] text-foreground',
          className,
        )}
      >
        <GripVertical {...IC} size={16} />
      </Button>
    </Tip>
  )
}
