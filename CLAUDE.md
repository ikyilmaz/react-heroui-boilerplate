# CLAUDE.md

React 19 + HeroUI v3 + Tailwind CSS v4 boilerplate (Vite, react-router, lucide-react icons).
Code comments are written in Turkish; follow that.

The app itself is the **Synergy** UI in `src/synergy/`, in two design versions that share one data /
logic layer: **v1 "Karo"** (`v1/`, root routes `/calisma-alani`, `/is-akislari/…`) and **v2 "Bento"**
(`v2/`, same routes under `/v2`). Both use **one primary colour**. The component showcase at `/`
(`src/pages/`, `src/components/`) is the boilerplate's own demo.

## Hard rules

- **No CSS.** Style only with Tailwind utilities (arbitrary values / variants are fine) and HeroUI
  component props / variants. No `.css` files, `<style>` or `@apply` beyond the two files below; inline
  `style` only for truly dynamic numbers (e.g. a dragged splitter width).
  - `src/index.css` holds only the HeroUI setup: `@layer theme, base, components, utilities;`,
    `@import 'tailwindcss'`, `@import '@heroui/styles'`, the theme imports, `@source` for HeroUI's JS
    classes, Tailwind `@theme` keys for `font-display` / `font-mono`, the v1 animation keys
    (`animate-*` keyframes scaled by `--motion-time` / `--motion-shift`) and one base rule for the
    thin, track-less scrollbars.
  - `src/themes/synergy.css` is the v1 HeroUI theme: **variables only**, in `@layer base`, for
    `:root, .light, [data-theme='light']` and `.dark, [data-theme='dark']` (HeroUI's `useTheme` writes
    those onto `<html>`). Set base colours only (`--background`, `--surface*`, `--accent`,
    `--success`…); HeroUI derives hover / soft / focus tones itself.
  - `src/themes/synergy-v2.css` is the v2 theme, scoped to `:root[data-synergy='v2']` (the v2 shell
    sets that attribute) and written directly in the `theme` layer so it wins over v1 and Tailwind.
- **No raw HTML elements** (`div`, `span`, `a`, `button`, `p`, …). Use HeroUI components; the only
  local helpers are `Box` (`Surface variant="transparent"`) and `Text` (inline `Typography`) in
  `src/synergy/shared/ui.tsx`.
- **One colour.** The primary colour is HeroUI's `--accent` (`bg-accent`, `text-accent-foreground`,
  `bg-accent-soft`, `text-accent-soft-foreground`, `color="accent"`). Everything else is neutral
  surfaces (`bg-surface`, `bg-surface-secondary`, `bg-background`, `text-muted`, `border-border`…).
  `success` / `warning` / `danger` only for status (status chips, decision results). No per-box colours.
- **Theme.** Base theme changes go into the version's theme file; light / dark via HeroUI `useTheme`.
  Each shell has a tema paneli (`shared/ThemePanel.tsx` + `shared/themeSettings.ts`; the version's
  defaults, 5 presets and nav positions in `v1/theme.ts` / `v2/theme.ts`): primary colour, accent
  strength, radius, button shape, background, fonts, scale, spacing (`--spacing`), nav position, card
  style, shadow, border. Only the variables of changed settings are written inline on `<html>` (button
  shape as `[&_.button]:…` classes on `<html>`) while the shell is mounted; all are removed on unmount.
  Accent strength and nav position reach pages through `LookContext` / `useLook()`. No other runtime
  theming.
- Radius comes from `--radius` through Tailwind's scale (`rounded-xl` tiles, `rounded-2xl` cards,
  `rounded-3xl` blocks, `rounded-full` pills). Fonts: default sans (Inter), `font-display` (Bricolage
  Grotesque, headings and big numbers), `font-mono` (JetBrains Mono, numbers). Font files load from
  `index.html`.

## Features mirror the original Synergy UI

Source: `/Users/ismailkurbanyilmaz/Documents/synergy/src/web` (`WebInterface/src/modules/dashboard`,
`modules/workflow`, `app-main`). Before adding anything, find it there; labels come from its tr_TR
localization. **Don't invent features** (no widget boards, presets, snooze / remind / undo, urgency
labels, keyboard shortcuts, read/unread toggles, notification dots…). Backend-only features (realtime
sockets, delegation checks, e-signature, event forms, edit lock, AI assistant, admin tools) are left out.
**No charts.** Counts only where the original shows them (greeting sentence, category blocks, process
lists, date-group rows).

## Structure (`src/synergy/`)

Routes are in `src/router.tsx`: `/calisma-alani` (Başlangıç), `/uygulamalar/:appId`,
`/is-akislari/:box[/:processId[/:requestId]]`; v2 has the same under `/v2`. `shared/version.tsx`
(`VersionSwitch`) jumps to the same page in the other version.

- `v1/` (Karo): `index.tsx` › `AppShell` (top bar, left dock, theme switch + tema paneli, `Drawer` on
  phones), `StartPage.tsx` (greeting, Favoriler / Son Kullanılan Uygulamalar, 5 category blocks,
  process groups ↔ "Süreç Talepleri"), `WorkflowPage.tsx` + `RequestGrid.tsx` + `rows.tsx` (boxes as
  agenda tabs incl. Geçmiş (`AgendaTabs.tsx`), box band, process list (20 %) + request grid with date buckets / sort / paging, fast approve,
  draft delete), `DataGrid.tsx` (shared grid look for every v1 table: `GRID_*` class tokens, table /
  card `ViewSwitch` remembered per grid kind via `useGridView`, `CardList` / `CardGroup` / `GridCard`,
  `GridFooter` with page size + pagination), `DetailPage.tsx` + `DetailTiles.tsx` (Flow Viewer), `flow.tsx` (decision dialogs),
  `parts.tsx`, `paths.ts`, `AppPage.tsx`, `theme.ts`, `AllApps.tsx` ("Tüm uygulamalar" panel of the
  left menu: search, order ↔ alphabetic sort, collapsible app tree from `shared/menuTree.ts`; no menu editing). `hr/` is İnsan Kaynakları
  (`/insan-kaynaklari/:module[/:recordId]`, original `modules/hr`): module navigator, band with
  search / company / status filters, sortable paged table and a slide-in edit card, all driven by
  `hr/modules.ts`; company admins and property relations have their own views (`HrSpecial.tsx`).
  Data and in-memory store in `shared/hrData.ts`.
- `v2/` (Bento): the same pages as bento grids, flat colour, no gradients (`HERO`, `FILL`, `TINT` in
  `parts.tsx`): top header + floating bottom dock, Başlangıç with a vertical apps panel on the right,
  İş Akış Yönetimi with navigation pills in the header card and process content cards.
- `shared/`: data and logic for all versions — `workflowData.ts` (people, boxes, processes, events, columns,
  date buckets, menu apps, formatting), `decisions.ts` (in-memory store: `decide`, `markRead`,
  `deleteDraft`, `togglePin`; read through `useBoxRequests` / `useBoxCounts` / `useRequest` /
  `useMenuApps`), `pipeline.ts` (decision pipeline logic: confirm → required documents → reason →
  forward → `decide()`; each version draws its own dialogs), `grid.ts`, `FormFields.tsx` (form values
  as read-only showcase components), `ThemePanel.tsx` / `themeSettings.ts`, labels (`startLabels.ts`,
  `flowLabels.ts`), `historyView.ts`, `range.ts`, `remembered.ts`, `hooks.ts`, `tokens.ts`, `ui.tsx`.

## Gotchas

- `Surface` sets its own text colour (`Box` resets it to `text-inherit`); Typography's colour rule
  beats plain utilities, so use `text-current!` when a label must follow its parent.
- `ComboBox.InputGroup` treats its **last** child as the `ComboBox.Trigger` (it injects the group
  props there); keep the trigger last.
- Some HeroUI parts are styled through their own variables (e.g. `[--toggle-button-bg-selected:…]`
  as a Tailwind arbitrary property) when no prop exists.
