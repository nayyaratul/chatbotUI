# Voice Recording Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #26 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P2, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (doc wins any conflict).

---

## Purpose

A discrete voice-recording widget for bounded audio capture (typically 10–120 seconds): record-once, preview, submit. Different from continuous STT — this is a deliberate clip in response to a specific prompt.

CSV use-cases: voice-based assessments ("record your answer"), language-proficiency evaluation, sales-pitch practice, spoken-instructions verification.

The signature moment is the **live audio waveform** — 32 bars driven by Web Audio `AnalyserNode` RMS bins during recording, frozen on stop, then swept L→R by a brand-60 fill during preview playback, and tone-success frozen at 100% post-submit. This widget defines the audio-data-viz primitive that Audio Player (#25) will inherit later.

## Variants

Single variant — `default` (tap-to-start, tap-to-stop). Use-case framing (assessment, instruction check, language proficiency, etc.) rides on `title` / `description` / `prompt` text rather than a separate widget variant.

§17 still requires the `variants` array, so the schema entry is a one-element array. The Studio palette hides the Variant stage when `variants.length <= 1`, so there's no UI cost.

## Payload schema

```js
{
  widget_id: 'vrc_xxx',                       // makeId('vrc')
  prompt_id?: string,                          // optional caller-side correlation
  title: string,                               // 'Record your answer'
  description?: string,                        // 'Speak clearly. You'll be able to review before submitting.'
  prompt?: string,                             // optional read-aloud or instruction text
  max_duration_seconds: number,                // default 60; hard auto-stop ceiling
  min_duration_seconds?: number,               // default 0; gates the Stop button until met
  auto_transcribe?: boolean,                   // SCHEMA-RESERVED: no STT in playground
}
```

Result sent on submit (`widget_response`):

```js
{
  widget_id,
  prompt_id,
  audio_data_url: string,                      // base64-encoded recording
  duration_seconds: number,
  mime_type: string,                           // whatever MediaRecorder produced — typically 'audio/webm'
  recorded_at: number,                         // Date.now() at the moment recording stopped
}
```

Parallel to ImageCapture's `image_data_url` payload — self-contained, no real backend wiring.

## Layout

```
┌─────────────────────────────────────────────────────┐
│  [Mic badge] Record your answer                     │   header
│              Speak clearly. You can review first.   │
│                                                     │
│  PROMPT                                             │   eyebrow (only if prompt set)
│  "Describe a time you handled a difficult           │   prompt block (grey-90 quote)
│   delivery situation."                              │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │   media region (state-dependent)
│  │                                             │    │
│  │              [ ●  Mic 28px ]                │    │   IDLE: capture button
│  │                                             │    │
│  │            Tap to record · 60s              │    │   IDLE: caption + max-duration
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  [Re-record]                  [Submit recording]    │   action bar (preview + submitted)
└─────────────────────────────────────────────────────┘
```

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`, `width: 100%`. `min-height: 24rem` (§4 mid-density floor; voice region needs more than 18rem for the waveform but not the camera-sized 30rem).

**Header.** §2 verbatim — `Mic` Lucide glyph (size 18) inside the 36×36 brand-tinted badge, title at `font-size-400`, optional description at `grey-60`.

**Prompt block (optional).** Renders only when `payload.prompt` is present.

- Eyebrow `PROMPT` — §12 eyebrow style (`font-size-100` / semibold / uppercase / `letter-spacing-wide` / `grey-50`), `border-bottom: var(--border-width-100) solid var(--grey-10)` (matches Earnings + Profile section dividers).
- Quote — `font-size-200` / `regular` / `grey-90` / `line-height-300`. No quote marks added by the widget; copy carries them if intended.

**Media region.** State-dependent. Same outer container in every state so the height stays constant — that's the §4 floor's job.

### IDLE

- Big mic capture button — full-width within the media region, `min-height: var(--size-64)` (a content-sized clickable target, not a fixed pill).
- Inside: large `Mic` glyph (`size 28`, `strokeWidth 1.75`), the verb caption, and a duration hint.
- Caption: `Tap to record` (`font-size-200` / `medium` / `grey-90`).
- Sub-caption: `Up to {max_duration_seconds}s` if no min, `Min {min}s · max {max}s` if both set (`font-size-100` / `regular` / `grey-50` / tabular-nums).
- Hover: border tightens to `grey-30`, soft brand tint via `color-mix(brand-60 4%, white)` background.
- Pressed: subtle scale-down (`transform: scale(0.99)`).

### RECORDING

- Eyebrow row: pulsing red dot (`size-12` circle, `--color-text-error`, springy 1.0 → 1.15 → 1.0 pulse on a 1.4s loop) + label `RECORDING` (`font-size-100` / semibold / uppercase / `letter-spacing-wide` / `--color-text-error`).
- **Live waveform** — 32 bars, `size-04` wide each, `size-02` gap, container height in the band between `size-04` (silence floor) and `size-32` (loud peak). Bars colored `brand-60`. Heights are time-domain RMS energies from a Web Audio `AnalyserNode` (`getFloatTimeDomainData()` → root-mean-square per chunk) read on every RAF tick into a 32-slot ring buffer at a fixed sample cadence (~10 samples/sec → one new bar every ~100ms). Most recent on the right; oldest drop off the left once the ring fills. Bars below the floor render as empty `grey-20` placeholders so the row never visually collapses to nothing during silence.
- Timer — `mm:ss` in `font-size-400` / `semibold` / `tabular-nums` / `grey-90`, centered below the waveform.
- Warning beat — when `elapsed >= max - 5`, the timer pulses once on a §16 springy curve and re-tints `--color-text-error`. (Single beat, not a loop.)
- Stop CTA — `Button` neutral-tone secondary, full-width, label `Stop recording`, `Square` Lucide icon. **Disabled until `elapsed >= min_duration_seconds`** (or always enabled if no min).
- Hard auto-stop when `elapsed >= max_duration_seconds` → transitions to PREVIEW (no user action required).

### PREVIEW

- **Static waveform** — same 32 bars as recording, but frozen at the captured shape. Bars stored in component state at the moment `MediaRecorder.stop()` fires, derived from the RMS history buffer captured during recording.
- **Playback sweep** — a brand-60 fill that sweeps L→R across the waveform proportional to `currentTime / duration` of the `<audio>` element. Implemented via `clip-path: inset(0 calc((1 - progress) * 100%) 0 0)` on a positioned overlay copy of the bars (or a CSS variable + `--play-progress`). Bars *behind* the sweep render in `grey-30`; bars *swept* render in `brand-60`. Updates via RAF while playing.
- Play/pause button — circular, `size-44`, brand-60 background, white `Play` / `Pause` glyph (`size 18`). Sits left of the waveform.
- Duration label — right of the waveform, `font-size-200` / `regular` / `grey-60` / `tabular-nums`. Shows `mm:ss / mm:ss` (current / total) while playing, `mm:ss` (total) when paused/stopped.
- No scrubbing — clicking on the waveform does nothing. Playback is play / pause only.

### SUBMITTED (terminal)

- §10 success banner — `CheckCircle2` chip + `Voice clip submitted` + `Saved successfully · {timeLabel}`.
- The static waveform stays visible below the banner, but bars re-tint to `--color-text-success`. Sweep frozen at 100%. Play/pause stays interactive (post-submit replay is allowed; doesn't re-fire `widget_response`).
- Foot row: `{duration_seconds}s · {formatBytes}` in `font-size-100` / `grey-50` (mirrors ImageCapture's submitted-state foot).

### DENIED (permission branch)

- Mirrors ImageCapture exactly. `ShieldAlert` icon (`size 32`, `strokeWidth 1.5`, `grey-60`) + title (`Microphone required`) + sub copy (the actual permission error string) + `Try again` secondary button that re-attempts `getUserMedia`.

**Action bar.**

- Visible only in PREVIEW. SUBMITTED replaces it with the §10 success banner; the bar itself is gone.
- PREVIEW: `[Re-record]` (secondary, left, `RotateCcw` iconLeft) + `[Submit recording]` (primary, right, `ArrowRight` iconRight). `display: flex; gap: var(--space-100); flex-wrap: wrap`. Same shape as ImageCapture's preview row.
- Re-record: stops any current playback, clears the captured blob and waveform history, returns to IDLE. Does NOT auto-restart `getUserMedia`.

## States — full lifecycle

1. **Idle (on mount).** Card rises (§16 entry, 320ms). Header at `delay 0`. Prompt block (if present) at `delay 80ms`. Capture button at `delay 160ms`.
2. **Recording.** Triggered by tapping the IDLE capture button. Calls `getUserMedia({ audio: true })`. On success, instantiates `MediaRecorder`, attaches an `AnalyserNode` for the live waveform, starts the RAF loop, starts the timer. On `getUserMedia` rejection → DENIED.
3. **Preview.** Triggered by Stop click OR auto-stop at `max_duration_seconds`. Stops `MediaRecorder`, captures the resulting Blob, encodes to a base64 data URL (matches ImageCapture's data-URL approach), freezes the waveform history into the static-bar array, transitions state.
4. **Submitted (terminal).** Triggered by Submit. Fires `onReply` with the `widget_response`. Replaces the action bar with the §10 success banner. Bars re-tint to success.
5. **Denied.** Permission rejection. Retry button re-attempts capture; on success, returns to RECORDING.

Reduced motion (`@media (prefers-reduced-motion: reduce)`) collapses: red-dot pulse → static dot, timer warning pulse → instant tint flip, sweep animation → instant fill at 100%, ring/banner entry → instant. Live waveform bars still update (the data is the content, not motion); but the per-bar transition smoothing is dropped.

## Interactions

- **IDLE capture button** — click → request mic → RECORDING (or DENIED).
- **RECORDING stop button** — click → stop MediaRecorder → PREVIEW. Disabled until `elapsed >= min`.
- **PREVIEW play/pause** — toggles `<audio>` element. Sweep updates from the audio's `timeupdate` events (RAF-throttled).
- **PREVIEW re-record** — clears state, returns to IDLE. Does not reset the captured blob until a new recording starts (so re-record-then-cancel isn't a path; once they tap re-record we're committed to IDLE).
- **PREVIEW submit** — fires `widget_response`, transitions to SUBMITTED.
- **SUBMITTED play/pause** — playback is allowed post-submit; doesn't re-fire `onReply`.
- **Keyboard:**
  - All buttons are real `<button>` elements; Tab focusable in DOM order.
  - `Enter` / `Space` triggers each.
  - `Escape` during RECORDING stops recording (same as clicking Stop, only fires if `min` met).
- **Cleanup on unmount** — stops the MediaRecorder, releases the stream tracks, cancels the RAF loop. Same lifecycle pattern as ImageCapture's `stopStream`.

## Motion

All motion uses the three §16 curves.

| Element | Curve | Duration |
|---|---|---|
| Card entry (`vrcRiseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Prompt block fade-in | same | 280ms, delay 80ms |
| Capture button rise | same | 280ms, delay 160ms |
| State transition (idle ↔ recording ↔ preview ↔ submitted) | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 220ms |
| Recording-dot pulse | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 1400ms loop |
| Live waveform bar height | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 80ms (per-bar smoothing) |
| Timer warning pulse (5s remaining) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms (single beat) |
| Playback sweep | linear (driven by `currentTime`, no curve — it's a clock) | sync to audio |
| Success-banner replace | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |
| Submitted-state bar tint | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 280ms |
| Hover / focus | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 180–220ms |

Never `transition: all`.

## Registration (§17 five touchpoints)

1. `src/widgets/VoiceRecording.jsx` + `src/widgets/voiceRecording.module.scss`.
2. `src/chat/registry.js` — `voice_recording: VoiceRecording`.
3. `src/engine/widgetSchemas.js` — schema entry with single `default` variant; `buildVoiceRecordingPayload()` fixture (sample prompt, `max_duration_seconds: 60`, `min_duration_seconds: 5`).
4. `src/engine/mockBot.js` — trigger `/^(voice|voice record|record voice|record answer)$/i` → `voice_recording` `default`.
5. `src/studio/WidgetPalette.jsx` — `voice_recording: Mic` (Lucide).

`label`: `'Voice'`. `category`: `'input'` (matches CSV's "Input & Data Collection" + the closest sibling — `image_capture`, also `input`).

## Anti-pattern guardrails (§18)

All 17 items still in force. Pre-commit checks:

- [ ] Shadow hover-only (#1).
- [ ] No card-root `max-width` (#2).
- [ ] Symmetric `space-200` card padding (#3).
- [ ] No header `border-bottom` (#4) — note: the prompt block's bottom border is on the *eyebrow*, not the header. That's the same pattern Earnings + Profile use for in-body section dividers and is sanctioned.
- [ ] Title at `font-size-400` (#5). Timer reaches `font-size-400` too — that's the largest type in the widget; Submit CTA label stays at button default.
- [ ] Every CTA has Lucide + verb (#6) — `Stop recording` (Square), `Re-record` (RotateCcw), `Submit recording` (ArrowRight), `Try again` (no icon — matches ImageCapture's denied-state retry).
- [ ] Zero raw hex / px / rem outside §0.1 allowed list (#7, #13).
- [ ] `brand-60` via `--color-action-primary` on primary CTA (#8).
- [ ] Card `width: 100%` (#9).
- [ ] Live waveform uses §6 vocabulary as a translation: it's the segmented-pills pattern stretched into a bar-chart (one bar per time bin, color by status). Does NOT introduce a fourth progress indicator. The playback sweep is a linear-fill (§6 first pattern) projected onto the waveform — explicitly sanctioned per `widget-plan.md`'s "ring is a sanctioned circular translation of linear-fill" precedent.
- [ ] Success banner follows §10 (#11).
- [ ] No stagger past 8 (#12) — we only stagger 3 elements at mount.
- [ ] Lucide icons only, no bespoke SVG except the 32 waveform bars (which are CSS-styled `<span>`s, not SVG); SVGs not introduced (#14, §15).
- [ ] No `transition: all` (#15).
- [ ] Only three §16 curves (#16).
- [ ] Pass 2 follows Pass 1 (#17).

**Pre-SCSS token-verification checklist** (lesson from prior `space-175` / `font-weight-bold` bugs):

- Before composing any SCSS, grep the Nexus tokens to confirm rung availability:
  ```bash
  grep -h "^\s*--font-weight-\|^\s*--font-size-\|^\s*--space-\|^\s*--size-\|^\s*--radius-\|^\s*--border-width-\|^\s*--line-height-\|^\s*--letter-spacing-\|^\s*--opacity-" \
    ~/Projects/nexus-design-system/ -r 2>/dev/null | sort -u
  ```
- Rungs this widget needs: `size` 02 / 04 / 12 / 16 / 18 / 28 / 32 / 36 / 44 / 64; `radius` 100 / 150 / 200 / 500 / full; `border-width` 100 / 300; `font-weight` regular / medium / semibold; `font-size` 100 / 200 / 400; `space` 025 / 050 / 075 / 100 / 125 / 150 / 200; `opacity` 012 / 024 / 072 / 100. Any missing rung gets a peer substitution before SCSS work begins (no inventing).

Run the §0.1 grep before each commit:
```bash
grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/voiceRecording.module.scss
```

## Scope guard

The **live audio waveform** is the sole new primitive — and it's a sanctioned translation of §6's segmented-pill + linear-fill vocabulary onto a time-series axis (bar = pill, sweep = fill). Everything else reuses existing family patterns.

Pass 2 (`/frontend-design`) is permitted to elevate:

1. **Live-waveform reactivity** — bar-height smoothing, the silence-floor visual treatment, the brand-60 → red shift if recording approaches max.
2. **Playback sweep rhythm** — the L→R fill pacing during preview; the moment-of-completion settle when playback ends.
3. **Recording-dot pulse** — single-beat polish, possibly a soft red-glow halo around the timer.
4. **Submitted-state freeze** — the captured-waveform-as-stamp tint shift to success, possibly a subtle one-cycle shimmer to land the "saved" beat.
5. **IDLE capture-button affordance** — pressed-state polish, hover micro-interaction.

Pass 2 is **not** permitted to:

- Introduce a second primitive — no spectrum analyzer, no circular waveform, no waveform-on-a-mic-glyph composite.
- Add scrubbing — playback stays play/pause only.
- Escalate the timer or any other element above `font-size-400`.
- Replace the bar waveform with a continuous SVG path (stays bar-based for visual consistency with §6).
- Introduce a fourth tone (recording = error, default = brand, submitted = success — that's it).
- Override §1 / §3 / §12 / §13 / §16 / §17 / §18.

## Out of scope (YAGNI)

- **Speech-to-text.** `auto_transcribe` is schema-reserved for future use; the widget never calls an STT pipeline. The CSV's processing-indicator state is also out of scope (no transcription, no processing).
- **Trim / scrub / multi-take.** Single recording, single preview, single submit. Re-record is a full reset.
- **Background-noise estimation, voice-activity detection, silence trimming.** Raw capture only.
- **Bitrate / format selection.** Whatever `MediaRecorder` produces by default ships in the data URL.
- **Real backend wiring.** No upload — `audio_data_url` is the payload, same as ImageCapture's `image_data_url`.
- **Pause / resume during recording.** Not in CSV; not in scope.
- **Push-to-talk / press-and-hold variant.** Brainstorming dropped this; tap-to-start / tap-to-stop is the only interaction model.
- **Studio test of mic permission.** The widget gates on real browser permission like ImageCapture does for the camera; no synthetic-mic mode for the playground.
