# CLAUDE.md

The **Synergy** UI: React 19 + **antd v6** + Tailwind CSS v4 (Vite, react-router, lucide-react icons,
framer-motion). Everything lives in `src/synergy/`. Code comments are written in Turkish; follow that.

## Hard rules

- **No CSS.** Style with Tailwind utilities (arbitrary values / variants are fine) and antd props
  (`className`, semantic `classNames`). No `.css` files, `<style>` or `@apply` beyond the two files
  below; inline `style` only for truly dynamic numbers (e.g. a dragged splitter width).
  - `src/index.css`: the layer order `@layer theme, base, antd, components, utilities;` (antd's
    styles live in `@layer antd`, so Tailwind utilities always beat them), antd's prebuilt component
    CSS (`@import 'antd/dist/antd.css' layer(antd)`, zero runtime), `@import 'tailwindcss'`,
    the theme import, Tailwind `@theme` keys mapping the theme variables to colours / radii / shadows
    (`bg-accent`, `text-muted`, `ring-border`, `rounded-2xl`…) plus `font-display` (`font-mono` removed: `--font-mono: initial`), the
    animation keys (`animate-*` keyframes scaled by `--motion-time` / `--motion-shift`), base rules
    for border-colour inheritance (`var(--border)`), the corner shape (`corner-shape:
    var(--corner-shape, round)` on every element and pseudo-element, no exceptions) and the thin,
    track-less scrollbars, the two measured sizes registered non-inherited (`@property --fill-h`, `--view-h`), and one
    `@layer components` block that points antd's circle / pill shapes
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
  (dark via `darkAlgorithm`, motion speed). **Zero runtime**: `zeroRuntime: true` from the very
  first render (antd freezes it per component at mount; `FIRST` before the variables resolve), the
  component rules come from `antd/dist/antd.css` (in `@layer antd`, `src/index.css`); at runtime
  antd only writes the `--ant-*` variables (global and component tokens, CSS variables mode
  `cssVar: { key: 'synergy' }`, `.synergy` scope, `StyleProvider layer`) plus the small icon reset.
  The prebuilt rules read only those variables, so theme changes (tema paneli, light / dark, our
  component tokens) apply live, no reload; the prebuilt file's own variable blocks are scoped to its
  build key (`.css-var-_R_0_`…) and never match. `hashed: false` (one antd, one theme; the prebuilt
  selectors are unhashed too). `tokensOf` stays runtime-neutral (the design package uses it without
  the prebuilt CSS). Checked by screenshot diff against runtime mode (pages, overlays, dark,
  outlined fields, presets: identical) and a live panel change against a fresh load. Flat language: no shadows (overlays get a 1px ring), no
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
  squircle, Serin, Plus Jakarta Sans, Sıkı, Dolu, no shadow (Yok), Gezinme Solda — the theme file's
  `--surface-shadow` / `--field-shadow` match it; squircle falls back to round where unsupported), nav
  positions and four presets in `theme.ts`): presets (Atölye, Kuzey Işığı, Şafak, Lacivert; each sets
  the look keys only (texture included), never nav / corner shape / motion; cards with a live preview drawn by writing
  `lookVars()` onto the preview box; "Özel" when nothing matches), primary colour (swatches only,
  `COLORS`, incl. Mercan and Zümrüt), Köşe yuvarlaklığı (one 3-column grid of six options with a
  corner preview each: Az / Orta / Çok (`RADII` 0.25 / 0.5 / 1rem, presets use these too) on the
  top row round, on the bottom row squircle; the radius drives **everything**: cards, the dock and
  start box (`CARD_RADIUS` in `ant/ui.tsx`, px via `useRadiusPx` for Motion), tabs and their flares
  (`TAB_RADIUS` in `tabs/shape.ts`: radius × 2, capped at 16px × `--corner-scale`, like the card's
  32px cap; the workspace strip and back / forward are always round, at the round theme's radius,
  even in squircle: `TabStrip round`, `ROUND_STRIP_VARS` / `ROUND_TAB_RADIUS`), and circles / pills (`--pill-radius`: the field radius, full only at Çok); squircle writes
  `--corner-shape: squircle`, `--corner-concave: superellipse(-2)` (tab flares) and `--corner-scale`
  (radius and the radius caps — card 32px, field 14px… — × 1.6 so corners stay as full; caps read
  in `AntTheme` and the CSS card radius); squircle options disabled with a note and nothing
  written when the browser can't draw it (`SQUIRCLE_SUPPORTED`)), background
  (Nötr / Serin / Sıcak / Beyaz + four tints from the primary hue: Benzer −30°, Dörtlü +90°, Üçlü
  +120°, Zıt +180° (`HARMONY`); options show a colour dot), background texture (Zemin dokusu: Düz —
  the default, writes nothing — / Nokta / Kareli and six gradients from the primary colour: Üstten,
  Alttan, Köşe, Işık, Çapraz, Aurora (hue ±40°); `TEXTURES`, written as `--background-texture` /
  `--background-texture-size`, painted by a viewport-fixed `before:` layer on the shell root
  (`isolate`, so the layer sits above the root's colour and under the content) and, with `bg-fixed`,
  on the chrome's page-colour strips so they line up with it; options show a mini swatch), one font for headings and text (default Plus Jakarta Sans; also the theme file's Bricolage + Inter pair, Inter, Bricolage, Figtree, Geist, Outfit), density
  (root size + `--spacing` together), nav position (Solda / Üstte / Kompakt, each option with a mini preview of the bar's side), card style (fill via `--surface`: Dolu / Çerçeveli / Yükseltilmiş / Tonlu /
  Gri), card shadow (`--surface-shadow`, 5 levels Yok / İnce / Hafif / Belirgin / Derin, never `none`: it shares one `box-shadow` list with
  the ring and would void it), contour (`--border-width`, 0–3px; Çerçeveli ≥ 1), animation: Animasyon Açık / Az / Kapalı ("Az"
  and "Açık" are presets for the controls below; Kapalı hides them), Sekme içeriği Tam / Solma /
  Kapalı (pane and `ContentSwitch` transitions, not the strip), Kayma ve büyüme / Sekme şeridi /
  Sayılar Açık / Kapalı (what "Az" turns off: Motion transforms and CSS `--motion-shift`; sheet
  slide and tab shift; count-up), Yüklenirken İskelet / Döner simge / Kapalı (`FormLoading`, the
  work block's rows), speed; pages read the effective values from `useLook().anim`. Every card uses `CARD` (`ant/ui.tsx`). Card style / shadow / contour also drive antd form
  fields and outlined buttons through `--field-fill` / `--field-hover` / `--field-border-width` /
  `--field-shadow` (resolved in `AntTheme`): contour > 0 → `outlined` fields with that border width,
  contour 0 → `filled`; field shadow is a scaled-down card shadow (ConfigProvider `className`).
  Every tab strip (the workspace, Başlangıç categories) is the shared `tabs/` module (see
  below); strips start container corner + tab radius in, so the selected sheet's flare lands on the
  container's straight edge. Only the variables of changed settings are written
  inline on `<html>` while the shell is mounted; all are removed on unmount. Nav position and
  motion reach pages through `LookContext` / `useLook()`. The side info scroll fade is always on. No
  other runtime theming.
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
Exception, added on explicit request: **app-wide tabs** (the workspace, `Workspace.tsx`) replace the
breadcrumb; the original opens panels side by side (`panelSize`), its "Yeni Sekmede" (101839) is only
for external links. With them come a right-click open menu and Ctrl / Cmd / middle-click to open in a
background tab (also on request; the only click modifiers in the app).

## Structure (`src/synergy/`)

`src/App.tsx` renders the shell; there is no data router. The shell owns its react-router `Router`
(`ShellRouter` in `Workspace.tsx`) with a location that never changes, and the workspace owns the
browser address (`useWorkspaceUrl`, history API). Pages live in the workspace's screens: each screen
renders the page routes with its own address (`screens.tsx`, `useRoutes(…, location)`) under its own
`RouteContext` and `LocationContext`:
`/calisma-alani` (Başlangıç), `/is-akislari[/:box[/:processId[/:requestId]]]` (a request under a list
opens over that list), `/talepler/:requestId` (a request in its own tab; child forms too),
`/uygulamalar/:appId`, `/insan-kaynaklari[/:module[/:recordId]]` (no module selected by default:
the navigator and "Görüntülemek için bir öğe seçin"). The browser address is the selected
tab's address plus the other tabs (`?sekmeler=`, `shared/workspaceUrl.ts`).

- `index.tsx` › `AppShell`: `Shell` (theme settings, providers) › `Frame` (inside `AntTheme`: holds
  the workspace state, `useWorkspaceUrl`, `ShellRouter`, chrome, main area, drawer, panels; the
  selected tab's app and back / forward reach the dock and history buttons through
  `ChromeNavContext`, the selected screen's path reaches the start menu (closes when it changes) and
  the app tree (current app) through `PlaceContext`, so a tab switch doesn't re-render the chrome,
  the phone drawer or the panels). Chrome as separate
  floating panels, set by tema paneli › Gezinme (`ChromePlace`: Solda / Üstte / Kompakt — Kompakt: no logo and no dock, only the start
  button at the head of the tab row (`Workspace` `lead`, before back / forward; the start menu morphs
  from that button, `StartDock place="compact"`, and opens top left), content runs to the screen's
  left edge (`CHROME_SPACE.compact`); Sağda / Altta
  were removed, stored values move to Solda / Üstte; tooltips and the start menu open toward the
  content; `CHROME_TIP`, `PLACE`). In both positions back / forward (`HistoryButtons`, two 32px buttons, 68px) sit in
  the tab strip's row left of the Başlangıç tab and the actions / profile (`ShellActions`: Sohbet,
  Duyurular, Tema ayarları, Koyu / Açık tema, avatar; 32px, tooltips and panels open downward) at
  its right end, so they take no height (`Workspace` `start` / `end`); the actions sit 4px above
  the tab centre. Back / forward look like part of the strip: no ring, the sheet's fill
  (`--tab-bg`), shaped like a hover pill (tab height − `--tab-gap`, top aligned with the selected sheet, corner `--tab-nr`, square
  buttons `--hb`), `--tab-gap` above the container line and from the Başlangıç tab; they overlap the
  strip's start inset (negative margin, `z-10`; further right only when the container corner needs
  it), while the inset keeps `--tab-f` so the selected sheet's flare isn't clipped by the scroller.
  "Solda" = left column
  with the logo (centred on the tab row) and the dock in the middle (three-row grid), the dock
  (`StartDock` in `StartMenu.tsx`, morphs into the start menu: 85 % of the viewport
  high when the nav is on the left, 55 % of the viewport wide (min 44rem) when it is on top; its İş
  Akış Yönetimi section is the Başlangıç İş Akışları widget (`WorkBlock` from `StartPage.tsx`, in its
  own `LayoutGroup`); its section column is icon-only (labels in tooltips); no user card or "Ana
  sayfaya dön" inside); "Üstte" = three columns: corner handle + logo | centered dock | empty (the
  handle — added on explicit request, a trial — is
  `AllAppsHandle`, a dotted tab stuck to the screen's left edge; it opens the "Tüm uygulamalar" panel
  floating 12px in from the edges, `AllAppsPanel floating`); the top bar is compact — 44px with 36px
  dock circles (`DOCK_SIZE.top`), smaller logo — and content starts at 68px (the bar's page-colour
  strip ends 1 spacing unit above: the card contour
  (`ring`) and shadow are drawn outside the box, so a strip ending exactly at the content would cover
  a card's top line). The start button sits in its own white card in front of the dock (above it on the left, left of it on top). The dock is fixed circles (`DockApps`), a thin divider, then the favourite apps (`DockMenuApps`, at most 6, the Favoriler widget's list) behind a star in the accent colour; pressing the star swaps them for the recent apps (clock icon) and back; an app opens like its menu entry (`useOpenApp`). Fixed circles: Başlangıç and the apps, the selected
  tab's app filled (a request in its own tab counts as İş Akış Yönetimi); a press switches to the
  app's tab (its list under a form counts) or opens one; Başlangıç and the logo select Başlangıç.
  Back / forward act on the selected tab's own history. Other shell links and `useNavigate` (start
  menu, Tüm uygulamalar, search) go through `ShellRouter`'s navigator: the workspace opens what they
  point at (switching to it if open). The chrome height reaches sticky page parts as `--chrome-top`; only the dock has a
  surface; below 640px a top bar + `Drawer`.
- Workspace (`Workspace.tsx`; state `shared/workspace.ts`, address `shared/workspaceUrl.ts`; added on
  explicit request): app-wide tabs. A tab is a screen (Başlangıç, İş Akış Yönetimi at a box / process,
  a request, a menu app form, an İK module / record) with its own history, or two screens side by
  side. Başlangıç is the pinned first tab (icon-only, can't close / move / split, its address never
  changes, so everything opened from it opens in a new tab); the strip is always shown, Başlangıç
  alone included, and every screen (Başlangıç too) scrolls in its own pane. Opening: here, new tab (after the source tab and earlier tabs it opened; from Başlangıç / the
  shell at the end) or beside (split). The same thing never opens twice: requests and app forms
  switch to their tab, lists only on an exact address match. A request opened from a list opens over
  it in the same tab (the list stays mounted, hidden; Kapat / back return to it unchanged); its band
  then has "Ayrı sekmeye taşı" (`popOut`: the same form screen moves to its own tab right after,
  `/talepler/:id`, its children and auto group with it; the list comes back). Open actions inside a
  screen (`ScreenEvents`, one capture handler per screen, portals included through the React tree):
  targets are page links (`a[href]`, same origin) and elements with `data-open-path` (request rows
  and cards: `/talepler/:id`; controls inside a row aren't targets, a card's own button
  `data-open-click` is); right-click opens one shared menu at the pointer (`OpenMenu`: Aç = the
  element's own click, Yeni sekmede aç, Yan yana aç on wide screens; not on Başlangıç, where the
  browser's menu stays); Ctrl / Cmd / middle-click open in a background tab. Menu and modifier opens
  allow a second tab of the same list; requests and app forms stay single. Request rows / cards also
  show a "Yeni sekmede aç" icon on hover / focus / touch (`OpenTabButton` in `rows.tsx`). The dock's
  right-click menu "Yeni sekmede aç" and Ctrl / Cmd / middle-click open a second tab of the app. Child forms
  open from form buttons by the child process's `panelSize` (original `viewOptions.panelSize`):
  1 / 2 split the opener's tab (child right ⅓ / ⅔; in a split the other screen moves to its own tab
  and returns when the child closes), 3 opens a new tab right after the opener in the opener's group
  (an automatic group is created if the opener has none); below 1024px (size 2: 1200px) everything
  opens as 3. A form has one open child at a time; the parent–child link survives any move: closing
  or navigating the parent closes its children. Automatic groups dissolve at one tab, aren't written
  to the address and become the user's once renamed / recoloured / joined; user groups (name, colour
  `--group-1…6`, collapse) are contiguous runs, max 6. Limit 12 screens besides Başlangıç (a list kept
  under a form counts; `isBlocked`, warning). Address: the path is the selected screen (a child's
  family root), `?sekmeler=` the other tabs in order with `*` for the selected one (`ia.` / `t.` /
  `u.` / `ik.` tokens, `a~b@40` split, `(ad.renk[.k];…)` user group); child forms aren't stored.
  In-tab navigation pushes a browser entry (Back steps back in the selected tab, closing a form over a
  list); switching, opening, closing and layout replace it. The address is written straight to the
  history (`pushState` / `replaceState`; the router's location never changes); browser back / forward
  (`popstate`) maps onto the selected tab's history in a transition started in the next task. Each
  screen renders the page routes with its own `RouteContext` / `LocationContext` (the shell's never
  reach it), its own `NavigationContext` navigator (pages' `Link` / `useNavigate` / `Navigate` stay in
  their screen), `ScreenContext` (`close`, `open`), `OpenChildContext` and a `LayoutGroup`, all built
  once per screen. Strip: `TabStrip` › one `TabGroup` per unit (Başlangıç, a group, or an ungrouped tab;
  units drag as a whole from their first tab) › `Tab` with one `ScreenLabel` per screen (icon + name
  from `screenMeta`, the tooltip gives the full path, which replaced the breadcrumb); context menu:
  Yan yana aç, Yer değiştir (a split tab, wide screens), Ayrı sekmelere ayır, Sola / Sağa taşı (Grubu … for a group's first tab), Bağlantıyı
  kopyala (the tab's own address), Kapat / Grubu kapat (built when it opens; "Yan yana aç" only while
  the selected tab is single; no pair button on the tab itself, so selecting never changes a tab's
  width; swap and separate only in this menu, no buttons at the strip's end). Screens are elements built once per screen and
  rebuilt only when that screen's state object changes, so a switch re-renders two tabs and two
  panes, never a page. Panes never move in the DOM: each has a fixed absolute box (single = whole
  container, split = left / right by its tab's ratio, inline `width`); hidden ones are
  `content-visibility: hidden` (layout kept, scroll kept, not focusable / painted; toggling restyles
  only the pane). Selecting, opening and closing are transitions (`startTransition`), so the click
  task stays ~1–2 ms. Motion: panes `layout` + `layoutScroll` measured only through
  `layoutDependency={moved}` (visible before and after), content `layout="position"`, px radius via
  `style`; a pane's Motion tree gets an empty `PresenceContext` (the pane runs its own exit through
  `usePresence`: Motion would otherwise measure the closing pane and play every inner exit). A pane
  is promoted to its own layer only while it enters or leaves (`will-change` with `data-entering` /
  leaving). A pane created hidden (restored from the address, opened in the background) sleeps:
  pre-rendered in a hidden `<Activity>`, woken when selected or in an idle period (one per idle
  callback), so a restored address paints only the visible screens first. Tab switch: the new pane enters from the tab's direction (30px + fade; a form closing over
  its list brings the list back from the left), the old one fades out in place underneath
  (`data-entering` replays the header cue). A side pane opened in the same tab pushes in from the
  container edge while the opener shrinks; closing pushes it out to its side while the other grows;
  both start on Motion's frame loop (`frame.update`). A screen shown alone fades in place when closed;
  swap / shift / ungroup / ratio are layout animations; the divider slides with a MotionValue (it is
  not a layout node). Dragging the divider writes the two panes' widths and its own `left` directly
  (no React render, no Motion; `data-resizing` on the container). The container clips with
  `overflow-clip`. Clip only where needed: a clip box cuts the 1px card ring and the card shadow
  of anything at its edge (e.g. the İK edit card's slide wrapper clips only while its width
  animates, via a motion value). Every form screen that enters (request, child, app form) shows
  `FormSkeleton` (`DetailTiles.tsx`) for `LOAD_MS` (1 s, mock server delay) while the form is
  pre-rendered behind it in a hidden `<Activity>` (React renders it at idle priority, no effects);
  at `LOAD_MS` it becomes visible and crossfades in once; other screens show at once. Pages fit the
  pane's height (`useFillHeight` / the dashboard's room against `useTabScroller()`) and lay out by
  the pane's width, not the viewport: container queries against the pane (`Pane` is `@container`)
  — `@xl` (36rem) where a page used `sm`, `@4xl` (56rem) for `lg`, `@6xl` (72rem) for `xl`, about
  the content width at those viewports — and width decisions in JS through `usePaneMin(rem, pane)`
  with the same threshold (İK's edit card beside / below the table). Viewport breakpoints stay only
  in the shell, dialogs / popovers (portals) and the phone checks (`max-width: 639px`: fixed bottom
  action bars).
- `StartPage.tsx`: widgets for greeting, Favoriler / Son Kullanılan Uygulamalar (in the horizontal
  sizes the tiles go to two rows, left to right, when the widget's own height allows: a size container
  query on its panel, `min-height: 13rem`), and the work block
  (5 category tabs — the shared `TabStrip`, `sizing="fill"`, sheet on the card surface with the card
  contour running down the flares into the card's top line (`SHEET_ON_SURFACE`); the work card is
  their `tabpanel` — + process groups ↔ "Süreç Talepleri"; `WorkBlock`, exported for the start
  menu, so its DOM ids come from `useId`; it is its own `@container`: two columns from `@xl`,
  category labels from `@3xl` of the block's width, in the dashboard and the start menu alike).
- `dashboard/`: `model.ts` (widget kinds with supported sizes, presets, per-preset layout saved in the
  browser), `Grid.tsx` (our own small grid, no library: absolute cells on a 12-column grid, drag and
  a corner resize handle with pointer events — the dragged cell is written directly, React renders
  only when the target cell changes —, placeholder, vertical compaction; `useWidth`),
  `Dashboard.tsx` (the board with edit mode — drag, resize snapping to the nearest supported size,
  size menu, add / remove, reset; row height fitted to the visible area so the page never scrolls, presets
  tile 12 columns with no gaps (Varsayılan 12 × 10: Karşılama 4×2 and Hava 4×1 beside Favoriler
  8×3, then İş Akışları 9×7 beside Saat 3×1 and Notlar 3×6; the others 12 × 9) and `fillGaps` grows neighbours into any empty cell (view mode and on
  "Bitti"); resize is free (min = smallest supported size), the view picks the nearest supported size;
  stacked below 960px), `widgets.tsx` (the extra widgets).
- İş Akış Yönetimi: `WorkflowPage.tsx` + `RequestGrid.tsx` + `rows.tsx` (boxes as chips in a white
  toolbar card above the page — not tabs: a tab strip inside a workspace tab blurred the hierarchy;
  `AgendaTabs.tsx`: links, the selected box filled with the accent, the others light grey, a
  separator + the "Geçmiş" label before the history boxes (no fill), font weight never changes with
  selection, the bar scrolls sideways when it doesn't fit; content through `ContentSwitch`), search / sort / date range on top of the process list, process list
  (20 %) + request grid with date buckets / sort / paging, fast approve, draft delete). Nothing is
  selected automatically: `/is-akislari` (`WF_HOME`; dock and app links) has no box
  selected ("Görüntülemek için bir öğe seçin", 104028), a box has no process selected ("Süreç
  taleplerini görmek için bir proje/süreç seçin", 104054 / drafts 104146); a row opens the request
  over the list in the same tab;
  `DetailPage.tsx` (`RequestPage`, `AppPage`) + `DetailSide.tsx` + `DetailTiles.tsx` + `FormFields.tsx` (Flow
  Viewer, editable form fields (uncontrolled `defaultValue`, nothing is saved; never `readOnly` /
  `disabled`) — long ones size with CSS `field-sizing: content` (no antd
  `autoSize`: its layout-effect measuring looped into "Maximum update depth"); the tab shows the
  form's name (`process.form`), not the code; the header band shows the process icon and
  name only (no project name, no status tag); the floating strip after scrolling has the events
  at the far left and only the form's name at the far right (event rows never wrap: band, strip and
  the phone's bottom bar scroll sideways, `ACTIONS_SCROLL` / `ACTIONS_DOCK`); the form row reaches the bottom of
  its container (`useFillHeight` against the page or the screen's pane); side info = a Dokümanlar card above an Özellikler / Tarihçe
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
  unread bold, current row selected, search and paging, row click opens the request in a new
  tab); Geri / İleri move the screen to the neighbouring request in place (replace; its children
  close; the content slides in from that side, `ContentSwitch`); Kapat closes the screen (over a list:
  back to the list; in its own tab: the tab); child forms open through the workspace (above);
  `flow.tsx` (decision dialogs, also used by Başlangıç and İK).
- Menu app forms (dummy content, added on explicit request; replaced the "Yakında" page): every
  menu app except İş Akış Yönetimi opens its form in its own tab (`/uygulamalar/:appId`, `AppPage` /
  `AppViewer` in `DetailPage.tsx`, data in `shared/appForms.ts`, body in `AppForm.tsx`). As in the
  original, a menu item opens one panel, and opening it again switches to its tab. Two kinds
  mirror the original menu actions:
  - StartAProcess (Satın Alma Talebi, Yıllık İzin Talebi, Masraf Bildirimi, Araç Tahsis Talebi,
    Toplantı Odası Rezervasyonu) is a start form with the buttons "Gönder", "Taslak Olarak
    Kaydet" and "İptal".
  - FillAForm (Tedarikçi Listesi, Personel Rehberi, Bütçe Takip Raporu, Kalite Dokümanları, Stok
    Durum Raporu, Eğitim Kataloğu) is an application form with filter fields and a list table,
    plus "Kaydet" and "Kapat".

  Each form has the request viewer's band and sticky strip and a form card filling the container.
  There is no Geri / İleri, side info or history. Fields are editable and nothing is saved:
  - "Gönder" shows "{caption} gönderildi." and closes the tab.
  - "Taslak Olarak Kaydet" and "Kaydet" only notify.
  - "İptal" and "Kapat" close the tab.

  Dates are relative to today.
- Form deck (modal / drawer forms; added on explicit request). The original menu item's "Şurada aç"
  (`openOnType`: panel / modal / drawer) is `MenuApp.openOn`, its panel size `MenuApp.panelSize`.
  Two dummy apps use it, "Sözleşme Talebi (Modal)" and "Ziyaretçi Kaydı (Drawer)", each with two
  levels of child forms (`CHILD_FORMS` in `shared/appForms.ts`).
  - Opening: menu links go through `useOpenApp` (`paths.ts`), and the Başlangıç tile uses
    `openDeck`. The deck opens over the current page. A child opens in the same place as its opener
    (original `handleOpenChildForm`).
  - State lives in `shared/formDeck.ts`: one deck, cards with `parent`, the front-to-back `order`
    and `parked`. A card has one child at a time: a new child closes the previous one with its
    children; the same form is raised instead. Closing a card closes its children; closing the
    root closes the deck.
  - Rendering (`FormDeck.tsx`, mounted in the shell): the whole deck is one antd `Modal`, used
    directly rather than `SoftModal`. Mask, focus trap, Esc and scroll lock come from antd; focus
    returns to the opener. Cards are Motion `Flex` boxes with `FLOATING_SURFACE`, so they use the
    card radius and squircle. All cards share the root's width (`panelSizeToWidth`) and height.
  - Behind cards are offset, shrunk and tinted toward the background, with their content `inert`
    and at most three visible. In a modal they shift up from the top; in a drawer they shift left,
    and cards slide in and out on the right.
  - Hovering a behind card's visible edge lifts it (drawer: name in a tooltip), and clicking it
    raises the card.
  - Esc and a card's close button close the front card. Clicking outside parks the deck: it shrinks
    to a faint 48px strip on the right edge, the mask, trap, Esc and scroll lock turn off, and the
    page works. Hovering the strip peeks it out; clicking it brings the deck back.
- `hr/`: İnsan Kaynakları (original `modules/hr`): module navigator, band with search / company /
  status filters, sortable paged table and a slide-in edit card, all driven by `hr/modules.ts`;
  company admins and property relations have their own views (`HrSpecial.tsx`). Data and in-memory
  store in `shared/hrData.ts`.
- `AllApps.tsx` ("Tüm uygulamalar" panel: search, order ↔ alphabetic sort, collapsible app tree from
  `shared/menuTree.ts`; no menu editing), `AppForm.tsx` (menu app form body, `APP_EVENTS`,
  `useAppEvent`), `FormDeck.tsx` (form deck), `screens.tsx` (screen routes, `screenMeta`,
  `isValidPath`), `paths.ts`, `theme.ts`, `motion.tsx` (`MotionScope`, `useTransition`,
  `useLeaving`).
- Brand (Bimser Synergy): `assets/brand/` — `icon.svg` / `icon-dark.svg` (four-colour mark; dark
  theme has a white centre) and `wordmark.svg` / `wordmark-light.svg` ("bimser synergy"), cut from
  the official logo SVGs; the shell logo is the mark (+ wordmark in the top nav and the phone bar),
  `public/favicon.svg` is the mark.
- `ant/`: shared antd pieces — `theme.tsx` (`AntTheme`), `modal.tsx` (`SoftModal`: every dialog;
  antd's zoom off, the panel springs in from 96 % via `modalRender` + Motion and fades out before
  antd closes it, also when a parent unmounts it inside `AnimatePresence` (`usePresence`; a closed
  dialog releases at once, otherwise page transitions would wait forever); mask fades via
  `starting:`; the form deck is the one exception), `ui.tsx` (`cn` (tailwind-merge), `IC`,
  `MotionFlex`, `Tip`, `TintIcon`, `StatusTag`, `Scroll`, `CARD`, `FLOATING_SURFACE` /
  `FLOATING_DRAWER`), `parts.tsx` (`SearchField`,
  `SortMenu`, `RangeFields`, `EmptyNote`, `CellValue`, `GroupLabel`, `compareBy`, `useBand`), `grid.tsx`
  (`GRID_TABLE` Tailwind skin for antd `Table`, row classes, `ViewSwitch` remembered per grid kind via
  `useGridView`, `CardList` / `CardGroup` / `GridCard`, `GridFooter` with page size + pagination),
  `motion.tsx` (`Indicator`, `Count`), `hr.tsx` (`useNotify`).
- `tabs/`: the one tab system (every strip and content switch in the app):
  - `TabStrip.tsx`: `TabStrip` (scrolling row, WAI-ARIA tablist keyboard — arrows / Home / End move
    focus, Delete closes — or `nav` links, the selected sheet, sizing, closing freeze, drag),
    `TabGroup` (label or coloured dot + 2px underline, drags as a unit from its `handle` tab),
    `Tab` (slot: hover pill, separator, context menu — items may be a function, built when it opens —,
    drag), `TabButton` (role=tab button or `Link`; the label is medium weight and never bold:
    selecting changes colour only, never a tab's width; it sits in a grid so a truncated label
    doesn't count toward the tab's minimum width), `TabClose` (visible on the selected tab, on hover /
    focus otherwise — opacity, its room stays; hidden in inactive icon-only tabs). Chrome model: flat
    inactive tabs, 1×16px separators hidden next to the selected / hovered / focused tab, hover pill
    (group tint in coloured strips), one selected sheet that merges into the container with concave
    flares; in coloured strips a 2px ring in the group colour that meets the underline, label
    neutral; single group no ring, label `text-accent-soft-foreground`. The sheet is three
    transform-only parts (start cap, scaled middle, end cap; MotionValues, no React render; their
    container is its own layer, `will-change-transform`) placed from cached tab positions (read in
    the ResizeObserver callback, and when the structure — `layoutKey` — changes in the next frame's
    read step (`frame.read`), never on a plain switch and never inside the commit), snapped to
    device pixels, middle 1 device px under the caps (no seams). No Motion layout animation in the
    strip: when the structure changes, tabs and groups slide from their cached old position to the
    new one (FLIP by hand: each has an `x` MotionValue — also used for drag —, set to the
    difference and animated to 0; a tab's difference minus its group's), so the strip never starts
    Motion's projection tree. Sizing `chrome`: tabs grow equally from 0 and stop at their natural
    width (`max-w-max`), down to 2.75rem, then the strip scrolls; selection never changes widths.
    Icon-only below 5rem (`data-compact`, written by the observer, no React render) from the width
    the tab would get (`fairShare`: equal share of the row, capped at each tab's natural width with
    its hidden / truncated label counted), not its own width (an icon-only tab's own width can't
    grow back); the selected icon-only tab shows its close button in place of the icon. When every
    share is below that threshold (`data-squeezed` on the row, also written by the observer) icon-only
    tabs and their groups drop the natural-width cap and fill their share (otherwise they stopped at
    the icon's width and left the rest of the row empty). `content`
    natural width; `fill` equal shares. Closing freeze: a pointer close while tabs are squeezed locks the row's width
    (minus the closed tab or group) until the pointer leaves the strip (+40px below, +60px at the
    end), 2s after a touch close, or the structure changes. Drag is manual (Motion `drag` measures on
    every render): threshold 16 × width / 256, swap when the leading edge crosses the neighbour's
    centre, one swap per move until the new order renders, auto-scroll within 48px of the edges,
    spring back on release; touch uses the context menu.
  - `shape.ts`: class strings (`TAB_RADIUS`, `STRIP_VARS`, `ROUND_TAB_RADIUS` / `ROUND_STRIP_VARS`
    (round corners and flares in squircle too, `round` strips), gap geometry: `--tab-gap` (3px),
    `--tab-nr` (a neighbour pill's corner) and the flare radius `--tab-f` = `--tab-nr` + gap, so the
    flare is concentric with a neighbouring hover pill or back / forward and the channel between them
    is one width everywhere (hover pill inset by the gap at the sides and bottom, its top level with the selected sheet; tab content and separators centred on the pill — slot `pb-(--tab-gap)` —, the close button as far from the pill's end as from its top and bottom; strip insets use `--tab-f`), `TAB_BG`, `SHEET` / `SHEET_RING` /
    `SHEET_ON_SURFACE`, caps and middle, `PILL`, `SEPARATOR`, `GROUP_TONE` / `GROUP_LINE` /
    `GROUP_DOT`). Flares: with `corner-shape` a `scoop` (squircle: `--corner-concave`) box whose ring is
    a real border; otherwise (Safari, Firefox) a transparent box with a convex corner, the ring as its
    border and the fill as an unoffset spread shadow clipped to the corner square. No radial-gradient
    bands.
  - `Panes.tsx`: `Pane` (memo; box, visibility, enter / leave / push / exit motions, skeleton +
    hidden `<Activity>` pre-render, sleeping until selected / idle) and `Divider`. `context.ts`:
    `OpenChildContext` / `useOpenChild`, `PaneContext` / `useTabScroller`, `ScreenContext` /
    `useScreen` (values never change on a switch), `PlaceContext` / `usePlace` (the shell's selected
    path).
  - `ContentSwitch.tsx`: the direction-aware content switch (workflow boxes, İK sections): new
    content enters 30px from the change's direction with a fade, the old one fades out in place
    (`popLayout`). `motion.ts`: the single timing table (`useTabMotion`: sheet spring
    `visualDuration` 0.3, content in 0.3s / out 0.16s, panes 0.42s, tab in 0.2s, shift 0.2s
    ease-in-out, drop spring 0.25, reveal 0.32; "Az" = fades only, "Kapalı" =
    instant, speed divides durations) and `useDirection`.
  - `widths.ts`: pure decisions with a self-check (`scripts/tabs/widths.test.mjs`): icon-only
    threshold, fair share, narrow-tab top radius, drag threshold, swap target, closing freeze
    reducer.
- `shared/`: data and logic — `workflowData.ts` (people, boxes, processes, events, columns, date
  buckets, menu apps, formatting), `decisions.ts` (in-memory store: `decide`, `markRead`,
  `deleteDraft`, `togglePin`; read through `useBoxRequests` / `useBoxCounts` / `useRequest` /
  `useMenuApps`), `pipeline.ts` (decision pipeline logic: confirm → required documents → reason →
  forward → `decide()`; `flow.tsx` draws the dialogs), `workspace.ts` (workspace state: screens,
  tabs, groups, histories; pure reducer, self-check `scripts/tabs/workspace.test.mjs`),
  `workspaceUrl.ts` (address ↔ state), `scrollBarSize.ts` (replaces rc-util's scrollbar measurement
  through a `vite.config.ts` alias: measured once at idle), `appForms.ts` (menu app forms), `formDeck.ts` (form deck), `transition.ts` (`scaleTransition`, `INSTANT`), `grid.ts`,
  `ThemePanel.tsx` /
  `themeSettings.ts`, labels (`startLabels.ts`, `flowLabels.ts`), `historyView.ts`, `range.ts`,
  `remembered.ts`, `hooks.ts`, `tokens.ts`.

## Performance rules (tab system; measured: `scripts/perf/workspace-after.md`, `open-close-after*.md`)

- Measure on the production build: `npm run build && npx vite preview --port 4173 --strictPort`, then
  `node scripts/perf/tabs.mjs --out <file>.json` (workspace scenarios A–Z: switches, child forms,
  form over a list, back / forward, background open, pair / unpair, dock; median of 3 rounds, 4×
  throttled switches), `node scripts/perf/open-close.mjs [--cpu 4]` (opening from Başlangıç / the
  dock, closing back to Başlangıç; fresh page per round), `node scripts/perf/startup.mjs` (restored
  addresses: first paint, long frames, reads in hidden panes), `node scripts/perf/interactions.mjs`
  (correctness: interruptions, child forms, back / forward, open paths, drag, keyboard, divider,
  closing freeze, widths, address restore, limit, nav positions, all animation levels),
  `node --test scripts/tabs/widths.test.mjs scripts/tabs/workspace.test.mjs`,
  `node scripts/perf/shots.mjs` (strip screenshots, both flare paths). Shared parts in
  `scripts/perf/harness.mjs`. Never report dev-server numbers.
- A context value that changes on a tab switch re-renders every form: keep `LookContext`,
  `SettingsContext`, antd `ConfigProvider` props (memoized config, constant `wave` / `card`),
  `PaneContext`, `OpenChildContext`, `ScreenContext` and each screen's `NavigationContext` stable;
  build screen elements once per screen (rebuilt only when that screen's state changes); pass stable
  callbacks / elements (`placeholder`) to `memo` parts.
- React 19 propagates a context change to every consumer of that context object below the provider,
  even under a nearer provider of the same context (the consumer runs, then bails). So router
  state must never change: the workspace writes the address itself, the shell's `Router` location is
  constant, and each screen provides its own `RouteContext` / `LocationContext` (otherwise every URL
  write re-ran every screen's `Link`s and routes). Shell values that change on a switch go through
  small contexts read only by their leaves (`ChromeNavContext`, `PlaceContext`).
- `AnimatePresence` re-renders all its children's Motion components on every parent render
  (`presenceAffectsLayout`, default on): set it off where children have their own
  `layoutDependency` (panes, strips). A Motion tree that runs its own exit gets an empty
  `PresenceContext` (panes). An `exit` (or any animation) needs a known start value (`initial` /
  `animate` / a MotionValue): otherwise Motion reads the computed style and forces style and layout.
- Every Motion `layout` / `layoutId` node needs a `layoutDependency` that changes only when its box
  can change (the dock too): a node without one snapshots on every render and forces a style /
  layout flush before the commit. One layout node updating starts Motion's projection for the whole
  tree (it also measures `layoutScroll` panes): the strip doesn't use layout animations at all (FLIP
  by hand from cached positions). Don't nest `layout` nodes needlessly; never use `drag` on tabs.
- No layout reads in the commit (layout effects) or in mount effects: read in a `ResizeObserver`
  callback (layout is ready, before paint) or Motion's `frame.read`; write measured sizes straight to
  the element (no React state), and when a measurement decides layout (column / sheet, wide / narrow)
  re-render with `flushSync` only when the decision flips (`useSidePanel`, `usePaneMin`,
  `useFillHeight`). Several observers: no read after another one's write in the same frame.
- `popstate`: React renders a transition started inside it synchronously (scroll restoration): start
  it in the next task (`setTimeout`). The decisions store re-renders through transitions
  (`useSyncExternalStore` always renders synchronously).
- Don't put a custom property that changes on interaction on a large container (it restyles the
  whole subtree); write per-element inline values instead. Measured custom properties written on a
  container are registered non-inherited (`@property` in `src/index.css`: `--fill-h`, `--view-h`)
  and passed down explicitly (`[--fill-h:inherit]`) only to the elements that use them. Hiding big
  subtrees: `content-visibility` is cheap, `visibility` / `pointer-events` / `inert` toggles restyle
  the whole subtree (5–20 ms per form), `display: none` re-lays it out on show.
- antd: no `ellipsis` on `Typography` (a ResizeObserver and measuring per text; use `truncate`,
  `line-clamp-*`); no `scroll.x` on `Table` (a measuring row on every reveal; wrap it in an
  `overflow-x-auto` box, table `w-max min-w-full`). rc-util's scrollbar measurement (every table
  mount inserted a stylesheet: full restyle and relayout) is replaced through a Vite alias by
  `shared/scrollBarSize.ts` (measured once, at idle). No antd style is generated or injected at
  runtime (zero runtime, see antd theme): the first open of a page type doesn't restyle the page.
- `<Activity mode="hidden">` re-runs every mount effect (antd's measuring, Motion remounts with
  replayed entrance animations) on reveal: use it only for one-time pre-rendering (forms behind the
  skeleton, sleeping panes), not for switching.
- Animations: JS-driven transform / opacity repaint every frame unless the element has its own
  layer: promote only while animating (pane enter / leave) or small permanent ones (the sheet).
- Hooks that keep an element in state must ignore ref detaches (`useAttach`) and skip measuring when
  the element has no boxes (hidden pane), or hiding / showing re-renders the whole form.

## Approved exceptions (tab system rewrite)

The tab radius cap (`TAB_RADIUS`); 2px group ring and underline (card contours stay 1px); neutral
selected label in coloured strips; separators and a hover pill on inactive tabs; close button only on
hover / focus for inactive tabs; Chrome-style width distribution with icon-only tabs (selection never
changes widths: no bold label, no pair button on the tab, no larger selected tab); the closing
freeze; the shared `tabs/` module replacing the StartPage category constants, `SwitchPanel` and `DirectionalPanels`.

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
