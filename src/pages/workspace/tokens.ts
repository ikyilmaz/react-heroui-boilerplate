/* -------------------------------------------------------------------------------------------------
 * Yumuşak kabuk token'ları (CLAUDE.md › Design language)
 *
 * Renklerin kendisi `index.css`'teki `.soft-theme`'de (HeroUI değişkenleri). Burada yalnızca
 * birkaç tekrar eden yerleşim sınıfı var. Bileşenlerden ayrı dosyada; aksi hâlde Vite'ın hızlı
 * yenilemesi `ui.tsx`'i tam yeniler.
 * ------------------------------------------------------------------------------------------------- */

export const ICON = { size: 18, strokeWidth: 1.5, 'aria-hidden': true } as const

/**
 * Typography varsayılan olarak <p> basar; satır içi kullanımda <span> gerekir. `slot: null`
 * koleksiyon bağlamlarındaki "A slot prop is required" hatasını önler. İkisi de runtime'da
 * uygulanıyor ama tipte yok (bkz. ShowcasePage).
 */
export const inline = { elementType: 'span', slot: null } as unknown as Record<string, never>

/**
 * Typography'yi `<time dateTime>` olarak basar (`inline` gibi: tipte yok, çalışma anında
 * uygulanıyor). Tarih nesnesi ISO anına, metin olduğu gibi (ör. yalnızca gün) yazılır. Ana
 * sayfadaki rakam denetimi göreli zamanları bu öğe sayesinde muaf tutar.
 */
export const timeOf = (d: Date | string) =>
  ({ elementType: 'time', dateTime: typeof d === 'string' ? d : d.toISOString(), slot: null }) as unknown as Record<string, never>

/** Metin tonları; hepsi temadaki `--foreground`'dan türer. */
export const tone = {
  primary: 'text-foreground',
  secondary: 'text-foreground/65',
  muted: 'text-foreground/45',
}

/** Yüzeylerin açık renkli iç kenarı. */
export const edge = 'ring-(length:--border-width) ring-(--soft-edge)'

/** Katman 1: büyük bölüm paneli (`Card variant="secondary"` üzerine). */
export const panel = `rounded-panel p-5 ${edge} backdrop-blur-xl`

/** Katman 2: panel içindeki kart (`Card variant="default"` üzerine). */
export const card = `rounded-card ${edge} shadow-none`

/** Katman 3: küçük beyaz karo — ikon yuvası, hap vb. (`Surface variant="tertiary"` üzerine). */
export const tile = 'ring-(length:--border-width) ring-(--border)'
