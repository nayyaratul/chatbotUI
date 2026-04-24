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

**22 of 30 CSV widgets built**, plus two chat primitives (`text`, `widget_response`) and one companion (`evidence_review`, worker-facing sibling of QC Evidence Review).

**Last shipped:** Comparison / Side-by-Side (#22) — landed in two passes, `4995cb3` (Pass 2 NIT cleanup) on top of `9de9d5a` (Pass 2 gutter-rail elevation) on top of `3e4befb` (Pass 1 close).

**Pending:** 8 widgets — all P2 (Phase 2+). All P0 and P1 widgets complete.

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
| 22 | Comparison / Side-by-Side | `Comparison.jsx` | Three variants (candidate_match / skills_gap / qc_spec); center gutter rail is the signature — each row's indicator chip springs in while a split-tint connector line draws outward (neutral grey left, `--status-tone` right) over a faint vertical spine. Tri-state match / partial / gap indicators per §7 tone vocabulary; §6 linear-fill summary pill lands 180ms after the final chip. Row-level single-open accordion for expandable notes (§9 pull-quote). |
| 23 | Approval | `Approval.jsx` | Four use-case variants (bgv / interview / qc_flagged / offer); tiered decision flow — Approve 50/50 with Reject; destructive actions two-step with tone-striped inline notes. Eyebrow announces card type per variant |
| 24 | Training Scenario | `TrainingScenario.jsx` | Pre-brief + post-results variants |

## Pending — P2 / Phase 2+ (0 / 8)

| # | Widget | Spec-CSV summary | Signature-moment hint |
|---|---|---|---|
| 13 | Location Picker / Map | GPS-backed pin-drop or POI selector | `data-widget-variant="wide"` to hold a meaningful map area |
| 14 | Signature Capture | Touch canvas with smooth bezier ink | Render the submitted signature as a framed "stamp" in the success banner |
| 25 | Audio Player | Voice content with waveform + speed toggle | Pre-rendered waveform animates as the played portion fills in accent |
| 26 | Voice Recording | Press-and-hold capture, 10–120s | Live waveform + pulsing red dot during capture |
| 27 | Embedded Webview | Iframe escape-hatch for complex UIs | Compact preview → expanded iframe; minimal chrome |
| 28 | Payment / Earnings | Total + breakdown + trend | Trend sparkline + tabular-nums currency |
| 29 | Profile Card | Worker / admin views | Circular composite-score ring (reuse §6 linear-fill vocabulary translated to circle) |
| 30 | Incentive / Leaderboard | Personal ring OR top-5 list | Progress ring target-hit animation on §16 springy curve |

---

## Build cadence reminders

- **Pass 1** must pass the §0.1 grep (`grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/<file>.module.scss`) before moving to Pass 2.
- **Pass 2** (`/frontend-design`) elevates one signature moment per widget — it does **not** override §1 shell, §3 width, §13 color, or §12 type hierarchy.
- Every widget registers in **five** places (§17). Missing any one leaves the widget invisible to some surface (chat / Studio palette / text trigger).
- Before committing: run the verification command at the bottom of `widget-conventions.md` — zero matches outside the legitimate-exceptions list.
