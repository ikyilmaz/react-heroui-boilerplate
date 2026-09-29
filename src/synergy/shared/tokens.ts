/* Kabuk token'ları: Typography için ortak özellikler ve birkaç sınıf. Renkler `src/themes/synergy.css`'te. */

/** Typography'yi satır içi <span> basar; `slot: null` koleksiyonlardaki "slot" hatasını önler (tipte yok). */
export const inline = { elementType: 'span', slot: null } as unknown as Record<string, never>

/** Typography'yi `<time dateTime>` basar; tarih ISO anına, metin olduğu gibi yazılır. */
export const timeOf = (d: Date | string) =>
  ({ elementType: 'time', dateTime: typeof d === 'string' ? d : d.toISOString(), slot: null }) as unknown as Record<string, never>

/** Metin tonları; hepsi `--foreground`'dan türer. */
export const tone = {
  primary: 'text-foreground',
  secondary: 'text-foreground/65',
  muted: 'text-foreground/45',
}

/** Çerçeveli beyaz kart (gölge temada zaten kapalı: `--surface-shadow: none`). */
export const card = 'ring-(length:--border-width) ring-border'
