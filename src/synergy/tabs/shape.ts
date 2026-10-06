/* -------------------------------------------------------------------------------------------------
 * Sekme şeridinin biçimleri (Chrome'un sekme şeridi, Synergy derisi). Hepsi sabit sınıf metni
 * (Tailwind görsün); ölçüler şeridin satırındaki değişkenlerden:
 *   --tab-h   sekmenin boyu (FormTabs / ajanda `h-10`, Başlangıç kategorileri `h-16`)
 *   --tab-r   köşe ve kavis yarıçapı (`TAB_RADIUS`; yaprakta JS'in yuvarladığı px değeri)
 *   --sheet   seçili yaprağın dolgusu (kabın rengi ya da kartın yüzeyi)
 *   --ring / --ring-w   yaprağın çerçevesi (renkli grupta grubun rengi 2px, Başlangıç'ta kartın
 *             konturu; yoksa 0)
 *   --g       grubun rengi (`GROUP_TONE`)
 * ------------------------------------------------------------------------------------------------- */

/**
 * Sekmenin köşesi ve kavisi: temel yarıçapın 2 katı, en çok 16px (squircle'da tavan da
 * `--corner-scale` kadar büyür; `CARD_RADIUS`'un 32px tavanı gibi).
 */
export const TAB_RADIUS = 'min(calc(var(--radius) * 2), calc(16px * var(--corner-scale, 1)))'

/** Satırın değişkenleri: yarıçap (yaprak px değerini kendisi yazar) ve sekmenin boyu (`h-10`). */
export const STRIP_VARS =
  '[--tab-r:min(calc(var(--radius)*2),calc(16px*var(--corner-scale,1)))] [--tab-h:2.5rem]'

/** Kabın (ve seçili yaprağın) rengi: birincil rengin zemine karışmış çok açık tonu. */
export const TAB_BG = '[--tab-bg:color-mix(in_oklab,var(--accent)_9%,var(--background))]'

/** Yaprak kabın renginde (FormTabs, ajanda), çerçevesiz. */
export const SHEET = '[--sheet:var(--tab-bg)] [--ring-w:0px]'
/** Renkli grupta yaprak grubun renginde 2px çerçeveli (alt çizgiyle aynı kalınlık). */
export const SHEET_RING = '[--sheet:var(--tab-bg)] [--ring:var(--g)] [--ring-w:2px]'
/** Kartın üstündeki yaprak (Başlangıç): yüzey renginde, kartın konturuyla. */
export const SHEET_ON_SURFACE =
  '[--sheet:var(--surface)] [--ring:var(--border)] [--ring-w:var(--border-width)]'

/*
 * Yaprak üç parça (yalnızca dönüşümle kayar, ölçeklenen parça köşe taşımaz): başlangıç kapağı,
 * orta ve bitiş kapağı. Kapak `--tab-r` genişliğinde, üst köşesi yuvarlak (genel köşe biçimi:
 * squircle temada squircle), yanında ve üstünde çerçeve; altında kapağın genişliğinde dolgu
 * (`after:`) ve dışa doğru içbükey kavis (`before:`). Orta 100px genişliğinde, `scaleX` ile uzar;
 * yalnızca üst çerçeve taşır (yatay ölçek kalınlığı bozmaz). Kapakların yüksekliği kavisin
 * başladığı yere kadar: çerçeve kavisin içinden kesintisiz iner, hiçbir yerde üst üste binmez
 * (yarı saydam kontur iki kez çizilip koyulaşmasın). Dolgu çerçevenin altına girmez
 * (`bg-clip-padding`): kontur, kartın halkası gibi zeminin üstünde durur.
 *
 * Kavis (`before:`): `--tab-r` karelik kutu, köşesinde yarıçapı (`--tab-r` − `--ring-w`) olan
 * saydam çeyrek daire, onun çevresinde çerçeve bandı, dışı yaprağın rengi.
 * - `corner-shape` destekleyen tarayıcı (Chrome / Edge 139+): kutunun köşesi içbükey
 *   (`scoop`; squircle temada içbükey squircle, `--corner-concave`); band gerçek kenarlık
 *   (kenarlık kavsi sabit uzaklıkla izler), dolgu `bg-clip-padding`.
 * - Diğerleri (Safari, Firefox): kutu kavsin merkezinden içeri doğru büyür, kavsin olduğu köşesi
 *   dışbükey yuvarlak; band bu köşenin kenarlığı, kutunun içi saydam, dışını gölge (`spread`,
 *   kaydırmasız) yaprağın rengine boyar, `clip-path` kavis karesine keser. Tarayıcının kendi
 *   kenar yumuşatması, tam kenarlık kalınlığı; radial-gradient bantları yok.
 */
const CAP =
  "absolute top-0 start-0 block h-[calc(var(--tab-h)-var(--tab-r))] w-(--tab-r) border-t-(length:--ring-w) border-(--ring) bg-(--sheet) bg-clip-padding after:absolute after:inset-x-0 after:top-full after:block after:h-(--tab-r) after:bg-(--sheet) after:content-[''] before:pointer-events-none before:absolute before:-bottom-(--tab-r) before:block before:size-[calc(var(--tab-r)*2-var(--ring-w))] before:border-b-(length:--ring-w) before:border-(--ring) before:shadow-[0_0_0_var(--tab-r)_var(--sheet)] before:content-[''] supports-[corner-shape:scoop]:before:size-(--tab-r) supports-[corner-shape:scoop]:before:border-b-0 supports-[corner-shape:scoop]:before:border-t-(length:--ring-w) supports-[corner-shape:scoop]:before:bg-(--sheet) supports-[corner-shape:scoop]:before:bg-clip-padding supports-[corner-shape:scoop]:before:shadow-none supports-[corner-shape:scoop]:before:[clip-path:none] supports-[corner-shape:scoop]:before:[corner-shape:var(--corner-concave,scoop)]"

/** Başlangıç kapağı (sol): sol ve üst çerçeve, sol üst köşe; kavis solda. */
export const CAP_START = `${CAP} rounded-tl-(--tab-rt) border-s-(length:--ring-w) before:end-full before:rounded-br-(--tab-r) before:border-e-(length:--ring-w) before:[clip-path:inset(calc(var(--tab-r)-var(--ring-w))_0_0_calc(var(--tab-r)-var(--ring-w)))] supports-[corner-shape:scoop]:before:rounded-br-none supports-[corner-shape:scoop]:before:border-e-0 supports-[corner-shape:scoop]:before:rounded-tl-[calc(var(--tab-r)-var(--ring-w))] supports-[corner-shape:scoop]:before:border-s-(length:--ring-w)`

/** Bitiş kapağı (sağ): sağ ve üst çerçeve, sağ üst köşe; kavis sağda. Konumu sağ kenar (`-translate-x-full`). */
export const CAP_END = `${CAP} -translate-x-full rounded-tr-(--tab-rt) border-e-(length:--ring-w) before:start-full before:rounded-bl-(--tab-r) before:border-s-(length:--ring-w) before:[clip-path:inset(calc(var(--tab-r)-var(--ring-w))_calc(var(--tab-r)-var(--ring-w))_0_0)] supports-[corner-shape:scoop]:before:rounded-bl-none supports-[corner-shape:scoop]:before:border-s-0 supports-[corner-shape:scoop]:before:rounded-tr-[calc(var(--tab-r)-var(--ring-w))] supports-[corner-shape:scoop]:before:border-e-(length:--ring-w)`

/** Orta parça: 100px, `scaleX` ile uzar (sol kenarından); üst çerçeve. */
export const SHEET_MIDDLE =
  'absolute top-0 start-0 block h-(--tab-h) w-[100px] origin-left border-t-(length:--ring-w) border-(--ring) bg-(--sheet) bg-clip-padding'

/**
 * Üzerine gelince (ve klavye odağında) sekmenin hap biçimli zemini; seçili sekmede yok. Renkli
 * grupta grubun açık tonu.
 */
export const PILL =
  'pointer-events-none absolute inset-x-0.5 inset-y-1 z-0 block rounded-(--tab-r) bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] opacity-0 transition-opacity duration-[calc(150ms*var(--motion-time,1))] group-hover/tab:opacity-100 group-has-[:focus-visible]/tab:opacity-100 group-data-[selected]/tab:hidden'
/** Renkli grupta hap grubun renginde. */
export const PILL_TONED = 'bg-[color-mix(in_oklab,var(--g)_14%,transparent)]'

/**
 * Sekmeler arasındaki ince çizgi (sekmenin sonunda, 1×16px): bu ya da sonraki sekme seçili,
 * üzerine gelinmiş ya da odakta ise (hapla birlikte) söner; grubun son sekmesinde yok.
 */
export const SEPARATOR =
  "after:pointer-events-none after:absolute after:end-0 after:top-1/2 after:z-0 after:block after:h-4 after:w-px after:translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-[color-mix(in_oklab,var(--foreground)_20%,transparent)] after:content-[''] after:transition-opacity after:duration-[calc(150ms*var(--motion-time,1))] last:after:opacity-0 data-[selected]:after:opacity-0 hover:after:opacity-0 has-[:focus-visible]:after:opacity-0 has-[+[data-tab][data-selected]]:after:opacity-0 has-[+[data-tab]:hover]:after:opacity-0 has-[+[data-tab]_:focus-visible]:after:opacity-0"

/** Grubun rengi `--g` (tema dosyası `--group-1` … `--group-6`). */
export const GROUP_TONE = [
  '[--g:var(--group-1)]',
  '[--g:var(--group-2)]',
  '[--g:var(--group-3)]',
  '[--g:var(--group-4)]',
  '[--g:var(--group-5)]',
  '[--g:var(--group-6)]',
] as const

/**
 * Grubun alt çizgisi (Chrome gibi): grubun sekmelerinin gövdesinin altında 2px; seçili sekmede
 * yaprak örter, çizgi yaprağın çerçevesiyle sekmenin çevresinden dolaşır.
 */
export const GROUP_LINE =
  'pointer-events-none absolute inset-x-0 bottom-0 z-0 block h-[2px] rounded-full bg-(--g)'

/** Grubun noktası: grubun başında (seçili sekmenin kavsinin üstünde de görünür). */
export const GROUP_DOT = 'relative z-2 block size-2 shrink-0 self-center rounded-full bg-(--g)'
