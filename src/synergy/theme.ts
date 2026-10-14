import type { ThemeKit } from '@/synergy/shared/themeSettings'

/* Tema paneli: varsayılan (Karo; `src/themes/synergy.css`'in karşılığı, düz zemin) */

export const APP_THEME: ThemeKit = {
  storageKey: 'synergy-v2-theme',
  motion: true,
  defaults: {
    color: 'blue',
    radius: 0.5,
    corner: 'squircle',
    background: 'cool',
    texture: 'none',
    font: 'jakarta',
    density: 'tight',
    cardFill: 'surface',
    raised: 'off',
    shadow: 'none',
    border: 1,
    nav: 'compact',
    detail: 'embedded',
    motion: 'full',
    motionSpeed: 1,
    tabContent: 'fade',
    loading: 'spinner',
    movement: 'on',
    stripMotion: 'on',
    counting: 'on',
  },
  navOptions: [
    { id: 'default', label: 'Solda', side: 'left' },
    { id: 'top', label: 'Üstte', side: 'top' },
    { id: 'compact', label: 'Kompakt', side: 'compact' },
  ],
}
