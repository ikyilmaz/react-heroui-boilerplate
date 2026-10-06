import type { ThemeKit } from '@/synergy/shared/themeSettings'

/* Tema paneli: varsayılan (Karo; `src/themes/synergy.css`'in karşılığı) ve dört hazır tema */

export const APP_THEME: ThemeKit = {
  storageKey: 'synergy-v2-theme',
  motion: true,
  defaults: {
    color: 'blue',
    radius: 0.5,
    corner: 'squircle',
    background: 'cool',
    font: 'jakarta',
    density: 'compact',
    cardStyle: 'filled',
    shadow: 'subtle',
    border: 1,
    nav: 'top',
    trail: 'solid',
    motion: 'full',
    motionSpeed: 1,
  },
  navOptions: [
    { id: 'default', label: 'Solda' },
    { id: 'top', label: 'Üstte' },
    // Solda kolon (raf, eylemler), üstte ince konum çubuğu (geri / ileri ve konum)
    { id: 'both', label: 'İkisi de' },
  ],
  /*
   * Hazır temalar: her biri ayrı bir karakter; görünüşü belirleyen bütün ayarları verir (gezinme,
   * köşe biçimi ve animasyon kullanıcının tercihi olarak kalır). Açık ve koyu temada aynı ayarlar
   * hesaplanır.
   */
  presets: [
    {
      // Editoryal, sakin: mürekkep rengi tek renk, krem zemin, zemin renginde çizgili kartlar
      id: 'kagit',
      label: 'Kâğıt',
      description: 'Mürekkep, krem zemin, ince çizgiler',
      look: {
        color: 'graphite',
        radius: 0.25,
        background: 'warm',
        font: 'figtree',
        density: 'normal',
        cardStyle: 'outlined',
        shadow: 'none',
        border: 1,
        trail: 'solid',
      },
    },
    {
      // Yumuşak: lavanta zemin üstünde mor ışımalı, çok yuvarlak beyaz kartlar
      id: 'bulut',
      label: 'Bulut',
      description: 'Lavanta zemin, mor ışıltı, yuvarlak',
      look: {
        color: 'purple',
        radius: 1,
        background: 'analogous',
        font: 'outfit',
        density: 'normal',
        cardStyle: 'filled',
        shadow: 'glow',
        border: 0,
        trail: 'soft',
      },
    },
    {
      // Hassas, yoğun (geliştirici araçları gibi): beyaz zemin, kıl çizgiler, sıkı ölçek
      id: 'keskin',
      label: 'Keskin',
      description: 'Zümrüt, beyaz zemin, kıl çizgiler',
      look: {
        color: 'emerald',
        radius: 0.25,
        background: 'white',
        font: 'geist',
        density: 'compact',
        cardStyle: 'filled',
        shadow: 'subtle',
        border: 0.5,
        trail: 'solid',
      },
    },
    {
      // Sıcak ve ifadeli: mercanın tamamlayıcısı serin zemin, kabarık kartlar, karakterli yazı
      id: 'gun-batimi',
      label: 'Gün Batımı',
      description: 'Mercan, serin zemin, kabarık kartlar',
      look: {
        color: 'coral',
        radius: 1,
        background: 'complement',
        font: 'bricolage',
        density: 'normal',
        cardStyle: 'elevated',
        shadow: 'soft',
        border: 0,
        trail: 'solid',
      },
    },
  ],
}
