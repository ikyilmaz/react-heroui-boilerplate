import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { App, ConfigProvider, theme as antTheme, type ThemeConfig } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import trTR from 'antd/locale/tr_TR'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import { useIsDark, useLook } from '@/synergy/shared/themeSettings'

dayjs.locale('tr')

/* -------------------------------------------------------------------------------------------------
 * antd teması: düz (flat) tasarım dili
 *
 * antd bileşenleri kabuğun tema değişkenlerinden (`--accent`, `--surface`, `--radius`, yazı tipi…)
 * beslenir: <html>'in sınıfı / satır içi stili her değişince (tema paneli, açık / koyu) değişkenler
 * çözülüp antd tokenlarına çevrilir. Böylece tema paneli antd sayfalarını da yönetir, ikinci bir
 * tema kaynağı yok.
 *
 * Düz dil: açılır katmanlarda gölge yok (yalnızca ince bir çizgi), dalga efekti yok, odak halkası
 * yerine çerçeve rengi. Form alanları ve çerçeveli düğmeler kartlar gibi tema paneli › kart stili /
 * gölge / kontura uyar (`--field-*`): konturlu temada çerçeveli, konturu yoksa dolgulu alanlar.
 *
 * Sıfır çalışma zamanı: bileşen stilleri antd'nin hazır CSS'i (`antd/dist/antd.css`, `src/index.css`
 * içinde `@layer antd`'ye alınır); antd çalışma zamanında yalnızca tema değişkenlerini (`--ant-*`,
 * genel ve bileşen tokenları, `.synergy` kapsamında) yazar. Hazır kurallar renkleri, ölçüleri ve
 * süreleri hep bu değişkenlerden okur, bu yüzden tema paneli ve açık / koyu sayfayı yenilemeden
 * antd'ye de ulaşır. Katman sırası: base < antd < components < utilities; Tailwind sınıfları antd'nin
 * varsayılanlarını her zaman ezer.
 * ------------------------------------------------------------------------------------------------- */

export interface Resolved {
  accent: string
  link: string
  success: string
  warning: string
  danger: string
  foreground: string
  muted: string
  background: string
  surface: string
  secondary: string
  tertiary: string
  overlay: string
  border: string
  fieldBorder: string
  /** Form alanının dolgusu ve üzerine gelince dolgusu (kart stili). */
  fieldFill: string
  fieldHover: string
  /** Form alanının çerçeve kalınlığı (px; kart konturu, 0: çerçevesiz dolgulu alan). */
  fieldBorderWidth: number
  /** Form alanının gölgesi (`box-shadow` metni ya da `none`). */
  fieldShadow: string
  radius: number
  /** Yarıçap tavanlarının çarpanı (`--corner-scale`; squircle'da büyür, yoksa 1). */
  cornerScale: number
  font: string
  display: string
  rootPx: number
}

/* --- Renk çözümleme: CSS değişkeni → sRGB ----------------------------------------------------- */

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055)

/** OKLab → sRGB (0–1). */
function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}

/** Tarayıcının hesapladığı renk metni (`oklch(…)`, `oklab(…)`, `rgb(…)`, `color(srgb …)`) → `rgba(…)`. */
function toRgba(css: string): string {
  const nums = (css.match(/-?[\d.]+(?:e-?\d+)?%?/g) ?? []).map((n) =>
    n.endsWith('%') ? Number(n.slice(0, -1)) / 100 : Number(n),
  )
  let rgb: [number, number, number]
  let alpha = 1
  if (css.startsWith('oklch')) {
    const [L = 0, C = 0, H = 0, A] = nums
    const h = (H * Math.PI) / 180
    rgb = oklabToRgb(L, C * Math.cos(h), C * Math.sin(h))
    alpha = A ?? 1
  } else if (css.startsWith('oklab')) {
    const [L = 0, a = 0, b = 0, A] = nums
    rgb = oklabToRgb(L, a, b)
    alpha = A ?? 1
  } else if (css.startsWith('color(srgb')) {
    const [r = 0, g = 0, b = 0, A] = nums
    rgb = [r, g, b]
    alpha = A ?? 1
  } else {
    const [r = 0, g = 0, b = 0, A] = nums
    rgb = [r / 255, g / 255, b / 255]
    alpha = A ?? 1
  }
  const [r, g, b] = rgb.map((x) => Math.round(clamp01(x) * 255))
  return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+alpha.toFixed(3)})`
}

/**
 * Kabuğun tema değişkenlerini çözer (görünmez bir yoklama öğesiyle; `var()` zincirleri de çözülür).
 * `host`: değişkenlerin tanımlı olduğu öğe (varsayılan sayfa; tasarım paketinde tema kökü).
 */
export function resolve(host: HTMLElement = document.body): Resolved {
  const probe = document.createElement('i')
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none'
  host.appendChild(probe)
  const color = (v: string) => {
    probe.style.color = `var(${v})`
    return toRgba(getComputedStyle(probe).color)
  }
  probe.style.borderRadius = 'var(--radius)'
  const radius = parseFloat(getComputedStyle(probe).borderTopLeftRadius) || 8
  // Çarpan sayı: 100px'lik genişlikle okunur
  probe.style.width = 'calc(var(--corner-scale, 1) * 100px)'
  const cornerScale = parseFloat(getComputedStyle(probe).width) / 100 || 1
  probe.style.fontFamily = 'var(--font-sans)'
  const font = getComputedStyle(probe).fontFamily
  probe.style.fontFamily = 'var(--font-display)'
  const display = getComputedStyle(probe).fontFamily
  // Kalınlık iç boşlukla okunur (kenarlık genişliği aygıt pikseline yuvarlanır); tanımsızsa 0
  probe.style.paddingLeft = 'var(--field-border-width, 0px)'
  const fieldBorderWidth = parseFloat(getComputedStyle(probe).paddingLeft) || 0
  probe.style.boxShadow = 'var(--field-shadow, none)'
  const fieldShadow = getComputedStyle(probe).boxShadow
  const out: Resolved = {
    accent: color('--accent'),
    link: color('--link'),
    success: color('--success'),
    warning: color('--warning'),
    danger: color('--danger'),
    foreground: color('--foreground'),
    muted: color('--muted'),
    background: color('--background'),
    surface: color('--surface'),
    secondary: color('--surface-secondary'),
    tertiary: color('--surface-tertiary'),
    overlay: color('--overlay'),
    border: color('--border'),
    fieldBorder: color('--field-border'),
    fieldFill: color('--field-fill, var(--surface-secondary)'),
    fieldHover: color('--field-hover, var(--surface-tertiary)'),
    fieldBorderWidth,
    fieldShadow,
    radius,
    cornerScale,
    font,
    display,
    rootPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16,
  }
  probe.remove()
  return out
}

/** Tema değişkenleri: <html>'in sınıfı ya da satır içi stili değişince yeniden çözülür. */
function useResolved() {
  const [vars, setVars] = useState<Resolved | null>(null)
  useEffect(() => {
    const update = () =>
      setVars((prev) => {
        const next = resolve()
        return prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      })
    update()
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    })
    return () => mo.disconnect()
  }, [])
  return vars
}

/* --- Tokenlar ---------------------------------------------------------------------------------- */

export function tokensOf(v: Resolved, dark: boolean, motion: boolean, speed: number): ThemeConfig {
  const px = v.rootPx
  const r = v.radius
  // Yarıçap tavanı (px); squircle'da yarıçapla birlikte büyür (köşe yuvarlak kadar dolgun kalsın)
  const cap = (n: number) => Math.round(n * v.cornerScale)
  // Alanlar ve düğmeler: temel yarıçapın 1.5 katı, en çok 14px (yuvarlak temada alanlar hap olmasın)
  const control = Math.min(cap(14), Math.round(r * 1.5))
  // Açılır katmanlar gölge yerine ince bir çizgiyle ayrılır
  const ring = `0 0 0 1px ${v.border}`
  // Form alanları kartın stiline uyar (tema paneli › kart stili / gölge / kontur): konturlu temada
  // çerçeveli (`outlined`, kalınlık kontur), konturu yoksa dolgulu (çerçeve odakta görünür)
  const bw = v.fieldBorderWidth
  const field = fieldTokens(v)

  const dur = (s: number) => `${+(s / speed).toFixed(3)}s`
  return {
    algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    cssVar: { key: 'synergy' },
    // Sayfada tek antd ve tek tema: sınıf karması (`css-…`) gerekmez, seçiciler kısa kalır (hazır
    // CSS'in seçicileri de karmasız)
    hashed: false,
    token: {
      colorPrimary: v.accent,
      colorInfo: v.accent,
      colorLink: v.link,
      colorSuccess: v.success,
      colorWarning: v.warning,
      colorError: v.danger,
      colorTextBase: v.foreground,
      colorBgBase: v.surface,
      colorText: v.foreground,
      colorTextSecondary: v.muted,
      colorTextDescription: v.muted,
      colorBgLayout: v.background,
      colorBgContainer: v.surface,
      colorBgElevated: v.overlay,
      colorFillTertiary: v.secondary,
      colorFillSecondary: v.tertiary,
      colorBorder: v.fieldBorder,
      colorBorderSecondary: v.border,
      colorSplit: v.border,
      fontFamily: v.font,
      // Eşaralıklı yazı tipi yok: kod / sayı metinleri de seçili yazı tipinde
      fontFamilyCode: v.font,
      fontSize: Math.round(px * 0.875),
      controlHeight: Math.round(px * 2.25),
      controlHeightLG: Math.round(px * 2.75),
      controlHeightSM: Math.round(px * 1.75),
      borderRadius: control,
      borderRadiusLG: Math.min(cap(20), Math.round(r * 2)),
      borderRadiusSM: Math.min(cap(10), Math.round(r)),
      borderRadiusXS: Math.max(2, Math.round(r / 2)),
      lineWidth: 1,
      // Düz: gölge yok
      boxShadow: ring,
      boxShadowSecondary: ring,
      boxShadowTertiary: 'none',
      controlOutlineWidth: 0,
      wireframe: false,
      motion,
      motionDurationFast: dur(0.1),
      motionDurationMid: dur(0.2),
      motionDurationSlow: dur(0.3),
    },
    components: {
      Button: {
        primaryShadow: 'none',
        dangerShadow: 'none',
        fontWeight: 500,
        paddingInline: Math.round(px),
        // Varsayılan (çerçeveli) düğme de alanlar gibi: gölge, çerçeve rengi; kalınlığı `BUTTON`
        defaultShadow: v.fieldShadow,
        defaultBorderColor: bw > 0 ? v.fieldBorder : 'transparent',
      },
      Card: {
        // Kabuğun kart köşesiyle aynı (en çok 32px; squircle'da büyür)
        borderRadiusLG: Math.min(cap(32), Math.round(r * 3)),
        bodyPadding: Math.round(px * 1.5),
        colorBorderSecondary: 'transparent',
      },
      Input: {
        activeShadow: 'none',
        errorActiveShadow: 'none',
        warningActiveShadow: 'none',
        ...field,
      },
      InputNumber: {
        activeShadow: 'none',
        errorActiveShadow: 'none',
        warningActiveShadow: 'none',
        ...field,
      },
      Select: {
        activeOutlineColor: 'transparent',
        optionSelectedBg: v.tertiary,
        ...field,
        ...(bw > 0 && { selectorBg: v.fieldFill }),
      },
      DatePicker: { activeShadow: 'none', errorActiveShadow: 'none', ...field },
      Cascader: field,
      TreeSelect: field,
      Mentions: field,
      Form: { labelColor: v.muted, verticalLabelPadding: '0 0 6px', itemMarginBottom: 0 },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: v.accent,
        itemSelectedColor: dark ? v.foreground : '#fff',
        itemHoverBg: v.secondary,
        itemBorderRadius: control,
        itemMarginInline: 0,
        itemMarginBlock: 2,
        groupTitleColor: v.muted,
        activeBarBorderWidth: 0,
      },
      Tabs: { itemColor: v.muted, horizontalMargin: '0', cardBg: v.tertiary },
      Table: {
        headerBg: v.secondary,
        headerColor: v.muted,
        headerSplitColor: 'transparent',
        rowHoverBg: v.secondary,
        borderColor: v.border,
        headerBorderRadius: control,
      },
      Tag: { defaultBg: v.tertiary, defaultColor: v.foreground },
      Modal: { contentBg: v.overlay, headerBg: v.overlay, footerBg: v.overlay },
      Popover: { colorBgElevated: v.overlay },
      Dropdown: { colorBgElevated: v.overlay },
      Timeline: { tailColor: v.tertiary, dotBg: v.surface },
      Alert: { withDescriptionPadding: `${Math.round(px * 0.75)}px ${Math.round(px)}px` },
      Divider: { colorSplit: v.border },
    },
  }
}

/**
 * Form alanlarının tokenları. Çerçeveli: dolgu kabın zemini (`colorBgContainer`), çerçeve kontur
 * kalınlığında, odakta birincil renk ve kart yüzeyi. Dolgulu: dolgu ve üzerine gelince dolgu
 * (`colorFill*`), çerçeve saydam (odakta birincil renk).
 */
function fieldTokens(v: Resolved) {
  return v.fieldBorderWidth > 0
    ? {
        colorBgContainer: v.fieldFill,
        hoverBg: v.fieldHover,
        activeBg: v.surface,
        colorBorder: v.fieldBorder,
        hoverBorderColor: v.fieldBorder,
        lineWidth: v.fieldBorderWidth,
      }
    : { colorFillTertiary: v.fieldFill, colorFillSecondary: v.fieldHover }
}

/**
 * Form alanlarının gölgesi (`--field-shadow`); çerçevesiz (`borderless`) alanlarda yok. Sınıf
 * seçicisiyle dışlanır (`[class*=…]` bu sınıfın kendi adına da uyardı).
 */
const FIELD = {
  className:
    '[&:not(.ant-input-borderless,.ant-input-number-borderless,.ant-select-borderless,.ant-picker-borderless,.ant-mentions-borderless)]:shadow-(--field-shadow)',
}

/**
 * Çerçeveli düğmenin çerçevesi kontur kalınlığında (yalnızca o; `lineWidth` tokenı metin ve ikon
 * düğmelerinin saydam çerçevesini de kalınlaştırırdı).
 */
const BUTTON = { className: '[&.ant-btn-variant-outlined]:border-(length:--field-border-width)' }

/** Dalga yok, kartlar çerçevesiz (sabit nesneler: ConfigProvider bağlamı her çizimde değişmesin). */
const WAVE = { disabled: true }
const CARD_CONFIG = { variant: 'borderless' } as const
/** Gezinme alttayken bildirimler çubuğun üstünden başlar (çubuk alttan 12 + 44px; içerik 68px'te biter). */
const ABOVE_BAR = { bottom: 68 }
/**
 * Tema değişkenleri çözülmeden önceki ilk karenin yapılandırması. `zeroRuntime` ilk çizimden beri
 * açık olmalı: antd onu her bileşende ilk çizimde okuyup sabitler (sonradan açılırsa o bileşenler
 * stillerini yine çalışma zamanında üretir).
 */
const FIRST: ThemeConfig = { zeroRuntime: true, cssVar: { key: 'synergy' }, hashed: false }

/**
 * Kabukta: antd bileşenlerine tema, Türkçe yerelleştirme ve düz varsayılanlar (alanlar kart
 * stiline göre dolgulu ya da çerçeveli, dalga yok). Tema değişkenleri çözülmeden (ilk kare) antd'nin kendi varsayılanlarıyla çizmek
 * yerine çocuklar yine çizilir; bir sonraki karede tokenlar oturur.
 */
export function AntTheme({ children }: { children: ReactNode }) {
  const vars = useResolved()
  const dark = useIsDark()
  const { motion, speed, nav } = useLook()
  const animated = motion !== 'off'
  // Yapılandırma yalnızca girdileri değişince yenilenir: ConfigProvider'a her çizimde yeni nesne
  // gelirse bütün antd bileşenleri (gizli form sekmelerindekiler dahil) yeniden çizilir
  const config = useMemo(
    () => (vars ? { ...tokensOf(vars, dark, animated, speed), zeroRuntime: true } : FIRST),
    [vars, dark, animated, speed],
  )
  return (
    <StyleProvider layer>
      <ConfigProvider
        locale={trTR}
        theme={config}
        variant={vars && vars.fieldBorderWidth > 0 ? 'outlined' : 'filled'}
        wave={WAVE}
        card={CARD_CONFIG}
        input={FIELD}
        textArea={FIELD}
        inputNumber={FIELD}
        select={FIELD}
        datePicker={FIELD}
        rangePicker={FIELD}
        timePicker={FIELD}
        cascader={FIELD}
        treeSelect={FIELD}
        mentions={FIELD}
        button={BUTTON}
      >
        <App component={false} notification={nav === 'bottom' ? ABOVE_BAR : undefined}>
          {children}
        </App>
      </ConfigProvider>
    </StyleProvider>
  )
}
