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

**24 of 30 CSV widgets built**, plus two chat primitives (`text`, `widget_response`) and one companion (`evidence_review`, worker-facing sibling of QC Evidence Review).

**Last shipped:** Candidate / Worker Profile Card (#29) — landed across `85ccaac` (Pass 2 ring settles + avail pulse) / `6e16e41` (Pass 1 close) / `11a9745` (Pass 1 structure) / `7196a35` (spec).

**Pending:** 6 widgets — all P2 (Phase 2+). All P0 and P1 widgets complete.

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

## Done — P2 / Phase 2+ (2 / 8)

| # | Widget | File | Notes |
|---|---|---|---|
| 28 | Payment / Earnings | `Earnings.jsx` | Three variants (paycheck / incentive / advance). Signature moment: RAF-driven count-up on the big total (0 → target, ease-out cubic, 720ms) inside a tone-tinted container, with a gradient sheen sweeping L→R across the container as the count lands and a brightness settle closing the beat. Trend chip pops after the count and does a one-cycle directional nudge (up / down / flat). Breakdown rows stagger with §8 ledger-dot vocabulary + tone halo. Big total stays at `font-size-400` despite CSV's 28px — prominence carried by weight + tinted container + count-up, not size escalation (§12). |
| 29 | Candidate / Worker Profile Card | `Profile.jsx` | Two variants (worker / admin). Signature moment: composite score ring (§6 linear-fill vocabulary translated to circle per the widget-plan sanction) — two concentric SVG circles in a 64×64 viewBox, stroke-dashoffset animates 0 → target over 720ms while the score number counts up inside (RAF, same helper as Earnings). Tone bands drive ring colour + verdict word (Strong / Decent / Room to grow); arrival settle is tone-specific (success halo / warning scale-pulse / error opacity settle). Header: 48×48 initials disc + name + headline + §7 availability chip (available status gets a one-cycle "live" dot-pulse). Body: 2-col grid with ring left + stats list right. Skill §7 chips with dashed-border overflow indicator. Admin footer follows Approval's destructive-left / constructive-right convention. |

## Pending — P2 / Phase 2+ (0 / 6)

| # | Widget | Spec-CSV summary | Signature-moment hint |
|---|---|---|---|
| 13 | Location Picker / Map | GPS-backed pin-drop or POI selector | `data-widget-variant="wide"` to hold a meaningful map area |
| 14 | Signature Capture | Touch canvas with smooth bezier ink | Render the submitted signature as a framed "stamp" in the success banner |
| 25 | Audio Player | Voice content with waveform + speed toggle | Pre-rendered waveform animates as the played portion fills in accent |
| 26 | Voice Recording | Press-and-hold capture, 10–120s | Live waveform + pulsing red dot during capture |
| 27 | Embedded Webview | Iframe escape-hatch for complex UIs | Compact preview → expanded iframe; minimal chrome |
| 30 | Incentive / Leaderboard | Personal ring OR top-5 list | Progress ring target-hit animation on §16 springy curve (builds on #29's ring vocabulary) |

---

## Build cadence reminders

- **Pass 1** must pass the §0.1 grep (`grep -E '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/<file>.module.scss`) before moving to Pass 2.
- **Pass 2** (`/frontend-design`) elevates one signature moment per widget — it does **not** override §1 shell, §3 width, §13 color, or §12 type hierarchy.
- Every widget registers in **five** places (§17). Missing any one leaves the widget invisible to some surface (chat / Studio palette / text trigger).
- Before committing: run the verification command at the bottom of `widget-conventions.md` — zero matches outside the legitimate-exceptions list.
