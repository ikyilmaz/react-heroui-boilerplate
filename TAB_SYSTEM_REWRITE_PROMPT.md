# Brief: rewrite the Synergy tab system (strip, panes, split view, groups) for flawless motion and performance

You are an autonomous senior front-end engineer. Your task is to rebuild the tab system of the
Synergy UI in this repository so that **every tab structure in the app shares one implementation**,
**every transition (tab switch, split open/close, tab close, reorder, group switch) is smooth and easy
on the eyes**, and **the main thread stays idle enough that no frame is dropped on a 60 Hz display**.

This brief is the result of a measurement and research pass. The numbers, root causes, decisions and
facts below were verified in this repo on 2026-10-06 (Chrome 154, framer-motion 13.5.0, React 19.3.0,
antd 6.6.5, Vite 8.3.0, Tailwind 4.3.3). Treat them as ground truth unless you re-measure and find
otherwise; if you do, say so in your report.

---

## 0. Ground rules

1. **Read `CLAUDE.md` first and obey it.** It is binding: no CSS files beyond the two listed, no raw
   HTML elements (antd `Flex` / `Typography` / react-router `Link` only), Tailwind utilities + antd
   props only, theme variables only in `src/themes/synergy.css`, component tokens only in
   `ant/theme.tsx`, Turkish code comments, Turkish labels from the original Synergy localization, no
   invented product features, no monospace font, no blur, one accent colour. Where this brief
   deliberately deviates from `CLAUDE.md` (listed in §4.4 under "Approved exceptions"), this brief
   wins and you must update `CLAUDE.md` accordingly when you finish.
2. **Measure, then change, then measure again.** Phase 0 builds the harness and records the baseline.
   No phase is "done" without the numbers in §6. Do not report success you have not measured.
3. **Production build is the reference.** All performance numbers come from `npm run build` +
   `npx vite preview --port 4173 --strictPort`, not from the dev server (dev numbers are ~1.8× worse).
4. **Pure logic stays pure.** `src/synergy/shared/formTabs.ts` and `shared/formGroups.ts` are pure
   reducers that encode the original Synergy panel rules (panel size 1/2/3, one open child per form,
   descendants close with their parent, undo of a split, group colours…). Keep their semantics; new
   logic you add (tab width distribution, closing freeze) must also be pure, side-effect free and
   verified with a small script or `node:test`, without adding dependencies.
5. **Do not widen scope.** Only what §2 lists. No new product features beyond the Chrome behaviours
   approved in §4.4. No React Compiler. No View Transitions for tabs or panes. No new runtime deps.
6. **Keep the public hooks** other files depend on: `useOpenChild`, `useTabScroller` (or provide
   drop-in equivalents and update the callers: `DetailPage.tsx`, `DetailTiles.tsx`, `DetailSide.tsx`).
7. Work in `src/synergy/`. Run `npm run lint` and `npm run build` (type check) before you finish.

---

## 1. Decisions already taken (do not reopen)

| Topic | Decision |
|---|---|
| Animation engine | Motion (framer-motion 13) FLIP layout animations + MotionValues. **Not** the View Transitions API, not React `<ViewTransition>`, not Motion `AnimateView` (page-level only, non-interruptible, snapshot based; Motion's own docs rate FLIP as more performant for this case). |
| Hidden panes | React 19.3 `<Activity mode="hidden">` around each hidden pane's content, on top of manual memoization and stable contexts. |
| React Compiler | Not now. Memoize by hand in the tab system. |
| Visual model | Google Chrome's current tab strip: flat inactive tabs with separators and a hover pill, one selected "sheet" that merges into the content container with concave flares, group colour only on dot / underline / ring. One visual language for single-group and multi-group states. |
| Selected label colour | In a coloured (multi-group) strip the selected label is neutral (`text-foreground`, semibold). In a single-group strip it stays `text-accent-soft-foreground` (consistent with the agenda tabs). |
| Group ring | 2 px, same thickness as the group underline (Chrome-faithful), even though card contours are 1 px. |
| Tab radius | Capped: `min(var(--radius) * 2, 16px * var(--corner-scale, 1))` (approved exception to "radius drives everything", analogous to `CARD_RADIUS`'s 32 px cap). Flares use the same radius. |
| Chrome behaviours in scope | Width distribution (shrink together, active keeps its minimum, icon-only below a threshold, top radius shrinks with width), close button only on hover/focus for inactive tabs, separators that hide/fade next to the active or hovered tab, hover pill, **closing freeze** (widths stay fixed while the user closes several tabs with the mouse), group underline detouring around the active tab. |
| Fallback for `corner-shape` | Native-anti-aliased "1 px border + offset box-shadow" pseudo-element construction, not radial-gradient bands. Compare both at DPR 1 / 1.25 / 2 before deleting the gradient path. |

---

## 2. Scope: every tab structure migrates to the shared system

Tab strips (must use the new shared strip + sheet + flare primitives):

1. **`src/synergy/FormTabs.tsx`** — form tabs with groups, split panes, drag reorder, context menus,
   keyboard, divider, skeleton crossfade. The heaviest and the main target.
2. **`src/synergy/AgendaTabs.tsx`** — the workflow box tabs on `WorkflowPage.tsx` (main boxes + the
   "Geçmiş" group label), link-based (`Link`), selection sheet measured with `left/width`.
3. **`src/synergy/StartPage.tsx` category tabs** — constants `CATEGORY`, `TAB`, `FLARE_L`, `FLARE_R`
   (around lines 115–143) and the `Indicator id="start-category"` sheet in the work block. These tabs
   sit on a *card* (surface + 1 px contour), not on the tinted page container, so the sheet variant
   must support "surface + contour ring" as well as "tinted container, no ring".

Content transitions (must become one primitive with one timing table):

4. `SwitchPanel` in `src/synergy/ant/motion.tsx` (agenda tabs, Geri / İleri).
5. `DirectionalPanels` in `src/synergy/ant/hr.tsx` (HR inspector sections).
6. The tab-switch content motion inside `FormTabs.tsx` (`entered` / `dir` logic).

Explicitly **out of scope** (leave the components, but route their panel changes through the shared
content transition where they animate content): every antd `Segmented` control (StartPage
Favoriler / Son Kullanılan, DetailSide Özellikler / Tarihçe, HrInspector sections, grid `ViewSwitch`,
ThemePanel, HrFields status). They are segmented controls, not browser tabs. Also out of scope:
`DetailSide.tsx` side column motion (note: it uses Motion's internal `anchorX` prop; leave it, but do
not introduce new uses of undocumented props in the tab system).

---

## 3. Baseline and verified root causes

Setup used: route `/is-akislari/bekleyen/satin-alma/bekleyen-satin-alma-0` (Satın Alma Talep Formu),
then "Tedarikçi Teklifi Ekle" (panel size 2 → split), then "Tedarikçi Kartını Aç" inside the child
(panel size 1 → the root form moves to its own tab, teklif + kartı stay split), then a second group
opened from the "Süreçler" trail popover (row "20014"). Result: two groups, three tabs, four mounted
forms (371 / 333 / 155 / ~250 DOM nodes, 18 / 12 / 10 / 8 inputs), 1,149 DOM nodes in total.

### 3.1 Numbers (production build, Chrome 154, 120 Hz, DPR 2, Apple Silicon)

| Interaction | Longest main-thread task | Forced style/layout inside it | `getBoundingClientRect` calls | Frames dropped (120 Hz) |
|---|---|---|---|---|
| Tab switch or group switch | 100–126 ms (blocking 51–74 ms) | 20–45 ms | 115–141 | 12–15 |
| Open child, panel size 3 (new tab) | 106 ms + 61 ms | 17 + 11 ms | 129 | ~20 |
| Close child tab | 42 ms | 10 ms | 50 | 5 |
| Same switches with animation level "Kapalı" | 92–142 ms | 19–35 ms | 114–130 | same |
| Same switches, dev server | 170–230 ms | 33–49 ms | 150–180 | — |

Turning animation off does **not** remove the cost: the cost is synchronous React rendering plus
Motion measurement, not the animation itself. On an ordinary 60 Hz corporate laptop expect 2–3× these
times today.

### 3.2 Root causes (each verified with a MutationObserver / counters in the page)

1. **Every mounted form re-renders on every switch, hidden ones included.** On one switch the hidden
   root pane received 147 `name`/`type` attribute writes on its inputs (React DOM rewrites these on
   every `<input>` update), hidden child panes 24–78. Causes:
   - `DetailPage.tsx` passes `renderRoot={(g) => <LayoutGroup …><RootViewer …/></LayoutGroup>}`;
     `FormTabs` calls it in `panes` on every render → a new element → `RootViewer` → `Viewer` → the
     whole antd form re-renders. Child forms are memoized (`children` useMemo) but still re-render
     because of the next point.
   - `PaneContext` value is `sheet && visible ? scroller : null`, so on every switch the value flips for
     the pane being hidden *and* the one being shown; every `useTabScroller()` consumer (the whole
     `Viewer`: `useScrolled`, `useFillHeight`, `useSidePanel`) re-renders.
   - `FormTabs` itself renders several times per interaction (`setStep` in render, `setTop`,
     `setScroller` from the ref callback, `setResizing`, `setLeaving`…).
2. **Motion measures too much.** Motion source (`MeasureLayout.getSnapshotBeforeUpdate`): a `layout`
   node snapshots + re-measures on every render when `layoutDependency` is undefined **or** `drag` is
   set **or** presence changed. The strip's `GroupBlock` (`layout`), root tab and `ChildTab`
   (`layout="position"`) and the `layoutId` selection sheet have no dependency and the tabs have
   `drag`. Every dirty node costs 2 × `getBoundingClientRect` + 2 style writes per commit; a
   `LayoutGroup` dirties all of its members when any member updates (DetailPage wraps the whole root
   form in `LayoutGroup id={g.key}`). The separator uses `layoutDependency={step.n}` (changes on
   every step).
3. **Nested layout nodes multiply per-frame work.** While any layout animation runs, Motion's root
   walks *all* projection nodes every frame and every `layout` descendant of an animating node keeps
   writing a corrective `transform`. Measured: 312 style writes on the form card (`MotionCard layout`
   in `Viewer`) and 230 on the pane during one switch; 972–1,839 style writes on 18–26 elements per
   switch in total.
4. **Forced layout 20–45 ms per switch** = Motion's post-commit measurement on a 1,100+ node document
   interleaved with other read/write cycles (`useFillHeight`, `useSidePanel`'s ResizeObserver,
   `useRadiusPx`'s probe element, `scrollIntoView` of the selected tab, tooltip positioning).
5. Side finding: the production bundle is a single 1,968 kB chunk (622 kB gzip). Out of scope here,
   but mention it in the report if you notice tab-related code that could be lazy.

---

## 4. Target design

### 4.1 Module layout

Create `src/synergy/tabs/` (Turkish comments, English identifiers like the rest of the code):

- `TabStrip.tsx` — the strip: scrolling row, WAI-ARIA tablist keyboard handling, groups (dot,
  underline, ring), drag reorder (manual, see §4.5), context menus, width distribution, closing freeze,
  hover pill, separators, close buttons, the selected sheet. Used by FormTabs, AgendaTabs and the
  StartPage category tabs through a small item model (`{ key, label, icon?, href?, closable?,
  group?, paired? }`) plus render slots where the three differ (split tab shows two labels; agenda tabs
  are links; category tabs show a count).
- `shape.ts` — the class-string primitives: `SHEET` (selected sheet on the tinted container),
  `SHEET_ON_SURFACE` (selected sheet on a card: surface fill + contour ring), `FLARES` (concave
  corners, `corner-shape` path + fallback), `RING` (2 px group ring that continues into the underline),
  `TAB_RADIUS` (the capped radius expression), `PILL` (hover highlight), `SEPARATOR`. These replace
  `FLARES` / `AGENDA_PAGE` in `AgendaTabs.tsx`, `TAB_RING` / `GROUP_LINE` / `GROUP_DOT` in
  `FormTabs.tsx` and `TAB` / `FLARE_L` / `FLARE_R` in `StartPage.tsx`.
- `Panes.tsx` — pane host for FormTabs: panes never move in the DOM, visible ones are placed with
  `order` + flex basis, hidden ones are `display: none` **and** their content is wrapped in
  `<Activity mode="hidden">`; scroll position save/restore; focus handling; the divider.
- `ContentSwitch.tsx` — the one direction-aware content transition (replaces `SwitchPanel`,
  `DirectionalPanels` and the FormTabs tab-switch motion). Props: `id`, `dir`, optional `mode`
  (`slide` for tab content, `fade` for reduced motion handled automatically via `useLook()`).
- `widths.ts` — pure width distribution + closing-freeze state machine (see §4.4), with a tiny
  self-check script or `node:test` file.
- `motion.ts` — the single timing table (§4.3) built on `useTransition` / `useLook()` so the theme
  panel's animation level and speed keep working.

`shared/formTabs.ts` and `shared/formGroups.ts` stay where they are.

### 4.2 Rendering and performance rules (hard requirements)

Render isolation:

- Each pane's content element is created **once per pane identity** and kept in a `useMemo` keyed by
  the pane key (root panes too: build the root element per group root once; `DetailPage` must pass a
  stable `renderRoot` — `useCallback` with stable deps — or FormTabs memoizes its result per
  `group.key + rootId`).
- Put a `memo` boundary at the pane content; props that reach it must be referentially stable across
  tab switches (callbacks via `useCallback` / refs, objects via `useMemo`).
- `PaneContext` must not change value on a switch. Provide the scroller element once (it exists while
  hidden) and expose "visible" through a separate mechanism with few consumers (or not at all: hidden
  content inside `Activity` has its effects unmounted, so visibility-dependent effects simply stop).
  Rule of thumb: a context whose value flips on every switch is a bug.
- Wrap hidden pane content in `<Activity mode="hidden">`; visible in `mode="visible"`. Facts you
  rely on (React 19.3): hidden children keep state, their Effects are destroyed and re-created on
  reveal, their updates are deferred to idle, their DOM is kept and hidden with inline
  `display: none !important`, and (since 19.3) portals inside a hidden Activity are hidden too. The
  Pane root element itself stays outside Activity so Motion can still animate it when it is visible.
- One React render per interaction for the strip/pane host where possible: derive, don't set. No
  `setState` for purely visual flags that a class toggle on a ref can do (`resizing`, `dragging`,
  freeze). Keep the `--split` divider drag as a direct style write with no React render.
- Zero `name`/`type` attribute writes inside hidden panes on a tab switch (measurable, §7).

Motion discipline:

- Every `layout` / `layoutId` node gets a `layoutDependency` that changes **only** when that node's
  box can change (strip: a signature of tab order + widths + selection; panes: the existing `moved`
  counter; divider: ratio + shown panes). Keep the existing rule "a pane is re-measured only when it
  was visible before and after the change", so a `display: none` box never becomes a FLIP origin.
- `drag` forces a snapshot on every render of a draggable node → draggable tabs are `memo` components
  that re-render only on their own prop changes; the strip re-renders on its signature only.
- Shrink `LayoutGroup` scope in `DetailPage.tsx` from the whole root form to the "Süreçler" trail only.
- Audit nested `layout` under a pane. The form card's `layout` (DetailPage bento) must not project
  during pane moves; enable it only while the side column is actually changing (toggle the `layout`
  prop or move the animation to the side column), or accept and document the per-frame cost with
  numbers.
- Border radius is passed as **px via `style`** wherever Motion scales a box (already done with
  `useRadiusPx`; keep it and round to integers).
- Exits: `AnimatePresence mode="popLayout"`, children receive `ref` as a prop (React 19). Do not use
  the internal `anchorX` / `anchorY` / `presenceAffectsLayout` props in the tab system.
- Springs: express UI springs as `{ type: 'spring', visualDuration, bounce }`; the speed multiplier
  divides `visualDuration` (same curve, shorter time). Physics springs (`stiffness`/`damping`) only
  where velocity continuity matters (drag release).
- `MotionConfig reducedMotion="always"` (already in `MotionScope`) disables transform and layout
  animations for the "Az" level; "Kapalı" is instant. Do not use `useReducedMotion` (it does not
  update on OS changes in 13.5).

Frame cost:

- During any transition only `transform` and `opacity` may change per frame, on the few elements that
  actually move (two panes + divider + sheet + the tabs that shift). No per-frame width/left/height
  animations, no CSS-variable animations for geometry (`--split` only on pointer drag, which is not an
  animation).
- Try `contain: layout paint` on each pane (`[contain:layout_paint]`) and keep it only if the forced
  layout time drops measurably; antd popups portal to `body`, so containment is safe for them, but
  verify the sticky header strip inside the pane still works.
- `will-change: transform` only on the two moving panes and only while a pane animation runs, and only
  if the measurement shows fewer dropped frames; otherwise none.

### 4.3 Motion choreography (what the user sees)

Easy on the eyes means: one dominant movement per transition, short travel, no bounce on sheets or
panes, opacity ramps instead of hard cuts, nothing animates twice (a form that is skeleton-crossfading
does not also slide), and every transition is interruptible (never `mode="wait"` where a user can
click again).

Timing table (full level; "Az" = fades only; "Kapalı" = instant; the theme speed multiplier applies):

| Transition | Motion | Duration / ease |
|---|---|---|
| Tab switch (same group) | Selected sheet slides to the new tab (`layoutId`); new content enters from the tab's direction with 28–32 px travel and fade; old content fades out in place (`popLayout`) | sheet: spring `visualDuration 0.3, bounce 0`; content in 0.3 s `[0.22,1,0.36,1]`, out 0.16 s `[0.4,0,1,1]` |
| Group switch | Same as tab switch; direction from group order | same |
| Split open (child size 1/2) | Opener shrinks (FLIP, transform only); child pushes in from the container edge, its edge locked to the opener's edge (same frame, `frame.update`) | 0.42 s `[0.22,1,0.36,1]` |
| Split close | Leaving pane pushes out to its own edge (`popLayout`); remaining pane grows | 0.42 s same ease |
| Close a lone form / last child | Fade out in place; container stops clipping when done | 0.16 s |
| Swap / unpair / pair / ratio (Home/End/Enter/double-click) | Plain FLIP layout animations | 0.42 s same ease |
| New tab appears | Tab slides in 16 px from the left of its slot with fade; neighbours shift (FLIP) | 0.2 s in; neighbours 0.2 s ease-in-out (Chrome: 200 ms) |
| Tab closes | Label fades 0.12 s, width collapses via FLIP of the neighbours; with closing freeze active the neighbours do not move at all | 0.2 s ease-in-out |
| Drag reorder | Dragged tab follows the pointer 1:1 (MotionValue), neighbours FLIP 0.2 s ease-in-out; on release the tab springs to its slot | spring `visualDuration 0.25, bounce 0.1` |
| Strip appears / disappears (first child opens / last closes) | Rises 12 px with fade | 0.34 s in, 0.16 s out |
| Skeleton → form | Crossfade; form rises 8 px | 0.32 s |
| Hover pill, separator fade, close-button reveal | CSS transitions | 0.15 s |

Direction rules stay as today: group change → group order; root change (Geri / İleri) → list order;
tab change → tab order; pane focus change → pane order.

### 4.4 Visual specification (Chrome model, Synergy skin)

Reference numbers from Chromium's current tab strip (DIP): tab 35 px tall, standard width 256 (232 +
2 × 12), top corner radius 10, bottom (flare) radius 12, top radius for narrow tabs
`clamp((w − 20) / 3, 0, 10)` ("at least one third of the top is flat"), separators 2 × 16 with radius
1, min inactive width 32, min active width 56, close button 16, hover pill 28 px tall, group underline
2 px with radius 1 (starts under the tab body, not the flare, and pokes 2 px out under the active tab),
grouped active tab stroke 2 px in the group colour, layout animations 200 ms ease-in-out, drag start
threshold 16 × (tabWidth / 256). Translate to Synergy units as below.

Strip:

- Height stays the theme's `h-10`; the strip sits on the page background; the content container below
  is `--tab-bg` (accent 9 % into background) for FormTabs / AgendaTabs and the card surface for the
  StartPage work block.
- Start padding = container corner radius + tab radius so the selected sheet's left flare always lands
  on the container's straight top edge (keep the current formula, with the capped radius).
- Overflow: horizontal scroll, no scrollbar, selected tab scrolled into view (as today). No scroll
  buttons.

Inactive tab:

- No background. Icon + label (ellipsis) + close button area. Separator after it: 1 px × 16 px rounded
  (our contour is 1 px; Chrome's 2 px would read heavy here), colour `--border` strengthened to about
  20 % foreground, vertically centred; hidden when this or the next tab is selected, hovered or
  focused, fading with the hover pill.
- Hover / focus-visible: pill `inset-y-1 inset-x-0 rounded-[TAB_RADIUS]` with foreground 6–8 % (colour
  mix), 150 ms; in coloured groups the pill is the group colour at ~12 %.
- Close button: `opacity-0`, shown on `group-hover` / `focus-within` / when the tab is selected; hidden
  entirely when the tab is below the icon-only width (see widths).

Selected tab (the sheet):

- Fill = the container colour (tinted container) or surface (card), `rounded-t-[TAB_RADIUS]`, concave
  flares of radius `TAB_RADIUS` at both bottom corners merging into the container (today's concept,
  with the capped radius). The sheet is the `layoutId` element and slides between tabs, also across
  groups.
- Single group: no ring (sheet merges into the container), label `text-accent-soft-foreground`
  semibold, icon accent.
- Coloured groups: 2 px ring in the group colour on the sides, the top and along both flares, meeting
  the 2 px group underline so the line visually detours around the tab (Chromium's `TabGroupLineView`
  does exactly this); label `text-foreground` semibold; icon muted.
- Split tab: two labels separated by a 1 px × 16 px divider; the focused form's label gets the selected
  colour rule, the other `text-foreground/70`.
- StartPage variant: surface fill with the card contour (`--border-width`) instead of a group ring; the
  contour runs along the flares into the card's ring like today.

Flare / ring technique:

- Primary path (Chrome / Edge 139+): an R × R pseudo-element box per corner with
  `border-top-left-radius: 100%` (mirror for the right) and `corner-shape: var(--corner-concave, scoop)`
  (`superellipse(-2)` for the squircle theme, as today), filled with the sheet colour. Draw the ring
  with a real `border-top` + `border-left` (1 px contour or 2 px group ring) — the spec guarantees the
  inner border edge follows the concave curve at constant distance, whereas `box-shadow` is scaled
  axis-aligned and goes uneven. Verify there is no seam at the baseline and at the tab edge at DPR 1,
  1.25 and 2 (overlap by 1 px rather than abut).
- Fallback (Safari, Firefox: `corner-shape` is only in Safari Technology Preview 251+ and Firefox
  Nightly 158 behind a flag): the transparent R × R pseudo with a 1 px (or 2 px) `border` on the two
  sides that form the arc, a rounded corner of radius R, and a hard offset `box-shadow` that paints
  the sheet colour into the fillet (the "(Better) tabs with round-out borders" construction). Browser
  anti-aliasing, exact ring thickness, no gradient bands. Keep the current radial-gradient version only
  if your side-by-side screenshots at DPR 1 / 1.25 / 2 show it is better; document the choice.
- Flares and ring pseudo-elements are `pointer-events-none`; the hit area is the tab body only.
- Use integer px radii (round `useRadiusPx` results) for crisp arcs; the theme's `--corner-shape`
  (squircle) must still apply to the sheet's convex corners via the global rule in `index.css`.

Width distribution (`widths.ts`, pure; Chrome's model adapted):

- Inputs: available strip width, per-tab preferred width (icon + label up to the current caps: 22 rem
  single, 15 rem per form in a split tab), flags (selected, paired), group spacing.
- Preferred fits → use preferred. Otherwise all tabs shrink together towards a crossover width (icon +
  label ellipsis minimum ≈ 7 rem); below that the selected tab stays at its minimum (icon + label +
  close, ≈ 9 rem) while inactive tabs keep shrinking down to icon-only (≈ 2.75 rem, label hidden, name
  in the tooltip, close button hidden). Only when even those minimums do not fit does the strip scroll.
- The sheet's top radius shrinks for narrow tabs: `clamp((w − 2R) / 3, 0, R)` so at least a third of
  the top stays flat.
- Widths are integers; leftover pixels go one per tab from the start (no fractional widths).
- Width changes animate via FLIP (0.2 s ease-in-out), never via width transitions.

Closing freeze (`widths.ts`, pure state machine + a thin hook):

- When a tab is closed with the pointer via its close button while tabs are below preferred width,
  lock the strip's "available width" so the remaining tabs keep their current widths and the next
  close button lands under the pointer. Each further close reduces the locked width by the removed
  tab's width.
- Release the lock when the pointer leaves the strip (with ~40 px slop below and ~60 px trailing slop
  so the pointer can rest where the next tab will appear), 2 s after a touch close, when a tab is
  added or moved, when the remaining tabs reach preferred width, or when the trailing tab was closed
  while nothing overflowed.

Dark mode and themes: everything through the theme variables (`--tab-bg`, `--surface`, `--border`,
`--group-1…6`, `--radius`, `--corner-scale`, `--border-width`, `--motion-time`); test light + dark,
the four presets, radius Az / Orta / Çok, round + squircle, density settings, animation full / Az /
Kapalı and speed.

**Approved exceptions to `CLAUDE.md`** (update the file): the tab radius cap; the 2 px group ring and
underline; neutral selected-label colour in coloured strips; separators and hover pill on inactive
tabs; close button on hover only; width distribution; closing freeze; the shared `tabs/` module
replacing `AgendaTabs.tsx`'s `FLARES` / `AGENDA_PAGE` and the StartPage flare constants.

### 4.5 Interaction details to preserve or adopt

- Keep all existing FormTabs product behaviour: panel sizes, one open child per form, descendants
  close with their parent, undo of a split, groups (max 6, colours, only the active group open, others
  collapse to one tab), Geri / İleri replacing the root, "Yan yana aç", swap / unpair, divider with
  keyboard (arrows ±2 %, Shift ±10 %, Home / End, Enter = panel-size ratio, double click), focus of a
  pane highlights its label, Delete closes (root tab closes the group), context menus for move / close,
  `LOAD_MS` skeleton, the `data-tab-cue` header cue, nothing selected automatically on the workflow
  pages, breadcrumb and address behaviour.
- Drag reorder stays manual (Motion `Reorder` renders raw `ul`/`li`, which `CLAUDE.md` forbids). Align
  it with Chrome/Motion thresholds: start dragging after `16 × (tabWidth / 256)` px (min 3 px), swap
  with the neighbour when the dragged tab's leading edge crosses the neighbour's centre, at most one
  swap per drag event, no second swap until the new order has rendered, auto-scroll the strip within
  48 px of either edge while the pointer moves. Group blocks drag as a unit from the root tab.
- Accessibility: WAI-ARIA tabs (roving `tabindex`, Arrow / Home / End / Delete), `aria-selected`,
  `aria-controls` / `aria-labelledby` pairs, inset focus ring, `role="separator"` divider with
  `aria-valuenow`, tooltips with the request number for duplicate names, hidden panes not focusable
  (Activity's `display: none` guarantees it), reduced motion respected.
- Scroll position of a hidden pane: Chrome restores a scroll container's offset after
  `display: none → visible` (measured in Chrome 154), but Firefox / Safari were not verified — keep the
  explicit save / restore.
- Focus: a hidden pane loses focus at the next rendering update; when a split closes, move focus to
  the remaining pane's tab or first field deliberately.

---

## 5. Phases and exit criteria

**Phase 0 — harness + baseline (do first).** Write `scripts/perf/tabs.mjs` with `puppeteer-core`
(already a devDependency; find Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
or take `--chrome <path>`), run against the production preview, drive the scenario of §3, record the
metrics of §7 for scenarios A–H, write `scripts/perf/tabs-baseline.json` and a markdown table. Exit:
the baseline reproduces §3.1 within noise.

**Phase 1 — render isolation.** Stable elements, memo boundary, stable contexts, `Activity`, single
render per interaction. Exit: 0 attribute writes in hidden panes on a switch; script time per
switch ≤ 16 ms; forced layout ≤ 5 ms; no long animation frame.

**Phase 2 — Motion discipline.** `layoutDependency` everywhere, memoized strip, isolated draggables,
`LayoutGroup` scope, nested-layout audit, timing table, `contain` / `will-change` experiments. Exit:
≤ 30 `getBoundingClientRect` calls per switch; per-frame style writes only on moving elements; no frame
over 20 ms during any transition at 60 Hz (headless Chrome: emulate with the harness, see §7).

**Phase 3 — shared tab system + visual model.** Build `src/synergy/tabs/`, migrate FormTabs,
AgendaTabs, StartPage category tabs and the content transitions; implement widths, closing freeze,
separators, hover pill, close-on-hover, ring-on-flare, fallback. Exit: screenshots (light / dark,
DPR 1 / 2, Chrome path and forced fallback path) attached; all §4.4 rules checked.

**Phase 4 — verification + docs.** Full matrix (§6), `CLAUDE.md` updated (FormTabs, AgendaTabs,
StartPage sections and a new `tabs/` section, approved exceptions), report with before/after tables.

---

## 6. Acceptance criteria (all must hold, production build)

Performance (harness, §7):
- No `long-animation-frame` entry (> 50 ms) for any scenario A–H.
- Script time of the click task ≤ 16 ms; forced style/layout ≤ 5 ms; `getBoundingClientRect` ≤ 30
  per interaction (A–F); 0 `name`/`type` attribute writes inside hidden panes.
- With CPU throttling 4× and 60 Hz emulation: no frame gap > 20 ms during the 500 ms after a click.
- Idle: 0 style writes, 0 measurements, 0 timers from the tab system.

Motion:
- Each transition matches §4.3; interrupting any transition with another click never leaves a
  mis-positioned pane, sheet or tab (test: five rapid alternating tab clicks; open then immediately
  close a child; close a tab while another is still appearing).
- Animation level "Az" shows fades only, "Kapalı" is instant, speed multiplier scales everything.

Visual:
- One strip implementation on FormTabs, WorkflowPage boxes (incl. "Geçmiş" label) and StartPage
  categories; sheet, flares and rings pixel-clean at DPR 1 / 1.25 / 2 in light and dark, round and
  squircle, radius Az / Orta / Çok; no hairline at the baseline or tab edge; flares never steal clicks.
- Chrome behaviours present: separators, hover pill, close on hover, width distribution with
  icon-only tabs, shrinking top radius, closing freeze, group line detour.

Code:
- `npm run lint` and `npm run build` clean; no new dependencies; no `.css` files, no raw HTML elements,
  Turkish comments; `CLAUDE.md` updated; pure functions have a self-check.

---

## 7. Measurement harness (reference implementation details)

Install at page load (before any interaction) via `page.evaluateOnNewDocument`:

```js
// Long animation frames (Chrome 123+): blocking time and forced layout attribution
window.__loaf = [];
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) window.__loaf.push({
    dur: Math.round(e.duration), block: Math.round(e.blockingDuration),
    scripts: e.scripts.map((s) => ({ dur: Math.round(s.duration), fn: s.sourceFunctionName,
      inv: s.invoker, forced: Math.round(s.forcedStyleAndLayoutDuration) })),
  });
}).observe({ type: 'long-animation-frame', buffered: true });

// Measurement counters (Motion measures with getBoundingClientRect; offset* forces layout)
window.__cnt = { gbcr: 0, offset: 0, gcs: 0 };
const P = Element.prototype, gbcr = P.getBoundingClientRect, gcs = window.getComputedStyle;
P.getBoundingClientRect = function () { window.__cnt.gbcr++; return gbcr.call(this); };
window.getComputedStyle = function () { window.__cnt.gcs++; return gcs.apply(window, arguments); };
for (const k of ['offsetWidth', 'offsetLeft', 'offsetTop', 'offsetHeight']) {
  const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, k);
  Object.defineProperty(HTMLElement.prototype, k, { configurable: true,
    get() { window.__cnt.offset++; return d.get.call(this); } });
}
```

Per interaction (run inside `page.evaluate`, self-contained, with a 400 ms warm-up so the rAF loop
is running before the click):

```js
async function measure(label, act) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const frames = []; let stop = false;
  const loop = (t) => { frames.push(t); if (!stop) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  await wait(400);
  // DOM churn per pane: name/type attribute writes = React re-rendered an <input> there
  const panes = [...document.querySelectorAll('[id^="form-pane-"]')];
  const churn = new Map(panes.map((p) => [p.id, { hidden: getComputedStyle(p).display === 'none', inputWrites: 0, styleWrites: 0 }]));
  const mo = new MutationObserver((list) => { for (const m of list) {
    const pane = m.target.closest?.('[id^="form-pane-"]'); const c = pane && churn.get(pane.id); if (!c) continue;
    if (m.attributeName === 'name' || m.attributeName === 'type') c.inputWrites++;
    else if (m.attributeName === 'style') c.styleWrites++; } });
  mo.observe(document.body, { subtree: true, attributes: true });
  window.__cnt = { gbcr: 0, offset: 0, gcs: 0 }; window.__loaf = [];
  const t0 = performance.now();
  act();
  await wait(1500);
  stop = true; mo.disconnect();
  const after = frames.filter((t) => t >= t0 - 1);
  const gaps = after.slice(1).map((t, i) => t - after[i]);
  return { label, frames: after.length, maxGap: Math.max(...gaps), over20: gaps.filter((g) => g > 20).length,
    counts: window.__cnt, loaf: window.__loaf, churn: Object.fromEntries(churn) };
}
```

Scenarios (drive with programmatic clicks on stable selectors; wait 1.8 s after opening a form for
`LOAD_MS`):

| Id | Action | Selector / method |
|---|---|---|
| setup | open request | goto `/is-akislari/bekleyen/satin-alma/bekleyen-satin-alma-0`, wait for `button` "Tedarikçi Teklifi Ekle" |
| setup | split, size 2 | click button text "Tedarikçi Teklifi Ekle" |
| setup | split, size 1 (root moves out) | click button text "Tedarikçi Kartını Aç" |
| setup | second group | click tab `[data-tab^="g0:"] [role=tab]`, then button with `aria-label` starting "Süreçler", then `.ant-popover .ant-table-row` containing "20014" |
| A | group switch | click `[data-tab^="g0:"] [role=tab]` (first) |
| B | tab switch to the split tab | click the `g0` tab whose view holds two forms |
| C | tab switch back to the single tab | click the first `g0` tab |
| D | group switch | click `[data-tab^="g1:"] [role=tab]` |
| E | open child size 3 | click button text "Mevcut Sözleşmeyi Aç" (in request 20014's root form) |
| F | tab switch | click the `g1` root tab |
| G | close child | click `[aria-label^="Kapat: Bakım"]` |
| H | idle 1.5 s | no action (must be all zeros) |

Run each scenario twice (first run includes one-time antd style injection), report the second. Also
run A–D with `page.emulateCPUThrottling(4)` and headless 60 Hz (`--disable-frame-rate-limit` is
**not** set; the default headless frame rate is 60 Hz) for the frame-gap criterion. Keep the data-tab
attributes (`data-tab="<group>:<view>"`) and pane ids (`form-pane-<group>:<form>`) stable so the
harness keeps working; if you rename them, update the harness in the same commit.

Manual checks in DevTools (document in the report): Performance panel → Animations track shows no
red "non-composited" triangles during pane moves; Rendering → Paint flashing shows paints only on the
moving panes and the strip; Layers → no layer explosion (≤ a handful of layers for the tab system).

---

## 8. Research digest (facts you may rely on; URLs for verification)

Motion (framer-motion 13.5 / motion-dom 13.5.1; https://motion.dev/docs/react-layout-animations,
https://motion.dev/docs/react-motion-component, https://motion.dev/docs/react-animate-presence,
https://motion.dev/docs/performance; source paths in `node_modules/motion-dom/dist/es/projection/`):
- `layoutDependency`: "Measurements will only occur when this value changes" — plus always when `drag`
  is set, when presence changes, and for every member of a `LayoutGroup` when any member updates.
- A dirty node = 2 × `getBoundingClientRect` + 2 style writes per commit; ancestors with Motion
  transforms get extra reads; a `layoutScroll` ancestor's scroll is read.
- During a layout animation Motion walks every projection node in the tree each frame
  (`propagateDirtyNodes → resolveTargetDelta → calcProjection`), and `layout` descendants of an
  animating node keep projecting (writing `transform`) until all ancestors stop.
- Scale correction exists only for `borderRadius` (number or `px` string via `style`, rewritten as a
  percentage) and the first `boxShadow`; `rem` / `calc()` / `var()` radii and class-based radii distort.
- `display: none` elements cannot be measured; a visible → hidden change produces a 0 × 0 target.
- `popLayout` positions the exiting child absolutely via an injected `[data-motion-pop-id]` rule using
  `offsetTop/Left`; the parent needs non-static `position`; with React 19 a plain component that
  attaches the `ref` prop works. `anchorX` / `anchorY` are marked "Internal" in the types.
- Hardware acceleration via WAAPI only for `opacity`, `clipPath`, `filter`, `transform` (as a whole
  string), `backgroundColor`, and only without `onUpdate`, `transformTemplate`, `repeatDelay`,
  `mirror`. Independent transforms (`x`, `scale`) and layout animations are main-thread.
- Motion does not add `will-change` automatically since 11.11.9; `useWillChange()` writes only
  `transform`.
- Springs: `visualDuration` + `bounce`; `dampingRatio = max(1 − bounce, 0.05)`,
  `stiffness = (2π / (visualDuration × 1.2))²`; halving `visualDuration` keeps the curve shape.
- `useReducedMotion` does not re-render on OS changes (no subscription in 13.5 source).
- Reorder: `Reorder.Group`/`Item` render raw tags (`ul`/`li` via `as` string) → not usable here; its
  algorithm (swap when the leading edge crosses the neighbour centre, one swap per drag event, guard
  until re-render) is the model to copy.
- Motion's own comparison: View Transitions are "not interruptible", "block interaction", snapshot
  based, one at a time, and "less performant" than layout animations in stress tests. `AnimateView`
  (framer-motion/animate-view, needs React 19.3) is for page-level transitions.

React 19.3 (https://react.dev/reference/react/Activity, https://react.dev/blog/2026/09/09/react-19-3):
- `Activity` is stable: hidden = `display: none` (inline, `!important`), state kept, Effects destroyed
  and re-created on reveal, updates deferred at lower priority, portals hidden (19.3). Think of a hidden
  Activity as unmounted for side effects; `<StrictMode>` eagerly cycles it.
- `ViewTransition` / `addTransitionType` are stable in 19.3 but only run inside Transitions and are not
  used for tabs here.
- `startTransition` makes a tab switch interruptible (optional, after memoization).

CSS (https://developer.mozilla.org/en-US/docs/Web/CSS/corner-shape,
https://developer.chrome.com/blog/corner-shape, https://drafts.csswg.org/css-borders-4/#corner-shaping):
- `corner-shape`: Chrome / Edge 139+ shipped; Firefox only Nightly 158 behind
  `layout.css.corner-shape.enabled`; Safari only Technology Preview 251+; detect with
  `@supports (corner-shape: scoop)` (Tailwind: `supports-[corner-shape:scoop]:`). Needs a non-zero
  `border-radius`. `scoop` = `superellipse(-1)`; the project uses `superellipse(-2)` for the squircle
  theme's concave corners. The border follows the curve at constant distance; `box-shadow` and the
  overflow clip are scaled axis-aligned. It interpolates, but do not animate it (Motion would not route
  it to WAAPI anyway).
- Radial-gradient flares anti-alias poorly at fractional DPR (soft 1 px bands, hairlines when boxes
  abut); the border + offset box-shadow construction gets native anti-aliasing and an exact ring
  (https://css-tricks.com/better-tabs-with-round-out-borders/).
- `overflow: clip` is not a scroll container (keep using it for clip boxes); `contain: layout paint`
  creates a containing block for `position: fixed` descendants (antd popups portal to `body`, so it is
  safe for panes). `content-visibility: hidden` adds size containment and keeps the box in flow — not
  suitable for hidden panes here; `Activity`'s `display: none` is the choice.
- Compositor-only properties: `transform`, `opacity` (plus `filter`); `will-change` sparingly, on and
  off around the animation.

Chromium tab strip (sources: `chrome/browser/ui/views/tabs/common/horizontal_tab_style_views.cc`,
`chrome/browser/ui/tabs/tab_style.cc`, `chrome/browser/ui/layout_constants.cc`,
`horizontal/horizontal_tab_closing_helper.cc`, `common/tab_group_line_view.cc`): the numbers and
behaviours quoted in §4.4; the active tab's painted flares are outside its hit region; separators are
hidden next to active / selected / hovered tabs and fade with hover; the group line is one stroked path
that detours around the active tab's outline; layout animations 200 ms ease-in-out; width freeze while
closing until the pointer leaves the strip.

Measurement APIs: Long Animation Frames (`long-animation-frame`, Chrome 123+;
`scripts[].forcedStyleAndLayoutDuration`), DevTools Performance → Animations track marks
non-composited animations, Rendering → Paint flashing / Layer borders.

---

## 9. Do-not list

- Do not use View Transitions, `AnimateView`, `AnimateActivity` (Motion+ only) or React Compiler.
- Do not add CSS files, `<style>`, `@apply`, raw HTML elements, new dependencies, or monospace fonts.
- Do not animate `corner-shape`, `width`, `left`, `height` or CSS variables per frame.
- Do not let a context value flip on a tab switch; do not create pane elements in render.
- Do not use `content-visibility: hidden` for panes; do not measure a `display: none` pane.
- Do not rely on Motion internals (`anchorX`, `anchorY`, `presenceAffectsLayout`).
- Do not use `AnimatePresence mode="wait"` where a user can click again before the exit finishes.
- Do not invent product features beyond §4.4; do not change the pure reducers' semantics.
- Do not report numbers from the dev server as results.

---

## 10. Deliverables

1. Code: `src/synergy/tabs/` + migrated `FormTabs.tsx`, `AgendaTabs.tsx` (or its replacement),
   `StartPage.tsx` category tabs, `ant/motion.tsx` / `ant/hr.tsx` content transitions, `DetailPage.tsx`
   adjustments (stable `renderRoot`, smaller `LayoutGroup`), theme variables if needed.
2. `scripts/perf/tabs.mjs`, `scripts/perf/tabs-baseline.json`, `scripts/perf/tabs-after.json`.
3. `CLAUDE.md` updated: new `tabs/` section, FormTabs / AgendaTabs / StartPage sections, approved
   exceptions, measurement workflow (`npm run build && npx vite preview … && node scripts/perf/tabs.mjs`).
4. A short report (`docs/tab-system-rewrite.md`, English or Turkish): before/after tables per
   scenario, the visual decisions you made where this brief left room (fallback technique, contain /
   will-change results), screenshots (light / dark, DPR 1 / 2, Chrome path and forced fallback path), the
   interruption tests, and any deviation from this brief with its reason.
