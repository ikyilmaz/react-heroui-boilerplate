# Synergy

Synergy arayüzü: React 19, TypeScript, Vite, antd v6 ve Tailwind CSS v4.

## Başlangıç

```bash
npm install
npm run dev
```

## Komutlar

| Komut             | Açıklama                                                 |
| ----------------- | -------------------------------------------------------- |
| `npm run dev`     | Geliştirme sunucusunu başlatır                           |
| `npm run build`   | Tip kontrolü + production build                          |
| `npm run preview` | Build çıktısını yerelde sunar                            |
| `npm run share`   | Build'i Cloudflare tüneliyle geçici bir adreste paylaşır |
| `npm run lint`    | oxlint ile kod kontrolü                                  |

## Paylaşım (Cloudflare tüneli)

```bash
brew install cloudflared        # bir kez
npm run share                   # derler, https://….trycloudflare.com adresini verir
npm run share -- --no-build     # son derlemeyi paylaşır
PORT=4190 npm run share         # 4180 doluysa başka port
```

Hesap gerekmez; adres her çalıştırmada değişir ve panoya kopyalanır. Pencere açık kaldıkça yayında
(Mac boşta uyumaz, kapak kapanınca uyur), Ctrl+C sunucuyu ve tüneli kapatır. Sunucu yalnızca
`127.0.0.1`'i dinler; dışarıdan yalnızca tünel adresiyle erişilir. Adresi bilen herkes açabilir.

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
