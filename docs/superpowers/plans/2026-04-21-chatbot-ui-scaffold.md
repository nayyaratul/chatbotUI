# Chatbot UI Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a standalone Vite + React 18 playground for rich chat widgets, consuming the Nexus design system via path aliases. Produces a working chat shell (header, message list, input, typing indicator, mock bot) plus a Studio Panel (viewport toggle, JSON inspector, session controls, widget injector). No auth, no backend, no widget implementations beyond a baseline `TextMessage`.

**Architecture:** Two-column desktop page — left column hosts a mobile-or-desktop-framed chat pane, right column hosts the Studio Panel. A single `useBot` hook owns conversation state; a `mockBot` pure function produces echo responses. A `registry` map dispatches rendering by `widget.type`. A `ViewportContext` lets widgets adapt to mobile-vs-desktop at render time.

**Tech Stack:** Vite 5, React 18, JSX (no TypeScript), SCSS modules, `classnames`, `uuid`. Nexus atoms/molecules imported via Vite path aliases to `/Users/atulnayyar/Projects/nexus-design-system/src/`. Nexus's own runtime deps (`@radix-ui/react-*`, `lucide-react`) installed into this project so aliased atoms resolve.

**Verification approach:** Per the approved spec, no test framework is installed. Each task's verification step is **manual browser observation** via `npm run dev` (Vite serves at `http://localhost:5173` by default) and checking the browser console for errors. Every task ends in a git commit.

**Working directory:** `/Users/atulnayyar/Projects/Chatbot UI` (currently empty).

**Reference spec:** `docs/superpowers/specs/2026-04-21-chatbot-ui-scaffold-design.md`.

---

## File Structure

All paths relative to `/Users/atulnayyar/Projects/Chatbot UI`.

**Root:**
- `package.json` — project manifest, scripts, dependencies
- `vite.config.js` — Vite config + Nexus path aliases
- `index.html` — root HTML, mounts React
- `.gitignore` — excludes `node_modules`, `dist`, editor files
- `jsconfig.json` — IDE alias support (non-functional but helps editors)
- `README.md` — run instructions (created in final task)

**`src/`:**
- `main.jsx` — React entry point, imports global styles, mounts `<App/>`
- `App.jsx` — top-level layout: `ViewportProvider` + left column (DeviceFrame+ChatPane) + right column (StudioPanel)
- `app.module.scss` — page layout grid, column sizing

**`src/styles/`:**
- `global.scss` — body resets + imports Nexus tokens
- `deviceFrame.module.scss` — mobile frame vs desktop card styles (used by DeviceFrame)

**`src/viewport/`:**
- `ViewportContext.jsx` — React context + provider + `useViewport` hook
- `DeviceFrame.jsx` — wraps children with mobile-or-desktop visual treatment

**`src/chat/`:**
- `ChatPane.jsx` — hosts ChatHeader + MessageList + MessageInput
- `chatPane.module.scss`
- `ChatHeader.jsx` — avatar + bot name
- `chatHeader.module.scss`
- `MessageList.jsx` — scrollable list, renders MessageRenderer + DateDivider + TypingIndicator
- `messageList.module.scss`
- `MessageRenderer.jsx` — dispatches on `widget.type` via registry, wraps in role-aligned bubble
- `messageRenderer.module.scss`
- `MessageInput.jsx` — Nexus Textarea + send Button, enter-to-send
- `messageInput.module.scss`
- `TypingIndicator.jsx` — three-dot bouncing bubble
- `typingIndicator.module.scss`
- `DateDivider.jsx` — centered date label between messages
- `dateDivider.module.scss`
- `FallbackUnknown.jsx` — renders unknown widget types as raw JSON + warning
- `fallbackUnknown.module.scss`
- `registry.js` — `{ text: TextMessage, widget_response: WidgetResponse }`

**`src/widgets/`:**
- `TextMessage.jsx` — plain text bubble for `widget.type === 'text'`
- `textMessage.module.scss`
- `WidgetResponse.jsx` — renders a user-side bubble showing `payload.data.label`
- `widgetResponse.module.scss`

**`src/engine/`:**
- `useBot.js` — hook: messages + sendUserMessage + injectBotMessage + injectUserWidgetResponse + reset + isBotTyping + typingOverride + latencyMs
- `mockBot.js` — pure function `respond(userMessage) → botWidget`
- `widgetSchemas.js` — map of widget `type → exampleName + examplePayload` (seed entries only: `text`, `widget_response`)

**`src/studio/`:**
- `StudioPanel.jsx` — right dock + collapse toggle
- `studioPanel.module.scss`
- `ViewportToggle.jsx` — Nexus ToggleGroup wired to ViewportContext
- `viewportToggle.module.scss`
- `Injector.jsx` — type Select + JSON Textarea + two inject Buttons
- `injector.module.scss`
- `JsonInspector.jsx` — read-only pre block, auto-scrolls
- `jsonInspector.module.scss`
- `Controls.jsx` — Reset Button + Latency Slider + Typing-override Select
- `controls.module.scss`

---

## Task 1: Project Initialization

Initialize git, write the minimum files needed for `npm run dev` to start Vite and display "Chatbot UI" in the browser. No Nexus yet.

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `.gitignore`
- Create: `jsconfig.json`
- Create: `src/main.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Create `package.json`**

Create `/Users/atulnayyar/Projects/Chatbot UI/package.json`:

```json
{
  "name": "chatbot-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0",
    "sass": "^1.77.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

Create `/Users/atulnayyar/Projects/Chatbot UI/vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Step 3: Create `index.html`**

Create `/Users/atulnayyar/Projects/Chatbot UI/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Chatbot UI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `.gitignore`**

Create `/Users/atulnayyar/Projects/Chatbot UI/.gitignore`:

```
node_modules
dist
.DS_Store
.vite
*.log
.env
.env.local
.vscode
.idea
```

- [ ] **Step 5: Create `jsconfig.json`**

Create `/Users/atulnayyar/Projects/Chatbot UI/jsconfig.json` (purely for editor path-alias autocompletion; Vite doesn't read it):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@nexus/atoms": ["../nexus-design-system/src/atoms/index.js"],
      "@nexus/molecules": ["../nexus-design-system/src/molecules/index.js"],
      "@nexus/tokens": ["../nexus-design-system/src/styles/tokens.scss"]
    }
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 6: Create `src/main.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 7: Create `src/App.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/App.jsx`:

```jsx
export function App() {
  return <h1>Chatbot UI</h1>
}
```

- [ ] **Step 8: Install dependencies**

Run from `/Users/atulnayyar/Projects/Chatbot UI`:

```bash
npm install
```

Expected: exits cleanly; `node_modules/` and `package-lock.json` appear; no errors.

- [ ] **Step 9: Start the dev server**

Run from `/Users/atulnayyar/Projects/Chatbot UI`:

```bash
npm run dev
```

Expected output includes:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173/` in a browser. Expected: page shows the text "Chatbot UI" as an H1. Browser console shows no errors. Leave the dev server running for subsequent tasks.

- [ ] **Step 10: Initialize git**

In a separate terminal, run from `/Users/atulnayyar/Projects/Chatbot UI`:

```bash
git init
git add .
git commit -m "chore: initial Vite + React scaffold"
```

Expected: repo initialized, initial commit created.

---

## Task 2: Nexus Integration (Path Aliases + Tokens + Smoke Test)

Wire Vite aliases to the sibling Nexus project, install the Radix / lucide runtime deps that Nexus atoms depend on, import the Nexus tokens globally, and render a Nexus `Button` to prove the integration works.

**Files:**
- Modify: `package.json` (add dependencies)
- Modify: `vite.config.js` (add `resolve.alias`)
- Modify: `jsconfig.json` (already correct from Task 1; no change)
- Create: `src/styles/global.scss`
- Modify: `src/main.jsx` (import global.scss)
- Modify: `src/App.jsx` (render a Nexus Button)

- [ ] **Step 1: Install Nexus's runtime dependencies**

Run from `/Users/atulnayyar/Projects/Chatbot UI`:

```bash
npm install classnames@^2.5.1 uuid@^9.0.0 lucide-react@^0.577.0 @radix-ui/react-accordion@^1.2.12 @radix-ui/react-aspect-ratio@^1.1.8 @radix-ui/react-checkbox@^1.3.3 @radix-ui/react-label@^2.1.8 @radix-ui/react-popover@^1.1.15 @radix-ui/react-portal@^1.1.10 @radix-ui/react-progress@^1.1.8 @radix-ui/react-radio-group@^1.3.8 @radix-ui/react-select@^2.2.6 @radix-ui/react-slider@^1.3.6 @radix-ui/react-switch@^1.2.6 @radix-ui/react-tabs@^1.1.13 @radix-ui/react-toast@^1.2.15 @radix-ui/react-toggle@^1.1.10 @radix-ui/react-toggle-group@^1.1.11 @radix-ui/react-tooltip@^1.2.8
```

Expected: installs cleanly. `package.json` now lists all these under `dependencies`.

- [ ] **Step 2: Update `vite.config.js` with Nexus path aliases**

Replace `/Users/atulnayyar/Projects/Chatbot UI/vite.config.js` contents with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nexusRoot = path.resolve(__dirname, '../nexus-design-system/src')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@nexus/atoms': path.resolve(nexusRoot, 'atoms/index.js'),
      '@nexus/molecules': path.resolve(nexusRoot, 'molecules/index.js'),
      '@nexus/tokens': path.resolve(nexusRoot, 'styles/tokens.scss'),
    },
  },
})
```

- [ ] **Step 3: Create `src/styles/global.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/styles/global.scss`:

```scss
@use '@nexus/tokens';

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: var(--sans, system-ui, -apple-system, sans-serif);
  background: var(--grey-0, #fafafa);
  color: var(--grey-90, #242424);
  -webkit-font-smoothing: antialiased;
}
```

Note: `@use '@nexus/tokens';` pulls in Nexus's `:root { ... }` CSS-custom-property declarations. The fallbacks on each `var()` above mean the page still renders sanely even if that file fails to load.

- [ ] **Step 4: Import global styles in `src/main.jsx`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/main.jsx` contents with:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.jsx'
import './styles/global.scss'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 5: Render a Nexus Button in `src/App.jsx`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/App.jsx` contents with:

```jsx
import { Button } from '@nexus/atoms'

export function App() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Chatbot UI</h1>
      <Button variant="primary">Nexus Button smoke test</Button>
    </div>
  )
}
```

- [ ] **Step 6: Verify in browser**

The dev server should hot-reload. Refresh `http://localhost:5173/` if needed.

Expected:
- Page shows "Chatbot UI" heading and a styled primary button reading "Nexus Button smoke test".
- Button uses Nexus's styling (rounded corners, brand colour). If it looks like a default unstyled `<button>`, the Nexus SCSS module isn't loading — check the Vite terminal for SCSS errors.
- Browser console is clean (no red errors).

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: integrate Nexus design system via Vite path aliases"
```

---

## Task 3: Two-Column Page Layout + Studio Panel Stub

Build the page shell: left column (chat surface placeholder) + right column (Studio Panel stub). No real chat yet — just the layout.

**Files:**
- Create: `src/app.module.scss`
- Modify: `src/App.jsx`
- Create: `src/studio/StudioPanel.jsx`
- Create: `src/studio/studioPanel.module.scss`

- [ ] **Step 1: Create `src/app.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/app.module.scss`:

```scss
.app {
  display: grid;
  grid-template-columns: 1fr 340px;
  height: 100vh;
  width: 100vw;
  background: var(--grey-0);
}

.chatSurface {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

.studioColumn {
  border-left: 1px solid var(--grey-10);
  background: var(--white);
  overflow-y: auto;
}
```

- [ ] **Step 2: Create `src/studio/studioPanel.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/studioPanel.module.scss`:

```scss
.panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px;
  height: 100%;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sectionTitle {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--grey-50);
  margin: 0;
}
```

- [ ] **Step 3: Create `src/studio/StudioPanel.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/StudioPanel.jsx`:

```jsx
import styles from './studioPanel.module.scss'

export function StudioPanel() {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
    </aside>
  )
}
```

- [ ] **Step 4: Replace `src/App.jsx`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/App.jsx` contents with:

```jsx
import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'

export function App() {
  return (
    <div className={styles.app}>
      <main className={styles.chatSurface}>
        <div style={{ color: 'var(--grey-50)' }}>— chat pane placeholder —</div>
      </main>
      <div className={styles.studioColumn}>
        <StudioPanel />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

Dev server hot-reloads. Expected:
- Page fills the viewport with two columns: ~340px studio column on the right with a left border and white background, rest of space on the left with the "chat pane placeholder" text centered.
- Studio column shows four section headings: "VIEWPORT", "INJECTOR", "INSPECTOR", "CONTROLS".
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: two-column page layout with Studio Panel stub"
```

---

## Task 4: Viewport Context + DeviceFrame

Create the `ViewportContext` and `DeviceFrame` component. DeviceFrame applies mobile (390×844 device chrome) or desktop (flexible card) styling based on context value. Default is `mobile`.

**Files:**
- Create: `src/viewport/ViewportContext.jsx`
- Create: `src/viewport/DeviceFrame.jsx`
- Create: `src/styles/deviceFrame.module.scss`
- Modify: `src/App.jsx` (wrap in ViewportProvider, render DeviceFrame)

- [ ] **Step 1: Create `src/viewport/ViewportContext.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/viewport/ViewportContext.jsx`:

```jsx
import { createContext, useContext, useState } from 'react'

const ViewportContext = createContext({
  viewport: 'mobile',
  setViewport: () => {},
})

export function ViewportProvider({ children }) {
  const [viewport, setViewport] = useState('mobile')
  return (
    <ViewportContext.Provider value={{ viewport, setViewport }}>
      {children}
    </ViewportContext.Provider>
  )
}

export function useViewport() {
  return useContext(ViewportContext)
}
```

- [ ] **Step 2: Create `src/styles/deviceFrame.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/styles/deviceFrame.module.scss`:

```scss
.frame {
  background: var(--white);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mobile {
  width: 390px;
  height: 844px;
  border-radius: 40px;
  box-shadow:
    0 0 0 12px var(--grey-90),
    0 20px 40px rgba(0, 0, 0, 0.18);
}

.desktop {
  width: 100%;
  max-width: 1000px;
  height: 800px;
  border-radius: 12px;
  border: 1px solid var(--grey-10);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.08);
}
```

- [ ] **Step 3: Create `src/viewport/DeviceFrame.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/viewport/DeviceFrame.jsx`:

```jsx
import cx from 'classnames'
import styles from '../styles/deviceFrame.module.scss'
import { useViewport } from './ViewportContext.jsx'

export function DeviceFrame({ children }) {
  const { viewport } = useViewport()
  return (
    <div className={cx(styles.frame, styles[viewport])}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Update `src/App.jsx`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/App.jsx` contents with:

```jsx
import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'

export function App() {
  return (
    <ViewportProvider>
      <div className={styles.app}>
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <div style={{ padding: 20, color: 'var(--grey-50)' }}>
              — chat pane placeholder —
            </div>
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel />
        </div>
      </div>
    </ViewportProvider>
  )
}
```

- [ ] **Step 5: Verify in browser**

Expected:
- Left column now shows a centred 390×844 phone-shaped frame with rounded corners, dark bezel (shadow), and white interior containing the placeholder text.
- Right column unchanged.
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: ViewportContext + DeviceFrame with mobile/desktop modes"
```

---

## Task 5: Viewport Toggle in Studio Panel

Wire a Nexus `ToggleGroup` in the Studio Panel's Viewport section so clicking "Mobile" or "Desktop" switches the frame.

**Files:**
- Create: `src/studio/ViewportToggle.jsx`
- Create: `src/studio/viewportToggle.module.scss`
- Modify: `src/studio/StudioPanel.jsx`

- [ ] **Step 1: Create `src/studio/viewportToggle.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/viewportToggle.module.scss`:

```scss
.toggle {
  display: inline-flex;
}

.item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
}
```

- [ ] **Step 2: Create `src/studio/ViewportToggle.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/ViewportToggle.jsx`:

```jsx
import { Smartphone, Monitor } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@nexus/atoms'
import { useViewport } from '../viewport/ViewportContext.jsx'
import styles from './viewportToggle.module.scss'

export function ViewportToggle() {
  const { viewport, setViewport } = useViewport()

  return (
    <ToggleGroup
      type="single"
      value={viewport}
      onValueChange={(v) => { if (v) setViewport(v) }}
      className={styles.toggle}
    >
      <ToggleGroupItem value="mobile" className={styles.item}>
        <Smartphone size={14} />
        Mobile
      </ToggleGroupItem>
      <ToggleGroupItem value="desktop" className={styles.item}>
        <Monitor size={14} />
        Desktop
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
```

Note: the `if (v)` guard handles Radix's behaviour of emitting an empty string when the user clicks the currently-active item (single-select mode); we ignore that so the viewport can't become empty.

- [ ] **Step 3: Update `src/studio/StudioPanel.jsx`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/studio/StudioPanel.jsx` contents with:

```jsx
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'

export function StudioPanel() {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <ViewportToggle />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
    </aside>
  )
}
```

- [ ] **Step 4: Verify in browser**

Expected:
- "Viewport" section now shows two toggle buttons: 📱 Mobile (active by default) and 🖥 Desktop.
- Clicking Desktop: the left frame expands to a wider rectangular card (no phone bezel), roughly 1000px max width × 800px tall.
- Clicking Mobile: reverts to the 390×844 phone frame.
- No console errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: viewport toggle in Studio Panel"
```

---

## Task 6: Chat Pane + Chat Header (visual shell)

Create the empty ChatPane with ChatHeader at the top. No messages, no input yet — just the top chrome so the frame starts looking like a chat app.

**Files:**
- Create: `src/chat/ChatPane.jsx`
- Create: `src/chat/chatPane.module.scss`
- Create: `src/chat/ChatHeader.jsx`
- Create: `src/chat/chatHeader.module.scss`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `src/chat/chatHeader.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/chatHeader.module.scss`:

```scss
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--grey-10);
  background: var(--white);
}

.name {
  font-size: 15px;
  font-weight: 600;
  color: var(--grey-90);
}

.subtitle {
  font-size: 12px;
  color: var(--grey-50);
}

.text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
```

- [ ] **Step 2: Create `src/chat/ChatHeader.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/ChatHeader.jsx`:

```jsx
import { Avatar } from '@nexus/atoms'
import styles from './chatHeader.module.scss'

export function ChatHeader() {
  return (
    <header className={styles.header}>
      <Avatar name="AI Lab" size="md" />
      <div className={styles.text}>
        <span className={styles.name}>AI Lab</span>
        <span className={styles.subtitle}>Chatbot playground</span>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create `src/chat/chatPane.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/chatPane.module.scss`:

```scss
.pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--grey-0);
}

.body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--grey-40);
  font-size: 13px;
}
```

- [ ] **Step 4: Create `src/chat/ChatPane.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/ChatPane.jsx`:

```jsx
import { ChatHeader } from './ChatHeader.jsx'
import styles from './chatPane.module.scss'

export function ChatPane() {
  return (
    <div className={styles.pane}>
      <ChatHeader />
      <div className={styles.body}>
        <div className={styles.placeholder}>
          Say something to start…
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update `src/App.jsx`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/App.jsx` contents with:

```jsx
import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'
import { ChatPane } from './chat/ChatPane.jsx'

export function App() {
  return (
    <ViewportProvider>
      <div className={styles.app}>
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <ChatPane />
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel />
        </div>
      </div>
    </ViewportProvider>
  )
}
```

- [ ] **Step 6: Verify in browser**

Expected:
- Inside the device frame, a header appears at the top: a circular "AI" avatar (initials), "AI Lab" name, and "Chatbot playground" subtitle, with a thin bottom border.
- Below the header, centred "Say something to start…" placeholder text in grey.
- Works in both Mobile and Desktop viewport modes.
- No console errors.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: ChatPane shell with ChatHeader"
```

---

## Task 7: Message Registry + Baseline Widgets + MessageRenderer

Create the registry + baseline `TextMessage` / `WidgetResponse` / `FallbackUnknown` widgets + the `MessageRenderer` that dispatches on `widget.type`. No message list iteration yet — next task.

**Files:**
- Create: `src/widgets/TextMessage.jsx`
- Create: `src/widgets/textMessage.module.scss`
- Create: `src/widgets/WidgetResponse.jsx`
- Create: `src/widgets/widgetResponse.module.scss`
- Create: `src/chat/FallbackUnknown.jsx`
- Create: `src/chat/fallbackUnknown.module.scss`
- Create: `src/chat/MessageRenderer.jsx`
- Create: `src/chat/messageRenderer.module.scss`
- Create: `src/chat/registry.js`

- [ ] **Step 1: Create `src/widgets/textMessage.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/widgets/textMessage.module.scss`:

```scss
.bubble {
  display: inline-block;
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.4;
  max-width: 80%;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.bot {
  background: var(--white);
  color: var(--grey-90);
  border: 1px solid var(--grey-10);
  border-bottom-left-radius: 4px;
}

.user {
  background: var(--blue-60, #2f6fed);
  color: var(--white);
  border-bottom-right-radius: 4px;
}
```

- [ ] **Step 2: Create `src/widgets/TextMessage.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/widgets/TextMessage.jsx`:

```jsx
import cx from 'classnames'
import styles from './textMessage.module.scss'

export function TextMessage({ payload, role }) {
  return (
    <div className={cx(styles.bubble, role === 'user' ? styles.user : styles.bot)}>
      {payload?.text ?? ''}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/widgets/widgetResponse.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/widgets/widgetResponse.module.scss`:

```scss
.bubble {
  display: inline-block;
  padding: 9px 13px;
  border-radius: 16px;
  border-bottom-right-radius: 4px;
  background: var(--blue-60, #2f6fed);
  color: var(--white);
  font-size: 14px;
  line-height: 1.4;
  max-width: 80%;
}

.caption {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.75;
}
```

- [ ] **Step 4: Create `src/widgets/WidgetResponse.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/widgets/WidgetResponse.jsx`:

```jsx
import styles from './widgetResponse.module.scss'

export function WidgetResponse({ payload }) {
  const label = payload?.data?.label ?? JSON.stringify(payload?.data ?? {})
  const sourceType = payload?.source_type
  return (
    <div className={styles.bubble}>
      {label}
      {sourceType && <span className={styles.caption}>via {sourceType}</span>}
    </div>
  )
}
```

- [ ] **Step 5: Create `src/chat/fallbackUnknown.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/fallbackUnknown.module.scss`:

```scss
.box {
  display: block;
  padding: 10px 12px;
  border: 1px dashed var(--yellow-60, #b88a00);
  border-radius: 8px;
  background: var(--yellow-10, #fff6d5);
  color: var(--grey-90);
  font-size: 12px;
  max-width: 100%;
}

.title {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}

.json {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
}
```

- [ ] **Step 6: Create `src/chat/FallbackUnknown.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/FallbackUnknown.jsx`:

```jsx
import styles from './fallbackUnknown.module.scss'

export function FallbackUnknown({ type, payload }) {
  return (
    <div className={styles.box}>
      <span className={styles.title}>Unknown widget: {type}</span>
      <pre className={styles.json}>{JSON.stringify(payload, null, 2)}</pre>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/chat/registry.js`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/registry.js`:

```js
import { TextMessage } from '../widgets/TextMessage.jsx'
import { WidgetResponse } from '../widgets/WidgetResponse.jsx'

export const registry = {
  text: TextMessage,
  widget_response: WidgetResponse,
}
```

- [ ] **Step 8: Create `src/chat/messageRenderer.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/messageRenderer.module.scss`:

```scss
.row {
  display: flex;
  width: 100%;
  padding: 3px 12px;
}

.bot {
  justify-content: flex-start;
}

.user {
  justify-content: flex-end;
}
```

- [ ] **Step 9: Create `src/chat/MessageRenderer.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/MessageRenderer.jsx`:

```jsx
import cx from 'classnames'
import { registry } from './registry.js'
import { FallbackUnknown } from './FallbackUnknown.jsx'
import styles from './messageRenderer.module.scss'

export function MessageRenderer({ message }) {
  const { role, widget } = message
  const Component = registry[widget.type]

  return (
    <div className={cx(styles.row, styles[role])}>
      {Component ? (
        <Component payload={widget.payload} role={role} />
      ) : (
        <FallbackUnknown type={widget.type} payload={widget.payload} />
      )}
    </div>
  )
}
```

- [ ] **Step 10: Verify (no visible change yet — just build health)**

Nothing renders these yet, but Vite should not throw any errors. In the dev-server terminal, confirm no red messages. In the browser, refresh; UI looks the same as after Task 6; console is clean.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: message registry + baseline widgets + MessageRenderer"
```

---

## Task 8: MessageList Iterating a Static Array (Renderer Smoke Test)

Wire MessageRenderer into a MessageList that iterates a hardcoded array of sample messages. Proves end-to-end rendering before the engine is introduced.

**Files:**
- Create: `src/chat/MessageList.jsx`
- Create: `src/chat/messageList.module.scss`
- Modify: `src/chat/ChatPane.jsx`

- [ ] **Step 1: Create `src/chat/messageList.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/messageList.module.scss`:

```scss
.list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--grey-40);
  font-size: 13px;
}
```

- [ ] **Step 2: Create `src/chat/MessageList.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/MessageList.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import { MessageRenderer } from './MessageRenderer.jsx'
import styles from './messageList.module.scss'

export function MessageList({ messages }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  if (messages.length === 0) {
    return <div className={styles.empty}>Say something to start…</div>
  }

  return (
    <div className={styles.list}>
      {messages.map((m) => (
        <MessageRenderer key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
```

- [ ] **Step 3: Update `src/chat/ChatPane.jsx`** (temporary hardcoded messages)

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/chat/ChatPane.jsx` contents with:

```jsx
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import styles from './chatPane.module.scss'

const SAMPLE_MESSAGES = [
  { id: '1', role: 'bot', timestamp: Date.now() - 60000, widget: { type: 'text', payload: { text: 'Hello from the bot.' } } },
  { id: '2', role: 'user', timestamp: Date.now() - 50000, widget: { type: 'text', payload: { text: 'Hi! This is a user message.' } } },
  { id: '3', role: 'user', timestamp: Date.now() - 40000, widget: { type: 'widget_response', payload: { source_type: 'quick_reply', data: { label: 'Yes, proceed' } } } },
  { id: '4', role: 'bot', timestamp: Date.now() - 30000, widget: { type: 'mystery_widget', payload: { foo: 'bar' } } },
]

export function ChatPane() {
  return (
    <div className={styles.pane}>
      <ChatHeader />
      <div className={styles.body}>
        <MessageList messages={SAMPLE_MESSAGES} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Expected, inside the device frame:
- A bot bubble saying "Hello from the bot." aligned to the left, white background, grey border.
- A user bubble saying "Hi! This is a user message." aligned to the right, blue background, white text.
- A user-side bubble showing "Yes, proceed" with a small "via quick_reply" caption.
- A yellow dashed-border fallback card saying "Unknown widget: mystery_widget" with pretty-printed JSON below.
- No console errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: MessageList iterating MessageRenderer (static smoke test)"
```

---

## Task 9: Engine — useBot Hook + mockBot + MessageInput Wired End-to-End

Create the engine (`useBot` hook + `mockBot.respond`), the `MessageInput` component, and wire both into `ChatPane`. Replaces the static array with real state. Typing a message appears as a user bubble and triggers a bot echo after a delay.

**Files:**
- Create: `src/engine/useBot.js`
- Create: `src/engine/mockBot.js`
- Create: `src/chat/MessageInput.jsx`
- Create: `src/chat/messageInput.module.scss`
- Modify: `src/chat/ChatPane.jsx`

- [ ] **Step 1: Create `src/engine/mockBot.js`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/engine/mockBot.js`:

```js
export function respond(userMessage) {
  const payload = userMessage?.widget?.payload ?? {}
  let incoming = ''

  if (userMessage?.widget?.type === 'text') {
    incoming = payload.text ?? ''
  } else if (userMessage?.widget?.type === 'widget_response') {
    incoming = payload?.data?.label ?? JSON.stringify(payload?.data ?? {})
  } else {
    incoming = `(${userMessage?.widget?.type ?? 'unknown'})`
  }

  return {
    type: 'text',
    payload: { text: `You said: ${incoming}` },
  }
}
```

- [ ] **Step 2: Create `src/engine/useBot.js`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/engine/useBot.js`:

```js
import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { respond } from './mockBot.js'

export function useBot({ latencyMs = 700 } = {}) {
  const [messages, setMessages] = useState([])
  const [isBotTyping, setIsBotTyping] = useState(false)

  const append = useCallback((role, widget) => {
    const message = {
      id: uuid(),
      role,
      timestamp: Date.now(),
      widget,
    }
    setMessages((prev) => [...prev, message])
    return message
  }, [])

  const sendUserMessage = useCallback(
    (widget) => {
      const userMessage = append('user', widget)
      setIsBotTyping(true)
      setTimeout(() => {
        const botWidget = respond(userMessage)
        if (botWidget) append('bot', botWidget)
        setIsBotTyping(false)
      }, latencyMs)
    },
    [append, latencyMs],
  )

  const injectBotMessage = useCallback(
    (widget) => { append('bot', widget) },
    [append],
  )

  const injectUserWidgetResponse = useCallback(
    (widget) => { append('user', widget) },
    [append],
  )

  const reset = useCallback(() => {
    setMessages([])
    setIsBotTyping(false)
  }, [])

  return {
    messages,
    isBotTyping,
    setIsBotTyping,
    sendUserMessage,
    injectBotMessage,
    injectUserWidgetResponse,
    reset,
  }
}
```

- [ ] **Step 3: Create `src/chat/messageInput.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/messageInput.module.scss`:

```scss
.input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--grey-10);
  background: var(--white);
}

.textarea {
  flex: 1;
  min-height: 36px;
  max-height: 120px;
}
```

- [ ] **Step 4: Create `src/chat/MessageInput.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/MessageInput.jsx`:

```jsx
import { useState } from 'react'
import { Button, Textarea } from '@nexus/atoms'
import { Send } from 'lucide-react'
import styles from './messageInput.module.scss'

export function MessageInput({ onSend, disabled = false }) {
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend({ type: 'text', payload: { text: trimmed } })
    setText('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className={styles.input}>
      <Textarea
        className={styles.textarea}
        rows={1}
        resize="none"
        placeholder={disabled ? 'Bot is replying…' : 'Type a message'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <Button
        variant="primary"
        size="md"
        iconOnly
        disabled={disabled || !text.trim()}
        onClick={submit}
        aria-label="Send"
      >
        <Send size={16} />
      </Button>
    </div>
  )
}
```

- [ ] **Step 5: Update `src/chat/ChatPane.jsx`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/chat/ChatPane.jsx` contents with:

```jsx
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageInput } from './MessageInput.jsx'
import styles from './chatPane.module.scss'

export function ChatPane({ bot }) {
  return (
    <div className={styles.pane}>
      <ChatHeader />
      <div className={styles.body}>
        <MessageList messages={bot.messages} />
      </div>
      <MessageInput
        onSend={bot.sendUserMessage}
        disabled={bot.isBotTyping}
      />
    </div>
  )
}
```

- [ ] **Step 6: Update `src/App.jsx`** to own the `useBot` state and pass it down

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/App.jsx` contents with:

```jsx
import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'
import { ChatPane } from './chat/ChatPane.jsx'
import { useBot } from './engine/useBot.js'

export function App() {
  const bot = useBot()

  return (
    <ViewportProvider>
      <div className={styles.app}>
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <ChatPane bot={bot} />
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel bot={bot} />
        </div>
      </div>
    </ViewportProvider>
  )
}
```

Note: `StudioPanel` now receives `bot` even though it doesn't use it yet — subsequent tasks will wire Inspector/Controls/Injector into it.

- [ ] **Step 7: Update `src/studio/StudioPanel.jsx`** to accept and ignore the `bot` prop for now

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/studio/StudioPanel.jsx` contents with:

```jsx
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'

// eslint-disable-next-line no-unused-vars
export function StudioPanel({ bot }) {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <ViewportToggle />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
    </aside>
  )
}
```

- [ ] **Step 8: Verify in browser**

Expected:
- Empty state shows "Say something to start…".
- Typing "hello" in the input and pressing Enter: user bubble "hello" appears on the right; input clears; input goes disabled with "Bot is replying…" placeholder.
- ~700ms later: a bot bubble "You said: hello" appears on the left; input re-enables.
- Shift+Enter inserts a newline instead of sending.
- Clicking the send icon (paper airplane) behaves identically to Enter.
- No console errors.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: useBot engine + mockBot echo + MessageInput wired end-to-end"
```

---

## Task 10: TypingIndicator + DateDivider

Two small visual components bundled together because both plug into MessageList.

**Files:**
- Create: `src/chat/TypingIndicator.jsx`
- Create: `src/chat/typingIndicator.module.scss`
- Create: `src/chat/DateDivider.jsx`
- Create: `src/chat/dateDivider.module.scss`
- Modify: `src/chat/MessageList.jsx`

- [ ] **Step 1: Create `src/chat/typingIndicator.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/typingIndicator.module.scss`:

```scss
.row {
  display: flex;
  padding: 3px 12px;
  justify-content: flex-start;
}

.bubble {
  display: inline-flex;
  gap: 4px;
  padding: 10px 14px;
  background: var(--white);
  border: 1px solid var(--grey-10);
  border-radius: 16px;
  border-bottom-left-radius: 4px;
}

.dot {
  width: 6px;
  height: 6px;
  background: var(--grey-40);
  border-radius: 50%;
  animation: bounce 1.2s infinite ease-in-out;
}

.dot:nth-child(2) { animation-delay: 0.15s; }
.dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-4px); opacity: 1; }
}
```

- [ ] **Step 2: Create `src/chat/TypingIndicator.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/TypingIndicator.jsx`:

```jsx
import styles from './typingIndicator.module.scss'

export function TypingIndicator() {
  return (
    <div className={styles.row} aria-label="Bot is typing">
      <div className={styles.bubble}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/chat/dateDivider.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/dateDivider.module.scss`:

```scss
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  color: var(--grey-50);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.line {
  flex: 1;
  height: 1px;
  background: var(--grey-10);
}
```

- [ ] **Step 4: Create `src/chat/DateDivider.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/chat/DateDivider.jsx`:

```jsx
import styles from './dateDivider.module.scss'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso) {
  const d = new Date(iso)
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export function DateDivider({ date }) {
  return (
    <div className={styles.row}>
      <span className={styles.line} />
      <span>{formatDate(date)}</span>
      <span className={styles.line} />
    </div>
  )
}
```

- [ ] **Step 5: Update `src/chat/MessageList.jsx`** to insert date dividers and the typing indicator

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/chat/MessageList.jsx` contents with:

```jsx
import { useEffect, useRef } from 'react'
import { MessageRenderer } from './MessageRenderer.jsx'
import { DateDivider } from './DateDivider.jsx'
import { TypingIndicator } from './TypingIndicator.jsx'
import styles from './messageList.module.scss'

function toYmd(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MessageList({ messages, isBotTyping }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, isBotTyping])

  if (messages.length === 0 && !isBotTyping) {
    return <div className={styles.empty}>Say something to start…</div>
  }

  let lastYmd = null

  return (
    <div className={styles.list}>
      {messages.map((m) => {
        const ymd = toYmd(m.timestamp)
        const needsDivider = ymd !== lastYmd
        lastYmd = ymd
        return (
          <Fragment key={m.id}>
            {needsDivider && <DateDivider date={m.timestamp} />}
            <MessageRenderer message={m} />
          </Fragment>
        )
      })}
      {isBotTyping && <TypingIndicator />}
      <div ref={endRef} />
    </div>
  )
}
```

Also update the imports at the top of this file to include `Fragment`:

```jsx
import { Fragment, useEffect, useRef } from 'react'
```

- [ ] **Step 6: Update `src/chat/ChatPane.jsx`** to pass `isBotTyping` through

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/chat/ChatPane.jsx` contents with:

```jsx
import { ChatHeader } from './ChatHeader.jsx'
import { MessageList } from './MessageList.jsx'
import { MessageInput } from './MessageInput.jsx'
import styles from './chatPane.module.scss'

export function ChatPane({ bot }) {
  return (
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
  )
}
```

- [ ] **Step 7: Verify in browser**

Expected:
- Send a message. For ~700ms, a three-dot bouncing bubble appears on the left where the bot bubble will land; input is disabled.
- Dots disappear when the bot's real message arrives.
- Above the first message of the day, a centred date divider appears like "— TUE, APR 21 —" flanked by grey lines.
- No console errors, no missing-key warnings.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: TypingIndicator + DateDivider in MessageList"
```

---

## Task 11: JSON Inspector in Studio Panel

Add a live read-only JSON view of the `messages` array. Auto-scrolls to bottom on each update.

**Files:**
- Create: `src/studio/JsonInspector.jsx`
- Create: `src/studio/jsonInspector.module.scss`
- Modify: `src/studio/StudioPanel.jsx`

- [ ] **Step 1: Create `src/studio/jsonInspector.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/jsonInspector.module.scss`:

```scss
.inspector {
  background: var(--grey-90);
  color: var(--grey-0);
  border-radius: 6px;
  padding: 10px 12px;
  max-height: 280px;
  overflow: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre;
}

.empty {
  font-style: italic;
  color: var(--grey-40);
}
```

- [ ] **Step 2: Create `src/studio/JsonInspector.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/JsonInspector.jsx`:

```jsx
import { useEffect, useRef } from 'react'
import styles from './jsonInspector.module.scss'

export function JsonInspector({ messages }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [messages])

  return (
    <pre className={styles.inspector} ref={ref}>
      {messages.length === 0
        ? <span className={styles.empty}>[]</span>
        : JSON.stringify(messages, null, 2)}
    </pre>
  )
}
```

- [ ] **Step 3: Update `src/studio/StudioPanel.jsx`** to use the Inspector

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/studio/StudioPanel.jsx` contents with:

```jsx
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'
import { JsonInspector } from './JsonInspector.jsx'

export function StudioPanel({ bot }) {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <ViewportToggle />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <JsonInspector messages={bot.messages} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
    </aside>
  )
}
```

- [ ] **Step 4: Verify in browser**

Expected:
- "Inspector" section shows a dark monospace panel with "[]" in italic grey when empty.
- Send a message. Panel updates live: shows a JSON array with the user message and then the bot reply, pretty-printed, auto-scrolled to the bottom.
- No console errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: live JSON inspector in Studio Panel"
```

---

## Task 12: Session Controls (Reset, Latency, Typing Override)

Add the Controls section: a Reset button, a latency slider (0–3000ms), and a tri-state typing override (`Auto / Force on / Force off`). Extend `useBot` to honour the override and accept dynamic latency.

**Files:**
- Modify: `src/engine/useBot.js`
- Create: `src/studio/Controls.jsx`
- Create: `src/studio/controls.module.scss`
- Modify: `src/studio/StudioPanel.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Update `src/engine/useBot.js`** — make `latencyMs` live-updatable and expose the typing override

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/engine/useBot.js` contents with:

```js
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { respond } from './mockBot.js'

export function useBot() {
  const [messages, setMessages] = useState([])
  const [engineTyping, setEngineTyping] = useState(false)
  const [typingOverride, setTypingOverride] = useState('auto') // 'auto' | 'on' | 'off'
  const [latencyMs, setLatencyMs] = useState(700)

  const latencyRef = useRef(latencyMs)
  latencyRef.current = latencyMs

  const timersRef = useRef(new Set())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((id) => clearTimeout(id))
      timers.clear()
    }
  }, [])

  const append = useCallback((role, widget) => {
    const message = { id: uuid(), role, timestamp: Date.now(), widget }
    setMessages((prev) => [...prev, message])
    return message
  }, [])

  const sendUserMessage = useCallback(
    (widget) => {
      const userMessage = append('user', widget)
      setEngineTyping(true)
      const timerId = setTimeout(() => {
        timersRef.current.delete(timerId)
        const botWidget = respond(userMessage)
        if (botWidget) append('bot', botWidget)
        setEngineTyping(false)
      }, latencyRef.current)
      timersRef.current.add(timerId)
    },
    [append],
  )

  const injectBotMessage = useCallback((widget) => { append('bot', widget) }, [append])
  const injectUserWidgetResponse = useCallback((widget) => { append('user', widget) }, [append])
  const reset = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current.clear()
    setMessages([])
    setEngineTyping(false)
  }, [])

  const isBotTyping = typingOverride === 'on'
    ? true
    : typingOverride === 'off'
      ? false
      : engineTyping

  return {
    messages,
    isBotTyping,
    typingOverride,
    setTypingOverride,
    latencyMs,
    setLatencyMs,
    sendUserMessage,
    injectBotMessage,
    injectUserWidgetResponse,
    reset,
  }
}
```

- [ ] **Step 2: Create `src/studio/controls.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/controls.module.scss`:

```scss
.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  color: var(--grey-60);
}

.valueLabel {
  font-size: 11px;
  color: var(--grey-50);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: Create `src/studio/Controls.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/Controls.jsx`:

```jsx
import { Button, Select, SelectTrigger, SelectContent, SelectItem, Slider } from '@nexus/atoms'
import styles from './controls.module.scss'

export function Controls({ bot }) {
  return (
    <div className={styles.controls}>
      <div className={styles.row}>
        <span className={styles.label}>Bot typing</span>
        <Select value={bot.typingOverride} onValueChange={bot.setTypingOverride}>
          <SelectTrigger size="sm" placeholder="Auto" />
          <SelectContent>
            <SelectItem value="auto">Auto (engine)</SelectItem>
            <SelectItem value="on">Force on</SelectItem>
            <SelectItem value="off">Force off</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>
          Bot reply latency <span className={styles.valueLabel}>{bot.latencyMs}ms</span>
        </span>
        <Slider
          value={[bot.latencyMs]}
          onValueChange={([v]) => bot.setLatencyMs(v)}
          min={0}
          max={3000}
          step={100}
        />
      </div>

      <div className={styles.row}>
        <Button variant="secondary" size="sm" onClick={bot.reset}>
          Reset conversation
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `src/studio/StudioPanel.jsx`** to mount Controls

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/studio/StudioPanel.jsx` contents with:

```jsx
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'
import { JsonInspector } from './JsonInspector.jsx'
import { Controls } from './Controls.jsx'

export function StudioPanel({ bot }) {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <ViewportToggle />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <p style={{ color: 'var(--grey-50)', fontSize: 13 }}>— placeholder —</p>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <JsonInspector messages={bot.messages} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <Controls bot={bot} />
      </section>
    </aside>
  )
}
```

- [ ] **Step 5: Verify in browser**

Expected:
- Controls section shows: "Bot typing" select (defaulted to "Auto (engine)"), "Bot reply latency 700ms" slider, and a "Reset conversation" secondary button.
- Drag the slider to e.g. 2000ms; label updates live to "2000ms"; send a message; bot reply now takes ~2 seconds and the typing indicator shows for that full duration.
- Change "Bot typing" to "Force on" → typing indicator appears permanently, even without sending.
- Change to "Force off" + send a message → reply lands instantly with no indicator (override wins).
- Change back to "Auto" to restore engine behaviour.
- Click "Reset conversation": message list empties, JSON inspector shows `[]`, input re-enables.
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: Studio Controls — reset, latency, typing override"
```

---

## Task 13: Widget Schemas + Injector

Add `widgetSchemas.js` (seed entries for `text` and `widget_response`) and the Injector section that lets you pick a type, edit a JSON payload, and inject the resulting message as either a bot message or a user widget-response.

**Files:**
- Create: `src/engine/widgetSchemas.js`
- Create: `src/studio/Injector.jsx`
- Create: `src/studio/injector.module.scss`
- Modify: `src/studio/StudioPanel.jsx`

- [ ] **Step 1: Create `src/engine/widgetSchemas.js`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/engine/widgetSchemas.js`:

```js
/**
 * Seed map of widget type → human-friendly label + example payload.
 * Extended one entry at a time as new widgets are added in follow-up PRs.
 * The Injector UI uses this to prefill the JSON textarea for the selected type.
 */
export const widgetSchemas = {
  text: {
    label: 'Text message',
    examplePayload: { text: 'Hello from the injector.' },
  },
  widget_response: {
    label: 'Widget response (user tap/submit)',
    examplePayload: {
      source_type: 'quick_reply',
      source_widget_id: 'example-qr-1',
      data: { label: 'Yes, proceed', value: 'yes' },
    },
  },
}
```

- [ ] **Step 2: Create `src/studio/injector.module.scss`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/injector.module.scss`:

```scss
.injector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.label {
  font-size: 12px;
  color: var(--grey-60);
}

.textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.error {
  color: var(--red-60, #d04a3a);
  font-size: 11px;
}
```

- [ ] **Step 3: Create `src/studio/Injector.jsx`**

Create `/Users/atulnayyar/Projects/Chatbot UI/src/studio/Injector.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Button, Select, SelectTrigger, SelectContent, SelectItem, Textarea } from '@nexus/atoms'
import { registry } from '../chat/registry.js'
import { widgetSchemas } from '../engine/widgetSchemas.js'
import styles from './injector.module.scss'

function defaultPayloadJson(type) {
  const schema = widgetSchemas[type]
  return JSON.stringify(schema?.examplePayload ?? {}, null, 2)
}

export function Injector({ bot }) {
  const registeredTypes = useMemo(() => Object.keys(registry), [])
  const [type, setType] = useState(registeredTypes[0] ?? 'text')
  const [payloadText, setPayloadText] = useState(() => defaultPayloadJson(registeredTypes[0] ?? 'text'))
  const [error, setError] = useState(null)

  const onTypeChange = (next) => {
    setType(next)
    setPayloadText(defaultPayloadJson(next))
    setError(null)
  }

  const parsePayload = () => {
    try {
      return { ok: true, value: JSON.parse(payloadText) }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  const injectAsBot = () => {
    const result = parsePayload()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectBotMessage({ type, payload: result.value })
  }

  const injectAsUser = () => {
    const result = parsePayload()
    if (!result.ok) { setError(result.error); return }
    setError(null)
    bot.injectUserWidgetResponse({ type, payload: result.value })
  }

  return (
    <div className={styles.injector}>
      <div>
        <div className={styles.label}>Widget type</div>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger size="sm" />
          <SelectContent>
            {registeredTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {widgetSchemas[t]?.label ?? t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className={styles.label}>Payload (JSON)</div>
        <Textarea
          className={styles.textarea}
          rows={8}
          value={payloadText}
          onChange={(e) => { setPayloadText(e.target.value); setError(null) }}
        />
      </div>
      {error && <div className={styles.error}>Invalid JSON: {error}</div>}
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

- [ ] **Step 4: Update `src/studio/StudioPanel.jsx`** to mount the Injector

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/studio/StudioPanel.jsx` contents with:

```jsx
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'
import { JsonInspector } from './JsonInspector.jsx'
import { Controls } from './Controls.jsx'
import { Injector } from './Injector.jsx'

export function StudioPanel({ bot }) {
  return (
    <aside className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <ViewportToggle />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <Injector bot={bot} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <JsonInspector messages={bot.messages} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <Controls bot={bot} />
      </section>
    </aside>
  )
}
```

- [ ] **Step 5: Verify in browser**

Expected:
- "Injector" section shows a Widget-type select (defaulting to "Text message"), a Payload Textarea prefilled with `{ "text": "Hello from the injector." }`, and two Buttons: "Inject as bot" (primary) and "Inject as user" (secondary).
- Click "Inject as bot": a new bot text bubble appears in the chat; JSON inspector updates.
- Change Widget type to "Widget response (user tap/submit)": Textarea repopulates with the widget_response example payload.
- Click "Inject as user": a user-side bubble appears showing "Yes, proceed" with "via quick_reply" caption.
- Edit Textarea to invalid JSON (e.g., delete a brace) and click Inject: a red "Invalid JSON: …" error shows below the Textarea; no message is added. Fix the JSON: error clears.
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: widget schema + Studio Injector"
```

---

## Task 14: Collapsible Studio Panel + README + Final Smoke Check

Make the Studio Panel collapsible (tidy for screenshot-taking and widget demos), write the project README, and run through a full smoke sequence one last time.

**Files:**
- Modify: `src/studio/StudioPanel.jsx`
- Modify: `src/studio/studioPanel.module.scss`
- Modify: `src/app.module.scss`
- Modify: `src/App.jsx`
- Create: `README.md`

- [ ] **Step 1: Update `src/studio/studioPanel.module.scss`**

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/studio/studioPanel.module.scss` contents with:

```scss
.panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 20px 20px 40px;
  height: 100%;
  overflow-y: auto;
}

.panel.collapsed {
  padding: 8px;
  gap: 0;
  overflow: hidden;
}

.panel.collapsed .section {
  display: none;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sectionTitle {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--grey-50);
  margin: 0;
}

.collapseButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--grey-0);
  border: 1px solid var(--grey-10);
  border-radius: 6px;
  cursor: pointer;
  color: var(--grey-60);
  align-self: flex-end;

  &:hover {
    background: var(--grey-10);
  }
}
```

- [ ] **Step 2: Update `src/app.module.scss`** so the column width reacts to the collapse state

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/app.module.scss` contents with:

```scss
.app {
  display: grid;
  grid-template-columns: 1fr 340px;
  height: 100vh;
  width: 100vw;
  background: var(--grey-0);
  transition: grid-template-columns 180ms ease;
}

.app.studioCollapsed {
  grid-template-columns: 1fr 44px;
}

.chatSurface {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

.studioColumn {
  border-left: 1px solid var(--grey-10);
  background: var(--white);
  overflow-y: auto;
}
```

- [ ] **Step 3: Update `src/App.jsx`** to hoist collapse state so the grid can react

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/App.jsx` contents with:

```jsx
import { useState } from 'react'
import cx from 'classnames'
import styles from './app.module.scss'
import { StudioPanel } from './studio/StudioPanel.jsx'
import { ViewportProvider } from './viewport/ViewportContext.jsx'
import { DeviceFrame } from './viewport/DeviceFrame.jsx'
import { ChatPane } from './chat/ChatPane.jsx'
import { useBot } from './engine/useBot.js'

export function App() {
  const bot = useBot()
  const [studioCollapsed, setStudioCollapsed] = useState(false)

  return (
    <ViewportProvider>
      <div className={cx(styles.app, studioCollapsed && styles.studioCollapsed)}>
        <main className={styles.chatSurface}>
          <DeviceFrame>
            <ChatPane bot={bot} />
          </DeviceFrame>
        </main>
        <div className={styles.studioColumn}>
          <StudioPanel
            bot={bot}
            collapsed={studioCollapsed}
            onToggleCollapsed={() => setStudioCollapsed((c) => !c)}
          />
        </div>
      </div>
    </ViewportProvider>
  )
}
```

- [ ] **Step 4: Update `src/studio/StudioPanel.jsx`** to support the collapse prop

Replace `/Users/atulnayyar/Projects/Chatbot UI/src/studio/StudioPanel.jsx` contents with:

```jsx
import cx from 'classnames'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import styles from './studioPanel.module.scss'
import { ViewportToggle } from './ViewportToggle.jsx'
import { JsonInspector } from './JsonInspector.jsx'
import { Controls } from './Controls.jsx'
import { Injector } from './Injector.jsx'

export function StudioPanel({ bot, collapsed, onToggleCollapsed }) {
  return (
    <aside className={cx(styles.panel, collapsed && styles.collapsed)}>
      <button
        type="button"
        className={styles.collapseButton}
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand Studio' : 'Collapse Studio'}
      >
        {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Viewport</h2>
        <ViewportToggle />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Injector</h2>
        <Injector bot={bot} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inspector</h2>
        <JsonInspector messages={bot.messages} />
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controls</h2>
        <Controls bot={bot} />
      </section>
    </aside>
  )
}
```

- [ ] **Step 5: Create `README.md`**

Create `/Users/atulnayyar/Projects/Chatbot UI/README.md`:

```markdown
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
```

- [ ] **Step 6: Full smoke check**

Refresh the browser and walk through this full sequence to verify everything from Tasks 1–14 still works together:

1. Page loads; left column shows a phone-shaped frame; right column is the Studio panel with four sections.
2. Viewport toggle → Desktop: frame widens to a card; toggle → Mobile: returns.
3. Type "hello" in the input, press Enter: user bubble appears, typing indicator shows, bot echoes "You said: hello" after ~700ms. Inspector shows the JSON.
4. Drag latency slider to 2000ms. Send another message: bot reply now takes ~2 seconds.
5. Change Bot-typing override to "Force on": typing indicator sticks around permanently. Change back to "Auto".
6. Injector: select "Widget response", click "Inject as user" → user-side bubble with "via quick_reply" caption.
7. Break the Injector JSON (delete a brace), click Inject → red error message, no message added. Fix JSON: error clears.
8. Click "Reset conversation" → list empties.
9. Click the collapse chevron on the Studio panel → panel shrinks to a ~44px rail; left column widens. Click again → panel returns.
10. Browser console remains clean throughout.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: collapsible Studio Panel + README + final scaffold smoke"
```

---

## Wrap-up

At this point the scaffold is complete per the spec. Subsequent work — adding the 30 AI-Labs widgets — is a series of small discrete PRs, each adding:

1. A widget file under `src/widgets/`.
2. A registry entry in `src/chat/registry.js`.
3. An example payload in `src/engine/widgetSchemas.js`.
4. (Optional) A triggering rule in `src/engine/mockBot.js`.
5. (Optional) Viewport-adaptive rendering via `useViewport()`.

No framework changes required for any of them.
