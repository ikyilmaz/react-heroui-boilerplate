Chrome Chrome/154.0.8037.98 · 1512×945 @2x · animasyon full · 2026-10-06T16:53:34.604Z

| Senaryo | Tıklama görevi (ms) | Betik (ms) | Zorunlu stil/düzen (ms) | En uzun görev (ms) | LoAF >50 ms | gBCR | offset* / client* | gCS | Gizli bölmede input yazımı | Stil yazımı (öğe) | >20 ms kare | En büyük boşluk (ms) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A Grup geçişi (g1 → g0) | 78.5 | 58 | 19.4 | 78.5 | 3 (87) | 125 | 124 / 35 | 17 | 606 | 584 (15) | 1 | 67 |
| B Sekme geçişi: yan yana sekmeye | 116.2 | 83.3 | 23.2 | 116.2 | 3 (127) | 116 | 118 / 44 | 14 | 408 | 1051 (26) | 1 | 100 |
| C Sekme geçişi: tek formlu sekmeye | 103 | 78.3 | 22.7 | 103.1 | 3 (128) | 131 | 127 / 36 | 19 | 408 | 1056 (26) | 1 | 100 |
| D Grup geçişi (g0 → g1) | 83 | 62.5 | 17.6 | 83 | 3 (102) | 133 | 120 / 35 | 17 | 336 | 470 (17) | 1 | 83 |
| E Child aç, panel boyutu 3 (yeni sekme) | 91.9 | 76.2 | 8.2 | 91.9 | 5 (104) | 129 | 125 / 33 | 15 | 588 | 780 (22) | 3 | 83 |
| F Sekme geçişi: g1 kökü | 98.7 | 75.8 | 17.2 | 98.7 | 3 (119) | 141 | 108 / 32 | 19 | 555 | 959 (20) | 1 | 100 |
| G Child sekmesini kapat | 25.9 | 25.9 | 0 | 25.9 | 1 (58) | 50 | 41 / 3 | 9 | 294 | 24 (3) | 1 | 33 |
| H Boşta 1.5 s | 0 | – | – | 0.1 | 0 | 0 | 0 / 0 | 0 | 0 | 0 (0) | 0 | 17 |

4× yavaşlatma, 60 Hz: tıklamadan sonraki 500 ms

| Senaryo | Tıklama görevi (ms) | En büyük boşluk, ilk 500 ms (ms) | >20 ms kare, ilk 500 ms | LoAF >50 ms |
|---|---|---|---|---|
| A Grup geçişi (g1 → g0) | 230.9 | 300 | 3 | 3 (326) |
| B Sekme geçişi: yan yana sekmeye | 333.7 | 400 | 2 | 3 (422) |
| C Sekme geçişi: tek formlu sekmeye | 371 | 417 | 1 | 3 (428) |
| D Grup geçişi (g0 → g1) | 205.5 | 250 | 1 | 3 (262) |
