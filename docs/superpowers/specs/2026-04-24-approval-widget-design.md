# Approval Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation planning.
**Widget number:** #23 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P1, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (everything below conforms to it; the doc wins in any conflict).

---

## Purpose

Admin / reviewer-facing card that shows an AI agent's recommendation on a case plus the evidence backing it, and lets the reviewer commit a decision inside the chat stream. Covers four use cases: **BGV borderline** (document cross-match), **interview edge cases** (transcript + scoring review), **QC-flagged submissions** (annotated photo + criteria verdicts), and **offer sign-off** (compensation + panel summary). The human-in-the-loop interface — optimized for 30-second decisions.

## Variants

Four variants sharing one shell. Header icon, default evidence kinds, and example payload differ. Everything else is identical.

| Variant | Icon (Lucide) | Summary shape | Default evidence kinds |
|---|---|---|---|
| `bgv` | `ShieldCheck` | candidate name / verification type | `document` (×2), `score` |
| `interview` | `MessagesSquare` | candidate name / role | `transcript`, `score` |
| `qc_flagged` | `ScanSearch` | audit id / task name | `document` (photo), `criteria` |
| `offer` | `HandCoins` | candidate name / role + location | `compensation`, `score` |

Default variant for the mock-bot trigger is `bgv` (richest evidence).

## Payload schema

```js
{
  widget_id: 'ap_xxx',                        // makeId('ap')
  variant: 'bgv' | 'interview' | 'qc_flagged' | 'offer',
  case_id: 'case_xxx',
  summary: {
    title: string,                             // e.g. 'Priya Sharma'
    subtitle: string,                          // e.g. 'Aadhaar verification'
  },
  recommendation: {
    verdict: 'approve' | 'reject' | 'borderline',
    confidence: number,                        // 0–1, renders as arc sweep
    tone: 'success' | 'error' | 'warning',     // derived, explicit for schema clarity
  },
  reasoning: string,                           // one paragraph; rendered as §9 pull-quote
  evidence: [
    {
      id: 'ev_xxx',
      kind: 'document' | 'score' | 'transcript' | 'criteria' | 'compensation',
      label: string,                           // accordion header
      meta: string,                            // right-aligned meta chip
      body: object,                            // kind-specific (see below)
    },
  ],
  actions: ['approve', 'reject', 'more_info', 'escalate'],  // subset ok; order in UI is fixed
}
```

Result sent to the bot on commit (`widget_response`):

```js
{ case_id, decision: 'approve' | 'reject' | 'more_info' | 'escalate', notes?: string, decided_at: ISO }
```

## Layout

Approach chosen: **badge as header-right flourish.** Standard §2 header with the confidence arc as a trailing element. Reasoning pull-quote under the header, evidence accordion in the body, action bar at the bottom.

```
┌───────────────────────────────────────────────────────────┐
│  [icon]  Title                             [arc]  VERDICT │   header (§2)
│          Subtitle                                         │
│                                                           │
│  ┃ Reasoning paragraph …                                  │   §9 pull-quote
│                                                           │
│  ┌─ Evidence ──────────────────────────────────────────┐  │   single-open
│  │ ▸ Panel 1                      meta-chip         •  │  │   accordion
│  │ ▾ Panel 2                      meta-chip         •  │  │
│  │    kind-specific body …                             │  │
│  │ ▸ Panel 3                      meta-chip         •  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [Escalate] [More info] [Reject] [Approve]                │   action bar
└───────────────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`. `width: 100%`, slot owns cap (family 32rem — **no `data-widget-variant="wide"`**). Min-height floor `24rem` per §4 mid-density class.

**Header (§2 exact).**
- Left: 36×36 icon badge, variant-specific Lucide icon, tinted `brand-60` per §2. The icon differs by variant; the badge tint does **not** — the §9 tone system on this widget is driven by `recommendation.verdict`, not by the variant, and it flows to the arc / reasoning pull-quote / banner, not the header badge.
- Middle: `h3` title = `summary.title` at `font-size-400`, `p` description = `summary.subtitle` at `font-size-200` / `grey-60`.
- Right: confidence arc, 44×44 SVG, stroke `var(--border-width-300)`, arc swept to `confidence` (0–1). Verdict label under the arc: `font-size-100` / semibold / uppercase / `letter-spacing-wide` / tone-colored.
- `justify-content: space-between` on the header flex so the arc sits trailing. Gap between icon badge and title column stays `space-125` per §2.

**Reasoning pull-quote.** Left bar of `var(--border-width-300)` in `--tone-color`, padding-left `space-125`. Body text `font-size-200` / `grey-80` / `line-height-300`. One paragraph. Tone variable is set on the card root per §9.

**Evidence accordion.**
- Wrapper: `grey-10` hairline border, `radius-150`, no internal padding.
- Row: chevron (Lucide `ChevronRight`, rotates 90° on open with a §16 state transition), label at `font-size-200` / `grey-90`, right-aligned `meta` chip (§7 chip shape, informational tone — `brand-60` text on brand-10 tint).
- Single-open logic: state is a single `openPanelId: string | null`. Tap closed → opens (closing any sibling). Tap open → closes. Never two open simultaneously.
- Panel body rendering by `kind`:
  - `document` — 72×72 thumbnail (`object-fit: cover`, `radius-150`), name + subtitle to the right, optional "Open full" link that routes through existing `JobDetailsModal` chrome (don't build new modal).
  - `score` — §6 linear-fill rows, one per criterion. `height: var(--size-02)`, fill tone derived from value threshold (≥0.85 success, ≥0.6 warning, <0.6 error).
  - `transcript` — stacked blockquote excerpts. Each has a small timestamp chip at top-left; body in italic `grey-80`. Excerpts separated by `space-125`.
  - `criteria` — §7 chip grid, one chip per criterion. Pass tone `color-text-success` + `Check` glyph; fail tone `color-text-error` + `X` glyph at `size={14}`.
  - `compensation` — key/value rows, label left `grey-80`, value right `grey-90` with `font-variant-numeric: tabular-nums`. Fixed order: base / variable / joining bonus / notice period.
  - *Unknown `kind`* — never ships to prod but guards the renderer: log once in dev, render the panel header normally, and show a single-line `grey-50` body "Unsupported evidence kind." Don't crash.

**Action bar.**
- Horizontal row. Order left-to-right: **Escalate · More info · Reject · Approve**. Destructive actions on the left, constructive on the right — thumb / eye lands on Approve.
- Approve = §5 primary (`--color-action-primary: var(--brand-60)` override on the card).
- Reject = `variant="secondary"` with `--color-action-primary: var(--color-text-error)` local override so the icon and text carry the reject tone without competing with Approve.
- Escalate + More info = `variant="secondary"` default grey-ladder.
- Each button: Lucide glyph `size={16}` + sentence-case verb label. Never icon-only (§18 #6).
- Layout: `display: flex; gap: var(--space-100); flex-wrap: wrap`. Wraps at ≤360px.

## States

Three states. Constant-height honored via §4 floor + `margin-top: auto` on the action bar.

1. **Idle (on mount).** Card rises in with `riseUp` (§16 entry curve, 320ms). Confidence arc sweeps from 0% to target over 540ms, staggered 120ms after card entry. Evidence panels stagger at 60ms each up to the 8th (§11), all collapsed.
2. **Pending-confirm (after tap on Reject / Escalate / More info).** The tapped button fills its tone color. An inline notes region slides down directly above the action bar — one-line prompt ("Reason for rejection (optional)"), 3-row textarea, and two buttons: `Cancel` (secondary) + `Confirm reject` (primary, tone-colored). Other action buttons in the bar disable (reduced opacity, `pointer-events: none`). Approve is never pending-confirm — it's always a one-tap commit. Cancel collapses the notes and restores the full bar. Slide uses §16 state curve, 220ms.
3. **Committed (terminal).** Action bar replaces with a §10 success banner: `[✓ chip, tone=decision]   Decided at 14:32 · Confidence 87%`. Notes (if any) render below the timestamp line as a secondary pull-quote — same geometry as the reasoning pull-quote (left bar `border-width-300`, padding-left `space-125`) but the bar tone is `grey-30` instead of `--tone-color`, body text is `font-size-100` / `grey-50` / italic, so it reads as reviewer commentary rather than agent reasoning. The confidence arc morphs — sweeps to 100% and re-tones to the decided color; verdict label switches to past tense (APPROVED / REJECTED / ESCALATED / INFO REQUESTED). Evidence accordion stays visible and clickable for re-read, but chevrons desaturate to `grey-50`. No "Try again" — terminal, per family convention.

Transitions:
- Idle → Pending: slide only, no layout jump (card stays in its floor height).
- Pending → Committed: 280ms fade+rise on the §16 springy curve replaces action bar with banner. Confidence arc tone morph is `transition: stroke 280ms cubic-bezier(0.2, 0.8, 0.3, 1)` on the SVG arc element.
- Idle → Committed (direct, via Approve one-tap): same as Pending → Committed minus the pending step.

## Interactions

**Keyboard shortcuts (desktop reviewer power-tool).** When the card is focused:

- `A` → Approve (commit).
- `R` → Reject (enters pending-confirm; `Enter` from the notes textarea commits, `Esc` cancels).
- `M` → More info (same flow).
- `E` → Escalate (same).
- `1` … `9` → toggle the nth evidence panel (single-open rules apply). If the nth panel doesn't exist, the key is a no-op.

Shortcut hints render as small kbd chips inside each action button. Hidden on touch devices via `@media (hover: hover) and (pointer: fine)`. Chips are styled `<span>` elements — not Lucide icons — so the §15 Lucide-only rule stays intact.

**Focus management.** Card grabs focus on mount (`autofocus` on the root container; pre-committed only — committed state does not auto-focus). `Tab` cycles: action bar buttons → accordion headers → notes textarea (when present). `Escape` releases focus without committing.

**Single-open accordion logic.** State: `openPanelId: string | null`. Handler: `setOpenPanelId(prev => prev === id ? null : id)`. Zero possibility of multi-open by construction.

## Motion

All motion uses the three §16 curves. No fourth curve invented.

| Element | Curve | Duration |
|---|---|---|
| Card entry (`riseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Evidence stagger entry | same | 60ms step, cap at 8th |
| Confidence arc sweep | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 540ms |
| Chevron rotation, accordion height, notes slide | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 200–220ms |
| Confidence arc tone morph (on commit) | same | 280ms |
| Success banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` (springy) | 280ms |

Never `transition: all`. List properties explicitly (§18 #15).

## Registration (§17 five touchpoints)

1. **Files** — `src/widgets/Approval.jsx` (PascalCase) + `src/widgets/approval.module.scss` (camelCase).
2. **`src/chat/registry.js`** — `approval: Approval`.
3. **`src/engine/widgetSchemas.js`** —
   ```js
   approval: {
     label: 'Approval',
     category: 'advanced',
     variants: [
       { id: 'bgv',         label: 'BGV',       payload: () => buildApprovalPayload('bgv') },
       { id: 'interview',   label: 'Interview', payload: () => buildApprovalPayload('interview') },
       { id: 'qc_flagged',  label: 'QC',        payload: () => buildApprovalPayload('qc_flagged') },
       { id: 'offer',       label: 'Offer',     payload: () => buildApprovalPayload('offer') },
     ],
   }
   ```
   Each payload conforms to the **Payload schema** section above. `buildApprovalPayload(variant)` is a local helper in `widgetSchemas.js` that fills the schema with representative mock data per variant (canonical summary, a verdict in the 0.6–0.95 confidence range, 2–3 evidence items of the variant's default kinds, a one-paragraph reasoning). Import `makeId` from `./ids.js` (not `./mockBot.js` — it moved in the Injector refactor); call it inside the builder so fresh ids mint per invocation.
4. **`src/engine/mockBot.js`** —
   ```js
   registerRule({
     match: /^(show )?approval/i,
     build: () => ({ type: 'approval', payload: getVariantPayload('approval', 'bgv') }),
   })
   ```
   Default variant = `bgv`. No inline payloads — compose on top of `getVariantPayload` if the mock needs extra fields.
5. **`src/studio/WidgetPalette.jsx`** — `WIDGET_ICONS` map: `approval: Gavel`.

## Anti-pattern guardrails (§18)

Before Pass 1 commit and again before Pass 2 commit, verify every item:

- [ ] Shadow hover-only — card flat at rest (#1).
- [ ] No `max-width` on the card (#2).
- [ ] Symmetric `space-200` padding (#3).
- [ ] No `border-bottom` on header (#4).
- [ ] Title `font-size-400` (#5).
- [ ] Every button has a Lucide + verb label (#6).
- [ ] Zero raw hex / px / rem outside §0.1 allowed list (#7, #13).
- [ ] `brand-60` accent via `--color-action-primary` override (#8).
- [ ] Card `width: 100%`, slot owns cap (#9).
- [ ] Evidence "score" uses §6 linear-fill — no fourth progress indicator (#10).
- [ ] Success banner follows §10 — chip + timestamp, no confetti (#11).
- [ ] Stagger caps at 8 (#12).
- [ ] Lucide only; kbd chips are `<span>`, not icons (#14).
- [ ] No `transition: all`; each transition lists properties (#15).
- [ ] Only the three §16 cubic-beziers (#16).
- [ ] Pass 2 follows Pass 1 — don't skip (#17).

Run the §0.1 grep:
```bash
grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/approval.module.scss
```
Zero matches outside `cubic-bezier(…)`, the `min-height: 24rem` floor, and media queries.

## Scope guard

The **confidence arc** is the only new visual primitive. Accordion, pull-quote, action bar, notes textarea, and success banner all reuse existing family patterns (§2 / §6 / §7 / §9 / §10). Pass 2 (`/frontend-design`) is permitted to elevate the arc's entrance, the verdict-label treatment, and the banner-replace transition — **not** to introduce a second new primitive. If the elevation pass reaches for something new, revisit this spec rather than improvising.

## Out of scope (YAGNI)

Explicitly deferred, even though tempting:

- **Real backend wiring.** Mock trigger is enough for the playground — the widget's job is to render the shape and fire `widget_response` on commit.
- **Multi-reviewer workflows** (concurrent locking, handoff between reviewers). Not in the spec CSV.
- **Evidence reordering / pinning.** Accordion is order-as-provided.
- **Escalation target selection.** Escalate commits with a free-text notes field; the "who to escalate to" dropdown is a future feature if the spec calls for it.
- **Audit trail / history.** Terminal state is terminal — no "show previous decisions" affordance.
