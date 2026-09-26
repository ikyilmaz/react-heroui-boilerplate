# CLAUDE.md

React 19 + HeroUI v3 + Tailwind CSS v4 boilerplate (Vite, react-router, lucide-react icons).
Theme is driven by HeroUI CSS variables (`--accent`, `--radius`, `--border-width`, …) — see
`src/index.css` and `src/theme/tweaks.ts`. Code comments are written in Turkish; follow that.

## Design language

The target look is a **soft, airy, "frosted glass" dashboard**: a cool, misty pale-blue canvas,
floating translucent white panels with very large radii, circular icon buttons, lots of breathing
room, and a single **solid black** accent for the active/primary state. Color is used sparingly —
only for status. Everything feels light, calm and tactile.

Reference implementation: the shell in `src/pages/workspace/WorkspaceShell.tsx` (header + left
menu rail) and the workflow pages in `src/pages/workflows/`.

- **HeroUI only, used directly:** these pages use no raw HTML elements (`div`, `span`, `a`,
  `button`, …) and no home-made look-alikes of HeroUI components. Reach for the HeroUI compound
  component and its props / variants first; keep Tailwind classes to layout, spacing and the tokens.
  - Shell: logo `Link`, `Breadcrumbs` (+ `Dropdown` for folded crumbs), icon actions
    `Button isIconOnly` + `Tooltip` (+ `Badge.Anchor` / `Badge` for the notification dot), `Avatar`;
    the left menu is a `ListBox` of link items (`href`) whose selection is derived from the route,
    with `Tooltip` labels when collapsed and a `ToggleButtonGroup` theme switch.
  - Workflow pages: box navigation `Tabs` with `Tabs.Tab href` (selected key from the route, no
    panels) or a sectioned `ListBox` (`ListBox.Section` + `Header`, link items); filters
    `TagGroup` / `Tag`; request lists `ListBox` link items with `slot="label"` / `slot="description"`
    text; counts `Chip size="sm"`; people `Avatar` + `Avatar.Fallback` (`initials`, `avatarColor`
    from `workflowData.ts`); search `SearchField` (`Group`, `SearchIcon`, `Input`, `ClearButton`);
    titles `Typography.Heading`; placeholders and empty results `EmptyState`; prev / next
    `Pagination`; decided items `Table`; process cards `Card` + `Popover`.
  - Links are HeroUI `Link` / `href` props; `RouterProvider` in the shell makes them client-side.
  - The only local helpers are `Box` (a `Surface variant="transparent"` layout box) and `Text`
    (inline `Typography`) in `src/pages/workspace/ui.tsx`, plus the class tokens in `tokens.ts`
    (`ICON`, `edge`, `tile`, `card`, `panel`, `tone`, `inline`, `timeOf`). Don't add new
    primitives to `ui.tsx`. Page-local functions that just group HeroUI JSX are fine.
  - Global HeroUI look for `.soft-theme` lives in `src/index.css`: pill-shaped buttons, chips,
    tags and tabs; black selected toggle buttons, tags and tab indicator; segmented pill track for
    attached `ToggleButtonGroup` and `Tabs`; glass-pill `Breadcrumbs`; line-free `secondary` tables.
    Popover / Dropdown content is portalled, so give it `className="soft-theme"`.
- **Respect the theme settings (`src/theme/tweaks.ts`, the palette button):** accent, status
  colors, radius, border widths, spacing, font and font size always come from there. Never
  override those variables and never hard-code their values in components:
  - colors → HeroUI variants (`variant="primary"`, `color="success"`) or `bg-(--accent)`,
    `text-(--danger-foreground)`; no hex or `white/black` classes.
  - radius → `rounded-panel` / `rounded-card` / `rounded-tile` / `rounded-pill` (multiples of
    `--radius`, defined in `src/index.css`); never `rounded-full` or fixed `rounded-[…rem]`.
  - borders → `ring-(length:--border-width)`; font sizes in `rem`, never `px`.
  - `.soft-theme` only sets what the panel doesn't control: translucent surfaces, field
    backgrounds, border/separator tones and `--soft-edge`. `.soft-canvas` adds the page gradient.
  - The design language itself is the **"Buzlu Cam"** preset (black accent, blue/coral status,
    radius 1rem, Manrope).
- **Layouts are a theme setting too** (panel › "Yerleşim", `layout` in `tweaks.ts`, independent of
  color presets): the workflow box page (`/is-akislari/:box`) renders one of two UX concepts
  from `src/pages/workflows/layouts/`: Pano (process-first cards + popover) or Gelen Kutusu
  (3-pane master–detail). They share `BoxHeader` (title + box `Tabs`); request details are not
  built yet and show a "Yakında" `Card` + `EmptyState`, as does `RequestDetailPage.tsx`.
- **Homepage** (`/calisma-alani`) is a chart-free "workflow desk" in `src/pages/workspace/home/`.
  **No charts and no numbers** inside `role="main"`: no counts, totals, percentages, KPI tiles or
  count badges; say it in words ("Gecikenler", "Birkaç gündür bu adımda"). Digits may appear only
  in request content marked `data-item-title`, in `<time>` elements (`tokens.ts › timeOf`) and in the
  `RequestPeek` drawer (the only place for fields, items and amounts).
  - `registry.ts`: the 7 widgets (next, queue, following, drafts, start, fyi, decided), their modes,
    min sizes, header commands and the 4 presets (`gunluk`, `onay-masasi`, `talep-sahibi`, `sade`).
  - `useHomeState.ts`: layout state persisted as `workspace-home-v2` (validated on load, migrated
    from `workspace-dashboard-v1`), keyboard moves, the single-key shortcut preference.
  - `HomeContext.ts › useBoardModel`: which widgets render (hidden / "Boşken gizle" / suppressed)
    and who owns the all-done state; `useHome()` gives every part the page context.
  - Data only through the hooks in `useTriage.ts` (demo `?durum=bos|onaylar-bitti`), never
    `requestsOf` / `useBoxCounts` in home UI. Snooze, read, remind and answer are in-memory stores
    in `src/pages/workflows/triage.ts`; decisions, undo toasts, focus and keys are in `actions.ts`.
  - Bodies live in `widgets/` (mapped in `widgets.tsx`); `WidgetFrame.tsx` + `commands.ts` draw the
    header, "Tümünü gör" and the "…" menu. Lists show only the rows that fit the saved height
    (`metrics.ts › fitRows`, fixed px row heights `hc.*`): no DOM measuring, no inner scroll.
  - react-grid-layout is locked outside edit mode ("Sayfayı düzenle"); widget headers are the drag
    handle (`.widget-handle`) and controls inside carry `.no-drag`.
- Gotchas: `Surface` sets its own text color (`Box` resets it to `text-inherit`); Typography's
  color rule beats plain utilities, so use `text-current!` when a label must follow its parent.
- Pages can also be built without panels: sections separated by headings and whitespace, with rows
  and tiles sitting directly on the canvas (see `src/pages/workflows/`).

### Principles

1. **Monochrome first, color only for meaning.** UI chrome is white / grey / black. Blue and coral
   red appear only as status (badges, pills, chart segments, notification dots).
2. **Black is the accent.** The active nav tab, the selected card, the active theme toggle and the
   primary action are solid black (`#0B0B0C`-ish) with white text. Never use a colored primary button.
3. **Layered translucency instead of borders and shadows.** Depth comes from stacking lighter,
   semi-transparent white surfaces on the tinted canvas, not from heavy drop shadows or dark borders.
4. **Round everything.** Pills, circles, and very large radii. No sharp corners anywhere.
5. **Generous whitespace.** Sparse content, wide gutters, large paddings; density is low on purpose.

### Color

| Role | Value (light) | Notes |
| --- | --- | --- |
| Canvas / page background | soft gradient `#E4E8EF → #C9D3E6` (grey-lavender top-left to periwinkle bottom-right) | Subtle, never saturated |
| Section panel (level 1) | `white / 35–45%` + `backdrop-blur` | Big containers ("New Case Management") |
| Card / column (level 2) | `white / 70–85%` | Inner cards sitting on panels |
| Tile / chip (level 3) | `white / 90–100%` | Small tiles, icon buttons, avatars' rings |
| Hairline border | `white / 60%` (light edge) or `black / 6–8%` | 1px, only when a surface needs separation |
| Text primary | `#111214` | Headings, active labels |
| Text secondary | `#5B6070` | Body, table cells |
| Text muted | `#9AA0AE` | Column headers, placeholders, disabled/pending items |
| Accent (active) | `#0B0B0C` bg / `#FFFFFF` fg | Active tab, selected tile, primary action |
| Status – info/done | periwinkle blue `#7E9BDB` | "Executed", count badges, chart |
| Status – danger/alert | coral red `#E0605A` | "Scheduled/Active" alert, notification dots, red badges |
| Connectors | thin blue `#8FA6E0` solid / red `#E0605A` dashed | Flow lines between steps |

- Map these to HeroUI tokens (`--background`, `--surface`, `--accent`, `--accent-foreground`,
  `--danger`, …) rather than hardcoding hex in components. Use Tailwind opacity modifiers
  (`bg-white/40`, `text-foreground/60`) for the translucent layers.
- Status pills are filled with the status color at full strength with **white text** (not tinted/soft
  backgrounds).
- Dark mode: invert the layering — deep blue-grey canvas, surfaces as `white / 5–10%`, accent becomes
  **white** with black text. Status colors stay the same hue.

### Shape & radius

- Section panels: `rounded-[2rem]`–`rounded-[2.5rem]` (~32–40px).
- Cards / columns: `rounded-[1.75rem]` (~28px).
- Small tiles / step boxes: `rounded-3xl` (~24px). Selected tile keeps the same radius but goes black.
- Nav tabs, status pills, badges, search/url bar: `rounded-full`.
- Icon buttons and avatars: perfect circles.
- Nothing below `rounded-xl`. Inputs follow the same pill/very-round shape.

### Elevation & surfaces

- No hard shadows. If needed, use a very soft, large, low-opacity shadow:
  `shadow-[0_8px_30px_rgba(30,40,80,0.06)]`.
- Prefer a 1px inner light edge (`ring-1 ring-white/60`) + translucency + `backdrop-blur-xl`.
- Surfaces are nested: canvas → translucent panel → whiter card → white tile. Each level is
  *lighter* than its parent.

### Typography

- Geometric/grotesque sans (e.g. *Gilroy*, *Manrope*, *Plus Jakarta Sans*, *Urbanist*). Prefer
  Manrope or Plus Jakarta Sans via the theme font setting.
- Page title: ~32–36px, **bold**, tight tracking (`tracking-tight`), near-black.
- Section title: ~18–20px, medium/semibold.
- Body & labels: 12–14px, regular, secondary grey. Multi-line labels are fine (they wrap in 2 lines).
- Emphasized/active item labels: semibold, primary text. Pending/inactive items: muted grey, regular.
- Column/table headers: 12–13px, muted grey, regular weight, no uppercase.
- Captions under columns (e.g. "Issue Identification"): 14px, medium, centered, primary text.

### Iconography

- lucide-react, **thin strokes** (`strokeWidth={1.5}`), 18–20px, dark grey.
- Icons almost always sit inside a **circular button** (~44–52px) with a white/translucent fill and a
  hairline border. Grouped actions (add / share / calendar) appear as a row of 3 circular buttons,
  top-right of every panel.
- Notification state = small coral-red dot at the icon's top-right.
- Left sidebar: vertical stack of circular icon buttons on a pale rail; theme toggle (moon / sun)
  at the bottom with the active one solid black.

### Components & patterns

- **Top nav:** logo left, text links centered (14px, regular), active link = solid black pill with
  white text. Right side: circular icon buttons (search, mail, bell) + circular avatar.
- **Panels:** title top-left, action button group top-right, content below with wide padding
  (`p-8`–`p-10`).
- **Avatars:** circular, with a white ring; stacked in a row with small numeric badges (blue or red
  circles, white text) overlapping the bottom edge.
- **List rows inside cards:** avatar or circular "+" button · two-line label · trailing state
  (double-check icon `CheckCheck`, `…` menu) · circular calendar button.
- **Step / kanban tiles:** grid of soft white rounded tiles; the current one is black with white text.
- **Flow connectors:** thin curved lines with small dots at endpoints; blue solid for normal flow,
  red dashed for alternative/exception flow.
- **Tables:** no vertical lines, no zebra stripes, no straight rules; the header is a soft
  pill-shaped strip and rows highlight as rounded strips on hover (round the first/last cell);
  muted headers; leading star toggle; status as filled pills.
- **Charts:** big, soft, flat donut/arc segments in the status palette with white labels; count
  bubbles in white circles.

### Spacing & layout

- Base gap between panels: `gap-6` (24px). Inside panels: `p-8`+, `gap-4`–`gap-6` between cards.
- Layout = fixed thin icon rail on the left + fluid content grid; panels form a masonry-like grid
  (full-width panel on top, two half-width panels below).
- Keep content sparse; prefer fewer items with more space over dense layouts.

### Motion

- Subtle and soft: 150–250ms ease-out transitions on background/opacity; slight scale (`0.97`) on
  press for circular buttons. No bouncy or flashy animations.

### Don'ts

- No saturated brand-colored primary buttons, gradients on buttons, or colorful headers.
- No sharp corners, heavy borders, dark dividers, or strong drop shadows.
- No uppercase/letter-spaced labels, no bold body text.
- No dense, cramped tables or toolbars.
