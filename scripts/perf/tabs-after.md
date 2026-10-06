Chrome Chrome/154.0.8037.98 · 1512×945 @2x · animasyon full · 2026-10-06T16:39:19.621Z

| Senaryo | Tıklama görevi (ms) | Betik (ms) | Zorunlu stil/düzen (ms) | En uzun görev (ms) | LoAF >50 ms | gBCR | offset* / client* | gCS | Gizli bölmede input yazımı | Stil yazımı (öğe) | >20 ms kare | En büyük boşluk (ms) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A Grup geçişi (g1 → g0) | 0.9 | 0.9 | 0 | 10.7 | 0 | 0 | 0 / 1 | 0 | 0 | 277 (5) | 0 | 17 |
| B Sekme geçişi: yan yana sekmeye | 1.1 | 1.1 | 0 | 13.5 | 0 | 24 | 8 / 7 | 6 | 0 | 862 (16) | 0 | 17 |
| C Sekme geçişi: tek formlu sekmeye | 2.4 | 2.4 | 0 | 12.1 | 0 | 25 | 13 / 7 | 7 | 0 | 791 (16) | 0 | 17 |
| D Grup geçişi (g0 → g1) | 1 | 1 | 0 | 14.8 | 0 | 0 | 0 / 1 | 0 | 0 | 167 (5) | 0 | 17 |
| E Child aç, panel boyutu 3 (yeni sekme) | 2 | 2 | 0 | 39.5 | 3 (59) | 47 | 46 / 30 | 20 | 0 | 760 (23) | 1 | 33 |
| F Sekme geçişi: g1 kökü | 1 | 1 | 0 | 14.4 | 0 | 26 | 15 / 8 | 8 | 0 | 621 (16) | 0 | 17 |
| G Child sekmesini kapat | 2 | 2 | 0 | 10.4 | 0 | 31 | 16 / 8 | 10 | 0 | 26 (2) | 0 | 17 |
| H Boşta 1.5 s | 0 | – | – | 0.1 | 0 | 0 | 0 / 0 | 0 | 0 | 0 (0) | 0 | 17 |

4× yavaşlatma, 60 Hz: tıklamadan sonraki 500 ms

| Senaryo | Tıklama görevi (ms) | En büyük boşluk, ilk 500 ms (ms) | >20 ms kare, ilk 500 ms | LoAF >50 ms |
|---|---|---|---|---|
| A Grup geçişi (g1 → g0) | 1.1 | 17 | 0 | 0 |
| B Sekme geçişi: yan yana sekmeye | 0.9 | 33 | 1 | 0 |
| C Sekme geçişi: tek formlu sekmeye | 1.6 | 33 | 1 | 0 |
| D Grup geçişi (g0 → g1) | 1.4 | 33 | 1 | 1 (50) |
