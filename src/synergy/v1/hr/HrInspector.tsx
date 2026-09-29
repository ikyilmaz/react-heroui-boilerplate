import { useState } from 'react'
import { Check, Plus, Save, Trash2, UsersRound, X } from 'lucide-react'
import { Button, Card, Modal, Tabs, Typography, cn, toast } from '@heroui/react'
import { Combobox } from '@/components/Combobox'
import { Transfer } from '@/components/Transfer'
import {
  HR_LABELS,
  fullName,
  hrRecords,
  saveRecord,
  type HrRecord,
  type HrStatus,
} from '@/synergy/shared/hrData'
import { card, inline } from '@/synergy/shared/tokens'
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'
import { Box, Text } from '@/synergy/shared/ui'
import { IC, Tip, Scroll } from '@/synergy/v1/parts'
import { HrField } from '@/synergy/v1/hr/HrFields'
import { StatusBadge, UserAvatar } from '@/synergy/v1/hr/HrCells'
import { DirectionalPanels } from '@/synergy/v1/motion'
import { refLabel, type ModuleDef } from '@/synergy/v1/hr/modules'

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
  const [saved, setSaved] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
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
      toast.warning(HR_LABELS.warning, { description: HR_LABELS.fillRequired })
      return
    }
    if (def.distinct && draft[def.distinct[0]] === draft[def.distinct[1]]) {
      toast.warning(HR_LABELS.warning, { description: HR_LABELS.sameUser })
      return
    }
    const id = saveRecord(def.id, draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
    toast.success(HR_LABELS.success, { description: def.titleOf({ ...draft, id }) })
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
      <Box className="grid grid-cols-2 gap-x-4 gap-y-4">
        {s.fields.map((f) => (
          <Box
            key={f.key}
            className={cn('min-w-0', (f.wide || f.type === 'status') && 'col-span-2')}
          >
            <HrField
              field={f}
              value={draft[f.key]}
              onChange={(v) => set(f.key, v)}
              invalid={missing(f.key)}
            />
          </Box>
        ))}
        {sameError && <Text className="col-span-2 text-sm text-danger">{HR_LABELS.sameUser}</Text>}
        {def.id === 'gruplar' && (
          <Box className="col-span-2">
            <Button variant="secondary" onPress={() => setMembersOpen(true)} className="w-full">
              <UsersRound {...IC} />
              {HR_LABELS.manageMembers}
              <Text tone="muted" className="ms-auto text-sm">
                {((draft.members as string[]) ?? []).length}
              </Text>
            </Button>
          </Box>
        )}
      </Box>
    )

  return (
    <Card
      className={cn(
        card,
        'flex max-h-[80dvh] flex-col gap-0 overflow-hidden p-0 xl:h-full xl:max-h-none',
      )}
    >
      {/* Başlık: kaydın simgesi (kullanıcıda avatar), adı, durumu; kapat */}
      <Box className="flex items-start gap-3 border-b border-border p-5">
        {def.id === 'kullanicilar' && !isNew ? (
          <UserAvatar user={draft} size="lg" />
        ) : (
          <Box
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground"
          >
            {isNew ? <Plus {...IC} size={20} /> : <Icon {...IC} size={20} />}
          </Box>
        )}
        <Box className="min-w-0 flex-1">
          <Text tone="muted" className="text-xs">
            {def.label}
          </Text>
          <Typography.Heading level={2} truncate className="font-display text-lg font-semibold">
            {title}
          </Typography.Heading>
          {typeof draft.status === 'string' && !isNew && (
            <StatusBadge status={draft.status as HrStatus} />
          )}
          {def.id === 'kullanicilar' && !isNew && (
            <Typography {...inline} className="ms-3 font-mono text-xs text-muted!">
              {draft.username as string}
            </Typography>
          )}
        </Box>
        <Tip label="Kapat">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="Kapat"
            onPress={onClose}
            className="text-muted"
          >
            <X {...IC} size={18} />
          </Button>
        </Tip>
      </Box>

      <Scroll className="min-h-0 flex-1 overflow-y-auto">
        <Box className="p-5">
          {multi ? (
            <>
              <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))}>
                <Tabs.ListContainer>
                  <Tabs.List aria-label={def.label} className="w-full">
                    {def.sections.map((s) => (
                      <Tabs.Tab
                        key={s.title}
                        id={s.title}
                        className="flex-1 whitespace-nowrap data-[selected=true]:text-accent-foreground"
                      >
                        <Tabs.Indicator className="bg-accent" />
                        {s.title}
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
              {/* İçerik sekmenin yönüyle gelir: sağdaki sekmeye sağdan, soldakine soldan */}
              <DirectionalPanels
                ids={def.sections.map((s) => s.title)}
                active={tab}
                render={(title) => body(def.sections.find((s) => s.title === title)!)}
                className="mt-4"
              />
            </>
          ) : (
            body(def.sections[0]!)
          )}
        </Box>
      </Scroll>

      {/* Alt: Vazgeç / Kaydet; kaydedince düğmede kısa onay */}
      <Box className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onPress={onClose}>
          {HR_LABELS.cancel}
        </Button>
        <Button onPress={save} className="min-w-28">
          {saved ? <Check key="ok" {...IC} className="animate-pop" /> : <Save key="save" {...IC} />}
          {HR_LABELS.save}
        </Button>
      </Box>

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
    <Box className="flex flex-col gap-3">
      {value.length === 0 && (
        <Text
          tone="muted"
          className="rounded-xl bg-surface-secondary px-4 py-6 text-center text-sm"
        >
          {HR_LABELS.noData}
        </Text>
      )}
      {value.map((m, i) => (
        <Box
          key={i}
          className="flex animate-rise items-end gap-2 rounded-xl bg-surface-secondary p-3"
        >
          <Combobox
            label={HR_LABELS.managerKey}
            options={keys.map((k) => ({ value: k.id, label: k.description as string }))}
            value={m.keyId}
            onChange={(v) => v && update(i, { keyId: v })}
            className="w-40 shrink-0"
          />
          <Combobox
            label={HR_LABELS.manager}
            showSearch
            options={users.map((u) => ({ value: u.id, label: fullName(u) }))}
            value={m.userId}
            onChange={(v) => v && update(i, { userId: v })}
            className="min-w-0 flex-1"
          />
          <Tip label={HR_LABELS.removeManager}>
            <Button
              isIconOnly
              variant="ghost"
              aria-label={`${HR_LABELS.removeManager}: ${refLabel('kullanicilar', m.userId)}`}
              onPress={() => onChange(value.filter((_, j) => j !== i))}
              className="text-muted data-hovered:text-danger"
            >
              <Trash2 {...IC} />
            </Button>
          </Tip>
        </Box>
      ))}
      <Button
        variant="secondary"
        onPress={() => onChange([...value, { keyId: keys[0]!.id, userId: users[0]!.id }])}
        className="self-start"
      >
        <Plus {...IC} />
        {HR_LABELS.pickManager}
      </Button>
    </Box>
  )
}

/* --- Grup üyeleri ------------------------------------------------------------------------------ */

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
  const users = hrRecords('kullanicilar')
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(o) => {
        if (o) setKeys(value)
        else onClose()
      }}
    >
      <Modal.Trigger className="hidden" aria-hidden tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog className="gap-4">
            <Modal.Header>
              <Modal.Heading className="font-display text-lg font-semibold">
                {HR_LABELS.groupMembers}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Transfer
                dataSource={users.map((u) => ({
                  key: u.id,
                  title: fullName(u),
                  description: refLabel('departmanlar', u.departmentId),
                }))}
                targetKeys={keys}
                onChange={setKeys}
                titles={['Kullanıcılar', HR_LABELS.groupMembers]}
                showSearch
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onClose}>
                {HR_LABELS.cancel}
              </Button>
              <Button
                onPress={() => {
                  onChange(keys)
                  onClose()
                }}
              >
                {FLOW_TEXT.ok}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
