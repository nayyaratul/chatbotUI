# Payment / Earnings Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #28 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P2, Phase 2–3.
**Family rule book:** `docs/widget-conventions.md` (doc wins any conflict).

---

## Purpose

A worker-facing financial summary that surfaces earnings transparency in the chat stream: period total + breakdown + trend vs previous period + optional action. Covers three use cases:

- **paycheck** — weekly or monthly payout confirmation. Breakdown by shift/day. Completed status.
- **incentive** — bonus / target-based earnings tracker. Breakdown by target type (attendance, volume, quality bonus). Mix of completed + processing statuses.
- **advance** — earnings-against-hours available for early withdrawal. Breakdown by shifts worked vs locked. Only variant with a primary CTA ("Request advance"); other variants are display-only.

The widget's job is to make the period's earnings **unambiguous in one glance** and give the breakdown behind the number for trust. Signature moment is the count-up on the big total.

## Variants

Three variants sharing one shell. Header icon, default labels, example payload, and action presence differ; everything else is identical.

| Variant | Header icon | Default status tone | Default action |
|---|---|---|---|
| `paycheck` | `Wallet` | success (completed) | none |
| `incentive` | `TrendingUp` | warning (partial / processing) | none |
| `advance` | `CircleDollarSign` | info (brand-60 accent on total) | "Request advance" (primary) |

Default mock-bot variant = `paycheck`.

## Payload schema

```js
{
  widget_id: 'pay_xxx',                      // makeId('pay')
  variant: 'paycheck' | 'incentive' | 'advance',
  period: {
    start: ISO,                              // '2026-04-19'
    end: ISO,                                // '2026-04-25'
    label: string,                           // 'This week' / 'April 2026' / etc.
  },
  total: {
    amount: number,                          // 12450 (integer paise/cents or decimal rupees/dollars; see note)
    currency: string,                        // 'INR' / 'USD' — ISO 4217
  },
  status: 'completed' | 'processing' | 'failed',
  breakdown: [
    {
      label: string,                         // 'Mon · Morning' / 'Attendance bonus'
      meta?: string,                         // '4 hrs' / 'Target: 25/30 shifts'
      amount: number,                        // 1800
      status?: 'completed' | 'processing' | 'failed',
    },
  ],
  trend?: {
    percent: number,                         // 8 (interpreted as 8%)
    direction: 'up' | 'down' | 'flat',
    label?: string,                          // 'vs last week' — defaults to 'vs previous'
  },
  action?: {
    label: string,                           // 'Request advance' / 'View details'
    intent: 'primary' | 'neutral',
  },
}
```

**Amount convention:** `total.amount` is a **rupee/dollar decimal** (e.g. `12450` = ₹12,450), not paise/cents. Formatter uses `Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })` for whole-rupee display; fractional values are acceptable when the payload supplies them. Locale derived from `currency` ("INR" → `en-IN`, "USD" → `en-US`); widget-level locale override out of scope.

Result sent to the bot on action tap (`widget_response`):

```js
{ widget_id, variant, action: action.label, acted_at: ISO }
```

Breakdown cap is **8** per §11 stagger rule. Payloads over 8 render the first 8 with a dev-time console warning.

## Layout

```
┌───────────────────────────────────────────────────────────┐
│  [icon]  This week's earnings                             │   §2 header
│          Apr 19 – Apr 25                                  │
│                                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │                                                   │    │   total block —
│  │  ₹ 12,450                                         │    │   tone-tinted container
│  │                                                   │    │
│  │  7 shifts · [✓ Completed]              ↗ +8%      │    │   meta row
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  BREAKDOWN                                                │   §12 eyebrow
│  ───────────────────────────────────────────────────      │
│  •  Mon · Morning            4 hrs          ₹ 1,800       │   breakdown rows
│  •  Tue · Evening            6 hrs          ₹ 2,450       │   (§8 status dot)
│  •  Wed · Morning            4 hrs          ₹ 1,800       │
│  ...                                                      │
│                                                           │
│  [ Request advance ]                                      │   optional §5 CTA
└───────────────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`, `width: 100%`. `min-height: 24rem` (§4 mid-density floor).

**Header (§2 exact).** Variant-specific Lucide in a brand-60-tinted 36×36 badge. Title = `period.label`; description = formatted `period.start – period.end` (e.g., "Apr 19 – Apr 25") in `grey-60`.

**Total block.**

- Rounded-rectangle container (`radius-150`, inner padding `space-150` × `space-175`). Tinted via `--tone-color` derived from `status`:
  - `completed` → `--color-text-success`
  - `processing` → `--yellow-60`
  - `failed` → `--color-text-error`
  - `advance` variant → brand-60 accent (regardless of status) so it reads as a primary action target.
- Background: `color-mix(in srgb, var(--tone-color) 8%, var(--white))`
- Border: `color-mix(in srgb, var(--tone-color) 22%, transparent)`
- **Big total amount**: `font-size-400` / `font-weight-bold` / `letter-spacing-tight` / `tabular-nums` / `grey-90`. Not 28px — §12 caps the family at 400. Prominence comes from the tinted container, bold weight, and the count-up animation, not font-size escalation.
- Meta row below the amount (horizontal flex, space-between):
  - Left: breakdown count summary (e.g., "7 shifts" / "3 categories") — `font-size-200` / `grey-80` — followed by a §7 status chip ("Completed" / "Processing" / "Failed") tone-colored to match.
  - Right: trend chip (if `trend` present) — Lucide `TrendingUp` / `TrendingDown` / `Minus` + `+8%` / `-3%` / `±0%` in `tabular-nums`, plus optional `trend.label` ("vs last week") in a smaller caption style. Tinted `success` for up, `error` for down, `grey-60` for flat.

**Breakdown list.**

- Section eyebrow: `BREAKDOWN` — §12 eyebrow / `grey-50` / uppercase.
- Horizontal rule below eyebrow: `border-bottom: border-width-100 solid grey-10`.
- Rows: 3-column grid `auto 1fr auto` → `status dot · label(meta stacked) · amount`. Column gap `space-125`. Row gap `space-050`.
- Each row: §8-style status dot at left (`size-06` filled circle, tone-colored — success/warning/error/grey for pending). Label + meta stacked in the middle. Amount right-aligned with `tabular-nums`.
- Row payload status can be absent — defaults to match the widget-level `status` tone.

**Optional CTA.** §5 button — `primary` for `advance` variant by default, `secondary` for others if they carry an action. Full width, sentence-case verb, Lucide + label.

**Success banner** (post-commit). §10 shape — tone-success chip + tabular-nums timestamp.

## States

1. **Idle (on mount).** Card rises (`riseUp`, §16 entry, 320ms). Total block rises next (280ms, delay 60ms). Count-up starts at 180ms and runs 720ms (RAF-driven in JSX). Trend chip pops 180ms after the count lands (§16 springy). Breakdown rows stagger from 300ms (60ms/row, cap 8). CTA (if present) rises in after the last row (§16 rise-up, delay = last-row-delay + 280ms).
2. **Acted (terminal, only if action present).** CTA replaced by §10 success banner. Breakdown remains visible.

Reduced-motion collapses count-up to an instant-reveal (final value on first frame), stagger to instant, trend-chip spring to instant opacity fade.

## Interactions

- **CTA click** (if present) — fires `widget_response`, transitions to Acted.
- **Display-only variants** (paycheck, incentive by default) — no click targets other than the CTA (if provided).
- **Keyboard** — only the CTA is focusable. No row-level affordances (read-only data).
- **Reduced motion** — handled (see States).

## Motion

| Element | Curve | Duration |
|---|---|---|
| Card entry (`earnRiseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Total block rise | same | 280ms, delay 60ms |
| Count-up | same | 720ms, delay 180ms (RAF-driven; CSS handles only the block rise) |
| Trend chip pop | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms, after count-up |
| Breakdown row stagger | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 60ms/row step, cap 8 |
| CTA rise | same | 280ms, after last row |
| Hover / focus transitions | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 180–220ms |
| Success banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |

Only three §16 curves. No `transition: all`.

## Registration (§17 five touchpoints)

1. `src/widgets/Earnings.jsx` + `src/widgets/earnings.module.scss`.
2. `src/chat/registry.js` — `earnings: Earnings`.
3. `src/engine/widgetSchemas.js` —
   ```js
   earnings: {
     label: 'Earnings',
     category: 'display',
     variants: [
       { id: 'paycheck',  label: 'Paycheck',  payload: () => buildEarningsPayload('paycheck') },
       { id: 'incentive', label: 'Incentive', payload: () => buildEarningsPayload('incentive') },
       { id: 'advance',   label: 'Advance',   payload: () => buildEarningsPayload('advance') },
     ],
   }
   ```
   `buildEarningsPayload(variant)` lives in `widgetSchemas.js`; uses `makeId` from `./ids.js`.
4. `src/engine/mockBot.js` — triggers for `/^(earnings|payout|paycheck)$/i` → paycheck, `/^(incentive|bonus)$/i` → incentive, `/^(advance|withdraw)$/i` → advance.
5. `src/studio/WidgetPalette.jsx` — `WIDGET_ICONS` map: `earnings: Wallet`.

## Anti-pattern guardrails (§18)

All 17 items still in force. Pre-commit checks:

- [ ] Shadow hover-only (#1).
- [ ] No `max-width` on card root (#2).
- [ ] Symmetric `space-200` padding (#3).
- [ ] No `border-bottom` on header (#4).
- [ ] Title `font-size-400` — including the big total, which stays at 400 despite the CSV's 28px suggestion (#5).
- [ ] CTA has verb + Lucide (#6).
- [ ] Zero raw hex / px / rem outside §0.1 allowed list (#7, #13).
- [ ] `brand-60` via `--color-action-primary` override for primary CTA (#8).
- [ ] Card `width: 100%` (#9).
- [ ] Summary / breakdown uses §6 / §8 patterns only — no donut, no ring (#10).
- [ ] Success banner follows §10 — chip + timestamp (#11).
- [ ] Stagger caps at 8 (#12).
- [ ] Lucide only; no bespoke SVG (including: **no sparkline**) (#14).
- [ ] No `transition: all` (#15).
- [ ] Only three §16 curves (#16).
- [ ] Pass 2 follows Pass 1 (#17).

Run the §0.1 grep:
```bash
grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/earnings.module.scss
```

## Scope guard

The **count-up total** is the signature moment. Everything else — total block container, breakdown list, trend chip, CTA, success banner — reuses existing family patterns (§1 / §2 / §5 / §7 / §8 / §10 / §12).

Pass 2 (`/frontend-design`) is permitted to elevate:

1. **Count-up rhythm** — the tick pacing (linear vs easing inside the 720ms window), the accent sheen crossing the tinted container as the count lands, a subtle brightness settle on the final frame.
2. **Trend chip arrival** — a small celebration cue for positive trend (gentle up-nudge on the arrow glyph), a neutral settle for flat, a soft down-nudge for negative.
3. **Breakdown row dot treatment** — entry spring (§8 ledger-stripe pattern).

Pass 2 is **not** permitted to:

- Introduce a sparkline, mini-chart, bar graph, donut, ring, or any new data-viz primitive. The CSV mentioned sparkline but the spec chose the trend chip instead — do not regress.
- Escalate the big-total font-size above `font-size-400`.
- Introduce a second animated moment (e.g., pulsing status chip) that competes with the count-up.
- Override §1 / §3 / §12 / §13 / §16 / §17 / §18.
- Use brand-60 for per-row tone — brand stays for the header badge, the `advance`-variant total tint, and primary CTA only.

## Out of scope (YAGNI)

- Real transaction data / backend wiring. Mock payloads only.
- Edit / dispute / refund flows.
- Multi-currency totals (single currency per payload).
- Tax / deduction breakdown.
- PDF / CSV export.
- Paginated breakdown beyond 8 rows — if a real use case needs 10–20, that's a schema rev.
- Historical trend beyond the one `trend.percent vs previous` scalar (no N-period sparkline).
- Locale override beyond currency-derived default.
