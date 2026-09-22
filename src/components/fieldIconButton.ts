import { buttonVariants, cn } from '@heroui/react'

/**
 * İkon düğmelerinin TEK rengi. Arayüzdeki bütün yardımcı ikonlar (temizle, chevron, takvim,
 * − / +, satır içi düzenle/sil, filtreleri temizle) bu tonda görünür; üstüne gelince renk
 * oynamaz, geri bildirim yuvarlak zeminden gelir.
 *
 * `hover:` gerekiyor çünkü HeroUI bazı yuvalarda (`.combo-box__trigger`,
 * `.search-field__clear-button`) hover'da rengi koyulaştırıyor. Anlamlı bir renk gereken tek
 * yer silme düğmesi: tehlike rengini yalnızca hover'da alır.
 *
 * Bunun dışında kalanlara karışılmaz: `Checkbox` ve `ListBox` göstergeleri HeroUI'nin kendi
 * mantığıyla (seçili/belirsiz) renklenir, varyantlı butonlar (`primary`, `secondary`) rengini
 * varyanttan alır, sayfa kroması (navbar, slayt okları, sayfalama) HeroUI varsayılanındadır.
 */
export const ICON_MUTED = 'text-muted hover:text-muted'

/**
 * Alan içi ikon düğmelerinin TEK görünümü: temizle (×), chevron, takvim, saat, − / + ve
 * DataGrid'in filtre işlemi seçicisi hep aynı görünür.
 *
 * - **Ölçü**: 24x24 kutu, tam yuvarlak. Alanlar 32–36px yüksekliğinde; varsayılan 32px'lik ikon
 *   düğmesi kenarlara yapışıyor.
 * - **Renk**: her zaman `text-muted`. `hover:text-muted` gerekiyor çünkü HeroUI bazı yuvalarda
 *   (`.combo-box__trigger`, `.search-field__clear-button`) üstüne gelince rengi koyulaştırıyor —
 *   hover geri bildirimi yuvarlak zeminden gelsin, renk oynamasın.
 * - **Zemin**: HeroUI'nin `ghost` buton varyantından (`--button-bg-hover: var(--default)`);
 *   ayrıca stil yazılmaz.
 *
 * Gerçek bir `Button` konulabilen yerde `<Button variant="ghost" size="sm" isIconOnly>` +
 * `FIELD_ICON_BUTTON` kullanılır. Öğenin bileşeni sabit olan yerlerde (RAC tetikleyicileri,
 * `Select.Indicator`, düz ikon kutusu) varyant sınıflarını da içeren `fieldIconButton` verilir.
 */
export const FIELD_ICON_BUTTON = cn('size-6 min-w-6 rounded-full', ICON_MUTED)

/** `FIELD_ICON_BUTTON`, `ghost` ikon-buton varyantının sınıflarıyla birlikte. */
export const fieldIconButton = cn(
  buttonVariants({ variant: 'ghost', size: 'sm', isIconOnly: true }),
  FIELD_ICON_BUTTON,
)

/**
 * Önek/sonek kabı: kenardan 4px, düğmeler arasından 4px. Bütün alanlarda aynı olsun diye
 * buradan veriliyor.
 */
export const FIELD_AFFIX = 'flex items-center gap-1 px-1'

/**
 * Alan içi ikon boyutu. HeroUI `.button--sm svg`'yi zaten 16px'e sabitliyor; kaynakta da aynı
 * değeri yazıyoruz ki okurken tutarsız görünmesin.
 */
export const FIELD_ICON_SIZE = 16
