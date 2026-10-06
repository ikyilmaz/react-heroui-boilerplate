# Tab system rewrite — report

All tab structures (form tabs, workflow boxes, Başlangıç categories) now run on one module,
`src/synergy/tabs/`. Tab and group switches cost a 1–2 ms click task, force no layout, and drop no
frames at 60 Hz. No form re-renders on a switch. This report covers the measurements, the design,
and every place the implementation departs from the brief (`TAB_SYSTEM_REWRITE_PROMPT.md`).

## How it was measured

- Production build only: `npm run build && npx vite preview --port 4173 --strictPort`.
- `node scripts/perf/tabs.mjs --out scripts/perf/tabs-after.json` drives the scenario of brief §3
  (two groups, three tabs, four mounted forms) and the A–H interactions. It records:
  - the click task from a Chrome trace, with forced style/layout and the longest task;
  - Long Animation Frames, rAF frame gaps, and `getBoundingClientRect` / `offset*` / `client*` /
    `getComputedStyle` counts;
  - `name`/`type` attribute writes per pane, which mark an `<input>` re-render;
  - style writes per element.

  Each interaction runs once to warm up, then 3 measured rounds. The table shows the median; long
  frames and frame gaps are the worst round. A–D also run with `emulateCPUThrottling(4)` at headless
  60 Hz.
- Environment: Chrome 154, 1512×945 @2x, Apple M2 Pro, same machine and harness for before and
  after.
- `scripts/perf/tabs-baseline.json` is the original code (commit `95683d9`, built in a temporary
  worktree) measured with the final harness. The Phase 0 run with the first harness version
  reproduced brief §3.1:

  | Measure | Phase 0 run | Brief §3.1 |
  |---|---|---|
  | Switch click task | 77–121 ms | 100–126 ms |
  | Forced style/layout | 17–25 ms | 20–45 ms |
  | `getBoundingClientRect` calls | 116–141 | 115–141 |
  | Input writes in hidden panes per switch | 98–202 | — |

## Results (production build)

"Click task" is the browser task that handles the click. Switches, opening and closing are now
React transitions: the click task only schedules the update, and the render runs in ≤5 ms slices
followed by one commit task. "Longest task" is therefore the honest per-interaction cost.

| Scenario | Click task ms (before → after) | Forced style/layout ms | Longest task ms | Long frames >50 ms per round | getBoundingClientRect | Input writes in hidden panes (sum of 3 rounds) | Style writes (elements) | Frames >20 ms |
|---|---|---|---|---|---|---|---|---|
| A Group switch (g1 → g0) | 78.5 → **0.9** | 19.4 → **0** | 78.5 → **10.7** | 1/1/1 (max 87) → **0** | 125 → **0** | 606 → **0** | 584 (15) → 277 (5) | 1 → **0** |
| B Tab switch to the split tab | 116.2 → **1.1** | 23.2 → **0** | 116.2 → **13.5** | 1/1/1 (max 127) → **0** | 116 → **24** | 408 → **0** | 1051 (26) → 862 (16) | 1 → **0** |
| C Tab switch to a single tab | 103 → **2.4** | 22.7 → **0** | 103.1 → **12.1** | 1/1/1 (max 128) → **0** | 131 → **25** | 408 → **0** | 1056 (26) → 791 (16) | 1 → **0** |
| D Group switch (g0 → g1) | 83 → **1** | 17.6 → **0** | 83 → **14.8** | 1/1/1 (max 102) → **0** | 133 → **0** | 336 → **0** | 470 (17) → 167 (5) | 1 → **0** |
| E Open child, panel size 3 | 91.9 → **2** | 8.2 → **0** | 91.9 → **39.5** | 2/1/2 (max 104) → **1/1/1 (max 59)** | 129 → **47** | 588 → **0** | 780 (22) → 760 (23) | 3 → **1** |
| F Tab switch to g1 root | 98.7 → **1** | 17.2 → **0** | 98.7 → **14.4** | 1/1/1 (max 119) → **0** | 141 → **26** | 555 → **0** | 959 (20) → 621 (16) | 1 → **0** |
| G Close child | 25.9 → **2** | 0 → **0** | 25.9 → **10.4** | 0/1/0 (max 58) → **0** | 50 → **31** | 294 → **0** | 24 (3) → 26 (2) | 1 → **0** |
| H Idle 1.5 s | – | – | 0.1 → 0.1 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |

4× CPU throttling, 60 Hz, first 500 ms after the click:

| Scenario | Click task ms | Largest frame gap | Frames >20 ms | Long frames |
|---|---|---|---|---|
| A Group switch | 230.9 → **1.1** | 300 → **17** | 3 → **0** | 1/1/1 (max 326) → **0** |
| B Tab switch to split | 333.7 → **0.9** | 400 → **33** | 2 → **1** | 1/1/1 (max 422) → **0** |
| C Tab switch to single | 371 → **1.6** | 417 → **33** | 1 → **1** | 1/1/1 (max 428) → **0** |
| D Group switch | 205.5 → **1.4** | 250 → **33** | 1 → **1** | 1/1/1 (max 262) → **1/0/0 (max 50)** |

Animation levels (after; click task / longest task / style writes):

| Scenario | Full | Az (fades only) | Kapalı (instant) |
|---|---|---|---|
| A | 0.9 / 10.7 / 277 | 2.1 / 6.8 / 33 | 0.9 / 7.1 / 3 |
| B | 1.1 / 13.5 / 862 | 0.9 / 12 / 97 | 1.8 / 8.5 / 46 |
| C | 2.4 / 12.1 / 791 | 1.8 / 10.2 / 92 | 1.9 / 9.4 / 48 |
| D | 1 / 14.8 / 167 | 1.7 / 13.6 / 33 | 2 / 8.8 / 3 |
| E | 2 / 39.5 / 760 | 2.2 / 30.1 / 93 | 1 / 35.5 / 57 |
| F | 1 / 14.4 / 621 | 1.8 / 13.5 / 82 | 1.4 / 11.7 / 50 |
| G | 2 / 10.4 / 26 | 2.4 / 10.4 / 11 | 1.9 / 7.3 / 11 |

### Acceptance criteria (brief §6)

| Criterion | Status |
|---|---|
| Click task ≤ 16 ms | **Met** for all interactions (≤ 2.4 ms). |
| Forced style/layout ≤ 5 ms | **Met**: 0 in every click task. |
| 0 input writes in hidden panes | **Met**: 0 in every pane, including the panes being shown or hidden. |
| Idle: no writes, measurements or timers | **Met**: all zeros. |
| No long frame (> 50 ms) in A–H | **Met except E.** The new form's reveal at +1 s is a ~35–52 ms task (antd mounting effects, see Known gaps), giving one 54–59 ms frame per round. |
| `getBoundingClientRect` ≤ 30 per interaction (A–F) | **Met for A–D and F (0–26). E is 47**: 16 are the dock animating the longer breadcrumb (legitimate, outside the tab system), the rest are the strip's tabs (structure changed) and the new form's Motion nodes. |
| 4× throttling: no frame gap > 20 ms | **Not met.** One 33 ms frame per switch (baseline: 250–417 ms). See Known gaps. |

## What changed

### `src/synergy/tabs/` (new)

- **`TabStrip.tsx`**: the strip and its parts. `TabStrip`, `TabGroup` (label, or coloured dot plus
  underline; drags as a unit from its handle tab), `Tab` (hover pill, separator, context menu, drag),
  `TabButton` (role=tab button or `Link`), `TabClose`. FormTabs, AgendaTabs and the Başlangıç
  categories all compose these.
- **The selected sheet** is three transform-only parts: start cap, scaled middle, end cap, driven by
  MotionValues.
  - Its target comes from cached tab positions. The cache is refreshed only in the ResizeObserver
    callback (layout already clean) and when the structure (`layoutKey`) changes, never on a plain
    switch.
  - Targets snap to device pixels. The middle runs one device pixel under each cap, so no seams.
  - Flares and the ring are never scaled.
- **Sizing `chrome`**: CSS flex water-filling.
  - Tabs grow equally and stop at their natural width; the selected tab keeps `min(9rem, natural)`.
  - Inactive tabs shrink to 2.75rem and become icon-only below 5rem. The ResizeObserver writes
    `--nat` / `data-compact` directly, with no React render.
  - The strip scrolls only when even those minimums don't fit.
- **Closing freeze** and **manual drag**: as specified in brief §4.4 / §4.5. Group closes subtract
  the whole group block and its gap.
- **`Panes.tsx`**: `Pane` (memo) and `Divider`.
  - Panes never move in the DOM. Each has a fixed absolute box with inline widths.
  - Hidden panes use `content-visibility: hidden`.
  - Motions: enter, fade-out in place, push-in / push-out and exit fade.
  - Each form is pre-rendered behind the skeleton in a hidden `<Activity>`.
  - The divider writes widths directly while dragging and slides with a MotionValue on keyboard
    ratio changes.
- **`ContentSwitch.tsx`**: the one direction-aware content transition. It replaces `SwitchPanel`
  and `DirectionalPanels`; FormTabs' panes use the same timing through `motion.ts`.
- **`motion.ts`**: the timing table (`useTabMotion`) and `useDirection`. `shape.ts`: class strings.
  `context.ts`: `useOpenChild`, `useTabScroller`.
- **`widths.ts`**: pure decisions (freeze reducer, swap target, thresholds). Self-check:
  `node --test scripts/tabs/widths.test.mjs` (6/6).

### Render isolation, inside and outside the tab system

- Contexts that changed on every shell render are now stable: `LookContext` (memoized `look`),
  `SettingsContext`, and `AntTheme`'s `ConfigProvider` (memoized config, constant `wave` / `card`
  objects). Before this, every breadcrumb change re-rendered every antd input in every pane.
- Pane elements are built once per key, and `renderRoot` is stable. `OpenChildContext` is stable per
  group, and `PaneContext` doesn't change on a switch.
- `useFillHeight` and `useSidePanel` ignore ref detaches and skip measuring hidden elements.
- `useFrame` (breadcrumbs) updates as a transition.
- The dock's Motion nodes got a `layoutDependency` (crumbs, app, placement). Before, they re-measured
  on every shell render and forced a flush before every commit.
- `LayoutGroup` in DetailPage now wraps only the Süreçler trail.
- Selecting, opening and closing are `startTransition` updates.

## Deviations from the brief (measured)

1. **`<Activity>` is not used for hidden panes.** I implemented it first and measured.
   - With Activity, a reveal re-runs every mount effect of a whole antd form. rc-util's scrollbar
     probe (antd Table) inserts and removes a `<style>`, so every switch restyles the whole document.
   - Motion elements also remount and replay their entrance animations: the form crossfade ran
     again on every switch.

   | Same Phase 1 code | Click task | Forced style |
   |---|---|---|
   | With Activity | 66–98 ms | 32–45 ms |
   | Without Activity | 24–48 ms | 5–11 ms |

   Activity is still used where it fits: pre-rendering each loading form once, behind its skeleton.
2. **Hidden panes use `content-visibility: hidden` in fixed absolute boxes, not `display: none`.**
   - Per-pane style cost of toggling (333-element form): `visibility` 5–20 ms, `pointer-events`
     4–11 ms, `inert` 4–7 ms, `display` 1–5 ms plus re-layout on show, `content-visibility`
     ~0.3 ms.
   - The brief's objections (size containment, stays in flow) don't apply: each box is absolute and
     sized by position, not content.
   - Contents keep their rendering state and scroll position, are not focusable, and are not
     painted. The explicit scroll save/restore was therefore dropped.
3. **The sheet is not a `layoutId` element.** A `layoutId` sheet must be measured after every
   commit, which forces layout of the newly shown pane. It also scales, which stretches the flares
   and the 2px ring. The 3-part sheet animates from cached positions with transforms only.
4. **Width distribution is CSS, not JS.** Tab widths are therefore fractional (flex), not integers.
   Crispness is restored by snapping the sheet to device pixels. `widths.ts` holds the pure decisions
   (freeze, drag, thresholds) rather than a distribution function.
5. **Group collapse.** Brief §4.5 lists "only the active group open, others collapse to one tab".
   The existing code shows every group's tabs, though its header comment and `formGroups.ts`
   describe collapse. I kept the rendered behaviour.
6. **Changes outside `tabs/`** (all render-isolation fixes for the tab switch):
   - `themeSettings.ts`, `index.tsx`, `ant/theme.tsx` (stable contexts);
   - `StartMenu.tsx` and `index.tsx` (dock `layoutDependency`);
   - `paths.ts` (breadcrumb transition);
   - `hooks.ts`, `DetailSide.tsx` (hidden-tolerant measuring);
   - `shared/transition.ts` (shared `scaleTransition`; `visualDuration` springs scale by speed).

## Visual decisions

- **Flares.**
  - Chrome path (`corner-shape` supported): a `scoop` box (squircle theme: `--corner-concave`)
    whose ring is a real border.
  - Fallback (Safari, Firefox): a transparent box with a convex corner, the ring as its border, the
    fill as an unoffset spread shadow clipped to the corner square.
  - Compared at 4× zoom in Chrome, with the fallback forced by stripping the `supports-` classes, at
    DPR 1, 1.25 and 2, light and dark. The two new paths render identically. The old radial-gradient
    fallback was visibly stair-stepped at DPR 1, and the old Chrome path left faint box edges at the
    flares.
  - The radial-gradient path is deleted. Firefox could not be automated here (headless Firefox 155
    would not start under puppeteer), so the fallback has not been checked in a real
    non-`corner-shape` browser.
- **Tab radius** is capped at `min(radius × 2, 16px × corner-scale)`; the flares use the same
  radius.
- **Group ring and underline** are 2px. In coloured strips the selected label is neutral semibold.
- **Hover and close**: separators are 1×16px; the hover pill is foreground 7% (group tint at 14% in
  coloured strips). Close buttons show on hover / focus, and always on the selected tab.
- **Experiments not kept** (brief §4.2: keep only if measurably better):
  - `contain: layout paint` on panes: no change; E got worse.
  - `will-change: transform, opacity` only while a pane moves: one throttled scenario improved, but
    unthrottled runs gained occasional 33 ms frames.

## Interaction tests

`node scripts/perf/interactions.mjs` passes **22/22**. After each test (1 s settle) it checks:
- the sheet is on the selected tab within 1 px;
- the visible panes are exactly the selected tab's forms, at full opacity, with no leftover
  transforms;
- hidden panes are skipped;
- tabs have no transforms left;
- there are no page errors.

| Test | Animation levels |
|---|---|
| Page mode (single form, no tabs): the pane fills its container and the page scrolls | full |
| Menu app forms: page mode, second app opens as a new group, reopening an open app switches to it (form not rebuilt), alongside a request group, closing with "İptal" / group close, last "Kapat" returns to Başlangıç | full |
| Back to page mode after a child opens and closes | full |
| Five rapid alternating tab clicks | full, Az, Kapalı |
| Open a child, then immediately close it | full, Az, Kapalı |
| Close a tab while another is still appearing | full, Az, Kapalı |
| Drag a group by its root tab to reorder groups | full |
| Keyboard: arrow keys and Enter | full |
| Keyboard: Delete | full |
| Divider keyboard (End → 70%) | full |
| Closing freeze (1100 px window, six groups, mouse close of a group) | full |

The freeze test checks that the remaining widths are unchanged, then that tabs grow back once the
pointer leaves the strip.

## Known gaps

- **Fixed after review:** in page mode (a single form, no tabs) the pane was a flex item without a
  basis and collapsed to its content's minimum width. The two page-mode tests above now cover it;
  the performance scenarios all start with a child open, which is why they missed it.

- **4× throttling.** One frame of ~33 ms remains per switch. The transition commit (DOM writes,
  effects, and a style flush Chrome forces when the focused tab's `tabindex` changes) plus the
  frame's style and paint total about 10 ms of real work. At 4× that cannot fit in 16 ms.
- **E form reveal.** The reveal at +1 s runs the new form's mount effects at once (antd measuring;
  the Table's scrollbar probe restyles the document), giving a 35–52 ms task.
  - Mounting the form earlier, behind `content-visibility: hidden`, split the cost but broke layout:
    the side panel measured zero sizes while hidden. Reverted.
  - A real fix needs changes inside the form (`DetailPage` / antd Table), which are out of scope.
- **Dark mode, DPR 1 and 2.** A faint 1-device-pixel vertical sliver (~7% ring colour, ~5 CSS px
  tall) appears just under the ring at the start cap's right edge.
  - Widening the cap didn't remove it, so it was reverted.
  - It was not investigated further after screenshots were dropped.
- **DevTools manual checks** (Animations track, paint flashing, layer borders) were not done in the
  UI. The trace-based numbers above stand in for them.
- **Screenshots** were dropped on request. `scripts/perf/shots.mjs` remains if they're wanted later.
- **Bundle (side note).** Still one ~1.98 MB chunk (626 kB gzip); the tab code adds ~11 kB. Natural
  lazy-loading candidates are the HR module, the dashboard widgets with `react-grid-layout`, and the
  decision dialogs.
