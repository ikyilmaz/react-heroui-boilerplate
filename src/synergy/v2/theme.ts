import { BASE_LOOK, type ThemeKit, type ThemeSettings } from '@/synergy/shared/themeSettings'

/* v2 (Bento) tema paneli: varsayılan (`src/themes/synergy-v2.css`'in karşılığı) ve beş hazır tema */

const DEFAULTS: ThemeSettings = {
  hue: 255,
  chroma: 0.16,
  lightness: 0.56,
  radius: 0.75,
  background: 'tinted',
  headingFont: 'jakarta',
  bodyFont: 'jakarta',
  scale: 16,
  shadow: 'soft',
  border: 1,
  ...BASE_LOOK,
}

export const V2_THEME: ThemeKit = {
  storageKey: 'synergy-v2-theme',
  defaults: DEFAULTS,
  navOptions: [
    { id: 'default', label: 'Altta' },
    { id: 'left', label: 'Solda' },
    { id: 'top', label: 'Üstte' },
  ],
  presets: [
    {
      id: 'bento',
      label: 'Bento',
      description: 'Varsayılan: açık mavi, yuvarlak karolar',
      settings: DEFAULTS,
      swatch: 'bg-[oklch(0.56_0.16_255)]',
      surface: 'bg-[oklch(0.968_0.01_255)]',
    },
    {
      id: 'lavanta',
      label: 'Lavanta',
      description: 'Yumuşak mor, daha yuvarlak köşeler',
      settings: { ...DEFAULTS, hue: 295, chroma: 0.15, lightness: 0.55, radius: 1, spacing: 0.28, buttonShape: 'pill', accent: 'solid' },
      swatch: 'bg-[oklch(0.55_0.15_295)]',
      surface: 'bg-[oklch(0.965_0.02_295)]',
    },
    {
      id: 'nane',
      label: 'Nane',
      description: 'Serin yeşil, Figtree yazı tipi',
      settings: { ...DEFAULTS, hue: 170, chroma: 0.1, lightness: 0.52, headingFont: 'figtree', bodyFont: 'figtree', cardStyle: 'outlined', nav: 'left' },
      swatch: 'bg-[oklch(0.52_0.1_170)]',
      surface: 'bg-[oklch(0.965_0.02_170)]',
    },
    {
      id: 'mercan',
      label: 'Mercan',
      description: 'Sıcak mercan, sıcak zemin, yuvarlak köşeler',
      settings: { ...DEFAULTS, hue: 35, chroma: 0.15, lightness: 0.6, radius: 1, background: 'warm', cardStyle: 'elevated', buttonShape: 'pill', accent: 'solid' },
      swatch: 'bg-[oklch(0.6_0.15_35)]',
      surface: 'bg-[oklch(0.968_0.008_80)]',
    },
    {
      id: 'gece',
      label: 'Gece mavisi',
      description: 'Koyu lacivert, nötr zemin, belirgin gölge',
      settings: { ...DEFAULTS, hue: 265, chroma: 0.08, lightness: 0.36, radius: 0.5, background: 'neutral', headingFont: 'geist', bodyFont: 'geist', shadow: 'strong', spacing: 0.22, cardStyle: 'elevated', buttonShape: 'square', nav: 'top' },
      swatch: 'bg-[oklch(0.36_0.08_265)]',
      surface: 'bg-[oklch(0.975_0_0)]',
    },
  ],
}
