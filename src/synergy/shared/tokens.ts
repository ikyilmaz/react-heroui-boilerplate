/* Ortak sınıflar: metin tonları ve çerçeveli kart. Renkler `src/themes/synergy.css`'te. */

/** Metin tonları; hepsi `--foreground`'dan türer. */
export const tone = {
  primary: 'text-foreground',
  secondary: 'text-foreground/65',
  muted: 'text-foreground/45',
}

/** Çerçeveli beyaz kart (gölge temada zaten kapalı: `--surface-shadow: none`). */
export const card = 'ring-(length:--border-width) ring-border'
