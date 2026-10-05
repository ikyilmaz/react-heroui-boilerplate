import type { ThemeKit } from '@/synergy/shared/themeSettings'

/* Tema paneli: varsayılan (Karo; `src/themes/synergy.css`'in karşılığı) */

export const APP_THEME: ThemeKit = {
  storageKey: 'synergy-v2-theme',
  motion: true,
  defaults: {
    color: 'blue',
    radius: 0.5,
    background: 'cool',
    font: 'synergy',
    density: 'normal',
    cardStyle: 'filled',
    shadow: 'none',
    border: 1,
    nav: 'default',
    trail: 'soft',
    motion: 'full',
    motionSpeed: 1,
  },
  navOptions: [
    { id: 'default', label: 'Solda' },
    { id: 'top', label: 'Üstte' },
    // Solda kolon (raf, eylemler), üstte ince konum çubuğu (geri / ileri ve konum)
    { id: 'both', label: 'İkisi de' },
  ],
}
