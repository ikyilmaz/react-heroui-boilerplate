# React + HeroUI Boilerplate

React 19, TypeScript, Vite, Tailwind CSS v4 ve HeroUI v3 ile hazırlanmış başlangıç projesi.

## Özellikler

- **React 19 + TypeScript** (strict mod)
- **Vite** hızlı geliştirme sunucusu ve derleme
- **HeroUI v3** — Provider gerektirmez, React Aria tabanlı erişilebilir bileşenler
- **Tailwind CSS v4** — `@tailwindcss/vite` eklentisiyle, config dosyası yok
- **React Router v7** — `src/router.tsx` içinde tanımlı rotalar
- **Dark / light tema** — HeroUI'nin `useTheme` hook'u ile, `localStorage`'da saklanır
- **`@/` path alias** → `src/`
- **oxlint** ile lint, Prettier yapılandırması hazır

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

## Klasör Yapısı

```
src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── RootLayout.tsx
│   ├── DateTimePicker.tsx     # antd tarzı tarih + saat seçici
│   ├── TimePicker.tsx         # yalnızca saat seçici
│   ├── TimePanel.tsx          # ikisinin paylaştığı saat sütunları
│   ├── dateFormat.ts          # format dizgesi → React Aria segmentleri
│   ├── TreeSelect.tsx         # antd tarzı ağaç seçici (HeroUI ComboBox motoru)
│   ├── Combobox.tsx           # antd tarzı arama + seçim (showSearch, allowClear, ikon)
│   ├── Transfer.tsx           # antd tarzı iki listeli seçim
│   ├── DataGrid.tsx           # sunum amaçlı veri tablosu
│   ├── useDataGrid.ts         # tablonun durum makinesi + tipleri
│   ├── NumberBox.tsx          # adımlı, biçimli sayı alanı
│   ├── TextBox.tsx            # sonekli metin alanı + çeviri popover'ı
│   ├── fieldIconButton.ts     # alan içi ikon düğmelerinin ortak ölçüleri
│   ├── FieldSelectIndicator.tsx # Select chevron'u (diğer alanlarla aynı kutu)
│   ├── ThemeTweaker.tsx       # tema paneli (Drawer)
│   └── ThemeToggle.tsx
├── theme/
│   └── tweaks.ts              # tema modeli, hazır ayarlar, yazı tipleri, depolama
├── pages/
│   ├── ShowcasePage.tsx       # `/` — bileşen vitrini (Tabs ile slayt gösterisi)
│   └── NotFoundPage.tsx
├── App.tsx          # RouterProvider
├── router.tsx       # Rota tanımları
├── index.css        # Tailwind + HeroUI stilleri
└── main.tsx         # Giriş noktası
```

### Sayfalar

- **`/` — Bileşen Vitrini**: HeroUI v3'te hazır bir carousel yok; slayt gösterisi `Tabs`
  üzerine kuruldu (ok tuşları / `Home` / `End` ile gezinme, ayrıca önceki-sonraki düğmeleri).
  Sekme şeridi dikey ve solda. Her slayt bir sunum ekranıdır: başlık + tek satırlık alt başlık,
  altında örneklerin **ızgarası** (`lg`'de iki, `2xl`'de üç sütun). Örnekler tek sütunda alt alta
  dizilince slayt ekrana sığmıyor, ortalanmış dar bileşenlerin solunda da kocaman bir boşluk
  kalıyordu.

  Her örnek kendi kartındadır ve kart `secondary` (hafif gri): alanların kendi zemini beyaz
  (`bg-field`), beyaz kartta kayboluyorlardı; sayfa zemini de daha açık olduğu için kart hem
  sayfadan hem içindeki alanlardan ayrışıyor.

  **DataGrid** ve **DataGrid2** aynı `RequestsWidget`ı kullanır (ikincisi `showEditorAlways` ile);
  widget kendi iki kartını zaten kurduğu için o slaytlarda örnek kartı eklenmez. Sayfa genişliği
  `md`'den itibaren %92, `2xl`'de %88 — tablonun daha çok kolonu ekrana sığsın diye. Sayfa genişliği `md`'den itibaren ekranın %80'i.

## Tarih / Saat Seçiciler

`DateTimePicker` ve `TimePicker` aynı `TimePanel`'i (antd tarzı kaydırılabilir saat sütunları)
paylaşır. Alanlar React Aria'nın segmentli girişidir: ok tuşlarıyla düzenlenir, ekran okuyucuya
segment segment okunur.

### `format` — dizgeye göre render

`DateTimePicker`, moment/dayjs tarzı bir format dizgesi alır ve alanı **ona göre** basar: hangi
segmentler, hangi sırada, hangi ayraçlarla.

```tsx
<DateTimePicker format="dddd, MMMM D, YYYY h:mm A" locale="en-US" />
// Tuesday, February 27, 2001 12:23 PM   — her parça ayrı ayrı düzenlenebilir
```

Desteklenen token'lar: `YYYY YY · MMMM MMM MM M · DD D · dddd ddd · HH H hh h · mm m · ss s · A a`
ve `[düz metin]`. Tanınmayan harf düz metin olur ve geliştirme modunda uyarı basılır.
`granularity`, 12/24 saat ve saniye sütunu format'tan türetilir; `format` verildiğinde `showTime`
yok sayılır.

**Nasıl çalışıyor:** React Aria'nın tarih alanı locale güdümlüdür, format dizgesi kavramı yoktur.
Ama `DateInput` render edeceği şeyi tamamen `state.segments` dizisinden okur:

```js
state.segments.map((segment, i) => cloneElement(children(segment), { key: i }))
```

Biz de motoru çatallamak yerine bu diziyi format sırasına dizip metinlerini yazıyoruz
(`src/components/dateFormat.ts`). Segmentlerin `value` / `minValue` / `maxValue` / `isEditable`
alanlarına ve state'in mutator'larına dokunmuyoruz — ok tuşları, rakam yazma, otomatik sonraki
segmente geçme, odak yönetimi ve ARIA olduğu gibi React Aria'dan geliyor. Ay kutusu yine
`role="spinbutton"`; `aria-valuenow="2"`, `aria-valuetext="February"`.

Gün adı (`dddd`) tarihten türediği için düzenlenemez: `literal` segment olarak basılır, yani
`aria-hidden`'dır — ekran okuyucu zaten gün/ay/yıl segmentlerini tek tek okuyor. Değer yokken
tire ile yer tutucu gösterir.

**Uzun okunuş** (`formatOptions`) ayrı bir seçenek: alanı değiştirmeden, değerin uzun hâlini
React Aria'nın kendi `state.formatValue()` motoruyla üretip açıklama satırı olarak basar.

## DataGrid

Sunum amaçlı bir veri tablosu; durumu `useDataGrid` kancasında (filtre, sıralama, çoklu seçim,
satır içi düzenleme, sayfalama). Tablo bulunduğu alanı kaplar, sütunlar sığmazsa yatay kaydırılır.

Hücre düzenleyicileri alan tipine göre bileşenlerden gelir:

| Kolon            | Görüntü       | Düzenleme                           | Filtre                     |
| ---------------- | ------------- | ----------------------------------- | -------------------------- |
| (seçim)          | `Checkbox`    | —                                   | —                          |
| İşlemler         | düzenle + sil | kaydet + vazgeç                     | filtreleri temizle         |
| İstek No         | `#152512`     | `NumberBox`                         | `NumberBox`                |
| Süreci Başlatan  | Avatar + ad   | `TextField`                         | `TextField`                |
| Durum            | `Chip`        | `Select`                            | `Select`                   |
| Süreç Başlangıcı | tarih + saat  | `DateTimePicker`                    | `DateTimePicker` (saatsiz) |
| İstek Tarihi     | tarih         | `DateTimePicker` (saatsiz)          | `DateTimePicker`           |
| Tutar            | ₺ biçimli     | `NumberBox` (para birimi, adım 500) | `NumberBox`                |
| İlerleme         | `ProgressBar` | `NumberBox` (yüzde, 0–100)          | `NumberBox`                |

Filtre alanlarının hepsinde **temizle (×)** var: metin ve sayıda ayrı bir düğme, tarihte
`DateTimePicker`'ın `isClearable`'ı, durumda `Select.ClearButton`. Düğme yalnızca alanda değer
varken görünür. Filtre satırındaki `NumberBox`'larda − / + yoktur; dar alanda işlem seçici ve
temizle düğmesiyle birlikte sığmıyordu (düzenleme hücrelerinde duruyorlar).

Hücrelerin üstüne gelince tam metin ipucu çıkar (`CellText`). Tetikleyici `Tooltip.Trigger` olmak
zorunda: RAC ipucu olaylarını `useFocusable` üzerinden bağlıyor, sıradan bir kutu bunları almadığı
için ipucu hiç açılmıyor. Düzenle ve sil düğmelerinin de ipucu vardır ("Satırı düzenle" / "Satırı sil"); düğme ipuçlarının
varsayılan gecikmesi hücrelerinkinden (500 ms) uzundur.

Onay diyaloğu tablo düzeyinde tektir ve denetimlidir. Kökü (`AlertDialog`) atlamamak gerekiyor: `Header` / `Body` / `Footer` düzen sınıflarını kökün sağladığı context'ten alıyor, kök olmayınca başlıkla düğmeler üst üste biniyor. Kök aynı zamanda RAC'in `DialogTrigger`ı olduğu için ilk çocuğunun pressable olmasını bekliyor; gerçek tetikleyiciler satırlarda olduğundan köke gizli bir yer tutucu tetikleyici konuyor. Alt şeritteki düğmeler sıradan `Button`dır — `AlertDialog.CloseTrigger` köşedeki "×" düğmesidir (`absolute end-4 top-4`) ve alt şeritte kullanılınca iki düğme üst üste biniyordu.

Silme `AlertDialog` ile onaylanır ("#152356 silinsin mi?" → Vazgeç / Sil). `useDataGrid.deleteRow`
kaydı siler, seçimden düşürür, o satır düzenlemedeyse düzenlemeyi kapatır ve sabitlemeyi bırakır.

### Genel arama ve vurgulama

Widget başlığındaki `SearchField` bütün kolonlarda arar ve eşleşen parçaları hücrede `<mark>` ile
boyar. Arama ile vurgulama tek kaynaktan beslenir: `rowCells(row)` satırın hücrelerinde **görünen**
metinleri döner, `matchesSearch` de aynı metinlere bakar. Böylece `₺48.500` ya da `%45` yazıp
aratmak çalışır ve boyanan yer ile eşleşen yer hiç ayrışmaz.

Vurgulama Türkçe küçültmeye dikkat eder: `toLocaleLowerCase('tr')` bazı harflerde dizgi uzunluğunu
değiştirebildiği için (ör. `İ`), uzunluk kaydıysa konumlar güvenilmez olur ve metin boyanmadan
basılır.

### Sayfalama

Sayfa boyutu seçicisi `rounded-full`: sayfa düğmeleri `rounded-3xl` + `size-8`, yani daire; alan
yarıçapı (`--field-radius`) yanlarında tutarsız duruyordu. Sayfa boyutu (10 / 20 / 50) ve kayıt
sayısı `Pagination.Summary` içinde solda, sayfa gezinmesi
`Pagination.Content` ile sağdadır — `.pagination` zaten `w-full` + `justify-between` olduğu için ayrı
bir sarmalayıcı gerekmiyor. Sayfa listesi `1 … 4 5 6 … 12` biçiminde pencerelenir, ilk ve son sayfa hep görünür. Durum `useDataGrid` içindedir
(`page`, `totalPages`, `pageSize`); filtre, arama ya da sayfa boyutu değişince sayfa başa döner.

**Yeni satır** listenin başına eklenir ve sıralamadan bağımsız olarak orada tutulur (`pinnedId`).
Aktif bir filtre ya da arama yeni satırı gizleyebileceği için `addRow` ikisini de temizler —
aksi hâlde "yeni" düğmesi görünürde hiçbir şey yapmamış gibi olurdu.

### Filtre işlemleri

Her filtre hücresinin solunda bir **işlem seçici** var; kolonun tipine göre farklı bir küme sunar:

| Tip   | İşlemler                                                                                  |
| ----- | ----------------------------------------------------------------------------------------- |
| Metin | İçerir · İçermez · İle başlar · İle biter · Eşittir                                       |
| Sayı  | = · ≠ · > · ≥ · < · ≤                                                                     |
| Tarih | Tarihinde · Sonrasında · Tarihinde veya sonrasında · Öncesinde · Tarihinde veya öncesinde |
| Durum | = · ≠                                                                                     |

Seçici ikon boyunda bir `Select`'tir ve alanın **içinde**, kenarlığın gerisinde durur. Yan yana
iki denetim yerine tek bir alan olduğu için odak halkası seçiciyi de kapsıyor:

| Alan             | Yuva                                                 |
| ---------------- | ---------------------------------------------------- |
| `TextField`      | `InputGroup.Prefix`                                  |
| `DateTimePicker` | `DateField.Prefix` (`prefix` prop'u)                 |
| `NumberBox`      | `NumberField.Group`'un ilk hücresi (`prefix` prop'u) |
| `Select` (Durum) | — tetikleyicinin üstüne bindirilmiş katman           |

Seçici alanın içinde durduğu için kendi kenarlığını, zeminini, gölgesini ve yarıçapını
bırakır; geriye ayraç olarak yalnızca bitiş kenarlığı kalır. Ayracın rengi `separator`, çünkü
açık temada `--field-border` **transparent** (alanlar kenarlık değil gölge kullanıyor) — `field-border`
ile çizilen çizgi görünmüyordu. `InputGroup.Input`e ayrıca `min-w-0 flex-1 ps-3` gerekiyor: daralmadığı için sonekteki temizle
düğmesini kutunun dışına itiyordu, ve HeroUI prefix varken input'un başlangıç dolgusunu
sıfırladığı için (`.input-group:has(prefix) .input-group__input { ps-0 }`, boşluğu normalde
prefix'in kendi `px-3`'ü verir) imleç sola yapışıyordu.

Durum filtresi tek istisna: `Select.Trigger` bir `<button>`, içine ikinci bir düğme koymak
geçersiz HTML olurdu. Seçici orada gerçek bir prefix değil, tetikleyicinin üstüne konumlanmış ayrı
bir katman — odak halkası yine tetikleyicide olduğu için görünüm diğer alanlarla aynı kalıyor.
HeroUI'nin `Select.ClearButton`'ı da aynı sebeple `span`; klavyeyle temizleme tetikleyicideki
Backspace/Delete kısayoluyla yapılıyor.

`NumberField.Group` bir grid ve şablonunu yalnızca `slot="decrement"/"increment"` görünce açıyor;
prefix ve temizle düğmesi için şablon elle veriliyor. Gruptaki her `Button` RAC'ten `slot` istediği
için temizle düğmesi `slot={null}` ile context'ten çıkıyor — aksi hâlde
_"A slot prop is required"_ hatasıyla alan çöküyor.

`Select.Value` kullanılmaz (tetikleyicide yalnızca ikon vardır); RAC düğmenin adını
`aria-labelledby` ile etiketten kurup içerideki metni okumadığı için seçili işlem erişilebilir
ada yazılır: _"Tutar filtre işlemi: Büyük veya eşittir"_.

Filtre durumu `{ op, value }` çiftidir (`Filters` / `FilterState`); eşleştirme `useDataGrid`
içindeki `matchText` / `matchNumber` / `matchDate` / `matchEnum` fonksiyonlarında toplanır.
Tarih karşılaştırması gün çözünürlüğündedir (saat farkı sonucu etkilemez). İşlemi değiştirmek tek
başına filtre saymaz; `activeFilterCount` yalnızca dolu değerleri sayar.

Filtre ve satır içi düzenleme denetimlerinin tamamı aynı yükseklikte (2rem). ve
yüksekliği alan grubunda taşıdığı için /'ın
prop'u grubu da alçaltır; yalnızca iç input'u alçaltmak alanı bir tık yüksek bırakıyordu.
İşlem seçicinin tetikleyicisi olduğu için konumlanmamış komşusunun odak
halkasını örtüyordu; alanlar odaklanınca a çıkar.

Filtre ve satır içi düzenleme denetimlerinin tamamı aynı yükseklikte (2rem). `NumberField` ve
`DateInputGroup` yüksekliği alan grubunda taşıdığı için `NumberBox` / `DateTimePicker`'ın
`compact` prop'u grubu da alçaltır; yalnızca iç input'u alçaltmak alanı bir tık yüksek bırakıyordu.
İşlem seçicinin tetikleyicisi `relative isolate` olduğu için konumlanmamış komşusunun odak
halkasını örtüyordu; bu yüzden alanlar odaklanınca `z-10`a çıkar.

Filtre alanlarının hepsi `primary` (beyaz zemin) varyantındadır; `secondary` gri zemini
(`--default`) kullandığı için filtre satırı gövdeden ayrışmıyordu.

### Performans

Tablo her etkileşimde baştan render edilmeye çok açık: filtreye bir harf yazmak `filters`
nesnesini değiştirir, satır seçmek `selectedKeys`i, sayfa değiştirmek `rows`u. Ölçüm, sorunun tek
bir pahalı fonksiyon değil **çok sayıda bileşenin boşuna render edilmesi** olduğunu gösterdi
(CPU profili ince yayılmıştı, en ağır işlev bile toplamın %2'siydi).

Yapılanlar:

- **Bölüm bazlı `memo`**: `GridHeader`, `FilterRow`, `DataGridRow`, `GridFooter`. Sayfa değişimi
  ya da satır seçimi artık filtre alanlarını ve başlığı yeniden render etmiyor.
- **Hücre bazlı filtre memo'su**: tek bir `FilterRow` yetmiyordu, çünkü bir alana yazmak
  `filters`ı değiştirip yedi alanı birden render ettiriyordu. Her hücre artık yalnızca kendi
  `{ op, value }` dilimini alıyor.
- **Sabit geri çağrılar**: `useDataGrid` bütün handler'ları `useCallback` ile, `tableProps`ı
  `useMemo` ile veriyor. Dışarıdan gelen `onRowsChange` / `onAnnounce` bir ref'te tutuluyor, yani
  çağıran taraf onları sarmasa bile handler kimlikleri sabit kalıyor.
- **Bileşen kimliği kaçağı**: `sortableHeader(label)` her render'da _yeni bir bileşen türü_
  üretiyordu; React bunu farklı tip sayıp başlık hücrelerini söküp yeniden kuruyordu. Tek sabit
  `SortableHeader` bileşenine çevrildi.
- **Satır başına tek yerine tablo başına tek diyalog**: her satır kendi `AlertDialog` ağacını
  kuruyordu (on satır = on diyalog). Artık tabloda tek bir denetimli diyalog var; tetikleyiciler
  satırlardaki çöp kutusu düğmeleri.

Ölçüm (üretim derlemesi, Chrome CDP `Performance` metrikleri, beş senaryo, ısınma turu +
5 tekrar ortalaması; script + stil + yerleşim toplamı):

| Senaryo                   | memo kapalı | memo açık   | son (tek diyalog)  |
| ------------------------- | ----------- | ----------- | ------------------ |
| Aramaya 8 karakter        | 363.7 ms    | 273.2 ms    | 283.6 ms           |
| Beş sayfa gez             | 297.4 ms    | 250.5 ms    | 238.8 ms           |
| Beş satır seç / bırak     | 138.3 ms    | 104.5 ms    | 101.8 ms           |
| Satır düzenle aç/kapat ×3 | 630.8 ms    | 425.9 ms    | 348.5 ms           |
| Filtreye yaz              | 269.8 ms    | 208.1 ms    | 169.8 ms           |
| **Toplam**                | **1700 ms** | **1262 ms** | **1143 ms (−33%)** |

"memo kapalı" sütunu aynı yapının `memo` devre dışı bırakılmış derlemesidir; yani fark yalnızca
memoizasyondan gelir. Son sütun buna ek olarak tek diyalog değişikliğini de içerir. Tur içi
sapma ±%8 civarında, bu yüzden tek tek satırlar değil toplam anlamlı.

Denenip **geri alınan** bir şey: `useDeferredValue` ile aramayı ertelemek. Girdi gecikmesini
iyileştiriyor ama React her tuşta iki kez render ettiği için toplam iş neredeyse ikiye katlandı
(273 → 484 ms). 64 satırda süzme zaten yeterince hızlı olduğu için geri alındı.

### `showEditorAlways` — DataGrid2

`showEditorAlways` modunda satır içi düzenleyiciler hep açık kalır. Bu modda taslak yoktur:
değişiklikler `useDataGrid.updateRow` ile doğrudan kayda yazılır, düzenle / kaydet / vazgeç
düğmeleri görünmez, işlemler kolonunda yalnızca silme kalır. Vitrindeki **DataGrid2** slaytı bunu
gösterir; kendi veri kümesiyle çalışır ki iki slayt birbirinin kaydını değiştirmesin.

### Widget kartı

Vitrinde tablo iki kartlı bir widget'ın içinde durur: dış kartın başlığında solda genel arama, sağda
ikon-only bir `ButtonGroup` (onayla / filtreyi temizle / yeni, her biri `Tooltip`'li); iç kart
tabloyu taşır.

Tonlar ölçülerek seçildi (açık tema): sayfa `0.970` → dış kart `tertiary` `0.937` → başlık şeridi
`surface-secondary` `0.952` → iç kart `default` beyaz. Dış kart önce `secondary` idi, yani başlık
şeridiyle birebir aynı ton — şerit kayboluyordu. Koyu temada sıralama tersine dönüp iç kartı bir
"kuyu" hâline getiriyor. `.card`ın kenarlığı olmadığı için iç karta ayrıca `border-border`
veriliyor; beyaz üstüne beyazda kenarı başka türlü okunmuyor.

`ButtonGroup` doğrudan çocuklarını klonlayıp bir "grup çocuğu" işareti koyuyor. `Tooltip`
sarmalayıcısı bu işareti yuttuğu için butonlar `size` / `variant`'ı context'ten almaz; her butona
tek tek veriliyor. Birleşik görünüm CSS'ten (`.button-group .button`, torun seçici) geldiği ve
`Tooltip` DOM'a düğüm eklemediği için köşe yuvarlamaları etkilenmiyor.

Nötr butonlar `outline`: ölçüldüğünde `secondary` butonun zemini (`0.940`) dış kartınkine (`0.937`)
neredeyse eşit çıktı, yani butonlar görünmüyordu. `outline`ın kenarlığı grubu her yüzeyde okunur
kılıyor, vurgu da yalnızca birincil eylemde kalıyor. İki farklı yüzey varyantı şart — `.card`ın kenarlığı
yoktur, yalnızca zemini vardır; aynı varyant iç içe gelince kartlar birbirinin içinde kaybolur.

### Ayraçlar

Satır arası yatay çizgiler kaldırılıp yerine kolon arasına dikey ayraç kondu. Ayraç hücrenin
kenarlığı **değil**: HeroUI'nin başlıkta kullandığının aynısı, kısa ve ortalı bir pseudo-element
(`.table__column::after`), `index.css` içinde `.data-grid` altında tanımlı. Kenarlıkla yapıldığında
çizgi satır boyunca tavandan tabana inip satır vurgusunun yuvarlak köşelerini kesiyordu. Filtre ve boş durum satırları gerçek kayıt olmadığı için hover vurgusu almaz;
seçili satırın tamamı `bg-accent-soft` ile boyanır (zemin `tr`'ye değil hücrelere basıldığından
köşe yarıçapı onu doğru kırpar).

### Satır ölçüleri

Satırlar kompakt: yükseklik `2.75rem`, hücre dolgusu kısaltılmış. İçerideki denetimler `2rem`
olduğu için bu yükseklik düzenleme modunda da yetiyor.

Satır arası boşluk `border-spacing-y-1` ile veriliyor — tablo zaten `border-separate` +
`border-spacing-0`, `tr`'ye marj uygulanamıyor. Aynı boşluk başlık şeridiyle filtre satırının
arasına da düşüyor, bu yüzden oraya ayrıca dolgu vermeye gerek kalmıyor.

Seçim ve işlemler ayrı birer gerçek kolon: seçim `3rem` (`px-3`), işlemler `6.5rem` ve normal
hücre dolgusu. İşlemler kolonu her durumda iki düğme gösterdiği için (düzenle + sil, ya da
kaydet + vazgeç) düzenlemeye girerken genişlik oynamıyor. Silme düğmesi varsayılan olarak solgun,
tehlike rengine yalnızca etkileşimde geçiyor — on satırda birden kırmızı ikon fazla gürültülüydü.

### Köşeler ve boşluklar

Satır vurgusu (hover / seçili / düzenleme) `tr`'ye değil hücrelere basılır — HeroUI de böyle
yapıyor ki Firefox zemini yarıçapa kırpabilsin — bu yüzden köşeler satırın ilk/son hücresinde
yuvarlanır (`min(16px, var(--radius-2xl))`, tema panelindeki yuvarlaklığı izler).
`secondary` varyantı gövdenin ilk/son satırına `rounded-none` verdiği için bu utility'ler onu
ezer (utility katmanı `components`'tan sonra gelir). Filtre satırı başlık şeridine yapışmasın
diye üstünde hafif bir boşluk bırakılır.

### Klavye

Tablo bir ARIA grid'dir: ok tuşları hücre/satır gezinmesi, Boşluk satır seçimi, Tab ise grid'e
tek bir duraktan girip çıkar. Filtre ve düzenleme satırlarında Tab'ı biz yakalayıp aynı satırın
alanları arasında dolaştırıyoruz. Tarih ve sayı alanları kendi tuşlarını yönetir (segment okları,
artırma/azaltma); satır düzeyinde yalnızca Enter (kaydet), Escape (alanı temizle / düzenlemeden
vazgeç) ve Tab yakalanır.

Satır içi Tab'ın odaklanabilir listesi üç şeyi dışlar:

- **RAC'in gizli doğrulama input'u.** Tarih alanının içinde `hidden` + `display: none` bir
  `<input>` var ama `tabIndex`i 0. Listeye girince `focus()` sessizce başarısız oluyor ve odak
  tarih alanının son segmentinde kilitleniyordu — Tab ile alandan çıkılamıyordu. `getClientRects()`
  boşsa eleniyor.
- **`aria-hidden` alt ağaçlar** (`closest('[aria-hidden="true"]')`).
- **Hücrenin kendisi**: RAC gezinme için etkin hücreye de `tabindex=0` veriyor, o da sıraya
  karışıyordu.

Hücre ipuçlarının tetikleyicisi `tabIndex={-1}`: `Tooltip.Trigger` `useFocusable` ile varsayılan
olarak odaklanabilir oluyor, bu da satır başına yedi ekstra tab durağı yaratıyor ve odağı hücreden
çaldığı için Boşluk ile satır seçmeyi engelliyordu. Metnin tamamı DOM'da olduğundan (kısaltma
yalnızca görsel) ekran okuyucu bir şey kaybetmiyor.

Silme onayı kapanınca odak, diyaloğu açan çöp kutusu düğmesine döner. RAC odağı kendi
tetikleyicisine verir ama bizim tetikleyicimiz kökteki görünmez yer tutucu olduğu için odak
hücreye düşüyordu; açılışta tetikleyiciyi saklayıp kapanışta geri veriyoruz.

## TreeSelect

Ağaç seçici, adı üstünde bir **ComboBox**tır: açma/kapama, sanal odak (`aria-activedescendant`),
tekli/çoklu seçim, yazarak arama ve erişilebilirlik HeroUI'nin `ComboBox`'ından gelir. Kendi
durum makinesi, kendi `role="combobox"` alanı, kendi popover'ı yoktur.

Ağaca özgü olan tek şey **koleksiyonun nasıl üretildiği**: `treeData` her render'da görünür
satırlara düzleştirilir (`Row[]`) ve `ListBox`a `items` olarak verilir.

- **Girinti** satırın `level`inden gelir (`paddingInlineStart`); yaprakta chevron yerine aynı
  genişlikte dolgu bırakılır.
- **Aç/kapa** kendi `expanded` kümemizdir. Satır `role="option"` olduğu için içine düğme
  konmaz: chevron sunumsaldır (`aria-hidden`, `Pressable`), klavye karşılığı ←/→ tuşlarıdır.
- **←/→ yakalama evresinde** dinlenir: React Aria'nın kendi `onKeyDown`'ı bu tuşlarda imleç
  gezindiğini varsayıp sanal odağı bırakıyor (`setFocusedKey(null)`). İşlediğimizde
  `stopPropagation` ile onu susturuyoruz.
- **Arama** ComboBox'ın düz süzgeciyle yapılamaz (eşleşenin ataları da görünmeli), bu yüzden
  `defaultFilter={() => true}` ile kapatılıp süzme ağaç üzerinde yapılır. ComboBox'ın
  "tetikleyiciden açılınca tümünü göster" davranışının karşılığı `filtering` bayrağıdır.
- **Çoklu seçim** React Aria 1.21'in `selectionMode="multiple"` desteğidir; bu modda seçim
  listeyi kapatmaz. Seçilenler alanın içinde `TagGroup` olarak görünür (`maxTagCount` sonrası
  `+N` rozeti). Etiketler dışarıdaki `map`ten çizilir: daraltılmış bir dalın düğümü
  koleksiyonda olmasa da etiketi durur.
- **Checkbox modu** (`treeCheckable`) ebeveyn/çocuk bağını `conduct` / `applyStrategy` saf
  fonksiyonlarıyla kurar. Satırdaki kutu sunumsaldır (`aria-hidden`, `excludeFromTabOrder`):
  seçili bilgisini zaten `option`ın `aria-selected`ı taşır, ikinci bir semantik eklenmez.

Alanın kutusu Input'un değil **grubun** üzerindedir (`inputGroupVariants`), çünkü etiketler
Input'un yanında durur; Input yalnızca yazı alanıdır. Chevron ve temizle düğmesi Combobox'taki
gibi kutuya biner.

## NumberBox

HeroUI `NumberField` sarmalayıcısı. Biçimlendirme `formatOptions` ile doğrudan
`Intl.NumberFormat` seçeneklerinden gelir; yazılan metni de React Aria aynı yerel ayara göre
ayrıştırır (para birimi, yüzde, birim ve binlik ayracı dâhil).

```tsx
<NumberBox step={50} minValue={0} formatOptions={{ style: 'currency', currency: 'TRY' }} />
<NumberBox step={0.01} maxValue={1} formatOptions={{ style: 'percent' }} />
<NumberBox showControls={false} formatOptions={{ useGrouping: true, maximumFractionDigits: 0 }} />
<NumberBox compact joinStart />   // tablo / filtre satırı gibi dar ve bitişik yerler için
```

`style: "percent"` değeri **kesir** sayar (0.45 → %45). 0–100 ölçeğinde bir sayı gösterilecekse
birim biçimi gerekir: `{ style: 'unit', unit: 'percent', unitDisplay: 'narrow' }` (45 → %45).
DataGrid'in İlerleme kolonu bunu kullanır.

− / + düğmeleri HeroUI'nin `slot="decrement"/"increment"` düğmeleridir; alanın iki yanına
yerleşir ve `showControls={false}` ile kaldırılır. Boş alan React Aria'da `NaN`'dir, dışarıya
`null` olarak verilir.

## TextBox

HeroUI `TextField` + `InputGroup` sarmalayıcısı. Sonek yuvası temizle (×) ve çeviri düğmelerini
taşır; alt satırda karakter sayacı gösterilebilir.

```tsx
<TextBox label="Başlık" placeholder="Başlık girin" />
<TextBox allowClear showCharacterCount maxLength={40} />
<TextBox
  languages={[{ code: 'tr', label: 'Türkçe' }, { code: 'en', label: 'English' }]}
  value={ad}
  onChange={setAd}
  translations={ceviriler}
  onTranslationsChange={setCeviriler}
/>
```

`languages` verildiğinde sonekte bir düğme çıkar ve diğer dilleri doldurmak için bir popover
açılır. Listenin **ilk** dili ana alandır (`value` / `onChange`); geri kalanlar `translations`
haritasında tutulur, böylece ana değerin iki kaynağı olmaz. Dolu çeviri sayısı düğmenin
erişilebilir adına yazılır ("Çeviriler (2 dil dolu)").

İki tuzak:

- Popover `TextField`in **dışında** durmalı. İçinde kalınca dış alanın RAC context'lerini
  (özellikle `TextContext`) miras alıyor ve içerideki `Label` / `Description` _"A slot prop is
  required"_ ile patlıyor.
- `Popover.Root` yerine kontrollü `Popover.Content` + `triggerRef` kullanılıyor: Root bir
  `DialogTrigger` olduğu için yanındaki temizle düğmesi de tetikleyici gibi davranırdı
  (aynı tuzak `TimePicker`'da da var).

## Tema Paneli

Üst çubuktaki palet düğmesi sağdan bir panel açar. Panel yalnızca `:root` üzerindeki birkaç CSS
değişkenini satır içi stil olarak yazar; HeroUI'nin türetilmiş token'ları (`--accent-soft`,
`--accent-hover`, `--focus`, `--field-radius`) tema dosyasında `color-mix`/`calc` ile bunlardan
hesaplandığı için değişiklik anında tüm bileşenlere yayılır.

| Ayar                          | Değişken                                                   |
| ----------------------------- | ---------------------------------------------------------- |
| Vurgu / başarı / uyarı / hata | `--accent`, `--success`, `--warning`, `--danger`           |
| Yuvarlaklık                   | `--radius`                                                 |
| Kenarlık, alan kenarlığı      | `--border-width`, `--field-border-width`, `--field-border` |
| Yoğunluk                      | `--spacing`                                                |
| Solgunluk                     | `--disabled-opacity`                                       |
| Yazı tipi                     | `--font-sans` + kök `font-family`                          |
| Yazı boyutu                   | kök `font-size` (rem tabanlı her ölçü bununla ölçeklenir)  |

- **Hazır ayarlar** (HeroUI, Kurumsal, Keskin, Yumuşak, Zümrüt, Menekşe, Gün batımı) renk, köşe,
  kenarlık, yoğunluk ve yazı tipini birlikte değiştirir. Elle bir ayar oynatılınca seçim `custom` olur.
- **Yazı tipleri** sistem yığını + 11 Google Fonts ailesi. Google ailesi seçilmeden ağdan hiçbir şey
  indirilmez; seçilince `<link>` o anda eklenir.
- Ayarlar `localStorage`'da (`heroui-tweaks`) saklanır ve modül React'ten önce çalışıp uygulandığı
  için açılışta tema sıçraması olmaz.
- Renkler **hex** olarak tutulur: react-aria'nın `parseColor`'ı `oklch()` ayrıştıramıyor, HeroUI'nin
  kendi varsayılanları ise oklch. Hazır ayarlardaki değerler oklch karşılıklarının hex'e çevrilmişidir.

## Yazım Kuralları

- **Ham HTML yok**: JSX'te `div`, `span`, `ul`, `svg`... kullanılmaz. Düzen kutusu için
  `Surface variant="transparent"`, metin için `Typography`, ayraç için `Separator`, liste için
  `ListBox`, boş durum için `EmptyState`. Landmark gerekiyorsa `<main>` yerine `role="main"`.
- **İkonlar yalnızca `lucide-react`'ten** gelir (`<Inbox size={16} aria-hidden />`); kendimiz SVG
  yazmayız ve HeroUI'nin kendi ikonları kullanılmaz. İkon yuvası olan bileşenlere (`Select.Indicator`,
  `SearchField.SearchIcon`, `ListBox.ItemIndicator`, `Checkbox.Indicator`, `DatePicker.TriggerIndicator`,
  `SearchField.ClearButton`, `Select.ClearButton`, `Tag.RemoveButton`) lucide ikonu **çocuk olarak**
  verilir; yuva çocuğu yoksa HeroUI kendi varsayılan ikonunu basar. Tek istisna `Checkbox.Indicator`
  ve `ListBox.ItemIndicator`ın **rengi**: seçili/belirsiz durumuna göre HeroUI yönetir, karışılmaz.
- **Tailwind sınıfı asgaride**: renk/tipografi/ölçü HeroUI prop'larından (`variant`, `color`,
  `type`, `weight`, `size`) alınır; sınıf yalnızca düzen (flex/grid/boyut) için yazılır.
- **Metin asgaride**: arayüzde açıklama cümlesi bulunmaz. Anlam taşıyan metin `aria-label`,
  `sr-only` ya da `Tooltip` ile verilir.

## İkon renkleri

Arayüzdeki bütün yardımcı ikonlar **tek tonda**: `ICON_MUTED` (`text-muted hover:text-muted`,
`src/components/fieldIconButton.ts`). Kapsam: alan içi önek/sonekler (temizle, chevron, takvim,
saat, − / +, filtre işlemi seçici) ve satır içi eylemler (düzenle, sil, filtreleri temizle).

`hover:` şart, çünkü HeroUI bazı yuvalarda (`.combo-box__trigger`, `.search-field__clear-button`)
üstüne gelince rengi koyulaştırıyor — geri bildirim **yuvarlak zeminden** gelsin, renk oynamasın.

Kasıtlı iki istisna:

| Yer                    | Renk                            | Neden                                                           |
| ---------------------- | ------------------------------- | --------------------------------------------------------------- |
| Sil düğmesi            | hover'da `text-danger`          | yıkıcı eylem, ama on satırda birden kırmızı ikon gürültü olurdu |
| TextBox çeviri düğmesi | dolu çeviri varsa `text-accent` | durum göstergesi                                                |

Kapsam dışı: varyantlı butonlar (`primary`, `secondary` — rengini varyanttan alır), sayfa kroması
(navbar, slayt okları, sayfalama — HeroUI varsayılanı), `Checkbox` ve `ListBox` göstergeleri.

## Alan içi ikon düğmeleri

Temizle (×), chevron, takvim, − / + ve DataGrid'in filtre işlemi seçicisi aynı görünümü paylaşır:
yuvarlak ve üstüne gelince zeminli. Bunun için **stil yazılmaz**, HeroUI'nin `ghost` buton
varyantı kullanılır (`--button-bg-hover: var(--default)`):

- Gerçek bir `Button` konulabilen yerde doğrudan o kullanılır. `NumberField`'ın − / + düğmeleri
  RAC'in belgelediği `slot="decrement"` / `slot="increment"` ile sıradan `Button`dır; HeroUI'nin
  `NumberField.DecrementButton`'ı varyant almıyor ve kendi kenarlığını çiziyordu.
- DataGrid'in işlem seçicisi de `Select.Trigger` değil sıradan bir `Button`: RAC'in `Select`i
  tetikleyicisini `ButtonContext` ile verdiği için içindeki herhangi bir `Button` tetikleyici olur.
  `.select__trigger`ın kendi zemini devreye girmediğinden hover doğru çalışır.
- Öğenin bileşeni sabit olduğu yerlerde (`ComboBox.Trigger`, `DatePicker.Trigger`,
  `Select.Indicator`, TreeSelect satırlarındaki aç/kapa chevron'u) HeroUI'nin `buttonVariants`
  fonksiyonu sınıf olarak verilir (`src/components/fieldIconButton.ts`).

`NumberField`ın ızgara şablonu HeroUI'de `:has([slot="decrement"])` ile açılıp sütunları 40px
veriyor. Düğmeler 24px'e indiği için her yanda 8px ölü alan kalıyor, input'un kendi 12px dolgusuyla
birlikte metin 52px içeriden başlıyordu; sütunlar düğmeye göre daraltılıp (`auto 1fr auto` +
düğmelerde `mx-1`) input dolgusu `px-1'e indirildi — metin artık 36px'ten başlıyor.

### Ortak ölçüler

Bütün alanlarda aynı: **36px alan yüksekliği**, **24x24 yuvarlak düğme, 16px ikon, kenardan 4px,
düğmeler arası 4px**, metin kenardan 12px. Sabitler `src/components/fieldIconButton.ts`ten gelir
(`FIELD_ICON_BUTTON`, `FIELD_ICON_SIZE`, `FIELD_AFFIX`, `ICON_MUTED`, `fieldIconButton`); ölçü elle
yazılmaz. Tek ayrı ölçek DataGrid'in filtre/düzenleme satırıdır: orası bilinçli olarak 32px.

TreeSelect'in kutusu etiketler yüzünden `h-auto`dur; `min-h-9` ile boşken de 36px'te durur.

Boyut için `size-6`: alanlar 32–36px yüksekliğinde, varsayılan 32px'lik ikon düğmesi kenarlara
yapışıyor. HeroUI'nin kendi ölçüleri her alanda farklı olduğu için birkaç yerde ezmek gerekiyor:

| Yer                           | HeroUI varsayılanı                      | Neden eziliyor                                                 |
| ----------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `DatePicker.Trigger`          | `.date-picker__trigger` `rounded-field` | buton yarıçapını eziyor → `rounded-full`                       |
| `DateField.Suffix`            | `me-3`                                  | kenar boşluğu 12px → `me-0` + `FIELD_AFFIX`                    |
| `.search-field__clear-button` | `me-2 size-5`                           | 20px ve 8px kenar → `me-1` + `FIELD_ICON_BUTTON_SIZE`          |
| `.select__indicator`          | `end-2`, 16px düz ikon                  | kutusuz ve 8px kenar → `FieldSelectIndicator` (`end-1`, 24x24) |
| `.select__trigger`            | `pe-7`                                  | 24px'lik kutu altına metin giriyor → `pe-8`                    |
| `SearchField.Input`           | `flex-1`                                | `min-w-0` yok; placeholder temizle düğmesini dışarı itiyor     |
| TreeSelect'in Input'u         | `.input` kendi kutusu                   | kutu grupta olduğu için `border-0 bg-transparent p-0 ring-0`   |

`Select.Indicator` çocuğunu `cloneElement` ile klonlayıp className'i ona geçirir; o yüzden ortak
chevron (`src/components/FieldSelectIndicator.tsx`) ikonu bir `Surface`a sarar — sınıflar kutuya
gider. `Select.ClearButton` ise bir `span`dir; içine `Button` konulamaz, RAC'in `ButtonContext`i
onu tetikleyiciye çevirirdi — görünüm `buttonVariants` sınıfıyla eşitlenir.

Silme onayında `isKeyboardDismissDisabled={false}` veriliyor: HeroUI'de varsayılan `true` (uyarı
diyaloğu açık bir eylem bekler) ama Escape = "vazgeç" güvenli seçenek olduğu için açık bırakılıyor.

## HeroUI v3 Notları

- Bileşenler compound API kullanır: `Card.Header`, `Card.Content`, `Switch.Control` vb.
- Buton varyantları: `primary | secondary | tertiary | outline | ghost | danger | danger-soft`
- Tema renk token'ları Tailwind sınıfı olarak kullanılabilir: `bg-background`, `text-foreground`,
  `text-muted`, `border-border`, `bg-surface`, `text-accent` ...
- Koyu tema `<html class="dark">` ile etkinleşir; `useTheme()` bunu sizin için yönetir.
- Tema değişkenlerini özelleştirmek için `src/index.css` içinde `:root { --accent: ... }` override edin.

Dokümantasyon: https://heroui.com
