# Synergy

Synergy arayüzü: React 19, TypeScript, Vite, antd v6 ve Tailwind CSS v4.

## Başlangıç

```bash
npm install
npm run dev
```

## Komutlar

| Komut             | Açıklama                        |
| ----------------- | ------------------------------- |
| `npm run dev`     | Geliştirme sunucusunu başlatır  |
| `npm run build`   | Tip kontrolü + production build |
| `npm run preview` | Build çıktısını yerelde sunar   |
| `npm run lint`    | oxlint ile kod kontrolü         |

## Klasör yapısı

```
src/
├── main.tsx, App.tsx, router.tsx   # giriş ve rotalar
├── index.css                       # Tailwind + katman sırası + animasyon anahtarları
├── themes/synergy.css              # tema değişkenleri (açık / koyu)
└── synergy/                        # sayfalar ve kabuk
    ├── ant/                        # antd teması ve ortak antd parçaları
    ├── dashboard/                  # Başlangıç widget panosu
    ├── hr/                         # İnsan Kaynakları
    └── shared/                     # veri, mantık, tema paneli
```

Kurallar ve ayrıntılar için `CLAUDE.md`.
