# Comparison / Side-by-Side Widget — Design Spec (v2, explainable table)

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #22 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P1, Phase 2.
**Supersedes:** `2026-04-24-comparison-widget-design.md` (v1, gutter-rail shape — shipped but redirected after UX review flagged that the two-value pairing didn't read. The icon-only indicator and the lack of column headers made the A↔B relationship ambiguous. v2 replaces the gutter rail with an explicit tabular shape that carries semantic copy in the status chip itself.)
**Family rule book:** `docs/widget-conventions.md` (doc wins any conflict).

---

## Purpose

An admin / worker-facing display card that explains a verdict by placing two items side-by-side with semantic, per-criterion status. Covers the same three use cases as v1:

- **candidate_match** — candidate profile vs role requirements (hiring/placement).
- **skills_gap** — current skills vs target level (training gap analysis).
- **qc_spec** — submitted value vs expected specification (QC, text-based only).

The v2 shape leads with **pairing clarity**: each item gets its own iconified header band, and every row lays out as a table (`Criterion · a_value · status chip · b_value`) with explicit column headers so the reader never has to infer which value belongs to which item. The status chip carries short copy ("Exceeds by 6mo", "Close match", "Missing") rather than a bare icon — the verdict is stated, not decoded.

## Variants

Three variants. Header badge, item-band icons, default labels, and example payload differ; everything else is identical.

| Variant | Header icon | Left-band icon | Right-band icon |
|---|---|---|---|
| `candidate_match` | `GitCompare` | `User` | `Briefcase` |
| `skills_gap` | `TrendingUp` | `Wrench` | `Target` |
| `qc_spec` | `ClipboardCheck` | `Camera` | `CheckCircle2` |

Default variant for the mock-bot trigger stays `candidate_match`.

## Payload schema

```js
{
  widget_id: 'cmp_xxx',                      // makeId('cmp')
  variant: 'candidate_match' | 'skills_gap' | 'qc_spec',
  item_a: {
    label: string,                            // eyebrow — 'CANDIDATE', 'YOUR SKILLS'
    subtitle?: string,                        // body — 'Ravi Kumar'
  },
  item_b: {
    label: string,                            // eyebrow — 'ROLE NEEDS'
    subtitle?: string,                        // body — 'Shipping Assistant · Delhivery'
  },
  criteria: [
    {
      name: string,                           // 'Experience'
      a_value: string,                        // '3 yrs'
      b_value: string,                        // '2+ yrs'
      status: 'match' | 'gap' | 'partial',
      status_copy?: string,                   // optional — overrides the default chip label
      note?: string,                          // optional — expandable detail
    },
  ],
  action?: {
    label: string,
    intent: 'primary' | 'neutral',
  },
}
```

**Default status-chip copy** (used when `status_copy` is omitted):

| status | default copy |
|---|---|
| `match` | "Matches" |
| `partial` | "Close match" |
| `gap` | "Missing" |

Variant-specific payload builders supply richer copy in the mock fixtures (e.g., "Exceeds by 6mo" for experience overshoots, "No 2W licence" for a gap) so the Studio demo reads well.

Criteria cap is still **8** per §11 stagger rule.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [icon]  Match for Shipping Assistant                        │   §2 header
│          3 of 4 criteria met                                 │
│                                                              │
│  ┌──────────────────────────┬──────────────────────────┐    │   dual-item band
│  │ [User]  CANDIDATE        │ [Briefcase] ROLE NEEDS   │    │   2-col, equal-width
│  │         Ravi Kumar       │             Shipping A.  │    │
│  └──────────────────────────┴──────────────────────────┘    │
│                                                              │
│  CRITERION   YOU        MATCH               ROLE NEEDS       │   §12 eyebrow header
│  ──────────────────────────────────────────────────────      │
│  Experience  3 yrs      [✓ Exceeds by 6mo]  2+ yrs           │   data rows
│  Languages   Hi, En     [~ Close match]     Hi + regional    │   (alternating tint)
│  Shift       Evening    [✓ Matches]         Evening          │
│  Own vehicle No         [✗ No 2W]           Yes (2-wheeler)  │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   summary pill
│  OVERALL MATCH · 3 of 4 criteria met                         │
│                                                              │
│  [ Apply now ]                                               │   optional CTA
└──────────────────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`. `width: 100%`, slot owns cap. `min-height: 24rem` per §4.

**Header (§2 exact).** Unchanged from v1 — variant-specific Lucide in a brand-60-tinted 36×36 badge, `font-size-400` title, `grey-60` description.

**Dual-item band.**

- 2-column grid, equal widths, inside a rounded container with `grey-10` border.
- Each cell: variant-specific Lucide icon (size 16, strokeWidth 2) + eyebrow label + subtitle.
- Cells share the same neutral `grey-10 @ 35%` tint so neither item feels "favored" — identity comes from the icon and the explicit column header below, not from color.
- Internal divider between the two cells: `border-width-100` in `grey-10`.
- Eyebrow label uses §12 eyebrow: `font-size-100` / semibold / `letter-spacing-wide` / uppercase / `grey-50`.
- Subtitle uses `font-size-200` / regular / `grey-90`.

**Column-header row.**

- Four labels in §12 eyebrow style: `CRITERION · YOU · MATCH · ROLE NEEDS`.
- Grid columns match the criteria grid below exactly (`minmax(6rem, 1.5fr) minmax(0, 1fr) auto minmax(0, 1fr)`) so headers sit over the correct data column.
- Uses the same column gap as the criteria grid.
- Bottom hairline `border-width-100 / grey-10` separates headers from data.

**Criteria grid.**

- 4-column CSS grid: `Criterion | a_value | chip | b_value`.
- `grid-template-columns: minmax(6rem, 1.5fr) minmax(0, 1fr) auto minmax(0, 1fr);`
- Column gap: `var(--space-125)`.
- Row gap: 0 (rows bleed edge-to-edge for the alternating tint).
- Card shell has `overflow: hidden` on the grid + `radius-150` for clean corners.
- `border: border-width-100 solid grey-10` around the grid.
- Alternating tint via an explicit `.criterionRow_tinted` class on odd-indexed rows (the v1 lesson — `:nth-of-type(even)` misfires under mixed `<button>`/`<div>` row tags).

**Row contents.**

- **Criterion cell** (column 1): `name` in `font-size-200` / `font-weight-medium` / `grey-80`.
- **a_value cell** (column 2): `a_value` in `font-size-200` / `grey-90` / regular.
- **Chip cell** (column 3): the status chip (see below). Centered vertically.
- **b_value cell** (column 4): `b_value` in `font-size-200` / `grey-90` / regular, right-aligned.

**Status chip.**

- §7 chip geometry: pill (`radius-500`), inner padding `space-025` × `space-100`, `border-width-100` at 24% tone, background at 10% tone, text in tone color.
- Content: tiny Lucide glyph (`size={12}`, `strokeWidth={2.25}`) + short copy (≤14 chars recommended, 18 max).
- `font-size-100` / semibold / `letter-spacing-wide` / uppercase. Copy naturally compact in the reference ("Exceeds by 6mo", "Close match", "Missing").
- Tone driven by `--status-tone` on the row (`--color-text-success` / `--yellow-60` / `--color-text-error`).
- Center-aligned in its column; cell has `justify-content: center`.

**Expandable note.**

- Unchanged from v1. Rows with a `note` render as `<button>`; tapping toggles a collapsed detail region below the row with §9 pull-quote styling (tone-colored left bar, italic `grey-80` body). Single-open accordion.
- The expanded note spans all 4 columns (`grid-column: 1 / -1`).

**Summary pill.** Unchanged from v1 — §6 linear-fill tinted to overall-tone with width driven by weighted match ratio.

**Optional CTA.** Unchanged from v1 — §5 primary or secondary button, full width, Lucide + verb label.

**Success banner.** Unchanged from v1 Pass 1 close fix — §7 tone-success chip + one tabular-nums meta line.

## States

Three states — same set as v1. Motion rhythm re-tuned for the new shape:

1. **Idle (on mount).** Card `cmpRiseUp` (§16 entry, 320ms). Dual-item band rises first (60ms delay). Column-header row at 120ms. Criteria rows stagger at 60ms each (cap 8). On each row the status chip **springs in last** — its own `cmpChipPop` keyframe on §16 springy, delayed 120ms after the row cells settle. The chip is the new signature moment: the table lays down, then each verdict lands. Summary pill fills after the last chip settles via the same `--cmp-summary-delay` pattern Pass 1 v1 already established.
2. **Row-expanded.** Unchanged.
3. **Acted (terminal).** Unchanged.

Reduced-motion collapses stagger + chip pop to instant reveal.

## Interactions

- **Row click** — toggles expansion only on rows with a `note`. Rows without a note are `<div>` — no dead click.
- **Keyboard** — `<button>` rows are Tab-reachable; Enter/Space toggles.
- **CTA click** — fires `widget_response` (same schema as v1).
- **Reduced motion** — honored on card, rows, chip, summary, banner.

## Motion

| Element | Curve | Duration |
|---|---|---|
| Card entry (`cmpRiseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Dual-item band entry | same | 280ms |
| Column-header row entry | same | 240ms |
| Row stagger entry | same | 60ms step, cap 8 |
| Status chip pop | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms, delayed 120ms after row |
| Summary pill fill | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 540ms, delayed to land after last chip |
| Row-expand height / note opacity | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 220ms |
| Success banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |

Only the three §16 curves. No `transition: all`.

## Registration (§17 five touchpoints)

All five stay the same — only the payload builder updates to include `status_copy` in the mock fixtures.

1. `src/widgets/Comparison.jsx` + `src/widgets/comparison.module.scss`.
2. `src/chat/registry.js` — `comparison: Comparison`. Unchanged.
3. `src/engine/widgetSchemas.js` — `buildComparisonPayload(variant)` updated with `status_copy` + icon-aware fixtures. Schema entry unchanged.
4. `src/engine/mockBot.js` — unchanged.
5. `src/studio/WidgetPalette.jsx` — unchanged.

## Anti-pattern guardrails (§18)

All 17 items still in force. Same checklist as v1.

## Scope guard

The **status chip with copy** is the v2 signature — the pairing clarity comes from the table structure, not from a decorative primitive. Pass 2 (`/frontend-design`) is permitted to elevate:

1. **Dual-item band identity** — e.g., a subtle icon backdrop, a faint vertical divider that animates on mount, a gentle hover lift on each cell. The band's job is to make the pair legible; elevation here should reinforce that, not add a motif.
2. **Status chip entry** — the springy pop is already in Pass 1; Pass 2 may refine timing, add a tone-specific settle (e.g., `match` chips getting a subtle inner glow on land), or adjust the glyph→label rhythm so the chip reads as one beat.
3. **Summary pill fill** — same scope as v1 (tone-shift near end, "score tally" cue).

Pass 2 is **not** permitted to:

- Bring back the gutter rail. The whole reason v1 was redirected was that the between-column rail wasn't doing its job. Do not re-introduce it under any name.
- Introduce a second new primitive (e.g., a candidate avatar composite, a trend sparkline, a score ring).
- Override §1 / §3 / §12 / §13 / §16 / §17 / §18.
- Replace the status-chip copy with numeric scores / percentages.
- Turn the widget "wide".
- Use brand-60 for per-row tone — brand-60 remains reserved for the header badge + primary CTA only.

## Out of scope (YAGNI)

- Gap-focused action card variant (Reference #2, Card 2) — deferred. That's a different widget (a remediation card with per-gap CTAs), not a presentation variant of Comparison.
- Score meter / ring variant (Reference #2, Card 3) — overlaps with Score Card (#18). Out of scope.
- Image comparison (Reference #2, Card 4) — QC Evidence Review (#20) already owns the image lane.
- Narrative / interview mode (Reference #2, Card 5) — overlaps with Approval's interview variant. Out of scope.
- Multi-option comparison (Dentalfreund-style, N>2) — would break the 32rem family width contract and the 1-vs-1 semantic. Out of scope.
- Sort / filter / reorder criteria.
- Real backend wiring — mock trigger is enough.
