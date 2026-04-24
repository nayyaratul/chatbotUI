# Comparison / Side-by-Side Widget — Design Spec (v1, superseded)

> **Superseded by `2026-04-24-comparison-widget-design-v2.md`.** The v1 gutter-rail shape below shipped (commits `6259c2b` → `4995cb3`) but was redirected after UX review: the two-value pairing didn't read because the icon-only indicator and lack of column headers left the A↔B relationship ambiguous. v2 replaces the gutter rail with an explicit 4-column table (`Criterion · a_value · status chip · b_value`) plus a dual-item band that identifies each side with a Lucide icon + eyebrow label. Kept here for historical reference — do not build from this spec.

**Status:** Superseded · v2 is authoritative.
**Widget number:** #22 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P1, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (everything below conforms to it; the doc wins in any conflict).

---

## Purpose

A display-only (optionally actionable) card that explains a verdict by showing **two items side-by-side** with per-criterion match indicators between them. Covers three use cases: **candidate vs role** (hiring/placement), **current skills vs required skills** (training gap analysis), and **submitted vs expected specification** (QC value-based check — image/bounding-box comparisons stay with QC Evidence Review).

The widget's job is to make the verdict self-evident in a single glance by foregrounding where the two items agree and where they diverge. The signature moment is the **center gutter rail** that scans down the criteria and resolves each one into a tri-state indicator (match / gap / partial).

## Variants

Three variants sharing one shell. Header icon, default column labels, and example payload differ. Everything else is identical.

| Variant | Icon (Lucide) | Column-A label (default) | Column-B label (default) | Typical mix |
|---|---|---|---|---|
| `candidate_match` | `GitCompare` | You | Role needs | mostly `match`, 1–2 `partial` / `gap` |
| `skills_gap` | `TrendingUp` | Your skills | Target level | mostly `gap` / `partial`, some `match` |
| `qc_spec` | `ClipboardCheck` | Submitted | Expected | mix of `match` / `gap` / `partial` |

Default variant for the mock-bot trigger is `candidate_match` (best balance of outcomes — reads the gutter clearly).

## Payload schema

```js
{
  widget_id: 'cmp_xxx',                        // makeId('cmp')
  variant: 'candidate_match' | 'skills_gap' | 'qc_spec',
  item_a: {
    label: string,                              // e.g. 'You'
    subtitle?: string,                          // e.g. 'Ravi Kumar'
  },
  item_b: {
    label: string,                              // e.g. 'Role needs'
    subtitle?: string,                          // e.g. 'Shipping Assistant'
  },
  criteria: [
    {
      name: string,                             // e.g. 'Experience'
      a_value: string,                          // e.g. '3 yrs'
      b_value: string,                          // e.g. '2+ yrs'
      status: 'match' | 'gap' | 'partial',
      note?: string,                            // optional expandable detail
    },
  ],
  action?: {                                    // optional CTA; if absent, widget is display-only
    label: string,                              // sentence-case verb — 'Apply now', 'Close gaps with training'
    intent: 'primary' | 'neutral',
  },
}
```

Result sent to the bot on action tap (`widget_response`):

```js
{ widget_id, variant, action: action.label, acted_at: ISO }
```

Criteria cap is **8** per §11 (stagger cap). If a payload ships >8, render only the first 8 and log once in dev — this keeps the stagger honest. If the spec grows to demand scrolling criteria lists, that's a schema rev, not an override.

## Layout

Approach chosen: **center gutter rail.** Two equal-width value columns flanking a narrow center column that holds the match indicator for each criterion. The gutter is the signature moment; everything else is standard family chrome.

```
┌───────────────────────────────────────────────────────────┐
│  [icon]  Title                                            │   header (§2)
│          Subtitle                                         │
│                                                           │
│  YOU              ·                 ROLE NEEDS            │   column-label row
│  Ravi Kumar       ·                 Shipping Assistant    │   (eyebrow + subtitle)
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Experience       3 yrs     ✓     2+ yrs             │  │   criteria grid
│  │ Languages        Hi, En    ~     Hi + regional      │  │   (alternating tint)
│  │ Shift            Evening   ✓     Evening            │  │
│  │ Own vehicle      No        ✗     Yes (2-wheeler)    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   summary pill
│  3 of 4 criteria met                                      │   (§6 linear-fill)
│                                                           │
│  [ Apply now ]                                            │   optional CTA
└───────────────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`. `width: 100%`, slot owns cap (family 32rem — **no `data-widget-variant="wide"`**). Min-height floor `24rem` per §4 mid-density class.

**Header (§2 exact).**
- Left: 36×36 icon badge, variant-specific Lucide icon, tinted `brand-60` per §2. The badge tint is always brand — the gutter carries the verdict tone, not the header. This widget is not "tone-aware" at the card level (§9) — each row carries its own status tone.
- Middle: `h3` title = variant-appropriate heading (e.g. `'Profile match for Shipping Assistant'`), `p` description = grey-60 (e.g. `'3 of 4 criteria met'` — but note this duplicates the summary bar intentionally; the description gives context on initial scan, the summary gives emphasis at close).
- No right-side trailing flourish — this widget's attention-grabber lives in the body, not the header.

**Column-label row.** Two-column header for the value grid. Left column = `item_a.label` + `item_a.subtitle?`. Right column = `item_b.label` + `item_b.subtitle?`. Center column is empty here (indicators only appear per-criterion below).

- Labels render as §12 eyebrow style: `font-size-100` / `font-weight-semibold` / `letter-spacing-wide` / `text-transform: uppercase` / `grey-50`.
- Subtitles render as §12 body: `font-size-200` / `grey-90`.
- Grid: `grid-template-columns: 1fr var(--size-44) 1fr; gap: var(--space-125)` — center column width matches the indicator column in the criteria grid below, so labels sit over their columns.

**Criteria grid.** The body. Each criterion is one grid row.

```scss
.criteriaGrid {
  display: grid;
  grid-template-columns: 1fr var(--size-44) 1fr;
  column-gap: var(--space-125);
  row-gap: 0;                              /* rows bleed edge-to-edge for the alternating tint */
  border-radius: var(--radius-150);
  overflow: hidden;
  border: var(--border-width-100) solid var(--grey-10);
}

.criterionRow {
  display: contents;                       /* rows participate in the outer grid directly */
}

.criterionRow > * {
  padding: var(--space-100) var(--space-125);
  font-size: var(--font-size-200);
  line-height: var(--line-height-300);
  color: var(--grey-90);
}

.criterionRow:nth-child(even) > * {
  background: color-mix(in srgb, var(--grey-10) 40%, var(--white));
}
```

Row contents left-to-right:

- **Left cell** — label stacked over value: `criterion.name` on top (§12 label role, `font-size-200` / `font-weight-medium` / `grey-80`), `a_value` below (`font-size-200` / `grey-90`). Stack prevents the criterion name from eating the value's horizontal space.
- **Center cell** — the indicator. 28×28 round chip with a Lucide glyph inside. Backgrounds/colors read from a local `--status-tone` CSS variable set per row (see "Tone per row" below). Chips are `display: inline-flex; align-items: center; justify-content: center`, `border-radius: var(--radius-full)`, subtle `border-width-100` in `--status-tone` at 24% opacity, background `--status-tone` at 10% opacity, glyph color `--status-tone`.
- **Right cell** — `b_value` only (no label; the column-label row above already owns the column header). Right-aligned text — `text-align: right` — so the gutter rail feels like a seam rather than a ragged stack.

Rows with `note` render the note as a collapsed secondary row directly below, spanning all 3 columns (`grid-column: 1 / -1`). The note uses §9 pull-quote styling: left bar `border-width-300` in `--status-tone`, padding-left `space-125`, body `font-size-100` / `grey-80` / italic / `line-height-300`. Default state is collapsed; a row click expands it (see Interactions).

**Summary pill.** §6 linear-fill track. `height: var(--size-02)`, track `grey-10`, fill tinted to the overall-tone derived from criteria mix:

- All `match` → `--color-text-success`
- Any `gap` with no `partial` → `--color-text-error`
- Any `partial` with no `gap` **or** any mix of `match` + `partial` without `gap` → `--yellow-60`
- Any `gap` alongside `partial` → `--color-text-error` (presence of a hard gap dominates)

Width of the fill = `(match_count + 0.5 * partial_count) / criteria.length`. Above the pill: `font-size-100` / `letter-spacing-wide` / `text-transform: uppercase` / `grey-50` eyebrow text — `{matchCount} of {total} criteria met`.

**Optional CTA.** If `action` is present, render a §5 button at the bottom. `intent: 'primary'` → `Button variant="primary"` with the brand-60 override; `intent: 'neutral'` → `Button variant="secondary"` (grey-ladder). Full width, sentence-case verb, Lucide + label (never icon-only).

## Tone per row

Each criterion row sets a local `--status-tone` custom property based on `status`:

```scss
.criterionRow[data-status="match"]   { --status-tone: var(--color-text-success); }
.criterionRow[data-status="partial"] { --status-tone: var(--yellow-60); }
.criterionRow[data-status="gap"]     { --status-tone: var(--color-text-error); }
```

The indicator chip, the expanded-note left bar, and the connector line (Pass 2) all read from `--status-tone`. Never hardcoded. Never branded — brand-60 stays for the header badge and (if primary) the CTA only; never mixed into per-row tone.

Indicator glyphs by status:

| status | Lucide | Reading |
|---|---|---|
| `match` | `Check` | ✓ |
| `partial` | `Minus` | ~ (read as "close, not exact") |
| `gap` | `X` | ✗ |

`size={16}`, `strokeWidth={2}`.

## States

Three states. Constant-height honored via §4 floor + `margin-top: auto` on the optional CTA.

1. **Idle (on mount).** Card rises in with `cmpRiseUp` (§16 entry curve, 320ms). Column labels settle first. Criteria rows stagger in at 60ms/row up to the 8th (§11). For each row, the indicator chip lands last with a §16 springy scale-in (240ms, delayed 120ms after the row's row-content fade). Summary pill fills from 0 to its target ratio over 540ms on the §16 entry curve, starting 180ms after the last row's indicator settles.
2. **Row-expanded.** Single-open accordion: clicking a row with a `note` expands that row's secondary note region; clicking the same row again (or another row with a note) closes the previous. Expand/collapse uses §16 state curve, 220ms, height interpolated via explicit `max-height` cap (§4 no-jump contract — the card's `min-height: 24rem` floor absorbs the expansion headroom for typical 4-criteria payloads; for 8-criterion payloads the expansion is the natural heightmax and the card grows, which is acceptable because it's user-initiated, not transition).
3. **Acted (terminal, only if action present).** Card replaces the CTA with a §10 success banner: `[✓ chip, tone=success]   Submitted at 14:32`. Criteria grid stays visible and clickable for re-read; notes can still expand. No "Try again" — terminal.

Transitions:
- Idle → Row-expanded: height animates only the note region (rows above/below hold position via `display: contents` grid).
- Idle → Acted: 280ms fade+rise on the §16 springy curve replaces the CTA with the banner.

Display-only mode (no `action`) has only Idle and Row-expanded states.

## Interactions

- **Row click** — if the row has a `note`, toggle expansion (single-open). Rows without a note are static — no hover affordance, no pointer cursor, no dead click.
- **Keyboard** — rows with notes are `<button>` elements, Tab-reachable, `Enter` / `Space` toggles. Rows without notes are `<div>`s, not focusable. Focus ring uses Nexus focus token (`outline: var(--border-width-300) solid var(--brand-60); outline-offset: var(--size-02)`).
- **CTA click** (if present) — fires `widget_response` with the schema above, transitions to Acted.
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)`: stagger disables (all rows visible on mount), indicator spring collapses to instant reveal, summary pill fills instantly, row-expand collapses to instant height change.

**Single-open accordion logic.** State: `openCriterionIdx: number | null`. Handler: `setOpenCriterionIdx(prev => prev === idx ? null : idx)`. Zero possibility of multi-open by construction.

## Motion

All motion uses the three §16 curves. No fourth curve invented. Local keyframe prefix `cmp` per §16 naming rule.

| Element | Curve | Duration |
|---|---|---|
| Card entry (`cmpRiseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Row stagger entry | same | 60ms step, cap at 8th |
| Indicator chip scale-in (per row, after row content settles) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` (springy) | 240ms, delayed 120ms within the row |
| Summary pill fill | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 540ms, delayed 180ms after last indicator settles |
| Row-expand height / note opacity | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 220ms |
| Success banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |

Never `transition: all`. List properties explicitly (§18 #15).

## Registration (§17 five touchpoints)

1. **Files** — `src/widgets/Comparison.jsx` (PascalCase) + `src/widgets/comparison.module.scss` (camelCase).
2. **`src/chat/registry.js`** — `comparison: Comparison`.
3. **`src/engine/widgetSchemas.js`** —
   ```js
   comparison: {
     label: 'Comparison',
     category: 'display',
     variants: [
       { id: 'candidate_match', label: 'Candidate',  payload: () => buildComparisonPayload('candidate_match') },
       { id: 'skills_gap',      label: 'Skills gap', payload: () => buildComparisonPayload('skills_gap') },
       { id: 'qc_spec',         label: 'QC spec',    payload: () => buildComparisonPayload('qc_spec') },
     ],
   }
   ```
   `buildComparisonPayload(variant)` is a local helper in `widgetSchemas.js` that fills the schema with representative mock data per variant (canonical item labels, 4–6 criteria with a variant-appropriate status mix, optional note on 1–2 rows, and an `action` on `candidate_match` + `skills_gap` but not `qc_spec` — QC spec is display-only by default). Import `makeId` from `./ids.js`; call it inside the builder so fresh ids mint per invocation.
4. **`src/engine/mockBot.js`** —
   ```js
   registerRule({
     match: /^(show )?comparison|side[- ]?by[- ]?side/i,
     build: () => ({ type: 'comparison', payload: getVariantPayload('comparison', 'candidate_match') }),
   })
   ```
   Default variant = `candidate_match`. No inline payloads — compose on top of `getVariantPayload` if the mock needs extra fields.
5. **`src/studio/WidgetPalette.jsx`** — `WIDGET_ICONS` map: `comparison: GitCompare`.

## Anti-pattern guardrails (§18)

Before Pass 1 commit and again before Pass 2 commit, verify every item:

- [ ] Shadow hover-only — card flat at rest (#1).
- [ ] No `max-width` on the card (#2).
- [ ] Symmetric `space-200` padding (#3).
- [ ] No `border-bottom` on header (#4).
- [ ] Title `font-size-400` (#5).
- [ ] Every button has a Lucide + verb label (#6).
- [ ] Zero raw hex / px / rem outside §0.1 allowed list (#7, #13).
- [ ] `brand-60` accent via `--color-action-primary` override for primary CTA (#8).
- [ ] Card `width: 100%`, slot owns cap (#9).
- [ ] Summary uses §6 linear-fill — no donut / ring (#10).
- [ ] Success banner follows §10 — chip + timestamp, no confetti (#11).
- [ ] Stagger caps at 8 (#12).
- [ ] Lucide only for indicators; no custom SVGs (#14).
- [ ] No `transition: all`; each transition lists properties (#15).
- [ ] Only the three §16 cubic-beziers (#16).
- [ ] Pass 2 follows Pass 1 — don't skip (#17).

Run the §0.1 grep:
```bash
grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/comparison.module.scss
```
Only allowed matches: `24rem` min-height floor, `cubic-bezier(…)` args. Anything else is a blocker — fix inline.

## Scope guard

The **center gutter rail** is the only new visual primitive. Column labels, criteria rows, status chips, expanded-note pull-quote, summary pill, and optional CTA all reuse existing family patterns (§2 / §6 / §7 / §9 / §10 / §12). Pass 2 (`/frontend-design`) is permitted to elevate:

1. The gutter rail's entry — the staggered indicator-chip settle is the signature moment (e.g., a connector-line draw from left-value to indicator to right-value, per row, split-tinted to the row's status tone).
2. The summary pill's fill behavior — timing, tone-shift near the end, and any satisfying "score tally" cue.
3. The row-expand reveal — subtle tonality carry into the note.

Pass 2 is **not** permitted to:

- Introduce a second new primitive (e.g., no trend sparkline, no donut, no avatar composite).
- Override §1 shell, §3 width, §12 type hierarchy, §13 color, §16 curves, §17 registration.
- Replace the tri-state indicator vocabulary with numeric scores / percentages / letter grades — that would collide with Score Card (#18).
- Turn the widget "wide" (`data-widget-variant="wide"`) — four to six short-value criteria fit comfortably in 32rem.

If the elevation pass reaches for something on the forbidden list, revisit this spec rather than improvising.

## Out of scope (YAGNI)

Explicitly deferred, even though tempting:

- **Image comparison** — already owned by QC Evidence Review (#20). Keep this widget text / value only.
- **Numeric per-criterion scoring** ("8/10 on Experience") — conflicts with Score Card (#18). Status is tri-state: match / partial / gap. Nuance goes in the optional `note`.
- **Diff highlighting inside values** (e.g., strikethrough the missing language in `a_value`) — too noisy alongside the gutter rail. The status icon + note pattern is the family idiom for "what's different."
- **Multi-column comparison** (3+ items side-by-side) — would break the 32rem width contract and the gutter-rail signature. Out of scope.
- **Sort / filter criteria** — the spec ships order-as-provided. If the engine later needs to re-order by status (gaps first), that's a rendering prop on the payload, not interactive UI.
- **Real backend wiring** — mock trigger is enough for the playground. The widget's job is to render the shape and fire `widget_response` on CTA commit.
