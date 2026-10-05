import { useMemo, useState, type PointerEvent, type ReactNode } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import { Card, Flex, Select, Switch, Table, Tag, Typography, type TableColumnsType } from 'antd'
import {
  HR_LABELS,
  fullName,
  hrRecord,
  setCompanyAdmin,
  setRecords,
  useCompanyAdmins,
  useHrRecords,
  type HrModule,
  type HrRecord,
} from '@/synergy/shared/hrData'
import { CARD, IC, Scroll, cn } from '@/synergy/ant/ui'
import { EmptyNote, SearchField } from '@/synergy/ant/parts'
import { useNotify } from '@/synergy/ant/hr'
import { UserAvatar } from '@/synergy/hr/HrCells'
import { refLabel } from '@/synergy/hr/modules'
import { useTransition } from '@/synergy/motion'
import {
  CardGroup,
  CardList,
  GRID_CELL,
  GRID_ROW_SELECTED,
  GRID_ROW_STATIC,
  GRID_TABLE,
  GridCard,
  ViewSwitch,
  useGridView,
} from '@/synergy/ant/grid'

/* İK'nın tablo dışı iki görünümü: şirket yöneticileri (anında kaydeden anahtar) ve nesne özellik
   ilişkileri (sürükleyerek sıralama, zorunlu / aktif anahtarları). */

const fold = (s: string) => s.toLocaleLowerCase('tr')
const { Text } = Typography

/** Anahtar (etiketsiz; erişilebilir adı dışarıdan). Tıklama satıra / karta geçmez. */
function Toggle({
  label,
  isSelected,
  onChange,
}: {
  label: string
  isSelected: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <Switch
      aria-label={label}
      checked={isSelected}
      onChange={(v, e) => {
        e.stopPropagation()
        onChange(v)
      }}
    />
  )
}

/* --- Şirket yöneticileri ----------------------------------------------------------------------- */

/** Şirket seçilir (Tümü yok); kullanıcıların "Aktif" anahtarı yöneticiliği anında değiştirir. */
export function CompanyAdmins({
  header,
}: {
  header: (controls: ReactNode, count: number) => ReactNode
}) {
  const companies = useHrRecords('sirketler')
  const users = useHrRecords('kullanicilar')
  const admins = useCompanyAdmins()
  const notify = useNotify()
  const [company, setCompany] = useState(companies[0]!.id)
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const rows = users.filter((u) =>
    !q
      ? true
      : [fullName(u), u.username, u.eMail, refLabel('departmanlar', u.departmentId)].some((x) =>
          fold(String(x ?? '')).includes(q),
        ),
  )
  const list = admins[company] ?? []
  const [view, setView] = useGridView('hr:sirket-yoneticileri')
  const toggle = (u: HrRecord) => (
    <Toggle
      label={`${HR_LABELS.active}: ${fullName(u)}`}
      isSelected={list.includes(u.id)}
      onChange={(v) => {
        setCompanyAdmin(company, u.id, v)
        notify.success(HR_LABELS.success, fullName(u))
      }}
    />
  )
  const controls = (
    <>
      <SearchField value={query} onChange={setQuery} className="w-64 bg-surface" />
      <Select
        aria-label={HR_LABELS.company}
        value={company}
        onChange={(v) => v && setCompany(String(v))}
        options={companies.map((c) => ({ value: c.id, label: c.description as string }))}
        className="w-60 bg-surface"
      />
    </>
  )
  const columns: TableColumnsType<HrRecord> = [
    {
      key: 'user',
      title: 'Kullanıcı',
      className: 'text-foreground',
      render: (_, u) => (
        <Flex align="center" gap={12}>
          <UserAvatar user={u} />
          <Flex vertical className="min-w-0">
            <Text className="block font-medium text-current">{fullName(u)}</Text>
            <Text type="secondary" className="block text-xs">
              {u.username as string}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    { key: 'mail', title: 'E-posta', className: GRID_CELL, render: (_, u) => u.eMail as string },
    {
      key: 'dep',
      title: 'Departman',
      className: GRID_CELL,
      render: (_, u) => refLabel('departmanlar', u.departmentId),
    },
    {
      key: 'title',
      title: 'Ünvan',
      className: GRID_CELL,
      render: (_, u) => refLabel('unvanlar', u.professionId),
    },
    {
      key: 'admin',
      title: HR_LABELS.active,
      width: 1,
      align: 'end',
      render: (_, u) => toggle(u),
    },
  ]
  return (
    <>
      {header(controls, list.length)}
      {/* Tam yükseklik; tablo (ya da kartlar) kendi içinde kayar, başlık satırı üstte kalır */}
      <Card
        className={cn(CARD, 'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col')}
        classNames={{ body: 'flex flex-col gap-3 p-4 xl:min-h-0 xl:flex-1' }}
      >
        <Flex align="center" className="shrink-0">
          <ViewSwitch view={view} onChange={setView} className="ms-auto" />
        </Flex>
        {view === 'cards' ? (
          <CardList className="xl:min-h-0 xl:flex-1">
            {rows.length === 0 && <EmptyNote text={HR_LABELS.noData} />}
            {rows.length > 0 && (
              <CardGroup listLabel="Şirket Yöneticileri">
                {rows.map((u) => (
                  <GridCard
                    key={u.id}
                    selected={list.includes(u.id)}
                    lead={<UserAvatar user={u} />}
                    title={fullName(u)}
                    eyebrow={
                      <Text type="secondary" className="text-xs">
                        {u.username as string}
                      </Text>
                    }
                    fields={[
                      { label: 'E-posta', value: u.eMail as string },
                      { label: 'Departman', value: refLabel('departmanlar', u.departmentId) },
                      { label: 'Ünvan', value: refLabel('unvanlar', u.professionId) },
                    ]}
                    footer={HR_LABELS.active}
                    actions={toggle(u)}
                  />
                ))}
              </CardGroup>
            )}
          </CardList>
        ) : (
          <Flex vertical className="overflow-auto xl:min-h-0 xl:flex-1">
            <Table<HrRecord>
              aria-label="Şirket Yöneticileri"
              size="middle"
              pagination={false}
              rowKey="id"
              columns={columns}
              dataSource={rows}
              className={GRID_TABLE}
              locale={{ emptyText: <EmptyNote text={HR_LABELS.noData} /> }}
              rowClassName={(u) => cn(GRID_ROW_STATIC, list.includes(u.id) && GRID_ROW_SELECTED)}
            />
          </Flex>
        )}
      </Card>
    </>
  )
}

/* --- Özellik ilişkileri ------------------------------------------------------------------------ */

/**
 * Nesneye bağlı özellikler: üstte bağlı olanlar (tutamaktan sürükleyerek sıralanır; "Gerekli" ve
 * "Aktif" anahtarları), altta bağlı olmayanlar ("Aktif" ile eklenir). Her değişiklik anında
 * yazılır ve orijinal bildirimi çıkar.
 */
export function PropertyRelations({
  module,
  header,
}: {
  module: HrModule
  header: (controls: ReactNode, count: number) => ReactNode
}) {
  const linked = useHrRecords(module)
  const all = useHrRecords('ozellikler')
  const notify = useNotify()
  const [query, setQuery] = useState('')
  const q = fold(query.trim())
  const match = (id: string) => !q || fold(refLabel('ozellikler', id)).includes(q)
  const others = useMemo(() => all.filter((p) => !linked.some((l) => l.id === p.id)), [all, linked])
  // Sürüklerken sıra yerelde tutulur; bırakınca yazılır
  const [order, setOrder] = useState<HrRecord[] | null>(null)
  const items = order ?? linked

  const write = (list: HrRecord[]) =>
    setRecords(
      module,
      list.map((r, i) => ({ ...r, order: i })),
    )

  const controls = <SearchField value={query} onChange={setQuery} className="w-64 bg-surface" />
  const box = cn(CARD, 'shrink-0')
  const boxBody = { body: 'flex flex-col gap-1 p-3' }
  return (
    <>
      {header(controls, linked.length)}
      {/* Bağlı ve bağlı olmayan özellikler tek kaydırma kabında (tam yükseklik) */}
      <Scroll className="gap-3 xl:min-h-0 xl:flex-1">
        <Card className={box} classNames={boxBody}>
          {items.length === 0 ? (
            <EmptyNote text={HR_LABELS.noData} className="py-8" />
          ) : (
            <Reorder.Group
              as="div"
              axis="y"
              values={items}
              onReorder={setOrder}
              role="list"
              aria-label="Bağlı özellikler"
              className="flex flex-col gap-1"
            >
              {items
                .filter((r) => match(r.id))
                .map((r) => (
                  <RelationRow
                    key={r.id}
                    item={r}
                    onDrop={() => {
                      if (!order) return
                      write(order)
                      setOrder(null)
                      notify.success(HR_LABELS.success, HR_LABELS.orderChanged)
                    }}
                    onRequired={(v) => {
                      write(items.map((x) => (x.id === r.id ? { ...x, required: v } : x)))
                      notify.success(HR_LABELS.success, HR_LABELS.requiredChanged)
                    }}
                    onRemove={() => {
                      write(items.filter((x) => x.id !== r.id))
                      notify.success(HR_LABELS.info, HR_LABELS.relationRemoved)
                    }}
                  />
                ))}
            </Reorder.Group>
          )}
        </Card>
        {others.filter((p) => match(p.id)).length > 0 && (
          <Card className={box} classNames={boxBody}>
            {others
              .filter((p) => match(p.id))
              .map((p) => (
                <Flex
                  key={p.id}
                  align="center"
                  gap={12}
                  className="animate-rise rounded-xl px-3 py-2.5 opacity-70 transition-opacity hover:opacity-100"
                >
                  <Flex className="block size-4 shrink-0" />
                  <PropertyText id={p.id} />
                  <Toggle
                    label={`${HR_LABELS.active}: ${refLabel('ozellikler', p.id)}`}
                    isSelected={false}
                    onChange={() => {
                      write([...linked, { id: p.id, order: linked.length, required: false }])
                      notify.success(HR_LABELS.info, HR_LABELS.relationAdded)
                    }}
                  />
                </Flex>
              ))}
          </Card>
        )}
      </Scroll>
    </>
  )
}

function PropertyText({ id }: { id: string }) {
  const p = hrRecord('ozellikler', id)
  return (
    <Flex align="center" gap={12} className="min-w-0 flex-1">
      <Flex vertical className="min-w-0 flex-1">
        <Text ellipsis className="block font-medium text-current">
          {p?.caption as string}
        </Text>
        <Text type="secondary" ellipsis className="block text-xs">
          {p?.propertyName as string}
        </Text>
      </Flex>
      <Tag variant="filled" className="me-0 rounded-full border-0">
        {p?.type as string}
      </Tag>
    </Flex>
  )
}

function RelationRow({
  item,
  onDrop,
  onRequired,
  onRemove,
}: {
  item: HrRecord
  onDrop: () => void
  onRequired: (v: boolean) => void
  onRemove: () => void
}) {
  const controls = useDragControls()
  const transition = useTransition({ type: 'spring', stiffness: 500, damping: 40 })
  const name = refLabel('ozellikler', item.id)
  return (
    <Reorder.Item
      as="div"
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      transition={transition}
      whileDrag={{ scale: 1.01, boxShadow: '0 12px 32px -12px oklch(0 0 0 / 0.3)' }}
      role="listitem"
      className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 transition-colors hover:bg-surface-secondary"
    >
      {/* Tutamak: sürükleyerek sıralanır */}
      <Flex
        aria-hidden
        align="center"
        justify="center"
        onPointerDown={(e: PointerEvent<HTMLElement>) => controls.start(e)}
        className="size-4 shrink-0 cursor-grab touch-none text-muted active:cursor-grabbing"
      >
        <GripVertical {...IC} />
      </Flex>
      <PropertyText id={item.id} />
      <Flex align="center" gap={8}>
        <Text type="secondary" className="text-xs">
          Gerekli
        </Text>
        <Toggle label={`Gerekli: ${name}`} isSelected={!!item.required} onChange={onRequired} />
      </Flex>
      <Flex align="center" gap={8}>
        <Text type="secondary" className="text-xs">
          {HR_LABELS.active}
        </Text>
        <Toggle label={`${HR_LABELS.active}: ${name}`} isSelected onChange={onRemove} />
      </Flex>
    </Reorder.Item>
  )
}
