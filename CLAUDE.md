# CLAUDE.md

The **Synergy** UI: React 19 + **antd v6** + Tailwind CSS v4 (Vite, react-router, lucide-react icons,
framer-motion). Everything lives in `src/synergy/`. Code comments are written in Turkish; follow that.

## Hard rules

- **No CSS.** Style with Tailwind utilities (arbitrary values / variants are fine) and antd props
  (`className`, semantic `classNames`). No `.css` files, `<style>` or `@apply` beyond the two files
  below; inline `style` only for truly dynamic numbers (e.g. a dragged splitter width).
  - `src/index.css`: the layer order `@layer theme, base, antd, components, utilities;` (antd's
    CSS-in-JS goes into `@layer antd`, so Tailwind utilities always beat it), `@import 'tailwindcss'`,
    the theme import, Tailwind `@theme` keys mapping the theme variables to colours / radii / shadows
    (`bg-accent`, `text-muted`, `ring-border`, `rounded-2xl`…) plus `font-display` (`font-mono` removed: `--font-mono: initial`), the
    animation keys (`animate-*` keyframes scaled by `--motion-time` / `--motion-shift`), base rules
    for border-colour inheritance (`var(--border)`), the corner shape (`corner-shape:
    var(--corner-shape, round)` on every element and pseudo-element, no exceptions) and the thin,
    track-less scrollbars, and one `@layer components` block that points antd's circle / pill shapes
    (avatar, circle / round button, switch, slider handle, radio, steps icon, badge…) at
    `--pill-radius` (`rounded-full` gets it through the `--radius-full` theme key).
  - `src/themes/synergy.css`: the theme, **variables only**, in `@layer base`, for
    `:root, .light, [data-theme='light']` and `.dark, [data-theme='dark']`. Base colours only
    (`--background`, `--surface*`, `--accent`, `--accent-soft`, `--border`, `--success`…).
- **No raw HTML elements** (`div`, `span`, `a`, `button`, `p`, …). antd components only: layout boxes
  are `Flex` (Tailwind may turn it into `grid` / `block`), text is `Typography.Text` / `Title` /
  `Paragraph`, links are react-router `Link`.
- **antd theme.** `ant/theme.tsx` (`AntTheme`, mounted in the shell, wraps antd `App`) resolves the
  theme variables (`--accent`, `--surface*`, `--border`, `--radius`, fonts, root size) on every
  `<html>` class / style change and turns them into antd tokens, so the tema paneli drives antd too
  (dark via `darkAlgorithm`, motion speed). Flat language: no shadows (overlays get a 1px ring), no
  wave, **no blur anywhere** (no `backdrop-blur` / `blur()`, opaque surfaces instead), `filled`
  fields, borderless cards; Turkish locale (`tr_TR`, dayjs `tr`). Component tokens only
  in `AntTheme`; everything else with Tailwind. Notifications through `App.useApp().notification`
  (`useNotify` in `ant/hr.tsx`, `pipeline.ts`).
- **One colour.** The primary colour is `--accent` (`bg-accent`, `text-accent-foreground`,
  `bg-accent-soft`, `text-accent-soft-foreground`, antd `type="primary"`). Everything else is neutral
  surfaces (`bg-surface`, `bg-surface-secondary`, `bg-background`, `text-muted`, `ring-border`…).
  `success` / `warning` / `danger` only for status (status tags, decision results). No per-box colours.
- **Theme.** Base theme changes go into `src/themes/synergy.css`; light / dark via `setColorMode` /
  `useIsDark` (`shared/themeSettings.ts`, writes `light` / `dark` class and `data-theme` on `<html>`;
  with no stored choice the mode is light, not the system's).
  The tema paneli (`shared/ThemePanel.tsx` + `shared/themeSettings.ts`; defaults (Karo: Mavi, Orta
  squircle, Serin, Plus Jakarta Sans, Kompakt, Dolu, İnce shadow — the theme file's
  `--surface-shadow` / `--field-shadow` match it; squircle falls back to round where unsupported), nav
  positions and four presets in `theme.ts`): presets (Kâğıt, Bulut, Keskin, Gün Batımı; each sets
  the look keys only, never nav / corner shape / motion; cards with a live preview drawn by writing
  `lookVars()` onto the preview box; "Özel" when nothing matches), primary colour (swatches only,
  `COLORS`, incl. Mercan and Zümrüt), Köşe yuvarlaklığı (one 3-column grid of six options with a
  corner preview each: Az / Orta / Çok (`RADII` 0.25 / 0.5 / 1rem, presets use these too) on the
  top row round, on the bottom row squircle; the radius drives **everything**: cards, the dock and
  start box (`CARD_RADIUS` in `ant/ui.tsx`, px via `useRadiusPx` for Motion), tabs and their flares
  (`TAB_RADIUS` in `tabs/shape.ts`: radius × 2, capped at 16px × `--corner-scale`, like the card's
  32px cap), and circles / pills (`--pill-radius`: the field radius, full only at Çok); squircle writes
  `--corner-shape: squircle`, `--corner-concave: superellipse(-2)` (tab flares) and `--corner-scale`
  (radius and the radius caps — card 32px, field 14px… — × 1.6 so corners stay as full; caps read
  in `AntTheme` and the CSS card radius); squircle options disabled with a note and nothing
  written when the browser can't draw it (`SQUIRCLE_SUPPORTED`)), background
  (Nötr / Serin / Sıcak / Beyaz + four tints from the primary hue: Benzer −30°, Dörtlü +90°, Üçlü
  +120°, Zıt +180° (`HARMONY`); options show a colour dot), one font for headings and text (default Plus Jakarta Sans; also the theme file's Bricolage + Inter pair, Inter, Bricolage, Figtree, Geist, Outfit), density
  (root size + `--spacing` together), nav position, trail style (Yumuşak / Dolu,
  `useLook().trail`), card style (fill via `--surface`: Dolu / Çerçeveli / Yükseltilmiş / Tonlu /
  Gri), card shadow (`--surface-shadow`, 6 levels incl. Renkli = accent-tinted glow, never `none`: it shares one `box-shadow` list with
  the ring and would void it), contour (`--border-width`, 0–3px; Çerçeveli ≥ 1), animation level /
  speed. Every card uses `CARD` (`ant/ui.tsx`). Card style / shadow / contour also drive antd form
  fields and outlined buttons through `--field-fill` / `--field-hover` / `--field-border-width` /
  `--field-shadow` (resolved in `AntTheme`): contour > 0 → `outlined` fields with that border width,
  contour 0 → `filled`; field shadow is a scaled-down card shadow (ConfigProvider `className`).
  Every tab strip (form tabs, workflow boxes, Başlangıç categories) is the shared `tabs/` module (see
  below); strips start container corner + tab radius in, so the selected sheet's flare lands on the
  container's straight edge. Only the variables of changed settings are written
  inline on `<html>` while the shell is mounted; all are removed on unmount. Nav position, trail and
  motion reach pages through `LookContext` / `useLook()`. Page transition is a fixed fade; the side
  info scroll fade is always on. No other runtime theming.
- Radius comes from `--radius` through Tailwind's scale (`rounded-xl` tiles, `rounded-2xl` cards,
  `rounded-3xl` blocks, `rounded-full` pills). Fonts: default sans (Inter), `font-display` (Bricolage
  Grotesque, headings and big numbers). **No monospace font anywhere** (no `font-mono`, no JetBrains
  Mono; antd `fontFamilyCode` = the selected font); numbers use the selected font, `tabular-nums`
  where columns must align. Font files load from `index.html`.

## Features mirror the original Synergy UI

Source: `/Users/ismailkurbanyilmaz/Documents/synergy/src/web` (`WebInterface/src/modules/dashboard`,
`modules/workflow`, `modules/hr`, `app-main`). Before adding anything, find it there; labels come from
its tr_TR localization. **Don't invent features** (no snooze / remind / undo, urgency labels, keyboard
shortcuts, read/unread toggles, notification dots…). Backend-only features (realtime sockets,
delegation checks, e-signature, event forms, edit lock, AI assistant, admin tools) are left out.
**No charts.** Counts only where the original shows them (greeting sentence, category blocks, process
lists, date-group rows).
Exception, added on explicit request: Başlangıç is a **widget board** (`dashboard/`) with presets and
extra widgets (clock, weather with sample data (no API request), a local keyword-based demo
assistant — no AI backend —, calendar, controls, notes); don't extend it further without being asked.

## Structure (`src/synergy/`)

Routes are in `src/router.tsx`: `/calisma-alani` (Başlangıç), `/uygulamalar/:appId`,
`/is-akislari/:box[/:processId[/:requestId]]`, `/insan-kaynaklari/:module[/:recordId]`.
`/uygulamalar/:appId` and the request detail render the same `DetailPage` under one page key
(`'forms'` in `pageOf`), so moving between them keeps the open form groups.

- `index.tsx` › `AppShell`: chrome as separate floating panels on one side, set by tema paneli ›
  Gezinme: "Solda" = left column with logo + back / forward, the dock (`StartDock` in
  `StartMenu.tsx`, morphs into the start menu: 85 % of the viewport high when the nav is on the left, 55 % of the
  viewport wide (min 44rem) when it is on top; its İş Akış Yönetimi section is the Başlangıç İş
  Akışları widget (`WorkBlock` from `StartPage.tsx`, in its own `LayoutGroup`); its section column is icon-only (labels in tooltips); no user card or "Ana sayfaya dön" inside) and actions / profile; "Üstte" = three columns: logo +
  back / forward | centered dock | actions / profile; "İkisi de" = the left column without back /
  forward plus a slim top bar (`CrumbBar`, a logo-high 34px box with the 28px pills centred in it,
  page-colour strip behind) holding compact back / forward and the animated `Crumbs` (earlier levels
  icon-only, current level named, `ChevronRight` separators; Başlangıç shows its home pill too); the dock
  is then fixed (`DockPath still`: no path pills, every app stays a circle in place; only the accent fill
  moves to the active app's circle, Başlangıç filled only on Başlangıç); content starts 14 spacing units down (56px at default density; `CHROME_SPACE.both`, `--chrome-top`
  and the bar's page-colour strip use the same unit, so the strip never covers a card's top line). The breadcrumb lives in the dock as nested pills
  growing out of the Başlangıç circle (`DockPath`: Başlangıç › active app › sub-levels, each pill tucked
  under the previous one, the other apps after the path) and in full in the start menu ("Buradasınız"); the chrome height
  reaches sticky page parts as `--chrome-top`; only the dock has a surface; below 640px a top bar +
  `Drawer`.
- `StartPage.tsx`: widgets for greeting, Favoriler / Son Kullanılan Uygulamalar, and the work block
  (5 category tabs — the shared `TabStrip`, `sizing="fill"`, sheet on the card surface with the card
  contour running down the flares into the card's top line (`SHEET_ON_SURFACE`); the work card is
  their `tabpanel` — + process groups ↔ "Süreç Talepleri"; `WorkBlock`, exported for the start
  menu, so its DOM ids come from `useId`).
- `dashboard/`: `model.ts` (widget kinds with supported sizes, presets, per-preset layout saved in the
  browser), `Dashboard.tsx` (react-grid-layout board with edit mode — drag, resize snapping to the
  nearest supported size, size menu, add / remove, reset — styled through Tailwind selectors on its
  classes, no library CSS; row height fitted to the visible area so the page never scrolls, presets
  tile 12 × 9 with no gaps and `fillGaps` grows neighbours into any empty cell (view mode and on
  "Bitti"); resize is free (min = smallest supported size), the view picks the nearest supported size;
  stacked below 960px), `widgets.tsx` (the extra widgets).
- İş Akış Yönetimi: `WorkflowPage.tsx` + `RequestGrid.tsx` + `rows.tsx` (boxes as agenda tabs incl.
  Geçmiş (`AgendaTabs.tsx`: the shared `TabStrip` with links, `sizing="content"`, a "Geçmiş" group
  label; content through `ContentSwitch`), search / sort / date range on top of the process list, process list
  (20 %) + request grid with date buckets / sort / paging, fast approve, draft delete). Nothing is
  selected automatically: `/is-akislari` (`WF_HOME`; breadcrumb, dock and app links) has no box
  selected ("Görüntülemek için bir öğe seçin", 104028), a box has no process selected ("Süreç
  taleplerini görmek için bir proje/süreç seçin", 104054 / drafts 104146);
  `DetailPage.tsx` + `DetailSide.tsx` + `DetailTiles.tsx` + `FormTabs.tsx` + `FormFields.tsx` (Flow
  Viewer, editable form fields (uncontrolled `defaultValue`, nothing is saved; never `readOnly` /
  `disabled`) — long ones size with CSS `field-sizing: content` (no antd
  `autoSize`: its layout-effect measuring looped into "Maximum update depth"); the breadcrumb ends
  with the form's name (`process.form`), not the code; the header band shows the process icon and
  name only (no project name, no status tag); the floating strip after scrolling has the events
  at the far left and only the form's name at the far right (event rows never wrap: band, strip and
  the phone's bottom bar scroll sideways, `ACTIONS_SCROLL` / `ACTIONS_DOCK`); the form row reaches the bottom of
  its container (`useFillHeight` against the page or the form tab's pane); side info = a Dokümanlar card above an Özellikler / Tarihçe
  card, each half of the side column / sheet with its own scrolling (`FadeScroll`: edges fade
  through a CSS mask driven by `useScroll`), laid out
  by the pane's measured width, not the viewport: ≥ 52rem a sticky ⅓ column that
  folds to an icon rail (remembered), narrower (a split pane, e.g. `panelSize` 1) no rail: an info
  button in the header band (and the scrolled strip; `SideButton`) opens a sheet that takes the form
  card's place (the card is hidden, stays mounted so typed values survive; nothing scrolls behind,
  the scroll position is restored on close), wipes down from the top (`clipPath`, "Az" fades only),
  closes with its button / Esc / showing a document; focus goes to its close button and back to the
  info button. Phones below the form at natural height. Side motion (Motion): the cards enter one after the other from the
  rail side and leave in reverse (`AnimatePresence` + variants with `stagger`; column swap with the
  rail via `popLayout` + `anchorX="right"`); the column width switches in one step and the form card
  follows with a layout animation (`layout` + content `layout="position"`, px corner radius); the
  Özellikler / Tarihçe is an antd `Segmented` (block) and the content enters from the chosen
  side's direction (`mode="wait"`); between Geri / İleri the "Süreçler" trail — added on explicit request, not in the
  original: one tick per request of the list it was opened from (the current request's page of 8)
  with its position below (e.g. 2 / 8);
  pressing it opens a popover with that list as the workflow DataGrid — same columns, date groups,
  unread bold, current row selected, search and paging, row click opens the request); child forms open from form buttons into `FormTabs.tsx` by the child
  process's `panelSize` (original `viewOptions.panelSize`, a 3-unit strip): 1 / 2 split the tab
  (child right ⅓ / ⅔; in a split the opener stays beside the new child and the other form moves to
  its own tab, returning when the child closes), 3 opens a new tab, so a split pair becomes one
  grouped tab; a form has one open child at a time (opening another closes the previous one with
  its children, as in the original); below 1024px (size 2: 1200px) everything opens as 3. The
  rules live in `shared/formTabs.ts` (pure reducer); form groups (each request opened from the
  Süreçler trail, and each menu app form, is its own group, max 6, colours `--group-1…6`, all groups' tabs shown, root tab
  first and the group's drag handle) in `shared/formGroups.ts`. `FormTabs.tsx` composes the shared
  `tabs/` module: `TabStrip` › `TabGroup` › `ViewTab` (a split tab shows both forms with a 1px
  divider; the focused one gets the selected colour) and one `Pane` per open form. Forms are built
  once per pane (`renderRoot` / `renderTab` stable, elements cached per key, `OpenChildContext`
  stable per group), so a switch re-renders two tabs and two panes, never a form. Panes never move
  in the DOM: each has a fixed absolute box (single = whole container, split = left / right by its
  view's ratio, inline `width`); hidden ones are `content-visibility: hidden` (layout kept, scroll
  kept, not focusable / painted; toggling restyles only the pane). Selecting, opening and closing
  are transitions (`startTransition`), so the click task stays ~1–2 ms. Motion: panes `layout` +
  `layoutScroll` measured only through `layoutDependency={moved}` (visible before and after), content
  `layout="position"`, px radius via `style`. Tab switch: the new pane enters from the tab's
  direction (30px + fade), the old one fades out in place underneath (`data-entering` replays the
  header cue). A side pane opened in the same tab (1 / 2, "Yan yana aç") pushes in from the container
  edge while the opener shrinks; closing pushes it out to its side while the other grows; both start
  on Motion's frame loop (`frame.update`). A form shown alone fades in place when closed; swap /
  shift / ungroup / ratio are layout animations; the divider slides with a MotionValue (it is not a
  layout node). Dragging the divider writes the two panes' widths and its own `left` directly (no
  React render, no Motion; `data-resizing` on the container). The container clips with
  `overflow-clip` only in tabs mode and while the last child leaves; a lone form (page mode) is in
  flow and not clipped. Clip only where needed: a clip box cuts the 1px card ring and the card
  shadow of anything at its edge (e.g. the İK edit card's slide wrapper clips only while its width
  animates, via a motion value). Every form that enters (root, child, Geri / İleri) shows
  `FormSkeleton` (`DetailTiles.tsx`) for `LOAD_MS` (1 s, mock server delay) while the form is
  pre-rendered behind it in a hidden `<Activity>` (React renders it at idle priority, no effects);
  at `LOAD_MS` it becomes visible and crossfades in once;
  `flow.tsx` (decision dialogs, also used by Başlangıç and İK).
- Menu app forms (dummy content, added on explicit request; replaced the "Yakında" page): every
  menu app except İş Akış Yönetimi opens its form as a form group (root id `app:<appId>`,
  `shared/appForms.ts`; `AppViewer` in `DetailPage.tsx`, body in `AppForm.tsx`). As in the
  original, a menu item opens one panel, and opening it again switches to its group. Two kinds
  mirror the original menu actions:
  - StartAProcess (Satın Alma Talebi, Yıllık İzin Talebi, Masraf Bildirimi, Araç Tahsis Talebi,
    Toplantı Odası Rezervasyonu) is a start form with the buttons "Gönder", "Taslak Olarak
    Kaydet" and "İptal".
  - FillAForm (Tedarikçi Listesi, Personel Rehberi, Bütçe Takip Raporu, Kalite Dokümanları, Stok
    Durum Raporu, Eğitim Kataloğu) is an application form with filter fields and a list table,
    plus "Kaydet" and "Kapat".

  Each form has the request viewer's band and sticky strip and a form card filling the container.
  There is no Geri / İleri, side info or history. Fields are editable and nothing is saved:
  - "Gönder" shows "{caption} gönderildi." and closes the group.
  - "Taslak Olarak Kaydet" and "Kaydet" only notify.
  - "İptal" and "Kapat" close the group; the last group returns to Başlangıç.

  The breadcrumb is Başlangıç › app. Dates are relative to today.
- `hr/`: İnsan Kaynakları (original `modules/hr`): module navigator, band with search / company /
  status filters, sortable paged table and a slide-in edit card, all driven by `hr/modules.ts`;
  company admins and property relations have their own views (`HrSpecial.tsx`). Data and in-memory
  store in `shared/hrData.ts`.
- `AllApps.tsx` ("Tüm uygulamalar" panel: search, order ↔ alphabetic sort, collapsible app tree from
  `shared/menuTree.ts`; no menu editing), `AppForm.tsx` (menu app form body), `paths.ts`, `theme.ts`, `motion.tsx`
  (`MotionScope`, `useTransition`, `useLeaving`, `PageTransition`).
- Brand (Bimser Synergy): `assets/brand/` — `icon.svg` / `icon-dark.svg` (four-colour mark; dark
  theme has a white centre) and `wordmark.svg` / `wordmark-light.svg` ("bimser synergy"), cut from
  the official logo SVGs; the shell logo is the mark (+ wordmark in the top nav and the phone bar),
  `public/favicon.svg` is the mark. Page transition: fade.
- `ant/`: shared antd pieces — `theme.tsx` (`AntTheme`), `modal.tsx` (`SoftModal`: every dialog;
  antd's zoom off, the panel springs in from 96 % via `modalRender` + Motion and fades out before
  antd closes it, also when a parent unmounts it inside `AnimatePresence` (`usePresence`; a closed
  dialog releases at once, otherwise page transitions would wait forever); mask fades via
  `starting:`), `ui.tsx` (`cn` (tailwind-merge), `IC`,
  `MotionFlex`, `Tip`, `TintIcon`, `StatusTag`, `Scroll`, `CARD`), `parts.tsx` (`SearchField`,
  `SortMenu`, `RangeFields`, `EmptyNote`, `CellValue`, `GroupLabel`, `compareBy`, `useBand`), `grid.tsx`
  (`GRID_TABLE` Tailwind skin for antd `Table`, row classes, `ViewSwitch` remembered per grid kind via
  `useGridView`, `CardList` / `CardGroup` / `GridCard`, `GridFooter` with page size + pagination),
  `motion.tsx` (`Indicator`, `Count`), `hr.tsx` (`useNotify`).
- `tabs/`: the one tab system (every strip and content switch in the app):
  - `TabStrip.tsx`: `TabStrip` (scrolling row, WAI-ARIA tablist keyboard — arrows / Home / End move
    focus, Delete closes — or `nav` links, the selected sheet, sizing, closing freeze, drag),
    `TabGroup` (label or coloured dot + 2px underline, drags as a unit from its `handle` tab),
    `Tab` (slot: hover pill, separator, context menu, drag), `TabButton` (role=tab button or `Link`;
    the label reserves its semibold width so selecting never changes a tab's width), `TabClose`
    (visible on the selected tab, on hover / focus otherwise; hidden in icon-only tabs). Chrome
    model: flat inactive tabs, 1×16px separators hidden next to the selected / hovered / focused tab,
    hover pill (group tint in coloured strips), one selected sheet that merges into the container
    with concave flares; in coloured strips a 2px ring in the group colour that meets the underline,
    label neutral semibold; single group no ring, label `text-accent-soft-foreground`. The sheet is
    three transform-only parts (start cap, scaled middle, end cap; MotionValues, no React render)
    placed from cached tab positions (read only in the ResizeObserver callback and when the
    structure — `layoutKey` / per-group `layoutKey` — changes, never on a plain switch), snapped to
    device pixels, middle 1 device px under the caps (no seams). Sizing `chrome`: tabs grow equally
    from 0 and stop at their natural width (`max-w-max`), the selected one keeps `min(9rem, natural)`
    (`--nat`), inactive ones go down to 2.75rem and become icon-only below 5rem (`data-compact`, both
    written by the observer, no React render), then the strip scrolls; `content` natural width;
    `fill` equal shares. Closing freeze: a pointer close while tabs are squeezed locks the row's width
    (minus the closed tab or group) until the pointer leaves the strip (+40px below, +60px at the
    end), 2s after a touch close, or the structure changes. Drag is manual (Motion `drag` measures on
    every render): threshold 16 × width / 256, swap when the leading edge crosses the neighbour's
    centre, one swap per move until the new order renders, auto-scroll within 48px of the edges,
    spring back on release; touch uses the context menu.
  - `shape.ts`: class strings (`TAB_RADIUS`, `STRIP_VARS`, `TAB_BG`, `SHEET` / `SHEET_RING` /
    `SHEET_ON_SURFACE`, caps and middle, `PILL`, `SEPARATOR`, `GROUP_TONE` / `GROUP_LINE` /
    `GROUP_DOT`). Flares: with `corner-shape` a `scoop` (squircle: `--corner-concave`) box whose ring is
    a real border; otherwise (Safari, Firefox) a transparent box with a convex corner, the ring as its
    border and the fill as an unoffset spread shadow clipped to the corner square. No radial-gradient
    bands.
  - `Panes.tsx`: `Pane` (memo; box, visibility, enter / leave / push / exit motions, skeleton +
    hidden `<Activity>` pre-render) and `Divider`. `context.ts`: `OpenChildContext` / `useOpenChild`,
    `PaneContext` / `useTabScroller` (value never changes on a switch).
  - `ContentSwitch.tsx`: the direction-aware content switch (workflow boxes, İK sections): new
    content enters 30px from the change's direction with a fade, the old one fades out in place
    (`popLayout`). `motion.ts`: the single timing table (`useTabMotion`: sheet spring
    `visualDuration` 0.3, content in 0.3s / out 0.16s, panes 0.42s, tab in 0.2s, shift 0.2s
    ease-in-out, drop spring 0.25, strip 0.34 / 0.16, reveal 0.32; "Az" = fades only, "Kapalı" =
    instant, speed divides durations) and `useDirection`.
  - `widths.ts`: pure decisions with a self-check (`scripts/tabs/widths.test.mjs`): icon-only
    threshold, narrow-tab top radius, drag threshold, swap target, closing freeze reducer.
- `shared/`: data and logic — `workflowData.ts` (people, boxes, processes, events, columns, date
  buckets, menu apps, formatting), `decisions.ts` (in-memory store: `decide`, `markRead`,
  `deleteDraft`, `togglePin`; read through `useBoxRequests` / `useBoxCounts` / `useRequest` /
  `useMenuApps`), `pipeline.ts` (decision pipeline logic: confirm → required documents → reason →
  forward → `decide()`; `flow.tsx` draws the dialogs), `formTabs.ts` (form tab / split state),
  `formGroups.ts` (form groups), `appForms.ts` (menu app forms), `transition.ts` (`scaleTransition`, `INSTANT`), `grid.ts`,
  `ThemePanel.tsx` /
  `themeSettings.ts`, labels (`startLabels.ts`, `flowLabels.ts`), `historyView.ts`, `range.ts`,
  `remembered.ts`, `hooks.ts`, `tokens.ts`.

## Performance rules (tab system; measured, see `docs/tab-system-rewrite.md`)

- Measure on the production build: `npm run build && npx vite preview --port 4173 --strictPort`, then
  `node scripts/perf/tabs.mjs --out <file>.json` (scenario A–H, median of 3 rounds, 4× throttled
  A–D), `node scripts/perf/interactions.mjs` (interruptions, drag, keyboard, divider, closing freeze,
  all animation levels), `node --test scripts/tabs/widths.test.mjs`, `node scripts/perf/shots.mjs`
  (strip screenshots, both flare paths). Never report dev-server numbers.
- A context value that changes on a tab switch re-renders every form: keep `LookContext`,
  `SettingsContext`, antd `ConfigProvider` props (memoized config, constant `wave` / `card`),
  `PaneContext` and `OpenChildContext` stable; build pane elements once per key; pass stable
  callbacks / elements (`placeholder`) to `memo` parts.
- Every Motion `layout` / `layoutId` node needs a `layoutDependency` that changes only when its box
  can change (the dock too): a node without one snapshots on every render and forces a style /
  layout flush before the commit. Don't nest `layout` nodes needlessly; never use `drag` on tabs.
- Don't put a custom property that changes on interaction on a large container (it restyles the
  whole subtree); write per-element inline values instead. Hiding big subtrees: `content-visibility`
  is cheap, `visibility` / `pointer-events` / `inert` toggles restyle the whole subtree (5–20 ms per
  form), `display: none` re-lays it out on show.
- `<Activity mode="hidden">` re-runs every mount effect (antd's measuring, Motion remounts with
  replayed entrance animations) on reveal: use it only for one-time pre-rendering, not for switching.
- Hooks that keep an element in state must ignore ref detaches (`useAttach`) and skip measuring when
  the element has no boxes (hidden pane), or hiding / showing re-renders the whole form.

## Approved exceptions (tab system rewrite)

The tab radius cap (`TAB_RADIUS`); 2px group ring and underline (card contours stay 1px); neutral
selected label in coloured strips; separators and a hover pill on inactive tabs; close button only on
hover / focus for inactive tabs; Chrome-style width distribution with icon-only tabs; the closing
freeze; the shared `tabs/` module replacing `AgendaTabs.tsx`'s `FLARES` / `AGENDA_PAGE`, the
StartPage category constants, `SwitchPanel` and `DirectionalPanels`.

## Gotchas

- An empty antd `Flex` is `display: none`, and a non-empty one lays out as a row: give block-level or
  empty boxes (indicators, spacers, scroll targets, measured containers) `block`.
- antd `Tooltip` and `Dropdown` / `Popover` can't share one trigger: wrap the dropdown in a `Flex` and
  put the `Tip` around that.
- Row actions inside clickable table rows / cards stop click propagation, so they don't also open the
  row.
- antd `Typography` sets its own colour; use `text-current!` (or `!` utilities) when a label must
  follow its parent. antd hover backgrounds (text buttons) may need `hover:…!` to keep the design.
- The start menu closes when focus leaves it for another element inside `#root`; focus moving into
  a portal outside `#root` (a dropdown, a decision dialog opened from the menu) keeps it open, and
  Esc inside such a portal closes only the portal.
- Tailwind only sees literal class names: never build variants like `${PREFIX}:hidden` in a template.
- antd `Flex` panes are `display: flex`: absolute panes need `block` too, or their content shrinks to
  max-content width.
