/* -------------------------------------------------------------------------------------------------
 * Sekme şeridinin saf kararları (TabStrip.tsx kullanır; DOM ve React yok, `scripts/tabs/` sınar).
 *
 * Genişlik dağılımı (Chrome modeli) CSS'te: sekmeler eşit paydan büyür (`flex: 1 1 0`), doğal
 * genişlikte durur (`max-width: max-content`), en az `ICON_MIN`; bunlar da sığmazsa şerit kayar.
 * Seçim genişliği değiştirmez (seçili sekme de aynı paydan, yazı kalınlaşmaz). Buradakiler: ikon
 * kipi eşiği, dar sekmede üst köşe, sürükleme eşiği ve yer değiştirme, kapatırken donma.
 * ------------------------------------------------------------------------------------------------- */

/** Sekmenin en az genişliği (rem): yalnızca ikon. */
export const ICON_MIN = 2.75
/**
 * Bundan dar sekme ikon kipinde (rem): ad ipucunda; seçili olmayanın kapatması gizli, seçili
 * sekmede ikonun yerinde kapatma (Chrome gibi).
 */
export const LABEL_MIN = 5

/** Sekme ikon kipinde mi (genişlik px, kök yazı boyu px). Seçimden bağımsız: genişlik aynı kalır. */
export function isCompact(width: number, remPx: number) {
  return width < LABEL_MIN * remPx
}

/**
 * Eşit pay (Chrome modeli): sekmeler sıfırdan eşit büyür, doğal genişliklerinde (`caps`) durur;
 * `room` sekmelere düşen yer. Doğal genişliğine ulaşmayanların payı (hepsi sığıyorsa sonsuz). Bir
 * sekmenin alacağı genişlik `min(doğal, pay)`; ikon kipindeki sekmenin kendi genişliği (adı gizli)
 * yer açılınca büyümediğinden ikon kipi buna göre seçilir.
 */
export function fairShare(caps: number[], room: number) {
  const sorted = [...caps].sort((a, b) => a - b)
  let left = room
  for (let i = 0; i < sorted.length; i++) {
    const share = left / (sorted.length - i)
    if (sorted[i]! >= share) return share
    left -= sorted[i]!
  }
  return Infinity
}

/** Dar sekmede üst köşe küçülür: üstün en az üçte biri düz kalır (`clamp((w − 2R) / 3, 0, R)`). */
export function topRadius(width: number, radius: number) {
  return Math.round(Math.min(radius, Math.max(0, (width - 2 * radius) / 3)))
}

/** Sürüklemenin başlama eşiği (px): Chrome gibi sekmenin genişliğiyle orantılı, en az 3px. */
export function dragThreshold(width: number) {
  return Math.max(3, (16 * width) / 256)
}

/** Kardeşin kutusu (satıra göre). */
export interface Span {
  x: number
  w: number
}

/**
 * Sürüklenen öğenin yeni sırası (yoksa -1): gittiği yöndeki ön kenarı komşunun ortasını geçince
 * bir adım (Motion `Reorder` gibi; bir olayda en çok bir yer değiştirme). `min`: bu sıranın önüne
 * geçilmez (grubun kök sekmesi).
 */
export function swapTarget(spans: Span[], index: number, offset: number, min = 0) {
  const me = spans[index]
  if (!me || !offset) return -1
  if (offset > 0) {
    const next = spans[index + 1]
    if (next && me.x + me.w + offset > next.x + next.w / 2) return index + 1
  } else {
    const prev = spans[index - 1]
    if (prev && index - 1 >= min && me.x + offset < prev.x + prev.w / 2) return index - 1
  }
  return -1
}

/* --- Kapatırken donma ------------------------------------------------------------------------- */

/**
 * Fareyle art arda kapatırken sekmeler genişlemez (Chrome): sekmeler daralmışken (doğal
 * genişliklerinin altında) kapatma düğmesine basılınca şeridin genişliği kilitlenir, kalan
 * sekmeler genişliklerini korur, sonraki sekmenin kapatma düğmesi imlecin altına gelir. Her
 * kapatma kilidi kapanan sekme kadar azaltır. Değer: satırın kilitli genişliği (px) ya da `null`.
 */
export type Freeze = number | null

export type FreezeEvent =
  /** Kapatma düğmesine basıldı. */
  | {
      type: 'close'
      pointer: string
      /** Satırın o anki genişliği ve kapanan sekmenin genişliği (px). */
      row: number
      tab: number
      /** Sekmeler daralmış mı (doğal genişliklerinin altında). */
      tight: boolean
      /** Kapanan sekme şeridin sonuncusu mu, şerit taşıyor mu. */
      last: boolean
      overflow: boolean
    }
  /** İmleç şeridi (payıyla) terk etti. */
  | { type: 'leave' }
  /** Dokunmayla kapatmadan 2 s sonra. */
  | { type: 'timeout' }
  /** Sekme eklendi ya da taşındı. */
  | { type: 'added' }
  | { type: 'moved' }
  /** Kalan sekmeler doğal genişliklerine sığdı. */
  | { type: 'fits' }

export function freeze(state: Freeze, e: FreezeEvent): Freeze {
  if (e.type !== 'close') return null
  // Klavyeyle kapatma (imleç yok) ve daralmamış şerit: kilit gerekmez; taşmayan şeridin son
  // sekmesi kapanınca da (Chrome)
  if (!e.pointer || !e.tight || (e.last && !e.overflow)) return null
  return Math.max(0, Math.round((state ?? e.row) - e.tab))
}

/** Dokunmayla kapatmada kilit bu süre sonra kalkar (ms); fareyle imleç ayrılınca. */
export const TOUCH_RELEASE_MS = 2000

/** Kilit, imleç şeridin dışına bu paylarla (px) çıkınca kalkar: altta ve sonda (yeni sekmenin yeri). */
export const LEAVE_SLOP = { bottom: 40, end: 60 } as const

/** İmleç şeridin (payıyla) içinde mi. */
export function insideStrip(
  rect: { left: number; top: number; right: number; bottom: number },
  x: number,
  y: number,
) {
  return (
    x >= rect.left &&
    x <= rect.right + LEAVE_SLOP.end &&
    y >= rect.top &&
    y <= rect.bottom + LEAVE_SLOP.bottom
  )
}
