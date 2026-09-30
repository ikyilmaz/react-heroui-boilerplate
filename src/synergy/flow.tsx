import { useState, type ReactNode } from 'react'
import { Button, Flex, Form, Input, Modal, Select, Typography } from 'antd'
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

/* -------------------------------------------------------------------------------------------------
 * Olay hattının pencereleri (antd `Modal`; mantık `shared/pipeline.ts`'te). Pencerelerin üstünde
 * olayın anlam renginde şerit (onay yeşil, ret / geri gönderme kırmızı).
 * ------------------------------------------------------------------------------------------------- */

const TITLE = 'font-display text-lg font-semibold'

const stripe: Record<Tone, string> = {
  success: 'bg-success',
  danger: 'bg-danger',
  ink: 'bg-accent',
}

/** Pencere kabının sınıfları: şerit kabın üst kenarına oturur (kab zaten `relative`). */
const CONTAINER = 'overflow-hidden pt-7'

/** Pencerenin üst şeridi; pencere açılınca soldan sağa dolar. */
function Stripe({ tone }: { tone: Tone }) {
  return (
    <Flex
      aria-hidden
      className={`absolute inset-x-0 top-0 block h-1.5 origin-left animate-grow-x [animation-delay:calc(120ms*var(--motion-time,1))] ${stripe[tone]}`}
    />
  )
}

export function useFlow(
  r: WorkRequest | undefined,
  opts: PipelineOptions = {},
): { run: (eventId: number, target?: WorkRequest) => void; element: ReactNode } {
  const { open, run, cancel, proceed, forward } = useDecisionPipeline(r, opts)
  const key = open && `${open.request.id}-${open.event.id}`
  const element = (
    <>
      <ConfirmDialog
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
export function ConfirmDialog({
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
    <Modal
      open={isOpen}
      onCancel={onNo}
      width={400}
      centered
      title={<Typography.Text className={TITLE}>{FLOW_TEXT.warning}</Typography.Text>}
      classNames={{ container: CONTAINER }}
      closable={false}
      // Şerit alt bilgide: gövde / başlık kayarak girdiği için (dönüşüm) şerit kabın üstüne oturmazdı
      footer={
        <Flex justify="end" gap={8}>
          <Stripe tone={tone} />
          <Button type="text" onClick={onNo}>
            {FLOW_TEXT.no}
          </Button>
          <Button
            type="primary"
            danger={tone === 'danger'}
            onClick={onYes}
            // Açılınca odak "Evet"te (Enter onaylar)
            autoFocus
          >
            {FLOW_TEXT.yes}
          </Button>
        </Flex>
      }
    >
      <Typography.Paragraph className="mb-0!">{message}</Typography.Paragraph>
    </Modal>
  )
}

function FlowModal({
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
    <Modal
      open
      onCancel={onCancel}
      width={420}
      centered
      title={<Typography.Text className={TITLE}>{title}</Typography.Text>}
      // Hattın sonraki adımı (sebep, yönlendirme): içerik yandan kayarak gelir
      classNames={{
        container: CONTAINER,
        header: 'animate-slide-in',
        body: 'animate-slide-in [animation-delay:calc(60ms*var(--motion-time,1))]',
      }}
      closable={false}
      // Şerit alt bilgide: gövde / başlık kayarak girdiği için (dönüşüm) şerit kabın üstüne oturmazdı
      footer={
        <Flex justify="end" gap={8}>
          <Stripe tone={tone} />
          <Button type="text" onClick={onCancel}>
            {FLOW_TEXT.cancel}
          </Button>
          <Button type="primary" onClick={onOk}>
            {FLOW_TEXT.ok}
          </Button>
        </Flex>
      }
    >
      <Form layout="vertical" component={false}>
        {children}
      </Form>
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
  const invalid = tried && !reason
  return (
    <FlowModal
      title={title}
      tone={tone}
      onCancel={onCancel}
      onOk={() => {
        setTried(true)
        if (reason) onOk(reason)
      }}
    >
      <Form.Item validateStatus={invalid ? 'error' : undefined} help={invalid && REASON_EMPTY}>
        <Input.TextArea
          aria-label={title}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          autoFocus
          className="resize-none!"
        />
      </Form.Item>
    </FlowModal>
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
  const invalid = tried && !person
  return (
    <FlowModal
      title={FLOW_TEXT.forwardTitle}
      tone="ink"
      onCancel={onCancel}
      onOk={() => {
        setTried(true)
        if (person) onOk(person)
      }}
    >
      <Form.Item
        label={FORWARD_LABEL}
        htmlFor="karo-forward"
        validateStatus={invalid ? 'error' : undefined}
        help={invalid && FORWARD_EMPTY}
      >
        <Select
          id="karo-forward"
          showSearch={{ optionFilterProp: 'label' }}
          value={selected}
          onChange={(v: string) => setSelected(v)}
          autoFocus
          defaultOpen
          className="w-full"
          options={candidates.map((p) => ({ value: p.name, label: p.name, person: p }))}
          optionRender={(o) => (
            <Flex vertical className="min-w-0">
              <Typography.Text ellipsis>{o.data.person.name}</Typography.Text>
              <Typography.Text type="secondary" ellipsis className="text-xs">
                {o.data.person.department}
              </Typography.Text>
            </Flex>
          )}
        />
      </Form.Item>
    </FlowModal>
  )
}
