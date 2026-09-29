import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  Button,
  ComboBox,
  FieldError,
  Input,
  Label,
  ListBox,
  Modal,
  TextArea,
  TextField,
  Typography,
} from '@heroui/react'
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
import {
  toneOf,
  useDecisionPipeline,
  type EventTone as Tone,
  type PipelineOptions,
} from '@/synergy/shared/pipeline'
import { Box } from '@/synergy/shared/ui'

/* -------------------------------------------------------------------------------------------------
 * Olay hattının pencereleri (mantık `shared/pipeline.ts`'te). Pencerelerin üstünde olayın anlam
 * renginde şerit (onay yeşil, ret / geri gönderme kırmızı).
 * ------------------------------------------------------------------------------------------------- */

const TITLE = 'font-display text-lg font-semibold'

const stripe: Record<Tone, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  ink: 'bg-accent',
}

/** Pencerenin üst şeridi; pencere açılınca soldan sağa dolar. */
function Stripe({ tone }: { tone: Tone }) {
  return (
    <Box
      aria-hidden
      className={`absolute inset-x-0 top-0 h-1.5 origin-left animate-grow-x [animation-delay:calc(120ms*var(--motion-time,1))] ${stripe[tone]}`}
    />
  )
}

export function useKaroFlow(
  r: WorkRequest | undefined,
  opts: PipelineOptions = {},
): { run: (eventId: number, target?: WorkRequest) => void; element: ReactNode } {
  const { open, run, cancel, proceed, forward } = useDecisionPipeline(r, opts)
  const key = open && `${open.request.id}-${open.event.id}`
  const element = (
    <>
      <KaroConfirm
        isOpen={open?.stage === 'confirm'}
        tone={toneOf(open?.event.kind)}
        message={open?.event.confirmMessage ?? CONFIRM_MESSAGE}
        onYes={() => proceed()}
        onNo={cancel}
      />
      {open?.stage === 'reason' && (
        <ReasonDialog
          key={key}
          tone={toneOf(open.event.kind)}
          title={open.event.reasonTitle ?? REASON_TITLE}
          onOk={(reason) => proceed(reason)}
          onCancel={cancel}
        />
      )}
      {open?.stage === 'forward' && (
        <ForwardDialog
          key={key}
          candidates={forwardCandidates(open.request)}
          onOk={forward}
          onCancel={cancel}
        />
      )}
    </>
  )

  return { run, element }
}

/* --- Pencereler -------------------------------------------------------------------------------- */

/** "Uyarı" onayı (Evet / Hayır); taslak silmede de kullanılır (kırmızı şerit). */
export function KaroConfirm({
  isOpen,
  message,
  onYes,
  onNo,
  tone = 'ink',
}: {
  isOpen: boolean
  message: string
  onYes: () => void
  onNo: () => void
  tone?: Tone
}) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={(o) => !o && onNo()}>
      <AlertDialog.Trigger className="hidden" aria-hidden tabIndex={-1} />
      <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog className="gap-4">
            <Stripe tone={tone} />
            <AlertDialog.Header>
              <AlertDialog.Heading className={TITLE}>{FLOW_TEXT.warning}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{message}</AlertDialog.Body>
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

function KaroModal({
  title,
  tone,
  children,
  onOk,
  onCancel,
}: {
  title: string
  tone: Tone
  children: ReactNode
  onOk: () => void
  onCancel: () => void
}) {
  return (
    <Modal isOpen onOpenChange={(o) => !o && onCancel()}>
      <Modal.Trigger className="hidden" aria-hidden tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog className="gap-4 overflow-hidden">
            <Stripe tone={tone} />
            {/* Hattın sonraki adımı (sebep, yönlendirme): içerik yandan kayarak gelir */}
            <Modal.Header className="animate-slide-in">
              <Modal.Heading className={TITLE}>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="animate-slide-in [animation-delay:calc(60ms*var(--motion-time,1))]">
              {children}
            </Modal.Body>
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
function ReasonDialog({
  title,
  tone,
  onOk,
  onCancel,
}: {
  title: string
  tone: Tone
  onOk: (reason: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [tried, setTried] = useState(false)
  const reason = text.trim()
  return (
    <KaroModal
      title={title}
      tone={tone}
      onCancel={onCancel}
      onOk={() => {
        setTried(true)
        if (reason) onOk(reason)
      }}
    >
      <TextField
        aria-label={title}
        value={text}
        onChange={setText}
        isInvalid={tried && !reason}
        autoFocus
        fullWidth
      >
        <TextArea rows={5} className="w-full resize-none" />
        <FieldError>{REASON_EMPTY}</FieldError>
      </TextField>
    </KaroModal>
  )
}

/** Yönlendirme: aranabilir kullanıcı listesi; seçilmeden "Tamam" olmaz. */
function ForwardDialog({
  candidates,
  onOk,
  onCancel,
}: {
  candidates: Person[]
  onOk: (p: Person) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const person = candidates.find((p) => p.name === selected)
  return (
    <KaroModal
      title={FLOW_TEXT.forwardTitle}
      tone="ink"
      onCancel={onCancel}
      onOk={() => {
        setTried(true)
        if (person) onOk(person)
      }}
    >
      <ComboBox
        value={selected}
        onChange={(key) => setSelected(key == null ? null : String(key))}
        isInvalid={tried && !person}
        menuTrigger="focus"
        fullWidth
      >
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
    </KaroModal>
  )
}
