import { useMemo, useState, type PointerEvent, type ReactNode } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical } from 'lucide-react'
import { Card, Chip, ListBox, Select, Switch, Table, Typography, cn, toast } from '@heroui/react'
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
import { card, inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { EmptyNote, IC, KaroSearch, Scroll } from '@/synergy/v1/parts'
import { UserAvatar } from '@/synergy/v1/hr/HrCells'
import { refLabel } from '@/synergy/v1/hr/modules'
import { useTransition } from '@/synergy/v1/motion'

/* İK'nın tablo dışı iki görünümü: şirket yöneticileri (anında kaydeden anahtar) ve nesne özellik
   ilişkileri (sürükleyerek sıralama, zorunlu / aktif anahtarları). */

const fold = (s: string) => s.toLocaleLowerCase('tr')

/** Anahtar (etiketsiz; erişilebilir adı dışarıdan). */
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
    <Switch aria-label={label} isSelected={isSelected} onChange={onChange}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
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
  const controls = (
    <>
      <KaroSearch value={query} onChange={setQuery} className="w-64" />
      <Select
        aria-label={HR_LABELS.company}
        value={company}
        onChange={(v) => v && setCompany(String(v))}
        className="w-60"
      >
        <Select.Trigger className="bg-surface text-foreground">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label={HR_LABELS.company}>
            {companies.map((c) => (
              <ListBox.Item key={c.id} id={c.id} textValue={c.description as string}>
                {c.description as string}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </>
  )
  return (
    <>
      {header(controls, list.length)}
      {/* Tam yükseklik; tablo kendi içinde kayar, başlık satırı üstte kalır */}
      <Card className={cn(card, 'p-2 xl:min-h-0 xl:flex-1')}>
        <Table variant="secondary" className="xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <Table.ScrollContainer className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
            <Table.Content aria-label="Şirket Yöneticileri">
              <Table.Header className="sticky top-0 z-10">
                {['Kullanıcı', 'E-posta', 'Departman', 'Ünvan'].map((c, i) => (
                  <Table.Column
                    key={c}
                    id={c}
                    isRowHeader={i === 0}
                    className="whitespace-nowrap after:content-none"
                  >
                    {c}
                  </Table.Column>
                ))}
                <Table.Column id="admin" className="w-px text-end after:content-none">
                  {HR_LABELS.active}
                </Table.Column>
              </Table.Header>
              <Table.Body renderEmptyState={() => <EmptyNote text={HR_LABELS.noData} />}>
                {rows.map((u) => {
                  const on = list.includes(u.id)
                  return (
                    <Table.Row
                      key={u.id}
                      id={u.id}
                      className={cn('transition-colors *:border-b-0', on && '*:bg-accent-soft/40')}
                    >
                      <Table.Cell>
                        <Box className="flex items-center gap-3">
                          <UserAvatar user={u} />
                          <Box className="min-w-0">
                            <Typography {...inline} className="block font-medium text-current!">
                              {fullName(u)}
                            </Typography>
                            <Typography {...inline} className="block font-mono text-xs text-muted!">
                              {u.username as string}
                            </Typography>
                          </Box>
                        </Box>
                      </Table.Cell>
                      <Table.Cell>{u.eMail as string}</Table.Cell>
                      <Table.Cell>{refLabel('departmanlar', u.departmentId)}</Table.Cell>
                      <Table.Cell>{refLabel('unvanlar', u.professionId)}</Table.Cell>
                      <Table.Cell className="text-end">
                        <Toggle
                          label={`${HR_LABELS.active}: ${fullName(u)}`}
                          isSelected={on}
                          onChange={(v) => {
                            setCompanyAdmin(company, u.id, v)
                            toast.success(HR_LABELS.success, { description: fullName(u) })
                          }}
                        />
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
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

  const controls = <KaroSearch value={query} onChange={setQuery} className="w-64" />
  return (
    <>
      {header(controls, linked.length)}
      {/* Bağlı ve bağlı olmayan özellikler tek kaydırma kabında (tam yükseklik) */}
      <Scroll className="flex flex-col gap-3 xl:min-h-0 xl:flex-1">
        <Card className={cn(card, 'shrink-0 gap-1 p-3')}>
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
                      toast.success(HR_LABELS.success, { description: HR_LABELS.orderChanged })
                    }}
                    onRequired={(v) => {
                      write(items.map((x) => (x.id === r.id ? { ...x, required: v } : x)))
                      toast.success(HR_LABELS.success, { description: HR_LABELS.requiredChanged })
                    }}
                    onRemove={() => {
                      write(items.filter((x) => x.id !== r.id))
                      toast.success(HR_LABELS.info, { description: HR_LABELS.relationRemoved })
                    }}
                  />
                ))}
            </Reorder.Group>
          )}
        </Card>
        {others.filter((p) => match(p.id)).length > 0 && (
          <Card className={cn(card, 'shrink-0 gap-1 p-3')}>
            {others
              .filter((p) => match(p.id))
              .map((p) => (
                <Box
                  key={p.id}
                  className="flex animate-rise items-center gap-3 rounded-xl px-3 py-2.5 opacity-70 transition-opacity hover:opacity-100"
                >
                  <Box className="size-4 shrink-0" />
                  <PropertyText id={p.id} />
                  <Toggle
                    label={`${HR_LABELS.active}: ${refLabel('ozellikler', p.id)}`}
                    isSelected={false}
                    onChange={() => {
                      write([...linked, { id: p.id, order: linked.length, required: false }])
                      toast.success(HR_LABELS.info, { description: HR_LABELS.relationAdded })
                    }}
                  />
                </Box>
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
    <Box className="flex min-w-0 flex-1 items-center gap-3">
      <Box className="min-w-0 flex-1">
        <Typography {...inline} truncate className="block font-medium text-current!">
          {p?.caption as string}
        </Typography>
        <Typography {...inline} truncate className="block font-mono text-xs text-muted!">
          {p?.propertyName as string}
        </Typography>
      </Box>
      <Chip size="sm" variant="soft">
        {p?.type as string}
      </Chip>
    </Box>
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
      <Box
        aria-hidden
        onPointerDown={(e: PointerEvent<HTMLElement>) => controls.start(e)}
        className="grid size-4 shrink-0 cursor-grab touch-none place-items-center text-muted active:cursor-grabbing"
      >
        <GripVertical {...IC} />
      </Box>
      <PropertyText id={item.id} />
      <Box className="flex items-center gap-2">
        <Text tone="muted" className="text-xs">
          Gerekli
        </Text>
        <Toggle label={`Gerekli: ${name}`} isSelected={!!item.required} onChange={onRequired} />
      </Box>
      <Box className="flex items-center gap-2">
        <Text tone="muted" className="text-xs">
          {HR_LABELS.active}
        </Text>
        <Toggle label={`${HR_LABELS.active}: ${name}`} isSelected onChange={onRemove} />
      </Box>
    </Reorder.Item>
  )
}
