# Chatbot UI Scaffold — Design

**Date:** 2026-04-21
**Status:** Approved (pending user review of this doc)
**Owner:** Atul Nayyar

## 1. Goal

Stand up a standalone React playground for iterating on **rich chat widgets** — the 30 widget types defined in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`. The playground provides the minimum chat shell (message list, input, typing indicator, mock bot) and the framework for registering/rendering widgets. It does **not** build the widgets themselves; those are follow-up work, one file per widget, added incrementally.

The UI is consumed by a single developer/designer locally. No auth, no backend, no persistence.

## 2. Non-Goals

Explicitly out of scope for this scaffold:

- Authentication, user identity, sessions
- Routing (single page only)
- Persistence — `localStorage`, DB, URL state (refresh = clean slate)
- Real LLM / backend / websockets
- Any of the 30 chat widgets beyond the baseline `TextMessage`
- Testing framework setup
- PWA / service worker / manifest
- TypeScript
- i18n / localisation
- Deployment / hosting config

## 3. Tech Stack

- **Build:** Vite
- **UI:** React 18 (JSX, no TypeScript)
- **Styling:** SCSS modules + `classnames`
- **Design system:** Nexus (`/Users/atulnayyar/Projects/nexus-design-system`) consumed via Vite path aliases — no build step on the Nexus side, direct source imports.
- **State:** React `useState` + a single `useBot` hook. No Redux, no Zustand.
- **IDs:** `uuid`

### Nexus integration

Vite aliases in `vite.config.js`:

```js
resolve: {
  alias: {
    '@nexus/atoms':     path.resolve(__dirname, '../nexus-design-system/src/atoms'),
    '@nexus/molecules': path.resolve(__dirname, '../nexus-design-system/src/molecules'),
    '@nexus/tokens':    path.resolve(__dirname, '../nexus-design-system/src/styles/tokens.scss'),
  },
}
```

Usage:
```js
import { Button, Avatar, Textarea, ToggleGroup } from '@nexus/atoms'
```
```scss
@use '@nexus/tokens' as *;
```

Nexus's runtime deps (`@radix-ui/*`, `lucide-react`, `classnames`, `sass`) are declared in this project's `package.json` so aliased atoms resolve correctly.

## 4. Page Layout

Desktop page. Two columns:

- **Left column — Chat surface.** Hosts the chat pane. Switches between two viewport modes (see §8):
  - **Mobile:** 390×844 rounded device frame, centered with generous page padding and a subtle shadow.
  - **Desktop:** card that fills the available width between the page edge and the Studio Panel, ~800px tall, no device frame.
- **Right column — Studio Panel** (~340px, collapsible to a narrow rail via a chevron button): viewport toggle, widget injector, JSON inspector, session controls.

Page background is a flat token colour from Nexus so the chat surface reads as a raised card.

## 5. Directory Layout

```
Chatbot UI/
├── index.html
├── package.json
├── vite.config.js
├── docs/superpowers/specs/…
└── src/
    ├── main.jsx
    ├── App.jsx                         # 2-column page layout + providers
    ├── app.module.scss
    ├── styles/
    │   ├── global.scss                 # resets + @use '@nexus/tokens'
    │   └── deviceFrame.module.scss     # mobile/desktop chat surface styles
    ├── chat/
    │   ├── ChatPane.jsx                # header + MessageList + MessageInput
    │   ├── chatPane.module.scss
    │   ├── ChatHeader.jsx
    │   ├── MessageList.jsx             # renders date dividers + renderer per msg
    │   ├── MessageRenderer.jsx         # dispatches on widget.type via registry
    │   ├── MessageInput.jsx            # Textarea + send Button
    │   ├── TypingIndicator.jsx
    │   └── registry.js                 # { text: TextMessage, ... }
    ├── widgets/
    │   ├── TextMessage.jsx             # baseline — typed text bubble
    │   ├── textMessage.module.scss
    │   ├── WidgetResponse.jsx          # baseline — renders a user tap/submit as a bubble
    │   └── widgetResponse.module.scss
    ├── engine/
    │   ├── useBot.js                   # messages + sendUserMessage/injectBotMessage/reset
    │   ├── mockBot.js                  # respond(userMessage) → botWidget
    │   └── widgetSchemas.js            # JSDoc shapes per widget type (from CSV)
    ├── viewport/
    │   ├── ViewportContext.jsx         # provider + useViewport()
    │   └── DeviceFrame.jsx             # wraps chat pane, applies mobile/desktop styles
    └── studio/
        ├── StudioPanel.jsx             # right dock, collapsible
        ├── studioPanel.module.scss
        ├── ViewportToggle.jsx          # ToggleGroup: Mobile | Desktop
        ├── Injector.jsx                # dropdown of registered types + JSON payload + inject
        ├── JsonInspector.jsx           # read-only live view of messages[]
        └── Controls.jsx                # Reset, typing toggle, latency slider
```

**Principle — flat widgets folder.** Every widget is one `.jsx` (+ optional `.module.scss`) at the top level of `src/widgets/`. No nested folders, no sub-packages. Keeps widget discovery trivial as the roster grows from 1 to 30.

## 6. Message Schema

Single message shape, extensible via `widget.type`:

```js
{
  id: string,                    // uuid v4
  role: 'user' | 'bot',
  timestamp: number,             // Date.now()
  widget: {
    type: string,                // 'text' now; 'quick_reply' | 'mcq' | 'job_card' | ... later
    payload: object              // shape per widget, matches CSV "Technical Notes" column
  }
}
```

**User-originated messages** take one of two forms:

- **Typed text:** `{role: 'user', widget: {type: 'text', payload: {text: '…'}}}`
- **Widget response** (tap / submit from a bot-sent widget): `{role: 'user', widget: {type: 'widget_response', payload: {source_widget_id, source_type, data}}}`. This matches the CSV "Output" column semantics — when the user taps a Quick Reply button, the payload carries the selected option and which widget it came from.

**Bot-originated messages** can use any registered widget type.

`widgetSchemas.js` holds JSDoc-style shape references per widget type, transcribed from the CSV "Technical Notes" column. Not runtime-enforced — it's documentation for the developer adding a widget.

## 7. Registry Pattern

`src/chat/registry.js`:

```js
import { TextMessage } from '../widgets/TextMessage'
import { WidgetResponse } from '../widgets/WidgetResponse'

export const registry = {
  text: TextMessage,
  widget_response: WidgetResponse,
  // future: quick_reply, mcq, job_card, form, confirmation, …
}
```

`WidgetResponse` renders a user-originated response to a bot widget as a simple outgoing bubble showing the human-readable label from `payload.data.label` (falling back to `JSON.stringify(payload.data)`). Needed so a tap from Quick Reply (or any future interactive widget) produces a visible user-side entry in the conversation.

`MessageRenderer` receives a message, looks up `registry[msg.widget.type]`, renders with `{payload, role, onReply}` props. Unknown types render a `FallbackUnknown` component showing the raw JSON and an inline warning — useful when the Studio Injector is used with a type that hasn't been registered yet.

**Adding a widget later** is always:
1. Create `src/widgets/WidgetName.jsx`.
2. Add one import and one key in `registry.js`.
3. (Optional) Add a rule to `mockBot.js` so a user message can trigger it.
4. (Optional) Add an example payload to `widgetSchemas.js` so the Injector prefills it.

No framework changes ever.

## 8. Viewport System

`ViewportContext` provides `{viewport: 'mobile' | 'desktop', setViewport}`. Default: `mobile` (matches the frontline use case the widgets are designed for).

`DeviceFrame` wraps `ChatPane` and applies the visual treatment:

- **Mobile:** fixed 390×844, border-radius, shadow, device-frame chrome. Overflow-hidden so widgets can't escape the phone viewport.
- **Desktop:** width fills remaining page column, max ~1000px, height ~800px, light card styling, no device frame.

Widgets that need to adapt (per CSV design notes — Quick Reply orientation, Progress Tracker orientation, Carousel swipe-vs-arrow, etc.) read the context:

```js
const viewport = useViewport()
return viewport === 'mobile' ? <MobileLayout /> : <DesktopLayout />
```

Widgets that don't care render identically in both.

The `ViewportToggle` (in the Studio Panel) uses Nexus `ToggleGroup` with two items: `📱 Mobile` and `🖥 Desktop`. Switching is instant — no animation required for the scaffold.

## 9. Engine

### `useBot` hook

Single source of truth for conversation state.

```js
const {
  messages,              // Message[]
  sendUserMessage,       // (widget) => void     pushes user msg, triggers bot
  injectBotMessage,      // (widget) => void     studio-only, bypasses mockBot
  reset,                 // () => void
  isBotTyping,           // boolean
  setBotTyping,          // (boolean) => void    manual override for testing
} = useBot({ latencyMs })
```

Flow of `sendUserMessage(widget)`:
1. Append user message with fresh uuid + timestamp.
2. Set `isBotTyping = true`.
3. Call `mockBot.respond(userMessage)` — returns a bot widget (or `null` for silence).
4. After `latencyMs` delay, append bot message and clear `isBotTyping`.

State lives in `useState` inside the hook; no external store. Lost on refresh.

### `mockBot.js`

Exports `respond(userMessage) → botWidget | null`. Initial implementation is a pure echo:

```js
export function respond(userMessage) {
  const text = userMessage.widget.payload?.text ?? '(non-text input)'
  return { type: 'text', payload: { text: `You said: ${text}` } }
}
```

As widgets are added, rules accrete here — e.g., `if text.includes('job')` → returns a `job_card` widget. The function stays pure and synchronous; latency is the hook's concern.

## 10. Studio Panel

Right-side dock, ~340px, collapsible via a chevron button that shrinks it to a 32px rail showing only the chevron (to reopen).

Top-to-bottom sections, each with a small section heading:

### 10.1 Viewport

Nexus `ToggleGroup`, two items: **📱 Mobile** (default) / **🖥 Desktop**. Writes to `ViewportContext`.

### 10.2 Injector

- `Select` (Nexus atom) of all keys in `registry` — starts with just `text`, grows automatically as widgets are added.
- `Textarea` prefilled with the example payload for the selected type (from `widgetSchemas.js`).
- `Button` — "Inject as bot". Calls `injectBotMessage({type, payload: JSON.parse(textarea)})`. Invalid JSON shows an inline error toast.
- Secondary `Button` — "Inject as user response" — same but as a user `widget_response` message. Useful for testing the bot's reaction to a specific widget output.

### 10.3 Inspector

Read-only `<pre>` block showing `JSON.stringify(messages, null, 2)`. Auto-scrolls to bottom on update. Monospace, Nexus token-derived colours. No syntax highlighter (keeps deps minimal); can be added later as a single component swap if needed.

### 10.4 Controls

- **Reset conversation** — `Button`, calls `reset()`.
- **Bot typing override** — `Switch` (Nexus atom) with three states via a tri-state derived from `null | true | false`: `Auto` (engine controls `isBotTyping`), `Force on`, `Force off`. When not on `Auto`, the override value is used regardless of what the engine sets. Implemented as a `Select` with three options rather than a binary Switch for clarity.
- **Latency** — `Slider` (Nexus atom), 0–3000ms, step 100ms, wired to the `useBot` hook's `latencyMs`.

## 11. Chat Pane Internals

- **Header** (`ChatHeader.jsx`): `Avatar` (Nexus, static placeholder image), name text "AI Lab", no back button (no routing). Subtle bottom border using a Nexus token.
- **Message list** (`MessageList.jsx`): scrollable, auto-scroll-to-bottom on new message. Inserts a date divider when the formatted date (`YYYY-MM-DD`) changes between messages. Renders `TypingIndicator` at the end when `isBotTyping`.
- **Message renderer** (`MessageRenderer.jsx`): looks up `registry[widget.type]` and renders it inside a wrapping `<div>` that applies role-based alignment (user = right-aligned, bot = left-aligned). Widgets themselves are alignment-agnostic.
- **Input** (`MessageInput.jsx`): Nexus `Textarea` (auto-growing, 1–4 rows) + send `Button`. Enter sends; Shift+Enter inserts newline. Disabled while `isBotTyping`. Empty/whitespace-only input is silently ignored.
- **Typing indicator** (`TypingIndicator.jsx`): three-dot animation in a bot-styled bubble.

## 12. Widget Roster (reference, not scaffold scope)

From `AI_Labs_Widget_Specification - Rich Chat Widgets.csv` — 30 widgets, built in follow-up work.

| Priority | Phase | Widget |
|---|---|---|
| P0 | 1 | Quick Reply Buttons, MCQ/Quiz, Job Card, File Upload, Image Capture, Progress Tracker, Form, Document Preview, Confirmation, Score Card, QC Evidence Review |
| P1 | 1 | Checklist, Instruction Card, Rating, Validated Input, Carousel, Shift Calendar |
| P1 | 1–2 | Date/Time Picker, Training Scenario |
| P1 | 2 | Video Player, Comparison, Approval |
| P2 | 2 | Location Picker, Signature, Audio Player, Voice Record, Embedded Webview, Profile Card |
| P2 | 2–3 | Earnings, Leaderboard |

Each widget's config schema, input/output, behaviour, and design notes are transcribed from the CSV into `widgetSchemas.js` as JSDoc comments during scaffolding, so Injector payload prefill works for every registered type from day one. (The widgets themselves remain unregistered until built.)

### Nexus coverage (spot-check of P0 widgets)

| Widget | Nexus building blocks |
|---|---|
| Quick Reply | `Button`, `ToggleGroup` |
| MCQ | `RadioGroup`, `Checkbox`, `Button` |
| Form | `InputField`, `Select`, `FormField`, `Button` |
| Progress Tracker | `Steps` (exists) |
| Score Card | `ProgressBar`, `Badge`, `Tag` |
| Confirmation | `Button`, `Checkbox` |
| File Upload | `Dropzone` molecule (exists) |
| Job Card | `Card` molecule, `Avatar`, `Button`, `Tag` |
| Document Preview | `Image`, `InputField`, `Badge` |

Roughly 80% of widget needs are already covered by Nexus atoms/molecules. Custom work will mostly be layout + state machines inside each widget, not new visual primitives.

## 13. Dependencies

Installed in `package.json`:

**Runtime:**
- `react` 18.2, `react-dom` 18.2
- `classnames`
- `uuid`
- `lucide-react` (Nexus's icon lib)
- All `@radix-ui/react-*` packages Nexus consumes (introspected from `nexus-design-system/package.json` during scaffold)

**Dev:**
- `vite`, `@vitejs/plugin-react`
- `sass`

No testing deps, no linters beyond whatever Vite sets up by default.

## 14. How This Scaffold Gets Extended

Each widget added later is a discrete PR:

1. Create `src/widgets/WidgetName.jsx` (one file, one SCSS module if needed).
2. Register in `src/chat/registry.js` (one import + one key).
3. Add example payload to `src/engine/widgetSchemas.js` (already stubbed from the CSV).
4. Optional: add a triggering rule to `src/engine/mockBot.js`.
5. Optional: if the widget needs viewport-adaptive behaviour, read `useViewport()`.

No framework code changes. No new engine capabilities. No new panels.

## 15. Risks & Open Questions

- **Nexus SCSS resolution.** Some Nexus atoms `@use` relative paths (`../../styles/tokens.scss`). Since we're aliasing `src/atoms` but not the whole `src/`, relative imports inside atoms should still resolve from the atom's own location (Sass follows the file's directory). To be verified during scaffold; if broken, fall back to aliasing Nexus's entire `src/` folder and importing atoms via `@nexus/src/atoms`.
- **Radix peer deps drift.** Installing Nexus's Radix packages into this project means two package trees. If versions drift, we'll see duplicate-provider bugs (Toast, Tooltip). Mitigation: pin exact versions matching Nexus's `package.json`; flag in a `POST_INSTALL.md` note for whoever upgrades later.
- **No widget built means no pattern validation.** Building zero widgets in this scaffold means the registry/engine contract is unexercised beyond `TextMessage`. Accepted risk — the user explicitly wants base-setup-only. First follow-up PR (any P0 widget) will surface any framework gaps.
