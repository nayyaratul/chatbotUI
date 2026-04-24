# Candidate / Worker Profile Card Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #29 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P2, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (doc wins any conflict).

---

## Purpose

A profile summary card that surfaces a worker or candidate at a glance: photo/initials, name, headline, key stats, skills, availability, and (optionally) a composite score. Two audiences:

- **`worker`** variant — self-service view. The worker sees their own profile; a single primary CTA lets them update it.
- **`admin`** variant — recruiter / reviewer view. Three actions at the footer: Reject, View Full Profile, Shortlist.

Signature moment is the **composite score ring** — a circular translation of §6's linear-fill vocabulary (per the widget-plan hint, explicitly sanctioned). Stroke fills `0 → target/max` while the score number counts up inside.

## Variants

| Variant | Header chrome | Score ring | Action bar |
|---|---|---|---|
| `worker` | Photo/initials + name + "Your profile" headline + availability chip | Optional (shown if `score` present) | Single primary CTA "Update profile" |
| `admin` | Photo/initials + name + headline + availability chip | Same | 3 buttons — Reject (secondary-destructive) · View full profile (secondary-neutral) · Shortlist (primary) |

Default mock-bot variant = `worker`.

## Payload schema

```js
{
  widget_id: 'pcd_xxx',                      // makeId('pcd')
  variant: 'worker' | 'admin',
  worker_id: string,
  name: string,
  headline?: string,                          // 'Shipping Assistant · 3 yrs'
  initials?: string,                          // 'PS' — derived from name if absent
  photo_url?: string,                         // optional; falls back to initials disc
  stats: [
    { icon: string, label: string, value: string },   // icon = Lucide name; cap 4
  ],
  skills: [string],                           // cap shown: 5; overflow → '+N more' chip
  availability: 'available' | 'busy' | 'unavailable',
  score?: {
    value: number,                            // 0..max
    max: number,                              // 100 typical
    label?: string,                           // 'Strong' / 'Decent' / 'Room to grow' — derived if absent
  },
  actions: [
    { id: string, label: string, intent: 'primary' | 'neutral' | 'destructive' },
  ],
}
```

Result sent to the bot on action tap (`widget_response`):

```js
{ widget_id, worker_id, variant, action_id, acted_at: ISO }
```

## Layout

```
┌─────────────────────────────────────────────────────┐
│  [PHOTO]  Priya Sharma                  [AVAILABLE] │   header
│          Shipping Assistant · 3 yrs                 │
│                                                     │
│  ┌────────┐    [★]  Rating        4.8 / 5           │   body grid
│  │  82    │    [🎯]  Tasks done    147              │   (ring left, stats right)
│  │ /100   │    [🌐]  Languages     Hi, En, Ka       │
│  └────────┘    [⏱]  Experience    3 yrs             │
│   Strong                                            │
│                                                     │
│  SKILLS                                             │   eyebrow
│  ┌──────┐ ┌──────────┐ ┌────────────┐               │   §7 chips
│  │ Nav  │ │ Field ops│ │COD handling│               │   (stagger in)
│  └──────┘ └──────────┘ └────────────┘               │
│  ┌──────────────┐ ┌────────┐                        │
│  │ Bike handling│ │ +2 more│                        │
│  └──────────────┘ └────────┘                        │
│                                                     │
│  [ Update profile ]                    ← worker     │   footer
│  ─────── OR ───────                                 │
│  [Reject] [View full] [Shortlist]      ← admin      │
└─────────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` (16px) padding, `grey-10` border, hover-only shadow, `radius-200`, `width: 100%`. `min-height: 24rem` (§4 mid-density floor).

**Header.**

- Photo/avatar cell — `size-48` (48px) circular container.
  - If `photo_url` present: would normally render the image. In the playground, NO external image loads — always use the initials fallback. Future-proof: JSX renders the `<img>` when url present, with `onError` fallback to initials; in the mock payloads `photo_url` is never set.
  - Initials fallback: brand-tinted disc (`color-mix brand-60 @ 10%` bg, `color-mix brand-60 @ 22%` border, `brand-60` color), `font-size-200` / `semibold` / uppercase, derived from the first letter of the first 2 words of `name` (matches `TrainingScenario` pattern).
- Name — `h3`, `font-size-400` / `semibold` / `grey-90` / `letter-spacing-tight`.
- Headline — `p`, `font-size-200` / `regular` / `grey-60`.
- Availability chip — §7 pill top-right. Lucide glyph + label: `Circle` (filled tone) + "Available" / "Busy" / "Offline". Tones: `available` = success, `busy` = yellow-60, `unavailable` = grey-60.

**Body grid — score ring + stats.**

- CSS Grid `auto 1fr` — left track sized to content (the ring), right track takes remaining space (the stats list).
- Column gap `space-200` (16px), baseline alignment.
- Grid collapses gracefully if `score` is absent: grid becomes effectively one column, stats list spans the full width.

**Composite score ring (signature).**

- `size-64` (64px) SVG, two concentric `<circle>` elements:
  - Track: `stroke: grey-10`, `stroke-width: var(--border-width-300)` (3px).
  - Fill: `stroke: var(--tone-color)`, same stroke-width, `stroke-linecap: round`, `stroke-dasharray = circumference`, `stroke-dashoffset` animates from `circumference → circumference * (1 - ratio)` on mount via CSS custom property.
- Rotate `-90deg` so the fill starts at 12 o'clock.
- Score number inside the ring — absolutely positioned at the SVG's center, `font-size-400` / `semibold` / `grey-90` / `tabular-nums` / `letter-spacing-tight`. "82" style, not "82%". `/ 100` tail in `font-size-100` / `regular` / `grey-60` on a second line.
- Tone thresholds (mirror TrainingScenario):
  - `≥ 85` → `success` ("Strong")
  - `≥ 60` → `warning` ("Decent")
  - `< 60`  → `error` ("Room to grow")
- Verdict word below the ring — §12 eyebrow style, `grey-50` / `letter-spacing-wide` / uppercase / `font-weight-semibold`.

Count-up on the score number uses the same `useCountUp` helper pattern from Earnings (RAF-driven, 720ms, respects `prefers-reduced-motion`). Ring's `stroke-dashoffset` animates alongside via CSS `animation-delay`. Both beats chain at `180ms` delay, resolve at `~900ms`.

**Stats list.**

- Right column of the body grid. Flex column layout.
- Each row: `[Lucide icon] [label] ··· [value]` — 3-column sub-grid (`auto 1fr auto`).
- Icon: `size-16` (16px), `grey-60`.
- Label: `font-size-200` / `regular` / `grey-80`.
- Value: `font-size-200` / `semibold` / `grey-90` / `tabular-nums` / right-aligned.
- Cap 4 rows; overflow is a schema error, not a render concern. Rows stagger in (60ms/row, §11 cap not relevant here since cap = 4).
- Icon map: `star` → `Star`, `target` → `Target`, `globe` → `Globe`, `clock` → `Clock`, `briefcase` → `Briefcase`, `award` → `Award`, `trending-up` → `TrendingUp`. Unknown values fall back to `Dot`.

**Skills section.**

- Eyebrow `SKILLS` — §12 eyebrow + `border-bottom grey-10 border-width-100` (matches Earnings breakdown section).
- Chip row: `display: flex; flex-wrap: wrap; gap: space-075`.
- Each chip — §7 neutral: `background: grey-10 @ 50%` with white, `border: border-width-100 solid grey-20`, `color: grey-80`, `font-size-100` / `semibold` / uppercase / `letter-spacing-wide` / `padding: space-025 space-100`, `radius-500`.
- Max 5 visible; overflow renders as `+N more` chip with a dashed border to visually distinguish it.
- Skills chips stagger in `60ms/chip`, capped at 5 (+ the overflow chip makes up to 6 but stagger cap is 5 — overflow chip fires on the last beat).

**Footer.**

- `worker` variant: single §5 primary CTA, full-width. Sentence-case verb + `ArrowRight` iconRight (matches Earnings / Approval). Label driven by `actions[0]`.
- `admin` variant: 3-button row, `display: flex; gap: space-100; flex-wrap: wrap`. Order left→right: `Reject` (secondary, red tone via `--color-action-primary: color-text-error` locally) · `View full profile` (secondary, grey-ladder) · `Shortlist` (primary, brand-60). Same "destructive on left, constructive on right" convention Approval uses.

**Success banner** post-action — §10 shape, tone-success chip + tabular-nums timestamp (same as every other committed-state widget).

## States

1. **Idle (on mount).** Card rises (§16 entry, 320ms). Header fade-ins with the card. Body grid at `delay 120ms`. Ring stroke + score count both start at `delay 180ms`, land at `~900ms`. Stats rows stagger from `delay 300ms` (60ms step). Skills eyebrow at `delay 480ms`; skill chips stagger from `540ms` (60ms step). Footer at the end — `delay = 540 + chipCount * 60 + 240ms`.
2. **Acted (terminal).** Footer replaced by §10 success banner. Header + body + skills remain visible.

Reduced-motion collapses count-up, stroke-dashoffset animation, and all staggers to instant reveals.

## Interactions

- **CTA / action click** — fires `widget_response`, transitions to Acted.
- **No other interactions** — skills are static, stats are read-only, availability is a display chip.
- **Keyboard** — Tab cycles through action buttons in DOM order. `Enter` / `Space` triggers.
- **Reduced motion** — honored throughout.

## Motion

All motion uses the three §16 curves.

| Element | Curve | Duration |
|---|---|---|
| Card entry (`pcdRiseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Body-grid rise | same | 280ms, delay 120ms |
| Ring stroke-dashoffset | same | 720ms, delay 180ms |
| Score count-up | JS easing (ease-out-cubic, matches §16 entry curve feel) | 720ms, delay 180ms |
| Stats row stagger | same | 320ms per row, 60ms step, delay 300ms base |
| Skill chip stagger | same | 280ms per chip, 60ms step, delay 540ms base |
| Hover / focus transitions | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 180–220ms |
| Success banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |

Never `transition: all`.

## Registration (§17 five touchpoints)

1. `src/widgets/Profile.jsx` + `src/widgets/profile.module.scss`.
2. `src/chat/registry.js` — `profile: Profile`.
3. `src/engine/widgetSchemas.js` — schema entry + `buildProfilePayload(variant)` fixtures for `worker` and `admin`.
4. `src/engine/mockBot.js` — triggers `/^(profile|my profile|your profile|worker profile)$/i` → worker; `/^(candidate profile|review profile|admin profile|profile review)$/i` → admin.
5. `src/studio/WidgetPalette.jsx` — `profile: UserCircle2` (Lucide).

## Anti-pattern guardrails (§18)

All 17 items still in force. Pre-commit checks:

- [ ] Shadow hover-only (#1).
- [ ] No card-root `max-width` (#2).
- [ ] Symmetric `space-200` card padding (#3).
- [ ] No header `border-bottom` (#4).
- [ ] Title at `font-size-400` (#5).
- [ ] Every CTA has Lucide + verb (#6).
- [ ] Zero raw hex / px / rem outside §0.1 allowed list (#7, #13).
- [ ] `brand-60` via `--color-action-primary` on primary CTA (#8).
- [ ] Card `width: 100%` (#9).
- [ ] Ring uses §6 vocabulary (linear-fill translated to circle); no donut/gauge/bar-chart primitive introduced (#10).
- [ ] Success banner follows §10 (#11).
- [ ] Stagger caps at 8 (#12) — we're at ≤5 for skills, ≤4 for stats, so already below.
- [ ] Lucide icons only, no bespoke SVG except the score-ring `<circle>`s (§15 — SVGs are permitted for data viz, not icons).
- [ ] No `transition: all` (#15).
- [ ] Only three §16 curves (#16).
- [ ] Pass 2 follows Pass 1 (#17).

**Pre-SCSS token-verification checklist** (lesson from Earnings `space-175` / `font-weight-bold` bugs):

- Before composing any SCSS, grep the Nexus tokens to confirm rung availability:
  ```bash
  grep -h "^\s*--font-weight-\|^\s*--font-size-\|^\s*--space-\|^\s*--size-\|^\s*--radius-\|^\s*--border-width-\|^\s*--line-height-\|^\s*--letter-spacing-\|^\s*--opacity-" \
    ~/Projects/nexus-design-system/ -r 2>/dev/null | sort -u
  ```
- Confirmed rungs for this widget: `size` = 48 / 64 / 16 / 4 / 8 / 12; `radius` = 100 / 150 / 200 / 500 / full; `border-width` = 100 / 300; `font-weight` = regular / medium / semibold (no `bold`); `font-size` = 100 / 200 / 400; `space` = 025 / 050 / 075 / 100 / 125 / 150 / 200 / 250 (no 175); `opacity` = 012 / 024 / 072 / 100.

Run the §0.1 grep:
```bash
grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/profile.module.scss
```

## Scope guard

The **score ring** is the sole new primitive — and it's a sanctioned translation of §6's linear-fill vocabulary (widget-plan explicitly OKs it). Everything else reuses existing family patterns.

Pass 2 (`/frontend-design`) is permitted to elevate:

1. **Ring arrival rhythm** — paired score count-up + stroke fill, possibly a subtle tone-specific settle on the final frame (success → soft glow, warning → gentle pulse, error → no celebration).
2. **Skill-chip stagger** — refined rise-up timing, maybe a subtle tonal shift on the `+N more` overflow chip when it lands (signals "there's more here").
3. **Availability chip** — subtle dot-pulse on `available` status (signals "live"); still at one beat, no looping.

Pass 2 is **not** permitted to:

- Introduce a second primitive — no trend sparkline, no bar chart, no avatar composite (photo frame stays 48px circular, no decorative frames).
- Escalate the score number above `font-size-400`.
- Replace the ring with a donut (explicit filled interior ring with labels — stays stroke-only).
- Add a second ring somewhere (e.g., an availability ring around the photo — the availability chip is the one affordance).
- Override §1 / §3 / §12 / §13 / §16 / §17 / §18.

## Out of scope (YAGNI)

- External photo loads. Playground uses initials only; `photo_url` is schema-reserved for production.
- Inline profile editing. CTA fires `widget_response` with `action_id = 'update'`; the bot handles the flow downstream.
- Messaging / scheduling affordances.
- Multi-profile comparison (that's #22).
- Skills popover / tooltip for long skill descriptions — chips render the skill name, no hover detail.
- Credential / verification badges layered onto the photo or ring. Keep the visual signal to: availability chip + score ring.
- Real backend wiring.
