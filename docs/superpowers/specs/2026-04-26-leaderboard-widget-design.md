# Incentive / Leaderboard Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #30 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P2, Phase 2+.
**Family rule book:** `docs/widget-conventions.md` (everything below conforms; the doc wins in any conflict).

---

## Purpose

Display-only performance card that does one of two structurally distinct jobs in the chat stream:

1. **Personal mode** — show a worker their target vs actual for a period, with a visible breakdown across 3–4 metrics and where they sit on the tier/bonus rung.
2. **Leaderboard mode** — show a top-5 ranking of peers (anonymized) with the user's row called out so the comparison is the message, not the leaderboard itself.

The widget is motivational, not interrogative — there are no destructive actions, no submit-state, no decision flow. Two optional ghost links at the foot fire `widget_response` payloads (`{action: 'view_full' | 'how_calculated'}`) so the bot can continue the conversation if the user wants more depth. Otherwise the card sits, animates its signature beat once, and stays decided.

Use-case framing (Reliance incentive management, Troopers shifts, OkayGo QC pass rate, sales leaderboards) rides as payload — `metric_label`, `unit`, `period` — not as separate variants. Same pattern as Earnings (paycheck/incentive/advance) and Profile (worker/admin) where structural shape is the variant and use-case is data.

## Variants

| Variant | Layout signature | Signature moment |
|---|---|---|
| `personal` | Tier rung eyebrow + ring (left) + metric breakdown (right) | Target-hit beat: ring stroke completes → springy pulse + brightness settle on the ring container, Trophy icon retones success, verdict word swaps to "Target hit" with a §16 springy pop |
| `leaderboard` | Top-5 ranked list with user's row highlighted | Staggered §11 row entry; user's row §8 ledger-stripe springs in last on the springy curve — the "you are here" beat |

Default mock-bot text trigger = `personal`.

## Payload schema

```js
{
  widget_id: 'lb_xxx',                          // makeId('lb')
  variant: 'personal' | 'leaderboard',

  // Period framing (both variants)
  period_label: string,                         // e.g. 'April · Week 3'
  metric_label: string,                         // e.g. 'Shifts completed', 'QC pass rate', 'Incentive earned'
  unit: '' | '%' | '₹' | string,                // suffix/prefix for numeric values; empty string is fine

  // -------- Personal variant --------
  // Required when variant === 'personal'
  target: {
    target_value: number,                       // e.g. 24
    current_value: number,                      // e.g. 18
  } | null,

  // 3–4 metric rows under the ring
  breakdown: Array<{
    label: string,                              // e.g. 'Attendance'
    current: number,                            // current_value
    target: number,                             // target_value
    unit?: string,                              // overrides top-level unit if present
  }> | null,

  // Tier rung (always 3 rungs — Bronze / Silver / Gold-style names are payload-driven)
  tier: {
    current: string,                            // e.g. 'Bronze'
    next: string | null,                        // e.g. 'Silver'; null when at top tier
    rungs: Array<string>,                       // 3 names, ordered low → high; current matches one of these
    distance: number | null,                    // points/units to next tier; null when at top tier
    distance_unit: string,                      // suffix copy, e.g. 'to Silver', 'shifts to Silver'
  } | null,

  // -------- Leaderboard variant --------
  // Required when variant === 'leaderboard'
  leaderboard: Array<{
    rank: number,                               // 1..5
    name: string,                               // anonymized handle, e.g. 'Worker 4821'
    score: number,                              // numeric rank value
    is_user: boolean,                           // exactly one row should set this true if user is in top 5
    delta?: number | null,                      // optional +/- vs last period; null/undefined hides the delta
  }> | null,

  // When the user is NOT in the top 5, this footer eyebrow surfaces their position
  user_position: {
    rank: number,                               // e.g. 12
    out_of: number,                             // e.g. 184
  } | null,

  // -------- Optional links (both variants) --------
  // Either or both can be omitted. Render order: view_full left, how_calculated right.
  links: Array<{
    id: 'view_full' | 'how_calculated',
    label: string,                              // sentence-case; e.g. 'View full leaderboard', 'How is this calculated?'
  }>,
}
```

`buildLeaderboardPayload(variant)` in `widgetSchemas.js` mints the per-variant fixture; `getVariantPayload('leaderboard', variant)` is the single source of truth for the mock and any future test surfaces.

## Layout

### Card shell

§1 standard. `width: 100%`, `var(--space-200)` symmetric padding, `var(--space-150)` gap between header / body / foot, hover-only shadow. `min-height: 24rem` (§4 mid-density floor — both variants land near it; the floor keeps mock-bot variant switches from jumping the chat stream).

Slot keeps the family 32rem cap. **No `data-widget-variant="wide"`.** Both variants fit comfortably.

### Header (§2 — both variants)

Trophy lucide icon in the standard 36×36 brand-tinted iconBadge. Title at `font-size-400` semibold:

| Variant | Title | Description (period) |
|---|---|---|
| `personal` | `Your performance` | `April · Week 3` — `payload.period_label` |
| `leaderboard` | `Top performers` | `April · Week 3` — `payload.period_label` |

No `border-bottom`. No header-right chip. The signature visual lives in the body, not the header.

### Body — `personal` variant

Three regions, in order:

**1. Tier rung (eyebrow row).** A `space-150`-gapped horizontal row:

```
[ Bronze chip ]   [● ● ○]   120 to Silver
```

- Tier chip (§7 informational tone, brand-60). `padding: var(--space-025) var(--space-100)`, `border-radius: var(--radius-full)`. Copy is `payload.tier.current`.
- 3-pill rung (§6 segmented-pills vocabulary). One pill per `tier.rungs[i]`. Pill = `--size-08` height, `--space-300` width, `--radius-full`. Done rungs (rungs at or below `current`) tint `--brand-60`; pending rungs tint `--grey-20`. The current rung gets the half-saturation treatment — `color-mix(in srgb, var(--brand-60) 60%, var(--white))` — for the "you are here" cue.
- Distance caption: `font-size-100`, `font-weight-regular`, `grey-50`. Copy is `${distance} ${distance_unit}` (e.g. `120 to Silver`). When `tier.distance === null` (top tier), caption swaps to `Top tier reached` and the rung's right-most pill carries the success tint plus a one-cycle springy pulse.

**2. Two-column ring + breakdown** (`display: grid; grid-template-columns: minmax(0, 7rem) 1fr; gap: var(--space-200);`). Stacks vertically below `--breakpoint-narrow` (480px container — `@container (max-width: 480px)`).

- **Left — ring.** Reuses Profile's exact SVG ring vocabulary: 64×64 viewBox, two concentric circles, `stroke-dashoffset` animates 0 → target over 720ms on the §16 entry curve. Ring tone is derived from progress %:
  - `current/target ≥ 1.0` → `--color-text-success` (signature target-hit state, see Interactions).
  - `current/target ≥ 0.6` → `--brand-60` (on-track default).
  - `current/target < 0.6` → `--yellow-60` (behind).
- **Ring center.** Big number = `current_value` count-up via the same `useCountUp` RAF helper Profile/Earnings already share (720ms ease-out cubic, 180ms delay so it lands inside the ring stroke draw). Number sits at `font-size-400` semibold (§12 — same locked decision Earnings made: prominence carried by weight + tinted ring + count-up, not size escalation past 400). `tabular-nums`. Below the number: `/ {target_value}` at `font-size-100` `grey-50` — quiet reference.
- **Verdict word** below the ring (`font-size-200` semibold, tone-matching color, eyebrow-style `letter-spacing-wide` `text-transform: uppercase`):

  | Progress | Verdict |
  |---|---|
  | ≥ 1.0 | `Target hit` |
  | ≥ 0.85 | `Almost there` |
  | ≥ 0.6 | `On track` |
  | ≥ 0.3 | `Catching up` |
  | < 0.3 | `Behind` |

- **Right — breakdown.** Vertical stack of 3–4 metric rows, `gap: var(--space-125)`. Each row:

  ```
  Attendance                       18 / 22
  ▰▰▰▰▰▰▰▰▰▱▱
  ```

  - Top-row label (`font-size-200`, `font-weight-medium`, `grey-80`) + right-aligned value (`font-size-200`, `font-weight-semibold`, `grey-90`, `tabular-nums`, `current / target` with optional unit).
  - §6 linear-fill mini-bar below: `--size-04` height, `--grey-10` track, `--radius-full`, fill width = `clamp(0, current/target, 1) * 100%`. Fill color tone-tints by row progress (success ≥ 1.0, brand ≥ 0.6, yellow < 0.6 — same thresholds as the ring).
  - Rows stagger §11 (60ms steps, capped at the 8th — the breakdown ships ≤4 so we're well under).

### Body — `leaderboard` variant

Single region: a vertical list of `payload.leaderboard.length` rows (1..5) followed by an optional `user_position` eyebrow caption.

```
#1   [crown]  Worker 4821              92   ↑ 12
#2   [medal]  Worker 6133              88   ↑  4
#3   [award]  Worker 2087              84   −
#4   [4]      Worker 4119              79   ↓  3
#5   [5]      You                      76   ↑  8     ← user row, brand-tinted, ledger stripe
```

```
You're #12 of 184
```

- Row container: `position: relative` (so the §8 ledger stripe `::before` can latch to the row's left edge), `display: flex; align-items: center; gap: var(--space-125)`, `padding: var(--space-100) var(--space-125)`, `border-radius: var(--radius-150)`.
- **Rank pill** (left). Top three (#1/#2/#3) get the same brand-tinted iconBadge treatment as the §2 header (`--size-32` square, `--radius-150`, brand-tinted background, brand-60 icon — Crown / Medal / Award lucide at `size={16}`). Rank #4/#5 get a flat `grey-10` numeral chip — same `--size-32` square, `--radius-150`, `grey-90` numeral at `font-size-200` semibold. **No gold/silver/bronze colors.** The podium reads through icon vocabulary, not off-brand color.
- **Name** (flex: 1). `font-size-200`, `font-weight-medium`, `grey-90`. Copy is `payload.leaderboard[i].name` — for the user's row the schema swaps the anonymized handle to `You` and the weight bumps to `font-weight-semibold`.
- **Score.** `font-size-200`, `font-weight-semibold`, `grey-90`, `tabular-nums`. With unit suffix when present (`92%` for QC pass rate, `₹4,200` for incentive).
- **Delta** (optional, right). `font-size-100`, `font-weight-regular`, `tabular-nums`. Lucide `ArrowUp` / `ArrowDown` / `Minus` at `size={14}` (Lucide pixel prop is fine — not a CSS token). Tones: positive = `--color-text-success`, negative = `--color-text-error`, flat = `--grey-50`. The number drops the sign because the arrow carries it.
- **User row treatment.** Three changes vs the default row:
  1. Background tint = `color-mix(in srgb, var(--brand-60) 6%, var(--white))`.
  2. Name weight bumps to `font-weight-semibold`, copy becomes `You`.
  3. §8 ledger stripe (`::before`) — 3px brand-60 column flush to the left edge, springs in on the springy curve as the last entry beat (see Motion).
- **`user_position` eyebrow** (when present): `font-size-100` semibold, `letter-spacing-wide`, `text-transform: uppercase`, `--grey-50`. Copy `You're #${rank} of ${out_of}`. Sits below the list, separated by `var(--space-125)` gap. Hidden when the user is in the top 5 (one of the rows already has `is_user: true`).

### Footer (both variants — optional)

`display: flex; justify-content: flex-start; gap: var(--space-200)`. Plain `<button type="button">` text-links — **no new Button styles**, matches Profile's `.viewFullLink` and JobCard's `.viewDetailsLink` precedents exactly: `font-size-200`, `font-weight-medium`, resting color `--brand-60` with no underline, hover wash `color-mix(--brand-60 10%, transparent)` + text retones to `--brand-70`, active wash deeper, focus-visible outline `--border-width-200` brand-60. Copy reads "View full leaderboard" / "How is this calculated?". Lucide `ArrowRight` at `size={12}` follows **only** the navigational link (`view_full`); `how_calculated` is explanatory, not directional, so an arrow there would mislead.

When `payload.links` is empty, the footer is omitted entirely (the `min-height: 24rem` floor still holds the card from collapsing).

## States

The widget lives in three logical states. None of them require persistence — they are purely visual choreography that runs once on mount.

| State | When | Visual |
|---|---|---|
| `mounting` | First render through ~600ms | §11 staggered rise-up of body regions (tier rung → ring stroke draw + count-up → breakdown rows / list rows). Ring stroke draws 0 → target over 720ms, count-up runs in parallel with a 180ms head-start. |
| `settled` | After mount choreography ends | Static. Card hover lift (§1) is the only motion. No periodic animation, no idle pulse, no looping. |
| `target_hit_celebration` | Personal variant + `current_value ≥ target_value`, fires once on mount | Layered on top of `mounting`: Trophy icon retones to `--color-text-success` at `~520ms` (after ring completes), one-cycle 280ms springy pulse on the ring container's `::before` halo (Earnings sheen vocabulary), brightness settle closes the beat at ~800ms. Verdict word swaps to "Target hit" and pops on the springy curve. **No confetti, no illustrations, no "Great job!" copy** (§18 #11 — the chip + tone retone + ring sweep carry the celebration). |

Reduced-motion (`@media (prefers-reduced-motion: reduce)`): all introduced animations resolve to a static end-state — ring at full stroke from t=0, count-up resolves to final value at t=0, no rise-up, no halo pulse, no brightness settle. Hover lift remains because §1 makes it the family's "this is interactive" affordance.

## Interactions

The widget is display-only with two optional escape-hatch payloads:

- **Tap "View full leaderboard"** → `onReply({ widget_id, action: 'view_full' })`. Card stays in `settled` (navigational, not terminal — same pattern as Profile's `view_full`).
- **Tap "How is this calculated?"** → `onReply({ widget_id, action: 'how_calculated' })`. Same — navigational, non-terminal.

Both links are idempotent in the bot's eyes; the widget itself does not enter any "submitted" or "decided" state. There is no §10 success banner, no terminal commit chip, no CTA replacement.

**Keyboard.** Both link buttons are real `<button>` elements — Tab order picks them up natively. No bespoke keyboard handling beyond what the browser gives `<button>`.

**ARIA.**
- Ring container has `role="img"` + `aria-label="Progress: ${current_value} of ${target_value} ${unit}"`.
- Each breakdown row's mini-bar is announced via `role="progressbar"` with `aria-valuemin={0}`, `aria-valuemax={target}`, `aria-valuenow={current}`, `aria-label={label}`.
- Leaderboard list is a `<ol>`; user row gets `aria-current="true"`.
- Tier rung is a `<div role="group" aria-label="Tier progress">` with each rung as `<span>` carrying `aria-label="${rung_name}, ${state}"` where state is `"completed" | "current" | "upcoming"`.

## Motion (§16 curves only)

| Beat | Curve | Duration | Notes |
|---|---|---|---|
| Ring stroke draw 0 → target | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` (rise-up) | 720ms | Same helper as Profile. Ease-out is the wrong shape — the springy entry sells the "lap-around" feel. |
| Number count-up 0 → current_value | ease-out cubic (RAF helper, not a CSS curve) | 720ms with 180ms delay | Shared with Earnings/Profile via `useCountUp`. Settles before the ring locks in. |
| Body region rise-up (tier rung → breakdown rows / list rows) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 280–360ms staggered 60ms | §11 standard. Capped at 8 children. |
| User-row ledger stripe spring-in (leaderboard) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` (springy) | 280ms | §8 ledger-stripe vocabulary. Fires after the row's own rise-up settles — `animation-delay` = `(row_stagger_index * 60ms) + 180ms`. |
| Target-hit halo pulse (personal) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` (springy) | 280ms one-cycle | Halo `::before` on the ring container scales 0.96 → 1.04 → 1 with `box-shadow` blooming through `var(--shadow-100)`. Earnings sheen vocabulary. |
| Verdict word "Target hit" pop | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` (springy) | 240ms | Scale 0.92 → 1.04 → 1, opacity fade-in. Fires at ring-completion + ~80ms. |
| Top-tier rung pulse (when `tier.distance === null`) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` (springy) | 280ms one-cycle | Right-most pill scales 0.92 → 1.06 → 1 with success tint retone. |
| Hover-state transitions (card border, shadow) | `cubic-bezier(0.2, 0.8, 0.3, 1)` (state) | 200ms | §1 standard. |

**No fourth curve invented.** Every animation maps to one of the three §16 sanctioned curves.

## Registration (§17 — five touchpoints)

1. **Component file** — `src/widgets/Leaderboard.jsx` (PascalCase) + `src/widgets/leaderboard.module.scss` (camelCase).

2. **Registry entry** — `src/chat/registry.js`:
   ```js
   import Leaderboard from '../widgets/Leaderboard'
   // ...
   leaderboard: Leaderboard,
   ```

3. **Schema entry** — `src/engine/widgetSchemas.js`:
   ```js
   leaderboard: {
     label: 'Leaderboard',
     category: 'display',
     variants: [
       { id: 'personal',    label: 'Personal',    payload: () => buildLeaderboardPayload('personal') },
       { id: 'leaderboard', label: 'Top 5',       payload: () => buildLeaderboardPayload('leaderboard') },
     ],
   }

   function buildLeaderboardPayload(variant) {
     // returns the per-variant fixture; both shapes built off shared period_label / metric_label
   }
   ```

4. **Mock trigger** — `src/engine/mockBot.js`:
   ```js
   registerRule({
     match: /^(show )?(leaderboard|incentive)( personal| top| top.5| top 5)?/i,
     build: (m) => {
       const variant = /top/i.test(m[0]) ? 'leaderboard' : 'personal'
       return { type: 'leaderboard', payload: getVariantPayload('leaderboard', variant) }
     },
   })
   ```

5. **Studio palette icon** — `src/studio/WidgetPalette.jsx` `WIDGET_ICONS`:
   ```js
   leaderboard: Trophy,   // from lucide-react
   ```

## Anti-pattern guardrails (sticky points for this widget)

- **§18 #1** — `box-shadow` only on hover. Ring container halo is layered as `::before` `box-shadow`, animates **once** during the target-hit beat, then resolves to `0 0 0 transparent`. The card itself never carries shadow at rest.
- **§18 #2 / §3** — no `max-width` on the card root. Two-column ring/breakdown layout fits inside the 32rem slot at desktop. Below 480px container width, columns collapse to a stack.
- **§18 #5** — title stays at `font-size-400`. The ring's count-up number also caps at `font-size-400` semibold (locked decision — same as Earnings).
- **§18 #6** — link buttons always have a verb + caret. Never icon-only.
- **§18 #8** — accent override on the card root: `--color-action-primary: var(--brand-60)` — even though the widget has no Nexus `Button` instances. Future consistency if the foot ever upgrades.
- **§18 #10** — tier rung uses §6 segmented-pills vocabulary; metric breakdown uses §6 linear-fill vocabulary; ring is a sanctioned circular translation of linear-fill (per the widget-plan note for #29 Profile). **Three vocabularies, all sanctioned, no fourth invented.**
- **§18 #11** — no confetti, no illustrations, no "Great job!" copy on target-hit. Halo pulse + tone retone + Trophy success-tint + verdict word swap carry the celebration. Same restraint as Earnings/Profile.
- **§18 #12** — stagger caps at 8 children. Breakdown ≤4, leaderboard ≤5 + user_position; well under.
- **§18 #13** — every value resolves to a Nexus token. Verified rungs only: `--space-{025,050,075,100,125,150,200,300}`, `--size-{04,08,16,20,24,28,32,36}`, `--radius-{150,200,500,full}`, `--font-size-{100,200,400}`, `--font-weight-{regular,medium,semibold}`, `--border-width-{100,300}`, `--shadow-100`, all listed `--brand-/grey-/color-text-/yellow-` tokens. **No `--size-14`** (doesn't exist — Lucide `size={14}` PROP is fine, that's a pixel prop, not a CSS token).
- **§18 #14** — Lucide only. Trophy / Crown / Medal / Award / ChevronRight / ArrowUp / ArrowDown / Minus.
- **§18 #15** — properties listed explicitly on every `transition`. No `transition: all`.
- **§18 #16** — three sanctioned curves only. See Motion table.

**§13 color-system specifics:**
- Rank pills #1/#2/#3 get the §2 brand-tinted iconBadge treatment, **not** gold/silver/bronze. The podium reads through Lucide icon vocabulary (Crown/Medal/Award), not off-brand color. Locked decision — gold/silver/bronze fight `--brand-60` and break the family's two-tone discipline.
- User-row tint is `color-mix(in srgb, var(--brand-60) 6%, var(--white))` — under the §7 chip's 10% to keep the row tint from competing with chips it might contain.
- Ring tone follows progress %, mapping to `--color-text-success` / `--brand-60` / `--yellow-60`. Same threshold table as the breakdown bars so the visual cue is consistent across regions.

**§4 floor specifics:** `min-height: 24rem` on the card. Personal variant lands ~22rem natural; leaderboard variant lands ~20rem with 5 rows + user_position eyebrow. The 24rem floor handles mock-bot variant flips without a chat-stream jump.

## Scope guard

This widget ships **only** the two variants documented above. Things explicitly NOT in scope:

- **No "View full leaderboard" inline expansion.** The link fires a `widget_response` and the bot owns the navigation. No accordion, no portal sheet, no drill-down.
- **No live data updates.** The widget renders the payload once and never re-fetches. If the bot needs to push fresh standings, it sends a new widget message.
- **No filtering / sorting affordances.** No "By week / by month" tabs, no "Show all metrics" toggle. Two structural variants, period framing on the header, full stop.
- **No confetti / lottie / illustration assets.** §18 #11.
- **No periodic / idle animation.** Ring sweep + count-up + ledger-stripe spring all fire once on mount and resolve to a static settled state.
- **No second signature primitive.** Personal mode owns the ring; leaderboard mode owns the user-row ledger stripe. Each variant has exactly one signature beat — Pass 2 elevates one of them, not both, and never invents a third.
- **No keyboard shortcuts.** Both link buttons are real `<button>` elements; native Tab order is sufficient. Keyboard shortcuts are reserved for capture-style widgets (Audio Player ←/→ seek, Image Capture Space-to-shoot).
- **No tier-rung interaction.** The 3-pill rung is purely informational. No tap-to-explain, no hover popover.

## Out-of-scope follow-ups (for the bot, not this widget)

- The bot should be ready to handle `view_full` and `how_calculated` payloads. The widget commits `widget_response` and stays in `settled` — the bot routes from there.
- A future "team leaderboard" variant (e.g. Reliance regional rollups) would be a third structural variant added to the schema, not a payload toggle on `leaderboard`. Not in this build.
- A future "compare to last period" variant would extend the breakdown row schema with a `previous` field. Not in this build.

---

**Signature moments to elevate in Pass 2 (`/frontend-design`):**

- **Personal:** the target-hit beat — ring stroke completion, halo pulse, Trophy success-tint, verdict word pop. The handoff between the ring locking in and the celebration starting is where Pass 2 should spend its budget. Brightness/sheen vocabulary is borrowed from Earnings; the goal is that the moment reads as "you crossed the line," not "the animation finished."
- **Leaderboard:** the user-row ledger stripe spring-in. Pass 2 should consider a brief brand-60 background pulse as the stripe latches — a single-beat "you are here" cue that lands after the row's own §11 rise-up settles.

Pass 2 must not touch: §1 shell, §3 width, §12 type, §13 color (specifically the no-gold/silver/bronze decision on rank pills), §16 curves, §17 registration, §18 anti-patterns, the locked decision to keep ring center number at `font-size-400`, the locked decision against confetti / illustrations / "Great job!" copy.
