# Widget Conventions

How the widgets in this playground are built. The family is ~20 widgets wide (Checklist, QC Evidence Review, Image Capture, Job Card, Rating, Shift Calendar, Instruction Card, Form, Validated Input, MCQ Quiz, Score Card, Document Preview, File Upload, Evidence Review, Confirmation Card, Quick Reply, Carousel, …). They all live in the same chat stream and need to feel like one family, not twenty parallel designs. This doc is the rule book.

Nexus tokens only. Inter only. Grey-scale neutrals, brand-60 as the single accent, `--color-text-success` / `--color-text-error` / `yellow-60` for status. No raw hex, no magic numbers.

---

## 0. Workflow for building a new widget

Every widget is built in two passes. Do not skip the second pass.

**Pass 1 — base structure.** Get the widget working against this doc:

1. Name the files `WidgetName.jsx` + `widgetName.module.scss` (camelCase SCSS, PascalCase JSX — matches the existing 20-widget family).
2. Build the card shell (§1), header chrome (§2), and primary CTA (§5) exactly as specified. No improvisation yet.
3. Wire up the behavior: state machine, events, validation, submit. Use Nexus atoms (`Button`, `Input`, `Select`) and Lucide icons (§16).
4. Register the widget in `src/chat/registry.js` and schema in `src/engine/widgetSchemas.js`. Add a mockBot trigger so it's testable in the playground.
5. Audit against the anti-patterns (§15). Everything on that list should be zero.
6. Run the hardcoded-value check (§0.1 below). Zero tolerance.

**Pass 2 — elevate with `/frontend-design`.** Once the base structure is in and working, invoke the `/frontend-design` skill to push the UI further:

- The skill is allowed to go beyond "follows the doc" — distinctive micro-interactions, ownership of one signature moment that makes this widget memorable (the Rating widget's hover-preview stars, Instruction Card's numbered-circle rail, QC Evidence Review's bounding-box overlay).
- The skill is **not** allowed to break this doc. The family-level shell, width contract, color conventions, and typography hierarchy are hard constraints.
- The output of Pass 2 should still pass the §15 anti-pattern audit. If `/frontend-design` proposes something that conflicts with this doc, the doc wins — update the widget, don't update the doc.

The two-pass split exists because `/frontend-design` is strong at aesthetic polish but weak at cross-widget consistency. Structure first gives it a stable base to elevate from.

### 0.1 No hardcoded values

This is the one rule that has zero tolerance. Every `color`, `padding`, `margin`, `gap`, `font-size`, `line-height`, `border-width`, `border-radius`, `box-shadow`, `letter-spacing`, `opacity`, `width`, `height` resolves to a Nexus token:

- `var(--space-*)` — spacing
- `var(--size-*)` — fixed dimensions (icon sizes, track heights)
- `var(--font-size-*)` / `var(--line-height-*)` / `var(--font-weight-*)` / `var(--letter-spacing-*)` — type
- `var(--radius-*)` — corners
- `var(--border-width-*)` — strokes
- `var(--shadow-*)` — elevation
- `var(--opacity-*)` — transparency
- `var(--white)` / `var(--grey-*)` / `var(--brand-*)` / `var(--color-text-*)` / `var(--yellow-*)` / `var(--red-*)` — color

Before committing a widget, grep its SCSS for `px`, `rem`, and `#` — if any match isn't inside a `cubic-bezier(…)`, a `clamp(…)` bound, an `aspect-ratio`, or a deliberate `min-height` floor (see §4), it's a bug. Use:

```bash
grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/yourWidget.module.scss
```

Legitimate non-token values (by exhaustion):

- `cubic-bezier(…)` arguments — motion curves (§16).
- `0` / `1` / `100%` — raw CSS values with no token equivalent.
- `clamp(16rem, 88%, 32rem)` — carousel slide sizing with token bounds is fine.
- `aspect-ratio: 4 / 3` — aspect ratios don't have tokens.
- `min-height: 18rem` / `24rem` / `30rem` — see §4 floors.
- `@media (min-width: 640px)` / `@media (max-width: 360px)` — responsive breakpoints. Industry convention is to encode these in px; Nexus doesn't tokenize them.
- `box-shadow: 0 0 0 9999px <color>` — "infinite" inset-fill scrim trick (used in `imageCapture` to dim the viewport around a focus region). `9999px` is semantically "very large," not a measurement.
- Pixel values inside `/* ... */` comments — documentation only, not CSS output.

Everything else fails the check.

Pixel values that do have token equivalents and **must** be substituted:

| Raw | Token |
|---|---|
| `1px`, `2px`, `4px`, `6px`, `8px`, `12px`, `16px`, `20px`, `24px`, `28px`, `32px`, `36px`, `44px`, …     | `var(--size-01)` … `var(--size-44)` … (every even px up to 104) |
| `1px` stroke                                                                                              | `var(--border-width-100)` (also `var(--size-01)` — choose by role) |
| `2px` / `3px` focus-ring offset                                                                           | `var(--size-02)` / `var(--border-width-300)` |
| `1.5px` / `1px` text-decoration-thickness                                                                 | `var(--border-width-150)` / `var(--border-width-100)` |
| `3px` text-underline-offset                                                                               | `var(--border-width-300)` |
| `blur(6px)`                                                                                               | `blur(var(--size-06))` |
| `box-shadow: 0 -12px 32px`                                                                                | `0 calc(-1 * var(--size-12)) var(--size-32)` |
| `width: 1px; height: 1px` (sr-only)                                                                       | `var(--size-01)` each |
| `transform: translateY(4px)`                                                                              | `translateY(var(--size-04))` |
| Gradient stops `transparent 0 3px, color 3px 4px`                                                         | `transparent 0 var(--border-width-300), color var(--border-width-300) var(--size-04)` |

---

## 1. Card shell

Every widget's root element is a "card." The shell is identical:

```scss
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
  padding: var(--space-200);
  width: 100%;

  background: var(--white);
  border: var(--border-width-100) solid var(--grey-10);
  border-radius: var(--radius-200);

  transition:
    box-shadow 200ms cubic-bezier(0.2, 0.8, 0.3, 1),
    border-color 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.card:hover {
  border-color: var(--grey-30);
  box-shadow: var(--shadow-100);
}
```

**Non-negotiable:**

- Symmetric `var(--space-200)` padding — not asymmetric tuples.
- Vertical gap `var(--space-150)` between header / body / footer regions.
- Border `var(--border-width-100) solid var(--grey-10)`.
- Corner radius `var(--radius-200)`.
- **Box shadow on hover only.** Rest state is flat. (Hover lift is the family's "this is interactive" affordance.)
- No `max-width: 94%` / `96%` hacks. Width is owned by the slot (see §3).

---

## 2. Header chrome

Widgets with a title get a standard header: **icon badge + title + optional description**, side-by-side.

```jsx
<header className={styles.header}>
  <span className={styles.iconBadge}><ClipboardCheck size={18} /></span>
  <div className={styles.headerText}>
    <h3 className={styles.title}>{title}</h3>
    {description && <p className={styles.description}>{description}</p>}
  </div>
</header>
```

```scss
.header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-125);
}

.iconBadge {
  width: var(--size-36);  /* 36×36 */
  height: var(--size-36);
  border-radius: var(--radius-150);
  background: color-mix(in srgb, var(--brand-60) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--brand-60) 22%, transparent);
  color: var(--brand-60);
}

.title {
  font-size: var(--font-size-400);     /* 18px */
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-300);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--grey-90);
}

.description {
  font-size: var(--font-size-200);     /* 14px */
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-300);
  color: var(--grey-60);
}
```

**Non-negotiable:**

- No `border-bottom` on the header. Separation comes from the `gap: space-150` on the card, not a rule line.
- Badge is `size-36` (36px). Background is a 10% brand tint, border a 22% brand mix, icon `var(--brand-60)`.
- Title is **font-size-400 (18px)**. Never 500 (20px), never 700 (28px). The modal title is the one exception — it's a full page, not a card.
- Description color is `grey-60`, not `grey-50` or `grey-70`.

---

## 3. Width contract

The card is `width: 100%` and never sets its own max-width. The **slot** owns width.

```scss
/* messageRenderer.module.scss */
.widgetSlot {
  width: 100%;
  max-width: 32rem;   /* the family width */
  min-width: 0;
}

.widgetSlot:has([data-widget-variant="wide"]) {
  max-width: none;    /* opt-out for carousels + wide composites */
}
```

- **Bot-side rows** wrap the widget in `.widgetSlot`. User-side rows don't, so user bubbles stay natural-width and right-aligned.
- **32rem (512px)** is the family width. Mobile frames (390px) never reach it; desktop holds there. It reads as "a rich message bubble," not "a dashboard card."
- A widget that genuinely needs more room (Job Card carousel, generic Carousel) sets `data-widget-variant="wide"` on its root element. The `:has()` selector opts the slot out.

---

## 4. Constant-height contract

Widgets that transition through states (Image Capture idle → live → preview → submitted; Form editing → summary) **must not jump in height** during the transition.

Two mechanisms, applied together:

```scss
.card {
  min-height: 24rem;   /* floor for content-rich widgets */
}

.submitBar {
  margin-top: auto;    /* footer sticks to the bottom regardless of body fill */
}
```

**Floors by widget class:**

- **18rem** — Rating, Quick Reply, Confirmation Card (light, single-purpose).
- **24rem** — Checklist, Instruction Card, MCQ Quiz (mid-density).
- **30rem** — Image Capture (camera viewport is large; state transitions must not shift the card).
- **None** — Validated Input (content is intrinsically uniform; a floor would make single-field variants look padded).

Pick the smallest floor that covers the tallest state. The goal is "no visible jump," not "every widget is the same height."

---

## 5. Primary CTA

The primary action button lives at the bottom of the card, `width: 100%`, and uses the Nexus `Button variant="primary"`. Override the action color locally so every widget hits the same brand-60:

```scss
.card {
  --color-action-primary: var(--brand-60);   /* Nexus default is brand-50 */
  --color-action-primary-hover: color-mix(in srgb, var(--brand-60) 88%, black);
}
```

The CTA reads in sentence-case verb form: "Submit", "Apply now", "Confirm shifts". Never ALL CAPS. Never an icon-only button.

Some widgets own a secondary/reset action — always `variant="secondary"`, always to the left of or above the primary, never styled to compete.

---

## 6. Progress indicator vocabulary

Three progress patterns exist in the family. Pick one; don't invent a fourth.

**Linear fill** — for continuous progress (Form completion, overall score):

```scss
.progressTrack { height: var(--size-02); background: var(--grey-10); border-radius: var(--radius-full); }
.progressFill  { height: 100%; background: var(--brand-60); transition: width 360ms cubic-bezier(0.2, 0.8, 0.3, 1); }
```

**Segmented pills** — for N discrete items, each with a status (Checklist steps, Shift Calendar shifts, QC criteria). One pill per item, color by status:

```
.segment_done      → brand-60 (or color-text-success for positive verdicts)
.segment_current   → brand-60 at half saturation
.segment_pending   → grey-20
.segment_failed    → red-50
```

**Step counter** — for wizard-style widgets (MCQ Quiz question 3 of 7). Just text: `font-size-100`, `font-weight-semibold`, `letter-spacing-wide`, `text-transform: uppercase`, `color: grey-50`.

---

## 7. Status chip vocabulary

Small pill that declares a terminal state ("Approved", "Submitted", "Failed"):

```scss
.chip {
  padding: var(--space-025) var(--space-100);
  border-radius: var(--radius-500);
  background: color-mix(in srgb, var(--tone) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--tone) 24%, transparent);
  color: var(--tone);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
}
```

`--tone` is one of: `--color-text-success` (positive), `--color-text-error` (negative), `--yellow-60` (warning), `--brand-60` (informational).

---

## 8. Decided-row ledger stripe

Rows that have been "decided" (completed step in Checklist, selected shift in Shift Calendar, passed criterion in QC) get a left-edge 3px stripe via `::before`:

```scss
.row::before {
  content: '';
  position: absolute;
  left: 0; top: var(--space-050); bottom: var(--space-050);
  width: var(--border-width-300);  /* 3px */
  border-radius: var(--radius-full);
  background: var(--brand-60);     /* or color-text-success for passes, red-50 for fails */
  opacity: 0;
  transform: scaleY(0.5);
  transition: opacity 220ms, transform 280ms cubic-bezier(0.2, 0.8, 0.3, 1.4);
}

.row_decided::before {
  opacity: var(--opacity-100);
  transform: scaleY(1);
}
```

The stripe springs up on decision, not in on load. It's the family's shared "this is done" affordance.

---

## 9. Tone system

Widgets that carry semantic tone (Instruction Card info/warn/success, Rating positive/negative) expose three local CSS custom props on the card root:

```scss
.card {
  --tone-color:  var(--brand-60);
  --tone-tint:   color-mix(in srgb, var(--brand-60) 10%, var(--white));
  --tone-border: color-mix(in srgb, var(--brand-60) 22%, transparent);
}

.card_warn    { --tone-color: var(--yellow-60); /* tint + border mix from the same */ }
.card_success { --tone-color: var(--color-text-success); }
.card_error   { --tone-color: var(--color-text-error); }
```

Every tone-aware element (badge, stripe, chip) reads from `--tone-color` / `--tone-tint` / `--tone-border` — never hardcodes `brand-60`.

---

## 10. Success banner

Post-submit confirmation state (Rating submitted, Form summary header, Quick Reply acknowledged):

```
[✓ chip]          ←  status chip from §7, tone = success
Thanks. Submitted at 14:32.   ← font-size-200 grey-90
```

No confetti, no illustrations, no "Great job!". A chip + one line of tabular-nums timestamp. Details belong in the summary rows below the banner.

---

## 11. Staggered entry

On mount, the card rises with `riseUp`. Child rows / fields / segments stagger in at 60ms per child up to the 8th:

```scss
@keyframes riseUp {
  from { opacity: 0; transform: translateY(var(--space-100)); }
  to   { opacity: var(--opacity-100); transform: translateY(0); }
}

.row:nth-child(1) { animation-delay: 60ms; }
.row:nth-child(2) { animation-delay: 120ms; }
...
.row:nth-child(8) { animation-delay: 480ms; }
```

Stop staggering past 8 — after that it reads as slow, not considered.

---

## 12. Typography hierarchy

One font (Inter via `var(--sans)`). Four sizes. Don't go outside this ladder.

| Role            | Size             | Weight    | Line height          | Color      |
|-----------------|------------------|-----------|----------------------|------------|
| Card title      | `font-size-400`  | semibold  | `line-height-300`    | `grey-90`  |
| Body / value    | `font-size-200`  | regular   | `line-height-300`    | `grey-90`  |
| Label / meta    | `font-size-200`  | medium    | `line-height-200`    | `grey-80`  |
| Caption / hint  | `font-size-100`  | regular   | `line-height-200`    | `grey-50`  |
| Eyebrow         | `font-size-100`  | semibold  | `1`                  | `grey-50`  |

Eyebrow text (progress text, summary labels) is `letter-spacing-wide` + `text-transform: uppercase`.

---

## 13. Color conventions

- **Accent: brand-60, not brand-50.** Nexus defaults to brand-50; widgets override via `--color-action-primary`. Brand-60 is slightly deeper and holds against `--white` better in chat.
- **Neutral ladder:** `grey-10` (borders), `grey-20` (pending pills), `grey-30` (hover border), `grey-50` (captions / eyebrows), `grey-60` (descriptions), `grey-80` (labels), `grey-90` (titles / values).
- **Success:** `--color-text-success`. **Error:** `--color-text-error`. **Warning:** `--yellow-60`.
- Never use raw hex. Never use Nexus's warmer accents (teal, violet) — they fight brand-60.

---

## 14. Spacing tokens

- `space-200` — card padding.
- `space-150` — card gap between sections.
- `space-125` — header gap (badge ↔ text), row gap in body lists.
- `space-100` — inline gaps between related elements (chip + timestamp, label + value).
- `space-075` — tight inline gap (icon + label inside a button).
- `space-050` — very tight (between chip icon and chip text).

If you reach for a pixel value, you've gone wrong. There is always a token.

---

## 15. Icons

**Lucide React** is the only icon library. Every widget uses it (16 widgets import `lucide-react` today; that's the family).

```jsx
import { ClipboardCheck, Camera, ChevronRight } from 'lucide-react'
```

Standard sizes:

- `size={18}` — inside the 36×36 header badge (§2).
- `size={16}` — inside buttons (next to label text), inline success/error glyphs.
- `size={14}` — inline with caption text (timestamps, meta).
- `strokeWidth={2}` — default for body icons; drop to `1.75` for oversized decorative icons only.

Never mix Lucide with another icon library (Heroicons, Material Icons, FontAwesome). Never inline SVGs unless the shape is genuinely bespoke (e.g., a corner bracket on a camera viewport — even then, prefer CSS `::before` with borders).

---

## 16. Animation curves

Three cubic-bezier curves cover everything in the family. Don't invent a fourth.

| Role                          | Curve                               | Duration        |
|-------------------------------|-------------------------------------|-----------------|
| State transitions (hover, focus, border, shadow) | `cubic-bezier(0.2, 0.8, 0.3, 1)`    | 180–220ms       |
| Rise-up entry (cards, rows, segments)            | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 280–360ms       |
| Springy bounce (chip pop, check scale-in)        | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 240–280ms       |

Entry keyframe is named `riseUp` (locally prefixed if multiple widgets are scoped — `clRiseUp`, `qcevRiseUp`, `icdRailDraw` — to avoid CSS module name clashes across bundles).

```scss
@keyframes riseUp {
  from { opacity: 0; transform: translateY(var(--space-100)); }
  to   { opacity: var(--opacity-100); transform: translateY(0); }
}
```

Never use `transition: all`. List the properties explicitly — it keeps hover states from accidentally animating width / padding changes and saves repaint cost.

---

## 17. File naming + registration

- `WidgetName.jsx` — PascalCase.
- `widgetName.module.scss` — camelCase (Vite's CSS modules convention; matches the 20-widget family).
- Schema entry: `src/engine/widgetSchemas.js`, key `widget_name` (snake_case — matches the CSV spec at `/Users/atulnayyar/Downloads/AI_Labs_Widget_Specification - Rich Chat Widgets.csv`).
- Registry entry: `src/chat/registry.js`, key `widget_name`, value is the imported component.
- Mock trigger: `src/engine/mockBot.js` — add a phrase that emits the widget so it's testable in the playground.

A widget isn't "done" until all four touchpoints exist. Otherwise it's invisible to the chat stream even if the file compiles.

---

## 18. Anti-patterns

Don't do these. If you see them in existing code, it's a bug.

1. `box-shadow: var(--shadow-100)` at rest. (Shadow is hover-only.)
2. `max-width: 94%` / `96%` on the card. (Slot owns width.)
3. Asymmetric card padding (`var(--space-250) var(--space-200) var(--space-200)`). Use symmetric `var(--space-200)`.
4. `border-bottom` on the header to separate it from the body. (Use `gap: space-150` on the card.)
5. Title at `font-size-500` / `700`. Stay at 400.
6. Icon-only CTA. Always include a verb.
7. Raw hex. Always a token.
8. `brand-50` as the accent. Always `brand-60`.
9. Setting width on the card. Card is `width: 100%`; slot caps it.
10. Introducing a fourth progress indicator when one of the three in §6 fits.
11. Confetti / illustrations / "Great job!" copy on success states. See §10.
12. Staggering past the 8th child. Caps out at 480ms.
13. Hardcoded hex / pixel / rem values. See §0.1 — every value resolves to a token.
14. Mixing Lucide with another icon library. Lucide only. See §15.
15. `transition: all`. List properties explicitly. See §16.
16. Inventing a fourth cubic-bezier curve. The three in §16 cover everything.
17. Skipping Pass 2 (`/frontend-design`) after the base structure is in. Base structure is necessary but not sufficient — the family looks generic without the elevation pass. See §0.

---

## Audit results (2026-04-24)

Ran the doc against every widget SCSS file. Strays found:

**Fixed in this pass:**

- **formWidget.module.scss** — broke §1 (shadow at rest), §1 (asymmetric padding `space-250 space-200 space-200`), §2 (header `border-bottom`), §2 (title `font-size-500`). Fixed.
- **jobDetailsModal.module.scss:943–944** — raw hex inside `color-mix()` gradient (`#BAE9F9`, `#F5EAF2`). Replaced with a brand-compatible `blue-10 → brand-10 → white` gradient. Visual shifts slightly cyan-to-brand-blue (was cyan-to-rose) but stays within the token system and reads more on-brand.
- **textMessage.module.scss** — raw pixel padding / font-size / line-height / border-width / radius, plus `var(--brand-60, #1459c7)` fallback. Mapped to `space-125 / space-150` padding, `radius-300` + `radius-100` corners, `font-size-300`, `line-height-300`, `border-width-100`. Fallback hex dropped.
- **widgetResponse.module.scss** — same mix of pixel + hex fallback strays. Mapped to the same token set as `textMessage`; caption opacity `0.75` → `var(--opacity-072)` (closest token), caption margin `4px` → `var(--space-050)`.
- **evidenceReview.module.scss:628, 639** — `padding: 2px` → `var(--space-025)`.
- **confirmationCard.module.scss** — broke §1 (`max-width: 94%`), §1 (shadow at rest), §1 (asymmetric padding `space-200 space-200 space-150 space-250`), §2 (title `font-size-500`, description `font-size-300`, description color `grey-70`). Fixed: card now uses the standard shell (symmetric `space-200` padding, hover-only shadow, `width: 100%`); title → `font-size-400` / `line-height-300`; description → `font-size-200` / `grey-60`. The left accent stripe keeps its tone-bookmark role via `::before` flush with the edge — the symmetric padding leaves a 12px gap between stripe and content, which reads clean.

**Passes:**

Checklist, Image Capture, Instruction Card, Rating, Shift Calendar, QC Evidence Review, Validated Input, MCQ Quiz, Score Card, Document Preview, File Upload, Quick Reply, Carousel, Job Card, Form, Confirmation Card, Job Details Modal, Text Message, Widget Response, Evidence Review — every widget in `src/widgets/` clean.

**Deeper sweep — also fixed in this pass (after a fuller audit turned them up):**

- `outline-offset: 2px` / `3px` across 10 widgets → `var(--size-02)` / `var(--border-width-300)`.
- `text-decoration-thickness: 1.5px` / `1px`, `text-underline-offset: 3px` (JobDetailsModal, Evidence Review) → `var(--border-width-150)` / `var(--border-width-100)` / `var(--border-width-300)`.
- `margin-top: 1px` / `2px`, `margin-bottom: 2px` across Checklist, JobDetailsModal, JobCard, EvidenceReview, FileUpload → `var(--size-01)` / `var(--size-02)`.
- `backdrop-filter: blur(6px)` (JobDetailsModal, ImageCapture) → `blur(var(--size-06))`.
- `width: 44px; height: 44px` capture buttons (ImageCapture) → `var(--size-44)`.
- `width: 1px; height: 1px` sr-only input (FileUpload) → `var(--size-01)`.
- `transform: translateY(4px|6px)` (RatingWidget keyframes) → `translateY(var(--size-04|06))`.
- `transform: translateX(1px|2px)` (ValidatedInput shake keyframe) → `translateX(var(--size-01|02))`.
- `box-shadow: 0 -12px 32px ...` / `0 -4px 16px ...` (JobDetailsModal sheet + sticky CTA) → `calc(-1 * var(--size-*))` + `var(--size-*)`.
- Hatched `repeating-linear-gradient` stops `3px` / `4px` / `6px` / `7px` (Checklist skipped segment, ShiftCalendar full-shift pattern) → `var(--border-width-300)` / `var(--size-04)` / `var(--size-06)` / `calc(var(--size-06) + var(--border-width-100))`.

**Verification command:**

```bash
grep -rnE "#[0-9a-fA-F]{3,6}|[^a-zA-Z0-9_-][0-9]+(\.[0-9]+)?px" src/widgets/*.module.scss \
  | grep -vE "cubic-bezier|^[^:]*:[0-9]+:[[:space:]]*/|@media|9999px"
```

Currently: zero matches outside legitimate exceptions (`9999px` scrim, media queries, comment prose).
