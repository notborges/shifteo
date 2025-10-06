# BlackOps UI — Design System (Spec‑Only, Tailwind‑Oriented, No Code)

Purpose: a single, self‑contained file that defines a reusable design language so any page can feel like the three reference UIs (agent dashboard, workflow builder, global ops). No code. Use these names and rules as your single source of truth and map them into Tailwind tokens on implementation.

Last updated: today

---

## 1) Design Principles

1. Mission‑brief tone: concise, technical, low ornamentation.
2. Hierarchy by layering, not bright colors: canvas → panel → inset → content.
3. Dense but legible: tight spacing, strong alignment, generous contrast.
4. Mono where identity matters: IDs, timestamps, counts, logs.
5. Color indicates state; neutral chrome is gray.
6. Quiet motion, micro not macro; everything keyboardable.

---

## 2) Foundations (Token Contract — name → value)

All names below are canonical. Map them to your theme system. Do not change names casually.

### 2.1 Color
Backgrounds
- bg.canvas → #0B0C0E (near‑black)
- bg.panel  → #111215
- bg.inset  → #16181D

Lines
- line.grid   → #1F2228
- line.hair   → rgba(255,255,255,0.08)
- keyline     → #2A2E36

Text
- text.primary   → #E6E7EB
- text.secondary → #B4BAC5
- text.muted     → #808794
- text.disabled  → #5A606B
- text.monoAccent→ #CDD6F4 (sparingly)

Semantic accents
- acc.success → #3DDC7B
- acc.warning → #FFB454
- acc.error   → #FF5C5C
- acc.info    → #43C6E0
- acc.ai      → #A78BFA

Charts
- chart.primary  → #D1D6E2
- chart.baseline → #7F8796
- chart.fill     → rgba(209,214,226,0.08)

### 2.2 Typography
Families
- ui.sans → Inter (or system equivalent)
- ui.mono → JetBrains Mono (or system mono)

Scale (size/line‑height)
- display → 28/34
- title   → 20/28
- body    → 14/20
- meta    → 12/18 (mono)

Rules
- Titles may be UPPERCASE with +25 letter‑spacing.
- Numbers/IDs/timestamps use ui.mono with tabular lining figures.
- Avoid italics; use weight and case for hierarchy.

### 2.3 Spacing, Radii, Elevation
- Spacing scale → 4, 8, 12, 16, 24, 32
- Panel padding → 16 (compact 12)
- Row heights → 40–44 (compact −2)
- Radius.panel → 12
- Radius.chip  → 8
- Radius.button→ 10
- Border width → 1px hairline; secure modules may add inner 1px ring
- Shadow.panel → soft, low spread; inset blocks avoid drop shadows
- Glow.accent (rare) → soft outer glow in state color for live/armed states

### 2.4 Breakpoints
- xs < 640, sm ≥ 640, md ≥ 768, lg ≥ 1024, xl ≥ 1280, 2xl ≥ 1440
- Target max content width ≈ 1440; edge padding 24 desktop, 16 tablet, 12 mobile

---

## 3) Layout Language

### 3.1 Page Chrome
- Top bar height 56 with page title (title style) and mono “Last update … UTC” microcopy.
- Right cluster hosts global actions (help, theme, user). Keep to icons with tooltips.

### 3.2 Grid
- Fluid 12‑column grid, 24 gutter. Align panels to the grid; avoid free‑floating blocks.

### 3.3 Panel Anatomy (universal on all pages)
1. Header row: section name (title style), right‑aligned meta (meta style), optional filter chips.
2. Body: content with consistent padding; may include a local toolbar.
3. Footer: pagination or “Updated Xm ago” line (meta).

### 3.4 Density Modes
- Default: body 14/20, row height 40–44, gaps 12–16.
- Compact: body 13/18, rows −2px, gaps −2. Persist per user.

---

## 4) Component System

Each component defines purpose, anatomy, states, and usage. Use the names verbatim.

### 4.1 KPI Tile
Purpose
- Show one number with a label; optionally include a tiny trend.

Anatomy
- Number (display, mono optional)
- Caption (body)
- Optional sparkline or micro delta

States
- Neutral (chrome only), success, warning, error.
- Avoid colored backgrounds; use colored text/icons.

Rules
- One unit per tile. Align tiles to a rhythm grid.

### 4.2 List / Table
Purpose
- Dense tabular or hybrid list display.

Anatomy
- Header row: UPPERCASE labels with +25 letter‑spacing
- Rows 40–44 high; zebra striping at 4% opacity optional
- Trailing action cluster reveals on hover/focus
- Selection uses cyan keyline and 8% cyan fill

States
- Sorting shows tiny caret in acc.info
- Empty: contextual illustration + single CTA
- Loading: skeleton rows; no spinner‑only

### 4.3 Activity Log Line
Purpose
- Chronological operational events.

Format
- “[YYYY‑MM‑DD HH:mm UTC] — Message …” in meta mono
- Entities (agents, cities, nodes) are tokens (chips) and act as filters
- System phrases (e.g., KEY LOCKED) appear in uppercase, short, amber

### 4.4 Badge (Chip)
Purpose
- Compact status or filter tokens.

Anatomy
- 8 radius pill; 1px hairline; neutral inset background
- Text colored per semantic state

States
- SECURE (info), DISTORTED (warning), KEY LOCKED (warning), FAILED (error), LIVE (info)

### 4.5 Buttons
Types
- Quiet (text‑only): for dense toolbars; underline on hover
- Solid: inset background + hairline
- Destructive: red keyline; hover adds 10% red fill

Rules
- Keep labels terse (≤2 words).

### 4.6 Segmented Control
Purpose
- Small mutually exclusive ranges (e.g., 1D / 1W / 1M).

Behavior
- Active tab shows cyan underline; others neutral.
- Never mix with dropdowns in the same control group.

### 4.7 Charts
Line Chart
- One solid primary series and one dashed baseline; markers appear only on hover; faint gridlines.

Mini Distribution Grid
- Three labeled rows (e.g., High / Medium / Low) each with 10 small cells or dots; fill left‑to‑right.

Histogram Mini
- “Ops per day” style; compact bars in muted color with slight variability.

Accessibility
- Color + pattern differences; data labels available on focus/hover.

### 4.8 Globe / Map Motif (Optional Visual)
Purpose
- Convey spatial context without full GIS complexity.

Elements
- Wireframe sphere in low‑opacity cyan; dotted orbits
- Region callouts: label in caps + short paragraph; dotted leader lines

Rules
- Decorative but informative; clicking regions filters lists.

### 4.9 Workflow Node
Purpose
- Represent units in a process canvas.

Anatomy
- Block with name at left, status pills at right
- Connection ports show on hover/focus
- Edge labels like /TRUE, /IF appear as tiny chips centered on edges

States
- Draft (muted), Active (info accent), Done (success), Error (error)
- Locked (running) disables edits and overlays a tiny progress stripe

### 4.10 Toast
Purpose
- ephemeral feedback

Spec
- Bottom‑right, mono line with icon, auto‑dismiss ≈3s
- Variants: success, info, warning, error

### 4.11 Modal
Purpose
- Critical or focused tasks.

Spec
- Width 640–960; header with optional badge “SECURE CHANNEL”
- Dim background to 70%; keep motion minimal

---

## 5) State & Feedback System

Global meanings
- success → green; warning → amber; error → red; info/live → cyan; ai/automation → purple.

Operational states
- Live/Syncing: pulsing cyan dot + LIVE chip
- Stale Data (>10 min): amber badge in panel header and diagonal stripes overlay at 6% opacity
- Error: red left border on the panel and an inline cause line; provide “Copy details” action
- Disabled/Offline: reduce opacity to ~55% and show explanatory meta line

Empty & Loading
- Empty: monochrome wireframe illustration, one sentence, one CTA
- Loading: header shimmer and skeleton content; avoid spinner‑only

---

## 6) Page Patterns (use as templates, not prescriptions)

### 6.1 Overview Page
- Top: 3–5 KPI tiles; right‑aligned activity log (latest 3–6 lines)
- Middle: primary visualization (line chart or histogram)
- Bottom: table or cards for entities, with filters as chips
- Sidebar (optional): secure chat or quick filters

### 6.2 Builder Page
- Left dock: feature palette (icons + labels in a collapsible stack)
- Center: infinite canvas with nodes and edges; top canvas toolbar (name, last update, zoom, run)
- Right drawer (optional): node details and run logs
- Interactions: drag, box select, connectors on hover, keyboard shortcuts for zoom/run

### 6.3 Ops Console
- Left: agent or asset card with mini stats
- Center: globe/map motif with callouts + timeline histogram
- Right: operations list with compact actions (“Details”, “Join”)
- Range segmented control in the view header (1D / 1W / 1M)

---

## 7) Interaction, Motion, Keyboard

- Micro‑motion 120–160ms ease‑out; respect reduced‑motion preferences.
- Reveal on intent: secondary actions appear on hover/focus.
- Keyboard examples:
  - / → focus search
  - g d → go overview, g w → workflows, g o → ops
  - z + / z − → zoom canvas; space → pan
  - r → run active workflow (confirm)

---

## 8) Accessibility

- Contrast ≥ 4.5:1 for text; ≥ 3:1 for large numerals.
- Color is never the only signal: pair with icon or shape.
- Focus: dual ring (inner dark, outer cyan); always visible.
- Hit targets: ≥40×40 for main actions, ≥32×32 in dense areas.
- Screen reader labels include status and time (“SECURE CHANNEL, live, updated 2 minutes ago”).

---

## 9) Content & Microcopy

- Timestamp format: DD/MM/YYYY HH:mm UTC by default (user‑overridable).
- Style: terse, action‑forward. Prefer fragments to full prose in logs.
- System bursts use uppercase for brevity: KEY LOCKED, COMMS STATUS: DISTORTED.
- Entity names become chips; clicking a chip filters all panels consistently.

---

## 10) Governance

- Token changes require review; do not introduce ad‑hoc colors.
- Add components only if they generalize across two or more pages.
- Document examples with screenshots; keep this file as the canonical spec.

End of file.
