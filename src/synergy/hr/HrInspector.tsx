import { useState } from 'react'
import { Check, Plus, Save, Trash2, UsersRound, X } from 'lucide-react'
import { Button, Card, Flex, Form, Segmented, Select, Transfer, Typography } from 'antd'
import { SoftModal } from '@/synergy/ant/modal'
import {
  HR_LABELS,
  fullName,
  hrRecords,
  saveRecord,
  type HrRecord,
  type HrStatus,
} from '@/synergy/shared/hrData'
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'
import { CARD, IC, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { useNotify } from '@/synergy/ant/hr'
import { ContentSwitch } from '@/synergy/tabs/ContentSwitch'
import { useDirection } from '@/synergy/tabs/motion'
import { HrField } from '@/synergy/hr/HrFields'
import { StatusBadge, UserAvatar } from '@/synergy/hr/HrCells'
import { refLabel, type ModuleDef } from '@/synergy/hr/modules'

/*
 * Düzenleme kartı (orijinalde yanda açılan düzenleme paneli): başlıkta kaydın adı ve durumu,
 * bölümler birden çoksa sekmelerde, altta Kaydet / Vazgeç. Zorunlu alan boşsa alan işaretlenir,
 * "Lütfen zorunlu alanları doldurunuz." uyarısı çıkar ve ilk hatalı bölüme geçilir. Kaydedince
 * "Başarılı" bildirimi ve düğmede kısa bir onay.
 */

/** Yeni kaydın başlangıç değerleri. */
function blank(def: ModuleDef): HrRecord {
  const r: HrRecord = { id: '' }
  for (const s of def.sections)
    for (const f of s.fields) {
      if (f.type === 'status') r[f.key] = 'Aktif'
      else if (f.type === 'refMany') r[f.key] = ['c1']
      else if (f.type === 'bool') r[f.key] = false
      else if (f.type === 'select' && f.options)
        r[f.key] = f.key === 'importStatus' ? 'Aktif' : f.required ? f.options[0] : ''
    }
  if (def.id === 'kullanicilar') r.managers = []
  if (def.id === 'gruplar') r.members = []
  return r
}

const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0)

export function HrInspector({
  def,
  record,
  onClose,
  onSaved,
}: {
  def: ModuleDef
  /** Düzenlenen kayıt; yoksa yeni kayıt. */
  record: HrRecord | undefined
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [draft, setDraft] = useState<HrRecord>(() =>
    record ? structuredClone(record) : blank(def),
  )
  const [tried, setTried] = useState(false)
  const [tab, setTab] = useState(def.sections[0]?.title ?? '')
  // Bölüm değişiminin yönü: sağdaki bölüme sağdan, soldakine soldan gelir
  const tabDir = useDirection(def.sections.findIndex((x) => x.title === tab))
  const [saved, setSaved] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const notify = useNotify()
  const set = (key: string, v: unknown) => setDraft((d) => ({ ...d, [key]: v }))

  const missing = (key: string) =>
    tried &&
    def.sections.some((s) => s.fields.some((f) => f.key === key && f.required)) &&
    isEmpty(draft[key])
  const sameError =
    !!def.distinct &&
    tried &&
    !!draft[def.distinct[0]] &&
    draft[def.distinct[0]] === draft[def.distinct[1]]

  const save = () => {
    setTried(true)
    const bad = def.sections.find((s) => s.fields.some((f) => f.required && isEmpty(draft[f.key])))
    if (bad) {
      setTab(bad.title)
      notify.warning(HR_LABELS.warning, HR_LABELS.fillRequired)
      return
    }
    if (def.distinct && draft[def.distinct[0]] === draft[def.distinct[1]]) {
      notify.warning(HR_LABELS.warning, HR_LABELS.sameUser)
      return
    }
    const id = saveRecord(def.id, draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
    notify.success(HR_LABELS.success, def.titleOf({ ...draft, id }))
    onSaved(id)
  }

  const isNew = !record
  const title = (isNew ? '' : def.titleOf(draft)) || HR_LABELS.new
  const Icon = def.icon
  const multi = def.sections.length > 1

  const body = (s: ModuleDef['sections'][number]) =>
    s.custom === 'managers' ? (
      <Managers value={(draft.managers as Manager[]) ?? []} onChange={(v) => set('managers', v)} />
    ) : (
      <Flex className="grid grid-cols-2 gap-x-4 gap-y-4">
        {s.fields.map((f) => (
          <Flex
            key={f.key}
            vertical
            className={cn('min-w-0', (f.wide || f.type === 'status') && 'col-span-2')}
          >
            <HrField
              field={f}
              value={draft[f.key]}
              onChange={(v) => set(f.key, v)}
              invalid={missing(f.key)}
            />
          </Flex>
        ))}
        {sameError && (
          <Typography.Text type="danger" className="col-span-2 text-sm">
            {HR_LABELS.sameUser}
          </Typography.Text>
        )}
        {def.id === 'gruplar' && (
          <Flex className="col-span-2">
            <Button
              onClick={() => setMembersOpen(true)}
              icon={<UsersRound {...IC} />}
              className="w-full"
            >
              {HR_LABELS.manageMembers}
              <Typography.Text type="secondary" className="ms-auto text-sm">
                {((draft.members as string[]) ?? []).length}
              </Typography.Text>
            </Button>
          </Flex>
        )}
      </Flex>
    )

  return (
    <Card
      className={cn(CARD, 'flex max-h-[80dvh] flex-col @6xl:h-full @6xl:max-h-none')}
      classNames={{ body: 'flex min-h-0 flex-1 flex-col p-0' }}
    >
      {/* Başlık: kaydın simgesi (kullanıcıda avatar), adı, durumu; kapat */}
      <Flex align="start" gap={12} className="border-b border-border p-5">
        {def.id === 'kullanicilar' && !isNew ? (
          <UserAvatar user={draft} size="lg" />
        ) : (
          <Flex
            aria-hidden
            align="center"
            justify="center"
            className="size-11 shrink-0 rounded-xl bg-accent-soft text-accent-soft-foreground"
          >
            {isNew ? <Plus {...IC} size={20} /> : <Icon {...IC} size={20} />}
          </Flex>
        )}
        <Flex vertical className="min-w-0 flex-1">
          <Typography.Text type="secondary" className="text-xs">
            {def.label}
          </Typography.Text>
          <Typography.Title level={2} ellipsis className="m-0 font-display text-lg font-semibold">
            {title}
          </Typography.Title>
          <Flex align="center">
            {typeof draft.status === 'string' && !isNew && (
              <StatusBadge status={draft.status as HrStatus} />
            )}
            {def.id === 'kullanicilar' && !isNew && (
              <Typography.Text type="secondary" className="ms-3 text-xs">
                {draft.username as string}
              </Typography.Text>
            )}
          </Flex>
        </Flex>
        <Tip label="Kapat">
          <Button
            type="text"
            size="small"
            aria-label="Kapat"
            icon={<X {...IC} size={18} />}
            onClick={onClose}
            className="text-muted"
          />
        </Tip>
      </Flex>

      <Scroll className="min-h-0 flex-1">
        <Form layout="vertical" component={false}>
          <Flex vertical className="p-5">
            {multi ? (
              <>
                <Segmented
                  block
                  aria-label={def.label}
                  value={tab}
                  onChange={setTab}
                  options={def.sections.map((s) => s.title)}
                  className={TABS}
                />
                {/* İçerik sekmenin yönüyle gelir: sağdaki sekmeye sağdan, soldakine soldan */}
                <Flex vertical role="tabpanel" className="relative mt-4 overflow-clip">
                  <ContentSwitch id={tab} dir={tabDir} vertical>
                    {body(def.sections.find((x) => x.title === tab)!)}
                  </ContentSwitch>
                </Flex>
              </>
            ) : (
              body(def.sections[0]!)
            )}
          </Flex>
        </Form>
      </Scroll>

      {/* Alt: Vazgeç / Kaydet; kaydedince düğmede kısa onay */}
      <Flex align="center" justify="end" gap={8} className="border-t border-border px-5 py-3">
        <Button type="text" onClick={onClose}>
          {HR_LABELS.cancel}
        </Button>
        <Button
          type="primary"
          onClick={save}
          icon={
            saved ? <Check key="ok" {...IC} className="animate-pop" /> : <Save key="save" {...IC} />
          }
          className="min-w-28"
        >
          {HR_LABELS.save}
        </Button>
      </Flex>

      {def.id === 'gruplar' && (
        <GroupMembers
          isOpen={membersOpen}
          value={(draft.members as string[]) ?? []}
          onClose={() => setMembersOpen(false)}
          onChange={(v) => set('members', v)}
        />
      )}
    </Card>
  )
}

/** Bölüm sekmeleri: eşit paylaşan bölümlü seçici, seçili bölüm birincil renkte dolu. */
const TABS = cn(
  'w-full rounded-xl bg-surface-secondary p-1',
  '[&_.ant-segmented-item]:whitespace-nowrap [&_.ant-segmented-thumb]:bg-accent',
  '[&_.ant-segmented-item-selected]:bg-accent [&_.ant-segmented-item-selected]:text-accent-foreground',
)

/* --- Amirler ----------------------------------------------------------------------------------- */

interface Manager {
  keyId: string
  userId: string
}

/** Kullanıcının amirleri: anahtar + amir satırları; "Yöneticiyi Seç" ekler, satırdan silinir. */
function Managers({ value, onChange }: { value: Manager[]; onChange: (v: Manager[]) => void }) {
  const keys = hrRecords('yonetici-anahtarlari')
  const users = hrRecords('kullanicilar')
  const update = (i: number, patch: Partial<Manager>) =>
    onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  return (
    <Flex vertical gap={12}>
      {value.length === 0 && (
        <Typography.Text
          type="secondary"
          className="rounded-xl bg-surface-secondary px-4 py-6 text-center text-sm"
        >
          {HR_LABELS.noData}
        </Typography.Text>
      )}
      {value.map((m, i) => (
        <Flex
          key={i}
          align="end"
          gap={8}
          className="animate-rise rounded-xl bg-surface-secondary p-3"
        >
          <Form.Item label={HR_LABELS.managerKey} className="w-40 shrink-0">
            <Select
              aria-label={HR_LABELS.managerKey}
              showSearch={{ optionFilterProp: 'label' }}
              options={keys.map((k) => ({ value: k.id, label: k.description as string }))}
              value={m.keyId}
              onChange={(v) => v && update(i, { keyId: v })}
              className="w-full"
            />
          </Form.Item>
          <Form.Item label={HR_LABELS.manager} className="min-w-0 flex-1">
            <Select
              aria-label={HR_LABELS.manager}
              showSearch={{ optionFilterProp: 'label' }}
              options={users.map((u) => ({ value: u.id, label: fullName(u) }))}
              value={m.userId}
              onChange={(v) => v && update(i, { userId: v })}
              className="w-full"
            />
          </Form.Item>
          <Tip label={HR_LABELS.removeManager}>
            <Button
              type="text"
              aria-label={`${HR_LABELS.removeManager}: ${refLabel('kullanicilar', m.userId)}`}
              icon={<Trash2 {...IC} />}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-muted hover:text-danger!"
            />
          </Tip>
        </Flex>
      ))}
      <Button
        onClick={() => onChange([...value, { keyId: keys[0]!.id, userId: users[0]!.id }])}
        icon={<Plus {...IC} />}
        className="self-start"
      >
        {HR_LABELS.pickManager}
      </Button>
    </Flex>
  )
}

/* --- Grup üyeleri ------------------------------------------------------------------------------ */

const fold = (s: string) => s.toLocaleLowerCase('tr')

/** "Grup Üyeleri" penceresi: kullanıcılar ↔ üyeler (aktarım listesi); Tamam düzenlemeye yazar. */
function GroupMembers({
  isOpen,
  value,
  onClose,
  onChange,
}: {
  isOpen: boolean
  value: string[]
  onClose: () => void
  onChange: (v: string[]) => void
}) {
  const [keys, setKeys] = useState(value)
  // Pencere her açılışta düzenlemedeki üyelerle başlar
  const [wasOpen, setWasOpen] = useState(isOpen)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) setKeys(value)
  }
  const users = hrRecords('kullanicilar')
  return (
    <SoftModal
      open={isOpen}
      onCancel={onClose}
      width={720}
      centered
      title={
        <Typography.Text className="font-display text-lg font-semibold">
          {HR_LABELS.groupMembers}
        </Typography.Text>
      }
      footer={
        <Flex justify="end" gap={8}>
          <Button type="text" onClick={onClose}>
            {HR_LABELS.cancel}
          </Button>
          <Button
            type="primary"
            onClick={() => {
              onChange(keys)
              onClose()
            }}
          >
            {FLOW_TEXT.ok}
          </Button>
        </Flex>
      }
    >
      <Transfer
        dataSource={users.map((u) => ({
          key: u.id,
          title: fullName(u),
          description: refLabel('departmanlar', u.departmentId),
        }))}
        targetKeys={keys}
        onChange={(next) => setKeys(next.map(String))}
        titles={['Kullanıcılar', HR_LABELS.groupMembers]}
        showSearch
        filterOption={(input, item) =>
          fold(`${item.title} ${item.description}`).includes(fold(input))
        }
        render={(item) => (
          <Flex vertical className="min-w-0">
            <Typography.Text ellipsis className="text-current">
              {item.title}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis className="text-xs">
              {item.description}
            </Typography.Text>
          </Flex>
        )}
        className="w-full [&_.ant-transfer-list]:h-80 [&_.ant-transfer-list]:min-w-0 [&_.ant-transfer-list]:flex-1"
      />
    </SoftModal>
  )
}
