# Video Player Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #16 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv`.
**Priority / phase:** P1, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (everything below conforms; the doc wins in any conflict).

---

## Purpose

Inline video player that lands in the chat stream. Plays a training / task-demo / onboarding clip with standard controls (play/pause, scrubber, time, speed, fullscreen). Tracks completion percentage. A separate variant **enforces** full viewing — scrubber cannot be dragged past the furthest watched point, and speed is locked to 1×. Enforcement exists for compliance training (annual harassment prevention, regulated industry trainings) where skipping the video is not acceptable.

Commits a `widget_response` the first moment the reviewer completes the video (watched ≥ 99% of duration), so the bot can continue the conversation.

## Variants

Two variants share one shell. Differ only in (a) the scrubber's seek behaviour, (b) whether the speed picker is rendered, and (c) the variant-specific eyebrow copy.

| Variant | Icon (Lucide) | Eyebrow | Scrubber behaviour | Speed picker |
|---|---|---|---|---|
| `standard` | `PlaySquare` | `Video · <category>` (e.g., `Video · Onboarding`) | Free seek | 0.5× / 1× / 1.5× / 2× |
| `enforced` | `PlaySquare` | `Compliance · Must watch in full` | Clamps to `maxWatched` | Locked to 1× (picker hidden) |

Default variant for the mock-bot text trigger = `standard`.

## Payload schema

```js
{
  widget_id: 'vid_xxx',                           // makeId('vid')
  variant: 'standard' | 'enforced',
  video_id: 'vid-xxx',
  url: string,                                    // playable media URL (mp4 / HLS manifest)
  thumbnail_url: string | null,                   // poster-frame URL; falls back to first-frame if null
  title: string,                                  // e.g. 'Harassment prevention — annual'
  subtitle: string,                               // e.g. 'Required viewing · 4 min'
  duration_seconds: number,                       // nominal duration; HTML5 video will confirm on load
  playback_speeds: [number],                      // e.g. [0.5, 1, 1.5, 2]; ignored when variant='enforced'
  silent: boolean,                                // if true, widget_response doesn't post to chat UI
}
```

Result sent on first completion:

```js
{
  type: 'widget_response',
  payload: {
    widget_id,
    source_type: 'video',
    video_id,
    watch_percentage: number,                     // 0–100
    completed: true,
    total_watch_time_seconds: number,
  },
}
```

Completion fires exactly once per widget instance, on the first `timeupdate` where `currentTime >= duration * 0.99`. The reviewer can re-play afterward; subsequent completions do not re-fire.

## Layout

Family §1 card shell. §2 header with §12 eyebrow (same pattern established by the Approval widget) + title + description. Below the header: the 16:9 video region. Below that: controls row. Below that: the progress bar.

```
┌───────────────────────────────────────────────────────────┐
│  [icon]  COMPLIANCE · MUST WATCH IN FULL                  │ §2 header
│          Harassment prevention                             │
│          Required viewing · 4 min                          │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │ 16:9 media region
│  │                                                     │  │ (aspect-ratio: 16/9)
│  │                  ┌───────┐                          │  │
│  │                  │   ▶   │  ← big play button       │  │
│  │                  └───────┘                          │  │
│  │                                  [✓ COMPLETED]      │  │ completion chip
│  │                                                     │  │ (top-right when ≥99%)
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  [▶]  00:23 / 04:00                     [1×]    [⛶]      │ controls row
│                                                           │
│  ━━━━━━━━━▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒       │ progress bar
│                                                           │ (hatched ahead in enforced)
└───────────────────────────────────────────────────────────┘
```

### Card shell

Family default (§1): symmetric `space-200` padding, `grey-10` border, hover-only shadow, `width: 100%`, slot caps at 32rem. Floor: `min-height: 24rem` (§4 mid-density class).

### Header (§2 exact)

- Icon badge 36×36, `PlaySquare` Lucide glyph, brand-60 tinted per §2.
- Eyebrow `<p>`: `font-size-100` / semibold / uppercase / `letter-spacing-wide` / `grey-50`. Variant-mapped: `Video · <category>` or `Compliance · Must watch in full`.
- Title `<h3>`: `font-size-400` / semibold / `line-height-300` / `letter-spacing-tight` / `grey-90`.
- Description `<p>`: `font-size-200` / regular / `line-height-300` / `grey-60`.

### Media region

Wrapper uses `aspect-ratio: 16 / 9`. Inner elements:

- **Poster layer.** Renders `thumbnail_url` as a `<img>` via `background-image` or a positioned `<img>` with `object-fit: cover`. Hidden once the video starts playing.
- **HTML5 `<video>` element.** `preload="metadata"`. Hidden (opacity 0, pointer-events none) until the first play, then revealed. `playsinline` for mobile Safari.
- **Centered play-button overlay.** Lucide `Play` glyph inside a 56×56 circular button with brand-60 tint + white glyph. Visible when paused (incl. idle). Hides when playing. Click starts playback. Hovering scales the circle from 1.0 to 1.04 on the §16 state curve.
- **Completion chip (top-right).** §7 chip shape, tone = `success`. Content: `✓ COMPLETED`. Animated in on the §16 springy curve when completion fires. Persists through later re-plays.
- **Scrim.** When paused + hovered, a subtle `grey-90` overlay at 24% opacity lifts the play button for legibility. Disappears on playing.

Border on the media region: `var(--border-width-100) solid var(--grey-10)`, `border-radius: var(--radius-150)`. Overflow clipped.

### Controls row

Horizontal flex row, `gap: var(--space-125)`, `align-items: center`.

- **Play/pause button.** Lucide `Play` or `Pause` at `size={16}` + a visible `"Play"` / `"Pause"` text label next to the glyph. Styled like the §7 chip (informational brand-60 tint). The visible verb label honors §18 #6 even though most media-player libraries show icon-only here — the family's rule wins. `aria-label` mirrors the current visible label.
- **Time readout.** `font-variant-numeric: tabular-nums`, `font-size-200`, `grey-80`. Format: `MM:SS / MM:SS`.
- **Spacer.** `flex: 1` pushes the right cluster.
- **Speed picker (standard only).** A small inline-flex group of buttons: `0.5×` `1×` `1.5×` `2×`. Active speed gets `tone-informational` chip treatment. Hidden in `enforced` variant — `enforced` shows a locked `1×` readout instead (non-interactive, `grey-50`).
- **Fullscreen button.** Lucide `Maximize` at `size={16}`. Clicking calls `video.requestFullscreen()`. Both variants have this.

### Progress bar

Below the controls row. Height `var(--size-02)` (2px). Family §6 linear-fill treatment.

Three state layers (composited):

1. **Track (background).** `var(--grey-10)`, full width.
2. **Watched fill.** `background: var(--brand-60)`, `width: (currentTime / duration) * 100%`. Updates on `timeupdate`.
3. **Hatched "must watch" pattern (enforced only).** Covers the region from `maxWatched / duration` to the end. Pattern: `repeating-linear-gradient(135deg, var(--grey-20) 0 var(--border-width-300), transparent var(--border-width-300) var(--size-06))`. Opacity ~`--opacity-064`. Tells the reviewer "this is locked until you watch up to this point."

The `standard` variant skips the hatched pattern — unwatched-ahead shows as plain `grey-10` track. Clicking the bar seeks to that time.

Scrubber interaction:

- **Standard:** full drag + click seek. `video.currentTime = clickPos * duration`.
- **Enforced:** click-to-seek is clamped: `video.currentTime = min(clickPos * duration, maxWatched)`. Dragging beyond `maxWatched` is no-op. No visible "thumb" that drags; the bar reads as a display-plus-rewatch control, not a seek bar.

## States

Four functional states. All states honor §4 constant-height (floor `24rem`; footer anchors via `margin-top: auto` on a region wrapper where needed).

1. **Idle.** Poster visible, play overlay centered, time `00:00 / MM:SS`, progress empty. Card rises in with `apvRiseUp`-equivalent on mount (`vplRiseUp`, §16 rise-up curve, 320ms).
2. **Playing.** Video element reveals (opacity 1, `aria-hidden` false). Poster fades out. Play overlay hides. Time + progress update live. Pause button shows in controls.
3. **Paused.** Same as playing except `video.paused === true`; the play overlay is visible again and the scrim lifts on hover. Time + progress hold at their current values.
4. **Completed (terminal visual signal — not terminal interaction).** The completion chip slides in on the §16 springy curve. The widget emits `widget_response`. The video auto-pauses (or keeps playing to the natural end; I'll have it stop on hit, matching the "you've met the requirement" read). The reviewer can press play to re-watch.

Transitions:
- `idle → playing`: `scrim` fades out (180ms, state curve). `poster` opacity 1 → 0 (180ms). Play overlay scales down + fades (state curve, 180ms). Video reveals.
- `playing → paused`: play overlay fades in. Scrim lifts on hover (not automatic).
- `on first completion`: chip animation + `widget_response` emit (one-shot).

## Interactions

- **Click play overlay** → plays.
- **Click/tap video body** (playing state) → pauses.
- **Click progress bar** → seek. Clamped in `enforced`.
- **Drag progress bar thumb** → seek. Not available in `enforced`.
- **Click speed button** → sets `video.playbackRate`. Hidden in `enforced`.
- **Click fullscreen button** → `video.requestFullscreen()`.

Focus: the play overlay gets focus on mount (mirrors the Approval widget's pattern, scoped to the widget card). Tab cycle: play overlay → play/pause → speed buttons → fullscreen. Accessible labels on every control.

## Motion

Three §16 curves cover everything. No fourth introduced.

| Element | Curve | Duration |
|---|---|---|
| Card entry (`vplRiseUp`) | `cubic-bezier(0.18, 0.9, 0.28, 1.04)` | 320ms |
| Play overlay hover scale | `cubic-bezier(0.2, 0.8, 0.3, 1)` | 180ms |
| Poster fade + scrim transitions | same (state curve) | 180ms |
| Completion chip slide-in | `cubic-bezier(0.18, 0.9, 0.28, 1.4)` | 280ms |
| Speed button active-state transition | state curve | 180ms |

Progress bar width updates have no CSS transition — they're driven by `onTimeUpdate` at ~60fps from the browser's media pipeline. A transition would cause lag between time readout and bar fill.

## Registration (§17 five touchpoints)

1. **Files** — `src/widgets/VideoPlayer.jsx` (PascalCase) + `src/widgets/videoPlayer.module.scss` (camelCase).
2. **`src/chat/registry.js`** — `video: VideoPlayer`. (Spec CSV uses the snake_case type `video`.)
3. **`src/engine/widgetSchemas.js`** — `video:` entry with `label: 'Video Player'`, `category: 'display'` (Display & Information per CSV), and two variants (`standard`, `enforced`) whose payload generators call a `buildVideoPayload(variant)` helper near the other builders.
4. **`src/engine/mockBot.js`** — trigger regex routing to `getVariantPayload('video', 'standard')`. Match words like `video`, `play video`, `show video`, `training video`.
5. **`src/studio/WidgetPalette.jsx`** — `video: PlaySquare` in `WIDGET_ICONS`. Add `PlaySquare` to the Lucide imports.

## Mock video source

For the playground, use a publicly-hosted, CORS-friendly short sample: the Blender Foundation's Big Buck Bunny sample at `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4` (Google-hosted stable URL). If the CORS or network behaviour of that URL becomes a problem, fall back to a bundled asset in `public/` — keep the payload `url` field abstract so the source can swap without a schema change.

Poster frame: a Blender-hosted thumbnail or a generated poster (any stable jpg URL). If none available, use `thumbnail_url: null` and render a deep `grey-20` background with the play overlay centered.

## Anti-pattern guardrails (§18)

- [ ] Shadow hover-only on the card (#1).
- [ ] No `max-width` on the card (#2).
- [ ] Symmetric `space-200` padding (#3).
- [ ] No `border-bottom` on header (#4).
- [ ] Title at `font-size-400` (#5).
- [ ] Every button has a Lucide glyph + verb label (#6). Play/pause gets a visible text label alongside its glyph (explicitly addressed — see Controls row).
- [ ] Zero raw hex / px / rem outside §0.1 exceptions (#7, #13). The `aspect-ratio: 16 / 9` literal is explicitly allowed per §0.1.
- [ ] `brand-60` accent via `--color-action-primary` override (#8).
- [ ] Card `width: 100%`, slot owns cap (#9).
- [ ] Progress bar uses §6 linear-fill — no fourth indicator (#10).
- [ ] Completion chip follows §7 + §10 austerity — no confetti (#11).
- [ ] No stagger beyond 8 children (#12).
- [ ] Lucide only; no mixed icon libs (#14).
- [ ] No `transition: all` — every transition lists properties (#15).
- [ ] Only the three §16 cubic-beziers (#16).
- [ ] Pass 2 follows Pass 1 — don't skip (#17).

Run before each commit:

```bash
grep -nE '(#[0-9a-fA-F]{3,6}|[0-9]+px|[0-9]+rem)' src/widgets/videoPlayer.module.scss
```

Allowed matches: `24rem` (floor), `cubic-bezier(...)` args, and the `aspect-ratio: 16 / 9` literal. Zero others.

## Scope guard

The **enforced-mode hatched progress bar** is the only new visual primitive. It's a refinement of the existing §6 linear-fill vocabulary using a `repeating-linear-gradient` pattern that's already in the family (Shift Calendar's "full shift" status, Checklist's "skipped" segment). Everything else — the card shell, header, controls row, fullscreen affordance, completion chip — reuses existing §1 / §2 / §6 / §7 / §10 / §12 patterns.

Pass 2 (`/frontend-design`) is permitted to elevate: the play-overlay hover moment, the poster→video reveal, the completion chip's entrance. **Not** permitted to introduce a second new primitive (no progress ring inside the video, no play-button halo glow, no gradient overlay on the poster).

## Out of scope (YAGNI)

- **Captions / subtitles track.** The spec CSV doesn't call for it. If needed, add a `tracks: [...]` payload field in a later iteration.
- **Multi-quality switching UI.** The spec CSV mentions "Support HLS/adaptive streaming" on the technical side — the `<video>` element handles quality adaptation natively when fed an HLS manifest, so the widget doesn't need a UI for this. Single `url` field.
- **Watch-time telemetry during playback.** Only the one-shot `widget_response` on first completion ships. A `percent-watched-over-time` event stream can be added later.
- **Playlists / series.** One video per widget. Sequences belong in a separate Carousel-composed layout.
- **Analytics beacons.** No third-party pixel firing. The `widget_response` is the single contract with the bot.
