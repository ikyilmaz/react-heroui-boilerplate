import { useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { AppWindow, ArrowDownAZ, ArrowLeft, ChevronRight, ListOrdered, Search } from 'lucide-react'
import { Button, Chip, Drawer, Typography, cn } from '@heroui/react'
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
import { inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { k } from '@/synergy/v1/paths'
import { EmptyNote, IC, KaroSearch, Scroll, Tip } from '@/synergy/v1/parts'

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
      <Text className="rounded-sm bg-accent-soft text-accent-soft-foreground">
        {text.slice(at, at + q.length)}
      </Text>
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
    <Box role="listitem" className="flex flex-col">
      <Button
        variant="ghost"
        aria-expanded={isFolder ? expanded : undefined}
        aria-current={active ? 'page' : undefined}
        onPress={() => (isFolder ? p.onToggle(n.id) : p.onPick(n))}
        className={cn(
          'h-10 w-full justify-start gap-3 rounded-xl px-2.5 text-start font-normal',
          active
            ? 'bg-accent text-accent-foreground data-hovered:bg-accent'
            : 'text-foreground data-hovered:bg-surface-secondary',
        )}
      >
        <Icon {...IC} size={18} className={cn('shrink-0', !active && 'text-muted')} />
        <Typography {...inline} truncate className="min-w-0 flex-1 text-sm text-current!">
          <Highlight text={n.caption} query={p.query} />
        </Typography>
        {badge ? (
          <Chip
            size="sm"
            className={cn(
              'h-5 min-w-5 justify-center px-1.5 font-mono text-[0.6875rem]',
              active ? 'bg-accent-foreground text-accent' : 'bg-accent text-accent-foreground',
            )}
          >
            {badge}
          </Chip>
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
        <Box
          {...({ inert: !expanded } as Record<string, unknown>)}
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-[calc(240ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
            expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <Box className="min-h-0 overflow-hidden">
            <Box
              role="list"
              aria-label={n.caption}
              className="ms-[1.3rem] mt-0.5 flex flex-col gap-0.5 border-s border-border ps-1.5"
            >
              {n.children!.map((c) => (
                <TreeNode key={c.id} n={c} {...p} />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

function TreeList({ nodes, label, ...p }: TreeProps & { nodes: MenuNode[]; label: string }) {
  return (
    <Box role="list" aria-label={label} className="flex flex-col gap-0.5">
      {nodes.map((n) => (
        <TreeNode key={n.id} n={n} {...p} />
      ))}
    </Box>
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

export function AllAppsPanel({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Arama panel kapanınca korunur (orijinaldeki gibi); geri düğmesi temizleyerek kapatır
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
    onOpenChange(false)
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
  if (!nodes.length) list = <EmptyNote text={MENU_LABELS.noResult} icon={Search} />
  else if (sort === 'alphabetic')
    list = (
      <Box className="flex flex-col gap-3">
        {groupByLetter(nodes).map((g) => (
          <Box key={g.letter} className="flex flex-col gap-1">
            <Text tone="muted" className="px-2.5 font-mono text-xs font-semibold">
              {g.letter}
            </Text>
            <TreeList nodes={g.nodes} label={g.letter} {...tree} />
          </Box>
        ))}
      </Box>
    )
  else list = <TreeList nodes={nodes} label={MENU_LABELS.apps} {...tree} />

  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Trigger className="hidden" aria-hidden />
      <Drawer.Content placement="left">
        <Drawer.Dialog
          aria-label={MENU_LABELS.allApps}
          className="w-[23.75rem] max-w-full gap-0 bg-background p-0"
        >
          {/* Başlık satırı yatay (HeroUI başlığı dikey dizer) */}
          <Box className="flex items-center gap-1 px-4 pt-4 pb-3">
            <Tip label={MENU_LABELS.close} placement="bottom">
              <Button
                isIconOnly
                variant="ghost"
                aria-label={MENU_LABELS.close}
                onPress={() => {
                  setQuery('')
                  onOpenChange(false)
                }}
              >
                <ArrowLeft {...IC} size={20} />
              </Button>
            </Tip>
            <Drawer.Heading className="flex-1 font-display text-lg font-semibold">
              {MENU_LABELS.allApps}
            </Drawer.Heading>
            <Tip label={sortLabel} placement="bottom">
              <Button isIconOnly variant="ghost" aria-label={sortLabel} onPress={changeSort}>
                <SortIcon {...IC} size={20} />
              </Button>
            </Tip>
          </Box>
          <Box className="px-4 pb-3">
            {/* Temizle düğmesi SearchField'in kendisinde */}
            <KaroSearch
              value={query}
              onChange={setQuery}
              label={MENU_LABELS.searchAll}
              className="w-full"
            />
          </Box>
          <Scroll className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{list}</Scroll>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Root>
  )
}

/** Raftaki "Tüm uygulamalar" düğmesi (orijinal menü alt bandı); dar rafta yalnızca ikon. */
export function AllAppsButton({ expanded, onPress }: { expanded: boolean; onPress: () => void }) {
  const button = (
    <Button
      variant="ghost"
      isIconOnly={!expanded}
      aria-label={MENU_LABELS.allApps}
      onPress={onPress}
      className={cn(
        // Raftaki öğelerle aynı beyaz zemin; üzerine gelince birincil rengin yumuşak tonu
        'h-11 bg-surface text-accent-soft-foreground data-hovered:bg-accent-soft',
        expanded ? 'w-full justify-start gap-3 px-3' : 'size-11',
      )}
    >
      <Search {...IC} size={20} />
      {expanded && (
        <>
          <Typography {...inline} className="flex-1 text-start text-sm font-medium text-current!">
            {MENU_LABELS.allApps}
          </Typography>
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
