import { useEffect, useState, type ReactNode } from 'react'
import { App, ConfigProvider, theme as antTheme, type ThemeConfig } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import trTR from 'antd/locale/tr_TR'
import dayjs from 'dayjs'
import 'dayjs/locale/tr'
import { useIsDark, useLook, useSettingsControl } from '@/synergy/shared/themeSettings'

dayjs.locale('tr')

/* -------------------------------------------------------------------------------------------------
 * antd teması: düz (flat) tasarım dili
 *
 * antd bileşenleri kabuğun tema değişkenlerinden (`--accent`, `--surface`, `--radius`, yazı tipi…)
 * beslenir: <html>'in sınıfı / satır içi stili her değişince (tema paneli, açık / koyu) değişkenler
 * çözülüp antd tokenlarına çevrilir. Böylece tema paneli antd sayfalarını da yönetir, ikinci bir
 * tema kaynağı yok.
 *
 * Düz dil: gölge yok (açılır katmanlar yalnızca ince bir çizgiyle ayrılır), dalga efekti yok,
 * alanlar dolgulu (`filled`), kartlar çerçevesiz ve yüzey renginde, odak halkası yerine çerçeve rengi.
 *
 * Stiller `@layer antd` içine basılır (`src/index.css` katman sırası: base < antd < components <
 * utilities); Tailwind sınıfları antd'nin varsayılanlarını her zaman ezer.
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
  radius: number
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
  probe.style.fontFamily = 'var(--font-sans)'
  const font = getComputedStyle(probe).fontFamily
  probe.style.fontFamily = 'var(--font-display)'
  const display = getComputedStyle(probe).fontFamily
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
    radius,
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

export function tokensOf(
  v: Resolved,
  dark: boolean,
  motion: boolean,
  speed: number,
  square: boolean,
): ThemeConfig {
  const px = v.rootPx
  const r = v.radius
  // Alanlar ve düğmeler: temel yarıçapın 1.5 katı, en çok 14px (yuvarlak temada alanlar hap olmasın)
  const control = square ? Math.min(4, r) : Math.min(14, Math.round(r * 1.5))
  // Açılır katmanlar gölge yerine ince bir çizgiyle ayrılır
  const ring = `0 0 0 1px ${v.border}`
  const dur = (s: number) => `${+(s / speed).toFixed(3)}s`
  return {
    algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    cssVar: { key: 'synergy' },
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
      fontSize: Math.round(px * 0.875),
      controlHeight: Math.round(px * 2.25),
      controlHeightLG: Math.round(px * 2.75),
      controlHeightSM: Math.round(px * 1.75),
      borderRadius: control,
      borderRadiusLG: Math.min(20, Math.round(r * 2)),
      borderRadiusSM: Math.min(10, Math.round(r)),
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
        defaultShadow: 'none',
        dangerShadow: 'none',
        fontWeight: 500,
        paddingInline: Math.round(px),
      },
      Card: {
        // Kabuğun kart köşesiyle aynı (en çok 32px)
        borderRadiusLG: Math.min(32, Math.round(r * 3)),
        bodyPadding: Math.round(px * 1.5),
        colorBorderSecondary: 'transparent',
      },
      Input: { activeShadow: 'none', errorActiveShadow: 'none', warningActiveShadow: 'none' },
      InputNumber: { activeShadow: 'none', errorActiveShadow: 'none', warningActiveShadow: 'none' },
      Select: { activeOutlineColor: 'transparent', optionSelectedBg: v.tertiary },
      DatePicker: { activeShadow: 'none', errorActiveShadow: 'none' },
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
 * Kabukta: antd bileşenlerine tema, Türkçe yerelleştirme ve düz varsayılanlar (dolgulu alanlar,
 * dalga yok). Tema değişkenleri çözülmeden (ilk kare) antd'nin kendi varsayılanlarıyla çizmek
 * yerine çocuklar yine çizilir; bir sonraki karede tokenlar oturur.
 */
export function AntTheme({ children }: { children: ReactNode }) {
  const vars = useResolved()
  const dark = useIsDark()
  const { motion, speed } = useLook()
  // Tema paneli › Düğme biçimi: hap → yuvarlak düğmeler, köşeli → küçük yarıçap
  const shape = useSettingsControl()?.settings.buttonShape ?? 'default'
  const config = vars
    ? tokensOf(vars, dark, motion !== 'off', speed, shape === 'square')
    : undefined
  return (
    <StyleProvider layer>
      <ConfigProvider
        locale={trTR}
        theme={config}
        variant="filled"
        wave={{ disabled: true }}
        button={shape === 'pill' ? { shape: 'round' } : undefined}
        card={{ variant: 'borderless' }}
      >
        <App component={false}>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  )
}
