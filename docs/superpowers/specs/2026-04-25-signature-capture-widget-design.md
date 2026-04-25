# Signature Capture Widget — Design Spec

**Status:** Approved in brainstorming · ready for Pass 1 implementation.
**Widget number:** #14 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P2, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (everything below conforms to it; the doc wins in any conflict).

---

## Purpose

Touch-first signature pad for legally weighty in-chat moments: offer-letter acceptance, NDA / employment-contract execution, shift-completion sign-off. The user reads (or opens) the thing they're agreeing to, taps a signature preview region on the card, draws their signature on a focused capture surface (bottom sheet on mobile, modal on desktop), reviews the captured signature back inline, and commits with **Submit signature**. On submit, the inline preview morphs into a framed signature stamp with timestamp + device metadata — the formal artifact of the signing moment.

The widget enforces a **review-before-sign gate**: for the `document` variant, the signing affordance stays disabled until the user has opened the attached document; for the `text` variant, until they've scrolled to the end of the agreement. Without the gate the widget is a click-through; with it, it's a real read-then-sign artifact.

## Variants

Two variants, **structural** (different body layout above the signature region). Use-case framing (offer / contract / completion) is a payload field, not a variant — it drives the header icon + title copy only, so the same shell handles all three contexts without a 6-way variant explosion.

| Variant | Body region above sign | Gate to enable signing |
|---|---|---|
| `document` | Document preview band — 72×72 thumbnail + title + meta + "Open document" link routing through existing `JobDetailsModal` chrome | User must tap "Open document" once; on close, "Document reviewed · HH:MM" caption appears and signing enables |
| `text` | Inline scrollable agreement body — `max-height: var(--size-...)` (~12rem), scrolls within the card with a subtle fade-mask at top and bottom | User must scroll to the end of the agreement; on `scrollTop + clientHeight ≥ scrollHeight - tolerance`, "Agreement read · HH:MM" caption appears and signing enables |

Default mock-bot variant: `document` (richer body, exercises the JobDetailsModal handoff).

**Use-case payload field** (`use_case: 'offer' | 'contract' | 'completion'`) drives header icon + default title copy:

| use_case | Lucide icon | Default title | Default subtitle |
|---|---|---|---|
| `offer` | `HandCoins` | "Sign the offer letter" | "Riders Operations · Hub agent" |
| `contract` | `ScrollText` | "Sign the NDA" | "Vendor onboarding · 2026-04" |
| `completion` | `ClipboardCheck` | "Sign off shift completion" | "Bandra warehouse · Shift #4821" |

Title / subtitle are payload-overridable; defaults exist so the Studio palette renders something coherent on first inject.

## Payload schema

```js
{
  widget_id: 'sg_xxx',                       // makeId('sg')
  variant: 'document' | 'text',
  use_case: 'offer' | 'contract' | 'completion',
  title?: string,                            // overrides use_case default
  subtitle?: string,                         // overrides use_case default
  document_id?: string,                      // present when wired to a real doc
  document_ref?: {                           // required for variant='document'
    label: string,                           // e.g. 'Offer letter — Riders Operations'
    version: string,                         // e.g. 'v3.2'
    pages?: number,                          // e.g. 3
    updated_at?: ISO,                        // e.g. '2026-04-22'
    thumbnail_url?: string,                  // 72×72 raster preview
  },
  agreement_text?: string,                   // required for variant='text' (markdown-light: paragraphs only, no headings/lists)
  signer_name?: string,                      // pre-filled from session, displayed in stamp metadata
  cta_label?: string,                        // default 'Submit signature'
  legal_disclaimer?: string,                 // default: 'By signing you agree to be bound by this {document|agreement}.'
}
```

Result sent to the bot on commit (`widget_response`):

```js
{
  signature_image_id: 'img_xxx',
  signed_at: ISO,
  device_info: 'iPhone · Safari',            // short readable form, not full UA
  document_id?: string,
  signer_name: string,
  decided_at: ISO,
}
```

## Layout

The card is a **non-interactive preview** of the signing moment. The actual drawing primitive lives in a **bottom-sheet capture surface** (`SignatureSheet`) that opens on tap. This solves the chat-scroll-vs-canvas-touch conflict by construction (sheet locks body scroll, canvas owns all touch input via `touch-action: none`) and gives the canvas comfortable vertical room (~50vh) on every device.

### Card layout — `document` variant

```
┌──────────────────────────────────────────────────┐
│ [HandCoins] Sign the offer letter                │  §2 header
│             Riders Operations · Hub agent        │
│                                                  │
│ ┌─ Document ─────────────────────────────────┐  │  doc preview band
│ │ [72×72]  Offer letter — Riders Ops · v3.2  │  │  (variant='document')
│ │ thumb    3 pages · Updated 2026-04-22      │  │
│ │          ▸ Open document                    │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Open the document to enable signing              │  pre-gate caption
│  (or)  Document reviewed · 14:32                 │  post-gate caption
│                                                  │
│ ┌─ Sign here ────────────────────────────────┐  │  preview region
│ │     X____________________   Tap to sign    │  │  (idle / captured /
│ └────────────────────────────────────────────┘  │   stamped — see States)
│                                                  │
│ By signing you agree to be bound by this doc.    │  legal_disclaimer
│                                                  │
│ [ Submit signature ]                             │  §5 primary CTA
└──────────────────────────────────────────────────┘
```

### Card layout — `text` variant

```
┌──────────────────────────────────────────────────┐
│ [ScrollText] Sign the NDA                        │  §2 header
│              Vendor onboarding · 2026-04         │
│                                                  │
│ ┌─ Agreement ────────────────────────────────┐  │  scrollable body
│ │  This Non-Disclosure Agreement ("NDA") ...  │  │  (variant='text')
│ │  ... long legal text scrolls within ...     │  │  max-height ~12rem
│ │  ... continued ...                          ▾  │  fade-mask top/bottom
│ └────────────────────────────────────────────┘  │
│                                                  │
│ Read to the end to sign                          │  pre-gate caption
│  (or)  Agreement read · 14:32                    │  post-gate caption
│                                                  │
│ ┌─ Sign here ────────────────────────────────┐  │
│ │     X____________________   Tap to sign    │  │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ By signing you agree to be bound by this doc.    │
│                                                  │
│ [ Submit signature ]                             │
└──────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`. `width: 100%`, slot owns cap (family 32rem — **no `data-widget-variant="wide"`**). Min-height floor `30rem` per §4 (matches Image Capture — the multi-state body + signature preview region must not shift card height through the 4 states).

**Header (§2 exact).** Icon by `use_case` (HandCoins / ScrollText / ClipboardCheck), tinted `brand-60`. Title `font-size-400`, subtitle `font-size-200` / `grey-60`. Header layout is the standard left-icon + middle-text shape — no trailing element (unlike Approval's confidence arc).

**Document preview band (variant='document' only).**
- Wrapper: `grey-10` hairline border, `radius-150`, padding `space-125`, gap `space-125` between thumb and text.
- Thumbnail: 72×72 (`var(--size-72)`), `radius-150`, `object-fit: cover`, falls back to a `FileText` Lucide icon at `size={28}` inside a tinted square if `thumbnail_url` is absent.
- Right column: label `font-size-200` / `grey-90`, meta line `font-size-100` / `grey-60`, "Open document" link `font-size-100` / `brand-60` / `font-weight-medium` with a trailing `ChevronRight` glyph at `size={14}`.
- Tap target wraps the whole row; opens the document via existing `JobDetailsModal` chrome (no new modal). On modal close, the gate fires.

**Inline scrollable body (variant='text' only).**
- Wrapper: `grey-10` hairline border, `radius-150`, padding `space-125 space-150`, `max-height` calculated to ≈12rem of text via a token combination (e.g. `calc(var(--line-height-300) * 8)`), `overflow-y: auto`, `scroll-behavior: smooth`.
- Body text: `font-size-200` / `grey-90` / `line-height-300`. Paragraphs separated by `space-100`.
- Fade-mask: top and bottom inner shadows via `mask-image: linear-gradient(...)` with token-driven stop positions, fading the topmost and bottommost lines so the user has a peripheral signal that there's more above / below. Top mask hides when `scrollTop === 0`; bottom mask hides when scrolled to end (gate-met).
- Scroll listener computes `scrolledToEnd = scrollTop + clientHeight >= scrollHeight - var(--size-04)` (4px tolerance, `size-04` is the closest tokenized constant — using it inside the JS comparison documents the intent).

**Gate caption row.** Single line, `font-size-100` / `grey-60` for the pre-gate variant ("Open the document to enable signing" / "Read to the end to sign"), or `font-size-100` / `--color-text-success` with a `Check` glyph at `size={14}` for the post-gate variant ("Document reviewed · 14:32" / "Agreement read · 14:32"). Caption swaps in place via a 200ms state-curve fade-in/fade-out so the eye registers the gate clearing.

**Signature preview region.** Same wrapper across all four states — `grey-10` hairline border, `radius-150`, `aspect-ratio: 5 / 2`, padding `space-150`. Content depends on state (see **States** below). When pre-gate, the wrapper is rendered with `opacity: var(--opacity-064)` and `pointer-events: none` so it visibly reads as gated; "Tap to sign" becomes "Tap to sign" only after the gate clears.

**Legal disclaimer line.** `font-size-100` / `grey-50`, single line, sits between the preview region and the CTA. Default copy `By signing you agree to be bound by this {document|agreement}.` interpolated by variant. Hidden when `legal_disclaimer === null` is explicitly passed.

**Submit signature CTA.** §5 primary, `width: 100%`, `--color-action-primary: var(--brand-60)`. Disabled until **gate met AND signature captured**. Label: "Submit signature" (or `cta_label` override).

### Bottom-sheet capture surface (`SignatureSheet`)

A modal overlay that owns the actual canvas. Renders into a portal anchored at `document.body` so it escapes the chat scroll context. Co-located with the widget in `signatureCapture.module.scss` under a scoped `.sgs_*` class prefix to prevent CSS-modules name clashes with the card.

```
┌──────────────────────────────────────────────────┐
│  Sign your name                            [×]   │  sheet header
│  Offer letter — Riders Operations · v3.2          │  subtitle (carries
│                                                  │   document context)
│                                                  │
│ ┌──────────────────────────────────[↶][✕]─────┐ │  canvas
│ │                                              │ │  ~50vh tall
│ │       ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─                │ │  touch-action: none
│ │       X______________________                │ │  scroll-locked body
│ │                                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Use finger or stylus                             │  caption
│                                                  │
│ [ Cancel ]              [ Use signature ]        │  footer actions
└──────────────────────────────────────────────────┘
```

**Sheet shell.**
- Mobile: `position: fixed; inset: auto 0 0 0; max-height: 90vh; border-radius: var(--radius-300) var(--radius-300) 0 0;` slides up from below on a scrim.
- Desktop (`@media (min-width: 640px)`): centered modal, `max-width: 32rem`, `border-radius: var(--radius-300)` all corners, scrim dims chat behind. Same internal structure.
- Scrim: `var(--white)` at `var(--opacity-072)` with `backdrop-filter: blur(var(--size-06))`. Tap to close (with stroke-loss confirm — see Interactions).

**Sheet header.** Title "Sign your name" at `font-size-400` / semibold, subtitle interpolates document context (label + version, or first 60 chars of `agreement_text` if `text` variant). Close button (`×`, Lucide `X` at `size={18}`) top-right.

**Canvas region.**
- `<canvas>` element, sized to fill the sheet body height minus header/footer/caption. CSS `width: 100%; height: 100%` on the wrapper; canvas's intrinsic pixel dimensions set via `getBoundingClientRect()` × `devicePixelRatio` on mount and resize for crisp rendering.
- `touch-action: none` so the browser doesn't interpret drag as scroll.
- Background `var(--white)`. Inner border `var(--grey-10)`. Dashed signature baseline (`grey-30`) + `X` mark fade out 200ms on first stroke.
- **Ink color: `var(--grey-90)`** — black-equivalent. Documented as a deliberate §13 exception: the signature is the *user's*, not the system's; brand-blue ink reads as a stylistic flourish where formality is the goal. All other widget chrome (CTA, banner chip, gate-caption tone, header icon badge) stays brand-60 / success per §13.
- Smoothing: quadratic curve through stroke-point midpoints (Catmull-Rom-equivalent for two-point segments) — no jagged polylines.
- Floating Undo (`↶`) and Clear (`✕`) buttons top-right of canvas, `size={16}` Lucide glyphs in `var(--size-32)` tappable circles. Disabled while history empty.

**Sheet footer.**
- Two buttons, `flex; gap: var(--space-100)`:
  - **Cancel** — `Button variant="secondary"`. Closes sheet with stroke-loss confirm if any strokes exist.
  - **Use signature** — `Button variant="primary"` with the same `--color-action-primary: var(--brand-60)` override. Disabled until at least one completed stroke. Tap → captures stroke point arrays into widget state, closes sheet, returns control to the card.

## States

Four card states. Constant-height honored via §4 30rem floor + `margin-top: auto` on the CTA region. Body region above signature (doc preview band or scrollable text) does not animate height between states.

1. **Idle (gate-pending) — initial mount.** Body region renders the doc preview band or the scrollable text. Pre-gate caption shows ("Open the document to enable signing" / "Read to the end to sign"). Signature preview region renders empty placeholder (dashed baseline + `X` mark + "Tap to sign" caption right of `X`) at `opacity-064` with `pointer-events: none`. Submit CTA disabled. Card rises in (`riseUp` §16, 320ms). Body region staggers in 60ms after card; signature preview region 120ms after; gate caption 180ms after.

2. **Reviewed (gate met, no signature yet).** Triggered by `document` modal close OR `text` scroll-to-end. Pre-gate caption fades out (200ms state curve), post-gate caption fades in ("Document reviewed · 14:32" / "Agreement read · 14:32") with leading `Check` glyph in `--color-text-success`. Signature preview region animates from `opacity-064` to `opacity-100`, `pointer-events` enables, "Tap to sign" caption now reads as a live affordance. Submit CTA stays disabled until signature is captured.

3. **Captured (gate met, signature captured, pre-submit).** Triggered by sheet's "Use signature" tap. Sheet slides down (220ms state curve). Captured stroke point arrays normalize to 0..1 coordinates and re-render as inline SVG `<path>` inside the preview region — sized to the 5:2 aspect, ink color `grey-90`. Strokes draw in via `stroke-dasharray` 280ms, 60ms stagger, cap at 8 strokes (rest render instant). Preview region's "Tap to sign" caption swaps to "Tap to re-sign". Submit CTA enables ("Submit signature"). User can re-tap the preview region to re-open the sheet pre-loaded with the existing strokes (Undo / Clear / re-draw), then re-confirm with "Use signature".

4. **Submitted (terminal).** Triggered by Submit tap. Action sequence:
   1. CTA fades 180ms (state curve).
   2. Signature preview region morphs into framed signature stamp:
      - Wrapper border re-tones to `--color-text-success` (280ms state curve).
      - A hatched border (`repeating-linear-gradient` with §0.1-allowed token stops at `var(--border-width-300)` and `var(--size-04)`) renders inside the wrapper as a stamp frame — formal-document cue.
      - Existing SVG ink paths animate `transform: scale(1)` → small settle on the springy curve, 280ms.
      - A success halo (radial gradient via `box-shadow: 0 0 var(--size-12) color-mix(...)`) blooms 120ms after the ink settles, then fades 200ms — the "valid" beat.
   3. Stamp metadata renders below the ink: `Atul Nayyar · 14:32 · Apr 24 · iPhone` (`signer_name · time · date · device_info`) at `font-size-100` / `grey-60`, `letter-spacing-wide`, `tabular-nums` on the time.
   4. §10 success banner replaces the CTA region: `[✓ Signed]   Signature captured at 14:32` — chip in success tone, timestamp at `font-size-200` / `grey-90`, `tabular-nums`.

   Body region (doc preview band or scrollable text) stays visible — the user can re-read what they signed. Tap-to-open on the document still works (terminal but not opaque). Scroll on the text variant still works. Re-sign is **not** available — terminal per family convention.

Transitions:
- Idle → Reviewed: caption swap + opacity ramp on preview region. No layout shift.
- Reviewed → Captured: sheet close animation (sheet's own concern); SVG draw-in inside the preview region. No layout shift on the card.
- Reviewed/Captured ↔ Captured (via re-sign): preview region keeps its strokes visually until the sheet's "Use signature" overwrites them; if the user opens the sheet and Cancels, the original strokes remain.
- Captured → Submitted: CTA fades, preview morphs to stamp, banner replaces. ~640ms total beat.

## Interactions

**Tap to sign — primary mobile gesture.** Tapping the signature preview region (when gate met) opens the bottom sheet. The sheet locks body scroll (`overflow: hidden` on `<html>`), portals into `document.body`, and traps focus. On Android, a back gesture / Esc closes the sheet (with stroke-loss confirm).

**Sheet — drawing.**
- `pointerdown` on canvas starts a stroke; `pointermove` (with `event.preventDefault()`) extends it; `pointerup` / `pointercancel` commits.
- Smoothing applied per-segment with quadratic interpolation through midpoints. Stroke history stored as arrays of `{x, y, t}` points (timestamps used only for downstream replay if needed; ignored by the static SVG render).
- **Undo** — pop last stroke from history, repaint canvas. Disabled when history empty.
- **Clear** — fade strokes 200ms, truncate history. No confirm prompt — pre-submit it's non-destructive (CSV says "Clear button (reset canvas)"; the family doesn't gate non-destructive actions).
- **Cancel sheet button / scrim tap / Esc / close `×`** — if strokes exist, prompt: a small inline confirm slides up from the footer ("Discard signature?" + "Discard" `red-50` text button + "Keep drawing" secondary). Two-step prevents accidental loss. If no strokes, closes immediately.
- **Use signature button** — captures the stroke point arrays into widget state via the parent's setter, then closes the sheet (220ms slide-down on state curve). Disabled until at least one stroke exists.

**No card-level keyboard shortcuts.** This is a touch-first widget for workers signing once on a phone — there is no bulk-review power-user case to optimize for. The preview region is `role="button"` so native Enter/Space activation works (baseline a11y, not a power-user shortcut). Sheet has Esc-to-close because that's standard modal hygiene.

**Focus management — minimal, modal-hygiene only.**
- Tab order on the card: body region's interactive child (Open document link / scrollable agreement body) → signature preview region → Submit CTA. No card-root auto-focus on mount — the card lives in a chat scroll context and stealing focus would jump the page.
- Sheet open: close button auto-focuses; body scroll locks beneath.
- Sheet close: focus restores to the signature preview region on the card (standard "return focus to opener" pattern). No internal focus trap inside the sheet — the sheet's interactive elements are few, the canvas is the primary surface, and the modal scrim absorbs stray clicks.

**Accessibility — drawing fallback.** Canvas drawing is inherently inaccessible for keyboard-only / screen-reader users. The sheet renders a small italic caption: "Need help signing? Ask the operator to sign on your behalf." This is a known constraint of the primitive, mirroring industry signing flows.

## Motion

All motion uses the three §16 curves. No fourth curve invented.

| Element | Curve | Duration |
|---|---|---|
| Card entry (`riseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Body region stagger (doc band / text body / preview region / gate caption) | same | 60ms step, cap at 8 |
| Pre-gate → post-gate caption swap (fade-out + fade-in) | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 200ms each |
| Preview region opacity ramp (gated → enabled) | same | 200ms |
| Sheet rise-up (mobile slide-up / desktop fade-scale) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 280ms |
| Sheet slide-down on close / Use signature | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 220ms |
| Canvas placeholder fade on first stroke | same | 200ms |
| Clear-canvas stroke fade | same | 200ms |
| SVG ink draw-in (per stroke, on Captured state arrival) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 280ms, 60ms stagger, cap 8 |
| Stamp wrapper border tone shift (Captured → Submitted) | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 280ms |
| Stamp ink scale settle | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |
| Stamp success halo bloom + fade | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 120ms bloom + 200ms fade |
| §10 banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |

Never `transition: all`. List properties explicitly (§18 #15).

**Reduced motion.** `@media (prefers-reduced-motion: reduce)` short-circuits: card entry instant, sheet appears without slide, ink draws-in instant (final state), stamp morph fades only (no halo bloom), banner replaces without springy curve. Drawing inside the sheet is unaffected — it's user-driven, not system motion.

## Registration (§17 five touchpoints)

1. **Files** — `src/widgets/SignatureCapture.jsx` (PascalCase) + `src/widgets/signatureCapture.module.scss` (camelCase). The bottom-sheet primitive (`SignatureSheet`) is co-located in the same JSX file as a sibling component, with its CSS scoped under `.sgs_*` class names in the same SCSS file to avoid module name clashes.

2. **`src/chat/registry.js`** — `signature: SignatureCapture`.

3. **`src/engine/widgetSchemas.js`** —
   ```js
   signature: {
     label: 'Signature',
     category: 'input',
     variants: [
       { id: 'document', label: 'Document', payload: () => buildSignaturePayload('document') },
       { id: 'text',     label: 'Agreement', payload: () => buildSignaturePayload('text') },
     ],
   }
   ```
   `buildSignaturePayload(variant)` is a local helper in `widgetSchemas.js` that fills the schema with representative mock data per variant: a canonical `use_case` (rotates through offer/contract/completion across calls or fixed-per-variant — fixed is simpler), a canonical `document_ref` for the document variant, a canonical `agreement_text` for the text variant, and a canonical `signer_name`. Import `makeId` from `./ids.js`; call it inside the builder so fresh ids mint per invocation.

4. **`src/engine/mockBot.js`** —
   ```js
   registerRule({
     match: /^(show )?sign(ature)?( capture)?$/i,
     build: () => ({ type: 'signature', payload: getVariantPayload('signature', 'document') }),
   })
   ```
   Default variant = `document` (richer body, exercises modal handoff). No inline payloads — compose on top of `getVariantPayload` if the mock needs extra fields.

5. **`src/studio/WidgetPalette.jsx`** — `WIDGET_ICONS` map: `signature: Signature` (Lucide `Signature` icon — the cleanest semantic match; `PenTool` as a fallback if the icon isn't exported in the project's pinned Lucide version, verified at Pass 1 import time).

## Anti-pattern guardrails (§18)

Before Pass 1 commit and again before Pass 2 commit, verify every item:

- [ ] Shadow hover-only — card flat at rest (#1).
- [ ] No `max-width` on the card (#2).
- [ ] Symmetric `space-200` padding (#3).
- [ ] No `border-bottom` on header (#4).
- [ ] Title `font-size-400` (#5).
- [ ] Every button has a Lucide + verb label (Submit signature / Cancel / Use signature / Open document) (#6).
- [ ] Zero raw hex / px / rem outside §0.1 allowed list (#7, #13).
- [ ] `brand-60` accent via `--color-action-primary` override (#8).
- [ ] Card `width: 100%`, slot owns cap (#9).
- [ ] No fourth progress indicator — gate caption is type-only (§12 eyebrow), not a progress bar (#10).
- [ ] Success banner follows §10 — chip + timestamp, no confetti (#11).
- [ ] Stagger caps at 8 (#12).
- [ ] Lucide only; kbd chips are `<span>`, not icons (#14).
- [ ] No `transition: all`; each transition lists properties (#15).
- [ ] Only the three §16 cubic-beziers (#16).
- [ ] Pass 2 follows Pass 1 — don't skip (#17).

Run the §0.1 grep:
```bash
grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/signatureCapture.module.scss
```
Zero matches outside `cubic-bezier(…)`, the `min-height: 30rem` floor, `aspect-ratio: 5 / 2`, `@media (min-width: 640px)`, and the `9999px` scrim trick if used.

**Token verification (per memory: "verify Nexus tokens before composing").** Before Pass 1 commits any SCSS, grep `~/Projects/nexus-design-system` for every token name referenced here that this widget hasn't used in its peers — particularly `--size-72` (thumbnail), `--opacity-064` (gated preview), and any composite `calc(var(--line-height-300) * 8)` for the text body cap. Substitute the closest existing rung if any token is undefined; never silently fall through.

## Scope guard

The **framed signature stamp** (Submitted state's wrapper-border + hatched-frame + ink-settle + halo bloom) is the one new visual primitive. Everything else reuses existing family patterns:

- Card shell (§1), header (§2), width (§3), height floor (§4), CTA (§5).
- Document preview band geometry mirrors Approval's evidence "document" panel (72×72 thumb + label + meta + open-link).
- Scrollable text body mirrors a JobDetailsModal section's scroll affordance.
- Gate caption flip is a §12 typography swap, not a new component.
- Sheet shell follows JobDetailsModal's modal vocabulary (scrim + portal + focus-trap), specialized to mobile-bottom-sheet on narrow viewports.
- Success banner is §10 verbatim.

**Pass 2 (`/frontend-design`) is permitted to elevate:**
- The sheet rise-up choreography (mobile slide-up curve, scrim fade, focus pulse).
- The gate-caption flip — the moment the user clears the gate is the second-most memorable beat after the stamp.
- The canvas → SVG morph at sheet close (current spec: cross-fade + draw-in; Pass 2 may polish the timing or add a subtle "lock-in" beat).
- The framed stamp's hatched border, halo bloom, and ink-settle timing.

**Pass 2 is NOT permitted to:**
- Override §1 shell, §3 width, §12 type, §13 color (the **ink-color exception is locked here**, not extensible to other widgets), §16 curves, §17 registration, §18 anti-patterns.
- Introduce a second new primitive.
- Replace the bottom-sheet with another capture pattern.
- Add a fourth state to the card.
- Skip the gate (the gate is load-bearing for the widget's purpose, not decorative).

If `/frontend-design` reaches for something outside this list, revisit this spec rather than improvising.

## Out of scope (YAGNI)

Explicitly deferred:

- **Real backend wiring.** Mock id is enough for the playground — the widget's job is to render the shape and fire `widget_response` on commit.
- **Decline / refusal path.** Decided in brainstorming: signing is one-way. Decline is upstream (Quick Reply with Sign/Decline before this widget renders). Don't build a Reject button into Signature Capture.
- **Typed-name + drawn-signature dual capture** (DocuSign-style). Drawn-only is enough.
- **Witness / counter-signer flow.** One signer per widget instance.
- **Per-page initialing for multi-page documents.** Single signature at the end is enough.
- **Print / download the signed document.** Out of chat-context scope.
- **Read-time / dwell tracking** ("user spent 47s on document"). Compliance feature; not in CSV.
- **Stylus pressure / tilt input.** Pointer events with quadratic smoothing is enough.
- **Re-sign after submit.** Terminal per family convention. If the candidate needs to re-sign, a new widget instance handles it.
- **Document version diff / change-tracking.** The widget shows what's attached now; versioning is upstream.
- **Signature verification / fraud detection.** Out of scope; the widget captures intent, not biometric proof.
- **PDF rendering inline.** The document preview band stays at thumbnail-tap-to-open; full inline PDF.js is heavier than this widget should carry.
- **Markdown / formatted agreement text.** `agreement_text` is plain paragraphs only — no headings, lists, or bold. If formatted legal text is needed, switch to the `document` variant.
