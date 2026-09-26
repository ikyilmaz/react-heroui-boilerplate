/* -------------------------------------------------------------------------------------------------
 * Ana sayfa ölçüleri: ızgara birimi, sabit satır yükseklikleri ve "kaç satır sığar" hesabı
 *
 * Liste widget'ları kaydırma çubuğu göstermez ve satır yarıda kesilmez: kayıtlı yüksekliğe (`h`)
 * kaç satır sığacağı DOM ölçülmeden, buradaki sabit piksel değerleriyle hesaplanır (`fitRows`).
 * Bu yüzden satırlar, başlıklar ve alt bilgi şeritleri tam bu yüksekliklerde çizilmeli (`hClass`
 * ya da `style={{ height }}`). Değerler bilerek px: yazı boyutu ve boşluk ölçeği tema panelinden
 * değişse de ızgara (react-grid-layout `rowHeight`) px çalışır.
 * ------------------------------------------------------------------------------------------------- */

export type Density = 'comfortable' | 'compact'

/** react-grid-layout ayarı; `margin` [yatay, dikey] px. */
export const densities: Record<Density, { rowHeight: number; margin: [number, number] }> = {
  comfortable: { rowHeight: 48, margin: [20, 20] },
  compact: { rowHeight: 36, margin: [12, 12] },
}

/** Tek sütun görünümünde widget'lar arası boşluk (px); ızgaranın dikey boşluğuyla aynı. */
export const stackGap: Record<Density, number> = { comfortable: 20, compact: 12 }

/** Izgarada 12 sütun. */
export const COLS = 12

/** Bu genişliğin altında ızgara yerine tek sütun (px). */
export const STACK_BELOW = 760

/** Tek sütun görünümünün en geniş hâli (46rem; kök yazı boyutu 16px varsayımıyla px). */
export const STACK_MAX_PX = 736

/** `h` ızgara birimindeki widget'ın piksel yüksekliği. */
export function H(h: number, d: Density) {
  const { rowHeight, margin } = densities[d]
  return h * rowHeight + Math.max(0, h - 1) * margin[1]
}

/** `w` sütunluk widget'ın piksel genişliği (react-grid-layout'un hesabıyla aynı; kenar dolgusu 0). */
export function W(w: number, containerWidth: number, d: Density) {
  const mx = densities[d].margin[0]
  const colWidth = (containerWidth - mx * (COLS - 1)) / COLS
  return Math.round(colWidth * w + Math.max(0, w - 1) * mx)
}

export interface PxMetrics {
  /** Widget başlığı (grip, ikon, h2, eylemler, "…"). */
  header: number
  /** Gövdenin alt dolgusu. */
  padB: number
  /** Gövde içindeki alt bilgi şeridi (ör. kuyruğun "Ertelediklerim" / Kbd satırı). */
  footer: number
  /** "Takip ettikleriniz" sekme satırı. */
  tabs: number
  /** Grup başlığı (h3). */
  heading: number
  /** Kuyruk satırı (aciliyet / süreç kipi). */
  queueRow: number
  /** Kuyruk satırı (sade kip, tek satır). */
  sadeRow: number
  /** Takip satırı ("Nerede?"). */
  followRow: number
  /** Takip satırı ("Adımlar"). */
  followStepsRow: number
  /** Bağlantı listesi satırı (taslaklar, bilginize). */
  linkRow: number
  /** "Son kararlarınız" satırı. */
  decidedRow: number
}

export const px: Record<Density, PxMetrics> = {
  comfortable: {
    header: 56,
    padB: 20,
    footer: 40,
    tabs: 48,
    heading: 36,
    queueRow: 64,
    sadeRow: 52,
    followRow: 76,
    followStepsRow: 96,
    linkRow: 56,
    decidedRow: 64,
  },
  compact: {
    header: 48,
    padB: 16,
    footer: 36,
    tabs: 40,
    heading: 30,
    queueRow: 52,
    sadeRow: 44,
    followRow: 64,
    followStepsRow: 84,
    linkRow: 48,
    decidedRow: 52,
  },
}

/**
 * `px` değerlerinin Tailwind karşılıkları (tam sınıf adları; Tailwind kaynakta birebir görmeli).
 * `h-16` gibi ölçek sınıfları tema panelindeki boşluk ayarıyla değiştiği için px sabitlenir.
 */
export const hClass: Record<Density, Record<keyof PxMetrics, string>> = {
  comfortable: {
    header: 'h-[56px]',
    padB: 'pb-[20px]',
    footer: 'h-[40px]',
    tabs: 'h-[48px]',
    heading: 'h-[36px]',
    queueRow: 'h-[64px]',
    sadeRow: 'h-[52px]',
    followRow: 'h-[76px]',
    followStepsRow: 'h-[96px]',
    linkRow: 'h-[56px]',
    decidedRow: 'h-[64px]',
  },
  compact: {
    header: 'h-[48px]',
    padB: 'pb-[16px]',
    footer: 'h-[36px]',
    tabs: 'h-[40px]',
    heading: 'h-[30px]',
    queueRow: 'h-[52px]',
    sadeRow: 'h-[44px]',
    followRow: 'h-[64px]',
    followStepsRow: 'h-[84px]',
    linkRow: 'h-[48px]',
    decidedRow: 'h-[52px]',
  },
}

/** Gövde yatay dolgusu (px; `px-5` / `px-4`) — iç genişlik hesabı için. */
export const padX: Record<Density, number> = { comfortable: 20, compact: 16 }

/** Widget gövdesinin (Card.Content) kullanılabilir yüksekliği: H(h) − başlık − alt dolgu. */
export function contentBudget(h: number, d: Density) {
  return H(h, d) - px[d].header - px[d].padB
}

/* ---- Satır sığdırma ---------------------------------------------------------------------------- */

/** Başlıklı ya da başlıksız bir satır grubu. */
export interface RowSection<T> {
  id: string
  /** Grubun adı; tablonun `aria-label`'ı. Başlık çizilmese de dolu olmalı. */
  label: string
  /** Başlığın yanındaki soluk açıklama (ör. "Bir haftadan uzun süredir bekliyor"). */
  hint?: string
  /** Görünür grup başlığı (h3) çiziliyor mu; `false` ise başlık yer kaplamaz (düz liste). */
  headed: boolean
  rows: T[]
}

/**
 * Grupları `budgetPx`'e sığacak kadar kırpar. Başlık ancak en az bir satırıyla birlikte sığıyorsa
 * çizilir; boş gruplar atlanır. `cap` toplam satır sınırı (tek sütun görünümündeki `stackCap`).
 * `budgetPx` `Infinity` olabilir (doğal yükseklik).
 */
export function fitRows<T>(
  sections: readonly RowSection<T>[],
  budgetPx: number,
  sizes: { row: number; heading: number },
  cap = Number.POSITIVE_INFINITY,
): RowSection<T>[] {
  const out: RowSection<T>[] = []
  let used = 0
  let count = 0
  for (const s of sections) {
    if (!s.rows.length) continue
    const head = s.headed ? sizes.heading : 0
    if (count >= cap || used + head + sizes.row > budgetPx) break
    used += head
    const rows: T[] = []
    for (const r of s.rows) {
      if (count >= cap || used + sizes.row > budgetPx) break
      rows.push(r)
      used += sizes.row
      count++
    }
    out.push({ ...s, rows })
  }
  return out
}

/** Gruplardaki satırlar tek dizide, çizim sırasıyla (klavye J/K gezinmesi için). */
export function flatRows<T>(sections: readonly RowSection<T>[]): T[] {
  return sections.flatMap((s) => s.rows)
}

/* ---- Başlat widget'ı karoları ------------------------------------------------------------------ */

/** Karo en küçük genişliği (min-w-44) ve karolar arası boşluk (gap-3), px. */
export const KARO_MIN = 176
export const KARO_GAP = 12

/** Bir satıra sığan sık kullanılan karo sayısı; bir yer "Tüm süreçler"e ayrılır. */
export function karoCapacity(innerWidthPx: number) {
  return Math.max(0, Math.floor((innerWidthPx + KARO_GAP) / (KARO_MIN + KARO_GAP)) - 1)
}
