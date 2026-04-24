# Approval Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Approval widget (#23) — admin/reviewer-facing card that renders an AI recommendation + evidence and commits a decision inside the chat stream. Four use-case variants share one shell.

**Architecture:** Single component `Approval.jsx` + `approval.module.scss`, registered in all five §17 touchpoints. Internal state machine: `idle → pending-confirm → committed`. One new visual primitive (confidence arc SVG); everything else reuses existing family patterns (§1 shell, §2 header, §6 linear fill, §7 chip, §9 tone, §10 success banner, §16 motion curves). Two-pass workflow per §0: Pass 1 base structure, then Pass 2 elevation with `/frontend-design`.

**Tech Stack:** React 18 + Vite + SCSS modules + Lucide React + `@nexus/atoms` (`Button`). No test runner in this project — verification is manual via `npm run dev` + the §0.1 grep + §18 anti-pattern audit.

**Spec:** `docs/superpowers/specs/2026-04-24-approval-widget-design.md` — read end-to-end before starting. The plan below encodes the spec's decisions (four variants, confidence arc as header-right flourish, tiered decision flow, single-open accordion, 24rem min-height, §10 banner on commit).

**Rule book:** `docs/widget-conventions.md` — every structural question not answered in the spec defers to the doc.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `src/widgets/Approval.jsx` | **Create** | The widget component — root shell, header (with confidence arc), reasoning pull-quote, evidence accordion, action bar, committed state. |
| `src/widgets/approval.module.scss` | **Create** | All styling. Card shell per §1, header per §2, accordion / pull-quote / banner sections, SVG arc styling, state-transition keyframes. Zero hardcoded values. |
| `src/chat/registry.js` | **Modify** | Add import + `approval: Approval` entry. |
| `src/engine/widgetSchemas.js` | **Modify** | Add the `approval` schema entry with four variants; add the `buildApprovalPayload(variant)` helper near the top of the file. |
| `src/engine/mockBot.js` | **Modify** | Add a text-trigger rule for `approval` (default variant = `bgv`). |
| `src/studio/WidgetPalette.jsx` | **Modify** | Add `Gavel` to the Lucide imports and `approval: Gavel` to the `WIDGET_ICONS` map. |

`Approval.jsx` stays in one file — the widget's surface is cohesive enough (one state machine, one layout) that splitting would fragment reasoning. Target size ~300–400 lines, in line with `TrainingScenario.jsx` (302). Internal helpers (`ConfidenceArc`, `EvidencePanel`, kind-specific body renderers) live as local components inside this file.

---

## Task 1: Register the schema + mock trigger + icon (scaffold only, no component yet)

Add the widget to the four registration files *except* `registry.js` (which can't import a non-existent file). This lets Pass 1 start with all the schema machinery in place — when we create `Approval.jsx` in Task 2, the widget already has a palette tile, a mock trigger, and a payload generator waiting for it.

**Files:**
- Modify: `src/engine/widgetSchemas.js` (add `buildApprovalPayload` + `approval` entry)
- Modify: `src/engine/mockBot.js` (add one `registerRule` call)
- Modify: `src/studio/WidgetPalette.jsx` (add `Gavel` import + map entry)

- [ ] **Step 1.1: Add `buildApprovalPayload` helper + `approval` entry to `widgetSchemas.js`.**

Insert the helper near the existing `richJobs()` helper (search for `function richJobs()` and place `buildApprovalPayload` below it). Then insert the `approval:` entry inside the `widgetSchemas` object just before the `training_scenario:` entry (keep category-adjacent entries grouped).

```js
/* ─── Shared approval payload builder ─────────────────────────────
   Returns a representative payload per variant for the Approval
   widget (#23). Used by both widgetSchemas variants and any mockBot
   rule, so a single call site keeps the fixtures in one place. */
function buildApprovalPayload(variant) {
  const base = {
    widget_id: makeId('ap'),
    variant,
    actions: ['approve', 'reject', 'more_info', 'escalate'],
  }

  if (variant === 'bgv') {
    return {
      ...base,
      case_id: 'case-bgv-4821',
      summary: { title: 'Priya Sharma',    subtitle: 'Aadhaar verification' },
      recommendation: { verdict: 'approve', confidence: 0.87, tone: 'success' },
      reasoning:
        'Cross-match between submitted Aadhaar and PAN fields passed on name, DOB, and address. Phone verification succeeded on the first attempt. No discrepancies flagged.',
      evidence: [
        { id: 'ev-aadhaar', kind: 'document',  label: 'Aadhaar front', meta: '92% match', body: { thumbnail_url: '', name: 'aadhaar-front.jpg', subtitle: 'Captured 2 min ago · 2.1 MB' } },
        { id: 'ev-pan',     kind: 'document',  label: 'PAN card',       meta: '98% match', body: { thumbnail_url: '', name: 'pan-front.jpg',     subtitle: 'Captured 2 min ago · 1.8 MB' } },
        { id: 'ev-score',   kind: 'score',     label: 'Cross-match score', meta: '4 of 4 checks', body: { rows: [
          { label: 'Name match',    value: 1.00 },
          { label: 'DOB match',     value: 1.00 },
          { label: 'Address match', value: 0.88 },
          { label: 'Phone verified', value: 1.00 },
        ] } },
      ],
    }
  }

  if (variant === 'interview') {
    return {
      ...base,
      case_id: 'case-iv-2039',
      summary: { title: 'Rahul Kumar', subtitle: 'Interview — Ops Lead' },
      recommendation: { verdict: 'borderline', confidence: 0.62, tone: 'warning' },
      reasoning:
        'Strong domain answers but weak on stakeholder-management scenarios. Communication is clear; culture fit is acceptable. Panel split — this is a borderline call that warrants a second round.',
      evidence: [
        { id: 'ev-transcript', kind: 'transcript', label: 'Key excerpts',       meta: '3 moments', body: { excerpts: [
          { timestamp: '04:12', text: 'When the merchandiser pushed back on the SLA, I told him the target was non-negotiable. The conversation got tense but he agreed eventually.' },
          { timestamp: '12:47', text: 'I have not personally run a P0 outage post-mortem — I have only shadowed one.' },
          { timestamp: '23:05', text: 'I think the hardest part of this role is going to be the cross-team coordination, honestly.' },
        ] } },
        { id: 'ev-scores',     kind: 'score',      label: 'Panel scorecard',     meta: '62% overall',  body: { rows: [
          { label: 'Domain depth',          value: 0.78 },
          { label: 'Stakeholder handling',  value: 0.45 },
          { label: 'Communication clarity', value: 0.72 },
          { label: 'Culture fit',           value: 0.66 },
        ] } },
      ],
    }
  }

  if (variant === 'qc_flagged') {
    return {
      ...base,
      case_id: 'case-qc-4812',
      summary: { title: 'Audit #4812', subtitle: 'Shelf layout — Reliance Fresh, Indiranagar' },
      recommendation: { verdict: 'reject', confidence: 0.78, tone: 'error' },
      reasoning:
        'Two of five criteria failed. Shelf products are not aligned to the planogram; front-facing signage is obscured by a stack of cartons on aisle 4. Recommend resubmission with corrections.',
      evidence: [
        { id: 'ev-photo',    kind: 'document', label: 'Submitted photo', meta: '4.2 MB', body: { thumbnail_url: '', name: 'audit-4812.jpg', subtitle: 'Captured 18 min ago · GPS verified' } },
        { id: 'ev-criteria', kind: 'criteria', label: 'Criteria checklist', meta: '2 / 5 failed', body: { items: [
          { label: 'Location verified',         pass: true },
          { label: 'Product alignment',         pass: false },
          { label: 'Price tags visible',        pass: true },
          { label: 'Signage unobstructed',      pass: false },
          { label: 'Aisle clear of obstructions', pass: true },
        ] } },
      ],
    }
  }

  if (variant === 'offer') {
    return {
      ...base,
      case_id: 'case-off-7701',
      summary: { title: 'Priya Sharma', subtitle: 'Offer — Ops Lead, Bangalore' },
      recommendation: { verdict: 'approve', confidence: 0.94, tone: 'success' },
      reasoning:
        'Panel scored 88% overall. Compensation package is within the approved band for this role + location. All references cleared. Recommended to send offer.',
      evidence: [
        { id: 'ev-comp',   kind: 'compensation', label: 'Compensation', meta: 'Within band', body: { rows: [
          { label: 'Base',           value: '₹ 18,00,000 / year' },
          { label: 'Variable',       value: '₹ 3,00,000 / year (20%)' },
          { label: 'Joining bonus',  value: '₹ 2,00,000' },
          { label: 'Notice period',  value: '60 days' },
        ] } },
        { id: 'ev-scores', kind: 'score',        label: 'Panel summary',  meta: '88% overall', body: { rows: [
          { label: 'Interview panel',     value: 0.88 },
          { label: 'Reference check',     value: 0.92 },
          { label: 'Assessment score',    value: 0.85 },
        ] } },
      ],
    }
  }

  return base
}
```

Then add the `approval` entry. Place it before `training_scenario:`:

```js
  approval: {
    label: 'Approval',
    category: 'advanced',
    variants: [
      { id: 'bgv',        label: 'BGV',       payload: () => buildApprovalPayload('bgv') },
      { id: 'interview',  label: 'Interview', payload: () => buildApprovalPayload('interview') },
      { id: 'qc_flagged', label: 'QC',        payload: () => buildApprovalPayload('qc_flagged') },
      { id: 'offer',      label: 'Offer',     payload: () => buildApprovalPayload('offer') },
    ],
  },
```

- [ ] **Step 1.2: Add the mock-bot trigger in `mockBot.js`.**

Search for `// ─── Training Scenario` and insert the new rule just before it, so advanced admin widgets group together:

```js
// ─── Approval — BGV default ──────────────────────────────────────
// Trigger: "approval", "approve", "review case", "bgv review"
registerRule({
  match: /^(approval|approve|review case|bgv review|admin review)$/i,
  build: () => ({ type: 'approval', payload: getVariantPayload('approval', 'bgv') }),
})
```

- [ ] **Step 1.3: Add `Gavel` to the palette icons in `WidgetPalette.jsx`.**

Add `Gavel` to the `lucide-react` import block (alphabetize near `GraduationCap`), then add one map entry:

```js
// in the import block:
import {
  // … existing imports …
  Gavel,
  // … existing imports …
} from 'lucide-react'

// in WIDGET_ICONS:
const WIDGET_ICONS = {
  // … existing entries …
  approval:           Gavel,
  // … existing entries …
}
```

- [ ] **Step 1.4: Verify the Studio sees the new widget before the component exists.**

Run: `npm run dev`. Open the Studio (at the URL the dev server prints — typically `http://localhost:5173`). Open the widget picker. You should see an **Approval** tile under the *Advanced* category with the Gavel icon and a "4" variant count.

Clicking the tile will show a payload preview for each variant. Do **not** try to render it into the chat yet — the component doesn't exist, so `MessageRenderer` will warn in the console. This is expected and confirms everything wired up right.

- [ ] **Step 1.5: Commit.**

```bash
git add src/engine/widgetSchemas.js src/engine/mockBot.js src/studio/WidgetPalette.jsx
git commit -m "feat(widget): Approval — schema, mock trigger, palette tile"
```

---

## Task 2: Create the component scaffold — card shell + §2 header (without arc yet)

The goal of this task is a renderable component. No arc, no accordion, no actions — just the shell and header so we can see the payload land in the chat.

**Files:**
- Create: `src/widgets/Approval.jsx`
- Create: `src/widgets/approval.module.scss`
- Modify: `src/chat/registry.js`

- [ ] **Step 2.1: Create the SCSS module with §1 shell + §2 header.**

Write `src/widgets/approval.module.scss`:

```scss
/* Approval Widget (#23) — admin decision card */

.card {
  /* Local tone variable — driven by recommendation.verdict. Child
     elements (arc, pull-quote, banner, decided stripe) read from this. */
  --tone-color: var(--brand-60);
  --tone-tint:  color-mix(in srgb, var(--tone-color) 10%, var(--white));
  --tone-border: color-mix(in srgb, var(--tone-color) 22%, transparent);

  /* §5 — brand-60 accent for the primary button */
  --color-action-primary: var(--brand-60);
  --color-action-primary-hover: color-mix(in srgb, var(--brand-60) 88%, black);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
  padding: var(--space-200);
  width: 100%;
  min-height: 24rem;  /* §4 mid-density floor */

  background: var(--white);
  border: var(--border-width-100) solid var(--grey-10);
  border-radius: var(--radius-200);

  transition:
    box-shadow 200ms cubic-bezier(0.2, 0.8, 0.3, 1),
    border-color 200ms cubic-bezier(0.2, 0.8, 0.3, 1);

  animation: apvRiseUp 320ms cubic-bezier(0.18, 0.9, 0.28, 1.04) both;
}

.card:hover {
  border-color: var(--grey-30);
  box-shadow: var(--shadow-100);
}

.card_success { --tone-color: var(--color-text-success); }
.card_warning { --tone-color: var(--yellow-60); }
.card_error   { --tone-color: var(--color-text-error); }

.header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-125);
  justify-content: space-between;
}

.headerStart {
  display: flex;
  align-items: flex-start;
  gap: var(--space-125);
  min-width: 0;  /* so the text truncates before pushing the arc */
  flex: 1;
}

.iconBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--size-36);
  height: var(--size-36);
  border-radius: var(--radius-150);
  background: color-mix(in srgb, var(--brand-60) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--brand-60) 22%, transparent);
  color: var(--brand-60);
}

.headerText {
  display: flex;
  flex-direction: column;
  gap: var(--space-025);
  min-width: 0;
}

.title {
  margin: 0;
  font-size: var(--font-size-400);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-300);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--grey-90);
}

.description {
  margin: 0;
  font-size: var(--font-size-200);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-300);
  color: var(--grey-60);
}

@keyframes apvRiseUp {
  from { opacity: 0; transform: translateY(var(--space-100)); }
  to   { opacity: var(--opacity-100); transform: translateY(0); }
}
```

- [ ] **Step 2.2: Create the component scaffold `src/widgets/Approval.jsx`.**

```jsx
import cx from 'classnames'
import {
  ShieldCheck,
  MessagesSquare,
  ScanSearch,
  HandCoins,
} from 'lucide-react'
import styles from './approval.module.scss'

/* ─── Approval Widget (#23) ────────────────────────────────────────
   Admin / reviewer card. One shell, four variants (bgv, interview,
   qc_flagged, offer). State machine: idle → pending-confirm (for
   destructive actions) → committed. Signature moment: confidence arc
   as §2 header-right flourish.

   Spec: docs/superpowers/specs/2026-04-24-approval-widget-design.md
   Rule book: docs/widget-conventions.md
   ──────────────────────────────────────────────────────────────── */

const VARIANT_ICONS = {
  bgv: ShieldCheck,
  interview: MessagesSquare,
  qc_flagged: ScanSearch,
  offer: HandCoins,
}

const TONE_CLASS = {
  success: 'card_success',
  warning: 'card_warning',
  error:   'card_error',
}

export function Approval({ payload }) {
  const { variant = 'bgv', summary, recommendation } = payload ?? {}
  const Icon = VARIANT_ICONS[variant] ?? ShieldCheck

  const toneClass = TONE_CLASS[recommendation?.tone] ?? null

  return (
    <div className={cx(styles.card, toneClass && styles[toneClass])}>
      <header className={styles.header}>
        <div className={styles.headerStart}>
          <span className={styles.iconBadge} aria-hidden>
            <Icon size={18} strokeWidth={2} />
          </span>
          <div className={styles.headerText}>
            <h3 className={styles.title}>{summary?.title}</h3>
            {summary?.subtitle && (
              <p className={styles.description}>{summary.subtitle}</p>
            )}
          </div>
        </div>
        {/* Confidence arc goes here in Task 3 */}
      </header>
      {/* Reasoning + accordion + action bar follow in later tasks */}
    </div>
  )
}
```

- [ ] **Step 2.3: Wire the component into the registry.**

Edit `src/chat/registry.js` — add an import near the existing ones and one entry in the `registry` object:

```js
// near the existing imports (keep alphabetical-ish by file name):
import { Approval } from '../widgets/Approval.jsx'

// in the registry object, group near the other advanced widgets:
export const registry = {
  // … existing entries …
  approval: Approval,
  // … existing entries …
}
```

- [ ] **Step 2.4: Verify the shell renders.**

Run: `npm run dev`. In the chat, type `approval` (the mock trigger). The card should render with:
- The brand-tinted shield icon on the left.
- "Priya Sharma" as the title.
- "Aadhaar verification" as the subtitle.
- Nothing else (no arc yet, no body, no actions — that comes next).
- Card border is `grey-10`, hovering deepens to `grey-30` + adds `shadow-100`.
- Card rises in on mount.

Browser console should be warning-free. If `MessageRenderer` still warns about an unknown type, double-check the registry import path and key spelling.

- [ ] **Step 2.5: Commit.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss src/chat/registry.js
git commit -m "feat(widget): Approval — Pass 1 shell + header"
```

---

## Task 3: Confidence arc (the signature primitive)

Add the circular SVG arc as a trailing element in the header. Sweep from 0 to `confidence` on mount.

**Files:**
- Modify: `src/widgets/Approval.jsx`
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 3.1: Add the `ConfidenceArc` component inside `Approval.jsx`.**

Place it above the `Approval` function. It's a pure presentational component — no state.

```jsx
const VERDICT_LABEL = {
  approve:    'APPROVE',
  reject:     'REJECT',
  borderline: 'BORDERLINE',
}

const VERDICT_LABEL_DONE = {
  approve:    'APPROVED',
  reject:     'REJECTED',
  more_info:  'INFO REQUESTED',
  escalate:   'ESCALATED',
}

function ConfidenceArc({ confidence, verdict, committed = false, decisionKey = null }) {
  /* 44x44 container; stroke = border-width-300 (3px equivalent). Circle
     circumference is 2 * pi * r. Using r = 18 (leaves ~2px gutter around
     the 44px frame for the stroke) so circumference ≈ 113.097. We draw
     the full ring in the track colour then layer a tone-coloured arc on
     top whose stroke-dasharray is set to circumference (and dash-offset
     animates from full → 0 on mount). */
  const C = 2 * Math.PI * 18  // ≈ 113.097
  const sweep = committed ? 1 : (confidence ?? 0)
  const dashOffset = C * (1 - Math.max(0, Math.min(1, sweep)))
  const labelWord = committed
    ? (VERDICT_LABEL_DONE[decisionKey] ?? VERDICT_LABEL[verdict] ?? '')
    : (VERDICT_LABEL[verdict] ?? '')

  return (
    <div className={styles.arcWrap} aria-hidden>
      <svg
        className={styles.arcSvg}
        viewBox="0 0 44 44"
        role="img"
        aria-label={`Confidence ${Math.round((confidence ?? 0) * 100)} percent`}
      >
        <circle className={styles.arcTrack} cx="22" cy="22" r="18" />
        <circle
          className={styles.arcFill}
          cx="22"
          cy="22"
          r="18"
          style={{
            strokeDasharray: C,
            strokeDashoffset: dashOffset,
          }}
        />
      </svg>
      <span className={styles.arcVerdict}>{labelWord}</span>
    </div>
  )
}
```

- [ ] **Step 3.2: Render the arc in the header.**

Replace the `{/* Confidence arc goes here in Task 3 */}` comment with:

```jsx
<ConfidenceArc
  confidence={recommendation?.confidence}
  verdict={recommendation?.verdict}
/>
```

- [ ] **Step 3.3: Add the arc SCSS.**

Append to `approval.module.scss`:

```scss
/* Confidence arc — §2 header-right flourish, the signature primitive */

.arcWrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-025);
  flex: 0 0 auto;
}

.arcSvg {
  width: var(--size-44);
  height: var(--size-44);
  display: block;
}

.arcTrack {
  fill: none;
  stroke: var(--grey-10);
  stroke-width: var(--border-width-300);
}

.arcFill {
  fill: none;
  stroke: var(--tone-color);
  stroke-width: var(--border-width-300);
  stroke-linecap: round;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  transition: stroke-dashoffset 540ms cubic-bezier(0.18, 0.9, 0.28, 1.04) 120ms,
              stroke 280ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.arcVerdict {
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--tone-color);
  transition: color 280ms cubic-bezier(0.2, 0.8, 0.3, 1);
}
```

- [ ] **Step 3.4: Add the arc entry-from-zero behaviour.**

The arc needs to mount with `strokeDashoffset = C` (zero sweep) and then transition to the target offset. The CSS transition handles that *if* the initial render is at full offset. Since React sets `style.strokeDashoffset` on first paint with the computed value (already at target), we need a one-tick delay so the transition runs.

First, add the React hooks import at the top of `Approval.jsx` (Task 2 didn't need it yet):

```jsx
import { useEffect, useState } from 'react'
```

Then update `ConfidenceArc` to use a `useEffect` + `useState` for the "mounted" flag. Replace the component with:

```jsx
function ConfidenceArc({ confidence, verdict, committed = false, decisionKey = null }) {
  const C = 2 * Math.PI * 18
  const target = committed ? 1 : (confidence ?? 0)
  const [swept, setSwept] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSwept(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const dashOffset = C * (1 - (swept ? Math.max(0, Math.min(1, target)) : 0))
  const labelWord = committed
    ? (VERDICT_LABEL_DONE[decisionKey] ?? VERDICT_LABEL[verdict] ?? '')
    : (VERDICT_LABEL[verdict] ?? '')

  return (
    <div className={styles.arcWrap} aria-hidden>
      <svg className={styles.arcSvg} viewBox="0 0 44 44" role="img"
           aria-label={`Confidence ${Math.round((confidence ?? 0) * 100)} percent`}>
        <circle className={styles.arcTrack} cx="22" cy="22" r="18" />
        <circle className={styles.arcFill} cx="22" cy="22" r="18"
                style={{ strokeDasharray: C, strokeDashoffset: dashOffset }} />
      </svg>
      <span className={styles.arcVerdict}>{labelWord}</span>
    </div>
  )
}
```

Both `useState` and `useEffect` are now imported from the line added above.

- [ ] **Step 3.5: Verify the arc.**

Run: `npm run dev`. Type `approval` in chat. Confirm:
- 44×44 circular arc renders to the right of the title column.
- Arc starts empty and sweeps up to 87% of the ring (for `bgv`).
- Verdict label "APPROVE" sits below the arc in the tone colour.
- The arc is `color-text-success` (green) because `recommendation.tone = 'success'`.
- Switch in the Studio to the `qc_flagged` variant → arc is `color-text-error` (red), label "REJECT", sweep ≈78%.
- Switch to `interview` → arc is `yellow-60`, label "BORDERLINE", sweep ≈62%.

- [ ] **Step 3.6: Commit.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss
git commit -m "feat(widget): Approval — confidence arc in header"
```

---

## Task 4: Reasoning pull-quote

One paragraph, `border-width-300` left bar in the tone colour.

**Files:**
- Modify: `src/widgets/Approval.jsx`
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 4.1: Add the reasoning block below the header in `Approval.jsx`.**

Inside the `Approval` function, destructure `reasoning` from payload:

```jsx
export function Approval({ payload }) {
  const { variant = 'bgv', summary, recommendation, reasoning } = payload ?? {}
  // … rest unchanged …
}
```

Then after the `</header>` closing tag, add:

```jsx
{reasoning && (
  <blockquote className={styles.reasoning}>
    {reasoning}
  </blockquote>
)}
```

- [ ] **Step 4.2: Style the reasoning block.**

Append to `approval.module.scss`:

```scss
.reasoning {
  margin: 0;
  padding: var(--space-025) 0 var(--space-025) var(--space-125);
  border-left: var(--border-width-300) solid var(--tone-color);

  font-size: var(--font-size-200);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-300);
  color: var(--grey-80);

  transition: border-color 280ms cubic-bezier(0.2, 0.8, 0.3, 1);
}
```

- [ ] **Step 4.3: Verify.**

Run: `npm run dev`. Type `approval`. The reasoning paragraph renders below the header with a tone-coloured left bar. Body text is `grey-80`, readable at `font-size-200`. Bar colour matches the arc.

- [ ] **Step 4.4: Commit.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss
git commit -m "feat(widget): Approval — reasoning pull-quote"
```

---

## Task 5: Evidence accordion — single-open + all five kind bodies

Biggest task in the plan. Builds the accordion wrapper, the single-open state, the row header (chevron + label + meta chip), and all five body renderers (`document`, `score`, `transcript`, `criteria`, `compensation`).

**Files:**
- Modify: `src/widgets/Approval.jsx`
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 5.1: Add the Lucide imports for the accordion.**

Update the import block at the top of `Approval.jsx`:

```jsx
import {
  ShieldCheck,
  MessagesSquare,
  ScanSearch,
  HandCoins,
  ChevronRight,
  Check,
  X as XIcon,
} from 'lucide-react'
```

- [ ] **Step 5.2: Add the body-renderer helpers inside `Approval.jsx`.**

Place these above the `Approval` function (below `ConfidenceArc`):

```jsx
function EvidenceBodyDocument({ body }) {
  return (
    <div className={styles.evDocument}>
      <div className={styles.evDocThumb} aria-hidden>
        {body?.thumbnail_url ? (
          <img src={body.thumbnail_url} alt="" />
        ) : (
          <span className={styles.evDocThumbEmpty}>
            {(body?.name ?? 'doc').slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <div className={styles.evDocText}>
        <p className={styles.evDocName}>{body?.name}</p>
        {body?.subtitle && <p className={styles.evDocSubtitle}>{body.subtitle}</p>}
      </div>
    </div>
  )
}

function EvidenceBodyScore({ body }) {
  const rows = body?.rows ?? []
  return (
    <ul className={styles.evScoreList}>
      {rows.map((row, i) => {
        const v = Math.max(0, Math.min(1, row.value ?? 0))
        const band = v >= 0.85 ? 'strong' : v >= 0.6 ? 'okay' : 'weak'
        return (
          <li key={i} className={styles.evScoreRow}>
            <span className={styles.evScoreLabel}>{row.label}</span>
            <span className={styles.evScoreTrack}>
              <span
                className={cx(styles.evScoreFill, styles[`evScoreFill_${band}`])}
                style={{ width: `${Math.round(v * 100)}%` }}
              />
            </span>
            <span className={styles.evScoreValue}>{Math.round(v * 100)}%</span>
          </li>
        )
      })}
    </ul>
  )
}

function EvidenceBodyTranscript({ body }) {
  const excerpts = body?.excerpts ?? []
  return (
    <ul className={styles.evTranscriptList}>
      {excerpts.map((x, i) => (
        <li key={i} className={styles.evTranscriptRow}>
          <span className={styles.evTranscriptTime}>{x.timestamp}</span>
          <p className={styles.evTranscriptText}>{x.text}</p>
        </li>
      ))}
    </ul>
  )
}

function EvidenceBodyCriteria({ body }) {
  const items = body?.items ?? []
  return (
    <ul className={styles.evCriteriaGrid}>
      {items.map((it, i) => (
        <li
          key={i}
          className={cx(
            styles.evCriteriaChip,
            it.pass ? styles.evCriteriaChip_pass : styles.evCriteriaChip_fail,
          )}
        >
          {it.pass ? <Check size={14} strokeWidth={2} /> : <XIcon size={14} strokeWidth={2} />}
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  )
}

function EvidenceBodyCompensation({ body }) {
  const rows = body?.rows ?? []
  return (
    <ul className={styles.evCompList}>
      {rows.map((row, i) => (
        <li key={i} className={styles.evCompRow}>
          <span className={styles.evCompLabel}>{row.label}</span>
          <span className={styles.evCompValue}>{row.value}</span>
        </li>
      ))}
    </ul>
  )
}

function EvidenceBody({ kind, body }) {
  switch (kind) {
    case 'document':      return <EvidenceBodyDocument body={body} />
    case 'score':         return <EvidenceBodyScore body={body} />
    case 'transcript':    return <EvidenceBodyTranscript body={body} />
    case 'criteria':      return <EvidenceBodyCriteria body={body} />
    case 'compensation':  return <EvidenceBodyCompensation body={body} />
    default:
      if (import.meta.env.DEV) {
        console.warn(`[Approval] unsupported evidence kind: ${kind}`)
      }
      return <p className={styles.evUnknown}>Unsupported evidence kind.</p>
  }
}

function EvidencePanel({ item, open, committed, onToggle }) {
  return (
    <li className={cx(styles.evPanel, open && styles.evPanel_open, committed && styles.evPanel_done)}>
      <button
        type="button"
        className={styles.evHeader}
        onClick={() => onToggle(item.id)}
        aria-expanded={open}
      >
        <span className={styles.evChevron} aria-hidden>
          <ChevronRight size={16} strokeWidth={2} />
        </span>
        <span className={styles.evLabel}>{item.label}</span>
        {item.meta && <span className={styles.evMeta}>{item.meta}</span>}
      </button>
      {open && (
        <div className={styles.evBody}>
          <EvidenceBody kind={item.kind} body={item.body} />
        </div>
      )}
    </li>
  )
}
```

- [ ] **Step 5.3: Wire the accordion into the main component.**

Extend the destructure and add state:

```jsx
export function Approval({ payload }) {
  const { variant = 'bgv', summary, recommendation, reasoning, evidence = [] } = payload ?? {}
  const [openPanelId, setOpenPanelId] = useState(null)

  const togglePanel = useCallback(
    (id) => setOpenPanelId((prev) => (prev === id ? null : id)),
    [],
  )
  // … rest unchanged …
}
```

Then below the reasoning block, add:

```jsx
{evidence.length > 0 && (
  <ul className={styles.evidenceList}>
    {evidence.map((item) => (
      <EvidencePanel
        key={item.id}
        item={item}
        open={openPanelId === item.id}
        committed={false}
        onToggle={togglePanel}
      />
    ))}
  </ul>
)}
```

- [ ] **Step 5.4: Style the accordion + all five body kinds.**

Append to `approval.module.scss`:

```scss
/* ── Evidence accordion ─────────────────────────────────────────── */

.evidenceList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;

  border: var(--border-width-100) solid var(--grey-10);
  border-radius: var(--radius-150);
  overflow: hidden;
}

.evPanel + .evPanel {
  border-top: var(--border-width-100) solid var(--grey-10);
}

.evHeader {
  display: flex;
  align-items: center;
  gap: var(--space-125);
  width: 100%;
  padding: var(--space-125) var(--space-150);

  background: var(--white);
  border: none;
  cursor: pointer;

  font-family: inherit;
  font-size: var(--font-size-200);
  color: var(--grey-90);
  text-align: left;

  transition: background-color 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.evHeader:hover { background: var(--grey-05, color-mix(in srgb, var(--grey-10) 50%, var(--white))); }

.evChevron {
  display: inline-flex;
  color: var(--grey-50);
  transition: transform 200ms cubic-bezier(0.2, 0.8, 0.3, 1),
              color 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.evPanel_open .evChevron {
  transform: rotate(90deg);
  color: var(--grey-80);
}

.evPanel_done .evChevron { color: var(--grey-50); }

.evLabel {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evMeta {
  padding: var(--space-025) var(--space-100);
  border-radius: var(--radius-500);
  background: color-mix(in srgb, var(--brand-60) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--brand-60) 22%, transparent);
  color: var(--brand-60);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  white-space: nowrap;
}

.evBody {
  padding: var(--space-150);
  border-top: var(--border-width-100) solid var(--grey-10);
  background: color-mix(in srgb, var(--grey-10) 30%, var(--white));
}

/* ── document ── */

.evDocument {
  display: flex;
  align-items: center;
  gap: var(--space-125);
}

.evDocThumb {
  width: var(--size-72);
  height: var(--size-72);
  border-radius: var(--radius-150);
  background: var(--grey-10);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.evDocThumbEmpty {
  font-size: var(--font-size-200);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  color: var(--grey-60);
}

.evDocText { display: flex; flex-direction: column; gap: var(--space-025); min-width: 0; }
.evDocName { margin: 0; font-size: var(--font-size-200); font-weight: var(--font-weight-medium); color: var(--grey-90); }
.evDocSubtitle { margin: 0; font-size: var(--font-size-100); color: var(--grey-50); }

/* ── score ── */

.evScoreList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-100); }

.evScoreRow {
  display: grid;
  grid-template-columns: 10rem 1fr auto;
  align-items: center;
  gap: var(--space-125);
}

.evScoreLabel { font-size: var(--font-size-200); color: var(--grey-80); }

.evScoreTrack {
  position: relative;
  height: var(--size-02);
  background: var(--grey-10);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.evScoreFill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 360ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.evScoreFill_strong { background: var(--color-text-success); }
.evScoreFill_okay   { background: var(--yellow-60); }
.evScoreFill_weak   { background: var(--color-text-error); }

.evScoreValue {
  font-size: var(--font-size-200);
  font-weight: var(--font-weight-semibold);
  color: var(--grey-90);
  font-variant-numeric: tabular-nums;
}

/* ── transcript ── */

.evTranscriptList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-125); }

.evTranscriptRow { display: flex; flex-direction: column; gap: var(--space-050); }

.evTranscriptTime {
  align-self: flex-start;
  padding: var(--space-025) var(--space-075);
  border-radius: var(--radius-500);
  background: var(--grey-10);
  color: var(--grey-60);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  font-variant-numeric: tabular-nums;
}

.evTranscriptText { margin: 0; font-style: italic; font-size: var(--font-size-200); line-height: var(--line-height-300); color: var(--grey-80); }

/* ── criteria ── */

.evCriteriaGrid { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-075); }

.evCriteriaChip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-050);
  padding: var(--space-050) var(--space-100);
  border-radius: var(--radius-500);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
}

.evCriteriaChip_pass {
  background: color-mix(in srgb, var(--color-text-success) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--color-text-success) 24%, transparent);
  color: var(--color-text-success);
}

.evCriteriaChip_fail {
  background: color-mix(in srgb, var(--color-text-error) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--color-text-error) 24%, transparent);
  color: var(--color-text-error);
}

/* ── compensation ── */

.evCompList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-075); }

.evCompRow {
  display: flex;
  justify-content: space-between;
  gap: var(--space-125);
}

.evCompLabel { font-size: var(--font-size-200); color: var(--grey-80); }
.evCompValue { font-size: var(--font-size-200); color: var(--grey-90); font-variant-numeric: tabular-nums; }

/* ── unknown kind fallback ── */

.evUnknown { margin: 0; font-size: var(--font-size-100); color: var(--grey-50); }
```

- [ ] **Step 5.5: Verify.**

Run: `npm run dev`. For each variant (trigger via Studio):

- **`bgv`**: three panels — "Aadhaar front" / "PAN card" / "Cross-match score". Open "Cross-match score" → four linear-fill rows at 100 / 100 / 88 / 100. Open "Aadhaar front" → the score panel collapses (single-open), thumbnail + "aadhaar-front.jpg" + subtitle render.
- **`interview`**: two panels. "Key excerpts" expands → three italic blockquote rows with timestamp chips. "Panel scorecard" expands → four rows with mixed `strong` / `okay` / `weak` colours.
- **`qc_flagged`**: two panels. "Criteria checklist" expands → five chips, 2 red fail + 3 green pass.
- **`offer`**: two panels. "Compensation" expands → four key/value rows with currency + "Within band" meta chip.

Confirm **single-open**: opening a second panel collapses the first. Tapping an open panel closes it. Chevron rotates 90° on open and un-rotates on close.

- [ ] **Step 5.6: Commit.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss
git commit -m "feat(widget): Approval — evidence accordion + five body kinds"
```

---

## Task 6: Action bar — tiered decision flow

Approve = one-tap commit. Reject / More info / Escalate = two-step (tap → inline notes textarea → Confirm). The committed state (Task 7) will replace this bar with a §10 banner.

**Files:**
- Modify: `src/widgets/Approval.jsx`
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 6.1: Add the Button import + action-specific icons.**

Update imports:

```jsx
import { Button } from '@nexus/atoms'
// extend the lucide-react import block:
import {
  // … existing …
  ChevronRight,
  Check,
  X as XIcon,
  CircleCheck,
  CircleX,
  CircleHelp,
  Flag,
} from 'lucide-react'
```

- [ ] **Step 6.2: Add action configuration + state inside `Approval`.**

Extend the React import added in Task 3 to include `useCallback` and `useMemo`:

```jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
```

Then add the imports for the ChatActionsContext:

```jsx
import { useChatActions } from '../chat/ChatActionsContext.jsx'
```

Place near the top of the file, below `VARIANT_ICONS`:

```jsx
const ACTION_META = {
  approve:   { label: 'Approve',    Icon: CircleCheck, tone: 'success', destructive: false },
  reject:    { label: 'Reject',     Icon: CircleX,     tone: 'error',   destructive: true  },
  more_info: { label: 'More info',  Icon: CircleHelp,  tone: 'warning', destructive: true  },
  escalate:  { label: 'Escalate',   Icon: Flag,        tone: 'brand',   destructive: true  },
}

/* Fixed render order: destructive on the left, constructive on the
   right (thumb/eye lands on Approve). A subset of these is accepted
   via payload.actions. */
const ACTION_ORDER = ['escalate', 'more_info', 'reject', 'approve']

const CONFIRM_COPY = {
  reject:    { prompt: 'Reason for rejection (optional)',        confirm: 'Confirm reject'   },
  more_info: { prompt: 'What information do you need? (optional)', confirm: 'Confirm request' },
  escalate:  { prompt: 'Escalation note (optional)',             confirm: 'Confirm escalate' },
}
```

- [ ] **Step 6.3: Wire the action state machine.**

Inside `Approval`:

```jsx
export function Approval({ payload }) {
  const {
    variant = 'bgv',
    case_id,
    summary,
    recommendation,
    reasoning,
    evidence = [],
    actions = ['approve', 'reject', 'more_info', 'escalate'],
  } = payload ?? {}

  const [openPanelId, setOpenPanelId] = useState(null)
  const [pending, setPending] = useState(null)   // null | 'reject' | 'more_info' | 'escalate'
  const [notes, setNotes] = useState('')
  const [decision, setDecision] = useState(null) // null | { action, notes, at }

  const { onReply } = useChatActions()

  const visibleActions = useMemo(
    () => ACTION_ORDER.filter((a) => actions.includes(a)),
    [actions],
  )

  const commit = useCallback(
    (action, noteText = '') => {
      const decidedAt = new Date().toISOString()
      setDecision({ action, notes: noteText, at: decidedAt })
      onReply({
        type: 'widget_response',
        payload: {
          widget_id: payload?.widget_id,
          source_type: 'approval',
          case_id,
          decision: action,
          notes: noteText || undefined,
          decided_at: decidedAt,
        },
      })
    },
    [onReply, case_id, payload?.widget_id],
  )

  const handleClick = useCallback(
    (action) => {
      if (decision) return
      if (!ACTION_META[action]?.destructive) {
        commit(action)
        return
      }
      setPending(action)
      setNotes('')
    },
    [decision, commit],
  )

  const cancelPending = useCallback(() => {
    setPending(null)
    setNotes('')
  }, [])

  const confirmPending = useCallback(() => {
    if (!pending) return
    commit(pending, notes.trim())
    setPending(null)
  }, [pending, notes, commit])

  // togglePanel unchanged from Task 5
  // … existing togglePanel useCallback …
```

- [ ] **Step 6.4: Render the action bar + pending-confirm notes region.**

After the evidence accordion `</ul>`, add:

```jsx
{!decision && (
  <div className={styles.actionRegion}>
    {pending && (
      <div className={styles.pendingPrompt}>
        <label className={styles.pendingLabel} htmlFor={`apv-notes-${payload?.widget_id}`}>
          {CONFIRM_COPY[pending]?.prompt}
        </label>
        <textarea
          id={`apv-notes-${payload?.widget_id}`}
          className={styles.pendingTextarea}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          autoFocus
        />
        <div className={styles.pendingActions}>
          <Button type="button" variant="secondary" onClick={cancelPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={confirmPending}
            className={cx(styles.confirmButton, styles[`confirmButton_${ACTION_META[pending].tone}`])}
          >
            {CONFIRM_COPY[pending]?.confirm}
          </Button>
        </div>
      </div>
    )}

    <div className={cx(styles.actionBar, pending && styles.actionBar_locked)}>
      {visibleActions.map((action) => {
        const meta = ACTION_META[action]
        const Icon = meta.Icon
        return (
          <Button
            key={action}
            type="button"
            variant={action === 'approve' ? 'primary' : 'secondary'}
            onClick={() => handleClick(action)}
            disabled={!!pending && pending !== action}
            className={cx(
              styles.actionButton,
              styles[`actionButton_${action}`],
              pending === action && styles.actionButton_armed,
            )}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{meta.label}</span>
          </Button>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 6.5: Style the action bar + pending region.**

Append to `approval.module.scss`:

```scss
/* ── Action bar + pending-confirm ──────────────────────────────── */

.actionRegion {
  display: flex;
  flex-direction: column;
  gap: var(--space-125);
  margin-top: auto;  /* §4 — sticks footer to the bottom */
}

.actionBar {
  display: flex;
  gap: var(--space-100);
  flex-wrap: wrap;
  justify-content: flex-end;

  transition: opacity 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.actionBar_locked .actionButton:not(.actionButton_armed) {
  opacity: var(--opacity-040);
  pointer-events: none;
}

.actionButton {
  display: inline-flex;
  align-items: center;
  gap: var(--space-075);
}

/* Reject tone — secondary button whose tokens locally tilt error */
.actionButton_reject {
  --color-action-primary: var(--color-text-error);
  --color-action-primary-hover: color-mix(in srgb, var(--color-text-error) 88%, black);
  color: var(--color-text-error);
}

.pendingPrompt {
  display: flex;
  flex-direction: column;
  gap: var(--space-075);
  padding: var(--space-125);
  border: var(--border-width-100) solid var(--grey-10);
  border-radius: var(--radius-150);
  background: color-mix(in srgb, var(--grey-10) 30%, var(--white));

  animation: apvSlideDown 220ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
}

.pendingLabel {
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--grey-50);
}

.pendingTextarea {
  width: 100%;
  resize: vertical;
  padding: var(--space-075);
  border: var(--border-width-100) solid var(--grey-30);
  border-radius: var(--radius-100);
  background: var(--white);
  font-family: inherit;
  font-size: var(--font-size-200);
  line-height: var(--line-height-300);
  color: var(--grey-90);

  transition: border-color 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.pendingTextarea:focus {
  outline: none;
  border-color: var(--brand-60);
}

.pendingActions {
  display: flex;
  gap: var(--space-100);
  justify-content: flex-end;
}

.confirmButton_error {
  --color-action-primary: var(--color-text-error);
  --color-action-primary-hover: color-mix(in srgb, var(--color-text-error) 88%, black);
}

.confirmButton_warning {
  --color-action-primary: var(--yellow-60);
  --color-action-primary-hover: color-mix(in srgb, var(--yellow-60) 88%, black);
}

.confirmButton_brand {
  --color-action-primary: var(--brand-60);
  --color-action-primary-hover: color-mix(in srgb, var(--brand-60) 88%, black);
}

@keyframes apvSlideDown {
  from { opacity: 0; transform: translateY(calc(-1 * var(--space-100))); }
  to   { opacity: var(--opacity-100); transform: translateY(0); }
}
```

- [ ] **Step 6.6: Verify.**

Run: `npm run dev`. Type `approval`. Confirm:
- Four buttons render in the right order: Escalate · More info · Reject · Approve.
- Tap **Approve** → card visibly commits (text "Decision recorded" via a subsequent `widget_response` row echoed by the bot; for now the action bar disappears as `decision` state is set — banner comes in Task 7).
- Tap **Reject** (fresh trigger) → other buttons fade to 40% opacity, the Reject button stays lit, a notes textarea slides down above the bar with the prompt "Reason for rejection (optional)" + Cancel / Confirm reject buttons. The Confirm button is error-toned.
- Type a note. Tap **Confirm reject** → commits.
- Tap **Cancel** from the pending state → notes collapse, all four buttons return to full opacity.
- Tap **More info** → pending region appears with "What information do you need?" prompt, Confirm button is yellow-60.
- Tap **Escalate** → pending region appears with Confirm button in brand-60.

- [ ] **Step 6.7: Commit.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss
git commit -m "feat(widget): Approval — tiered action bar with inline confirm"
```

---

## Task 7: Committed state — success banner + arc morph

Replace the action bar with §10 banner, re-tone the arc, desaturate evidence chevrons, render notes as a secondary pull-quote if present.

**Files:**
- Modify: `src/widgets/Approval.jsx`
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 7.1: Replace the arc with its committed variant.**

Update the header render so the arc receives committed state:

```jsx
<ConfidenceArc
  confidence={recommendation?.confidence}
  verdict={recommendation?.verdict}
  committed={!!decision}
  decisionKey={decision?.action}
/>
```

- [ ] **Step 7.2: Shift the card tone on commit.**

The post-commit tone tracks the decision, not the recommendation. Compute the tone class from either source:

```jsx
const activeTone = decision
  ? (decision.action === 'approve' ? 'success'
    : decision.action === 'reject' ? 'error'
    : decision.action === 'more_info' ? 'warning'
    : 'success')  // 'escalate' defaults back to brand/success neutral
  : recommendation?.tone

// Special-case escalate so it uses brand-60 not success green:
const toneClass =
  decision?.action === 'escalate'
    ? 'card_brand'
    : (TONE_CLASS[activeTone] ?? null)
```

(Escalate keeps brand-60 via a dedicated modifier we'll add to SCSS.) Update `TONE_CLASS` to include the brand class or add a fall-through handler; the simplest is a separate branch above, as shown.

- [ ] **Step 7.3: Render the committed success banner + notes.**

Replace the `{!decision && ( /* action region */ )}` block with a conditional pair:

```jsx
{!decision ? (
  <div className={styles.actionRegion}>
    {/* … existing pending + action bar … */}
  </div>
) : (
  <div className={styles.committed}>
    <div className={styles.banner}>
      <span className={cx(styles.bannerChip, styles[`bannerChip_${decision.action}`])}>
        <CircleCheck size={14} strokeWidth={2} />
        <span>{VERDICT_LABEL_DONE[decision.action]}</span>
      </span>
      <span className={styles.bannerMeta}>
        Decided at {formatClockTime(decision.at)} · Confidence {Math.round((recommendation?.confidence ?? 0) * 100)}%
      </span>
    </div>
    {decision.notes && (
      <blockquote className={styles.notesEcho}>{decision.notes}</blockquote>
    )}
  </div>
)}
```

Add the time helper near the top of the file (below the other helpers):

```jsx
function formatClockTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
```

Update the evidence mapping to pass `committed`:

```jsx
<EvidencePanel
  key={item.id}
  item={item}
  open={openPanelId === item.id}
  committed={!!decision}
  onToggle={togglePanel}
/>
```

- [ ] **Step 7.4: Style the banner + brand tone + notes echo.**

Append to `approval.module.scss`:

```scss
/* ── Committed state ──────────────────────────────────────────── */

.card_brand { --tone-color: var(--brand-60); }

.committed {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  margin-top: auto;

  animation: apvBannerIn 280ms cubic-bezier(0.18, 0.9, 0.28, 1.4) both;
}

.banner {
  display: flex;
  align-items: center;
  gap: var(--space-125);
  flex-wrap: wrap;
}

.bannerChip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-050);
  padding: var(--space-050) var(--space-100);
  border-radius: var(--radius-500);
  background: color-mix(in srgb, var(--tone-color) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--tone-color) 24%, transparent);
  color: var(--tone-color);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
}

/* The banner chip respects the committed tone; per-action modifiers
   keep the semantics readable even if tone-color shifts in future. */
.bannerChip_approve   { }  /* success — same as --tone-color on success card */
.bannerChip_reject    { }
.bannerChip_more_info { }
.bannerChip_escalate  { }

.bannerMeta {
  font-size: var(--font-size-200);
  color: var(--grey-60);
  font-variant-numeric: tabular-nums;
}

.notesEcho {
  margin: 0;
  padding: var(--space-025) 0 var(--space-025) var(--space-125);
  border-left: var(--border-width-300) solid var(--grey-30);
  font-size: var(--font-size-100);
  font-style: italic;
  color: var(--grey-50);
  line-height: var(--line-height-300);
}

@keyframes apvBannerIn {
  from { opacity: 0; transform: translateY(var(--size-06)); }
  to   { opacity: var(--opacity-100); transform: translateY(0); }
}
```

- [ ] **Step 7.5: Verify.**

Run: `npm run dev`.
- Approve path: tap **Approve** → action bar replaced by a green "APPROVED" chip + "Decided at HH:MM · Confidence 87%" line. Arc re-colours to green (if not already) and sweeps to 100%. Evidence panels stay clickable; chevrons desaturate to `grey-50`.
- Reject + notes path: tap Reject, type "Please resubmit with aisle 4 cleared", Confirm. → Card tone shifts to red. Banner chip "REJECTED". Notes echo appears below as a `grey-30` bar + italic `grey-50` body.
- More info path: banner yellow, notes echo if entered.
- Escalate path: banner brand-60, notes echo if entered.

- [ ] **Step 7.6: Commit.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss
git commit -m "feat(widget): Approval — committed state banner + arc morph"
```

---

## Task 8: Keyboard shortcuts + focus management

Single-key shortcuts (`A` / `R` / `M` / `E` and `1`–`9`) bind when the card is focused. kbd chips render inside each action button on hover-capable devices.

**Files:**
- Modify: `src/widgets/Approval.jsx`
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 8.1: Add the key handler.**

Extend the React import to include `useRef`:

```jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
```

Then inside `Approval`, below the callbacks:

```jsx
const rootRef = useRef(null)

useEffect(() => {
  if (decision) return
  const node = rootRef.current
  if (!node) return
  node.focus({ preventScroll: true })
}, [decision])

useEffect(() => {
  if (decision) return
  function onKey(e) {
    // ignore if focus is inside a textarea (pending notes)
    if (e.target?.tagName === 'TEXTAREA') {
      if (e.key === 'Enter' && !e.shiftKey && pending) {
        e.preventDefault()
        confirmPending()
      }
      if (e.key === 'Escape' && pending) {
        e.preventDefault()
        cancelPending()
      }
      return
    }
    const key = e.key.toLowerCase()
    if (key === 'a' && actions.includes('approve'))   { e.preventDefault(); handleClick('approve')   }
    if (key === 'r' && actions.includes('reject'))    { e.preventDefault(); handleClick('reject')    }
    if (key === 'm' && actions.includes('more_info')) { e.preventDefault(); handleClick('more_info') }
    if (key === 'e' && actions.includes('escalate'))  { e.preventDefault(); handleClick('escalate')  }
    if (/^[1-9]$/.test(e.key)) {
      const idx = Number(e.key) - 1
      const item = evidence[idx]
      if (item) { e.preventDefault(); togglePanel(item.id) }
    }
  }
  const node = rootRef.current
  if (!node) return
  node.addEventListener('keydown', onKey)
  return () => node.removeEventListener('keydown', onKey)
}, [decision, pending, actions, evidence, handleClick, togglePanel, confirmPending, cancelPending])
```

Pass the ref to the root element and make it focusable:

```jsx
<div
  ref={rootRef}
  tabIndex={-1}
  className={cx(styles.card, toneClass && styles[toneClass])}
>
```

- [ ] **Step 8.2: Add kbd-chip hints inside each action button.**

Update the action button render to include a `<kbd>`:

```jsx
const SHORTCUT_KEY = {
  approve: 'A', reject: 'R', more_info: 'M', escalate: 'E',
}

// inside visibleActions.map(…):
<Button … >
  <Icon size={16} strokeWidth={2} />
  <span>{meta.label}</span>
  <span className={styles.kbd} aria-hidden>{SHORTCUT_KEY[action]}</span>
</Button>
```

- [ ] **Step 8.3: Style the kbd chip + outline-on-focus behaviour.**

Append:

```scss
.card:focus-visible {
  outline: var(--border-width-200) solid var(--brand-60);
  outline-offset: var(--size-02);
}

.kbd {
  margin-left: var(--space-075);
  padding: 0 var(--space-050);
  min-width: var(--size-16);
  height: var(--size-16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-100);
  background: color-mix(in srgb, var(--grey-90) 6%, var(--white));
  border: var(--border-width-100) solid var(--grey-10);
  color: var(--grey-60);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}

/* Hide on touch-only devices — shortcuts only make sense with a keyboard */
@media (hover: none) or (pointer: coarse) {
  .kbd { display: none; }
}
```

- [ ] **Step 8.4: Verify.**

Run: `npm run dev`. Type `approval`. The card is focused on mount (tabIndex -1 + autofocus via effect). Press:
- `A` → immediate approve commit.
- Trigger a fresh card (retype `approval`). Press `R` → pending-confirm region slides in, textarea autofocuses. Press `Esc` → cancels. Press `R` again, type a note, press `Enter` → commits reject.
- Press `1` / `2` / `3` → evidence panels 1 / 2 / 3 toggle (single-open rules still apply). Press `9` on the `bgv` variant (only 3 panels) → no-op.
- kbd chips (`A` / `R` / `M` / `E`) render inside buttons on desktop; hidden on mobile (resize viewport to <1000px with touch-simulation to check).

- [ ] **Step 8.5: Commit.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss
git commit -m "feat(widget): Approval — keyboard shortcuts + focus management"
```

---

## Task 9: Entry stagger, anti-pattern audit, verify §0.1

Add the §11 staggered entry for evidence panels, re-check all §18 anti-patterns, run the §0.1 hardcoded-value grep.

**Files:**
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 9.1: Stagger the evidence panels.**

Append to `approval.module.scss`:

```scss
.evPanel {
  animation: apvRiseUp 320ms cubic-bezier(0.18, 0.9, 0.28, 1.04) both;
}

.evPanel:nth-child(1) { animation-delay:  60ms; }
.evPanel:nth-child(2) { animation-delay: 120ms; }
.evPanel:nth-child(3) { animation-delay: 180ms; }
.evPanel:nth-child(4) { animation-delay: 240ms; }
.evPanel:nth-child(5) { animation-delay: 300ms; }
.evPanel:nth-child(6) { animation-delay: 360ms; }
.evPanel:nth-child(7) { animation-delay: 420ms; }
.evPanel:nth-child(8) { animation-delay: 480ms; }
```

- [ ] **Step 9.2: Run the §0.1 hardcoded-value grep.**

```bash
grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/approval.module.scss
```

**Expected:** matches only inside `cubic-bezier(…)` arguments, the `min-height: 24rem` line, and media-query breakpoints. No raw hex, no plain px except inside those whitelisted contexts.

If any line matches outside the exceptions, swap for tokens per the §0.1 substitution table.

- [ ] **Step 9.3: Walk the §18 anti-pattern checklist.**

Re-open `docs/widget-conventions.md` §18 and confirm against `src/widgets/Approval.jsx` + `approval.module.scss`:

- [ ] #1 `box-shadow` only on hover, not at rest.
- [ ] #2 no `max-width` on the card.
- [ ] #3 symmetric `var(--space-200)` padding.
- [ ] #4 no `border-bottom` on the header.
- [ ] #5 title at `font-size-400`, not 500 / 700.
- [ ] #6 every button has a Lucide glyph + a verb label — no icon-only.
- [ ] #7 no raw hex anywhere.
- [ ] #8 `--color-action-primary: var(--brand-60)` override on the card root.
- [ ] #9 `width: 100%` on the card; no width hack.
- [ ] #10 evidence "score" uses §6 linear-fill — no new progress primitive.
- [ ] #11 banner follows §10 — no confetti, no "Great job!".
- [ ] #12 stagger caps at 8 children.
- [ ] #13 every value is a token (verified by Step 9.2).
- [ ] #14 Lucide only — kbd chip is a styled `<span>`, not an icon.
- [ ] #15 no `transition: all`; every transition lists properties.
- [ ] #16 only the three §16 curves used (`0.2, 0.8, 0.3, 1`, `0.18, 0.9, 0.28, 1.04`, `0.18, 0.9, 0.28, 1.4`).
- [ ] #17 Pass 2 hasn't been skipped — it follows in Task 10.

Fix anything that fails before moving on.

- [ ] **Step 9.4: Verify all four variants still render cleanly.**

Run: `npm run dev`. Exercise each variant end-to-end (Studio palette → all four tiles) and each decision path (Approve / Reject+notes / More info / Escalate). Check browser console — no warnings, no errors.

- [ ] **Step 9.5: Commit Pass 1.**

```bash
git add src/widgets/approval.module.scss
git commit -m "feat(widget): Approval — Pass 1 complete (stagger + audit pass)"
```

---

## Task 10: Pass 2 — elevate with `/frontend-design`

Per widget-conventions.md §0: Pass 2 pushes the signature moment further without breaking the doc. For Approval, the signature moment is the confidence arc. Candidate elevations:

- Arc entry choreography: track circle fades in first, fill arc draws second, verdict label fades in third (staggered micro-timeline).
- Arc-to-banner morph on commit — the arc completes to 100% and the fill colour eases through grey to the decision tone, rather than swapping abruptly.
- Verdict label treatment: subtle glyph (Check / X / AlertTriangle / Flag) next to the verdict word, matching the tone system.
- Banner entry — the §10 chip counter-animates in from the left while the action bar fades out from the right, so the transition feels like one motion.

Pass 2 does **not** introduce a second new primitive. If `/frontend-design` proposes one, discard that proposal.

**Files:**
- Modify: `src/widgets/Approval.jsx`
- Modify: `src/widgets/approval.module.scss`

- [ ] **Step 10.1: Invoke the frontend-design skill on the existing widget.**

In the same session (or a fresh one with the spec + widget file path attached), invoke the `frontend-design` skill with this brief:

> "Pass 2 elevation for the Approval widget at `src/widgets/Approval.jsx` + `src/widgets/approval.module.scss`. Signature moment is the confidence arc in the §2 header. Scope the elevation to: arc entry choreography, arc→banner morph on commit, verdict label glyph, and banner counter-entry against action-bar exit. Do **not** add a second new primitive. Do **not** touch §1 shell, §3 width, §12 type, §13 color, or §16 curves — the rule book in `docs/widget-conventions.md` wins in any conflict."

- [ ] **Step 10.2: Re-run the §0.1 grep after Pass 2.**

```bash
grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/approval.module.scss
```

Still zero matches outside the whitelisted contexts.

- [ ] **Step 10.3: Re-walk §18 anti-patterns.**

Same checklist as Task 9 Step 9.3. Pass 2 is prone to regressions around #13 (raw values), #15 (`transition: all`), and #16 (a fourth curve sneaking in). Verify each.

- [ ] **Step 10.4: Verify visually — all four variants, all decision paths.**

Run: `npm run dev`. Exercise end-to-end as in Step 9.4. Additionally confirm:
- Arc entry is now choreographed (track first, fill draws, label settles).
- On commit, the arc morphs into the decided tone without a colour snap.
- Verdict label has its tone-matching glyph.
- Banner replacement reads as a single continuous motion, not a hard swap.

- [ ] **Step 10.5: Commit Pass 2.**

```bash
git add src/widgets/Approval.jsx src/widgets/approval.module.scss
git commit -m "style(widget): Approval — Pass 2 polish (arc choreography + commit morph)"
```

---

## Task 11: Update the widget plan + close out

**Files:**
- Modify: `docs/Widget plan.md` (move Approval from "Pending" to "Done")

- [ ] **Step 11.1: Move `#23 Approval` from the Pending table to the Done — P1 table in `docs/Widget plan.md`.**

The pending P1 table drops the row; the Done P1 table gains:

```md
| 23 | Approval | `Approval.jsx` | Admin card — tiered decision (approve 1-tap, destructive 2-step with inline notes); confidence arc is the signature moment |
```

Update the status line: "20 of 30 CSV widgets built", "Pending: 10 — 2 P1 + 8 P2", "Last shipped: Approval (#23)".

- [ ] **Step 11.2: Commit the plan update.**

```bash
git add "docs/Widget plan.md"
git commit -m "docs(plan): Approval widget shipped — 20 of 30 CSV widgets built"
```

---

## Self-review notes

**Spec coverage:** Every section of the spec maps to at least one task.

- Payload schema → Task 1 (buildApprovalPayload).
- Per-variant table (icons, evidence kinds) → Task 1 payload + Task 2 VARIANT_ICONS + Task 5 body renderers.
- Layout (header with arc, pull-quote, accordion, action bar) → Tasks 2–6.
- States (idle / pending / committed) → Tasks 5–7.
- Interactions (single-open logic, focus, keyboard) → Tasks 5 + 8.
- Motion (curves, stagger, arc sweep, banner replace) → Tasks 3 + 5 + 7 + 9.
- §17 registration (five touchpoints) → Tasks 1 + 2.
- Anti-pattern guardrails → Task 9 + 10 (both passes).
- Scope guard (arc is the only new primitive) → Task 10 (Pass 2 brief explicitly enforces).
- Out of scope (no real backend, no multi-reviewer, etc.) → respected; not implemented.

**Type consistency:** Function names referenced across tasks are consistent — `ConfidenceArc`, `EvidencePanel`, `EvidenceBody{Document,Score,Transcript,Criteria,Compensation}`, `handleClick`, `commit`, `confirmPending`, `cancelPending`, `togglePanel`, `formatClockTime`, `buildApprovalPayload`. `VERDICT_LABEL_DONE` is defined in Task 3 and reused in Task 7.

**Placeholder check:** No TBDs. Every code step shows real code. Every verification step has a concrete command + expected outcome.

**Scope:** One widget, single implementation plan. In scope for one focused session.
