# Chatbot UI

Standalone playground for rich chat widgets (per the AI Labs widget spec). Uses the Nexus design system for primitive components.

## Prerequisites

- Node 18+ (Node 20 LTS recommended)
- The sibling `nexus-design-system` project must exist at `../nexus-design-system` relative to this repo (same parent folder).

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## What you get

- A mobile-framed chat pane (togglable to desktop width via the Studio panel).
- A baseline text-message widget + a user-side `widget_response` bubble.
- A mock echo bot with adjustable reply latency and a typing-indicator override.
- A widget Injector in the Studio panel for injecting arbitrary widget payloads.
- A live JSON Inspector of the message list.

## Project structure

See `docs/superpowers/specs/2026-04-21-chatbot-ui-scaffold-design.md` for the full architectural spec.

## Adding a new chat widget

1. Create `src/widgets/WidgetName.jsx` (and a `.module.scss` if you need one).
2. Register it in `src/chat/registry.js` (`{ your_type: WidgetName }`).
3. Add an example payload to `src/engine/widgetSchemas.js` so the Injector prefill works.
4. (Optional) Add a rule in `src/engine/mockBot.js` to trigger it from a user message.
5. (Optional) If the widget should adapt to mobile vs desktop, read `useViewport()`.

## Nexus

Nexus atoms/molecules are imported via Vite path aliases (`@nexus/atoms`, `@nexus/molecules`, `@nexus/tokens`) pointing at `../nexus-design-system/src`. Nexus isn't published to npm.

## Limitations (by design)

- No routing, no authentication, no backend, no persistence (refresh clears conversation).
- Desktop layout only — the chat pane itself switches between mobile (390×844 device frame) and desktop (flexible card), but the outer page assumes a desktop viewer.
- No test framework installed.
