import type { ReactNode, RefObject } from 'react'
import type { WorkRequest } from '@/pages/workflows/workflowData'
import type { SnoozeTarget } from '@/pages/workflows/triage'
import type { Density, PxMetrics } from '@/pages/workspace/home/metrics'
import type { WidgetDef, WidgetId } from '@/pages/workspace/home/registry'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfa bileşenlerinin ortak tipleri
 *
 * Pano (`HomeBoard`), çerçeve (`WidgetFrame`) ve widget gövdeleri arasındaki sözleşme. Gövde
 * kaç satır çizeceğini DOM ölçmeden, buradaki `budgetPx` / `cap` ve `metrics.ts › fitRows` ile
 * hesaplar; genişliğe bağlı katlamalar (ör. "Sonra / İncele / Atla" → "…") `innerWidthPx`'e bakar.
 * ------------------------------------------------------------------------------------------------- */

export interface WidgetBodyProps {
  id: WidgetId
  def: WidgetDef
  /** Geçerli kip (`resolveMode` ile doğrulanmış). */
  mode: string
  /** Kipe göre başlık (ör. "Seçili talep"). */
  title: string
  density: Density
  /** Tek sütun görünümü (seçili ya da 760px altı): doğal yükseklik, react-grid-layout yok. */
  stacked: boolean
  /** Düzenleme kipi: gövde `inert`, soluk; eylem yok. */
  editing: boolean
  /** Izgaradaki yükseklik (birim); tek sütunda `null`. */
  h: number | null
  /**
   * Card.Content'in kullanılabilir yüksekliği (px): `H(h) − header − padB`. Tek sütunda
   * `Infinity`. Gövde kendi sekme / alt bilgi şeridini buradan düşer, kalanı `fitRows`'a verir.
   */
  budgetPx: number
  /** En fazla satır: tek sütunda `def.stackCap` (yoksa `Infinity`), ızgarada `Infinity`. */
  cap: number
  /** Kartın dış genişliği (px), ızgara biriminden hesaplanır (DOM ölçülmez). */
  widthPx: number
  /** Gövdenin iç genişliği (px): `widthPx − 2 × padX`. Konteyner sorgusu yerine bu kullanılır. */
  innerWidthPx: number
  /** Yoğunluğa göre piksel ölçüler (`px[density]`). */
  m: PxMetrics
  /** Aynı ölçülerin Tailwind sınıfları (`hClass[density]`), ör. `hc.queueRow` → `h-[64px]`. */
  hc: Record<keyof PxMetrics, string>
}

/** `WidgetFrame` özellikleri: çerçeve başlığı, menüsü ve düzenleme kipi görünümü çizer. */
export interface WidgetFrameProps {
  id: WidgetId
  body: WidgetBodyProps
  /** Gövde (`widgetBodies[id]`). */
  children: ReactNode
}

/** Karar / erteleme nereden verildi; karardan sonra odağın nereye gideceğini belirler. */
export type DecideFrom = 'next' | 'queue' | 'peek' | 'decided'

/** `RejectPopover`: satırın X düğmesine ya da sıradaki iş kartındaki "Reddet"e bağlı ret notu. */
export interface RejectPopoverProps {
  r: WorkRequest
  from: DecideFrom
  /** Açan düğme (konum ve kapanınca odağın dönüşü için). */
  triggerRef: RefObject<Element | null>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

/** `SnoozeMenu`: "Yarın sabah / Pazartesi sabahı / Gelecek hafta" menüsü; tetikleyici `children`. */
export interface SnoozeMenuProps {
  r: WorkRequest
  from: DecideFrom
  /** Tetikleyici düğme (HeroUI `Button`). */
  children: ReactNode
  /** Klavyeden (H) açmak için denetimli kullanım. */
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Ertelemeden sonra (ör. önizlemede sıradakine geçmek için). */
  onSnoozed?: (target: SnoozeTarget) => void
}
