import { BASE_LOOK, type ThemeKit, type ThemeSettings } from '@/synergy/shared/themeSettings'

/* v1 (Karo) tema paneli: varsayılan (`src/themes/synergy.css`'in karşılığı) ve beş hazır tema */

const DEFAULTS: ThemeSettings = {
  hue: 262,
  chroma: 0.16,
  lightness: 0.5,
  radius: 0.5,
  background: 'cool',
  headingFont: 'bricolage',
  bodyFont: 'inter',
  scale: 16,
  shadow: 'none',
  border: 1,
  ...BASE_LOOK,
}

export const V1_THEME: ThemeKit = {
  storageKey: 'synergy-v1-theme',
  motion: true,
  defaults: DEFAULTS,
  navOptions: [
    { id: 'default', label: 'Solda' },
    { id: 'top', label: 'Üstte' },
  ],
  presets: [
    {
      id: 'karo',
      label: 'Karo',
      description: 'Varsayılan: koyu mavi, serin zemin',
      settings: DEFAULTS,
      swatch: 'bg-[oklch(0.5_0.16_262)]',
      surface: 'bg-[oklch(0.96_0.003_250)]',
    },
    {
      id: 'okyanus',
      label: 'Okyanus',
      description: 'Petrol mavisi, yumuşak köşeler, hafif gölge',
      settings: { ...DEFAULTS, hue: 210, chroma: 0.1, lightness: 0.5, radius: 0.75, background: 'tinted', headingFont: 'jakarta', bodyFont: 'jakarta', shadow: 'soft', spacing: 0.27, buttonShape: 'pill', accent: 'soft' },
      swatch: 'bg-[oklch(0.5_0.1_210)]',
      surface: 'bg-[oklch(0.965_0.02_210)]',
    },
    {
      id: 'orman',
      label: 'Orman',
      description: 'Koyu yeşil, sıcak zemin, sade köşeler',
      settings: { ...DEFAULTS, hue: 155, chroma: 0.11, lightness: 0.47, radius: 0.375, background: 'warm', headingFont: 'figtree', bodyFont: 'figtree', spacing: 0.23, cardStyle: 'outlined', buttonShape: 'square', nav: 'top' },
      swatch: 'bg-[oklch(0.47_0.11_155)]',
      surface: 'bg-[oklch(0.968_0.008_80)]',
    },
    {
      id: 'kehribar',
      label: 'Kehribar',
      description: 'Sıcak turuncu, yuvarlak köşeler, hafif gölge',
      settings: { ...DEFAULTS, hue: 50, chroma: 0.15, lightness: 0.56, radius: 1, background: 'warm', shadow: 'soft', spacing: 0.28, buttonShape: 'pill', accent: 'solid' },
      swatch: 'bg-[oklch(0.56_0.15_50)]',
      surface: 'bg-[oklch(0.968_0.008_80)]',
    },
    {
      id: 'grafit',
      label: 'Grafit',
      description: 'Mürekkep siyahı, keskin köşeler, belirgin gölge',
      settings: { ...DEFAULTS, hue: 260, chroma: 0.02, lightness: 0.32, radius: 0.25, background: 'neutral', headingFont: 'geist', bodyFont: 'geist', shadow: 'strong', spacing: 0.22, cardStyle: 'elevated', buttonShape: 'square', accent: 'solid' },
      swatch: 'bg-[oklch(0.32_0.02_260)]',
      surface: 'bg-[oklch(0.975_0_0)]',
    },
  ],
}
