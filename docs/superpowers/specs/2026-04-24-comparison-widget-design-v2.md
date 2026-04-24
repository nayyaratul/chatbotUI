# Comparison / Side-by-Side Widget — Design Spec (v2, explainable table)

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #22 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P1, Phase 2.
**Supersedes:** `2026-04-24-comparison-widget-design.md` (v1, gutter-rail shape — shipped but redirected after UX review flagged that the two-value pairing didn't read. The icon-only indicator and the lack of column headers made the A↔B relationship ambiguous. v2 replaces the gutter rail with an explicit tabular shape that carries semantic copy in the status chip itself.)
**Family rule book:** `docs/widget-conventions.md` (doc wins any conflict).

---

### Iteration 2026-04-24 (evening)

In-place reshape based on horizontal-space feedback. Criterion moves from a column to a row header — each criterion now renders as a vertical block with the criterion name as an eyebrow on top and a 3-part values row (`a_value · tone dot · b_value`) below. Status chip collapses to an icon-only tone dot (~`--size-20`) with a `border-width-300` left-edge tone stripe carrying the verdict peripherally; `status_copy` and the default-chip-copy table are removed. Dual-item band collapses to a single inline row (icon + name, both parties on one line, no eyebrow labels). Column-header row removed. Alternating-row tint removed. Everything else — variants, header, summary pill, CTA, success banner, note accordion, motion curves, registration, §18 anti-patterns — holds unchanged.

---

## Purpose

An admin / worker-facing display card that explains a verdict by placing two items side-by-side with semantic, per-criterion status. Covers the same three use cases as v1:

- **candidate_match** — candidate profile vs role requirements (hiring/placement).
- **skills_gap** — current skills vs target level (training gap analysis).
- **qc_spec** — submitted value vs expected specification (QC, text-based only).

The v2 shape leads with **pairing clarity**: criterion is a row header (eyebrow on top of each block), and values sit below it as `a_value · tone dot · b_value`. A `border-width-300` left-edge tone stripe on each criterion block provides a peripheral verdict signal. The tone dot (icon-only, ~`--size-20`) replaces the pill-shaped status chip; the verdict is signaled by color + glyph alone, with semantic detail available in the optional `note`.

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
      note?: string,                          // optional — expandable detail
    },
  ],
  action?: {
    label: string,
    intent: 'primary' | 'neutral',
  },
}
```

Variant-specific payload builders supply descriptive values in the mock fixtures (e.g., `a_value: "3 yrs"`, `b_value: "2+ yrs"`) so the Studio demo reads well. The verdict is communicated by the tone dot glyph + left stripe; `status_copy` is not part of the schema.

Criteria cap is still **8** per §11 stagger rule.

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [icon]  Match for Shipping Assistant                        │   §2 header
│          3 of 4 criteria met                                 │
│                                                              │
│  [User] Ravi Kumar  ·  [Briefcase] Shipping Assistant        │   dual-item band
│                                                              │   single inline row
│  ▌ EXPERIENCE                                                │   criterion block
│  ▌ 3 yrs              [✓]              2+ yrs                │   ← left stripe (tone)
│                                                              │
│  ▌ LANGUAGES                                                 │   criterion block
│  ▌ Hi, En             [~]              Hi + regional         │
│                                                              │
│  ▌ SHIFT                                                     │   criterion block
│  ▌ Evening            [✓]              Evening               │
│                                                              │
│  ▌ OWN VEHICLE                                               │   criterion block
│  ▌ No                 [✗]              Yes (2-wheeler)       │
│                                                              │   ▌ = border-width-300
│                                                              │     left-edge tone stripe
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   summary pill
│  OVERALL MATCH · 3 of 4 criteria met                         │
│                                                              │
│  [ Apply now ]                                               │   optional CTA
└──────────────────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`. `width: 100%`, slot owns cap. `min-height: 24rem` per §4.

**Header (§2 exact).** Unchanged from v1 — variant-specific Lucide in a brand-60-tinted 36×36 badge, `font-size-400` title, `grey-60` description.

**Dual-item band.**

- Single inline row (one line, no 2-column grid), full width.
- Left part: brand-tinted pod — variant-specific Lucide icon (size 16, strokeWidth 2) + `item_a.subtitle` (e.g., "Ravi Kumar").
- Right part: grey-tinted pod — variant-specific Lucide icon (size 16, strokeWidth 2) + `item_b.subtitle` (e.g., "Shipping Assistant").
- Parts separated by a `·` mid-dot glyph in `grey-30`.
- Left pod uses `brand-60 @ 12%` background tint; right pod uses `grey-10 @ 35%` — preserving the Pass-2 left-brand / right-neutral tint distinction.
- Eyebrow labels (`CANDIDATE` / `ROLE NEEDS`) are dropped — icon + name carries the identity.
- Each pod: `font-size-200` / `font-weight-medium` / `grey-90`.

**Criteria grid (vertical stack).**

- Vertical stack of per-criterion blocks (CSS flex-column or plain `display: block`). No 4-column grid. No alternating tint.
- Each criterion block is a `<div>` (or `<button>` if the row has a `note`).
- `border-bottom: border-width-100 solid grey-10` between blocks.
- Card shell has `overflow: hidden` + `radius-150` on the stack container.

**Per-row left-edge tone stripe.**

- A `border-left: var(--border-width-300) solid var(--status-tone)` on each criterion block (§8 ledger-stripe pattern, same as Checklist's decided rows).
- `--status-tone` is set per-block: `--color-text-success` (match) / `--yellow-60` (partial) / `--color-text-error` (gap).
- Provides a peripheral verdict signal that lets the tone dot stay quiet (icon-only, no copy).
- Left padding on block content increased to `space-200` to clear the stripe.

**Row contents (per criterion block).**

- **Block top (criterion header):** `name` rendered as a §12 eyebrow — `font-size-100` / semibold / `letter-spacing-wide` / uppercase / `grey-60`. Full width inside the block.
- **Block bottom (values row):** three inline parts, space-between:
  - `a_value` — `font-size-200` / `grey-90` / regular, left-aligned.
  - Tone dot — the circular chip centered between the two values (serves as the separator; no additional `·` glyph needed).
  - `b_value` — `font-size-200` / `grey-90` / regular, right-aligned.

**Tone dot (replaces status chip).**

- Circle only — no pill, no padding, no border, no copy.
- Size: ~`--size-20` (or `--size-24` if the glyph reads small).
- Background: `--status-tone @ 12%`. Border: none. Shape: `border-radius: 9999px`.
- Content: a single Lucide glyph (`size={12}`, `strokeWidth={2.25}`) in `--status-tone`.
- Tone driven by `--status-tone` on the block (same variable as the left stripe).
- Centered vertically in the values row.

**Expandable note.**

- Unchanged from v1. Blocks with a `note` render as `<button>`; tapping toggles a collapsed detail region below the values row with §9 pull-quote styling (tone-colored left bar, italic `grey-80` body). Single-open accordion.
- The expanded note is full-width inside the block (no column span needed — block is a vertical stack, not a grid row).

**Summary pill.** Unchanged from v1 — §6 linear-fill tinted to overall-tone with width driven by weighted match ratio.

**Optional CTA.** Unchanged from v1 — §5 primary or secondary button, full width, Lucide + verb label.

**Success banner.** Unchanged from v1 Pass 1 close fix — §7 tone-success chip + one tabular-nums meta line.

## States

Three states — same set as v1. Motion rhythm re-tuned for the new shape:

1. **Idle (on mount).** Card `cmpRiseUp` (§16 entry, 320ms). Dual-item band rises first (60ms delay). Criterion blocks stagger in at 60ms steps each (cap 8). On each criterion block the tone dot **springs in last** — its own `cmpToneDotPop` keyframe on §16 springy, delayed 120ms after the block settles. The tone dot is the signature moment: the blocks lay down, then each verdict color lands. Summary pill fills after the last tone dot settles via the same `--cmp-summary-delay` pattern Pass 1 v1 already established.
2. **Row-expanded.** Unchanged.
3. **Acted (terminal).** Unchanged.

Reduced-motion collapses stagger + tone-dot pop to instant reveal.

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
| Criterion block stagger entry | same | 60ms step, cap 8 |
| Tone-dot pop (`cmpToneDotPop`) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms, delayed 120ms after block |
| Summary pill fill | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 540ms, delayed to land after last tone-dot |
| Row-expand height / note opacity | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 220ms |
| Success banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |

Only the three §16 curves. No `transition: all`.

## Registration (§17 five touchpoints)

All five stay the same — the payload builder updates to use descriptive `a_value` / `b_value` strings in mock fixtures; `status_copy` is removed from the schema.

1. `src/widgets/Comparison.jsx` + `src/widgets/comparison.module.scss`.
2. `src/chat/registry.js` — `comparison: Comparison`. Unchanged.
3. `src/engine/widgetSchemas.js` — `buildComparisonPayload(variant)` updated with icon-aware fixtures (no `status_copy`). Schema entry unchanged.
4. `src/engine/mockBot.js` — unchanged.
5. `src/studio/WidgetPalette.jsx` — unchanged.

## Anti-pattern guardrails (§18)

All 17 items still in force. Same checklist as v1.

## Scope guard

The **criterion-as-row-header + tone-dot + left-stripe** is the v2.1 signature — pairing clarity comes from the stacked block structure and the peripheral tone stripe, not from a pill chip with copy. Pass 2 (`/frontend-design`) is permitted to elevate:

1. **Dual-item band identity** — e.g., a subtle icon backdrop, a gentle hover lift on each pod. The band's job is to make the pair legible on one line; elevation here should reinforce that, not add a motif.
2. **Tone-dot entry** — the springy pop is already in Pass 1; Pass 2 may refine timing, add a tone-specific settle (e.g., `match` dots getting a subtle inner glow on land), or adjust the pop curve so the dot reads as a decisive beat.
3. **Left-edge tone stripe** — may animate in (grow from 0 height) as part of the block stagger; keep it subtle.
4. **Summary pill fill** — same scope as v1 (tone-shift near end, "score tally" cue).

Pass 2 is **not** permitted to:

- Bring back the gutter rail. The whole reason v1 was redirected was that the between-column rail wasn't doing its job. Do not re-introduce it under any name.
- Introduce a second new primitive (e.g., a candidate avatar composite, a trend sparkline, a score ring).
- Override §1 / §3 / §12 / §13 / §16 / §17 / §18.
- Replace the tone dot with a pill chip carrying copy. The tone dot (icon-only, ~`--size-20`) is the final shape — do not re-introduce the chip-as-pill shape with copy. The verdict is color + glyph; copy belongs in the optional `note`.
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
