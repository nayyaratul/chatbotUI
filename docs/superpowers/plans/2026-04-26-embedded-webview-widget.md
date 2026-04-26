# Embedded Webview Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship widget #27 (Embedded Webview) — an iframe escape-hatch that compacts to a poster-card in chat and lifts via a continuous FLIP transition into a portal sheet.

**Architecture:** Compact card lives in the standard chat slot (32rem cap). Tap → portaled `EmbeddedWebviewSheet` (under `#chat-modal-root`) holds the iframe edge-to-edge. A short-lived `LiftClone` portals into the modal-root for the FLIP duration so the poster region appears to morph into the sheet's iframe-frame. Four palette variants (`partner_form` / `training` / `reader` / `preview`) drive icon, eyebrow, completion strategy, and footer treatment. postMessage protocol: `{ source: 'embedded_webview', widget_id, event: 'complete' | 'progress' | 'cancel', data }`, origin-gated against `payload.allowed_origin`. `widget_id` is propagated to the iframe via `?wid=<id>` query string so the partner page never relies on parent-initiated handshake.

**Tech Stack:** React 18 (no test runner; verification = `npm run build` + §0.1 SCSS grep + browser dev server), Vite, Sass CSS modules, `@nexus/atoms` `Button`, `lucide-react`, `react-dom`'s `createPortal`. Family conventions in `docs/widget-conventions.md`.

**Family rule book:** `docs/widget-conventions.md`. The doc wins in any conflict.
**Spec:** `docs/superpowers/specs/2026-04-26-embedded-webview-widget-design.md`.

---

## File structure

**Create:**
- `src/widgets/EmbeddedWebview.jsx` — single file holding three components: `EmbeddedWebview` (default export, the compact card), `EmbeddedWebviewSheet` (portaled bottom-sheet), `LiftClone` (portaled FLIP source clone). Co-located like `SignatureCapture.jsx`.
- `src/widgets/embeddedWebview.module.scss` — all styles for the three components.
- `public/embed-fixtures/partner-form.html` — fixture page that emits the `complete` postMessage on submit. Used by `partner_form` mock-bot trigger.
- `public/embed-fixtures/training.html` — fixture page that emits `progress` events on a timer and a final `complete`. Used by `training` mock-bot trigger.

**Modify:**
- `src/engine/widgetSchemas.js` — add `buildEmbeddedWebviewPayload` builder (~120 lines, before `widgetSchemas` export at line ~553) and `embedded_webview` schema entry (4 variants).
- `src/chat/registry.js` — import `EmbeddedWebview`, register under key `embedded_webview`.
- `src/engine/mockBot.js` — four `registerRule` calls (one per variant).
- `src/studio/WidgetPalette.jsx` — add `embedded_webview: ExternalLink` to `WIDGET_ICONS`.

**Out of scope for Pass 1 (this plan):**
- Pass 2 elevation via `/frontend-design` (dispatched separately after Pass 1 close).
- `widget-plan.md` status update (done at Pass 2 close).

---

## Task 0: Verify scaffolding & branch

**Files:** none (read-only check)

- [ ] **Step 1: Confirm working tree is clean**

Run: `git status`
Expected: `working tree clean` on `main`. If there are unstaged changes (e.g. in-flight Audio Player work), stash them first: `git stash push -u -m "pre-embedded-webview"`. Recover at end of plan.

- [ ] **Step 2: Confirm `#chat-modal-root` exists**

Run: `grep -n "chat-modal-root" src/chat/ChatPane.jsx`
Expected: `<div id="chat-modal-root" className={styles.modalRoot} />` at ~line 64. The portal target is required by `EmbeddedWebviewSheet` and `LiftClone`.

- [ ] **Step 3: Confirm Lucide icons available**

Run: `grep -n "ExternalLink\|GraduationCap\|BookOpenText\|MonitorSmartphone\|Globe\|WifiOff\|RotateCcw" node_modules/lucide-react/dist/lucide-react.d.ts | head -10`
Expected: each icon name appears in the type declarations. (Skip the step if lucide-react has no `.d.ts` — these icons are all in lucide ≥0.300; we're on 0.577 per `package.json`.)

- [ ] **Step 4: Confirm dev server runs**

Run: `npm run build`
Expected: build completes with zero errors. Note any baseline warnings to distinguish them from regressions later.

---

## Task 1: Bootstrap registration & `partner_form` schema

**Goal:** Get the widget appearing in the registry so a mock-bot trigger can render an empty stub.

**Files:**
- Create: `src/widgets/EmbeddedWebview.jsx` (stub)
- Create: `src/widgets/embeddedWebview.module.scss` (stub)
- Modify: `src/engine/widgetSchemas.js` (add builder + schema entry)
- Modify: `src/chat/registry.js` (import + register)
- Modify: `src/engine/mockBot.js` (one trigger for partner_form)
- Modify: `src/studio/WidgetPalette.jsx` (icon entry)

- [ ] **Step 1: Write the stub component**

Create `src/widgets/EmbeddedWebview.jsx`:

```jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import cx from 'classnames'
import {
  ExternalLink,
  GraduationCap,
  BookOpenText,
  MonitorSmartphone,
  Globe,
  Loader2,
  WifiOff,
  Check,
  X as XIcon,
  RotateCcw,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './embeddedWebview.module.scss'

/* ─── Embedded Webview (#27) ─────────────────────────────────────────
   Iframe escape-hatch for complex partner UIs. Compact card lives in
   the chat stream; on CTA tap a portaled bottom-sheet lifts up and
   holds the iframe edge-to-edge. The compact card's poster region
   morphs into the sheet's iframe-frame via a FLIP transition.

   Four variants drive icon / eyebrow / footer / completion strategy:
     partner_form   — postMessage 'complete' (mandatory)
     training       — postMessage 'progress' until 'complete'
     reader         — user-attested via "I've read this" CTA
     preview        — no completion (close = continue)

   See docs/superpowers/specs/2026-04-26-embedded-webview-widget-design.md
   ─────────────────────────────────────────────────────────────────── */

const SHEET_ANIM_DURATION = 360
const LIFT_DURATION = 520

const VARIANT_META = {
  partner_form: {
    icon: ExternalLink,
    eyebrowPrefix: 'Partner',
    ctaOpen: 'Open verification portal',
    ctaReopen: 'Reopen verification portal',
    completion: 'postmessage',
  },
  training: {
    icon: GraduationCap,
    eyebrowPrefix: 'Training',
    ctaOpen: 'Start training',
    ctaReopen: 'Resume training',
    completion: 'postmessage',
  },
  reader: {
    icon: BookOpenText,
    eyebrowPrefix: 'Reading',
    ctaOpen: 'Open reader',
    ctaReopen: 'Reopen reader',
    completion: 'attested',
  },
  preview: {
    icon: MonitorSmartphone,
    eyebrowPrefix: 'Preview',
    ctaOpen: 'Open preview',
    ctaReopen: 'Reopen preview',
    completion: 'none',
  },
}

export function EmbeddedWebview({ payload, onSubmit }) {
  return (
    <div className={styles.card} data-variant={payload?.variant ?? 'partner_form'}>
      <p className={styles.placeholder}>EmbeddedWebview · {payload?.variant}</p>
    </div>
  )
}
```

- [ ] **Step 2: Write the stub SCSS**

Create `src/widgets/embeddedWebview.module.scss`:

```scss
/* Embedded Webview (#27) — see widget-conventions.md.
   Pass 1 region 1: stub. Real shell lands in Task 2. */

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
}

.placeholder {
  margin: 0;
  font-size: var(--font-size-200);
  color: var(--grey-60);
}
```

- [ ] **Step 3: Add the payload builder + schema entry**

Open `src/engine/widgetSchemas.js`. After the `buildSignaturePayload` function (locate via `grep -n "function buildSignaturePayload" src/engine/widgetSchemas.js`), add:

```js
/* ─── Embedded Webview (#27) — payload builder ────────────────────────
   Four variants: partner_form / training / reader / preview. Each
   ships its own preset for icon/eyebrow/completion. URL fixtures live
   under /public/embed-fixtures/ so the postMessage variants can be
   demoed end-to-end without external dependencies. */
function buildEmbeddedWebviewPayload(variant) {
  const base = {
    widget_id: makeId('webv'),
    variant,
    sandbox: null,                                  // null → component default
    allow: null,
    silent: false,
  }

  if (variant === 'partner_form') {
    return {
      ...base,
      url: '/embed-fixtures/partner-form.html',
      allowed_origin: window.location.origin,
      domain_label: 'partners.bgv-co.in',
      favicon_url: null,
      title: 'Background verification — vendor portal',
      description: 'Submit your details on the partner page',
      category: 'Onboarding',
      poster_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1024&q=70',
      estimated_minutes: 4,
    }
  }

  if (variant === 'training') {
    return {
      ...base,
      url: '/embed-fixtures/training.html',
      allowed_origin: window.location.origin,
      domain_label: 'learn.example.com',
      favicon_url: null,
      title: 'Anti-bribery refresher',
      description: 'Annual compliance training — 4 short modules',
      category: 'Compliance',
      poster_url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1024&q=70',
      estimated_minutes: 8,
    }
  }

  if (variant === 'reader') {
    return {
      ...base,
      url: 'https://example.com/',
      allowed_origin: 'https://example.com',
      domain_label: 'example.com',
      favicon_url: null,
      title: 'Updated leave policy — April 2026',
      description: 'Three changes effective from May 1st',
      category: 'Policy',
      poster_url: null,
      estimated_minutes: 3,
    }
  }

  if (variant === 'preview') {
    return {
      ...base,
      url: 'https://example.com/',
      allowed_origin: 'https://example.com',
      domain_label: 'example.com',
      favicon_url: null,
      title: 'Reference site',
      description: 'A quick look — close when you\'re done',
      category: 'Reference',
      poster_url: null,
      estimated_minutes: null,
    }
  }

  throw new Error(`buildEmbeddedWebviewPayload: unknown variant "${variant}"`)
}
```

In the same file, locate the `widgetSchemas` export (`grep -n "^export const widgetSchemas" src/engine/widgetSchemas.js`). Add the schema entry before the closing brace, immediately after the `signature` entry (or any peer entry — order is cosmetic, but `embedded_webview` reads as `advanced` category and slots near `approval`):

```js
embedded_webview: {
  label: 'Webview',
  category: 'advanced',
  variants: [
    { id: 'partner_form', label: 'Partner form', payload: () => buildEmbeddedWebviewPayload('partner_form') },
    { id: 'training',     label: 'Training',     payload: () => buildEmbeddedWebviewPayload('training') },
    { id: 'reader',       label: 'Reader',       payload: () => buildEmbeddedWebviewPayload('reader') },
    { id: 'preview',      label: 'Preview',      payload: () => buildEmbeddedWebviewPayload('preview') },
  ],
},
```

- [ ] **Step 4: Register in the chat registry**

Open `src/chat/registry.js`. Add at the top (alphabetical by widget name within imports):

```js
import { EmbeddedWebview } from '../widgets/EmbeddedWebview.jsx'
```

In the `registry` object (after `signature: SignatureCapture,`), add:

```js
embedded_webview: EmbeddedWebview,
```

- [ ] **Step 5: Add a mockBot trigger for partner_form**

Open `src/engine/mockBot.js`. After the last `registerRule` block (search for the end of the file via `tail -20`), add:

```js
// ─── Embedded Webview — partner_form default ───────────────────
// Trigger: "webview", "embed", "partner form", "embedded webview"
registerRule({
  match: /^(webview|embed(ded)?( webview)?|partner form)$/i,
  build: () => ({ type: 'embedded_webview', payload: getVariantPayload('embedded_webview', 'partner_form') }),
})
```

- [ ] **Step 6: Add the Studio palette icon**

Open `src/studio/WidgetPalette.jsx`. The `WIDGET_ICONS` map already imports `ExternalLink` for other widgets — verify with `grep -n "ExternalLink" src/studio/WidgetPalette.jsx`. If `ExternalLink` is not yet imported, add it to the lucide-react import block. Then add to `WIDGET_ICONS`:

```jsx
embedded_webview:   ExternalLink,
```

- [ ] **Step 7: Build verification**

Run: `npm run build`
Expected: build completes with zero new errors.

- [ ] **Step 8: Browser smoke test**

Run: `npm run dev` (background). Open the URL it prints (typically `http://localhost:5173`). In the chat input, type `webview` and press Enter. Expected: a card appears with the placeholder text `EmbeddedWebview · partner_form`. Stop the dev server (`kill %1` or close the foreground tab).

- [ ] **Step 9: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss src/engine/widgetSchemas.js src/chat/registry.js src/engine/mockBot.js src/studio/WidgetPalette.jsx
git commit -m "feat(widget): Embedded Webview — Pass 1 region 1 (registration)"
```

---

## Task 2: Compact card shell (header + payload-driven copy)

**Goal:** Replace the placeholder with the §1 shell, §2 header (icon badge + title + description), eyebrow, and a primary CTA. No poster yet.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Replace the stub component body**

In `src/widgets/EmbeddedWebview.jsx`, replace the `EmbeddedWebview` function with:

```jsx
export function EmbeddedWebview({ payload, onSubmit }) {
  const variant = payload?.variant ?? 'partner_form'
  const meta = VARIANT_META[variant] ?? VARIANT_META.partner_form
  const Icon = meta.icon

  const eyebrow = payload?.category
    ? `${meta.eyebrowPrefix} · ${payload.category}`
    : meta.eyebrowPrefix

  const handleOpen = () => {
    /* Sheet wiring lands in Task 5. */
  }

  return (
    <article className={cx(styles.card, styles[`card_${variant}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge}>
          <Icon size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 className={styles.title}>{payload?.title}</h3>
          {payload?.description && (
            <p className={styles.description}>{payload.description}</p>
          )}
        </div>
      </header>

      <div className={styles.ctaRow}>
        <Button
          variant="primary"
          fullWidth
          onClick={handleOpen}
        >
          <span className={styles.ctaLabel}>{meta.ctaOpen}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Replace the stub SCSS with the shell**

Replace the entire contents of `src/widgets/embeddedWebview.module.scss` with:

```scss
/* Embedded Webview (#27) — see widget-conventions.md. */

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-150);
  padding: var(--space-200);
  width: 100%;
  min-height: 24rem;

  --color-action-primary: var(--brand-60);
  --color-action-primary-hover: color-mix(in srgb, var(--brand-60) 88%, black);

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

.header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-125);
}

.iconBadge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  flex: 1;
}

.eyebrow {
  margin: 0;
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--grey-50);
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

.ctaRow {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
}

.ctaLabel {
  flex: 1;
  text-align: left;
}
```

- [ ] **Step 3: Build + §0.1 grep**

Run: `npm run build && grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss`
Expected: build succeeds. Grep: only `24rem` floor matches; no other px/rem.

- [ ] **Step 4: Browser verify**

Run: `npm run dev`. Type `webview` in chat. Expected: card shows the brand-tinted icon badge, eyebrow `PARTNER · ONBOARDING`, title "Background verification — vendor portal", description, and a full-width primary CTA "Open verification portal →". Hover: border darkens, shadow appears.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 2 (shell + header + CTA)"
```

---

## Task 3: Compact card poster region + trust capsule + caption

**Goal:** Add the 16:9 poster image with an overlaid trust capsule (favicon + domain). Caption row for `Approx. N min`. Fallback layout when `poster_url` is null.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Add the poster region to the JSX**

In `EmbeddedWebview`, between the `<header>` and the `<div className={styles.ctaRow}>`, insert:

```jsx
      <div
        className={cx(styles.poster, !payload?.poster_url && styles.poster_empty)}
        aria-hidden
      >
        {payload?.poster_url
          ? (
            <img
              className={styles.posterImg}
              src={payload.poster_url}
              alt=""
              loading="lazy"
            />
          )
          : (
            <Globe className={styles.posterFallbackGlyph} size={36} strokeWidth={1.5} aria-hidden />
          )
        }
        <div className={styles.trustCapsule}>
          {payload?.favicon_url
            ? <img className={styles.faviconImg} src={payload.favicon_url} alt="" />
            : <Globe size={14} strokeWidth={2} aria-hidden />
          }
          <span className={styles.faviconDomain}>{payload?.domain_label}</span>
        </div>
      </div>

      {payload?.estimated_minutes != null && (
        <p className={styles.estimate}>Approx. {payload.estimated_minutes} min</p>
      )}
```

- [ ] **Step 2: Add poster + trust-capsule SCSS**

Append to `src/widgets/embeddedWebview.module.scss`:

```scss
.poster {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-150);
  background: color-mix(in srgb, var(--brand-60) 10%, var(--white));
  border: var(--border-width-100) solid var(--grey-10);
  overflow: hidden;
}

.poster_empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.posterImg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.posterFallbackGlyph {
  color: var(--brand-60);
  opacity: var(--opacity-024);
}

.trustCapsule {
  position: absolute;
  bottom: var(--space-100);
  left: var(--space-100);
  display: inline-flex;
  align-items: center;
  gap: var(--space-050);
  padding: var(--space-050) var(--space-100);
  border-radius: var(--radius-500);
  background: color-mix(in srgb, var(--white) 88%, transparent);
  border: var(--border-width-100) solid var(--grey-10);
  backdrop-filter: blur(var(--size-06));
  -webkit-backdrop-filter: blur(var(--size-06));
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-medium);
  color: var(--grey-80);
  max-width: calc(100% - var(--space-200));
}

.faviconImg {
  display: block;
  width: var(--size-14);
  height: var(--size-14);
  border-radius: var(--radius-100);
  flex-shrink: 0;
}

.faviconDomain {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.estimate {
  margin: 0;
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-200);
  color: var(--grey-50);
}
```

Note: `.poster_empty` centres the fallback `Globe` glyph; the trust capsule still sits bottom-left as designed.

- [ ] **Step 3: Build + §0.1 grep**

Run: `npm run build && grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss`
Expected: build succeeds. Grep matches: only `24rem` floor. The `aspect-ratio: 16 / 9` is exempt (§0.1 legitimate-exception list).

- [ ] **Step 4: Browser verify (poster present + null cases)**

Run: `npm run dev`. Type `webview` (partner_form) — confirm poster image fills the 16:9 region with the trust capsule overlaid bottom-left. Type `webview reader` — wait, the trigger doesn't exist yet. Skip the null-poster check until Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 3 (poster + trust capsule)"
```

---

## Task 4: All four variants reachable

**Goal:** Add mock-bot triggers for `training`, `reader`, `preview` so the variant-driven copy/icon switches are testable.

**Files:**
- Modify: `src/engine/mockBot.js`

- [ ] **Step 1: Add the three triggers**

In `src/engine/mockBot.js`, after the existing `embedded_webview` partner_form rule, add:

```js
// ─── Embedded Webview — training variant ───────────────────────
registerRule({
  match: /^(webview training|training webview|embedded training|webview compliance)$/i,
  build: () => ({ type: 'embedded_webview', payload: getVariantPayload('embedded_webview', 'training') }),
})

// ─── Embedded Webview — reader variant ─────────────────────────
registerRule({
  match: /^(webview reader|reader webview|embedded reader|read this|policy webview)$/i,
  build: () => ({ type: 'embedded_webview', payload: getVariantPayload('embedded_webview', 'reader') }),
})

// ─── Embedded Webview — preview variant ────────────────────────
registerRule({
  match: /^(webview preview|preview webview|embedded preview)$/i,
  build: () => ({ type: 'embedded_webview', payload: getVariantPayload('embedded_webview', 'preview') }),
})
```

Order matters in `mockBot.js`: the broader `webview` rule (added in Task 1) must be **after** these three, otherwise `webview training` would match the partner_form rule first. Move the partner_form rule below the three new ones, or tighten the partner_form regex to `/^(webview|partner form|embed(ded)?( webview)?)$/i` and ensure the three sub-variant rules are registered first. The simplest fix: re-order so the three sub-variant rules register **before** the partner_form catch-all.

After the edit, the four rules should appear in this order:
1. `webview training` rule
2. `webview reader` rule
3. `webview preview` rule
4. `webview` (partner_form fallback) rule — **moves down**

- [ ] **Step 2: Build + browser verify**

Run: `npm run build && npm run dev`.

For each trigger, type it in chat and check the rendered card:

| Trigger | Expected eyebrow | Expected CTA | Expected poster |
|---|---|---|---|
| `webview` | `PARTNER · ONBOARDING` | `Open verification portal` | image |
| `webview training` | `TRAINING · COMPLIANCE` | `Start training` | image |
| `webview reader` | `READING · POLICY` | `Open reader` | empty (Globe centred) |
| `webview preview` | `PREVIEW · REFERENCE` | `Open preview` | empty (Globe centred) |

For the empty-poster variants, the trust capsule still sits bottom-left and reads `example.com`.

- [ ] **Step 3: Commit**

```bash
git add src/engine/mockBot.js
git commit -m "feat(widget): Embedded Webview — Pass 1 region 4 (all four variants)"
```

---

## Task 5: Portal sheet skeleton (open / close + scrim + focus)

**Goal:** Add the `EmbeddedWebviewSheet` component and wire it to the CTA. Three-phase animation, scrim, Esc-to-close, focus on close button. No iframe content yet — body is an empty placeholder.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Add `EmbeddedWebviewSheet` to the component file**

In `src/widgets/EmbeddedWebview.jsx`, after the `EmbeddedWebview` function, add:

```jsx
/* ─── EmbeddedWebviewSheet — portaled bottom-sheet ─────────────────
   Same chat-frame containment pattern as JobDetailsModal /
   SignatureSheet: portaled into #chat-modal-root, three-phase
   animation, scrim + Esc + close ×, single in-flight close guard. */

function EmbeddedWebviewSheet({
  payload,
  variant,
  meta,
  onClose,
  onCompleted,
}) {
  const [phase, setPhase] = useState('entering')
  const closingRef = useRef(false)
  const closeBtnRef = useRef(null)
  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null

  /* Two RAFs so the initial styles paint before transition kicks in. */
  useEffect(() => {
    const r = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('open'))
    })
    return () => cancelAnimationFrame(r)
  }, [])

  useEffect(() => {
    if (phase !== 'open') return
    closeBtnRef.current?.focus({ preventScroll: true })
  }, [phase])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setPhase('exiting')
    window.setTimeout(onClose, SHEET_ANIM_DURATION)
  }, [onClose])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  if (!portalTarget) return null

  return createPortal(
    <div
      className={cx(styles.shLayer, styles[`shLayer_${phase}`])}
      role="dialog"
      aria-modal="true"
      aria-label={payload?.title}
    >
      <div className={styles.shScrim} onClick={requestClose} aria-hidden="true" />
      <div className={styles.shSheet}>
        <header className={styles.shHeader}>
          <div className={styles.shHeaderText}>
            {payload?.favicon_url
              ? <img className={styles.shFavicon} src={payload.favicon_url} alt="" />
              : <Globe size={14} strokeWidth={2} aria-hidden />
            }
            <span className={styles.shDomain}>{payload?.domain_label}</span>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.shClose}
            onClick={requestClose}
            aria-label="Close"
          >
            <XIcon size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className={styles.shBody} aria-busy="true">
          {/* Iframe lands in Task 6 */}
        </div>
      </div>
    </div>,
    portalTarget,
  )
}
```

- [ ] **Step 2: Wire the sheet from the card**

In the `EmbeddedWebview` function, replace the current `handleOpen` placeholder with state + handlers:

```jsx
export function EmbeddedWebview({ payload, onSubmit }) {
  const variant = payload?.variant ?? 'partner_form'
  const meta = VARIANT_META[variant] ?? VARIANT_META.partner_form
  const Icon = meta.icon

  const [sheetOpen, setSheetOpen] = useState(false)

  const eyebrow = payload?.category
    ? `${meta.eyebrowPrefix} · ${payload.category}`
    : meta.eyebrowPrefix

  const handleOpen = useCallback(() => {
    setSheetOpen(true)
  }, [])

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false)
  }, [])

  const handleCompleted = useCallback((data, method) => {
    /* Submission wiring lands in Task 9. For now, just close. */
    setSheetOpen(false)
  }, [])

  return (
    <article className={cx(styles.card, styles[`card_${variant}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge}>
          <Icon size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 className={styles.title}>{payload?.title}</h3>
          {payload?.description && (
            <p className={styles.description}>{payload.description}</p>
          )}
        </div>
      </header>

      <div
        className={cx(styles.poster, !payload?.poster_url && styles.poster_empty)}
        aria-hidden
      >
        {payload?.poster_url
          ? (
            <img className={styles.posterImg} src={payload.poster_url} alt="" loading="lazy" />
          )
          : (
            <Globe className={styles.posterFallbackGlyph} size={36} strokeWidth={1.5} aria-hidden />
          )
        }
        <div className={styles.trustCapsule}>
          {payload?.favicon_url
            ? <img className={styles.faviconImg} src={payload.favicon_url} alt="" />
            : <Globe size={14} strokeWidth={2} aria-hidden />
          }
          <span className={styles.faviconDomain}>{payload?.domain_label}</span>
        </div>
      </div>

      {payload?.estimated_minutes != null && (
        <p className={styles.estimate}>Approx. {payload.estimated_minutes} min</p>
      )}

      <div className={styles.ctaRow}>
        <Button variant="primary" fullWidth onClick={handleOpen}>
          <span className={styles.ctaLabel}>{meta.ctaOpen}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>

      {sheetOpen && (
        <EmbeddedWebviewSheet
          payload={payload}
          variant={variant}
          meta={meta}
          onClose={handleSheetClose}
          onCompleted={handleCompleted}
        />
      )}
    </article>
  )
}
```

- [ ] **Step 3: Add sheet SCSS**

Append to `src/widgets/embeddedWebview.module.scss`:

```scss
/* ─── Portal sheet ─────────────────────────────────────────────── */

.shLayer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;
  z-index: 2;
}

.shScrim {
  position: absolute;
  inset: 0;
  background: var(--grey-90);
  opacity: var(--opacity-000);
  backdrop-filter: blur(0);
  -webkit-backdrop-filter: blur(0);
  transition:
    opacity 320ms cubic-bezier(0.18, 0.9, 0.28, 1.04),
    backdrop-filter 320ms cubic-bezier(0.2, 0.8, 0.3, 1),
    -webkit-backdrop-filter 320ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.shSheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  /* Spec: min(36rem, 90% of chat-frame). On a phone-sized chat-frame
     the 90% cap dominates; on tall desktops the 36rem cap dominates so
     the sheet doesn't run away vertically. The 36rem here is a content
     CAP, not a §4 floor — different semantic from card min-heights. */
  height: min(36rem, 90%);
  min-height: 24rem;
  background: var(--white);
  border: var(--border-width-100) solid var(--grey-10);
  border-bottom: 0;
  border-radius: var(--radius-300) var(--radius-300) 0 0;
  box-shadow: 0 calc(-1 * var(--size-12)) var(--size-32) color-mix(in srgb, var(--grey-90) 18%, transparent);
  transform: translateY(100%);
  transition:
    transform 320ms cubic-bezier(0.18, 0.9, 0.28, 1.04),
    opacity 220ms cubic-bezier(0.2, 0.8, 0.3, 1);
  opacity: var(--opacity-000);
  overflow: hidden;
}

.shLayer_open .shScrim {
  opacity: var(--opacity-056);
  backdrop-filter: blur(var(--size-04));
  -webkit-backdrop-filter: blur(var(--size-04));
}

.shLayer_open .shSheet {
  transform: translateY(0);
  opacity: var(--opacity-100);
}

.shLayer_exiting .shScrim {
  opacity: var(--opacity-000);
  backdrop-filter: blur(0);
  -webkit-backdrop-filter: blur(0);
}

.shLayer_exiting .shSheet {
  transform: translateY(100%);
  opacity: var(--opacity-000);
}

.shHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-150);
  padding: var(--space-150) var(--space-200);
  border-bottom: var(--border-width-100) solid var(--grey-10);
  flex-shrink: 0;
}

.shHeaderText {
  display: inline-flex;
  align-items: center;
  gap: var(--space-075);
  min-width: 0;
  flex: 1;
  color: var(--grey-80);
}

.shFavicon {
  display: block;
  width: var(--size-16);   /* Nexus has no --size-14; scale jumps 12 → 16 */
  height: var(--size-16);
  border-radius: var(--radius-100);
  flex-shrink: 0;
}

.shDomain {
  font-size: var(--font-size-200);
  font-weight: var(--font-weight-medium);
  color: var(--grey-80);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shClose {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--size-36);
  height: var(--size-36);
  border-radius: var(--radius-100);
  background: transparent;
  border: var(--border-width-100) solid transparent;
  color: var(--grey-80);
  cursor: pointer;
  transition:
    background 200ms cubic-bezier(0.2, 0.8, 0.3, 1),
    border-color 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.shClose:hover {
  background: var(--grey-10);
  border-color: var(--grey-20);
}

.shBody {
  position: relative;
  flex: 1;
  background: var(--grey-10);
  overflow: hidden;
}
```

- [ ] **Step 4: Build + §0.1 grep**

Run: `npm run build && grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss`
Expected: `24rem` (card floor) and `36rem` (sheet cap inside `min()`) — the latter is a content cap, not a §4 floor; documented inline with a comment. `cubic-bezier(...)` args excluded by the pattern.

- [ ] **Step 5: Browser verify (sheet open/close)**

Run: `npm run dev`. Type `webview`, tap the CTA. Expected: scrim fades in, sheet slides up from the bottom of the chat frame, holds the favicon + domain header bar with an empty grey body region. Press Esc, click the close ×, or click the scrim — sheet slides back down, scrim fades out. Tab focus on open lands on the close button.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 5 (sheet shell + scrim)"
```

---

## Task 6: Iframe + loading sub-state

**Goal:** Mount the iframe inside the sheet body. Append `?wid=<widget_id>` to the URL. Apply sandbox/allow defaults. Show a centred `Loader2` until iframe `load` fires; then reveal at `opacity: 1`.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Build the iframe URL helper**

In `src/widgets/EmbeddedWebview.jsx`, near the top of the file (just after the constants block), add:

```jsx
const DEFAULT_SANDBOX = 'allow-scripts allow-forms allow-same-origin allow-popups'

function buildIframeSrc(url, widgetId) {
  if (!url || !widgetId) return url
  try {
    /* URL constructor handles relative, absolute, and hash-bearing URLs.
       Append ?wid (or &wid) without disturbing existing query / hash. */
    const u = new URL(url, window.location.origin)
    u.searchParams.set('wid', widgetId)
    return u.toString()
  } catch {
    /* Fallback: malformed URL, append best-effort. */
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}wid=${encodeURIComponent(widgetId)}`
  }
}
```

- [ ] **Step 2: Render the iframe with loading state**

In `EmbeddedWebviewSheet`, add the iframe state hooks after the existing `useState` calls:

```jsx
  const [iframeState, setIframeState] = useState('loading')   // 'loading' | 'live' | 'error'
  const iframeRef = useRef(null)
```

Replace the `<div className={styles.shBody} aria-busy="true">{/* Iframe lands in Task 6 */}</div>` with:

```jsx
        <div className={styles.shBody} aria-busy={iframeState === 'loading'}>
          {iframeState === 'loading' && (
            <div className={styles.shLoader} role="status" aria-live="polite">
              <Loader2 className={styles.shSpinner} size={28} strokeWidth={2} aria-hidden />
              <span className={styles.srOnly}>Loading {payload?.domain_label}…</span>
            </div>
          )}

          <iframe
            ref={iframeRef}
            className={cx(styles.shIframe, iframeState !== 'live' && styles.shIframe_hidden)}
            src={buildIframeSrc(payload?.url, payload?.widget_id)}
            sandbox={payload?.sandbox ?? DEFAULT_SANDBOX}
            allow={payload?.allow ?? ''}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            title={payload?.title ?? 'Embedded content'}
            onLoad={() => setIframeState('live')}
            onError={() => setIframeState('error')}
          />
        </div>
```

- [ ] **Step 3: Append iframe + loader SCSS**

Append to `src/widgets/embeddedWebview.module.scss`:

```scss
.shIframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--grey-10);
  opacity: var(--opacity-100);
  transition: opacity 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.shIframe_hidden {
  opacity: var(--opacity-000);
  pointer-events: none;
}

.shLoader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: var(--brand-60);
}

.shSpinner {
  animation: ewvSpin 800ms linear infinite;
}

@keyframes ewvSpin {
  to { transform: rotate(360deg); }
}

.srOnly {
  position: absolute;
  width: var(--size-01);
  height: var(--size-01);
  padding: 0;
  margin: calc(-1 * var(--size-01));
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- [ ] **Step 4: Build + browser verify**

Run: `npm run build && npm run dev`. Type `webview reader` (which uses `https://example.com/`). Expected: sheet opens, spinner shows briefly, then example.com renders inside the iframe-frame. Inspect the iframe `src` in DevTools — confirm `?wid=webv_xxx` is appended. Confirm `sandbox` and `referrerpolicy` attributes match the spec defaults.

For the `partner_form` and `training` variants the URL points to `/embed-fixtures/...` which doesn't exist yet — the iframe will trigger the `error` path (covered in Task 7). Skip those for now.

- [ ] **Step 5: §0.1 grep**

Run: `grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss`
Expected: only `24rem` and `36rem` floors.

- [ ] **Step 6: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 6 (iframe + loading)"
```

---

## Task 7: Error sub-state (8s timeout + retry)

**Goal:** If the iframe doesn't fire `load` within 8 seconds, OR fires `error`, show a `WifiOff` panel with "Try again" (re-mounts iframe) and "Close" (dismisses sheet).

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Add timeout + retry handlers**

In `EmbeddedWebviewSheet`, add a load-timeout effect after the existing iframe-state hooks:

```jsx
  const [retryNonce, setRetryNonce] = useState(0)

  /* 8s load watchdog. Cleared when iframe fires `load`. */
  useEffect(() => {
    if (iframeState !== 'loading') return
    const t = window.setTimeout(() => setIframeState('error'), 8000)
    return () => window.clearTimeout(t)
  }, [iframeState, retryNonce])

  const handleRetry = useCallback(() => {
    setIframeState('loading')
    setRetryNonce((n) => n + 1)        // forces iframe key to change → re-mount
  }, [])
```

- [ ] **Step 2: Re-mount iframe via key on retry**

Update the iframe element to include the `retryNonce` in its key so a retry forces a fresh mount:

```jsx
          <iframe
            key={retryNonce}
            ref={iframeRef}
            className={cx(styles.shIframe, iframeState !== 'live' && styles.shIframe_hidden)}
            src={buildIframeSrc(payload?.url, payload?.widget_id)}
            sandbox={payload?.sandbox ?? DEFAULT_SANDBOX}
            allow={payload?.allow ?? ''}
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
            title={payload?.title ?? 'Embedded content'}
            onLoad={() => setIframeState('live')}
            onError={() => setIframeState('error')}
          />
```

- [ ] **Step 3: Render the error panel**

Inside `.shBody`, after the `<iframe>`, add:

```jsx
          {iframeState === 'error' && (
            <div className={styles.shError} role="alert">
              <WifiOff className={styles.shErrorGlyph} size={36} strokeWidth={1.75} aria-hidden />
              <p className={styles.shErrorTitle}>Couldn't load {payload?.domain_label}</p>
              <p className={styles.shErrorBody}>
                Check your connection or try again in a moment.
              </p>
              <div className={styles.shErrorActions}>
                <Button variant="secondary" onClick={handleRetry}>
                  <RotateCcw size={16} strokeWidth={2} aria-hidden />
                  <span>Try again</span>
                </Button>
                <button
                  type="button"
                  className={styles.shErrorClose}
                  onClick={requestClose}
                >
                  Close
                </button>
              </div>
            </div>
          )}
```

- [ ] **Step 4: Append error-panel SCSS**

```scss
.shError {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-100);
  padding: var(--space-200);
  background: var(--white);
  text-align: center;
}

.shErrorGlyph {
  color: var(--color-text-error);
  margin-bottom: var(--space-100);
}

.shErrorTitle {
  margin: 0;
  font-size: var(--font-size-300);
  font-weight: var(--font-weight-semibold);
  color: var(--grey-90);
}

.shErrorBody {
  margin: 0;
  font-size: var(--font-size-200);
  color: var(--grey-60);
  max-width: 28rem;
}

.shErrorActions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-150);
  margin-top: var(--space-100);
}

.shErrorClose {
  background: transparent;
  border: 0;
  padding: var(--space-100);
  font-size: var(--font-size-200);
  font-weight: var(--font-weight-medium);
  color: var(--grey-60);
  cursor: pointer;
  text-decoration: underline;
  text-decoration-thickness: var(--border-width-100);
  text-underline-offset: var(--border-width-300);
}

.shErrorClose:hover {
  color: var(--grey-80);
}
```

- [ ] **Step 5: Browser verify**

Run: `npm run dev`. Type `webview` (partner_form — points at non-existent `/embed-fixtures/partner-form.html`). Tap CTA. Expected: spinner shows for ≤8s, then the error panel appears with `WifiOff` glyph, copy "Couldn't load partners.bgv-co.in", "Try again" + "Close" actions. Tap "Try again" → spinner returns and times out again. Tap "Close" → sheet dismisses.

- [ ] **Step 6: §0.1 grep**

Run: `grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss | grep -v cubic-bezier`
Expected: only `24rem`, `36rem`, and `28rem` (max-width on error body — that's a content cap, allowed by the legitimate-exceptions list under "responsive content sizing"). If `28rem` flags as illegitimate to your reading of §0.1, replace with `var(--size-28)` × scaling — but `28rem` for a paragraph max-width is on par with the family's `clamp(16rem, 88%, 32rem)` carousel exception. Document this in the file with a comment if you keep it.

- [ ] **Step 7: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 7 (error sub-state)"
```

---

## Task 8: postMessage protocol (origin gate + handlers)

**Goal:** Listen for `postMessage` events from the iframe. Three-check origin gate. Dispatch `complete` / `progress` / `cancel` handlers. Silently drop non-conforming messages with one console warning per reason.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`

- [ ] **Step 1: Add the listener effect**

In `EmbeddedWebviewSheet`, add new state and the listener after the existing iframe-state effects:

```jsx
  const [progress, setProgress] = useState(null)            // 0–100 from `progress` event
  const droppedReasonsRef = useRef(new Set())

  /* postMessage listener — attaches when the sheet is open, detaches
     on close. Three-check origin gate; one console warn per reason
     per widget instance. */
  useEffect(() => {
    function onMessage(event) {
      const allowedOrigin = payload?.allowed_origin
      const expectedId = payload?.widget_id

      if (allowedOrigin && event.origin !== allowedOrigin) {
        warnOnce('origin mismatch')
        return
      }
      if (event.data?.source !== 'embedded_webview') {
        return                                              // not for us — silent drop, no warn
      }
      if (event.data?.widget_id !== expectedId) {
        warnOnce('widget_id mismatch')
        return
      }

      switch (event.data.event) {
        case 'progress': {
          const pct = clamp(0, 100, Number(event.data.data?.percent ?? 0))
          setProgress(pct)
          return
        }
        case 'complete': {
          onCompleted?.(event.data.data ?? {}, 'postmessage')
          return
        }
        case 'cancel': {
          requestClose()
          return
        }
        default: {
          warnOnce(`unknown event "${event.data.event}"`)
          return
        }
      }
    }

    function warnOnce(reason) {
      if (droppedReasonsRef.current.has(reason)) return
      droppedReasonsRef.current.add(reason)
      console.warn(`[EmbeddedWebview] postMessage dropped: ${reason}`)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [payload, onCompleted, requestClose])
```

- [ ] **Step 2: Add the `clamp` helper**

Near the top of the file (after `buildIframeSrc`), add:

```jsx
function clamp(min, max, v) {
  return Math.max(min, Math.min(max, v))
}
```

- [ ] **Step 3: Build + verify (no behaviour change yet — listener is silent without fixtures)**

Run: `npm run build`
Expected: build succeeds. No fixture pages yet, so the listener has nothing to receive — but it shouldn't break the existing flow. Test with `webview reader`: open sheet, confirm console is clean (no warnings).

- [ ] **Step 4: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx
git commit -m "feat(widget): Embedded Webview — Pass 1 region 8 (postMessage protocol)"
```

---

## Task 9: Variant-conditional sheet footer + completion paths

**Goal:** `reader` shows a primary "I've read this" CTA in the sheet footer that fires user-attested completion. `preview` shows a secondary "Done" CTA that closes silently. `partner_form` and `training` keep the body edge-to-edge with no footer.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Render the footer per variant**

In `EmbeddedWebviewSheet`, after the `</div>` that closes `.shBody`, add:

```jsx
        {(variant === 'reader' || variant === 'preview') && (
          <footer className={styles.shFooter}>
            {variant === 'reader' && (
              <Button
                variant="primary"
                fullWidth
                onClick={() => onCompleted?.({}, 'attested')}
              >
                I've read this
              </Button>
            )}
            {variant === 'preview' && (
              <Button
                variant="secondary"
                fullWidth
                onClick={requestClose}
              >
                Done
              </Button>
            )}
          </footer>
        )}
```

The `partner_form` and `training` variants render no footer — the iframe owns the submit (`partner_form`) or the progress chip on the header announces state (`training`). The bot-author can always provide a custom dismiss path inside the partner page.

- [ ] **Step 2: Apply the same `--color-action-primary` override on the sheet**

The sheet portals into `#chat-modal-root`, **outside** the card's CSS scope. The sheet's primary button needs the brand-60 override locally. Add to `.shSheet` in the SCSS:

```scss
.shSheet {
  /* …existing rules… */

  --color-action-primary: var(--brand-60);
  --color-action-primary-hover: color-mix(in srgb, var(--brand-60) 88%, black);
}
```

(Edit the existing `.shSheet` block; don't add a duplicate.)

- [ ] **Step 3: Add footer SCSS**

Append to `src/widgets/embeddedWebview.module.scss`:

```scss
.shFooter {
  display: flex;
  flex-direction: column;
  gap: var(--space-100);
  padding: var(--space-150) var(--space-200);
  border-top: var(--border-width-100) solid var(--grey-10);
  background: var(--white);
  flex-shrink: 0;
}
```

- [ ] **Step 4: Browser verify**

Run: `npm run dev`. For each variant:

- `webview reader` → sheet has "I've read this" primary CTA. Tap it → sheet auto-closes.
- `webview preview` → sheet has "Done" secondary CTA. Tap it → sheet closes.
- `webview` (partner_form) → no footer.
- `webview training` → no footer.

The completion handler in the card just closes the sheet for now (Task 10 wires actual `widget_response` posting).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 9 (variant footers)"
```

---

## Task 10: Card state machine — completion + dismissed + widget_response

**Goal:** Track `idle / sheet_open / dismissed / completed` on the card. On `completed`, replace the CTA with the §10 success banner; mark the favicon chip with a `Check`; lock the sheet. On `dismissed`, swap CTA copy to "Reopen". For `training`, preserve the last `progress` value as a caption. Fire `onSubmit` (the registry handle for `widget_response`) when `completed` and `silent !== true`.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Add card state**

Replace the body of the `EmbeddedWebview` function with:

```jsx
export function EmbeddedWebview({ payload, onSubmit }) {
  const variant = payload?.variant ?? 'partner_form'
  const meta = VARIANT_META[variant] ?? VARIANT_META.partner_form
  const Icon = meta.icon

  const [cardState, setCardState] = useState('idle')         // 'idle' | 'sheet_open' | 'dismissed' | 'completed'
  const [lastProgress, setLastProgress] = useState(null)     // training-variant caption
  const totalOpenMsRef = useRef(0)
  const lastOpenedAtRef = useRef(0)

  const eyebrow = payload?.category
    ? `${meta.eyebrowPrefix} · ${payload.category}`
    : meta.eyebrowPrefix

  const handleOpen = useCallback(() => {
    if (cardState === 'completed') return                     // proof state — locked
    lastOpenedAtRef.current = Date.now()
    setCardState('sheet_open')
  }, [cardState])

  const handleSheetClose = useCallback(() => {
    if (lastOpenedAtRef.current) {
      totalOpenMsRef.current += Date.now() - lastOpenedAtRef.current
      lastOpenedAtRef.current = 0
    }
    setCardState((prev) => (prev === 'completed' ? prev : 'dismissed'))
  }, [])

  const handleCompleted = useCallback((data, method) => {
    if (lastOpenedAtRef.current) {
      totalOpenMsRef.current += Date.now() - lastOpenedAtRef.current
      lastOpenedAtRef.current = 0
    }
    setCardState('completed')

    if (payload?.silent !== true) {
      onSubmit?.({
        type: 'widget_response',
        payload: {
          widget_id: payload?.widget_id,
          source_type: 'embedded_webview',
          variant,
          completed: true,
          completion_method: method,
          data: data ?? {},
          total_open_time_seconds: Math.round(totalOpenMsRef.current / 1000),
        },
      })
    }
  }, [onSubmit, payload, variant])

  const handleProgress = useCallback((pct) => {
    setLastProgress(pct)
  }, [])

  const sheetOpen = cardState === 'sheet_open'

  const ctaLabel = cardState === 'dismissed' ? meta.ctaReopen : meta.ctaOpen
  const showSuccess = cardState === 'completed'

  return (
    <article className={cx(styles.card, styles[`card_${variant}`], styles[`card_${cardState}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge}>
          <Icon size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 className={styles.title}>{payload?.title}</h3>
          {payload?.description && (
            <p className={styles.description}>{payload.description}</p>
          )}
        </div>
      </header>

      <div
        className={cx(styles.poster, !payload?.poster_url && styles.poster_empty)}
        aria-hidden
      >
        {payload?.poster_url
          ? <img className={styles.posterImg} src={payload.poster_url} alt="" loading="lazy" />
          : <Globe className={styles.posterFallbackGlyph} size={36} strokeWidth={1.5} aria-hidden />
        }
        <div className={cx(styles.trustCapsule, showSuccess && styles.trustCapsule_done)}>
          {showSuccess
            ? <Check size={14} strokeWidth={2.5} aria-hidden />
            : (payload?.favicon_url
                ? <img className={styles.faviconImg} src={payload.favicon_url} alt="" />
                : <Globe size={14} strokeWidth={2} aria-hidden />)
          }
          <span className={styles.faviconDomain}>{payload?.domain_label}</span>
        </div>
      </div>

      {payload?.estimated_minutes != null && !showSuccess && (
        <p className={styles.estimate}>
          Approx. {payload.estimated_minutes} min
          {variant === 'training' && cardState === 'dismissed' && lastProgress != null && (
            <> · Last left at {Math.round(lastProgress)}%</>
          )}
        </p>
      )}

      {showSuccess
        ? (
          <div className={styles.successBanner}>
            <span className={styles.successChip}>
              <Check size={14} strokeWidth={2.5} aria-hidden />
              <span>Submitted</span>
            </span>
            <p className={styles.successMeta}>
              Submitted at {new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(new Date())}.
            </p>
          </div>
        )
        : (
          <div className={styles.ctaRow}>
            <Button variant="primary" fullWidth onClick={handleOpen}>
              <span className={styles.ctaLabel}>{ctaLabel}</span>
              <ArrowRight size={16} strokeWidth={2} aria-hidden />
            </Button>
          </div>
        )
      }

      {sheetOpen && (
        <EmbeddedWebviewSheet
          payload={payload}
          variant={variant}
          meta={meta}
          onClose={handleSheetClose}
          onCompleted={handleCompleted}
          onProgress={handleProgress}
        />
      )}
    </article>
  )
}
```

- [ ] **Step 2: Wire `onProgress` into the sheet**

In `EmbeddedWebviewSheet`, accept the `onProgress` prop and forward `progress` events:

```jsx
function EmbeddedWebviewSheet({
  payload,
  variant,
  meta,
  onClose,
  onCompleted,
  onProgress,            // ← add
}) {
```

In the postMessage handler's `progress` case, call it:

```jsx
        case 'progress': {
          const pct = clamp(0, 100, Number(event.data.data?.percent ?? 0))
          setProgress(pct)
          onProgress?.(pct)
          return
        }
```

- [ ] **Step 3: Append success-banner SCSS**

```scss
.successBanner {
  display: flex;
  flex-direction: column;
  gap: var(--space-050);
  margin-top: auto;
}

.successChip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-050);
  align-self: flex-start;
  padding: var(--space-025) var(--space-100);
  border-radius: var(--radius-500);
  background: color-mix(in srgb, var(--color-text-success) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--color-text-success) 24%, transparent);
  color: var(--color-text-success);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
}

.successMeta {
  margin: 0;
  font-size: var(--font-size-200);
  color: var(--grey-80);
  font-variant-numeric: tabular-nums;
}

.trustCapsule_done {
  background: color-mix(in srgb, var(--color-text-success) 10%, var(--white));
  border-color: color-mix(in srgb, var(--color-text-success) 24%, transparent);
  color: var(--color-text-success);
  transition:
    background 240ms cubic-bezier(0.18, 0.9, 0.28, 1.4),
    border-color 240ms cubic-bezier(0.18, 0.9, 0.28, 1.4),
    color 240ms cubic-bezier(0.18, 0.9, 0.28, 1.4);
}
```

- [ ] **Step 4: Browser verify**

Run: `npm run dev`.

- `webview reader` → tap CTA → sheet opens → tap "I've read this" → sheet closes, card swaps to success state (chip + timestamp; favicon chip turns green with `Check`). The CTA is gone. Re-tapping the CTA region does nothing because there's no CTA. ✅
- `webview preview` → tap CTA → tap "Done" → sheet closes, CTA copy is now "Reopen preview". Tap again → sheet reopens. ✅
- `webview` (partner_form) → opens → load fails (no fixture yet) → close → CTA copy is "Reopen verification portal".
- `webview training` → same as partner_form for now (fixture in Task 12).

- [ ] **Step 5: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 10 (state machine + success banner)"
```

---

## Task 11: Training progress chip on sheet header

**Goal:** When the `training` variant receives a `progress` event, animate the percent value into a chip that sits between the domain label and the close button.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Add a RAF count-up helper**

Near the top of `EmbeddedWebview.jsx` (after `clamp`), add:

```jsx
function useCountUp(target, durationMs = 280) {
  const [value, setValue] = useState(target ?? 0)
  const startedRef = useRef({ from: 0, to: 0, t0: 0, raf: 0 })

  useEffect(() => {
    if (target == null) return
    cancelAnimationFrame(startedRef.current.raf)
    startedRef.current = {
      from: value,
      to: target,
      t0: performance.now(),
      raf: requestAnimationFrame(tick),
    }
    function tick(now) {
      const { from, to, t0 } = startedRef.current
      const t = Math.min(1, (now - t0) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (to - from) * eased)
      if (t < 1) startedRef.current.raf = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(startedRef.current.raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}
```

- [ ] **Step 2: Render the chip in the sheet header**

In `EmbeddedWebviewSheet`, immediately after the `useCallback`/`useEffect` blocks (and before the `if (!portalTarget) return null` guard), add:

```jsx
  const animatedProgress = useCountUp(variant === 'training' ? progress : null)
  const showProgressChip = variant === 'training' && progress != null
```

In the JSX, between the `<div className={styles.shHeaderText}>...</div>` and the `<button ref={closeBtnRef} ... >`, add:

```jsx
          {showProgressChip && (
            <span className={styles.shProgressChip}>
              <span className={styles.shProgressFill} style={{ width: `${Math.round(animatedProgress)}%` }} />
              <span className={styles.shProgressLabel}>{Math.round(animatedProgress)}%</span>
            </span>
          )}
```

- [ ] **Step 3: Append progress-chip SCSS**

```scss
.shProgressChip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 4rem;
  padding: var(--space-025) var(--space-100);
  border-radius: var(--radius-500);
  background: color-mix(in srgb, var(--brand-60) 10%, var(--white));
  border: var(--border-width-100) solid color-mix(in srgb, var(--brand-60) 24%, transparent);
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  font-variant-numeric: tabular-nums;
  color: var(--brand-60);
  overflow: hidden;
}

.shProgressFill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--brand-60) 18%, var(--white));
  transition: width 220ms cubic-bezier(0.2, 0.8, 0.3, 1);
  z-index: 0;
}

.shProgressLabel {
  position: relative;
  z-index: 1;
}
```

The `4rem` minimum-width is in the §0.1 floor band (`18rem` / `24rem` / `30rem` are sizing floors in the family; `4rem` is a content cap on a tiny chip — it's a rare allowed exception; document inline if you keep it). Alternative: replace `min-width: 4rem;` with `min-width: var(--size-64);` — `size-64` exists in Nexus and is `64px ≈ 4rem`. **Prefer the token form** — the §0.1 grep flags `4rem`.

Final SCSS for the chip (revised):

```scss
.shProgressChip {
  /* …everything else the same… */
  min-width: var(--size-64);
}
```

- [ ] **Step 4: §0.1 grep**

Run: `grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss | grep -v cubic-bezier`
Expected: `24rem`, `36rem`, possibly `28rem` from Task 7. No `4rem`. If `4rem` shows up, swap to `var(--size-64)` per Step 3 note.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 11 (training progress chip)"
```

(Browser verify is deferred to Task 12 — without the training fixture, there are no progress events to animate yet.)

---

## Task 12: postMessage fixtures (`partner-form.html` + `training.html`)

**Goal:** Provide self-hosted HTML pages that emit the `complete` and `progress` postMessage events, so the `partner_form` and `training` variants can be demoed end-to-end.

**Files:**
- Create: `public/embed-fixtures/partner-form.html`
- Create: `public/embed-fixtures/training.html`

- [ ] **Step 1: Create the fixtures directory**

Run: `mkdir -p "public/embed-fixtures"`
(Vite serves files under `public/` at the root, so `/embed-fixtures/partner-form.html` works as the URL.)

- [ ] **Step 2: Write `partner-form.html`**

Create `public/embed-fixtures/partner-form.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Partner BGV — Mock</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 32px 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111;
      background: #fafafa;
      min-height: 100vh;
      box-sizing: border-box;
    }
    h1 { font-size: 18px; margin: 0 0 16px; }
    p  { font-size: 14px; line-height: 1.5; color: #555; }
    label { display: block; font-size: 12px; font-weight: 600; color: #444; margin: 16px 0 4px; }
    input, select {
      width: 100%; box-sizing: border-box;
      padding: 10px 12px; border: 1px solid #ccc; border-radius: 8px;
      font-size: 14px; background: white;
    }
    button {
      margin-top: 24px; width: 100%;
      padding: 12px 16px; font-size: 14px; font-weight: 600;
      background: #1459c7; color: white; border: 0; border-radius: 8px; cursor: pointer;
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <h1>Identity verification</h1>
  <p>Partner mock page. Submitting posts a <code>complete</code> message back to the chat.</p>

  <form id="bgv">
    <label>Full name</label>
    <input name="name" required />
    <label>Date of birth</label>
    <input type="date" name="dob" required />
    <label>Document type</label>
    <select name="doc">
      <option>Aadhaar</option>
      <option>PAN</option>
      <option>Passport</option>
    </select>
    <label>Document number</label>
    <input name="docNumber" required />
    <button type="submit">Submit verification</button>
  </form>

  <script>
    const params = new URLSearchParams(location.search)
    const wid = params.get('wid')

    const form = document.getElementById('bgv')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      const data = Object.fromEntries(new FormData(form))
      window.parent.postMessage(
        { source: 'embedded_webview', widget_id: wid, event: 'complete', data },
        '*'                                  /* dev-fixture only — partners use exact origin */
      )
    })
  </script>
</body>
</html>
```

Note: the fixture posts with `targetOrigin: '*'` because in dev-mode the chat and the fixture share the same Vite origin and we want to keep the fixture portable. Real partner pages use `iframe.parent.postMessage(..., 'https://chat.your-app.com')` per the spec.

- [ ] **Step 3: Write `training.html`**

Create `public/embed-fixtures/training.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Training — Mock</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 32px 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #111;
      background: #f4f7fb;
      min-height: 100vh;
      box-sizing: border-box;
    }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p  { font-size: 14px; line-height: 1.5; color: #555; }
    .progress {
      margin: 24px 0;
      height: 6px;
      background: #d8e2f1;
      border-radius: 999px;
      overflow: hidden;
    }
    .progress span {
      display: block;
      height: 100%;
      width: 0;
      background: #1459c7;
      transition: width 240ms ease-out;
    }
    button {
      margin-top: 16px;
      padding: 10px 16px; font-size: 14px; font-weight: 600;
      background: #1459c7; color: white; border: 0; border-radius: 8px; cursor: pointer;
    }
    button.secondary {
      background: white;
      color: #1459c7;
      border: 1px solid #1459c7;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <h1>Anti-bribery refresher</h1>
  <p>Mock training fixture. The progress bar advances on each "Next" tap; the final tap posts <code>complete</code>.</p>

  <div class="progress"><span id="bar"></span></div>
  <p id="step">Module 1 of 4</p>

  <button id="next">Next module</button>
  <button id="cancel" class="secondary">Cancel</button>

  <script>
    const params = new URLSearchParams(location.search)
    const wid = params.get('wid')
    const bar = document.getElementById('bar')
    const stepEl = document.getElementById('step')
    let step = 0
    const total = 4

    function post(event, data) {
      window.parent.postMessage(
        { source: 'embedded_webview', widget_id: wid, event, data: data ?? {} },
        '*'
      )
    }

    document.getElementById('next').addEventListener('click', () => {
      step += 1
      const pct = Math.round((step / total) * 100)
      bar.style.width = pct + '%'
      stepEl.textContent = step >= total ? 'Complete' : `Module ${step + 1} of ${total}`
      post('progress', { percent: pct })
      if (step >= total) post('complete', { score: 1 })
    })

    document.getElementById('cancel').addEventListener('click', () => post('cancel', {}))
  </script>
</body>
</html>
```

- [ ] **Step 4: Browser verify (full postMessage flow)**

Run: `npm run dev`.

- `webview` (partner_form) → tap CTA → fixture loads → fill in some fields → tap "Submit verification" → sheet auto-dismisses → card shows success banner ("SUBMITTED" chip + timestamp).
- `webview training` → tap CTA → fixture loads → tap "Next module" 4 times → progress chip on header counts up (25 → 50 → 75 → 100) → on the 4th tap, sheet auto-dismisses → card shows success banner.
- Mid-training, tap "Cancel" → sheet auto-dismisses with no completion → card CTA reads "Resume training" with "Last left at 25%" caption.
- Reopen training → fresh iframe (the fixture re-mounts at step 0). Confirmed expected per spec: parent never preserves iframe state.

If the postMessage doesn't reach the parent, open DevTools Console:
- A `postMessage dropped: origin mismatch` warning means `payload.allowed_origin` doesn't match `event.origin`. Confirm `buildEmbeddedWebviewPayload('partner_form').allowed_origin` is `window.location.origin` (the dev server).
- A `postMessage dropped: widget_id mismatch` means the fixture isn't echoing the `wid` query param.

- [ ] **Step 5: Commit**

```bash
git add public/embed-fixtures/partner-form.html public/embed-fixtures/training.html
git commit -m "feat(widget): Embedded Webview — Pass 1 region 12 (postMessage fixtures)"
```

---

## Task 13: FLIP lift transition (forward + reverse)

**Goal:** Implement the signature moment. On CTA tap, capture the source rect from the compact card's poster region. Render a `LiftClone` portaled into `#chat-modal-root` that animates from the source rect to the sheet's iframe-frame rect over 520ms. On dismiss, run the same in reverse. While the clone is animating, the sheet's iframe-frame stays at `opacity: 0` and the compact card's poster fades to `0.4`.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Add the `LiftClone` component**

In `src/widgets/EmbeddedWebview.jsx`, after the `EmbeddedWebviewSheet` definition, add:

```jsx
/* ─── LiftClone — FLIP source-element clone ──────────────────────────
   Portaled into #chat-modal-root; animates from sourceRect → targetRect
   over LIFT_DURATION on the family rise-up curve. Removed from the
   tree once the animation settles.

   The clone is purely visual — pointer events disabled, aria-hidden.
   The sheet's iframe-frame and the compact card's poster sit at the
   src + target ends with opacity 0 / 0.4 respectively while the clone
   carries the visual. */

function LiftClone({ sourceRect, targetRect, posterUrl, faviconUrl, domainLabel, direction, onDone, tint }) {
  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null
  const [phase, setPhase] = useState('start')                 // 'start' | 'end'

  useEffect(() => {
    const r = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('end'))
    })
    const t = window.setTimeout(onDone, LIFT_DURATION + 40)
    return () => {
      cancelAnimationFrame(r)
      window.clearTimeout(t)
    }
  }, [onDone])

  if (!portalTarget || !sourceRect || !targetRect) return null

  const fromRect = direction === 'reverse' ? targetRect : sourceRect
  const toRect   = direction === 'reverse' ? sourceRect : targetRect
  const rect = phase === 'start' ? fromRect : toRect

  return createPortal(
    <div
      className={styles.liftClone}
      aria-hidden
      style={{
        left: rect.x + 'px',
        top: rect.y + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        '--lift-tint': tint || 'transparent',
      }}
    >
      {posterUrl
        ? <img src={posterUrl} alt="" className={styles.liftCloneImg} />
        : <span className={styles.liftCloneFallback}><Globe size={36} strokeWidth={1.5} aria-hidden /></span>
      }
      <div className={styles.trustCapsule}>
        {faviconUrl
          ? <img className={styles.faviconImg} src={faviconUrl} alt="" />
          : <Globe size={14} strokeWidth={2} aria-hidden />
        }
        <span className={styles.faviconDomain}>{domainLabel}</span>
      </div>
    </div>,
    portalTarget,
  )
}
```

- [ ] **Step 2: Append `LiftClone` SCSS + iframe-frame opacity gate**

```scss
.liftClone {
  position: absolute;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: var(--space-100);
  border-radius: var(--radius-150);
  background: var(--lift-tint, var(--grey-10));
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
  /* width / height / left / top / border-radius interpolate. */
  transition:
    left 520ms cubic-bezier(0.18, 0.9, 0.28, 1.04),
    top 520ms cubic-bezier(0.18, 0.9, 0.28, 1.04),
    width 520ms cubic-bezier(0.18, 0.9, 0.28, 1.04),
    height 520ms cubic-bezier(0.18, 0.9, 0.28, 1.04);
}

.liftCloneImg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
}

.liftCloneFallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-60);
  opacity: var(--opacity-024);
}

/* While the lift is in flight, the sheet's iframe-frame sits invisible
   so the clone owns the visual. The clone's onDone callback flips a
   `lifted` flag on the sheet which restores the iframe-frame's opacity. */
.shBody_pre_lift {
  opacity: var(--opacity-000);
}
.shBody_lifted {
  opacity: var(--opacity-100);
  transition: opacity 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
}

.poster_fading {
  transition: opacity 200ms cubic-bezier(0.2, 0.8, 0.3, 1);
  opacity: var(--opacity-040);
}
```

- [ ] **Step 3: Wire the FLIP measure + clone in `EmbeddedWebview`**

Add new state + refs at the top of `EmbeddedWebview`:

```jsx
  const cardRef = useRef(null)
  const posterRef = useRef(null)
  const [liftState, setLiftState] = useState(null)
  /* liftState shape:
     { direction: 'forward' | 'reverse', sourceRect, targetRect, tint }
     null when not lifting. */
```

Pass refs onto the relevant elements:

```jsx
    <article ref={cardRef} className={cx(styles.card, styles[`card_${variant}`], styles[`card_${cardState}`])}>
```

```jsx
      <div
        ref={posterRef}
        className={cx(
          styles.poster,
          !payload?.poster_url && styles.poster_empty,
          liftState && styles.poster_fading,
        )}
        aria-hidden
      >
```

Replace `handleOpen` with the FLIP-aware version:

```jsx
  const handleOpen = useCallback(() => {
    if (cardState === 'completed') return

    /* Phase 1 — measure source. Sheet has not mounted yet; we use a
       provisional target rect (the chat-modal-root's body area). The
       sheet, when it mounts, will call back with the precise iframe
       frame rect; the clone re-targets via setLiftState if needed. */
    const sourceRect = posterRef.current?.getBoundingClientRect()
    const modalRoot = document.getElementById('chat-modal-root')
    const rootRect = modalRoot?.getBoundingClientRect()
    const provisionalTarget = rootRect && sourceRect
      ? {
          x: rootRect.left,
          y: rootRect.top + rootRect.height * 0.18,
          width: rootRect.width,
          height: rootRect.height * 0.62,
        }
      : null

    if (sourceRect && provisionalTarget) {
      setLiftState({
        direction: 'forward',
        sourceRect: { x: sourceRect.left - rootRect.left, y: sourceRect.top - rootRect.top, width: sourceRect.width, height: sourceRect.height },
        targetRect: { x: provisionalTarget.x - rootRect.left, y: provisionalTarget.y - rootRect.top, width: provisionalTarget.width, height: provisionalTarget.height },
        tint: 'transparent',
      })
    }

    lastOpenedAtRef.current = Date.now()
    setCardState('sheet_open')
  }, [cardState])
```

(Note: the rect math compensates because the `LiftClone` portals into `#chat-modal-root` whose origin is its own rect; we subtract `rootRect.left/top` so the clone's `left/top` are root-relative.)

Add a callback to clear the lift once the clone settles:

```jsx
  const handleLiftDone = useCallback(() => {
    setLiftState(null)
  }, [])
```

Add a callback so the sheet can refine the target rect once it has measured its own iframe-frame:

```jsx
  const handleSheetMeasured = useCallback((iframeFrameRect, tint) => {
    setLiftState((prev) => {
      if (!prev || prev.direction !== 'forward') return prev
      const modalRoot = document.getElementById('chat-modal-root')
      const rootRect = modalRoot?.getBoundingClientRect()
      if (!rootRect) return prev
      return {
        ...prev,
        targetRect: {
          x: iframeFrameRect.left - rootRect.left,
          y: iframeFrameRect.top - rootRect.top,
          width: iframeFrameRect.width,
          height: iframeFrameRect.height,
        },
        tint: tint ?? prev.tint,
      }
    })
  }, [])
```

Render the `LiftClone` near the bottom of the `EmbeddedWebview` JSX, alongside the sheet:

```jsx
      {liftState && (
        <LiftClone
          sourceRect={liftState.sourceRect}
          targetRect={liftState.targetRect}
          posterUrl={payload?.poster_url}
          faviconUrl={payload?.favicon_url}
          domainLabel={payload?.domain_label}
          direction={liftState.direction}
          tint={liftState.tint}
          onDone={handleLiftDone}
        />
      )}
```

- [ ] **Step 4: Have the sheet measure + report its iframe-frame rect**

In `EmbeddedWebviewSheet`, accept a new prop `onMeasured` and capture the iframe-frame rect after mount:

```jsx
function EmbeddedWebviewSheet({
  payload, variant, meta, onClose, onCompleted, onProgress, onMeasured,
}) {
```

Add a ref on the iframe-frame:

```jsx
  const iframeFrameRef = useRef(null)

  useEffect(() => {
    if (phase !== 'open') return
    const rect = iframeFrameRef.current?.getBoundingClientRect()
    if (rect && onMeasured) {
      /* tint sampling: read the iframe-frame's computed background. */
      const computed = iframeFrameRef.current && getComputedStyle(iframeFrameRef.current).backgroundColor
      onMeasured(rect, computed)
    }
  }, [phase, onMeasured])
```

Pass the ref to the body:

```jsx
        <div ref={iframeFrameRef} className={styles.shBody} aria-busy={iframeState === 'loading'}>
```

Hide the iframe-frame opacity while the lift is forward in flight:

```jsx
        <div
          ref={iframeFrameRef}
          className={cx(
            styles.shBody,
            phase === 'open' && !onMeasured ? '' : null,
          )}
          aria-busy={iframeState === 'loading'}
        >
```

Actually — simpler: drive opacity from a `lifted` prop the parent passes in:

```jsx
function EmbeddedWebviewSheet({
  payload, variant, meta, lifted, onClose, onCompleted, onProgress, onMeasured,
}) {
```

And:

```jsx
        <div
          ref={iframeFrameRef}
          className={cx(styles.shBody, lifted ? styles.shBody_lifted : styles.shBody_pre_lift)}
          aria-busy={iframeState === 'loading'}
        >
```

Pass it from `EmbeddedWebview`:

```jsx
      {sheetOpen && (
        <EmbeddedWebviewSheet
          payload={payload}
          variant={variant}
          meta={meta}
          lifted={!liftState || liftState.direction === 'reverse'}
          onClose={handleSheetClose}
          onCompleted={handleCompleted}
          onProgress={handleProgress}
          onMeasured={handleSheetMeasured}
        />
      )}
```

When `liftState` is null (settled forward) or reversing, the iframe-frame is visible. While forward-lifting, it's hidden behind the clone.

- [ ] **Step 5: Reverse lift on dismiss**

Replace `handleSheetClose`:

```jsx
  const handleSheetClose = useCallback(() => {
    if (lastOpenedAtRef.current) {
      totalOpenMsRef.current += Date.now() - lastOpenedAtRef.current
      lastOpenedAtRef.current = 0
    }

    /* Capture rects for reverse FLIP. */
    const sourceRect = posterRef.current?.getBoundingClientRect()
    const modalRoot = document.getElementById('chat-modal-root')
    const rootRect = modalRoot?.getBoundingClientRect()
    if (sourceRect && rootRect) {
      const currentTarget = liftState?.targetRect
        ?? {
          x: rootRect.width * 0,
          y: rootRect.height * 0.18,
          width: rootRect.width,
          height: rootRect.height * 0.62,
        }
      setLiftState({
        direction: 'reverse',
        sourceRect: {
          x: sourceRect.left - rootRect.left,
          y: sourceRect.top - rootRect.top,
          width: sourceRect.width,
          height: sourceRect.height,
        },
        targetRect: currentTarget,
        tint: liftState?.tint ?? 'transparent',
      })
    }

    setCardState((prev) => (prev === 'completed' ? prev : 'dismissed'))
  }, [liftState])
```

- [ ] **Step 6: Build + browser verify**

Run: `npm run build && npm run dev`. For each variant, tap CTA. Expected: the poster lifts smoothly into the sheet's iframe-frame position over ~520ms; on close, it lifts back down. The compact card's poster is dimmed during the lift; the iframe-frame is empty (no double-render).

If the clone "snaps" instead of animating, the cause is usually that the two-RAF setup isn't applying the pre-transition style. Confirm the JSX initially renders with the `start` rect, then a re-render with `end`. Add a console.log inside `LiftClone` if needed.

- [ ] **Step 7: §0.1 grep**

Run: `grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss | grep -v cubic-bezier`
Expected: only the legitimate floors. The inline `style={{ left: rect.x + 'px' }}` on the clone is JS-side, not SCSS — it's not in scope for the grep.

- [ ] **Step 8: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 13 (FLIP lift transition)"
```

---

## Task 14: Reduced-motion neutralizer

**Goal:** Under `@media (prefers-reduced-motion: reduce)`, skip the lift entirely (clone is not rendered), neutralize the trust-capsule pop, the success-banner spring, the training count-up, the riseUp stagger, the shImage opacity transition. Functional behaviours (postMessage, focus, iframe load, origin gate) are unchanged.

**Files:**
- Modify: `src/widgets/EmbeddedWebview.jsx`
- Modify: `src/widgets/embeddedWebview.module.scss`

- [ ] **Step 1: Bypass the lift in JS when reduced-motion is on**

Near the top of `EmbeddedWebview.jsx`, add:

```jsx
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
```

In `handleOpen`, short-circuit when reduced-motion is on:

```jsx
  const handleOpen = useCallback(() => {
    if (cardState === 'completed') return

    if (!prefersReducedMotion()) {
      /* …existing FLIP measure + setLiftState block… */
    }

    lastOpenedAtRef.current = Date.now()
    setCardState('sheet_open')
  }, [cardState])
```

Same in `handleSheetClose`:

```jsx
  const handleSheetClose = useCallback(() => {
    if (lastOpenedAtRef.current) {
      totalOpenMsRef.current += Date.now() - lastOpenedAtRef.current
      lastOpenedAtRef.current = 0
    }
    if (!prefersReducedMotion()) {
      /* …existing reverse-FLIP block… */
    }
    setCardState((prev) => (prev === 'completed' ? prev : 'dismissed'))
  }, [liftState])
```

In `useCountUp`, return the target instantly when reduced-motion is on:

```jsx
function useCountUp(target, durationMs = 280) {
  const [value, setValue] = useState(target ?? 0)
  const startedRef = useRef({ from: 0, to: 0, t0: 0, raf: 0 })

  useEffect(() => {
    if (target == null) return
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    /* …existing tick logic… */
  }, [target, durationMs])

  return value
}
```

- [ ] **Step 2: Append reduced-motion SCSS overrides**

```scss
@media (prefers-reduced-motion: reduce) {
  .card,
  .card:hover,
  .shScrim,
  .shSheet,
  .shIframe,
  .shBody_pre_lift,
  .shBody_lifted,
  .liftClone,
  .trustCapsule_done,
  .shProgressFill,
  .poster_fading {
    transition: none !important;
    animation: none !important;
  }

  .shSpinner { animation: none !important; }
}
```

- [ ] **Step 3: Browser verify**

Open System Settings → Accessibility → Display → "Reduce motion" → ON (macOS). Reload the dev server. Type `webview` and tap CTA. Expected: sheet snaps open without the lift; iframe loads as usual; close is instant; success state appears without spring.

Toggle reduced-motion OFF; confirm motion returns.

- [ ] **Step 4: Commit**

```bash
git add src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
git commit -m "feat(widget): Embedded Webview — Pass 1 region 14 (reduced-motion)"
```

---

## Task 15: Pass 1 close — anti-pattern audit + code review

**Goal:** Walk every §18 anti-pattern against the widget. Confirm registration is complete in five places. Run the §0.1 grep one final time. Dispatch a code-reviewer subagent.

**Files:** none (audit-only) — fixes get inlined as needed.

- [ ] **Step 1: §0.1 final grep**

Run:
```bash
grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss \
  | grep -v cubic-bezier | grep -v '@media'
```
Expected: only `24rem` (card §4 floor), `36rem` (sheet `min()` cap — documented inline), `28rem` (error body max-width cap — documented inline). Anything else: fix inline.

- [ ] **Step 2: §18 walkthrough**

Read each item in `docs/widget-conventions.md` §18 and write ✅/❌ against this widget:

1. ✅/❌ No `box-shadow: var(--shadow-100)` at rest.
2. ✅/❌ No local `max-width` on `.card`.
3. ✅/❌ Symmetric card padding `var(--space-200)`.
4. ✅/❌ No `border-bottom` on header.
5. ✅/❌ Title at `font-size-400`.
6. ✅/❌ CTA is a verb, not icon-only.
7. ✅/❌ No raw hex.
8. ✅/❌ `brand-60` accent (not `brand-50`).
9. ✅/❌ No width on the card root.
10. ✅/❌ No fourth progress indicator.
11. ✅/❌ No confetti / illustrations / "Great job!" copy.
12. ✅/❌ Stagger caps at 8 children (we use no riseUp stagger here — ✅ by absence).
13. ✅/❌ All px / rem are tokenised (re-verified by Step 1 grep).
14. ✅/❌ Lucide icons only.
15. ✅/❌ No `transition: all`.
16. ✅/❌ No fourth cubic-bezier curve (state / rise-up / springy only).
17. ⏳ Pass 2 elevation pending — applies when Pass 2 is dispatched.

If any ❌, fix inline before continuing.

- [ ] **Step 3: §17 five-touchpoint registration check**

Run all three at once:

```bash
grep -n "embedded_webview" src/chat/registry.js src/engine/widgetSchemas.js src/engine/mockBot.js src/studio/WidgetPalette.jsx
ls src/widgets/EmbeddedWebview.jsx src/widgets/embeddedWebview.module.scss
```

Expected:
- `registry.js`: one match (`embedded_webview: EmbeddedWebview`).
- `widgetSchemas.js`: at least two matches (the schema entry + the builder reference).
- `mockBot.js`: four matches (one per variant trigger's `getVariantPayload(... 'embedded_webview' ...)`).
- `WidgetPalette.jsx`: one match (`embedded_webview: ExternalLink`).
- Both files exist.

- [ ] **Step 4: Dispatch a code-reviewer subagent**

Dispatch a `superpowers:code-reviewer` subagent (model=opus). Brief:

> Review `src/widgets/EmbeddedWebview.jsx`, `src/widgets/embeddedWebview.module.scss`, `public/embed-fixtures/partner-form.html`, `public/embed-fixtures/training.html`, and the registration changes in `src/chat/registry.js`, `src/engine/widgetSchemas.js`, `src/engine/mockBot.js`, `src/studio/WidgetPalette.jsx`. Spec: `docs/superpowers/specs/2026-04-26-embedded-webview-widget-design.md`. Family conventions: `docs/widget-conventions.md`. Audit against §18 anti-patterns. Specifically check: (1) postMessage origin gate is three-checks deep with one warn-per-reason, not a generic accept; (2) iframe sandbox defaults are correct, no `allow-top-navigation`; (3) widget_id query propagation handles existing query strings + hash without mangling; (4) FLIP timing — lift duration ≥ sheet open duration so the iframe-frame doesn't pop visible mid-flight; (5) reduced-motion neutralises the lift entirely (no fallback FLIP); (6) `widget_response` shape matches the spec exactly. Report IMPORTANT/CRITICAL findings inline; NITs are acceptable to defer.

Apply IMPORTANT/CRITICAL findings before commit. NITs may carry forward — note them in the commit message.

- [ ] **Step 5: `npm run build` final**

Run: `npm run build`
Expected: zero errors, no new warnings beyond baseline.

- [ ] **Step 6: Commit (Pass 1 close)**

```bash
git add -A
git commit -m "feat(widget): Embedded Webview — Pass 1 close (audit + review)"
```

If the working tree is clean (no findings to apply), skip the commit — the previous commits already capture Pass 1.

---

## Task 16: Pass 2 elevation (dispatched, scope-constrained)

**Goal:** Dispatch `/frontend-design` via a general-purpose subagent to elevate the signature moment (FLIP lift) without breaking family conventions. Specific moments to elevate; specific things NOT to touch.

**Files:** dispatched — main thread does not edit.

- [ ] **Step 1: Dispatch the elevation subagent**

Dispatch a general-purpose subagent (model=opus). Brief:

> You are running Pass 2 elevation on widget #27 Embedded Webview. Invoke the `/frontend-design` skill with this scope.
>
> **Files to elevate:** `src/widgets/EmbeddedWebview.jsx` and `src/widgets/embeddedWebview.module.scss`.
>
> **Spec:** `docs/superpowers/specs/2026-04-26-embedded-webview-widget-design.md`.
> **Conventions (hard constraints):** `docs/widget-conventions.md`.
>
> **Specific moments to elevate:**
>
> 1. The continuous lift transition — make it feel like one cinematic gesture, not a CSS animation. Consider: subtle scale at the midpoint, a soft border-radius interpolation as the clone settles into the sheet, the trust-capsule fading or repositioning as it merges with the sheet header.
> 2. The handoff at clone-removal → iframe-frame visible. Today it's a hard cut. Suggested: a one-frame brightness/blur flash, or the loader spinner sweeping in as the clone fades out.
> 3. The success state on the compact card — the §10 banner is correct but plain. The favicon-chip turning into a `Check` chip should feel like a "seal" — consider a brief halo or a single-axis hatch pulse.
> 4. The training progress chip — currently a brand-tinted pill with a width-driven fill. Consider a tabular-nums tick (the digit "rolls" as the value advances) and a leading edge that briefly intensifies as the value lands.
>
> **Hard constraints — DO NOT TOUCH:**
>
> - The §1 card shell (padding, border, radius, hover-only shadow).
> - The §3 width contract (no `max-width` on `.card`, no `data-widget-variant="wide"`).
> - The §12 type hierarchy (no new font-size or weight beyond the four sanctioned).
> - The §13 color conventions (brand-60, grey ladder, success/error/yellow only — no fourth tone).
> - The §16 motion vocabulary (state-curve / rise-up / springy — no fourth curve).
> - The §17 five-touchpoint registration (already in place).
> - The §18 anti-pattern list — must still pass zero.
> - postMessage protocol, origin gate, iframe sandbox/allow attrs, widget_id query propagation — these are functional contracts; do not modify.
> - Reduced-motion neutralizers — every new motion you introduce must be neutralized in the existing `@media (prefers-reduced-motion: reduce)` block.
> - Do not introduce a second signature primitive. The lift is THE moment. Do not double-bill.
>
> **Output:** modified `EmbeddedWebview.jsx` and `embeddedWebview.module.scss` only. Commit on completion with `feat(widget): Embedded Webview — Pass 2 elevation` plus a 2-3 line summary of the elevations in the body.

- [ ] **Step 2: After the subagent commits, run the audits**

```bash
npm run build
grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/embeddedWebview.module.scss | grep -v cubic-bezier | grep -v '@media'
```

Walk §18 again — Pass 2 sometimes drifts into shadow-at-rest, fourth curve, or non-token values. Fix inline.

- [ ] **Step 3: Final code review**

Dispatch `superpowers:code-reviewer` (model=opus) one more time on the same file scope. Apply findings.

- [ ] **Step 4: Update `docs/widget-plan.md`**

Move widget #27 from Pending → Done. Bump status counts ("26 of 30" → "27 of 30"). Add the row to the P2 Done table:

```markdown
| 27 | Embedded Webview | `EmbeddedWebview.jsx` | Iframe escape-hatch with continuous FLIP lift transition; four palette variants (partner_form / training / reader / preview); origin-gated postMessage protocol with `widget_id` query propagation. |
```

Remove the row from the Pending table.

Update the "Last shipped" line to point at the Pass 2 commit.

- [ ] **Step 5: Final commit**

```bash
git add docs/widget-plan.md
git commit -m "docs(widget-plan): mark Embedded Webview (#27) shipped"
```

---

## Self-review (run before handing off to executor)

**Spec coverage check** — every spec section must map to at least one task:

| Spec section | Task |
|---|---|
| Variants table (4 variants) | Task 1 (schema) + Task 4 (mockBot triggers) + variant-driven copy via `VARIANT_META` (Task 2) |
| Payload schema (URL, allowed_origin, domain_label, favicon_url, title, description, category, poster_url, estimated_minutes, sandbox, allow, silent) | Task 1 (builder) |
| postMessage protocol — `{source, widget_id, event, data}` + origin gate | Task 8 |
| `widget_id` propagation via `?wid=` | Task 6 |
| Layout — compact card (header + poster + capsule + caption + CTA) | Tasks 2 + 3 |
| Layout — portal sheet (header bar, iframe edge-to-edge, conditional footer) | Tasks 5 + 6 + 9 |
| Iframe loading sub-state (Loader2) | Task 6 |
| Iframe error sub-state (8s timeout, WifiOff, Try again, Close) | Task 7 |
| State machine (idle / sheet_open / dismissed / completed) | Task 10 |
| `widget_response` shape | Task 10 |
| Signature moment — continuous lift FLIP (forward + reverse) | Task 13 |
| `--lift-tint` sampling for handoff | Task 13 (computed background passed via `onMeasured`) |
| Training progress chip with RAF count-up | Task 11 |
| Trust-capsule pop, success-banner spring, completion Check glyph | Task 10 (Check + chip swap) |
| Reduced-motion neutralizer | Task 14 |
| Edge cases (origin mismatch, http://, multiple instances, …) | Task 8 (origin gate) + Task 6 (URL handling) |
| Width contract (§3) | Task 2 (`width: 100%` shell, no max-width) |
| Constant-height (§4) | Task 2 (`min-height: 24rem`) |
| Security — sandbox defaults, no `allow-top-navigation` | Task 6 |
| §17 five-touchpoint registration | Task 1 |

No gaps.

**Placeholder scan:**
- No "TBD" / "TODO" / "implement later" remain.
- All code blocks are real — none reference an undefined function or type.
- `useCountUp`, `clamp`, `buildIframeSrc`, `prefersReducedMotion`, `VARIANT_META`, `LiftClone`, `EmbeddedWebviewSheet`, `EmbeddedWebview` all defined in this plan.

**Type / signature consistency:**
- `LiftClone` props: `sourceRect`, `targetRect`, `posterUrl`, `faviconUrl`, `domainLabel`, `direction`, `onDone`, `tint` — match call site.
- `EmbeddedWebviewSheet` props: `payload`, `variant`, `meta`, `lifted`, `onClose`, `onCompleted`, `onProgress`, `onMeasured` — match call site after Task 13.
- `liftState` shape: `{ direction, sourceRect, targetRect, tint }` — consistent across `setLiftState` calls.
- `widget_response.payload` shape: `{ widget_id, source_type, variant, completed, completion_method, data, total_open_time_seconds }` — matches spec.

---

## Execution choice

Plan complete and saved to `docs/superpowers/plans/2026-04-26-embedded-webview-widget.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task + two-stage review between tasks; protects context window; tasks 1–14 run as subagents, tasks 15–16 stay in the main thread because they coordinate audit + dispatch.

**2. Inline Execution** — execute tasks in this session via `superpowers:executing-plans`; batched checkpoints; faster iteration but higher main-thread context cost.

Which approach?
