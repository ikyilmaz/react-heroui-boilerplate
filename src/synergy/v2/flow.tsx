import { useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CircleAlert, CircleCheck, CircleX } from 'lucide-react'
import { AlertDialog, Button, ComboBox, FieldError, Input, Label, ListBox, Modal, TextArea, TextField, Typography, cn } from '@heroui/react'
import {
  CONFIRM_MESSAGE,
  FORWARD_EMPTY,
  FORWARD_LABEL,
  REASON_EMPTY,
  REASON_TITLE,
  forwardCandidates,
  type Person,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'
import { toneOf, useDecisionPipeline, type EventTone, type PipelineOptions } from '@/synergy/shared/pipeline'
import { Box } from '@/synergy/shared/ui'
import { LABEL } from '@/synergy/v2/parts'

/* -------------------------------------------------------------------------------------------------
 * Olay hattının pencereleri (mantık `shared/pipeline.ts`'te). Başta olayın adı ve anlam ikonu
 * karesi (onay yeşil, ret / geri gönderme kırmızı); düğmeler sağda.
 * ------------------------------------------------------------------------------------------------- */

const toneIcon: Record<EventTone, { icon: LucideIcon; cls: string }> = {
  success: { icon: CircleCheck, cls: 'bg-success/12 text-success' },
  danger: { icon: CircleX, cls: 'bg-danger/12 text-danger' },
  ink: { icon: CircleAlert, cls: 'bg-accent-soft text-accent-soft-foreground' },
}

/** Pencere başı: tonlu ikon karesi, yanında olayın adı ve başlık. */
function Head({ tone, label, title }: { tone: EventTone; label?: string; title: string }) {
  const { icon: Icon, cls } = toneIcon[tone]
  return (
    <Box className="flex items-center gap-3">
      <Box aria-hidden className={cn('grid size-10 shrink-0 place-items-center rounded-lg', cls)}>
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </Box>
      <Box className="flex min-w-0 flex-col">
        <Typography className="text-base font-semibold">{title}</Typography>
        {label && <Typography className={LABEL}>{label}</Typography>}
      </Box>
    </Box>
  )
}

export function useBentoFlow(r: WorkRequest | undefined, opts: PipelineOptions = {}): { run: (eventId: number, target?: WorkRequest) => void; element: ReactNode } {
  const { open, run, cancel, proceed, forward } = useDecisionPipeline(r, opts)
  const key = open && `${open.request.id}-${open.event.id}`
  const tone = toneOf(open?.event.kind)
  const element = (
    <>
      <Confirm
        isOpen={open?.stage === 'confirm'}
        tone={tone}
        label={open?.event.description}
        message={open?.event.confirmMessage ?? CONFIRM_MESSAGE}
        onYes={() => proceed()}
        onNo={cancel}
      />
      {open?.stage === 'reason' && (
        <ReasonDialog key={key} tone={tone} label={open.event.description} title={open.event.reasonTitle ?? REASON_TITLE} onOk={(reason) => proceed(reason)} onCancel={cancel} />
      )}
      {open?.stage === 'forward' && <ForwardDialog key={key} candidates={forwardCandidates(open.request)} onOk={forward} onCancel={cancel} />}
    </>
  )
  return { run, element }
}

/** "Uyarı" onayı (Evet / Hayır); taslak silmede de kullanılır. */
export function Confirm({
  isOpen,
  message,
  onYes,
  onNo,
  tone = 'ink',
  label,
}: {
  isOpen: boolean
  message: string
  onYes: () => void
  onNo: () => void
  tone?: EventTone
  label?: string
}) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={(o) => !o && onNo()}>
      <AlertDialog.Trigger className="hidden" aria-hidden tabIndex={-1} />
      <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog className="gap-5 p-6">
            <AlertDialog.Header>
              <AlertDialog.Heading className="w-full">
                <Head tone={tone} label={label} title={FLOW_TEXT.warning} />
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="text-foreground/80">{message}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={onNo}>
                {FLOW_TEXT.no}
              </Button>
              <Button variant={tone === 'danger' ? 'danger' : 'primary'} onPress={onYes} autoFocus>
                {FLOW_TEXT.yes}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  )
}

function Sheet({ title, label, tone, children, onOk, onCancel }: { title: string; label?: string; tone: EventTone; children: ReactNode; onOk: () => void; onCancel: () => void }) {
  return (
    <Modal isOpen onOpenChange={(o) => !o && onCancel()}>
      <Modal.Trigger className="hidden" aria-hidden tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog className="gap-5 p-6">
            <Modal.Header>
              <Modal.Heading className="w-full">
                <Head tone={tone} label={label} title={title} />
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={onCancel}>
                {FLOW_TEXT.cancel}
              </Button>
              <Button variant="primary" onPress={onOk}>
                {FLOW_TEXT.ok}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

/** Sebep: boşken "Tamam" kapatmaz, REASON_EMPTY gösterir. */
function ReasonDialog({ title, label, tone, onOk, onCancel }: { title: string; label?: string; tone: EventTone; onOk: (reason: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  const [tried, setTried] = useState(false)
  const reason = text.trim()
  return (
    <Sheet
      title={title}
      label={label}
      tone={tone}
      onCancel={onCancel}
      onOk={() => {
        setTried(true)
        if (reason) onOk(reason)
      }}
    >
      <TextField aria-label={title} value={text} onChange={setText} isInvalid={tried && !reason} autoFocus fullWidth>
        <TextArea rows={6} className="w-full resize-none" />
        <FieldError>{REASON_EMPTY}</FieldError>
      </TextField>
    </Sheet>
  )
}

/** Yönlendirme: aranabilir kullanıcı listesi; seçilmeden "Tamam" olmaz. */
function ForwardDialog({ candidates, onOk, onCancel }: { candidates: Person[]; onOk: (p: Person) => void; onCancel: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const person = candidates.find((p) => p.name === selected)
  return (
    <Sheet
      title={FLOW_TEXT.forwardTitle}
      tone="ink"
      onCancel={onCancel}
      onOk={() => {
        setTried(true)
        if (person) onOk(person)
      }}
    >
      <ComboBox value={selected} onChange={(key) => setSelected(key == null ? null : String(key))} isInvalid={tried && !person} menuTrigger="focus" fullWidth>
        <Label>{FORWARD_LABEL}</Label>
        <ComboBox.InputGroup>
          <Input autoFocus />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <FieldError>{FORWARD_EMPTY}</FieldError>
        <ComboBox.Popover>
          <ListBox aria-label={FORWARD_LABEL}>
            {candidates.map((p) => (
              <ListBox.Item key={p.name} id={p.name} textValue={p.name}>
                <Box className="min-w-0 flex-1">
                  <Typography type="body-sm" truncate>
                    {p.name}
                  </Typography>
                  <Typography type="body-xs" color="muted" truncate>
                    {p.department}
                  </Typography>
                </Box>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </Sheet>
  )
}
