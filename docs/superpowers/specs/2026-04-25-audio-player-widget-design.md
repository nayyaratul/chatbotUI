# Audio Player Widget — Design Spec

**Status:** Shipped · primitive revised post-Pass-2 (see Amendment below).
**Widget number:** #25 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P2, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (doc wins any conflict).

---

## Amendment — primitive swap (post-Pass-2)

The original brainstorm locked the inherited primitive as VR's bar + sweep + `--play-progress` clip-path + `mask-image` wet leading edge. After Pass 2 closed clean, the user redirected: that vocabulary is the right *recording-side* visualization (the waveform IS the audio being captured), but the wrong *consumption-side* visualization. For Audio Player the right primitive is closer to VideoPlayer's progress-bar pattern — slim track + luminous brand-60 thumb — because:

- A pre-rendered waveform of an audio clip the user hasn't heard yet is decorative, not informational. The user can't read it.
- The progress-bar-with-thumb is functional: where am I, how much is left, click here to jump.
- The **breathing halo on the thumb** becomes the new "audio is alive" signal — replaces the per-bar wet-edge that VR's recording flow earned.

The signature moment is now the **brand-60 thumb halo breathing on a 2.6s state-curve loop while audio plays**, plus the springy halo expansion on tap-to-seek (`apwThumbSnap`), plus the **600ms one-cycle seal shimmer** on the first crossing of the 95% completion threshold. The thumb retints success and pins to the right edge; the fill tints success across its width; the breathing animation stops because the seal IS the signal.

Locked decisions from the original brainstorm carry forward unchanged: single `default` variant, no §10 banner, no DENIED state, error degrades in place, single `onReply` fire on the completion edge, monotonic `listen_percentage`, **play button stays brand-60 even after the seal** (replay reads as a normal action, not a tinted-celebration action), no drag scrubber.

The sections below are kept for historical context but reflect the *original* bar+sweep design. The implementation in `src/widgets/AudioPlayer.jsx` is the source of truth for the current primitive.

---

## Purpose

An inline audio-player widget for voice content: slim progress track with a luminous brand-60 thumb, play / pause, tap-to-seek, speed toggle, completion seal. CSV use-cases — voice-based training in regional languages, recorded task instructions for semi-literate workers, pronunciation guides, replay of previous interactions.

This is the **consumption-side sibling** of Voice Recording (#26). It does NOT inherit VR's bar+sweep primitive (see Amendment above) — instead it sits in VideoPlayer's progress-bar family, adapted for audio: the bar is slimmer (`size-04` vs VR's `size-32` waveform region), the thumb carries the alive-signal via a breathing halo, and there is no scrubber thumb on VideoPlayer's progress (so the AudioPlayer thumb is a genuine new shape inside the family, but it's a small refinement on a known progress-bar primitive, not a wholly novel data-viz).

The thumb's halo replaces VR's per-bar wet-edge as the "audio is alive" signal. After the seal, the row stays success-tinted forever; replay during listened state plays the audio but the visual stays sealed and `completed` never flips back.

## Variants

Single variant — `default`. CSV does not enumerate variants; the listed use-cases (training audio, instructions, pronunciation, replay) are visually identical voice content. Use-case framing rides on `title` / `description` text rather than a separate widget variant. Same precedent as VR.

§17 still requires the `variants` array, so the schema entry is a one-element array. The Studio palette hides the Variant stage when `variants.length <= 1`.

## Payload schema

```js
{
  widget_id: 'apw_xxx',                          // makeId('apw') — Audio PlayerWidget
  audio_id: string,                              // caller-side identifier; echoed in the response
  url: string,                                   // <audio src>; can be a data URL or a real URL
  duration_seconds: number,                      // authoritative duration from the bot
  waveform_data?: number[],                      // optional pre-rendered peaks, normalized 0..1
  speeds?: number[],                             // default [1, 1.5, 2]; cycled on speed-pill tap
  title?: string,                                // §2 header title; default 'Voice instruction'
  description?: string,                          // §2 header subtitle; e.g. 'Hindi · 1:24'
  silent?: boolean,                              // family-standard reply mode flag
}
```

Result sent on completion (the first time playback crosses the 95% threshold):

```js
{
  type: 'widget_response',
  payload: {
    source_type: 'audio_player',
    source_widget_id: <widget_id>,
    data: {
      audio_id,
      listen_percentage: number,                 // 0..100, monotonic max
      completed: boolean,                        // true once ≥95% reached
      listened_at: number,                       // Date.now() at the moment completed flipped
    },
  },
}
```

The `widget_response` is fired exactly once per widget instance — on the first crossing of the completion threshold. Replay after completion does not re-fire `onReply`, but does keep `listen_percentage` accurate (already at 100 at that point).

## Layout

```
┌─────────────────────────────────────────────────────┐
│  [Volume2 badge] Voice instruction                  │   §2 header
│                  Hindi · 1:24                       │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │   .playerRow (white card,
│  │  ◉   ▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌  0:00 / 1:24  1× │    │   grey-10 border, space-125 pad)
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  (no foot row — meta lives inside the .playerRow)   │
└─────────────────────────────────────────────────────┘
```

After the first time playback reaches the 95% threshold, the `.playerRow` container retints success and a one-cycle 600ms sheen sweeps L→R across it (the `vrcSealShimmer` mechanism, renamed `apwSealShimmer`). A small `Listened` badge appears in the meta cell beside the duration. The play button stays brand-60.

**Card shell.** §1 verbatim — symmetric `space-200` padding, `grey-10` border, hover-only shadow, `radius-200`, `width: 100%`. **No min-height floor** on either the card or the inner player row: unlike VR, this widget has no swappable state blocks (idle, error, and listened all render the same row geometry, only the meta cell content + tone shift). The row's natural height is dominated by the 44px play button; adding a 176px floor would balloon it to 2× its natural size for no functional reason.

**Header.** §2 verbatim — `Volume2` Lucide glyph (size 18) inside the 36×36 brand-tinted badge, title at `font-size-400`, optional description at `grey-60`. `Volume2` chosen over `AudioLines` because the bar waveform itself is the audio-line metaphor; the badge needs a contrasting "audio" glyph that doesn't double up on the primitive.

**Player row.** Inner white card with `grey-10` border and `space-125` padding — same dimensions as VR's `.previewRow`. Three flex children: `[playBtn] [waveform] [meta]`.

- **Play button.** Circular, `var(--size-44)`, `--brand-60` background, white border-mix-black 88%, white `Play` / `Pause` glyph (size 18). On the first frame after `ended` fires, the icon swaps to `RotateCcw` (matches VR's preview behavior). The button stays brand-60 throughout — even after the seal — by design; see Open Questions in the design package.
- **Waveform.** Two stacked `.waveformLayer` children inside `.waveform` — base layer in `grey-30` (unplayed), sweep layer in `brand-60` (played), clipped by `clip-path: inset(0 calc(100% * (1 − var(--play-progress))) 0 0)` and softened on the leading edge by the `mask-image` wet-edge formula VR uses. Bars: 32, `flex: 1 1 0; max-width: var(--size-04)`, height between `var(--size-04)` and `var(--size-32)` interpolated by per-bar `--bar-norm`. Container `height: var(--size-32)`, `overflow: hidden`. The waveform is the click target for seek (see Interactions).
- **Meta.** Two stacked lines (or one row, slot-width permitting): `mm:ss / mm:ss` while playing, `mm:ss` (total) when paused/idle. `font-size-200` / `regular` / `grey-60` / `tabular-nums`. After completion, a small `Listened` chip appears next to or beneath the time line — `font-size-100` / `semibold` / `--color-text-success`, with a tone-success leaf icon (`CheckCircle2` size 12) inline.
- **Speed pill.** Right-most cell in the row, after meta. `var(--size-44)` height (matches the play button so the row baseline stays clean), padded `space-050 space-100`, `font-size-100` / `semibold` / `tabular-nums` / `brand-60` outlined button. Label cycles `1×` → `1.5×` → `2×` → `1×` on tap. Uses the multiplication sign `×`, not the letter `x`, for typographic correctness. Persists across replay; resets only if the widget is unmounted.

There is no foot row, no §10 banner, no action bar. The CSV doesn't ask for any of these and the widget is intentionally compact ("fits in chat bubble width").

## States — full lifecycle

The audio element is mounted once and persists across all states; we don't recreate it per state.

1. **Idle (on mount).** Card rises (§16 entry, 320ms). Header at `delay 0`. Player row at `delay 80ms`. Bars are all base-grey-30 (unplayed). Play button shows `Play`. Meta shows `0:00 / mm:ss` (`mm:ss` from `payload.duration_seconds`; if `<audio>` `loadedmetadata` later overrides it with a more accurate value, swap silently — non-visual change). Speed pill at `1×` (or first entry of `payload.speeds`).
   - **Pre-metadata sub-state.** While `<audio>` is still resolving, the duration is taken from `payload.duration_seconds` so meta renders immediately. Play is allowed; the browser will buffer enough to play before audio.currentTime starts advancing. There is no separate "loading" visual state — the duration prop closes the gap.
2. **Playing.** Triggered by tapping `Play`, by tapping a bar (which seeks then auto-plays if previously paused), or by Space-bar with the card focused. Sweep RAF starts: on every animation frame we read `audio.currentTime / duration`, set the wrapper's `--play-progress` CSS variable, and update `listen_percentage` to `max(prev, currentTime/duration * 100)`. Meta shows `currentTime / duration`.
3. **Paused.** Triggered by tapping `Pause`, Space-bar, or the audio element's own `pause` event (e.g., browser interruption). Sweep RAF cancels. `--play-progress` stays frozen at the last value. Meta shows the frozen `currentTime / duration`.
4. **Ended (transient → completed).** Triggered by `<audio>`'s `ended` event OR by the RAF tick observing `currentTime/duration >= 0.95` (whichever fires first — the threshold catches codec end-drift; the event catches normal completion). On first-time entry: flip `completed = true`, set `listen_percentage = 100`, fire `onReply` with the `widget_response`, apply the `apwListened` class to `.playerRow` (success tint + 600ms one-cycle `apwSealShimmer` `::after` overlay), retint every bar via `.barListened` (success), append the `Listened` chip to the meta cell, swap the play-button icon to `RotateCcw`. On subsequent entries (replay-then-end), only the icon swap and end-pulse re-fire — no second `onReply`, no second shimmer.
5. **Replay.** Triggered after Ended by tapping `RotateCcw`. Resets `audio.currentTime = 0`, calls `audio.play()`, transitions back to Playing. The row's listened-tone stays applied (it's terminal, like VR's submitted-row). The end-pulse on the rightmost bar re-fires whenever `apwWaveformEnded` toggles off-on (same trick VR uses — `isPlaying = true` while `playProgress = 1` for one frame).
6. **Error.** Triggered by `<audio>`'s `error` event (URL 404, codec unsupported, network failure). The widget degrades in place inside the `.playerRow`: play button gets a disabled treatment (grey-10 background, grey-30 border, grey-50 icon), bars stay at base grey-30 (no sweep), meta replaces the time line with `Unable to load audio` (`font-size-100` / `--color-text-error` / `regular`). No retry button; the widget assumes a fresh server-side message will replace this one if the bot wants the user to try again. No separate state block — the error is an inline degradation.

Reduced motion (`@media (prefers-reduced-motion: reduce)`) collapses every introduced animation:
- `apwRiseUp`, `apwSealShimmer`, `apwEndPulse` → instant
- Sweep clip-path / mask-image: `--play-progress: 1 !important` (full fill always shown), mask-image off (sharp edge)
- Per-bar height `transition` → instant
- Hover transitions: down to `0.01ms`

The bars themselves and the meta line still update because they ARE the content, not motion.

## Interactions

- **Tap play / pause** — toggles `<audio>` element. Idempotent against double-tap.
- **Tap waveform** — click-to-seek. Single click handler on the `.waveform` container; computes the seek fraction via `event.nativeEvent.offsetX / container.clientWidth` and sets `audio.currentTime = fraction * duration`. (offsetX is robust against gaps between bars and clicks landing on the empty container background; reading from `event.target` would miss those gap pixels and feel less responsive.) Sweep snaps to the new position via the usual RAF tick (or a one-shot `--play-progress` write while paused). `listen_percentage` updates to the new max if the seek went forward, stays put if it went backward. If currently paused, the seek resumes playback (matches WhatsApp / Telegram audio-message behavior). If currently ended, seeking restarts playback from the seek point. **No drag scrubber** — single click only.
- **Tap speed pill** — cycles to next entry in `payload.speeds` (or `[1, 1.5, 2]` default). Sets `audio.playbackRate`. Does NOT restart sweep RAF — `--play-progress` is sourced from `currentTime`, which scales with `playbackRate` automatically. Persists across replay.
- **Keyboard:**
  - All interactive elements are real `<button>` elements in DOM order: play → speed. The waveform itself is a `<button>` too (semantically: "seek to position N of 32"), but visually has no border — its click handler reads the clicked bar index from `event.offsetX`.
  - `Enter` / `Space` triggers each focused button.
  - With the card-level focus on the play button: `Space` toggles play/pause (browser default for buttons; we don't need a custom handler).
  - `ArrowLeft` / `ArrowRight` while the play button is focused → seek ±5 seconds. Bound at the `<button>` level, not the document — we don't want global key handling.
- **Cleanup on unmount** — pause `<audio>`, cancel sweep RAF, no other side effects (no streams to close).

## Motion

All motion uses the three §16 curves. One documented exception (`apwSealShimmer` 600ms above the 280–360ms entry band) — same exception VR carries for `vrcSealShimmer`, called out below.

| Element | Curve | Duration |
|---|---|---|
| Card entry (`apwRiseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Player row mount | same | 280ms, delay 80ms |
| State transition (idle ↔ playing ↔ paused ↔ ended) | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 220ms |
| Playback sweep | linear (driven by `currentTime`, no curve — it's a clock) | sync to audio |
| End-of-bar pulse (`apwEndPulse`, last bar only) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms (single beat, re-fires on each replay-end) |
| Listened-row seal (`apwSealShimmer`, ::after overlay) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | **600ms (documented exception above the 280–360ms band — same exception VR's submit-shimmer carries; the longer duration reads as a deliberate "earned" beat traveling across the row, not a hover flash)** |
| Listened-bar tint (`barListened`) | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 280ms |
| Listened chip pop (`apwChipPop`) | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 240ms |
| Per-bar height update (transition) | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 80ms |
| Play-button hover / press / focus | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 180–220ms |
| Speed-pill press | same | 180ms |

Never `transition: all`.

## Registration (§17 five touchpoints)

1. `src/widgets/AudioPlayer.jsx` + `src/widgets/audioPlayer.module.scss`.
2. `src/chat/registry.js` — `audio: AudioPlayer`.
3. `src/engine/widgetSchemas.js` — schema entry under key `audio`, `label: 'Audio Player'`, `category: 'display'`, single `default` variant. Helper `buildAudioPayload()` produces the demo fixture (Hindi training clip, ~84 seconds, with a stable pseudo-random `waveform_data` array of 32 normalized peaks generated from the audio_id seed so the demo is reproducible). The buildAudio helper is small enough to live inline in the schema entry rather than as a separate top-of-file function — same pattern Voice Recording uses for its `default` payload.
4. `src/engine/mockBot.js` — trigger `/^(audio|audio player|listen|play audio)$/i` → `audio` `default`.
5. `src/studio/WidgetPalette.jsx` — `audio: Volume2` (Lucide).

`label`: `'Audio Player'`. `category`: `'display'` (matches Video Player — both are media-consumption widgets).

## Anti-pattern guardrails (§18)

All 17 items still in force. Pre-commit checks:

- [ ] Shadow hover-only (#1).
- [ ] No card-root `max-width` (#2).
- [ ] Symmetric `space-200` card padding (#3).
- [ ] No header `border-bottom` (#4).
- [ ] Title at `font-size-400` (#5). No element in this widget exceeds `font-size-400` — the meta line is `font-size-200`, the speed pill is `font-size-100`, the listened chip is `font-size-100`.
- [ ] Every CTA has Lucide + verb where applicable (#6) — play/pause/replay are icon-only buttons (the icon IS the verb, matches VR's preview play-button precedent and Video Player's overlay play-button); speed pill is text-only (cycling label, no icon — adding an icon would make the cycle ambiguous). All buttons carry `aria-label`.
- [ ] Zero raw hex / px / rem outside §0.1 allowed list (#7, #13). Pre-SCSS verification (see below) and post-edit grep (see below).
- [ ] `brand-60` via `--color-action-primary` on primary CTA (#8) — same `--color-action-primary: var(--brand-60)` override VR uses on `.card`.
- [ ] Card `width: 100%` (#9).
- [ ] Waveform reuses §6 vocabulary as a sanctioned translation (segmented-pill = bar, linear-fill = sweep) — no fourth progress indicator. (Same translation VR ships; locked in by `widget-plan.md`.)
- [ ] No §10 success banner (#11) — Audio Player completion is the seal, not a banner. CSV does not ask for one. The `Listened` chip is a §7 chip-style success marker, not a §10 banner.
- [ ] No stagger past 8 (#12) — only 2 staggered elements at mount (header at 0, player row at 80ms).
- [ ] Lucide icons only, no bespoke SVG (#14, §15) — bars are CSS-styled `<span>`s.
- [ ] No `transition: all` (#15).
- [ ] Only three §16 curves with one documented exception (apwSealShimmer 600ms — explicitly called out and parallel to VR's identical exception). Two curves in active use this widget; the third is the springy curve used for end-pulse and chip-pop (#16).
- [ ] Pass 2 follows Pass 1 (#17).
- [ ] No second primitive (Pass 2 cannot introduce a circular waveform, a spectrum analyzer, a track timeline scrubber thumb, or any other audio-visualization element beyond the bar+sweep — same scope guard VR ships).

**Pre-SCSS token-verification checklist** (lesson from prior `space-175` / `font-weight-bold` bugs):

- Before composing any SCSS, grep the Nexus tokens to confirm rung availability:
  ```bash
  grep -h "^\s*--font-weight-\|^\s*--font-size-\|^\s*--space-\|^\s*--size-\|^\s*--radius-\|^\s*--border-width-\|^\s*--line-height-\|^\s*--letter-spacing-\|^\s*--opacity-" \
    ~/Projects/nexus-design-system/ -r 2>/dev/null | sort -u
  ```
- Rungs this widget needs (all confirmed-existing via VR's current usage): `size` 02 / 04 / 08 / 12 / 32 / 36 / 44 / 176; `radius` 100 / 150 / 200 / full; `border-width` 100 / 200; `font-weight` regular / medium / semibold; `font-size` 100 / 200 / 400; `space` 025 / 050 / 075 / 100 / 125 / 150 / 200; `line-height` 200 / 300; `letter-spacing` tight / wide; `opacity` 100. No new rung introduced — the widget is fully expressible inside VR's verified token set.

Run the §0.1 grep before each commit:
```bash
grep -nE '(^|[^-_a-zA-Z0-9])[0-9]+\.?[0-9]*(rem|px|em)([^a-zA-Z0-9]|$)' src/widgets/audioPlayer.module.scss
```
Only allowed matches: `cubic-bezier(...)` arguments. No `9999px` scrim trick (no scrims in this widget). No `24rem`-family floors (the `min-height` floor uses `var(--size-176)`).

## Scope guard

The **bar+sweep waveform** is **not** a new primitive — it's inherited verbatim from Voice Recording (#26) and is the family's audio data-viz vocabulary. Audio Player adds three behavioral elements: tap-to-seek (a new affordance ON the existing primitive, not a new visual element), speed cycling (a small text button — no new visual primitive), and the listen-percentage tracking model (no visual surface beyond the existing seal mechanism).

Pass 2 (`/frontend-design`) is permitted to elevate:

1. **Sweep-meets-bar moment** — the wet leading edge as it crosses each bar. Inherited but worth a fresh look in this widget's specific slot dimensions.
2. **First-time-completion seal** — the 600ms shimmer landing as the user crosses the threshold. Audio Player's seal differs from VR's in that it can fire DURING playback (not at submit), so the timing relative to the sweep position deserves attention — does the shimmer start exactly when the threshold crosses, or after a small grace beat? Pass 2 calls it.
3. **Tap-to-seek feedback** — the snap of the sweep to the new position, the implicit auto-play if previously paused, any micro-feedback on the clicked bar.
4. **Speed-pill rhythm** — the press feedback as the label cycles; possibly a brief pulse on the new label so the change is perceived.
5. **`Listened` chip pop** — the springy entrance after the seal lands.

Pass 2 is **not** permitted to:

- Introduce a second primitive — no circular waveform, no spectrum analyzer, no track timeline scrubber thumb, no separate "progress dot" overlaid on the waveform.
- Introduce a drag scrubber — seek stays click-only.
- Add a §10 success banner above or below the player row.
- Tint the play button success after the seal — by design, the button stays brand-60 (replay reads as a normal action). This decision was made in brainstorming and is locked.
- Escalate any element above `font-size-400`.
- Override §1 / §3 / §12 / §13 / §16 / §17 / §18.
- Introduce a fourth motion curve.
- Add a download / share / save-for-later affordance.

## Out of scope (YAGNI)

- **Drag scrubbing.** Click-to-seek only. Defer if real users ask.
- **Volume slider.** System volume is the contract; CSV explicitly omits.
- **Transcript / captions panel.** Out of scope; lives in a separate widget if ever needed.
- **Download / share / save-for-later.** No affordance in the CSV.
- **Multi-track playback (queue, next/prev).** One clip per widget; if the bot wants to play three, it sends three widgets.
- **Background-noise reduction, voice-only filtering, EQ.** Raw playback only.
- **Speech-to-text on the played audio.** That's VR's `auto_transcribe`; not in this widget's contract.
- **Server-side completion-event emission beyond the single `widget_response` on threshold crossing.** No tick-by-tick listen-percentage telemetry; the bot gets one event with the final number on completion.
- **Resume across sessions.** `listen_percentage` is in-component state; it does not persist across remounts.
- **Multiple variants.** None in CSV.
