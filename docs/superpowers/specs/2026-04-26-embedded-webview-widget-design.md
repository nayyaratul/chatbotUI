# Embedded Webview Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #27 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P2, Phase 2+.
**Family rule book:** `docs/widget-conventions.md` (everything below conforms; the doc wins in any conflict).

---

## Purpose

Iframe escape-hatch for complex UIs that the chat can't host natively — partner microsites, training modules, hosted documents, generic previews. The compact card sits in the chat stream as a "minimal-chrome" preview (poster image + favicon trust capsule + CTA). Tap the CTA and the iframe lifts up into a portal sheet that holds it edge-to-edge; close the sheet and the iframe lifts back down. Completion semantics differ per variant — see Variants.

The widget commits a `widget_response` on completion so the bot can continue the conversation. Variants without a completion semantic (`preview`) close silently.

## Variants

Four palette variants. Each ships with its own preset for icon, eyebrow, completion mode, and footer treatment. Variant choice changes behaviour, not shell — the §1 card and the portaled sheet pattern are identical across all four.

| Variant | Lucide icon | Eyebrow | Footer in sheet | Completion strategy |
|---|---|---|---|---|
| `partner_form` | `ExternalLink` | `Partner · <vendor>` | None — iframe owns its own submit | postMessage `complete` (mandatory) |
| `training` | `GraduationCap` | `Training · <category>` | None — progress chip on header | postMessage `progress` until `complete` |
| `reader` | `BookOpenText` | `Reading · <category>` | "I've read this" primary CTA | User-attested via the CTA tap |
| `preview` | `MonitorSmartphone` | `Preview · <category>` | "Done" secondary CTA | None — close = continue |

Default mock-bot text trigger = `partner_form`.

## Payload schema

```js
{
  widget_id: 'webv_xxx',                          // makeId('webv')
  variant: 'partner_form' | 'training' | 'reader' | 'preview',

  // Identity
  url: string,                                    // iframe src; must be https://
  allowed_origin: string,                         // postMessage origin gate (e.g. 'https://vendor.example.com')
  domain_label: string,                           // chip copy (often url's hostname, e.g. 'vendor.bgv-co.in')
  favicon_url: string | null,                     // domain favicon; null falls back to a Lucide `Globe` glyph

  // Compact card
  title: string,                                  // e.g. 'Background verification — vendor portal'
  description: string,                            // one-line context, sits under title (§2)
  category: string,                               // eyebrow tail (e.g. 'Onboarding', 'Compliance', 'Policy')
  poster_url: string | null,                      // bottom-left favicon overlays this; null → trust-capsule fallback
  estimated_minutes: number | null,               // shown as caption ('Approx. 4 min')

  // Sandbox + chrome
  sandbox: string | null,                         // iframe sandbox attr; default 'allow-scripts allow-forms allow-same-origin allow-popups'
  allow: string | null,                           // iframe allow attr (camera/mic/etc); default ''

  // Behaviour
  silent: boolean,                                // if true, completion doesn't post a chat-visible widget_response
}
```

## postMessage protocol

### `widget_id` propagation

The widget passes its `widget_id` to the iframe by appending it as a query parameter on the iframe `src` (`?wid=<widget_id>` if no other query string, `&wid=<widget_id>` otherwise). The partner page reads `new URLSearchParams(window.location.search).get('wid')` and echoes that value back in every postMessage. The widget verifies the echo against `payload.widget_id` (see origin gate below). This keeps the protocol fully iframe-driven — the parent never needs to post into the iframe, which avoids race conditions around the iframe's `load` timing.

### Event listener

The widget listens to `window.message` events when the sheet is open and tears down the listener on close. Partners' embedded pages emit:

```js
const wid = new URLSearchParams(location.search).get('wid')
window.parent.postMessage(
  {
    source: 'embedded_webview',
    widget_id: wid,
    event: 'complete' | 'progress' | 'cancel',
    data: { /* event-specific */ },              // for 'progress': { percent: 0–100 }
  },
  '<allowed_origin>'                             // never '*'
)
```

Origin gate — drop any `MessageEvent` that fails any of:

```js
event.origin === payload.allowed_origin
event.data?.source === 'embedded_webview'
event.data?.widget_id === payload.widget_id
```

Failed events are dropped silently with a single `console.warn('[EmbeddedWebview] postMessage dropped: <reason>')` per drop reason per widget instance (so a flood from a misbehaving page logs once, not N times).

If the parent ever needs to post *to* the iframe (future: theme tokens, locale), it uses `iframeRef.contentWindow.postMessage(msg, payload.allowed_origin)`. Never `'*'`.

## Layout — compact card

Family §1 card shell. §2 header with §12 eyebrow + title + description. Below the header: the poster region (16:9). Below that: caption (`estimated_minutes`). Below that: §5 primary CTA.

```
┌──────────────────────────────────────────────────────────┐
│  [icon]  PARTNER · BGV-CO                                │
│          Background verification — vendor portal          │
│          Submit your details on the partner page          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │ poster region
│  │                                                    │  │ (aspect-ratio: 16/9)
│  │              <poster image fills>                  │  │
│  │                                                    │  │
│  │  ┌─────────────────────────────┐                   │  │
│  │  │ [favicon] vendor.bgv-co.in  │  ← trust capsule  │  │
│  │  └─────────────────────────────┘                   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Approx. 4 min                                           │ caption (§12)
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Open verification portal             →            │  │ §5 primary CTA
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

When `poster_url` is `null`, the poster region collapses to a tinted area (`color-mix(in srgb, var(--brand-60) 10%, var(--white))`) holding the trust capsule centred, with a faint `Globe` glyph behind it (opacity-024). Aspect ratio stays 16:9 so the FLIP source rect is identical regardless of imagery.

CTA copy by variant:

- `partner_form` → `Open <vendor>` (e.g. `Open verification portal`).
- `training` → `Start training`.
- `reader` → `Open reader`.
- `preview` → `Open preview`.

Trust capsule (favicon + domain chip):

```scss
.trustCapsule {
  display: inline-flex;
  align-items: center;
  gap: var(--space-050);
  padding: var(--space-050) var(--space-100);
  border-radius: var(--radius-500);
  background: color-mix(in srgb, var(--white) 88%, transparent);    // sits on the poster
  border: var(--border-width-100) solid var(--grey-10);
  backdrop-filter: blur(var(--size-06));
  font-size: var(--font-size-100);
  font-weight: var(--font-weight-medium);
  color: var(--grey-80);
}
```

Capsule sits at `bottom: var(--space-100); left: var(--space-100);` inside the poster region.

## Layout — portal sheet

Same chat-frame containment pattern as `JobDetailsModal` / `SignatureSheet` / `DocumentViewerSheet`: portaled into `#chat-modal-root`, three-phase animation, scrim + close-button focus.

```
┌── chat-frame ───────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░ scrim ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │ sheet (slides up
│  │ [favicon] vendor.bgv-co.in   38%        [✕ close] │  │  from bottom)
│  ├───────────────────────────────────────────────────┤  │ thin grey-10 rule
│  │                                                   │  │
│  │                <iframe edge-to-edge>              │  │
│  │                                                   │  │
│  ├───────────────────────────────────────────────────┤  │ footer (variant-conditional)
│  │ ┌───────────────────────────────────────────────┐ │  │
│  │ │  I've read this                               │ │  │ reader / preview only
│  │ └───────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

- Sheet height: `min(36rem, 90% of chat-frame)` — same floor approach as `JobDetailsModal`.
- Header bar: favicon + domain (left). On `training`, a progress chip (`38%`) sits centre-right; on others, the slot is empty. Close button (`X`, 36×36 hit target) on the right.
- `partner_form`: no footer; iframe owns the submit. Sheet auto-dismisses on `event: complete`.
- `training`: no footer; sheet auto-dismisses on `event: complete`.
- `reader`: footer holds `I've read this` `Button variant="primary"` full-width. Tap closes the sheet **and** fires completion (`completion_method: 'attested'`).
- `preview`: footer holds `Done` `Button variant="secondary"` full-width. Tap closes the sheet; no completion fired (close = continue, same as the `X` close button).
- Iframe attributes: `sandbox` per payload (default `allow-scripts allow-forms allow-same-origin allow-popups`), `allow` per payload, `loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"`. **Never** `allow-top-navigation` — the embedded page must not be able to navigate the chat away.

Sheet-internal sub-states drive the iframe-frame:

- `loading` — iframe is mounted but `opacity: 0`. A centred Lucide `Loader2` spinner sits over a faint poster-coloured backdrop (the lift clone's last frame is sampled into a `--lift-tint` CSS var so the handoff doesn't flash white).
- `live` — iframe `load` event has fired. Spinner fades out (200ms state-curve). Iframe snaps to `opacity: 1`.
- `error` — iframe `load` hasn't fired within 8s, OR the iframe `error` event fired. Show `WifiOff` glyph, "Couldn't load `<domain>`." copy, "Try again" secondary button (re-mounts iframe), "Close" link. No completion fired.
- `closing` — three-phase exit (mirror open).

## State machine — card-level

```
┌─────────┐   tap CTA    ┌─────────────┐   complete event    ┌─────────────┐
│  idle   │ ───────────► │ sheet_open  │ ──────────────────► │  completed  │
└─────────┘              └─────────────┘                     └─────────────┘
                              │   ▲
                              │   │ reopen (all variants — completed
                              ▼   │  state is the only one that locks
                         ┌─────────────┐  the sheet)
                         │   dismissed │
                         └─────────────┘
```

- `idle` — compact card, CTA enabled with the variant's open-copy.
- `sheet_open` — sheet visible. Compact card sits under scrim, dimmed but mounted (it's the FLIP origin).
- `dismissed` — sheet closed without completion. CTA copy swaps to `Reopen <variant noun>` (e.g. `Reopen verification portal`). For `training`, the last `progress` percent is preserved on the card as a small caption (`"Last left at 38%"`) — the iframe itself doesn't preserve state across closes; resumption is the partner page's responsibility (cookies / localStorage).
- `completed` — §10 success banner replaces the CTA region; favicon chip on the poster gets a tiny `Check` glyph; sheet can no longer be reopened (proof state).

`widget_response` shape on `idle | dismissed → completed`:

```js
{
  type: 'widget_response',
  payload: {
    widget_id,
    source_type: 'embedded_webview',
    variant,
    completed: true,
    completion_method: 'postmessage' | 'attested',
    data: {...},                                  // postMessage data verbatim, or {} for attested
    total_open_time_seconds: number,              // sum across all open intervals
  },
}
```

When `silent: true`, no `widget_response` posts to the chat surface but the engine still records it for downstream rule-matching (mirrors `VideoPlayer` silent mode).

## Signature moment — continuous lift

The compact card's poster region is the FLIP origin. On CTA tap:

**Phase 1 — measure (0ms).** Read `getBoundingClientRect()` of `.posterRegion` on the compact card. Render the sheet hidden (`opacity: 0`, `pointer-events: none`) so it lays out, then read the target rect of its iframe-frame. Stash both in refs.

**Phase 2 — clone & lift (0–520ms).** Render a portaled clone of the poster (poster image + favicon chip) absolutely positioned at the source rect. Animate it to the target rect with a `transform: translate(...) scale(...)` interpolation on the §16 rise-up curve `cubic-bezier(0.18, 0.9, 0.28, 1.04)` over 520ms. Simultaneously:

- Sheet scrim fades in (180ms, state-curve).
- Sheet body slides up from `translateY(100%)` → `0` over 360ms (state-curve), but its iframe-frame stays at `opacity: 0` so the lifting clone owns the visual.
- Compact card's actual poster fades to `opacity: 0.4` so the dismissal "return" feels coherent.

**Phase 3 — handoff (520ms).** Clone is removed. Sheet's iframe-frame snaps to `opacity: 1`. Iframe enters its own `loading → live` cycle. The clone's last frame's average colour is sampled into `--lift-tint` and used as the iframe-frame's background, so the loader spinner sits on a coloured backdrop matching the poster instead of flashing white.

**Reverse on dismiss.** Same FLIP, target = source. Iframe fades to `opacity: 0` first (120ms, state-curve); a fresh poster clone lifts back down to the card's poster slot over 440ms; scrim fades out alongside.

**Fallback when FLIP can't run.** If the compact card has scrolled out of view at tap-time, the source rect is off-screen; the clone animates from below the viewport so it still reads as "rising into the sheet" rather than failing silently.

This is the family's first shared-element transition. Every other widget animates the sheet independently of its originating card; the lift makes "compact card and expanded sheet are the same surface" legible at a glance.

## Other motion

- Compact card mount: §11 `riseUp` (560ms ladder, 60ms stagger up to the 8th child).
- Trust capsule on poster: §16 springy bounce on first paint (240ms, after the poster has faded in).
- Progress chip on `training` sheet header: count-up using the same RAF helper Earnings/Profile use (target: new percent value, 280ms, ease-out cubic).
- Completion → `completed` state: poster favicon chip's `Check` glyph swap on §16 springy curve (240ms); §10 success banner replaces CTA with a state-curve cross-fade (200ms).
- Loader spinner: `Loader2` rotation on the state-curve at 800ms-per-revolution; fades out over 200ms when iframe `load` fires.

No fourth curve. No `transition: all`.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` neutralises:

- The lift transition — clone is skipped entirely. Sheet just opens (scrim fades, content snaps to its final layout).
- Trust-capsule pop, success-banner spring, training-chip count-up — replaced with instant value swaps.
- `riseUp` stagger removed; rows appear at their final position immediately.

Iframe `load`, postMessage handling, focus management, and origin verification are unaffected — those are functional, not decorative.

## Edge cases

- **Iframe never loads (network error, CSP block, slow vendor).** 8s timeout; sheet enters `error` sub-state. No completion fired. "Try again" re-mounts the iframe (resets the timer).
- **`allowed_origin` mismatch on completion event.** Drop silently; one console-warn per reason per widget instance. Do not fire completion.
- **User closes sheet mid-progress on `training`.** State → `dismissed`, last `progress` percent retained on the card caption. Reopening re-mounts the iframe; the partner page is responsible for resuming.
- **`partner_form` completes but `silent: true`.** No chat-visible `widget_response`; engine still records for rule-matching.
- **No `poster_url`.** Trust capsule centres in tinted region; FLIP source rect is the tinted region itself. Lift still works without imagery.
- **Multiple webview widgets in one chat.** Each scopes its postMessage listener by `widget_id` echo; concurrent iframes don't cross-fire completions. Listener attaches on `sheet_open`, detaches on close.
- **Progress event arrives without `complete`.** Chip updates; widget never auto-dismisses. Spec says: completion is mandatory to dismiss the sheet automatically; without it, the user closes manually and lands in `dismissed`.
- **`url` is `http://`.** Mixed-content blocked by browser → surfaces as the `error` sub-state. Spec mandates `https://`. mockBot fixtures use HTTPS only.
- **Partner page navigates within the iframe.** Allowed (no `disallow-frame-navigation` sandbox token); the parent doesn't track inner navigation. Completion still requires the postMessage event.
- **Partner page tries to `window.open` to a popup.** Allowed by `allow-popups` in the default sandbox. Popups open in a new tab; chat is unaffected.
- **Empty `category` in payload.** Eyebrow drops the separator dot — renders as `Partner` (not `Partner · `). Same for the other variants.
- **`url` already contains a query string.** The `widget_id` propagation appends `&wid=<id>`; URLs with hash fragments (`#section`) keep the hash intact (`?wid=<id>#section`).

## Width contract (§3)

Compact card is `width: 100%` per §3; slot caps it at 32rem. **No** `data-widget-variant="wide"` — the compact card stays in the standard slot; the sheet is the wide surface, and it lives inside `#chat-modal-root` (independent of the slot).

## Constant-height contract (§4)

Compact card floor: `min-height: 24rem`. Tallest state is `idle` with poster + caption + CTA; `completed` swaps CTA for the §10 success banner (similar height); `dismissed` keeps the same shape with reworded CTA. No state jumps the card.

## Security & sandbox posture

- **Default `sandbox`:** `allow-scripts allow-forms allow-same-origin allow-popups`. Documented in payload comments; partners can override per-payload.
- **Forbidden tokens:** `allow-top-navigation`, `allow-top-navigation-by-user-activation`. The embedded page cannot navigate the chat.
- **`referrerpolicy="strict-origin-when-cross-origin"`** — partner sees only the chat origin, not full URL.
- **Origin gate** (described in postMessage protocol section above) — three-check gate, silently drops failures, one log per reason per instance.
- **Never `targetOrigin: '*'`** in either direction.
- **CSP awareness.** The host app needs `frame-src` and `child-src` directives to allow each partner origin. **This is a deployment integration concern for ess-pwa, not a runtime concern for this widget.** The spec flags it so the team knows to configure CSP when rolling this out; the widget itself does not check CSP at runtime.

## Tokens (sanity check)

- **Spacing:** `space-200` (card padding), `space-150` (card section gap), `space-125` (header badge↔text), `space-100` (chip↔percent gap on training header, capsule offsets), `space-050` (favicon↔domain inside capsule).
- **Type:** title `font-size-400` semibold, description `font-size-200` regular `grey-60`, eyebrow `font-size-100` semibold uppercase `letter-spacing-wide`, caption `font-size-100` regular `grey-50`, capsule `font-size-100` medium `grey-80`.
- **Color:** brand-60 accent (CTA, eyebrow icon, training progress fill), grey-10 borders, grey-30 hover, grey-50/60/80/90 neutral ladder, `--color-text-success` for `completed`, `--color-text-error` for the error sub-state. No fourth tone.
- **Motion:** state-curve (fades, scrim, hover, focus), rise-up (lift transition + entry stagger), springy (capsule pop, completion-chip morph). No fourth curve.
- **Icons:** `ExternalLink`, `GraduationCap`, `BookOpenText`, `MonitorSmartphone` (variant), `Globe` (favicon fallback), `Loader2` (loading), `WifiOff` (error), `Check` (completion glyph), `X` (close), `RotateCcw` (try again), `ArrowRight` (CTA chevron).

## Registration (§17 — five touchpoints)

1. **Widget files** — `src/widgets/EmbeddedWebview.jsx` + `embeddedWebview.module.scss`. Sheet co-located in the same JSX file as `EmbeddedWebviewSheet` (matches `SignatureSheet` / `DocumentViewerSheet` co-location). The lift-clone is a third inner component (`LiftClone`) also in the same file; it portals into `#chat-modal-root` for the duration of the transition.
2. **Registry** — `src/chat/registry.js`, key `embedded_webview` → component import.
3. **Schema** — `src/engine/widgetSchemas.js`, key `embedded_webview`. Category: `advanced` (escape-hatch class). Four variants: `partner_form` (default), `training`, `reader`, `preview`. Each `payload()` factory mints `makeId('webv')` and supplies a known-good HTTPS URL fixture. Fixtures: a static page hosted under `/public/embed-fixtures/` for `partner_form` and `training` (so we control the postMessage emission for demos), and `https://example.com` (or similar safe public URL) for `reader` and `preview`.
4. **Mock trigger** — `src/engine/mockBot.js`, regex `/^(show )?(embedded[- ]?webview|webview)/i` builds via `getVariantPayload('embedded_webview', 'partner_form')`. Sub-triggers: `show webview training`, `show webview reader`, `show webview preview` — same pattern Approval / Validated Input use.
5. **Studio palette icon** — `src/studio/WidgetPalette.jsx` `WIDGET_ICONS` map: `embedded_webview: ExternalLink` (semantically "this opens something").

## Out of scope

- **Same-origin iframe scroll observation.** We never observe scroll inside the iframe — even if the partner page is same-origin, this widget treats it as opaque. `reader` completion is always user-attested.
- **Iframe state preservation across closes.** If the partner page wants resumption, it uses cookies / localStorage. The widget re-mounts the iframe on every reopen.
- **Custom completion matchers.** The postMessage protocol is fixed (`{ source, widget_id, event, data }`). Bespoke per-partner matchers are out of scope; partners conform to the protocol.
- **Inline-grow (accordion) display mode.** Considered and rejected — a 24rem-tall iframe is too small for real partner UIs, and it fights §4. Sheet is the only display mode.
- **Lift gesture in reduced-motion.** Reduced-motion neutralises the FLIP entirely; the sheet just opens.
