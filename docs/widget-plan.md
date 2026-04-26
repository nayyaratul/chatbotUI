# Widget Plan

The widget family is the 30-row spec in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`. Every widget below — built or pending — follows **`docs/widget-conventions.md`** (the rule book). Non-negotiables for every entry:

- §0 two-pass workflow — Pass 1 structure, then Pass 2 elevation with `/frontend-design`.
- §0.1 zero hardcoded values — every px / rem / hex resolves to a Nexus token.
- §1 card shell — symmetric `space-200` padding, `grey-10` border, hover-only shadow, slot-owned width.
- §2 header chrome — 36×36 brand-tinted icon badge, title at `font-size-400`, description at `grey-60`.
- §5 primary CTA — `Button variant="primary"`, full width, accent override `--color-action-primary: var(--brand-60)`, sentence-case verb label.
- §13 color conventions — brand-60 accent, `grey-10 / 20 / 30 / 50 / 60 / 80 / 90` neutral ladder, `--color-text-success` / `--color-text-error` / `yellow-60` for status.
- §15 Lucide icons only.
- §16 three motion curves — state transitions, rise-up entry, springy bounce. No fourth curve.
- §17 five-touchpoint registration — component file, `registry.js`, `widgetSchemas.js`, `mockBot.js`, `WidgetPalette.jsx` icon map.

If `/frontend-design` ever proposes something that conflicts with the conventions doc, **the doc wins**. Anti-pattern audit (§15, §18) must pass zero before shipping.

---

## Status

**27 of 30 CSV widgets built**, plus two chat primitives (`text`, `widget_response`) and one companion (`evidence_review`, worker-facing sibling of QC Evidence Review).

**Last shipped:** Audio Player (#25) — landed across `b80cccb` (Pass 2 close) / `087af48` (Pass 2 elevation) / `3054708` (Pass 1 close) / `a0c40ed` / `6775dad` / `7da868a` / `7ee8e03` / `4e814ec` (Pass 1 regions 5 → 1) / `a785dff` (spec).

**Pending:** 3 widgets — all P2 (Phase 2+). All P0 and P1 widgets complete.

---

## Done — P0 / Phase 1 (11 / 11)

| # | Widget | File | Notes |
|---|---|---|---|
| 1 | Quick Reply | `QuickReply.jsx` | Horizontal pills / vertical stack per count |
| 2 | MCQ Quiz | `McqQuiz.jsx` | Wizard progress uses §6 step counter |
| 3 | Job Card | `JobCard.jsx` | + `JobDetailsModal.jsx` companion for "View details" |
| 4 | File Upload | `FileUpload.jsx` | Bottom-sheet source picker, upload progress, thumbnail preview |
| 5 | Image Capture | `ImageCapture.jsx` | 30rem min-height floor; camera viewport scrim uses §0.1-allowed `9999px` trick |
| 6 | Progress Tracker | `ProgressTracker.jsx` | §6 segmented-pill vocabulary |
| 7 | Form | `FormWidget.jsx` | Editing → collapsed summary state, constant-height per §4 |
| 8 | Document Preview | `DocumentPreview.jsx` | Confidence dots per field; tap-to-edit low-confidence values |
| 9 | Confirmation Card | `ConfirmationCard.jsx` | Tone-bookmark left stripe via §9 |
| 18 | Score Card | `ScoreCard.jsx` | Overall + category breakdown; expandable reasoning |
| 20 | QC Evidence Review | `QcEvidenceReview.jsx` (+ `EvidenceReview.jsx` worker-facing) | Bounding-box overlay is its signature moment |

## Done — P1 / Phase 1–2 (11 / 11)

| # | Widget | File | Notes |
|---|---|---|---|
| 10 | Checklist | `Checklist.jsx` | §8 ledger stripe + §6 segmented pills |
| 11 | Instruction Card | `InstructionCard.jsx` | Numbered-circle rail is the signature moment |
| 12 | Rating | `RatingWidget.jsx` | Hover-preview stars; stars/thumbs/emoji/NPS variants |
| 15 | Date/Time Picker | `DateTimePicker.jsx` | Three mode-aligned variants (date / time / datetime); success pop on §16 springy curve |
| 16 | Video Player | `VideoPlayer.jsx` | Two variants (standard / enforced); enforced mode's hatched "must watch" progress bar is the signature — slow diagonal drift reads as "alive, watching you." Two-stage poster→video reveal, sonar-ping on play overlay hover, media-region completion pulse synchronous with chip. Reduced-motion aware. |
| 17 | Validated Input | `ValidatedInput.jsx` | Phone / email / Aadhaar / PAN / PIN / bank / custom; shake keyframe on error |
| 19 | Carousel | `Carousel.jsx` | `data-widget-variant="wide"` opts the slot out of the 32rem cap (§3) |
| 21 | Shift Calendar | `ShiftCalendar.jsx` | §6 segmented pills with hatched pattern for full-shift state |
| 22 | Comparison / Side-by-Side | `Comparison.jsx` | Three variants (candidate_match / skills_gap / qc_spec). v2.1 shape for narrow chat slots: inline item band (one line, brand-tinted left part + grey-tinted right part, each `[icon] [name]`) + vertical stack of per-criterion blocks. Each block carries the criterion name as an eyebrow header, a 3-part values row below (`a_value · tone dot · b_value`), and a tone-colored left-edge stripe (§8 ledger pattern) as the peripheral verdict signal. Tone dot is icon-only — no chip copy. Tone-specific settle after the springy pop (match glow, partial pulse, gap nudge) lives on the dot. §6 summary pill fills after the last dot settles; sheen + brightness settle land the "tally" cue. Row-level single-open notes (§9 pull-quote, rail aligned to the block stripe). v1 gutter-rail + v2 explainable-table specs preserved as superseded / iteration-history in the spec doc. |
| 23 | Approval | `Approval.jsx` | Four use-case variants (bgv / interview / qc_flagged / offer); tiered decision flow — Approve 50/50 with Reject; destructive actions two-step with tone-striped inline notes. Eyebrow announces card type per variant |
| 24 | Training Scenario | `TrainingScenario.jsx` | Pre-brief + post-results variants |

## Done — P2 / Phase 2+ (5 / 8)

| # | Widget | File | Notes |
|---|---|---|---|
| 14 | Signature Capture | `SignatureCapture.jsx` | Two structural variants (`document` / `text`); use-case (`offer` / `contract` / `completion`) is a payload field that drives header icon + default copy, not a separate variant. Capture surface is a portaled `SignatureSheet` (bottom-sheet, owns the `<canvas>`); `DocumentViewerSheet` co-located in the same JSX file shares the same chat-frame containment pattern (portal into `#chat-modal-root`, three-phase animation, scrim + close-button focus). Drawing: pointer events with `setPointerCapture`, `touch-action: none` to suppress browser scroll/zoom, quadratic smoothing through midpoints, DPR-aware canvas with `ResizeObserver` redraw, ink color resolved from `--grey-90` at mount via `getComputedStyle`. Strokes stored as `Array<Array<{x,y}>>` in normalized 0..1 coords so the same point arrays render at any physical size. Card holds 4 states: idle (gate-pending) → reviewed (gate met) → captured → submitted. **Review-before-sign gate is load-bearing**: `document` requires opening the modal once (close → gate clears with timestamp + Check); `text` requires scrolling to end (`scrollTop + clientHeight >= scrollHeight - 4`). Caption swaps from pre-gate copy to post-gate copy with leading green Check; preview region opacity ramps from `0.64` → `1`. **Signature moment**: framed signature stamp morph at submit — wrapper border re-tones to `--color-text-success`, multi-layer hatched bg (45° primary + -45° cross-grain at half opacity for woven-paper feel), inset frame ring springs in 120ms after submit, two diagonal corner brackets (top-left + bottom-right) fade in at 200ms, watermark fleck presses in at 280ms with -6deg final rotation, halo bloom rebuilt as two-stage box-shadow over 480ms, ink scale-settles `1 → 1.04 → 1` on the springy curve. §10 banner replaces CTA. **§13 exception locked**: ink stays `var(--grey-90)` (the signature is the user's, not the system's; brand-blue ink reads as a flourish where formality is the goal) — all other chrome stays brand-60 / success. Keyboard shortcuts intentionally dropped (touch-first widget, no bulk-review power-user case). Reduced-motion neutralizes all introduced animations; user gesture inside the sheet is unaffected. Decline path is upstream Quick Reply, not this widget. |
| 25 | Audio Player | `AudioPlayer.jsx` | Single variant (`default`). Inherits #26's audio data-viz primitive verbatim — 32-bar pre-rendered waveform, two-layer base+sweep with `clip-path: inset(0 calc(100% * (1 − var(--play-progress))) 0 0)` and `mask-image` wet leading edge, RAF loop reading `audio.currentTime / duration`, end-pulse on the rightmost bar via `apwWaveformEnded` toggle-off-on-across-replay-frame trick. Adds three behavioral elements not in VR: tap-to-seek (offsetX-based, robust against bar/gap clicks via getBoundingClientRect; auto-resumes if previously paused), cycling speed pill (`1× → 1.5× → 2× → 1×`, multiplication-sign typography, `el.playbackRate` set in useEffect on speedIndex), and listen-tracking (monotonic `listen_percentage` max + one-shot `completed` edge at ≥95%). `fireCompletion` is the single edge — fires `onReply` once, idempotent across RAF/ended/seek-past-threshold racing via `completedRef` synchronous gate. **Listened seal**: row retints success via `.playerRowListened`, 600ms one-cycle `apwSealShimmer` `::after` overlay (inherits VR's documented exception above the §16 280–360ms entry band), every bar tints `--color-text-success` with a 280ms `apwBarSettle` springy retint that fires once on first class application. `Listened` chip with `apwChipPop` (200ms delay so it lands inside the shimmer's traveling sheen) + leaf icon delay 320ms (chip "acquires" its check). Replay icon swaps Play → `RotateCcw` after completion; **play button intentionally stays brand-60 — does NOT tint success** (locked decision: replay reads as a normal action, not a tinted-celebration action). Pass 2 elevation: `apwSeekFlash` ring imperatively re-fired via classList toggle (no React `key=` remount → keyboard focus survives the seek), `apwSpeedLabelPulse` on the inner label same imperative pattern. Pass 2 close dropped a `filter: drop-shadow()` halo from the sweep — it can't GPU-cache when the silhouette shifts every RAF tick, would have dropped low-end Android playback to 30fps; the wet-edge mask remains the signature kissing-the-bars moment without the perf cost. Error path is in-place degradation in the `.playerRow` (disabled play button, grey bars, "Unable to load audio" meta) — no separate state block, no DENIED treatment. ArrowLeft/Right ±5s seek when play button focused; `mountedRef` belt-and-suspenders for setState-after-unmount; `stopPlayRaf()` at start of `handleAudioPlay` prevents RAF double-stack on rapid pause/resume; replay explicitly resets `audio.currentTime = 0` for cross-browser consistency. Reduced-motion neutralizes all introduced animations. |
| 26 | Voice Recording | `VoiceRecording.jsx` | Single variant (`default`, tap-to-start / tap-to-stop). Real `getUserMedia` + `MediaRecorder` + Web Audio `AnalyserNode`. Signature primitive: 32-bar live waveform driven by time-domain RMS into a 32-slot ring buffer at ~10 samples/sec, bar heights computed via `calc(size-04 + bar-norm * (size-32 − size-04))` on a per-bar `--bar-norm`. Pulsing red recording dot + `vrcDotPulse` halo synced with a `vrcTimerHalo` red-glow on the timer's `::before` (1400ms cadence on the springy curve). Within 5s of max, every active bar tints toward `--color-text-error` so the urgency lives on the row, not just the timer. PREVIEW pairs the frozen waveform with a brand-60 L→R sweep (clip-path on `--play-progress`, RAF-tracked from `audio.currentTime`) plus a `mask-image` wet leading edge so the sweep "kisses" each bar. End-of-playback fires a one-cycle springy bar-pulse and swaps Play → `RotateCcw` until the next press. SUBMITTED retints every bar to `--color-text-success` and runs a 600ms one-cycle "seal" shimmer (`::after` with `color-mix(--white 36%, transparent)` overlay) — documented exception above the §16 280–360ms entry band, called out as a deliberate "sealed" beat. IDLE mic-icon breathes on a 2.6s state-curve loop. Reduced-motion neutralises all 12 introduced animations. Sets the audio data-viz primitive that #25 Audio Player will inherit. |
| 28 | Payment / Earnings | `Earnings.jsx` | Three variants (paycheck / incentive / advance). Signature moment: RAF-driven count-up on the big total (0 → target, ease-out cubic, 720ms) inside a tone-tinted container, with a gradient sheen sweeping L→R across the container as the count lands and a brightness settle closing the beat. Trend chip pops after the count and does a one-cycle directional nudge (up / down / flat). Breakdown rows stagger with §8 ledger-dot vocabulary + tone halo. Big total stays at `font-size-400` despite CSV's 28px — prominence carried by weight + tinted container + count-up, not size escalation (§12). |
| 29 | Candidate / Worker Profile Card | `Profile.jsx` | Two variants (worker / admin). Signature moment: composite score ring (§6 linear-fill vocabulary translated to circle per the widget-plan sanction) — two concentric SVG circles in a 64×64 viewBox, stroke-dashoffset animates 0 → target over 720ms while the score number counts up inside (RAF, same helper as Earnings). Tone bands drive ring colour + verdict word (Strong / Decent / Room to grow); arrival settle is tone-specific (success halo / warning scale-pulse / error opacity settle). Header: 48×48 initials disc + name + headline + §7 availability chip (available status gets a one-cycle "live" dot-pulse). Body: 2-col grid with ring left + stats list right. Skill §7 chips with dashed-border overflow indicator. Admin footer follows Approval's destructive-left / constructive-right convention. |

## Pending — P2 / Phase 2+ (0 / 3)

| # | Widget | Spec-CSV summary | Signature-moment hint |
|---|---|---|---|
| 13 | Location Picker / Map | GPS-backed pin-drop or POI selector | `data-widget-variant="wide"` to hold a meaningful map area |
| 27 | Embedded Webview | Iframe escape-hatch for complex UIs | Compact preview → expanded iframe; minimal chrome |
| 30 | Incentive / Leaderboard | Personal ring OR top-5 list | Progress ring target-hit animation on §16 springy curve (builds on #29's ring vocabulary) |

---

## Build cadence reminders

- **Pass 1** must pass the §0.1 grep (`grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/<file>.module.scss`) before moving to Pass 2.
- **Pass 2** (`/frontend-design`) elevates one signature moment per widget — it does **not** override §1 shell, §3 width, §13 color, or §12 type hierarchy.
- Every widget registers in **five** places (§17). Missing any one leaves the widget invisible to some surface (chat / Studio palette / text trigger).
- Before committing: run the verification command at the bottom of `widget-conventions.md` — zero matches outside the legitimate-exceptions list.
