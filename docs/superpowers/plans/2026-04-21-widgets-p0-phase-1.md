# AI Labs P0 Phase 1 Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 9 of the 11 P0 Phase 1 widgets from `AI_Labs_Widget_Specification - Rich Chat Widgets.csv` on top of the existing Chatbot UI scaffold. Each widget is a single file under `src/widgets/` plus one-line updates to `registry.js`, `widgetSchemas.js`, and (optionally) a trigger rule in `mockBot.js`. File Upload and Image Capture are deferred to a separate follow-up plan because they require real browser APIs (File API, MediaStream + optional face-detection ML model).

**Architecture:** Each widget is a named-export React function that receives `{ payload, role, onReply? }` from the `MessageRenderer`. Widgets compose Nexus atoms/molecules (`Button`, `Card`, `Steps`, `ProgressBar`, `RadioGroup`, `Checkbox`, `InputField`, etc.) and style with SCSS modules backed by Nexus design tokens. Interactive widgets call `onReply(responseWidget)` which dispatches a `widget_response` user message through the existing `useBot` engine, producing a visible user bubble and triggering a bot reply.

**Tech Stack:** Vite + React 18 + JSX + SCSS modules + classnames. Nexus atoms via `@nexus/atoms`. Tokens copied locally in Task 0 so the project is self-contained for styling.

**Verification:** Manual browser observation as before — for each widget, trigger it via the Studio Injector and confirm (a) it renders inside the device frame, (b) tapping actions produces a user `widget_response` bubble, (c) the JSON Inspector shows correct shapes. No test framework.

**Working directory:** `/Users/atulnayyar/Projects/Chatbot UI`.

**Reference materials:**
- CSV spec: `/Users/atulnayyar/Downloads/AI_Labs_Widget_Specification - Rich Chat Widgets.csv`
- Scaffold design spec: `docs/superpowers/specs/2026-04-21-chatbot-ui-scaffold-design.md`
- Scaffold plan: `docs/superpowers/plans/2026-04-21-chatbot-ui-scaffold.md`
- Nexus design system: `../nexus-design-system/src/`

---

## Architectural additions introduced by this plan

Four small changes are layered onto the existing scaffold before the widgets start. They happen during Task 0 and Task 1 so the pattern is established once and then reused.

### 1. `onReply` callback threaded from engine → widgets

The existing `MessageRenderer` passes `{ payload, role }` to every widget. Interactive widgets (Quick Reply, Confirmation, MCQ, Form, etc.) need to dispatch a user-side response back into the conversation. Rather than prop-drill through every renderer, we add a tiny `ChatActionsContext` that exposes a single function `onReply(responseWidget)` which internally calls `bot.sendUserMessage(responseWidget)`.

Widgets consume via a `useChatActions()` hook. Non-interactive widgets ignore it. This gets wired up in Task 1.

### 2. `mockBot.js` becomes a rule table

Currently `mockBot.respond()` is a single echo function. To let us demo each widget by typing a phrase (e.g. "show quick reply"), we refactor it into a matchable rule list. Each widget task appends a rule. Default behaviour (echo) stays as the fallback when nothing matches.

### 3. `widgetSchemas.js` accumulates one entry per widget

Same pattern as the scaffold — each widget adds one entry containing its label + example payload. The Studio Injector picks it up automatically.

### 4. Local copy of Nexus tokens

Task 0 copies `tokens.scss` and `base.css` into `src/styles/nexus/` and repoints the Vite aliases at the local copies. Nexus atoms stay aliased to the sibling repo (so they auto-update), but our styling foundation no longer depends on a sibling path. If we later want to prune unused tokens we can do so in-place.

---

## Widget prop contract (convention for all 9 widgets)

Every widget exports a named function:

```jsx
export function WidgetName({ payload, role, ...rest }) { ... }
```

- `payload` — the widget's `payload` object as defined in its config schema.
- `role` — `'user'` | `'bot'`. Present for symmetry; most widgets only render for the bot side.
- Interactive widgets read `useChatActions()` internally rather than relying on a prop.

When a user interacts with an interactive widget, it builds a `widget_response` widget:

```js
{
  type: 'widget_response',
  payload: {
    source_type: 'quick_reply',           // widget type that produced this
    source_widget_id: 'example-qr-abc',   // original widget instance id
    data: { ... }                          // widget-specific response shape per CSV "Output" column
  }
}
```

…and calls `onReply(responseWidget)`. The engine appends a user bubble (rendered by `WidgetResponse`) and triggers a bot reply.

---

## File Structure Overview

### Preflight (Task 0)
- Create: `src/styles/nexus/tokens.scss` (copy of Nexus tokens)
- Create: `src/styles/nexus/base.css` (copy of Nexus base)
- Create: `src/styles/nexus/README.md` (short note explaining the copy)
- Modify: `vite.config.js` (repoint `@nexus/tokens` and `@nexus/base` to local copies)

### Architectural wiring (Task 1, bundled with the first widget)
- Create: `src/chat/ChatActionsContext.jsx` (provider + `useChatActions` hook)
- Modify: `src/chat/ChatPane.jsx` (wrap children in `ChatActionsProvider`)
- Modify: `src/chat/MessageList.jsx` (no change needed — Provider lives above it)
- Modify: `src/chat/MessageRenderer.jsx` (pass only `{ payload, role }` — widget reads context)
- Refactor: `src/engine/mockBot.js` (rule-table pattern)

### Per-widget (Tasks 1 through 9)
Each creates one `.jsx` + one `.module.scss` under `src/widgets/`, plus three additions (import + registry entry + schema entry) and one mock bot rule. Concretely:
- `src/widgets/QuickReply.jsx` + `quickReply.module.scss`
- `src/widgets/ConfirmationCard.jsx` + `confirmationCard.module.scss`
- `src/widgets/ProgressTracker.jsx` + `progressTracker.module.scss`
- `src/widgets/ScoreCard.jsx` + `scoreCard.module.scss`
- `src/widgets/McqQuiz.jsx` + `mcqQuiz.module.scss`
- `src/widgets/FormWidget.jsx` + `formWidget.module.scss`
- `src/widgets/JobCard.jsx` + `jobCard.module.scss`
- `src/widgets/DocumentPreview.jsx` + `documentPreview.module.scss`
- `src/widgets/QcEvidenceReview.jsx` + `qcEvidenceReview.module.scss`

Every per-widget task also modifies:
- `src/chat/registry.js` (one import + one key)
- `src/engine/widgetSchemas.js` (one entry with label + examplePayload)
- `src/engine/mockBot.js` (one rule pushed into the rules array)

---

## Task 0: Preflight — Copy Nexus Tokens + Wire ChatActionsContext + Refactor mockBot

Foundational setup before any widget work begins. Touches the token pipeline and two pieces of engine plumbing used by every interactive widget downstream.

**Files:**
- Create: `src/styles/nexus/tokens.scss` (copied from `../nexus-design-system/src/styles/tokens.scss`)
- Create: `src/styles/nexus/base.css` (copied from `../nexus-design-system/src/styles/base.css`)
- Create: `src/styles/nexus/README.md`
- Modify: `vite.config.js`
- Create: `src/chat/ChatActionsContext.jsx`
- Modify: `src/chat/ChatPane.jsx`
- Modify: `src/engine/mockBot.js`

- [ ] **Step 1: Copy tokens locally**

```bash
cp "/Users/atulnayyar/Projects/nexus-design-system/src/styles/tokens.scss" \
   "/Users/atulnayyar/Projects/Chatbot UI/src/styles/nexus/tokens.scss"
cp "/Users/atulnayyar/Projects/nexus-design-system/src/styles/base.css" \
   "/Users/atulnayyar/Projects/Chatbot UI/src/styles/nexus/base.css"
```

(Create the `src/styles/nexus/` directory first with `mkdir -p` if needed.)

- [ ] **Step 2: Add a README note** at `src/styles/nexus/README.md`:

```markdown
# Nexus tokens (local copy)

Files in this folder are copied verbatim from `../../nexus-design-system/src/styles/` so this project can build without a sibling-path dependency for styling. Atoms are still resolved via the Vite alias to the sibling project — only the foundational token/base stylesheets are copied.

When Nexus publishes token changes, re-copy:

```bash
cp ../../nexus-design-system/src/styles/tokens.scss ./tokens.scss
cp ../../nexus-design-system/src/styles/base.css ./base.css
```

Unused tokens can be pruned in-place. Keep the file structure and variable names intact.
```

- [ ] **Step 3: Update Vite aliases** in `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nexusRoot = path.resolve(__dirname, '../nexus-design-system/src')
const localNexus = path.resolve(__dirname, 'src/styles/nexus')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nexus/atoms': path.resolve(nexusRoot, 'atoms/index.js'),
      '@nexus/molecules': path.resolve(nexusRoot, 'molecules/index.js'),
      '@nexus/tokens': path.resolve(localNexus, 'tokens.scss'),
      '@nexus/base': path.resolve(localNexus, 'base.css'),
    },
  },
})
```

- [ ] **Step 4: Create `src/chat/ChatActionsContext.jsx`**

```jsx
import { createContext, useContext, useMemo } from 'react'

const ChatActionsContext = createContext({
  onReply: () => {},
})

export function ChatActionsProvider({ onReply, children }) {
  const value = useMemo(() => ({ onReply }), [onReply])
  return (
    <ChatActionsContext.Provider value={value}>
      {children}
    </ChatActionsContext.Provider>
  )
}

export function useChatActions() {
  return useContext(ChatActionsContext)
}
```

- [ ] **Step 5: Wire `ChatActionsProvider` in `ChatPane.jsx`**

Replace contents of `/Users/atulnayyar/Projects/Chatbot UI/src/chat/ChatPane.jsx`:

```jsx
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageInput } from './MessageInput.jsx'
import { ChatActionsProvider } from './ChatActionsContext.jsx'
import styles from './chatPane.module.scss'

export function ChatPane({ bot }) {
  return (
    <ChatActionsProvider onReply={bot.sendUserMessage}>
      <div className={styles.pane}>
        <ChatHeader />
        <div className={styles.body}>
          <MessageList messages={bot.messages} isBotTyping={bot.isBotTyping} />
        </div>
        <MessageInput
          onSend={bot.sendUserMessage}
          disabled={bot.isBotTyping}
        />
      </div>
    </ChatActionsProvider>
  )
}
```

`onReply` is wired to `bot.sendUserMessage`. A widget calling `onReply(responseWidget)` will behave exactly like a user typing a message: a user bubble renders and the bot reply fires.

- [ ] **Step 6: Refactor `mockBot.js` to a rule-table**

Replace contents of `/Users/atulnayyar/Projects/Chatbot UI/src/engine/mockBot.js`:

```js
import { v4 as uuid } from 'uuid'

/**
 * Rule-based mock bot. Each rule is { match: RegExp, build: (userMessage) => botWidget | null }.
 * The first matching rule wins. Unmatched text messages and all widget_response messages fall through
 * to the default echo.
 *
 * Each widget task APPENDS one entry to this list.
 */
const rules = []

export function registerRule(rule) {
  rules.push(rule)
}

function defaultEcho(userMessage) {
  const payload = userMessage?.widget?.payload ?? {}
  let incoming = ''
  if (userMessage?.widget?.type === 'text') {
    incoming = payload.text ?? ''
  } else if (userMessage?.widget?.type === 'widget_response') {
    incoming = payload?.data?.label ?? JSON.stringify(payload?.data ?? {})
  } else {
    incoming = `(${userMessage?.widget?.type ?? 'unknown'})`
  }
  return { type: 'text', payload: { text: `You said: ${incoming}` } }
}

export function respond(userMessage) {
  if (userMessage?.widget?.type === 'text') {
    const text = userMessage.widget.payload?.text?.toLowerCase().trim() ?? ''
    for (const rule of rules) {
      if (rule.match.test(text)) {
        const built = rule.build(userMessage)
        if (built) return built
      }
    }
  }
  return defaultEcho(userMessage)
}

// Helper used by widget rule factories to stamp fresh ids on each build.
export function makeId(prefix = 'w') {
  return `${prefix}-${uuid().slice(0, 8)}`
}
```

Each widget task imports `registerRule` and `makeId` from this file and appends a rule at module load (via a side-effect import in `mockBot.js` — see Task 1 Step 7 for the pattern).

- [ ] **Step 7: Verify build**

```bash
cd "/Users/atulnayyar/Projects/Chatbot UI"
npm run build
```

Expected: clean build. CSS output size should match the previous build (since the tokens content is identical, just relocated).

Open the dev server and confirm the chat surface still renders correctly — Avatar still circular, Studio Panel still styled.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: preflight — local Nexus tokens + ChatActionsContext + mockBot rules"
```

---

## Task 1: Quick Reply Buttons

The simplest user-action widget. Establishes the `onReply` pattern that the next six widgets reuse.

**From CSV:**
> Predefined response buttons displayed below a message. User taps instead of typing. Most frequently used widget — drastically improves conversation speed and reduces input errors for mobile-first frontline users. Buttons appear as horizontal pills (2-3 options) or stacked vertical buttons (4-5 options). Selected option is highlighted, others grey out. Selected answer appears as a user message in chat. Agent immediately processes and continues.

**Input:** User taps one button from 2-5 options. Options can include emoji.
**Output:** `{ selected_option: string, option_index: number, timestamp: number }`
**Use cases:** Yes/No confirmations, interest level, language selection.

**Config schema:**
```js
{
  type: 'quick_reply',
  payload: {
    widget_id: string,
    prompt?: string,                      // optional prompt shown above buttons
    options: [{ label, value, emoji? }],
    allow_multiple?: boolean              // multi-select variant (default: false)
  }
}
```

**Nexus atoms used:** `Button`.

**Viewport adaptation (per CSV design notes):** 2–3 options render as horizontal pills; 4+ stack vertically. The widget reads `useViewport()` and, on `mobile` viewport with 4+ options, forces vertical stack regardless. On `desktop`, 4-5 options still horizontal if they fit.

**Files:**
- Create: `src/widgets/QuickReply.jsx`
- Create: `src/widgets/quickReply.module.scss`
- Modify: `src/chat/registry.js`
- Modify: `src/engine/widgetSchemas.js`
- Modify: `src/engine/mockBot.js`

- [ ] **Step 1: Create `src/widgets/quickReply.module.scss`**

```scss
.container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 90%;
}

.prompt {
  font-size: 14px;
  line-height: 1.4;
  color: var(--grey-90);
  padding: 9px 13px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  white-space: pre-wrap;
  display: inline-block;
  align-self: flex-start;
}

.options {
  display: flex;
  gap: 8px;
}

.options.horizontal {
  flex-direction: row;
  flex-wrap: wrap;
}

.options.vertical {
  flex-direction: column;
}

.option {
  min-height: 44px;
}

.options.horizontal .option {
  flex: 0 0 auto;
}

.options.vertical .option {
  align-self: stretch;
}

.emoji {
  font-size: 15px;
  margin-right: 4px;
}

.selected {
  /* Placeholder; Nexus Button variant handles active state via its own styling */
}
```

- [ ] **Step 2: Create `src/widgets/QuickReply.jsx`**

```jsx
import { useState } from 'react'
import cx from 'classnames'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './quickReply.module.scss'

export function QuickReply({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [selectedValues, setSelectedValues] = useState(() => new Set())
  const [submitted, setSubmitted] = useState(false)

  const options = payload?.options ?? []
  const allowMultiple = !!payload?.allow_multiple
  const orientation =
    (options.length >= 4 || viewport === 'mobile') && options.length >= 4
      ? 'vertical'
      : 'horizontal'

  const handleTap = (option, index) => {
    if (submitted) return

    if (allowMultiple) {
      const next = new Set(selectedValues)
      if (next.has(option.value)) next.delete(option.value)
      else next.add(option.value)
      setSelectedValues(next)
      return
    }

    setSubmitted(true)
    setSelectedValues(new Set([option.value]))
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'quick_reply',
        source_widget_id: payload?.widget_id,
        data: {
          label: option.label,
          value: option.value,
          option_index: index,
          timestamp: Date.now(),
        },
      },
    })
  }

  const submitMulti = () => {
    if (submitted || selectedValues.size === 0) return
    setSubmitted(true)
    const selectedOptions = options.filter((o) => selectedValues.has(o.value))
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'quick_reply',
        source_widget_id: payload?.widget_id,
        data: {
          label: selectedOptions.map((o) => o.label).join(', '),
          values: selectedOptions.map((o) => o.value),
          timestamp: Date.now(),
        },
      },
    })
  }

  return (
    <div className={styles.container}>
      {payload?.prompt && <div className={styles.prompt}>{payload.prompt}</div>}
      <div className={cx(styles.options, styles[orientation])}>
        {options.map((option, index) => {
          const isSelected = selectedValues.has(option.value)
          return (
            <Button
              key={option.value}
              className={styles.option}
              variant={isSelected ? 'primary' : 'secondary'}
              size="md"
              disabled={submitted && !isSelected}
              onClick={() => handleTap(option, index)}
            >
              {option.emoji && <span className={styles.emoji}>{option.emoji}</span>}
              {option.label}
            </Button>
          )
        })}
      </div>
      {allowMultiple && !submitted && selectedValues.size > 0 && (
        <Button variant="primary" size="sm" onClick={submitMulti}>
          Submit ({selectedValues.size})
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Register in `src/chat/registry.js`**

```js
import { TextMessage } from '../widgets/TextMessage.jsx'
import { WidgetResponse } from '../widgets/WidgetResponse.jsx'
import { QuickReply } from '../widgets/QuickReply.jsx'

export const registry = {
  text: TextMessage,
  widget_response: WidgetResponse,
  quick_reply: QuickReply,
}
```

- [ ] **Step 4: Add schema to `src/engine/widgetSchemas.js`**

Append inside the `widgetSchemas` object:

```js
quick_reply: {
  label: 'Quick Reply Buttons',
  examplePayload: {
    widget_id: 'qr-example-1',
    prompt: 'Are you interested in this opportunity?',
    options: [
      { label: 'Yes', value: 'yes', emoji: '👍' },
      { label: 'No', value: 'no', emoji: '👎' },
      { label: 'Maybe later', value: 'maybe' },
    ],
    allow_multiple: false,
  },
},
```

- [ ] **Step 5: Add mock bot rule**

Append to the top of `src/engine/mockBot.js` (under the existing imports):

```js
registerRule({
  match: /^(show )?quick[- ]?reply/i,
  build: () => ({
    type: 'quick_reply',
    payload: {
      widget_id: makeId('qr'),
      prompt: 'Pick one:',
      options: [
        { label: 'Yes', value: 'yes', emoji: '👍' },
        { label: 'No', value: 'no', emoji: '👎' },
        { label: 'Maybe', value: 'maybe' },
      ],
    },
  }),
})
```

- [ ] **Step 6: Verify**

```bash
npm run build
```

Expected: clean. In the browser: type "show quick reply" → the bot replies with a Quick Reply widget. Tap "Yes" → user bubble appears, then bot echoes "You said: Yes". Injector also lists "Quick Reply Buttons" and the payload prefills.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(widget): Quick Reply Buttons — P0 Phase 1 #1"
```

---

## Task 2: Confirmation Card

Pre-action confirmation for irreversible or high-stakes actions. Distinct visual treatment (warning background), summary list, Confirm/Go Back buttons, optional "I understand" checkbox.

**From CSV:**
> Pre-action confirmation card for irreversible or high-stakes actions. Shows what's about to happen, key details, and Confirm/Go Back buttons. Prevents accidental taps on small mobile screens. Two buttons: 'Confirm' (primary) and 'Go Back' (secondary, outlined). Optional: checkbox 'I understand this action cannot be undone' for critical actions.

**Input:** User taps Confirm or Go Back. Optional checkbox must be ticked first when `require_checkbox: true`.
**Output:** `{ action_id, confirmed: boolean, timestamp }`
**Use cases:** Job application submission, offer acceptance, shift commitment, interview scheduling.

**Config schema:**
```js
{
  type: 'confirmation',
  payload: {
    widget_id: string,
    action_id: string,
    title: string,
    description: string,
    details: [{ label, value }],
    confirm_label: string,
    cancel_label: string,
    require_checkbox?: boolean,
    checkbox_label?: string
  }
}
```

**Nexus atoms used:** `Button`, `Checkbox`.

**Viewport adaptation:** Buttons stack vertically on mobile (full-width, prevents mis-taps); side-by-side on desktop.

**Files:**
- Create: `src/widgets/ConfirmationCard.jsx`
- Create: `src/widgets/confirmationCard.module.scss`
- Modify: `src/chat/registry.js`
- Modify: `src/engine/widgetSchemas.js`
- Modify: `src/engine/mockBot.js`

- [ ] **Step 1: Create `src/widgets/confirmationCard.module.scss`**

```scss
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--yellow-60, #b88a00);
  background: var(--yellow-10, #fff9e0);
  border-radius: 12px;
  max-width: 92%;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--grey-90);
  margin: 0;
}

.description {
  font-size: 13px;
  line-height: 1.4;
  color: var(--grey-80);
  margin: 0;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  background: var(--white);
  border-radius: 8px;
  border: 1px solid var(--grey-10);
}

.detailRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.detailLabel {
  color: var(--grey-60);
  flex-shrink: 0;
}

.detailValue {
  color: var(--grey-90);
  text-align: right;
  font-weight: 500;
}

.checkboxRow {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--grey-80);
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions.vertical {
  flex-direction: column;
}

.actions.horizontal {
  flex-direction: row;
  justify-content: flex-end;
}

.actionButton {
  min-height: 44px;
}

.submitted {
  text-align: center;
  font-size: 13px;
  color: var(--grey-60);
  font-style: italic;
}
```

- [ ] **Step 2: Create `src/widgets/ConfirmationCard.jsx`**

```jsx
import { useState } from 'react'
import cx from 'classnames'
import { Button, Checkbox } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './confirmationCard.module.scss'

export function ConfirmationCard({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [acknowledged, setAcknowledged] = useState(false)
  const [decision, setDecision] = useState(null) // 'confirmed' | 'cancelled' | null

  const requireCheckbox = !!payload?.require_checkbox
  const canConfirm = !requireCheckbox || acknowledged

  const emit = (confirmed) => {
    if (decision) return
    setDecision(confirmed ? 'confirmed' : 'cancelled')
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'confirmation',
        source_widget_id: payload?.widget_id,
        data: {
          label: confirmed
            ? (payload?.confirm_label ?? 'Confirm')
            : (payload?.cancel_label ?? 'Cancel'),
          action_id: payload?.action_id,
          confirmed,
          timestamp: Date.now(),
        },
      },
    })
  }

  const orientation = viewport === 'mobile' ? 'vertical' : 'horizontal'

  return (
    <div className={styles.card}>
      {payload?.title && <h3 className={styles.title}>{payload.title}</h3>}
      {payload?.description && <p className={styles.description}>{payload.description}</p>}
      {payload?.details?.length > 0 && (
        <dl className={styles.details}>
          {payload.details.map((row) => (
            <div key={row.label} className={styles.detailRow}>
              <dt className={styles.detailLabel}>{row.label}</dt>
              <dd className={styles.detailValue}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {requireCheckbox && (
        <label className={styles.checkboxRow}>
          <Checkbox
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            disabled={!!decision}
          />
          <span>{payload?.checkbox_label ?? 'I understand this action cannot be undone.'}</span>
        </label>
      )}
      {decision ? (
        <div className={styles.submitted}>
          {decision === 'confirmed' ? 'Confirmed.' : 'Cancelled.'}
        </div>
      ) : (
        <div className={cx(styles.actions, styles[orientation])}>
          <Button
            className={styles.actionButton}
            variant="secondary"
            size="md"
            onClick={() => emit(false)}
          >
            {payload?.cancel_label ?? 'Go Back'}
          </Button>
          <Button
            className={styles.actionButton}
            variant="primary"
            size="md"
            disabled={!canConfirm}
            onClick={() => emit(true)}
          >
            {payload?.confirm_label ?? 'Confirm'}
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Register in `registry.js`** (append a line):

```js
import { ConfirmationCard } from '../widgets/ConfirmationCard.jsx'
// ...
confirmation: ConfirmationCard,
```

- [ ] **Step 4: Add schema** in `widgetSchemas.js`:

```js
confirmation: {
  label: 'Confirmation Card',
  examplePayload: {
    widget_id: 'confirm-example-1',
    action_id: 'apply-job-123',
    title: 'Confirm your application',
    description: 'You are about to apply for this job. This action cannot be undone.',
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
  },
},
```

- [ ] **Step 5: Mock bot rule** in `mockBot.js`:

```js
registerRule({
  match: /^(show )?confirm(ation)?/i,
  build: () => ({
    type: 'confirmation',
    payload: {
      widget_id: makeId('confirm'),
      action_id: makeId('action'),
      title: 'Confirm your choice',
      description: 'Are you sure you want to continue?',
      details: [
        { label: 'Action', value: 'Demo confirmation' },
        { label: 'When',   value: 'Immediately' },
      ],
      confirm_label: 'Yes, continue',
      cancel_label: 'Go back',
    },
  }),
})
```

- [ ] **Step 6: Verify & Step 7: Commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): Confirmation Card — P0 Phase 1 #2"
```

---

## Task 3: Progress Tracker

Visual step indicator showing position in a multi-stage process. Display-only (no reply). Uses Nexus's existing `Steps` atom directly for desktop; compact horizontal fallback for mobile.

**From CSV:**
> Visual step indicator showing position in a multi-stage process. Completed steps (green), current step (highlighted), upcoming steps (grey). Each step can show status (completed, in progress, pending, failed). Horizontal or vertical step indicator with connected lines.

**Input:** Display only. Optional: tap a completed step to see its summary.
**Output:** N/A (display widget)
**Use cases:** Recruitment journey (8 steps), onboarding checklist, training course progression, BGV verification stages.

**Config schema:**
```js
{
  type: 'progress',
  payload: {
    widget_id: string,
    steps: [{
      id,
      label,
      status: 'completed' | 'current' | 'pending' | 'failed',
      summary?: string
    }],
    orientation?: 'horizontal' | 'vertical' | 'auto'  // default: 'auto'
  }
}
```

**Nexus atoms used:** `Steps`, `StepItem` (atoms/Steps). Also `Popover` for tap-to-see-summary on completed steps (optional).

**Viewport adaptation:** `orientation: 'auto'` picks horizontal on desktop AND when steps.length ≤ 5; vertical otherwise.

**Files:**
- Create: `src/widgets/ProgressTracker.jsx`
- Create: `src/widgets/progressTracker.module.scss`
- Modify: `src/chat/registry.js`
- Modify: `src/engine/widgetSchemas.js`
- Modify: `src/engine/mockBot.js`

- [ ] **Step 1: Inspect Nexus `Steps` API before wiring**

```bash
cat /Users/atulnayyar/Projects/nexus-design-system/src/atoms/Steps/Steps.jsx
```

Expected API (confirm):
- `<Steps orientation="horizontal" | "vertical">{children}</Steps>`
- `<StepItem status="completed" | "current" | "pending" | "failed" label="..." />`

If the actual API differs, adapt the JSX in Step 3 to match exactly.

- [ ] **Step 2: Create `src/widgets/progressTracker.module.scss`**

```scss
.container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 92%;
  padding: 12px 14px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 12px;
}

.summary {
  margin-top: 4px;
  padding: 8px 10px;
  background: var(--grey-0);
  border-radius: 6px;
  font-size: 12px;
  color: var(--grey-70);
  line-height: 1.4;
}
```

- [ ] **Step 3: Create `src/widgets/ProgressTracker.jsx`**

```jsx
import { useState } from 'react'
import { Steps, StepItem } from '@nexus/atoms'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './progressTracker.module.scss'

function resolveOrientation(requested, stepCount, viewport) {
  if (requested && requested !== 'auto') return requested
  if (viewport === 'mobile' && stepCount > 5) return 'vertical'
  if (stepCount > 6) return 'vertical'
  return 'horizontal'
}

export function ProgressTracker({ payload }) {
  const { viewport } = useViewport()
  const [openSummaryId, setOpenSummaryId] = useState(null)

  const steps = payload?.steps ?? []
  const orientation = resolveOrientation(payload?.orientation, steps.length, viewport)

  const openStep = steps.find((s) => s.id === openSummaryId)

  return (
    <div className={styles.container}>
      <Steps orientation={orientation}>
        {steps.map((step) => (
          <StepItem
            key={step.id}
            status={step.status}
            label={step.label}
            onClick={
              step.status === 'completed' && step.summary
                ? () => setOpenSummaryId(openSummaryId === step.id ? null : step.id)
                : undefined
            }
          />
        ))}
      </Steps>
      {openStep?.summary && (
        <div className={styles.summary}>
          <strong>{openStep.label}:</strong> {openStep.summary}
        </div>
      )}
    </div>
  )
}
```

If Nexus `StepItem` doesn't accept an `onClick` prop, remove the summary-reveal feature; the widget still works as a pure display.

- [ ] **Step 4: Register in `registry.js`:**

```js
import { ProgressTracker } from '../widgets/ProgressTracker.jsx'
progress: ProgressTracker,
```

- [ ] **Step 5: Schema:**

```js
progress: {
  label: 'Progress Tracker',
  examplePayload: {
    widget_id: 'progress-example-1',
    orientation: 'auto',
    steps: [
      { id: '1', label: 'Apply',    status: 'completed', summary: 'Application received on Apr 10.' },
      { id: '2', label: 'Screen',   status: 'completed', summary: 'Cleared phone screening.' },
      { id: '3', label: 'Interview', status: 'current' },
      { id: '4', label: 'Offer',    status: 'pending' },
      { id: '5', label: 'Onboard',  status: 'pending' },
    ],
  },
},
```

- [ ] **Step 6: Mock bot rule:**

```js
registerRule({
  match: /^(show )?progress/i,
  build: () => ({
    type: 'progress',
    payload: {
      widget_id: makeId('progress'),
      orientation: 'auto',
      steps: [
        { id: 'a', label: 'Started',    status: 'completed' },
        { id: 'b', label: 'In review',  status: 'current' },
        { id: 'c', label: 'Decision',   status: 'pending' },
        { id: 'd', label: 'Done',       status: 'pending' },
      ],
    },
  }),
})
```

- [ ] **Step 7–8: Verify & commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): Progress Tracker — P0 Phase 1 #3"
```

---

## Task 4: Score / Result Card

Structured result display. Overall score prominent, breakdown by category with bars, recommendation, expandable reasoning, optional action button.

**From CSV:**
> Structured result display showing evaluation outcome. Overall score (numeric or pass/fail), breakdown by category, confidence level, recommendation (proceed/borderline/reject). Can include evaluator reasoning as expandable text. Result badge: large, centered, color-coded. Score: 48px bold. Category bars: horizontal fill bars with labels.

**Input:** Display only. Optional action button.
**Output:** N/A, or `{ action: string }` if action button clicked.
**Use cases:** Assessment results, interview scoring, QC verdict, BGV outcome.

**Config schema:**
```js
{
  type: 'score_card',
  payload: {
    widget_id: string,
    overall: {
      score?: number,
      max_score?: number,
      pass_fail?: 'pass' | 'fail' | 'borderline',
      label: string
    },
    categories: [{ name, score, max_score }],
    recommendation?: string,
    reasoning?: string,
    actions?: [{ label, value, variant?: 'primary' | 'secondary' }]
  }
}
```

**Nexus atoms used:** `ProgressBar`, `Badge`, `Button`.

**Viewport adaptation:** Category bars shrink text on mobile. Actions stack vertically on mobile.

**Files:**
- Create: `src/widgets/ScoreCard.jsx`
- Create: `src/widgets/scoreCard.module.scss`
- Modify: `src/chat/registry.js`, `widgetSchemas.js`, `mockBot.js`

- [ ] **Step 1: Inspect Nexus ProgressBar API:**

```bash
cat /Users/atulnayyar/Projects/nexus-design-system/src/atoms/ProgressBar/ProgressBar.jsx
```

Adapt the fill prop in Step 3 to the actual API (likely `<ProgressBar value={0..100} />` or `<ProgressBar value={0..max} max={max} />`).

- [ ] **Step 2: SCSS (`scoreCard.module.scss`):**

```scss
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 12px;
  max-width: 92%;
}

.overall {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 12px;
  border-radius: 10px;
}

.overall.pass    { background: var(--green-10, #e9f9ee); }
.overall.fail    { background: var(--red-10,   #fdecea); }
.overall.borderline { background: var(--yellow-10, #fff6d5); }

.score {
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  color: var(--grey-90);
  font-variant-numeric: tabular-nums;
}

.overallLabel {
  font-size: 13px;
  color: var(--grey-70);
  text-align: center;
}

.recommendation {
  font-size: 12px;
  color: var(--grey-60);
  padding: 0 4px;
}

.categories {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.category {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.categoryHead {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--grey-80);
}

.reasoningToggle {
  background: transparent;
  border: none;
  padding: 0;
  text-align: left;
  color: var(--grey-60);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;

  &:hover { color: var(--grey-90); }
}

.reasoning {
  font-size: 12px;
  line-height: 1.5;
  color: var(--grey-80);
  padding: 10px 12px;
  background: var(--grey-0);
  border-radius: 8px;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions.vertical   { flex-direction: column; }
.actions.horizontal { flex-direction: row; justify-content: flex-end; }
```

- [ ] **Step 3: JSX (`ScoreCard.jsx`):**

```jsx
import { useState } from 'react'
import cx from 'classnames'
import { Button, ProgressBar } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './scoreCard.module.scss'

function overallVariant(overall) {
  if (!overall) return null
  if (overall.pass_fail === 'pass') return 'pass'
  if (overall.pass_fail === 'fail') return 'fail'
  if (overall.pass_fail === 'borderline') return 'borderline'
  if (typeof overall.score === 'number' && typeof overall.max_score === 'number') {
    const ratio = overall.score / overall.max_score
    if (ratio >= 0.75) return 'pass'
    if (ratio >= 0.5) return 'borderline'
    return 'fail'
  }
  return null
}

export function ScoreCard({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [showReasoning, setShowReasoning] = useState(false)
  const overall = payload?.overall ?? {}
  const variant = overallVariant(overall)
  const actionsOrientation = viewport === 'mobile' ? 'vertical' : 'horizontal'

  const fireAction = (action) => {
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'score_card',
        source_widget_id: payload?.widget_id,
        data: { label: action.label, value: action.value, timestamp: Date.now() },
      },
    })
  }

  return (
    <div className={styles.card}>
      <div className={cx(styles.overall, variant && styles[variant])}>
        {typeof overall.score === 'number' && (
          <div className={styles.score}>
            {overall.score}
            {typeof overall.max_score === 'number' && (
              <span style={{ fontSize: 20, color: 'var(--grey-60)' }}> / {overall.max_score}</span>
            )}
          </div>
        )}
        {overall.label && <div className={styles.overallLabel}>{overall.label}</div>}
      </div>

      {payload?.recommendation && (
        <div className={styles.recommendation}>{payload.recommendation}</div>
      )}

      {payload?.categories?.length > 0 && (
        <div className={styles.categories}>
          {payload.categories.map((cat) => {
            const pct = cat.max_score ? (cat.score / cat.max_score) * 100 : cat.score
            return (
              <div key={cat.name} className={styles.category}>
                <div className={styles.categoryHead}>
                  <span>{cat.name}</span>
                  <span>
                    {cat.score}{cat.max_score ? ` / ${cat.max_score}` : ''}
                  </span>
                </div>
                <ProgressBar value={pct} max={100} />
              </div>
            )
          })}
        </div>
      )}

      {payload?.reasoning && (
        <>
          <button
            type="button"
            className={styles.reasoningToggle}
            onClick={() => setShowReasoning((v) => !v)}
          >
            {showReasoning ? 'Hide details' : 'See detailed feedback'}
          </button>
          {showReasoning && <div className={styles.reasoning}>{payload.reasoning}</div>}
        </>
      )}

      {payload?.actions?.length > 0 && (
        <div className={cx(styles.actions, styles[actionsOrientation])}>
          {payload.actions.map((a) => (
            <Button
              key={a.value}
              variant={a.variant ?? 'primary'}
              size="md"
              onClick={() => fireAction(a)}
            >
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4–5: Registry + schema:**

```js
// registry.js
import { ScoreCard } from '../widgets/ScoreCard.jsx'
score_card: ScoreCard,

// widgetSchemas.js
score_card: {
  label: 'Score / Result Card',
  examplePayload: {
    widget_id: 'score-example-1',
    overall: { score: 82, max_score: 100, pass_fail: 'pass', label: 'Assessment passed' },
    categories: [
      { name: 'Product knowledge',     score: 28, max_score: 30 },
      { name: 'Communication',         score: 24, max_score: 30 },
      { name: 'Objection handling',    score: 18, max_score: 20 },
      { name: 'Closing',               score: 12, max_score: 20 },
    ],
    recommendation: 'Ready to proceed to in-person interview.',
    reasoning: 'Strong command of the product catalogue; could tighten closing after the first objection.',
    actions: [
      { label: 'Continue', value: 'continue', variant: 'primary' },
      { label: 'View full report', value: 'view_details', variant: 'secondary' },
    ],
  },
},
```

- [ ] **Step 6: Mock bot rule:**

```js
registerRule({
  match: /^(show )?(score|result)/i,
  build: () => ({
    type: 'score_card',
    payload: {
      widget_id: makeId('score'),
      overall: { score: 76, max_score: 100, pass_fail: 'pass', label: 'Demo result' },
      categories: [
        { name: 'Accuracy',  score: 38, max_score: 50 },
        { name: 'Speed',     score: 38, max_score: 50 },
      ],
    },
  }),
})
```

- [ ] **Step 7–8: Verify & commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): Score / Result Card — P0 Phase 1 #4"
```

---

## Task 5: MCQ / Quiz Widget

Multiple-choice question renderer. 2-6 options. Single- or multi-select. Optional correct-answer scoring with green-check / red-X animation. Optional image per option.

**From CSV:**
> Multiple-choice question renderer. Displays a question with 2-6 answer options. Supports single-select (radio) and multi-select (checkbox). Answer captured, scored against rubric if configured, result displayed. Question text: 16px, medium weight. Options: card-style with subtle border, 14px. Selected state: filled accent color. Correct/incorrect: green check / red X animation. Support optional image per option. Progress indicator if part of a quiz set (Q3 of 10).

**Input:** User taps option(s). If multi-select, taps Submit.
**Output:** `{ question_id, selected_options: [value], is_correct: boolean (if scored), score?: number, time_taken_seconds?: number }`
**Use cases:** Recruitment screening, skills assessment, training quizzes.

**Config schema:**
```js
{
  type: 'mcq',
  payload: {
    widget_id: string,
    question_id: string,
    question: string,
    options: [{ label, value, image_url? }],
    mode: 'single' | 'multi',
    scored?: boolean,
    correct_answers?: [value],        // required if scored
    progress?: { index: number, total: number }  // optional Q3-of-10 indicator
  }
}
```

**Nexus atoms used:** `RadioGroup`, `RadioItem`, `Checkbox`, `Button`, `Badge`.

**Viewport adaptation:** Options always stack vertically (cards). On mobile, images scale to fit.

**Files:** `src/widgets/McqQuiz.jsx` + `mcqQuiz.module.scss` + three one-line updates.

- [ ] **Step 1: SCSS:**

```scss
.card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 12px;
  max-width: 92%;
}

.progress {
  font-size: 11px;
  color: var(--grey-50);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.question {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--grey-90);
  margin: 0;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--grey-10);
  border-radius: 8px;
  background: var(--grey-0);
  cursor: pointer;
  text-align: left;
  transition: background 120ms ease, border-color 120ms ease;
}

.option:hover:not(.submitted) {
  background: var(--white);
  border-color: var(--grey-20);
}

.option.selected {
  border-color: var(--blue-60);
  background: var(--blue-10, #ecf2ff);
}

.option.correct {
  border-color: var(--green-60, #1f9e55);
  background: var(--green-10, #e9f9ee);
}

.option.incorrect {
  border-color: var(--red-60, #d04a3a);
  background: var(--red-10, #fdecea);
}

.optionImage {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
}

.optionLabel {
  flex: 1;
  font-size: 14px;
  color: var(--grey-90);
}

.verdictIcon {
  flex-shrink: 0;
}

.submitBar {
  display: flex;
  justify-content: flex-end;
}
```

- [ ] **Step 2: JSX:**

```jsx
import { useState } from 'react'
import cx from 'classnames'
import { Check, X } from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './mcqQuiz.module.scss'

export function McqQuiz({ payload }) {
  const { onReply } = useChatActions()
  const [selected, setSelected] = useState(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [startedAt] = useState(() => Date.now())

  const mode = payload?.mode ?? 'single'
  const options = payload?.options ?? []
  const correctSet = new Set(payload?.correct_answers ?? [])
  const scored = !!payload?.scored

  const toggle = (value) => {
    if (submitted) return
    if (mode === 'single') {
      setSelected(new Set([value]))
      emitAnswer(new Set([value]))
      return
    }
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    setSelected(next)
  }

  const emitAnswer = (finalSet) => {
    setSubmitted(true)
    const selectedValues = Array.from(finalSet)
    const isCorrect = scored
      ? selectedValues.length === correctSet.size &&
        selectedValues.every((v) => correctSet.has(v))
      : undefined
    const score = scored ? (isCorrect ? 1 : 0) : undefined
    const labelOfFirst = options.find((o) => o.value === selectedValues[0])?.label ?? ''
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'mcq',
        source_widget_id: payload?.widget_id,
        data: {
          label: mode === 'single'
            ? labelOfFirst
            : selectedValues.map((v) => options.find((o) => o.value === v)?.label).filter(Boolean).join(', '),
          question_id: payload?.question_id,
          selected_options: selectedValues,
          is_correct: isCorrect,
          score,
          time_taken_seconds: Math.round((Date.now() - startedAt) / 1000),
        },
      },
    })
  }

  const submitMulti = () => {
    if (!selected.size) return
    emitAnswer(selected)
  }

  const verdictFor = (option) => {
    if (!submitted || !scored) return null
    if (correctSet.has(option.value)) return 'correct'
    if (selected.has(option.value)) return 'incorrect'
    return null
  }

  return (
    <div className={styles.card}>
      {payload?.progress && (
        <div className={styles.progress}>
          Question {payload.progress.index} of {payload.progress.total}
        </div>
      )}
      <p className={styles.question}>{payload?.question}</p>
      <div className={styles.options}>
        {options.map((option) => {
          const isSelected = selected.has(option.value)
          const verdict = verdictFor(option)
          return (
            <button
              type="button"
              key={option.value}
              className={cx(
                styles.option,
                isSelected && !submitted && styles.selected,
                verdict === 'correct' && styles.correct,
                verdict === 'incorrect' && styles.incorrect,
                submitted && styles.submitted,
              )}
              onClick={() => toggle(option.value)}
              disabled={submitted}
            >
              {option.image_url && (
                <img className={styles.optionImage} src={option.image_url} alt="" />
              )}
              <span className={styles.optionLabel}>{option.label}</span>
              {verdict === 'correct' && <Check size={16} className={styles.verdictIcon} />}
              {verdict === 'incorrect' && <X size={16} className={styles.verdictIcon} />}
            </button>
          )
        })}
      </div>
      {mode === 'multi' && !submitted && (
        <div className={styles.submitBar}>
          <Button variant="primary" size="sm" disabled={selected.size === 0} onClick={submitMulti}>
            Submit ({selected.size})
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3–5: Registry, schema, mock bot rule:**

```js
// registry.js
import { McqQuiz } from '../widgets/McqQuiz.jsx'
mcq: McqQuiz,

// widgetSchemas.js
mcq: {
  label: 'MCQ / Quiz',
  examplePayload: {
    widget_id: 'mcq-example-1',
    question_id: 'q-training-07',
    question: 'Which of these is the correct shelf arrangement?',
    options: [
      { label: 'Heaviest items on the top shelf',     value: 'top' },
      { label: 'Heaviest items on the middle shelf',  value: 'middle' },
      { label: 'Heaviest items on the bottom shelf',  value: 'bottom' },
    ],
    mode: 'single',
    scored: true,
    correct_answers: ['bottom'],
    progress: { index: 3, total: 10 },
  },
},

// mockBot.js
registerRule({
  match: /^(show )?(mcq|quiz)/i,
  build: () => ({
    type: 'mcq',
    payload: {
      widget_id: makeId('mcq'),
      question_id: makeId('q'),
      question: 'Pick the correct answer:',
      options: [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
        { label: 'Option C', value: 'c' },
      ],
      mode: 'single',
      scored: true,
      correct_answers: ['b'],
    },
  }),
})
```

- [ ] **Step 6–7: Verify & commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): MCQ / Quiz — P0 Phase 1 #5"
```

---

## Task 6: Form Widget

Compact multi-field form rendered as a single chat message. Supports text/number/date/dropdown/phone/email/pincode. Real-time per-field validation. Collapse-to-summary on submit.

**From CSV:**
> Compact multi-field form rendered as a single chat message. Fields: name, address, DOB, phone, email, bank details. Each field has type (text, number, date, dropdown) and validation. User fills all fields and submits once. Clean form layout. Labels above inputs. Required fields: asterisk indicator. Validation: inline error messages below field in red. Submit button: full-width, primary color. After submit: collapsed summary with edit option.

**Input:** User fills and submits.
**Output:** `{ form_id, fields: { name: value }, submitted_at, validation_status: 'valid' | 'partial' }`
**Use cases:** Onboarding, candidate registration, profile completion, KYC.

**Config schema:**
```js
{
  type: 'form',
  payload: {
    widget_id: string,
    form_id: string,
    fields: [{
      name: string,
      label: string,
      type: 'text' | 'number' | 'date' | 'email' | 'phone' | 'pincode' | 'dropdown',
      required?: boolean,
      placeholder?: string,
      options?: [{ label, value }]       // for dropdown
    }],
    submit_label?: string
  }
}
```

**Nexus atoms used:** `InputField` or `FormField` (whichever provides label+input+error shell), `Input`, `Select/SelectTrigger/SelectContent/SelectItem`, `Button`.

**Viewport adaptation:** No special — inputs already stack vertically. Submit button is always full-width.

**Files:** `src/widgets/FormWidget.jsx` + `formWidget.module.scss` + three one-line updates.

**Decision — which Nexus atom to use for each field:** we use plain `Input` and `Select` directly, and own the `label`/`error` markup in our own SCSS module. `FormField`/`InputField` atoms exist but introduce extra constraints (specific label + help-text slots) that would make per-field validation harder to coordinate with our controlled `values`/`errors` state. Keep the composition in the widget.

- [ ] **Step 1: SCSS:**

```scss
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 12px;
  max-width: 92%;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 12px;
  font-weight: 500;
  color: var(--grey-80);
}

.required {
  color: var(--red-60, #d04a3a);
  margin-left: 2px;
}

.error {
  font-size: 11px;
  color: var(--red-60, #d04a3a);
}

.submit {
  width: 100%;
  margin-top: 4px;
}

.summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--grey-0);
  border: 1px solid var(--grey-10);
  border-radius: 10px;
  max-width: 92%;
}

.summaryTitle {
  font-size: 13px;
  font-weight: 600;
  color: var(--grey-90);
}

.summaryRow {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--grey-70);
  gap: 12px;
}

.summaryRow strong {
  color: var(--grey-90);
  font-weight: 500;
}
```

- [ ] **Step 2: JSX:**

```jsx
import { useMemo, useState } from 'react'
import { Button, Input, Select, SelectTrigger, SelectContent, SelectItem } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './formWidget.module.scss'

const VALIDATORS = {
  text:    (v) => (!v ? 'This field is required.' : null),
  number:  (v) => (!/^\d+(\.\d+)?$/.test(v) ? 'Enter a valid number.' : null),
  date:    (v) => (!/^\d{4}-\d{2}-\d{2}$/.test(v) ? 'Enter date as YYYY-MM-DD.' : null),
  email:   (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email.' : null),
  phone:   (v) => (!/^\+?\d{10,15}$/.test(v.replace(/\s/g, '')) ? 'Enter a valid phone number.' : null),
  pincode: (v) => (!/^\d{6}$/.test(v) ? 'Enter a 6-digit pincode.' : null),
}

function validate(field, value) {
  if (!field.required && (!value || value === '')) return null
  if (field.type === 'dropdown') return !value ? 'Please choose an option.' : null
  const fn = VALIDATORS[field.type] ?? VALIDATORS.text
  return fn(String(value ?? ''))
}

export function FormWidget({ payload }) {
  const { onReply } = useChatActions()
  const fields = payload?.fields ?? []

  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, '']))
  )
  const [errors, setErrors] = useState({})
  const [submittedValues, setSubmittedValues] = useState(null)

  const isValid = useMemo(
    () => fields.every((f) => !validate(f, values[f.name])),
    [fields, values],
  )

  const update = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: null }))
  }

  const blur = (field) => {
    setErrors((prev) => ({ ...prev, [field.name]: validate(field, values[field.name]) }))
  }

  const submit = () => {
    const nextErrors = {}
    for (const f of fields) {
      const err = validate(f, values[f.name])
      if (err) nextErrors[f.name] = err
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmittedValues({ ...values })
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'form',
        source_widget_id: payload?.widget_id,
        data: {
          label: 'Submitted form',
          form_id: payload?.form_id,
          fields: { ...values },
          submitted_at: Date.now(),
          validation_status: 'valid',
        },
      },
    })
  }

  if (submittedValues) {
    return (
      <div className={styles.summary}>
        <div className={styles.summaryTitle}>Form submitted</div>
        {fields.map((f) => (
          <div key={f.name} className={styles.summaryRow}>
            <span>{f.label}</span>
            <strong>{submittedValues[f.name] || '—'}</strong>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.card}>
      {fields.map((field) => (
        <div key={field.name} className={styles.field}>
          <label className={styles.label}>
            {field.label}
            {field.required && <span className={styles.required}>*</span>}
          </label>

          {field.type === 'dropdown' ? (
            <Select value={values[field.name]} onValueChange={(v) => update(field.name, v)}>
              <SelectTrigger size="md" placeholder={field.placeholder ?? 'Select...'} />
              <SelectContent>
                {(field.options ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={values[field.name]}
              placeholder={field.placeholder}
              onChange={(e) => update(field.name, e.target.value)}
              onBlur={() => blur(field)}
              error={!!errors[field.name]}
            />
          )}

          {errors[field.name] && <div className={styles.error}>{errors[field.name]}</div>}
        </div>
      ))}
      <Button
        className={styles.submit}
        variant="primary"
        size="md"
        disabled={!isValid}
        onClick={submit}
      >
        {payload?.submit_label ?? 'Submit'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 3–5: Registry, schema, mock bot rule:**

```js
// registry.js
import { FormWidget } from '../widgets/FormWidget.jsx'
form: FormWidget,

// widgetSchemas.js
form: {
  label: 'Form',
  examplePayload: {
    widget_id: 'form-example-1',
    form_id: 'kyc-basic',
    fields: [
      { name: 'full_name',  label: 'Full name',       type: 'text',     required: true },
      { name: 'dob',        label: 'Date of birth',   type: 'date',     required: true, placeholder: 'YYYY-MM-DD' },
      { name: 'phone',      label: 'Phone number',    type: 'phone',    required: true, placeholder: '+91…' },
      { name: 'email',      label: 'Email',           type: 'email',    required: false },
      { name: 'city',       label: 'City',            type: 'dropdown', required: true,
        options: [
          { label: 'Bangalore', value: 'BLR' },
          { label: 'Mumbai',    value: 'BOM' },
          { label: 'Delhi',     value: 'DEL' },
        ] },
    ],
    submit_label: 'Continue',
  },
},

// mockBot.js
registerRule({
  match: /^(show )?form/i,
  build: () => ({
    type: 'form',
    payload: {
      widget_id: makeId('form'),
      form_id: makeId('f'),
      fields: [
        { name: 'name',  label: 'Name',  type: 'text',  required: true },
        { name: 'phone', label: 'Phone', type: 'phone', required: true },
      ],
      submit_label: 'Submit',
    },
  }),
})
```

- [ ] **Step 6–7: Verify & commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): Form — P0 Phase 1 #6"
```

---

## Task 7: Job Card Widget (with Carousel variant)

Visually rich card for a job opportunity. Supports single-card or array-of-cards (carousel with snap-scroll).

**From CSV:**
> Visually rich card displaying a job opportunity. Structured fields: job title, company (with logo), location with distance, pay rate, shift timing, key requirements (2-3 bullets), and action buttons (Apply, Save, Not Interested). Carousel mode for multiple jobs (swipe horizontally). Card with subtle shadow/border, rounded corners. Company logo top-left (32x32). Title: 16px bold. Pay: accent color, prominent. Location: with map pin icon + distance. Requirements: compact bullet list. Action buttons: full-width at bottom. In carousel: peek next card edge to signal swipability.

**Input:** User taps Apply / Save / Not Interested / View Details.
**Output:** `{ job_id, action: 'apply' | 'save' | 'dismiss' | 'view_details', timestamp }`
**Use cases:** Job recommendations (Troopers, OkayGo), re-engagement.

**Config schema — single:**
```js
{
  type: 'job_card',
  payload: {
    widget_id: string,
    job_id: string,
    title: string,
    company: { name, logo_url? },
    location: { name, distance_km? },
    pay: { amount: string, period: string },
    timing?: string,
    requirements?: [string],
    actions: ['apply' | 'save' | 'dismiss' | 'view_details', ...]
  }
}
```

**Config schema — carousel:**
```js
{
  type: 'job_card',
  payload: {
    widget_id: string,
    items: [ /* array of the single-card payloads above, minus the outer widget_id */ ]
  }
}
```
The widget renders a carousel automatically when `payload.items` is an array.

**Nexus atoms used:** `Button`, `Card` (molecule), `Tag` (for requirements chips), `Avatar` (for company logo).

**Viewport adaptation:** Mobile — horizontal snap-scroll with next-card peek. Desktop — snap-scroll with arrow buttons (left/right chevrons) visible.

**Files:** `src/widgets/JobCard.jsx` + `jobCard.module.scss` + updates.

- [ ] **Step 1: SCSS:**

```scss
.carousel {
  display: flex;
  gap: 10px;
  padding-bottom: 6px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  max-width: 100%;

  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: var(--grey-20); border-radius: 2px; }
}

.card {
  flex: 0 0 88%;
  scroll-snap-align: center;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.card.single {
  flex: 0 0 auto;
  max-width: 92%;
}

.cardHead {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.logo {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 8px;
  border: 1px solid var(--grey-10);
  background: var(--grey-0);
  object-fit: contain;
}

.headText {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--grey-90);
  line-height: 1.3;
  margin: 0;
}

.company {
  font-size: 12px;
  color: var(--grey-60);
}

.pay {
  font-size: 16px;
  font-weight: 700;
  color: var(--blue-60);
  font-variant-numeric: tabular-nums;
}

.payPeriod {
  font-size: 12px;
  color: var(--grey-60);
  margin-left: 4px;
  font-weight: 400;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--grey-70);
}

.metaItem {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.requirements {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--grey-80);
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.actionPrimary {
  flex: 1;
}

.actionSecondary {
  flex: 0 0 auto;
}
```

- [ ] **Step 2: JSX:**

```jsx
import { useState } from 'react'
import cx from 'classnames'
import { MapPin, Clock } from 'lucide-react'
import { Button } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './jobCard.module.scss'

const ACTION_META = {
  apply:         { label: 'Apply',         variant: 'primary',   primary: true },
  save:          { label: 'Save',          variant: 'secondary', primary: false },
  dismiss:       { label: 'Not interested', variant: 'secondary', primary: false },
  view_details:  { label: 'View details',  variant: 'secondary', primary: false },
}

function SingleJob({ job, sourceWidgetId, singleMode }) {
  const { onReply } = useChatActions()
  const [actedOn, setActedOn] = useState(null)

  const fire = (action) => {
    if (actedOn) return
    setActedOn(action)
    const meta = ACTION_META[action]
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'job_card',
        source_widget_id: sourceWidgetId,
        data: {
          label: `${meta.label}: ${job.title}`,
          job_id: job.job_id,
          action,
          timestamp: Date.now(),
        },
      },
    })
  }

  return (
    <article className={cx(styles.card, singleMode && styles.single)}>
      <div className={styles.cardHead}>
        {job.company?.logo_url ? (
          <img className={styles.logo} src={job.company.logo_url} alt={job.company.name ?? ''} />
        ) : (
          <div className={styles.logo} />
        )}
        <div className={styles.headText}>
          <h3 className={styles.title}>{job.title}</h3>
          <span className={styles.company}>{job.company?.name}</span>
        </div>
      </div>

      <div className={styles.pay}>
        {job.pay?.amount}
        <span className={styles.payPeriod}>/ {job.pay?.period ?? 'month'}</span>
      </div>

      <div className={styles.meta}>
        {job.location?.name && (
          <span className={styles.metaItem}>
            <MapPin size={12} />
            {job.location.name}
            {typeof job.location.distance_km === 'number' &&
              ` · ${job.location.distance_km.toFixed(1)} km`}
          </span>
        )}
        {job.timing && (
          <span className={styles.metaItem}>
            <Clock size={12} />
            {job.timing}
          </span>
        )}
      </div>

      {job.requirements?.length > 0 && (
        <ul className={styles.requirements}>
          {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}

      <div className={styles.actions}>
        {(job.actions ?? ['apply']).map((action) => {
          const meta = ACTION_META[action] ?? { label: action, variant: 'secondary' }
          return (
            <Button
              key={action}
              className={meta.primary ? styles.actionPrimary : styles.actionSecondary}
              variant={meta.variant}
              size="sm"
              disabled={actedOn !== null}
              onClick={() => fire(action)}
            >
              {meta.label}
            </Button>
          )
        })}
      </div>
    </article>
  )
}

export function JobCard({ payload }) {
  const isCarousel = Array.isArray(payload?.items)

  if (!isCarousel) {
    return (
      <SingleJob
        job={payload}
        sourceWidgetId={payload?.widget_id}
        singleMode
      />
    )
  }

  return (
    <div className={styles.carousel}>
      {payload.items.map((job) => (
        <SingleJob
          key={job.job_id}
          job={job}
          sourceWidgetId={payload.widget_id}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3–5: Registry, schema, mock bot rule:**

```js
// registry.js
import { JobCard } from '../widgets/JobCard.jsx'
job_card: JobCard,

// widgetSchemas.js
job_card: {
  label: 'Job Card',
  examplePayload: {
    widget_id: 'job-example-1',
    job_id: 'job-da-101',
    title: 'Delivery Associate',
    company: { name: 'OkayGo Logistics', logo_url: 'https://placehold.co/80x80/png' },
    location: { name: 'Koramangala, Bangalore', distance_km: 3.2 },
    pay: { amount: '₹850', period: 'day' },
    timing: '9am – 6pm',
    requirements: [
      '2+ years two-wheeler experience',
      'Android smartphone',
      'Valid driving licence',
    ],
    actions: ['apply', 'save', 'dismiss'],
  },
},

// mockBot.js
registerRule({
  match: /^(show )?job/i,
  build: () => ({
    type: 'job_card',
    payload: {
      widget_id: makeId('job'),
      items: [
        {
          job_id: makeId('j'),
          title: 'Warehouse Associate',
          company: { name: 'BetterDelivery' },
          location: { name: 'HSR Layout', distance_km: 1.8 },
          pay: { amount: '₹780', period: 'day' },
          timing: '8am – 4pm',
          requirements: ['Physically fit', 'Basic English reading'],
          actions: ['apply', 'save'],
        },
        {
          job_id: makeId('j'),
          title: 'Delivery Rider',
          company: { name: 'BetterDelivery' },
          location: { name: 'Indiranagar', distance_km: 4.5 },
          pay: { amount: '₹920', period: 'day' },
          timing: '10am – 7pm',
          requirements: ['Own two-wheeler', '1+ year experience'],
          actions: ['apply', 'save', 'dismiss'],
        },
        {
          job_id: makeId('j'),
          title: 'Packer',
          company: { name: 'BetterDelivery' },
          location: { name: 'Whitefield', distance_km: 11.2 },
          pay: { amount: '₹700', period: 'day' },
          timing: '2pm – 10pm',
          requirements: ['Night shift OK'],
          actions: ['apply', 'dismiss'],
        },
      ],
    },
  }),
})
```

- [ ] **Step 6–7: Verify & commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): Job Card + carousel — P0 Phase 1 #7"
```

---

## Task 8: Document Preview Card

Split layout: document thumbnail on one side, extracted fields with per-field confidence indicators on the other. User can edit any field and Confirm.

**From CSV:**
> Thumbnail preview of uploaded document alongside extracted structured data. Shows document image on one side, extracted fields on other (Name, Number, DOB) with confidence indicators per field (green=high, amber=needs review). User can confirm or correct. Split layout: document thumbnail (left/top) and extracted fields (right/bottom). Each field shows: label, extracted value (editable on tap), confidence badge (green/amber/red). User can tap any value to edit it. 'Confirm All' button at bottom.

**Input:** Review, edit, confirm.
**Output:** `{ document_id, confirmed_fields: { name: { value, edited } }, confirmed_at }`
**Use cases:** BGV document verification, onboarding KYC.

**Config schema:**
```js
{
  type: 'document_preview',
  payload: {
    widget_id: string,
    document_id: string,
    image_url: string,
    fields: [{
      name: string,
      label: string,
      value: string,
      confidence: number,           // 0..1
      editable?: boolean
    }],
    confirm_label?: string,
    confidence_threshold?: number    // default: 0.7 — fields below this are amber-highlighted
  }
}
```

**Nexus atoms used:** `Input`, `Badge`, `Button`, `Image`.

**Viewport adaptation:** On mobile, split is top/bottom (image above fields). On desktop, side-by-side.

**Files:** `src/widgets/DocumentPreview.jsx` + `documentPreview.module.scss` + updates.

- [ ] **Step 1: SCSS:**

```scss
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 12px;
  max-width: 94%;
}

.split {
  display: flex;
  gap: 12px;
}

.split.vertical {
  flex-direction: column;
}

.split.horizontal {
  flex-direction: row;
}

.imageWrap {
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--grey-10);
  background: var(--grey-0);
}

.split.vertical .imageWrap {
  width: 100%;
  max-height: 160px;
}

.split.horizontal .imageWrap {
  width: 40%;
  max-height: 260px;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: var(--grey-0);
  border: 1px solid transparent;
  border-radius: 8px;
}

.field.lowConfidence {
  background: var(--yellow-10, #fff6d5);
  border-color: var(--yellow-60, #b88a00);
}

.fieldHead {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--grey-60);
}

.confidenceBadge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 9999px;
}

.confidenceBadge.high   { background: var(--green-10, #e9f9ee); color: var(--green-60, #1f9e55); }
.confidenceBadge.medium { background: var(--yellow-10, #fff6d5); color: var(--yellow-60, #b88a00); }
.confidenceBadge.low    { background: var(--red-10,   #fdecea); color: var(--red-60,   #d04a3a); }

.fieldValue {
  font-size: 14px;
  color: var(--grey-90);
  font-weight: 500;
}

.confirmButton {
  width: 100%;
}

.confirmed {
  text-align: center;
  font-size: 12px;
  color: var(--grey-60);
  padding: 6px;
}
```

- [ ] **Step 2: JSX:**

```jsx
import { useState } from 'react'
import cx from 'classnames'
import { Button, Input } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './documentPreview.module.scss'

function bandForConfidence(confidence) {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}

export function DocumentPreview({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const threshold = payload?.confidence_threshold ?? 0.7
  const [values, setValues] = useState(() =>
    Object.fromEntries((payload?.fields ?? []).map((f) => [f.name, f.value ?? '']))
  )
  const [editedSet, setEditedSet] = useState(() => new Set())
  const [confirmed, setConfirmed] = useState(false)

  const update = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setEditedSet((prev) => {
      const next = new Set(prev)
      next.add(name)
      return next
    })
  }

  const confirmAll = () => {
    if (confirmed) return
    setConfirmed(true)
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'document_preview',
        source_widget_id: payload?.widget_id,
        data: {
          label: 'Document details confirmed',
          document_id: payload?.document_id,
          confirmed_fields: Object.fromEntries(
            Object.entries(values).map(([k, v]) => [k, { value: v, edited: editedSet.has(k) }])
          ),
          confirmed_at: Date.now(),
        },
      },
    })
  }

  const orientation = viewport === 'mobile' ? 'vertical' : 'horizontal'

  return (
    <div className={styles.card}>
      <div className={cx(styles.split, styles[orientation])}>
        <div className={styles.imageWrap}>
          {payload?.image_url && (
            <img className={styles.image} src={payload.image_url} alt="Document preview" />
          )}
        </div>
        <div className={styles.fields}>
          {(payload?.fields ?? []).map((field) => {
            const band = bandForConfidence(field.confidence)
            const low = field.confidence < threshold
            return (
              <div key={field.name} className={cx(styles.field, low && styles.lowConfidence)}>
                <div className={styles.fieldHead}>
                  <span>{field.label}</span>
                  <span className={cx(styles.confidenceBadge, styles[band])}>
                    {Math.round(field.confidence * 100)}%
                  </span>
                </div>
                {field.editable !== false && !confirmed ? (
                  <Input
                    value={values[field.name]}
                    onChange={(e) => update(field.name, e.target.value)}
                  />
                ) : (
                  <div className={styles.fieldValue}>{values[field.name]}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {confirmed ? (
        <div className={styles.confirmed}>
          Confirmed — {editedSet.size} of {payload?.fields?.length ?? 0} fields edited
        </div>
      ) : (
        <Button
          className={styles.confirmButton}
          variant="primary"
          size="md"
          onClick={confirmAll}
        >
          {payload?.confirm_label ?? 'Confirm all'}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 3–5: Registry, schema, mock bot rule:**

```js
// registry.js
import { DocumentPreview } from '../widgets/DocumentPreview.jsx'
document_preview: DocumentPreview,

// widgetSchemas.js
document_preview: {
  label: 'Document Preview',
  examplePayload: {
    widget_id: 'doc-example-1',
    document_id: 'aadhaar-12345',
    image_url: 'https://placehold.co/600x380/png',
    fields: [
      { name: 'name',   label: 'Full name',     value: 'PRIYA SHARMA',   confidence: 0.96, editable: true },
      { name: 'number', label: 'Aadhaar',       value: '1234 5678 9012', confidence: 0.88, editable: true },
      { name: 'dob',    label: 'Date of birth', value: '15/08/1994',     confidence: 0.62, editable: true },
      { name: 'gender', label: 'Gender',        value: 'Female',         confidence: 0.99, editable: true },
    ],
    confirm_label: 'Confirm details',
    confidence_threshold: 0.7,
  },
},

// mockBot.js
registerRule({
  match: /^(show )?(doc(ument)?|preview|kyc)/i,
  build: () => ({
    type: 'document_preview',
    payload: {
      widget_id: makeId('doc'),
      document_id: makeId('d'),
      image_url: 'https://placehold.co/600x380/png',
      fields: [
        { name: 'name',   label: 'Name',   value: 'Demo User', confidence: 0.92, editable: true },
        { name: 'number', label: 'Number', value: 'XX-1234',   confidence: 0.55, editable: true },
      ],
    },
  }),
})
```

- [ ] **Step 6–7: Verify & commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): Document Preview — P0 Phase 1 #8"
```

---

## Task 9: QC Evidence Review Widget

Specialised admin-facing widget showing a worker's submitted photo with AI-generated annotations (bounding boxes overlaid on the image), per-criterion verdicts, overall pass/fail with confidence, optional expandable reasoning, and admin action buttons.

**From CSV:**
> Specialized image display showing worker's submitted photo with AI-generated annotations. Shows: original photo, highlighted regions (bounding boxes around products, shelves, signage), per-criterion verdicts, overall pass/fail with confidence, expandable AI reasoning. Full-width image display with overlay annotations. Bounding boxes: colored borders around evaluated regions (green=pass, red=fail). Below image: criterion list with per-item verdict. Overall verdict badge. Expandable reasoning. Admin mode: action buttons below.

**Input:** Admin taps Approve / Reject / Request Resubmission. Optional notes field.
**Output:** `{ submission_id, verdict: 'approve' | 'reject' | 'resubmit', reviewer_notes?: string, timestamp }`
**Use cases:** OkayGo task QC results, quality feedback to workers, training content.

**Config schema:**
```js
{
  type: 'qc_review',
  payload: {
    widget_id: string,
    submission_id: string,
    image_url: string,
    annotations?: [{
      region: { x, y, w, h },         // values in 0..1 (normalised)
      label: string,
      verdict: 'pass' | 'fail'
    }],
    criteria: [{
      name: string,
      verdict: 'pass' | 'fail',
      reasoning?: string
    }],
    overall_verdict: 'pass' | 'fail' | 'needs_review',
    confidence?: number,              // 0..1
    mode: 'admin' | 'worker',
    actions?: ['approve', 'reject', 'resubmit']
  }
}
```

**Nexus atoms used:** `Button`, `Badge`, `Textarea` (for notes), `Image`.

**Viewport adaptation:** Image scales to container width. Annotations scale proportionally. Actions stack vertically on mobile.

**Files:** `src/widgets/QcEvidenceReview.jsx` + `qcEvidenceReview.module.scss` + updates.

- [ ] **Step 1: SCSS:**

```scss
.card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 12px;
  max-width: 94%;
}

.imageWrap {
  position: relative;
  width: 100%;
  background: var(--grey-90);
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.verdictStamp {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--white);
}

.verdictStamp.pass         { background: var(--green-60, #1f9e55); }
.verdictStamp.fail         { background: var(--red-60, #d04a3a); }
.verdictStamp.needs_review { background: var(--yellow-60, #b88a00); }

.confidence {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: var(--white);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.annotation {
  position: absolute;
  border: 2px solid transparent;
  border-radius: 3px;
  pointer-events: none;
}

.annotation.pass { border-color: var(--green-60, #1f9e55); background: rgba(31, 158, 85, 0.15); }
.annotation.fail { border-color: var(--red-60,   #d04a3a); background: rgba(208, 74, 58, 0.15); }

.annotationLabel {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(-100%);
  background: inherit;
  padding: 1px 4px;
  font-size: 10px;
  color: var(--white);
  border-radius: 2px 2px 0 0;
}

.annotation.pass .annotationLabel { background: var(--green-60, #1f9e55); }
.annotation.fail .annotationLabel { background: var(--red-60,   #d04a3a); }

.criteria {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.criterion {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--grey-0);
}

.criterionHead {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--grey-90);
}

.criterionVerdict {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
}

.criterionVerdict.pass { color: var(--green-60, #1f9e55); }
.criterionVerdict.fail { color: var(--red-60,   #d04a3a); }

.reasoningToggle {
  background: transparent;
  border: none;
  color: var(--grey-60);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  text-align: left;
  text-decoration: underline;
}

.reasoning {
  font-size: 12px;
  color: var(--grey-70);
  line-height: 1.4;
  padding: 6px 8px;
  background: var(--grey-0);
  border-radius: 4px;
}

.notes {
  margin-top: 4px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.actions.vertical   { flex-direction: column; }
.actions.horizontal { flex-direction: row; justify-content: flex-end; flex-wrap: wrap; }
```

- [ ] **Step 2: JSX:**

```jsx
import { useState } from 'react'
import cx from 'classnames'
import { Check, X } from 'lucide-react'
import { Button, Textarea } from '@nexus/atoms'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './qcEvidenceReview.module.scss'

const ACTION_META = {
  approve:  { label: 'Approve',   variant: 'primary',   verdict: 'approve' },
  reject:   { label: 'Reject',    variant: 'secondary', verdict: 'reject' },
  resubmit: { label: 'Request resubmit', variant: 'secondary', verdict: 'resubmit' },
}

function CriterionRow({ criterion }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={styles.criterion}>
      <div className={styles.criterionHead}>
        <span>{criterion.name}</span>
        <span className={cx(styles.criterionVerdict, styles[criterion.verdict])}>
          {criterion.verdict === 'pass' ? <Check size={13} /> : <X size={13} />}
          {criterion.verdict}
        </span>
      </div>
      {criterion.reasoning && (
        <>
          <button
            type="button"
            className={styles.reasoningToggle}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Hide reasoning' : 'Why?'}
          </button>
          {expanded && <div className={styles.reasoning}>{criterion.reasoning}</div>}
        </>
      )}
    </div>
  )
}

export function QcEvidenceReview({ payload }) {
  const { onReply } = useChatActions()
  const { viewport } = useViewport()
  const [notes, setNotes] = useState('')
  const [actedOn, setActedOn] = useState(null)

  const annotations = payload?.annotations ?? []
  const mode = payload?.mode ?? 'worker'
  const actions = payload?.actions ?? (mode === 'admin' ? ['approve', 'reject', 'resubmit'] : [])
  const actionsOrientation = viewport === 'mobile' ? 'vertical' : 'horizontal'

  const fire = (actionKey) => {
    if (actedOn) return
    setActedOn(actionKey)
    const meta = ACTION_META[actionKey] ?? { verdict: actionKey, label: actionKey }
    onReply({
      type: 'widget_response',
      payload: {
        source_type: 'qc_review',
        source_widget_id: payload?.widget_id,
        data: {
          label: `${meta.label}${notes ? ' — ' + notes.slice(0, 60) : ''}`,
          submission_id: payload?.submission_id,
          verdict: meta.verdict,
          reviewer_notes: notes || undefined,
          timestamp: Date.now(),
        },
      },
    })
  }

  return (
    <div className={styles.card}>
      <div className={styles.imageWrap}>
        {payload?.image_url && (
          <img className={styles.image} src={payload.image_url} alt="Submission" />
        )}
        {payload?.overall_verdict && (
          <div className={cx(styles.verdictStamp, styles[payload.overall_verdict])}>
            {payload.overall_verdict.replace('_', ' ')}
          </div>
        )}
        {typeof payload?.confidence === 'number' && (
          <div className={styles.confidence}>
            Confidence: {Math.round(payload.confidence * 100)}%
          </div>
        )}
        {annotations.map((ann, i) => (
          <div
            key={i}
            className={cx(styles.annotation, styles[ann.verdict])}
            style={{
              left: `${ann.region.x * 100}%`,
              top: `${ann.region.y * 100}%`,
              width: `${ann.region.w * 100}%`,
              height: `${ann.region.h * 100}%`,
            }}
          >
            <span className={styles.annotationLabel}>{ann.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.criteria}>
        {(payload?.criteria ?? []).map((c) => (
          <CriterionRow key={c.name} criterion={c} />
        ))}
      </div>

      {mode === 'admin' && !actedOn && (
        <Textarea
          className={styles.notes}
          rows={2}
          placeholder="Reviewer notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      )}

      {actions.length > 0 && !actedOn && (
        <div className={cx(styles.actions, styles[actionsOrientation])}>
          {actions.map((actionKey) => {
            const meta = ACTION_META[actionKey] ?? { label: actionKey, variant: 'secondary' }
            return (
              <Button
                key={actionKey}
                variant={meta.variant}
                size="md"
                onClick={() => fire(actionKey)}
              >
                {meta.label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3–5: Registry, schema, mock bot rule:**

```js
// registry.js
import { QcEvidenceReview } from '../widgets/QcEvidenceReview.jsx'
qc_review: QcEvidenceReview,

// widgetSchemas.js
qc_review: {
  label: 'QC Evidence Review',
  examplePayload: {
    widget_id: 'qc-example-1',
    submission_id: 'sub-2026-04-21-abc',
    image_url: 'https://placehold.co/800x500/png',
    annotations: [
      { region: { x: 0.05, y: 0.15, w: 0.35, h: 0.30 }, label: 'Signage',       verdict: 'pass' },
      { region: { x: 0.45, y: 0.10, w: 0.40, h: 0.45 }, label: 'Shelf layout',  verdict: 'fail' },
      { region: { x: 0.15, y: 0.60, w: 0.60, h: 0.25 }, label: 'Product count', verdict: 'pass' },
    ],
    criteria: [
      { name: 'Location (GPS match)',   verdict: 'pass' },
      { name: 'Shelf arrangement',      verdict: 'fail', reasoning: 'Products not aligned per planogram; 3 SKUs in wrong row.' },
      { name: 'Signage visible',        verdict: 'pass' },
      { name: 'Product count',          verdict: 'pass' },
    ],
    overall_verdict: 'needs_review',
    confidence: 0.73,
    mode: 'admin',
    actions: ['approve', 'reject', 'resubmit'],
  },
},

// mockBot.js
registerRule({
  match: /^(show )?qc/i,
  build: () => ({
    type: 'qc_review',
    payload: {
      widget_id: makeId('qc'),
      submission_id: makeId('sub'),
      image_url: 'https://placehold.co/800x500/png',
      annotations: [
        { region: { x: 0.1, y: 0.2, w: 0.3, h: 0.3 }, label: 'Item A', verdict: 'pass' },
        { region: { x: 0.5, y: 0.3, w: 0.3, h: 0.4 }, label: 'Item B', verdict: 'fail' },
      ],
      criteria: [
        { name: 'Alignment', verdict: 'pass' },
        { name: 'Cleanliness', verdict: 'fail', reasoning: 'Debris visible on the floor.' },
      ],
      overall_verdict: 'fail',
      confidence: 0.81,
      mode: 'admin',
      actions: ['approve', 'reject', 'resubmit'],
    },
  }),
})
```

- [ ] **Step 6–7: Verify & commit**

```bash
npm run build
git add -A
git commit -m "feat(widget): QC Evidence Review — P0 Phase 1 #9"
```

---

## Wrap-up

After Task 9, the chat-pane registry contains:

```js
{
  text, widget_response,                          // baseline (scaffold)
  quick_reply, confirmation, progress, score_card,
  mcq, form, job_card, document_preview, qc_review, // this plan
}
```

The Studio Injector will list all nine widgets. `mockBot.js` has nine rules plus the default echo fallback. The scaffold patterns (`onReply` via context, rules table, widgetSchemas) are proven and can be reused by every future widget.

---

## Appendix A — Deferred widgets (follow-up plans)

**File Upload + Image Capture (real-device-API plan):**
- `file_upload` — `<input type="file">` + fake upload-progress timer, thumbnail via `URL.createObjectURL()`, Nexus `Dropzone` molecule.
- `image_capture` — `getUserMedia()` + `<video>` preview + `<canvas>` snapshot + CSS overlay guides. Optional face-detection library for selfie variant (deferred to v2 — MediaStream alone is sufficient for MVP).

**P1 widgets (separate plan):**
- Checklist, Rich Text / Instruction Card, Rating / Feedback, Validated Input, List / Carousel, Date/Time Picker, Training Scenario, Video Player, Comparison, Approval.

**P2 widgets (separate plan):**
- Location Picker, Signature Capture, Audio Player, Voice Recording, Embedded Webview, Payment / Earnings, Profile Card, Incentive / Leaderboard.
