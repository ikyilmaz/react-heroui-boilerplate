import type { ThemeKit } from '@/synergy/shared/themeSettings'

/* Tema paneli: varsayılan (Karo; `src/themes/synergy.css`'in karşılığı, düz zemin) ve dört hazır
   tema */

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
    cardStyle: 'filled',
    shadow: 'none',
    border: 1,
    nav: 'top',
    motion: 'full',
    motionSpeed: 1,
  },
  navOptions: [
    { id: 'default', label: 'Solda', side: 'left' },
    { id: 'right', label: 'Sağda', side: 'right' },
    { id: 'top', label: 'Üstte', side: 'top' },
    { id: 'bottom', label: 'Altta', side: 'bottom' },
  ],
  /*
   * Hazır temalar: her biri ayrı bir karakter; görünüşü belirleyen bütün ayarları verir (gezinme,
   * köşe biçimi ve animasyon kullanıcının tercihi olarak kalır). Açık ve koyu temada aynı ayarlar
   * hesaplanır.
   */
  presets: [
    {
      // Teknik çizim masası: kareli zemin, çerçeveli kartlar, keskin köşe
      id: 'atolye',
      label: 'Atölye',
      description: 'Turuncu, kareli zemin, çerçeveli kartlar',
      look: {
        color: 'orange',
        radius: 0.25,
        background: 'neutral',
        texture: 'grid',
        font: 'geist',
        density: 'compact',
        cardStyle: 'outlined',
        shadow: 'none',
        border: 1,
      },
    },
    {
      // Sakin ve ışıltılı: turkuazın iki yanındaki tonlardan aurora, yuvarlak çerçevesiz kartlar
      id: 'kuzey-isigi',
      label: 'Kuzey Işığı',
      description: 'Turkuaz, aurora zemin, yuvarlak kartlar',
      look: {
        color: 'teal',
        radius: 1,
        background: 'cool',
        texture: 'aurora',
        font: 'synergy',
        density: 'compact',
        cardStyle: 'filled',
        shadow: 'soft',
        border: 0,
      },
    },
    {
      // Sıcak ve yumuşak: tepeden süzülen gül rengi ışık, kabarık kartlar
      id: 'safak',
      label: 'Şafak',
      description: 'Gül, tepeden ışık, kabarık kartlar',
      look: {
        color: 'rose',
        radius: 0.5,
        background: 'warm',
        texture: 'spot',
        font: 'figtree',
        density: 'compact',
        cardStyle: 'elevated',
        shadow: 'subtle',
        border: 0,
      },
    },
    {
      // Derin ve canlı: çapraz iki köşeden çivit ışıltı, tonlu kartlar, yumuşak gölge
      id: 'lacivert',
      label: 'Lacivert',
      description: 'Çivit, çapraz ışıltı, tonlu kartlar',
      look: {
        color: 'indigo',
        radius: 0.5,
        background: 'white',
        texture: 'diagonal',
        font: 'outfit',
        density: 'compact',
        cardStyle: 'tinted',
        shadow: 'soft',
        border: 0.5,
      },
    },
  ],
}
