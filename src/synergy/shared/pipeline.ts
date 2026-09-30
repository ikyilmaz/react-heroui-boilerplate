import { useRef, useState } from 'react'
import { App } from 'antd'
import { decide, useViewedDocuments } from '@/synergy/shared/decisions'
import {
  DOCS_REQUIRED,
  documentsOf,
  findEvent,
  type EventKind,
  type FlowEvent,
  type Person,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'

/* -------------------------------------------------------------------------------------------------
 * Olay hattının mantığı (arayüzsüz): onay → görüntülenmesi gereken dokümanlar → sebep →
 * yönlendirme → `decide()`. Pencereleri `flow.tsx` çizer; açık aşama `open`'da.
 * ------------------------------------------------------------------------------------------------- */

const STAGES = ['confirm', 'docs', 'reason', 'forward'] as const

export interface PipelineStage {
  stage: 'confirm' | 'reason' | 'forward'
  request: WorkRequest
  event: FlowEvent
  resume: number
}

export type EventTone = 'success' | 'danger' | 'ink'

/** Olayın anlam tonu: onay yeşil, ret / geri gönderme kırmızı, diğerleri nötr. */
export const toneOf = (kind: EventKind | undefined): EventTone =>
  kind === 'approve' ? 'success' : kind === 'reject' || kind === 'sendBack' ? 'danger' : 'ink'

export interface PipelineOptions {
  /** Ayrıntı sayfasında: dokümanlar eksikse uyarı orada gösterilir (yoksa bildirim). */
  onDocsRequired?: () => void
  onDecided?: (event: FlowEvent, request: WorkRequest) => void
}

export function useDecisionPipeline(r: WorkRequest | undefined, opts: PipelineOptions = {}) {
  const [open, setOpen] = useState<PipelineStage | null>(null)
  // Bildirim antd `App` bağlamından (kabukta `AntTheme` sarar)
  const { notification } = App.useApp()
  const viewed = useViewedDocuments(r?.id)
  const reasonRef = useRef<string | undefined>(undefined)
  // Çift tıklamayla iki kez gönderilmesin (500 ms)
  const lastRun = useRef(0)

  const finish = (req: WorkRequest, event: FlowEvent, forwardTo?: Person) => {
    setOpen(null)
    decide(req.id, event.id, {
      ...(reasonRef.current && { reason: reasonRef.current }),
      ...(forwardTo && { forwardTo }),
    })
    reasonRef.current = undefined
    opts.onDecided?.(event, req)
  }

  const advance = (req: WorkRequest, event: FlowEvent, from: number) => {
    for (let i = from; i < STAGES.length; i++) {
      const stage = STAGES[i]
      if (stage === 'docs') {
        const inViewer = !!opts.onDocsRequired && req.id === r?.id
        if (documentsOf(req).some((d) => d.mustView && !(inViewer && viewed.has(d.id)))) {
          setOpen(null)
          if (opts.onDocsRequired) opts.onDocsRequired()
          else notification.warning({ title: FLOW_TEXT.warning, description: DOCS_REQUIRED })
          return
        }
      } else if (
        stage === 'confirm'
          ? event.confirm
          : stage === 'reason'
            ? event.reason
            : event.kind === 'forward'
      )
        return setOpen({ stage, request: req, event, resume: i + 1 })
    }
    finish(req, event)
  }

  const run = (eventId: number, target: WorkRequest | undefined = r) => {
    const event = target && findEvent(target, eventId)
    const now = Date.now()
    if (!target || !event?.enable || !event.visible || now - lastRun.current < 500) return
    lastRun.current = now
    reasonRef.current = undefined
    advance(target, event, 0)
  }

  const cancel = () => {
    reasonRef.current = undefined
    setOpen(null)
  }

  /** Açık aşamayı geçer (onay "Evet", sebep "Tamam"); sebep verildiyse saklanır. */
  const proceed = (reason?: string) => {
    if (!open) return
    if (reason) reasonRef.current = reason
    advance(open.request, open.event, open.resume)
  }

  /** Yönlendirme aşamasını seçilen kişiyle bitirir. */
  const forward = (p: Person) => open && finish(open.request, open.event, p)

  return { open, run, cancel, proceed, forward }
}
