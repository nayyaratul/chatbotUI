# Widget Injector Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Studio Injector's single dropdown with a grouped chip palette (widget → variant → payload → inject as bot/user), and make `widgetSchemas.js` the single source of truth for all example payloads — eliminating the drift between `widgetSchemas.js` and inline payloads in `mockBot.js`.

**Architecture:** Variants become first-class data in `widgetSchemas.js` as `variants: [{ id, label, payload: () => ({...}) }]`. `payload` is a function so `makeId()` mints fresh ids on every invocation. A tiny `getVariantPayload(type, variantId)` helper is the one-line interface both the Injector (indirectly via state) and `mockBot.js` rules call. The Injector splits into four files: orchestrator + three prop-driven sub-components (palette, variant row, payload editor), mirroring the existing `BrandPicker` pattern in `src/studio/`.

**Tech Stack:** React 18 (JSX), SCSS modules, Nexus atoms (`Button`, `Textarea`), `classnames`. No new dependencies.

**Verification:** Manual. No test framework in this sandbox. Each task ends with a concrete visual check at the running dev server (`npm run dev`) and a commit.

**Working directory:** `/Users/atulnayyar/Projects/Chatbot UI`.

**Reference:**
- Spec: `docs/superpowers/specs/2026-04-24-injector-redesign-design.md`
- Current Injector: `src/studio/Injector.jsx`
- Existing chip pattern to follow: `src/studio/BrandPicker.jsx`

---

## File Structure

**New files:**
- `src/engine/ids.js` — re-homed `makeId` so both `widgetSchemas.js` and `mockBot.js` can import it without a circular dependency.
- `src/studio/WidgetPalette.jsx` + `widgetPalette.module.scss` — grouped radiogroup of widget chips.
- `src/studio/VariantRow.jsx` + `variantRow.module.scss` — radiogroup of variant chips; renders `null` when only one variant exists.
- `src/studio/PayloadEditor.jsx` + `payloadEditor.module.scss` — labelled JSON textarea + inline error slot.

**Modified files:**
- `src/engine/widgetSchemas.js` — full migration to `{ label, category, variants }` shape; adds `getVariantPayload`; absorbs `richJobs()` from `mockBot.js`.
- `src/engine/mockBot.js` — imports `makeId` from `ids.js`, imports `getVariantPayload` from `widgetSchemas.js`, all rule bodies become one-liners, `_UNUSED_OLD_JOBS` block is removed, three new rules added.
- `src/studio/Injector.jsx` — full rewrite as orchestrator.
- `src/studio/injector.module.scss` — shell layout only (palette/variant/payload styles live in their own modules).

**Unchanged:**
- `src/studio/StudioPanel.jsx` — still renders `<Injector bot={bot} />`.
- `src/chat/registry.js` — unchanged.
- Widget components under `src/widgets/` — unchanged.

---

## Task 1: Extract `makeId` to `src/engine/ids.js`

`makeId` currently lives in `mockBot.js`. After this refactor `widgetSchemas.js` needs it too, but `mockBot.js` also needs `getVariantPayload` from `widgetSchemas.js` — a circular import. Moving `makeId` to a tiny leaf module resolves it.

**Files:**
- Create: `src/engine/ids.js`
- Modify: `src/engine/mockBot.js` (lines 1 and 42-45)

- [ ] **Step 1: Create `src/engine/ids.js`**

```js
import { v4 as uuid } from 'uuid'

export function makeId(prefix = 'w') {
  return `${prefix}-${uuid().slice(0, 8)}`
}
```

- [ ] **Step 2: Update `src/engine/mockBot.js` imports**

Open `src/engine/mockBot.js`. At the top of the file, replace:

```js
import { v4 as uuid } from 'uuid'
```

with:

```js
import { makeId } from './ids.js'
```

- [ ] **Step 3: Remove the inline `makeId` definition from `mockBot.js`**

Delete lines 42-45 (the `// Helper used by widget rule factories...` comment plus the `export function makeId(...)` definition). The comment `/* ─── Shared rich job payloads ───` immediately after it stays.

- [ ] **Step 4: Verify the app still runs**

Run: `npm run dev`

In the browser, type `show confirm` in the chat input and press Enter. Expected: a Confirmation Card renders with a fresh widget_id. Type `otp`. Expected: a Validated Input OTP widget renders. This confirms `makeId` still works through the new import path.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ids.js src/engine/mockBot.js
git commit -m "refactor(engine): extract makeId to src/engine/ids.js"
```

---

## Task 2: Create `WidgetPalette.jsx`

Pure presentational component — renders grouped chips from props, no state, no dependency on `widgetSchemas`.

**Files:**
- Create: `src/studio/WidgetPalette.jsx`
- Create: `src/studio/widgetPalette.module.scss`

- [ ] **Step 1: Create `src/studio/WidgetPalette.jsx`**

```jsx
import cx from 'classnames'
import styles from './widgetPalette.module.scss'

/**
 * Grouped radiogroup of widget-type chips. Pure component — parent
 * owns selection state and passes it in as `selected`.
 *
 * `groups` shape:
 *   [{ category: 'action', label: 'Action & Interaction',
 *      widgets: [{ type: 'quick_reply', label: 'Quick Reply Buttons' }, ...] }]
 */
export function WidgetPalette({ groups, selected, onSelect }) {
  return (
    <div className={styles.palette}>
      {groups.map((group) => (
        <section key={group.category} className={styles.group}>
          <h3 className={styles.groupLabel}>{group.label}</h3>
          <div
            role="radiogroup"
            aria-label={`${group.label} widgets`}
            className={styles.row}
          >
            {group.widgets.map((w) => {
              const active = w.type === selected
              return (
                <button
                  key={w.type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cx(styles.chip, active && styles.active)}
                  onClick={() => onSelect(w.type)}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/studio/widgetPalette.module.scss`**

```scss
.palette {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.groupLabel {
  font-family: var(--sans);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--grey-50);
  margin: 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chip {
  font-family: var(--sans);
  font-size: 12px;
  line-height: 1.3;
  padding: var(--space-2) var(--space-3);
  min-height: 28px;
  border: 1px solid var(--grey-20);
  border-radius: var(--radius-sm);
  background: var(--grey-05);
  color: var(--grey-80);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  white-space: normal;
  text-align: left;
}

.chip:hover {
  background: var(--grey-10);
}

.chip:focus-visible {
  outline: 2px solid var(--brand-400);
  outline-offset: 2px;
}

.chip.active {
  background: var(--brand-600);
  color: #fff;
  border-color: transparent;
}

.chip.active:hover {
  background: var(--brand-600);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run dev`

There should be no errors in the terminal or browser console. The component isn't rendered yet (still unused); this step only checks the module builds.

- [ ] **Step 4: Commit**

```bash
git add src/studio/WidgetPalette.jsx src/studio/widgetPalette.module.scss
git commit -m "feat(studio): add WidgetPalette component"
```

---

## Task 3: Create `VariantRow.jsx`

Same chip visual as the palette but flat (no group labels). Returns `null` when the widget has only one variant — fewer chrome, fewer clicks.

**Files:**
- Create: `src/studio/VariantRow.jsx`
- Create: `src/studio/variantRow.module.scss`

- [ ] **Step 1: Create `src/studio/VariantRow.jsx`**

```jsx
import cx from 'classnames'
import styles from './variantRow.module.scss'

/**
 * Flat radiogroup of variant chips. Returns null when there is
 * nothing meaningful to pick (0 or 1 variant).
 *
 * `variants` shape: [{ id: string, label: string }]
 */
export function VariantRow({ variants, selected, onSelect }) {
  if (!variants || variants.length < 2) return null

  return (
    <div
      role="radiogroup"
      aria-label="Variant"
      className={styles.row}
    >
      {variants.map((v) => {
        const active = v.id === selected
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={cx(styles.chip, active && styles.active)}
            onClick={() => onSelect(v.id)}
          >
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/studio/variantRow.module.scss`**

Identical chip rules as `widgetPalette.module.scss` — duplicated intentionally so each component is self-contained (per spec §6.3).

```scss
.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.chip {
  font-family: var(--sans);
  font-size: 12px;
  line-height: 1.3;
  padding: var(--space-2) var(--space-3);
  min-height: 28px;
  border: 1px solid var(--grey-20);
  border-radius: var(--radius-sm);
  background: var(--grey-05);
  color: var(--grey-80);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  white-space: normal;
  text-align: left;
}

.chip:hover {
  background: var(--grey-10);
}

.chip:focus-visible {
  outline: 2px solid var(--brand-400);
  outline-offset: 2px;
}

.chip.active {
  background: var(--brand-600);
  color: #fff;
  border-color: transparent;
}

.chip.active:hover {
  background: var(--brand-600);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run dev`. No errors expected.

- [ ] **Step 4: Commit**

```bash
git add src/studio/VariantRow.jsx src/studio/variantRow.module.scss
git commit -m "feat(studio): add VariantRow component"
```

---

## Task 4: Create `PayloadEditor.jsx`

Wraps the Nexus `Textarea` with a label and an inline error slot. Thin component — its value is encapsulation, not logic.

**Files:**
- Create: `src/studio/PayloadEditor.jsx`
- Create: `src/studio/payloadEditor.module.scss`

- [ ] **Step 1: Create `src/studio/PayloadEditor.jsx`**

```jsx
import { Textarea } from '@nexus/atoms'
import styles from './payloadEditor.module.scss'

/**
 * Labelled JSON editor for widget payloads. Inline red error slot
 * below the textarea uses role="alert" so screen readers announce
 * parse failures.
 */
export function PayloadEditor({ value, error, onChange }) {
  return (
    <div className={styles.editor}>
      <div className={styles.label}>Payload (JSON)</div>
      <Textarea
        className={styles.textarea}
        rows={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? (
        <div role="alert" className={styles.error}>
          Invalid JSON: {error}
        </div>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/studio/payloadEditor.module.scss`**

```scss
.editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label {
  font-family: var(--sans);
  font-size: 12px;
  color: var(--grey-60);
}

.textarea {
  font-family: var(--sans);
  font-size: 11px;
}

.error {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--red-60, #d04a3a);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run dev`. No errors expected.

- [ ] **Step 4: Commit**

```bash
git add src/studio/PayloadEditor.jsx src/studio/payloadEditor.module.scss
git commit -m "feat(studio): add PayloadEditor component"
```

---

## Task 5: Migrate `widgetSchemas.js` to the new shape

The big one. Every widget entry changes from `{ label, examplePayload }` to `{ label, category, variants: [{ id, label, payload: () => ({...}) }] }`. `richJobs()` moves in from `mockBot.js`. Three brand-new variants are authored fresh (`qc_evidence_review#worker`, `instruction_card#warn`, `instruction_card#success`). `getVariantPayload` is exported.

**This task breaks `Injector.jsx` until Task 6.** Text triggers in `mockBot.js` continue to work because they still use their inline payloads; nothing there depends on `widgetSchemas.js` yet. The breakage is limited to the Injector UI.

**Files:**
- Modify: `src/engine/widgetSchemas.js` (full rewrite)
- Modify: `src/engine/mockBot.js` (delete the `richJobs` export — see step 8)

- [ ] **Step 1: Add imports at the top of `widgetSchemas.js`**

Replace the existing header comment with:

```js
import { makeId } from './ids.js'

/**
 * Single source of truth for widget example payloads.
 *
 * Each entry: { label, category, variants: [{ id, label, payload: () => object }] }
 *   - `category` drives grouping in the Studio Injector palette.
 *   - `payload` is a FUNCTION so makeId() mints fresh ids on every call.
 *
 * Consumed by:
 *   - src/studio/Injector.jsx (picker + payload preview)
 *   - src/engine/mockBot.js   (rule payloads, via getVariantPayload)
 */
```

- [ ] **Step 2: Add the `richJobs()` function inside `widgetSchemas.js`**

Just below the imports/comment, paste the full `richJobs()` function from `mockBot.js` (currently at `src/engine/mockBot.js` lines 52-211). It's ~160 lines defining three job objects. Keep it verbatim — it already calls `makeId()`, which now comes from the top-of-file import.

```js
/* ─── Shared rich job payloads ────────────────────────────────────
   Used by both the JobCard-internal carousel (`job_card` carousel
   variant) and the generic Carousel of job_cards (`carousel` job-picks
   variant). Function (not const) so makeId() mints fresh ids per
   invocation. */
function richJobs() {
  return [
    // … copy the full array body from mockBot.js lines 53-210 verbatim …
  ]
}
```

- [ ] **Step 3: Replace the `widgetSchemas` export with the new shape**

This is the bulk of the task. Each of the 20 entries follows the same pattern. The mechanical recipe per widget is:

1. Add `category: '<one of: action | input | display | advanced | engine>'`.
2. Replace `examplePayload: { ... }` with `variants: [ { id, label, payload: () => ({ ... }) } ]`.
3. For each variant, copy the payload body from the matching `build()` in `mockBot.js`, wrap it in `() => ({ ... })`, and keep the `makeId(...)` calls (they now use the top-level `makeId` import).

**Category assignments:**

| Category | Widgets |
|---|---|
| `engine` | `text`, `widget_response` |
| `action` | `quick_reply`, `confirmation`, `checklist`, `shift_calendar` |
| `input` | `mcq`, `form`, `rating`, `validated_input`, `image_capture`, `file_upload` |
| `display` | `progress`, `score_card`, `job_card`, `carousel`, `document_preview`, `instruction_card` |
| `advanced` | `qc_evidence_review`, `evidence_review` |

**Variant sources (copy the payload body from these line ranges of `mockBot.js`):**

| Widget | Variants (id / label → source) |
|---|---|
| `text` | `default` / `Default` → `{ text: 'Hello from the injector.' }` (inline) |
| `widget_response` | `default` / `Default` → keep the existing `examplePayload` from `widgetSchemas.js:37-44` |
| `quick_reply` | `default` / `Default` → `mockBot.js:215-226` |
| `confirmation` | `info` / `Info` → `mockBot.js:282-297`; `caution` / `Caution` → `mockBot.js:236-255`; `danger` / `Danger` → `mockBot.js:260-277` |
| `mcq` | `scored` / `Scored (single)` → `mockBot.js:355-373`; `multi` / `Multi-select` → `mockBot.js:379-395`; `silent` / `Silent (submit required)` → `mockBot.js:333-349` |
| `form` | `basic` / `Basic registration` → `mockBot.js:402-455`; `kyc` / `KYC onboarding` → `mockBot.js:462-540` |
| `job_card` | `single` / `Single card` → `mockBot.js:1166-1247`; `carousel` / `Carousel` → `mockBot.js:1258-1264` |
| `image_capture` | `document` / `Document` → `mockBot.js:1091-1109`; `selfie` / `Selfie` → `mockBot.js:1117-1134`; `evidence` / `Evidence` → `mockBot.js:1142-1158` |
| `file_upload` | `default` / `Default` → `mockBot.js:1066-1083` |
| `document_preview` | `default` / `Default` → `mockBot.js:1036-1056` |
| `evidence_review` | `default` / `Default` → `mockBot.js:1011-1025` |
| `qc_evidence_review` | `admin` / `Admin` → `mockBot.js:978-1002`; `worker` → see step 4 |
| `checklist` | `interactive` / `Interactive` → `mockBot.js:954-970`; `read_only` / `Read-only` → `mockBot.js:928-946` |
| `instruction_card` | `info` / `Info` → `mockBot.js:902-918`; `warn` / `Warn` → see step 4; `success` / `Success` → see step 4 |
| `rating` | `stars` / `Stars` → `mockBot.js:819-834`; `thumbs` / `Thumbs` → `mockBot.js:842-853`; `emoji` / `Emoji` → `mockBot.js:860-874`; `nps` / `NPS` → `mockBot.js:882-894` |
| `validated_input` | `otp` / `OTP` → `mockBot.js:675-687`; `pan` / `PAN` → `mockBot.js:694-708`; `pincode` / `Pincode` → `mockBot.js:716-728`; `phone` / `Phone` → `mockBot.js:736-749`; `email` / `Email` → `mockBot.js:757-769`; `aadhaar` / `Aadhaar` → `mockBot.js:778-790`; `bank_account` / `Bank account` → `mockBot.js:799-811` |
| `carousel` | `job_picks` / `Job picks` → `mockBot.js:599-612`; `tips` / `Onboarding tips` → `mockBot.js:620-667` |
| `shift_calendar` | `default` / `Default` → `mockBot.js:549-588` |
| `progress` | `default` / `Default` → `mockBot.js:1449-1461` |
| `score_card` | `default` / `Default` → `mockBot.js:303-325` |

Concrete example — the final shape for `confirmation`:

```js
confirmation: {
  label: 'Confirmation Card',
  category: 'action',
  variants: [
    {
      id: 'info',
      label: 'Info',
      payload: () => ({
        widget_id: makeId('confirm'),
        action_id: makeId('action'),
        tone: 'info',
        title: 'Confirm your choice',
        description: 'Are you sure you want to continue with the demo?',
        details: [
          { label: 'Action', value: 'Demo confirmation' },
          { label: 'When',   value: 'Immediately' },
        ],
        confirm_label: 'Yes, continue',
        cancel_label: 'Go back',
      }),
    },
    {
      id: 'caution',
      label: 'Caution',
      payload: () => ({
        widget_id: makeId('confirm'),
        action_id: makeId('action'),
        tone: 'caution',
        title: 'Confirm your application',
        description: 'Your profile will be shared with the employer.',
        details: [
          { label: 'Role',       value: 'Delivery Associate' },
          { label: 'Location',   value: 'Koramangala, Bangalore' },
          { label: 'Pay',        value: '₹850/day' },
          { label: 'Start date', value: '2026-05-01' },
        ],
        confirm_label: 'Submit application',
        cancel_label: 'Go back',
        require_checkbox: true,
        checkbox_label: 'I understand this submission is final.',
      }),
    },
    {
      id: 'danger',
      label: 'Danger',
      payload: () => ({
        widget_id: makeId('confirm'),
        action_id: makeId('action'),
        tone: 'danger',
        title: 'Delete your account',
        description: 'Your profile and all associated data will be permanently removed. This cannot be reversed.',
        details: [
          { label: 'Affects',  value: 'Your entire profile' },
          { label: 'Recovery', value: 'Not possible after 24h' },
        ],
        confirm_label: 'Delete permanently',
        cancel_label: 'Keep my account',
        require_checkbox: true,
        checkbox_label: 'I understand this cannot be undone.',
      }),
    },
  ],
},
```

Apply the same pattern for every other widget. Keep the order of widgets in the file as listed above so categories read sensibly top-to-bottom.

- [ ] **Step 4: Author the three NEW variants that don't exist in `mockBot.js`**

Add these three variant payload functions inside the appropriate `widgetSchemas` entries.

**`qc_evidence_review#worker`** (goes alongside the existing `admin` variant in the same `variants` array):

```js
{
  id: 'worker',
  label: 'Worker',
  payload: () => ({
    widget_id: makeId('qcev'),
    submission_id: 'sub-okaygo-782',
    title: 'Shelf arrangement — 3rd aisle',
    description: 'Task #782 · Submitted 12 min ago',
    image_url: '',
    overall_verdict: 'borderline',
    confidence: 0.78,
    mode: 'worker',
    annotations: [
      { region: { x: 0.08, y: 0.12, w: 0.38, h: 0.60 }, label: 'Top shelf',  verdict: 'pass' },
      { region: { x: 0.50, y: 0.20, w: 0.30, h: 0.45 }, label: 'Signage',    verdict: 'partial' },
      { region: { x: 0.10, y: 0.74, w: 0.78, h: 0.20 }, label: 'Bottom row', verdict: 'fail' },
    ],
    criteria: [
      { name: 'Location match',    verdict: 'pass',    reasoning: 'GPS fix within 12 m of the assigned outlet.' },
      { name: 'Shelf arrangement', verdict: 'fail',    reasoning: 'Bottom row products not aligned to the planogram. Re-stack with continuous facing and re-submit.' },
      { name: 'Product visibility', verdict: 'pass',   reasoning: 'All tracked SKUs visible in the top shelf region with labels facing outward.' },
      { name: 'Signage',           verdict: 'partial', reasoning: 'Rotate the promotion tag to face the aisle so shoppers can read it.' },
    ],
    silent: false,
  }),
},
```

**`instruction_card#warn`** (alongside `info`):

```js
{
  id: 'warn',
  label: 'Warn',
  payload: () => ({
    widget_id: makeId('instr'),
    instruction_id: 'helmet-safety-warn',
    title: 'Wear your helmet on every trip',
    description: 'Required on every shift — accident insurance depends on it.',
    tone: 'warn',
    require_acknowledgement: true,
    acknowledge_label: 'Got it',
    steps: [
      { step_id: 'strap',    label: 'Clip and tighten the strap',        description: 'A loose strap gives no protection in a fall.' },
      { step_id: 'fit',      label: 'Check the fit',                     description: 'Two fingers between strap and chin. No gap at the back.' },
      { step_id: 'visor',    label: 'Lower the visor before you start',  description: 'Protects your eyes from dust and insects at speed.' },
    ],
    silent: false,
  }),
},
```

**`instruction_card#success`** (alongside `info` and `warn`):

```js
{
  id: 'success',
  label: 'Success',
  payload: () => ({
    widget_id: makeId('instr'),
    instruction_id: 'first-payout-success',
    title: 'You\'re all set for your first payout',
    description: 'Here is what happens next so you know when to expect the money.',
    tone: 'success',
    require_acknowledgement: false,
    steps: [
      { step_id: 'cutoff', label: 'Weekly cut-off is Sunday 11:59 pm', description: 'Anything delivered before then counts toward this week.' },
      { step_id: 'review', label: 'Review on Monday morning',          description: 'The hub verifies rider logs and applies incentives.' },
      { step_id: 'payout', label: 'Payout lands by Tuesday 6 pm',      description: 'Directly to the bank account you added during onboarding.' },
    ],
    silent: false,
  }),
},
```

- [ ] **Step 5: Update the `job_card` and `carousel` variants to invoke `richJobs()`**

The existing `mockBot.js` rules at lines 596-613 (carousel of job_cards) and 1256-1264 (job_card carousel) both call `richJobs()`. In `widgetSchemas.js`, those two variants' `payload` functions should now invoke the locally-defined `richJobs()` — the same helper moved in Step 2.

Example for `job_card#carousel`:

```js
{
  id: 'carousel',
  label: 'Carousel',
  payload: () => ({
    widget_id: makeId('jc'),
    silent: false,
    items: richJobs(),
  }),
},
```

Example for `carousel#job_picks`:

```js
{
  id: 'job_picks',
  label: 'Job picks',
  payload: () => ({
    widget_id: makeId('carousel'),
    carousel_id: 'matched-jobs',
    title: 'Jobs matched for you',
    description: 'Swipe to compare — tap Apply on any card to proceed.',
    tone: 'info',
    items: richJobs().map((job) => ({
      type: 'job_card',
      payload: { widget_id: makeId('jc'), ...job },
    })),
    silent: false,
  }),
},
```

- [ ] **Step 6: Add `getVariantPayload` export at the end of `widgetSchemas.js`**

Just after the `widgetSchemas` export closes, add:

```js
/**
 * Look up a variant's payload. Returns an empty object if the type
 * or variantId is unknown — logs a warning so developer errors are
 * visible without crashing the Studio.
 */
export function getVariantPayload(type, variantId) {
  const schema = widgetSchemas[type]
  if (!schema) {
    console.warn(`[widgetSchemas] unknown type: ${type}`)
    return {}
  }
  const variant = schema.variants?.find((v) => v.id === variantId)
  if (!variant) {
    console.warn(`[widgetSchemas] unknown variant for ${type}: ${variantId}`)
    return {}
  }
  return variant.payload()
}
```

- [ ] **Step 7: Remove the `examplePayload` field from every entry**

Each widget's `examplePayload: {...}` is now replaced by `variants: [...]`. Grep the file for `examplePayload` — there should be **zero** matches once Step 3 is complete. If any remain, remove them.

- [ ] **Step 8: Do NOT delete `richJobs()` from `mockBot.js` yet**

`richJobs()` is now defined in both files. That's intentional — the two `mockBot.js` rules that still consume `richJobs()` (`/job picks/` and `/jobs/`) haven't been migrated yet; Task 7 migrates them and then Task 7 also deletes the copy from `mockBot.js`. Leave the `mockBot.js` copy in place for now so text triggers keep working.

- [ ] **Step 9: Verify the app still runs; verify text triggers still work**

Run: `npm run dev`.

- In the browser, type `show confirm`. Expected: a Confirmation Card renders — **this still works** because the rule still has its inline payload (Task 7 is what migrates rules). Same for `otp`, `stars`, `show jobs`, `job picks`, etc.
- The Studio Injector dropdown is **expected to be broken** (no `examplePayload` to read). It may throw or show `{}`. That's fine — Task 6 fixes it.
- Open the browser devtools console. There should be no `[widgetSchemas]` warnings yet.

- [ ] **Step 10: Commit**

```bash
git add src/engine/widgetSchemas.js
git commit -m "refactor(schemas): migrate widgetSchemas to variants shape + add getVariantPayload

Each widget entry now has { label, category, variants: [...] } where
each variant has { id, label, payload: () => object }. Three new
variants added: qc_evidence_review#worker, instruction_card#warn,
instruction_card#success. richJobs() moved in from mockBot.js.
examplePayload removed — Injector rewrite follows in the next commit."
```

---

## Task 6: Rewrite `Injector.jsx` to use the new schema + new components

Replaces the dropdown with the chip palette. The file goes from 81 lines to roughly 100; shell SCSS stays simple since palette/variant/payload styles now live in their own modules.

**Files:**
- Modify: `src/studio/Injector.jsx` (full rewrite)
- Modify: `src/studio/injector.module.scss` (simplify — shell layout only)

- [ ] **Step 1: Rewrite `src/studio/Injector.jsx`**

Replace the entire file contents with:

```jsx
import { useMemo, useState } from 'react'
import { Button } from '@nexus/atoms'
import { registry } from '../chat/registry.js'
import { widgetSchemas } from '../engine/widgetSchemas.js'
import { WidgetPalette } from './WidgetPalette.jsx'
import { VariantRow } from './VariantRow.jsx'
import { PayloadEditor } from './PayloadEditor.jsx'
import styles from './injector.module.scss'

const CATEGORY_ORDER = ['action', 'input', 'display', 'advanced', 'engine']
const CATEGORY_LABELS = {
  action:   'Action & Interaction',
  input:    'Input & Data Collection',
  display:  'Display & Information',
  advanced: 'Embedded & Advanced',
  engine:   'Engine',
}

function buildGroups() {
  const buckets = new Map(CATEGORY_ORDER.map((c) => [c, []]))
  for (const [type, schema] of Object.entries(widgetSchemas)) {
    if (!registry[type]) {
      console.warn(`[Injector] widgetSchemas entry '${type}' has no registry match — skipping`)
      continue
    }
    const category = schema.category
    if (!buckets.has(category)) {
      console.warn(`[Injector] widget '${type}' has unknown category '${category}' — skipping`)
      continue
    }
    buckets.get(category).push({ type, label: schema.label })
  }
  return CATEGORY_ORDER
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      widgets: buckets.get(category),
    }))
    .filter((group) => group.widgets.length > 0)
}

function stringifyPayload(fn) {
  try {
    return JSON.stringify(fn(), null, 2)
  } catch (e) {
    console.warn('[Injector] payload() threw:', e)
    return '{}'
  }
}

function initialSelection(groups) {
  const firstGroup = groups[0]
  const firstType = firstGroup?.widgets[0]?.type
  const firstVariant = firstType ? widgetSchemas[firstType].variants[0] : null
  return {
    type: firstType ?? null,
    variantId: firstVariant?.id ?? null,
    payloadText: firstVariant ? stringifyPayload(firstVariant.payload) : '{}',
  }
}

export function Injector({ bot }) {
  const groups = useMemo(buildGroups, [])
  const [state, setState] = useState(() => initialSelection(groups))
  const [error, setError] = useState(null)

  const activeVariants = useMemo(
    () => (state.type ? widgetSchemas[state.type].variants : []),
    [state.type],
  )

  const selectWidget = (type) => {
    if (type === state.type) return
    const firstVariant = widgetSchemas[type].variants[0]
    setState({
      type,
      variantId: firstVariant.id,
      payloadText: stringifyPayload(firstVariant.payload),
    })
    setError(null)
  }

  const selectVariant = (variantId) => {
    const variant = widgetSchemas[state.type].variants.find((v) => v.id === variantId)
    if (!variant) return
    setState((s) => ({ ...s, variantId, payloadText: stringifyPayload(variant.payload) }))
    setError(null)
  }

  const onPayloadChange = (payloadText) => {
    setState((s) => ({ ...s, payloadText }))
    setError(null)
  }

  const parseOrError = () => {
    try {
      return { ok: true, value: JSON.parse(state.payloadText) }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  const injectAsBot = () => {
    const result = parseOrError()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectBotMessage({ type: state.type, payload: result.value })
  }

  const injectAsUser = () => {
    const result = parseOrError()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectUserWidgetResponse({ type: state.type, payload: result.value })
  }

  if (!state.type) {
    return <div className={styles.empty}>No widgets registered.</div>
  }

  return (
    <div className={styles.injector}>
      <WidgetPalette
        groups={groups}
        selected={state.type}
        onSelect={selectWidget}
      />
      <VariantRow
        variants={activeVariants}
        selected={state.variantId}
        onSelect={selectVariant}
      />
      <PayloadEditor
        value={state.payloadText}
        error={error}
        onChange={onPayloadChange}
      />
      <div className={styles.actions}>
        <Button variant="primary" size="sm" onClick={injectAsBot}>
          Inject as bot
        </Button>
        <Button variant="secondary" size="sm" onClick={injectAsUser}>
          Inject as user
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Simplify `src/studio/injector.module.scss`**

Replace the file contents with:

```scss
.injector {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.empty {
  font-family: var(--sans);
  font-size: 11px;
  color: var(--grey-60);
  font-style: italic;
}
```

Old rules for `.label`, `.textarea`, `.error` are gone — those moved into `payloadEditor.module.scss`.

- [ ] **Step 3: Manual verification in the browser**

Run: `npm run dev`.

Open the Studio panel. The Injector section should now show:
1. **Widget section** with 5 category labels (ACTION & INTERACTION, INPUT & DATA COLLECTION, DISPLAY & INFORMATION, EMBEDDED & ADVANCED, ENGINE) and chips under each.
2. **Variant section** — visible only when the active widget has ≥2 variants. Click `Confirmation` → three chips (Info / Caution / Danger) appear. Click `Text` → variant row disappears.
3. **Payload (JSON)** textarea showing the pretty-printed payload.
4. **Inject as bot** / **Inject as user** buttons.

Exercise flows:
- Click several widgets, click several variants. The textarea updates each time with fresh ids.
- Click `Inject as bot` for `Confirmation > Danger`. A danger-toned confirmation appears in the chat.
- Click `Inject as user` for `Quick reply > Default`. A user-side widget_response bubble appears.
- Edit the textarea to break the JSON (delete a brace). Click `Inject as bot`. Inline red error appears below the textarea; no message is injected.
- Console should have zero `[Injector]` or `[widgetSchemas]` warnings.

- [ ] **Step 4: Commit**

```bash
git add src/studio/Injector.jsx src/studio/injector.module.scss
git commit -m "feat(studio): chip palette Injector using new widgetSchemas variants"
```

---

## Task 7: Refactor `mockBot.js` rules to use `getVariantPayload`

Every `registerRule.build` currently inlines its own payload — duplicated against `widgetSchemas.js`. Replace each `build` body with a one-liner that calls `getVariantPayload(type, variantId)`. Regex matches and rule ordering stay unchanged.

**Files:**
- Modify: `src/engine/mockBot.js` (every `registerRule` body + remove local `richJobs`)

- [ ] **Step 1: Add the `getVariantPayload` import**

Near the top of `mockBot.js`, after the `import { makeId }` line, add:

```js
import { getVariantPayload } from './widgetSchemas.js'
```

- [ ] **Step 2: Refactor each `registerRule` body**

The transformation is mechanical. Current form:

```js
registerRule({
  match: /^(show )?(caution confirm(ation)?|commit(ment)?)/i,
  build: () => ({
    type: 'confirmation',
    payload: {
      widget_id: makeId('confirm'),
      action_id: makeId('action'),
      tone: 'caution',
      title: 'Confirm your application',
      // ... 15 more lines ...
    },
  }),
})
```

Becomes:

```js
registerRule({
  match: /^(show )?(caution confirm(ation)?|commit(ment)?)/i,
  build: () => ({ type: 'confirmation', payload: getVariantPayload('confirmation', 'caution') }),
})
```

**Mapping of rules to `(type, variantId)` pairs** — apply to each existing rule in order:

| Rule regex (abbreviated) | `(type, variantId)` |
|---|---|
| `/quick[- ]?reply/` | `quick_reply`, `default` |
| `/caution confirm|commit/` | `confirmation`, `caution` |
| `/danger confirm|delete|destructive/` | `confirmation`, `danger` |
| `/confirm/` (fallback) | `confirmation`, `info` |
| `/score|result/` | `score_card`, `default` |
| `/silent|confidential mcq/` | `mcq`, `silent` |
| `/mcq|quiz/` | `mcq`, `scored` |
| `/multi.*select|choice|mcq/` | `mcq`, `multi` |
| `/form/` | `form`, `basic` |
| `/kyc|onboard/` | `form`, `kyc` |
| `/shifts|shift calendar|schedule/` | `shift_calendar`, `default` |
| `/job picks|recommended jobs|…/` | `carousel`, `job_picks` |
| `/tips|featured|carousel/` | `carousel`, `tips` |
| `/otp|verify|verification code/` | `validated_input`, `otp` |
| `/pan|enter pan/` | `validated_input`, `pan` |
| `/pincode|zip/` | `validated_input`, `pincode` |
| `/phone|mobile/` | `validated_input`, `phone` |
| `/email/` | `validated_input`, `email` |
| `/aadhaar number/` | `validated_input`, `aadhaar` |
| `/bank account|account number/` | `validated_input`, `bank_account` |
| `/rate|rating|feedback|how was…/` | `rating`, `stars` |
| `/thumbs|rate delivery/` | `rating`, `thumbs` |
| `/emoji rating|rate training/` | `rating`, `emoji` |
| `/nps|recommend/` | `rating`, `nps` |
| `/how to|guide|instructions|…/` | `instruction_card`, `info` |
| `/my progress|status/` (read-only) | `checklist`, `read_only` |
| `/checklist|todo|onboarding/` (interactive) | `checklist`, `interactive` |
| `/qc|qc review|shelf photo/` | `qc_evidence_review`, `admin` |
| `/evidence review|review evidence|…/` | `evidence_review`, `default` |
| `/offer letter|payslip|…/` | `document_preview`, `default` |
| `/upload file|attach doc|…/` | `file_upload`, `default` |
| `/aadhaar|pan|photo|licence|document/` | `image_capture`, `document` |
| `/selfie|kyc selfie|liveness/` | `image_capture`, `selfie` |
| `/task evidence|delivery photo|…/` | `image_capture`, `evidence` |
| `/job card|show job$/` | `job_card`, `single` |
| `/jobs|carousel/` (job_card fallback) | `job_card`, `carousel` |
| `/show progress/` | `progress`, `default` |

Work through each `registerRule` block in the file. Replace its `build` with the one-liner form using the mapping above.

- [ ] **Step 3: Remove the local `richJobs()` function**

Now that no rule inlines a job payload, `richJobs()` has no consumers in `mockBot.js`. Delete the function (lines 46-211 of the current file) and the preceding comment block.

- [ ] **Step 4: Manual verification — text triggers**

Run: `npm run dev`.

Type each of these phrases in the chat input and confirm the expected widget appears:

| Phrase | Expected |
|---|---|
| `show quick reply` | Quick Reply buttons |
| `show confirm` | Info-tone Confirmation |
| `show caution confirm` | Caution-tone Confirmation |
| `show danger confirm` | Danger-tone Confirmation |
| `show mcq` | Scored single-select MCQ |
| `show silent mcq` | Silent MCQ |
| `show multi select` | Multi-select MCQ |
| `show form` | Basic registration form |
| `kyc` | KYC form |
| `otp` | OTP validated input |
| `pan` | PAN validated input |
| `show jobs` | Job card carousel |
| `job picks` | Carousel of job cards |
| `tips` | Onboarding tips carousel |
| `show progress` | Progress tracker |
| `rate` | Stars rating |
| `thumbs` | Thumbs rating |
| `emoji rating` | Emoji rating |
| `nps` | NPS rating |
| `checklist` | Interactive checklist |
| `my progress` | Read-only checklist |
| `qc review` | Admin QC evidence review |
| `evidence review` | Evidence review |
| `offer letter` | Document preview |
| `upload pdf` | File upload |
| `aadhaar` | Image capture (document) |
| `selfie` | Image capture (selfie) |
| `task evidence` | Image capture (evidence) |
| `show job card` | Single job card |
| `shifts` | Shift calendar |
| `show score` | Score card |

Each should produce a widget identical to clicking the matching chip in the Injector. If any text trigger produces a wrong widget, the mapping table in Step 2 is wrong for that rule — fix and re-verify.

- [ ] **Step 5: Commit**

```bash
git add src/engine/mockBot.js
git commit -m "refactor(mockBot): rules read payloads from widgetSchemas via getVariantPayload

All inline payloads removed — each rule is now a one-liner calling
getVariantPayload(type, variantId). widgetSchemas.js is the single
source of truth for example payloads. richJobs() removed from
mockBot.js (now lives in widgetSchemas.js)."
```

---

## Task 8: Add `mockBot.js` rules for the three new variants

Every chip-reachable variant should also have a text trigger, per spec §5. Three variants were newly authored in Task 5 and have no rule yet.

**Files:**
- Modify: `src/engine/mockBot.js` (add three `registerRule` calls)

- [ ] **Step 1: Add a rule for `qc_evidence_review#worker`**

Add this just after the existing `qc review` rule (which now targets `admin`):

```js
// ─── QC Evidence Review — worker variant (read-only feedback) ─────
// Trigger: "qc worker", "worker qc", "qc feedback"
registerRule({
  match: /^(qc worker|worker qc|qc feedback|task feedback)$/i,
  build: () => ({ type: 'qc_evidence_review', payload: getVariantPayload('qc_evidence_review', 'worker') }),
})
```

- [ ] **Step 2: Add rules for `instruction_card#warn` and `instruction_card#success`**

Add these just after the existing `instruction_card` rule. Ordering matters: these more-specific matches must come **before** the existing `/how to|guide|…/` fallback so they win. Scan the file — if the existing `instruction_card` rule is below them, move it, or make the new matches anchored so they don't collide.

```js
// ─── Instruction Card — warn tone ────────────────────────────────
// Trigger: "helmet safety", "safety warning", "warn instruction"
registerRule({
  match: /^(helmet safety|safety warning|warn instruction)$/i,
  build: () => ({ type: 'instruction_card', payload: getVariantPayload('instruction_card', 'warn') }),
})

// ─── Instruction Card — success tone ─────────────────────────────
// Trigger: "first payout", "payout info", "success instruction"
registerRule({
  match: /^(first payout|payout info|success instruction)$/i,
  build: () => ({ type: 'instruction_card', payload: getVariantPayload('instruction_card', 'success') }),
})
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`.

- Type `qc worker`. Expected: a QC evidence review widget with worker-mode copy (no admin action buttons).
- Type `helmet safety`. Expected: an instruction card with warn tone.
- Type `first payout`. Expected: an instruction card with success tone.

Also verify in the Injector that clicking `QC evidence review > Worker`, `Instruction card > Warn`, and `Instruction card > Success` produce the same widgets.

- [ ] **Step 4: Commit**

```bash
git add src/engine/mockBot.js
git commit -m "feat(mockBot): text triggers for qc worker + instruction_card warn/success"
```

---

## Task 9: Delete the `_UNUSED_OLD_JOBS` dead block

Already flagged for removal in a comment in `mockBot.js`. Finish it now so the file is clean.

**Files:**
- Modify: `src/engine/mockBot.js` (lines 1267-1444 of the pre-refactor file; after earlier tasks, find the block starting with `/* ─── __unused_legacy_jobs — remove me ──` and ending with `/* ─── end __unused_legacy_jobs ─── */`)

- [ ] **Step 1: Delete the block**

Remove the entire comment header, the `const _UNUSED_OLD_JOBS = {...}` declaration, the `void _UNUSED_OLD_JOBS` suppression line, and the trailing comment.

- [ ] **Step 2: Verify the app runs**

Run: `npm run dev`. No console errors. Text triggers still produce widgets.

- [ ] **Step 3: Commit**

```bash
git add src/engine/mockBot.js
git commit -m "chore(mockBot): remove _UNUSED_OLD_JOBS dead block"
```

---

## Task 10: Final manual verification pass

A dedicated sweep so nothing regresses between the focused checks in earlier tasks.

- [ ] **Step 1: Spin up the app fresh**

```bash
npm run dev
```

- [ ] **Step 2: Injector — widget chips**

For every widget chip in every category:
- Click it.
- Confirm the Variant row either hides (single-variant widget) or shows the expected variants.
- Click `Inject as bot`. Confirm a widget renders in the chat.
- Click `Inject as user`. Confirm a user-side bubble renders.

20 widgets × ~1-2 variants each on average. Budget ~5 minutes.

- [ ] **Step 3: Injector — payload editing**

- Pick `Confirmation > Danger`. Edit the `title` field in the textarea to something obvious like `"TITLE-EDITED"`. Click `Inject as bot`. Confirm the rendered widget shows `TITLE-EDITED`.
- With the same widget active, now remove a closing brace from the payload. Click `Inject as bot`. Confirm an inline red error appears and no widget is injected. Click somewhere else; the error should stay. Fix the brace; click inject again; expect success.

- [ ] **Step 4: Text triggers — single-source-of-truth check**

Pick 5 rules at random (e.g. `show caution confirm`, `otp`, `stars`, `show jobs`, `checklist`). For each:
- Type the trigger in chat input.
- Visually compare the resulting widget to clicking the matching chip in the Injector.
- They should be visually identical (ids may differ — that's expected, `makeId` mints fresh ones every call).

- [ ] **Step 5: Devtools console**

Open the browser devtools console. There should be zero `[Injector]` and zero `[widgetSchemas]` warnings during normal use.

- [ ] **Step 6: Repo cleanliness**

```bash
git status
```

Expected: working tree clean (apart from any pre-existing unrelated changes outside this plan's scope).

- [ ] **Step 7: Done**

No commit in this task — verification only.
