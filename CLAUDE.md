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
    (`bg-accent`, `text-muted`, `ring-border`, `rounded-2xl`…) plus `font-display` / `font-mono`, the
    animation keys (`animate-*` keyframes scaled by `--motion-time` / `--motion-shift`) and base rules
    for border-colour inheritance (`var(--border)`) and the thin, track-less scrollbars.
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
  wave, `filled` fields, borderless cards; Turkish locale (`tr_TR`, dayjs `tr`). Component tokens only
  in `AntTheme`; everything else with Tailwind. Notifications through `App.useApp().notification`
  (`useNotify` in `ant/hr.tsx`, `pipeline.ts`).
- **One colour.** The primary colour is `--accent` (`bg-accent`, `text-accent-foreground`,
  `bg-accent-soft`, `text-accent-soft-foreground`, antd `type="primary"`). Everything else is neutral
  surfaces (`bg-surface`, `bg-surface-secondary`, `bg-background`, `text-muted`, `ring-border`…).
  `success` / `warning` / `danger` only for status (status tags, decision results). No per-box colours.
- **Theme.** Base theme changes go into `src/themes/synergy.css`; light / dark via `setColorMode` /
  `useIsDark` (`shared/themeSettings.ts`, writes `light` / `dark` class and `data-theme` on `<html>`).
  The tema paneli (`shared/ThemePanel.tsx` + `shared/themeSettings.ts`; defaults, 5 presets and nav
  positions in `theme.ts`): primary colour, accent strength, radius, button shape, background, fonts,
  scale, spacing (`--spacing`), nav position, trail style (Yumuşak / Dolu, `useLook().trail`), card
  style, shadow, border, animation level / speed,
  page transition effect (rise, fade, slide, zoom, blur, off; `useLook().pageTransition`), scroll
  shadow and FPS. Only the variables of changed settings are written inline on `<html>` (button shape
  as `[&_.ant-btn…]:…` / `[&_.ant-tag]:…` classes on `<html>`) while the shell is mounted; all are
  removed on unmount. Accent strength and nav position reach pages through `LookContext` /
  `useLook()`. No other runtime theming.
- Radius comes from `--radius` through Tailwind's scale (`rounded-xl` tiles, `rounded-2xl` cards,
  `rounded-3xl` blocks, `rounded-full` pills). Fonts: default sans (Inter), `font-display` (Bricolage
  Grotesque, headings and big numbers), `font-mono` (JetBrains Mono, numbers). Font files load from
  `index.html`.

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

- `index.tsx` › `AppShell`: chrome as separate floating panels on one side, set by tema paneli ›
  Gezinme: "Solda" = left column with logo + back / forward, the dock (`StartDock` in
  `StartMenu.tsx`, morphs into the start menu) and actions / profile; "Üstte" = three columns: logo +
  back / forward | centered dock | actions / profile. The breadcrumb lives in the dock as nested pills
  growing out of the Başlangıç circle (`DockPath`: Başlangıç › active app › sub-levels, each pill tucked
  under the previous one, the other apps after the path) and in full in the start menu ("Buradasınız"); the chrome height
  reaches sticky page parts as `--chrome-top`; only the dock has a surface; below 640px a top bar +
  `Drawer`. `PerfOverlay.tsx` is the FPS meter.
- `StartPage.tsx`: widgets for greeting, Favoriler / Son Kullanılan Uygulamalar, and the work block
  (5 category blocks + process groups ↔ "Süreç Talepleri").
- `dashboard/`: `model.ts` (widget kinds with supported sizes, presets, per-preset layout saved in the
  browser), `Dashboard.tsx` (react-grid-layout board with edit mode — drag, resize snapping to the
  nearest supported size, size menu, add / remove, reset — styled through Tailwind selectors on its
  classes, no library CSS; row height fitted to the visible area so the page never scrolls, presets
  tile 12 × 9 with no gaps and `fillGaps` grows neighbours into any empty cell (view mode and on
  "Bitti"); resize is free (min = smallest supported size), the view picks the nearest supported size;
  stacked below 960px), `widgets.tsx` (the extra widgets).
- İş Akış Yönetimi: `WorkflowPage.tsx` + `RequestGrid.tsx` + `rows.tsx` (boxes as agenda tabs incl.
  Geçmiş (`AgendaTabs.tsx`), search / sort / date range on top of the process list, process list
  (20 %) + request grid with date buckets / sort / paging, fast approve, draft delete);
  `DetailPage.tsx` + `DetailSide.tsx` + `DetailTiles.tsx` + `FormTabs.tsx` + `FormFields.tsx` (Flow
  Viewer, read-only form fields; side info = a Dokümanlar card above an Özellikler / Tarihçe tabs
  card, laid out by the pane's measured width, not the viewport: ≥ 52rem a sticky ⅓ column that
  folds to an icon rail (remembered), narrower (e.g. `panelSize` 1) the rail with the cards in a
  drawer over the dimmed form (closes on outside click / Esc / showing a document), phones below
  the form; between Geri / İleri the "Süreçler" trail — added on explicit request, not in the
  original: one tick per request of the list it was opened from, hover / press opens a paged
  popover list, 8 per page); child forms open from form buttons into `FormTabs.tsx` by the child
  process's `panelSize` (original `viewOptions.panelSize`, a 3-unit strip): 1 / 2 split the tab
  (child right ⅓ / ⅔; in a split the opener stays beside the new child and the other form moves to
  its own tab, returning when the child closes), 3 opens a new tab, so a split pair becomes one
  grouped tab; a form has one open child at a time (opening another closes the previous one with
  its children, as in the original); below 1024px (size 2: 1200px) everything opens as 3;
  `flow.tsx` (decision dialogs, also used by Başlangıç and İK).
- `hr/`: İnsan Kaynakları (original `modules/hr`): module navigator, band with search / company /
  status filters, sortable paged table and a slide-in edit card, all driven by `hr/modules.ts`;
  company admins and property relations have their own views (`HrSpecial.tsx`). Data and in-memory
  store in `shared/hrData.ts`.
- `AllApps.tsx` ("Tüm uygulamalar" panel: search, order ↔ alphabetic sort, collapsible app tree from
  `shared/menuTree.ts`; no menu editing), `AppPage.tsx`, `paths.ts`, `theme.ts`, `motion.tsx`
  (`MotionScope`, `useTransition`, `useLeaving`, `PageTransition`).
- `ant/`: shared antd pieces — `theme.tsx` (`AntTheme`), `ui.tsx` (`cn` (tailwind-merge), `IC`,
  `MotionFlex`, `Tip`, `TintIcon`, `StatusTag`, `Scroll`, `CARD`), `parts.tsx` (`SearchField`,
  `SortMenu`, `RangeFields`, `EmptyNote`, `CellValue`, `GroupLabel`, `compareBy`, `useBand`), `grid.tsx`
  (`GRID_TABLE` Tailwind skin for antd `Table`, row classes, `ViewSwitch` remembered per grid kind via
  `useGridView`, `CardList` / `CardGroup` / `GridCard`, `GridFooter` with page size + pagination),
  `motion.tsx` (`Indicator`, `Count`, `TabEnter`), `hr.tsx` (`useNotify`, `DirectionalPanels`).
- `shared/`: data and logic — `workflowData.ts` (people, boxes, processes, events, columns, date
  buckets, menu apps, formatting), `decisions.ts` (in-memory store: `decide`, `markRead`,
  `deleteDraft`, `togglePin`; read through `useBoxRequests` / `useBoxCounts` / `useRequest` /
  `useMenuApps`), `pipeline.ts` (decision pipeline logic: confirm → required documents → reason →
  forward → `decide()`; `flow.tsx` draws the dialogs), `grid.ts`, `ThemePanel.tsx` /
  `themeSettings.ts`, labels (`startLabels.ts`, `flowLabels.ts`), `historyView.ts`, `range.ts`,
  `remembered.ts`, `hooks.ts`, `tokens.ts`.

## Gotchas

- An empty antd `Flex` is `display: none`, and a non-empty one lays out as a row: give block-level or
  empty boxes (indicators, spacers, scroll targets, measured containers) `block`.
- antd `Tooltip` and `Dropdown` / `Popover` can't share one trigger: wrap the dropdown in a `Flex` and
  put the `Tip` around that.
- Row actions inside clickable table rows / cards stop click propagation, so they don't also open the
  row.
- antd `Typography` sets its own colour; use `text-current!` (or `!` utilities) when a label must
  follow its parent. antd hover backgrounds (text buttons) may need `hover:…!` to keep the design.
- A popup opened from inside the start menu uses `getPopupContainer` to stay inside it; a portal on
  `body` would move focus out and close the menu.
