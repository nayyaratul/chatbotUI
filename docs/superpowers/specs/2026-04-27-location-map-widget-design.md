# Location Map Widget — Design Spec

**Status:** Approved in brainstorming · ready for implementation.
**Widget number:** #13 in `AI_Labs_Widget_Specification - Rich Chat Widgets.csv` ("Location Picker / Map Widget").
**Priority / phase:** P2, Phase 2.
**Family rule book:** `docs/widget-conventions.md` (everything below conforms; the doc wins in any conflict).

---

## Purpose

Interactive map and location selector. Compact card sits in the chat stream with a mini-map preview (variant-specific markers, status, or route). Tap the CTA and the iframe-style portal sheet lifts up to host a real map (Leaflet + OpenStreetMap raster tiles), where the user pins a location, picks a nearby job, checks in to a geofenced area, or hands off to native Maps for directions. Completion semantics differ per variant — see Variants.

The widget commits a `widget_response` on completion so the bot can continue the conversation. `directions` is silent-only (engine records the deep-link tap; chat is unaffected).

## Variants

Five palette entries collapse to four behaviours. Each ships with its own preset for icon, eyebrow, completion semantic, and footer treatment. Variant choice changes behaviour and body component, not shell — the §1 card and the portaled sheet pattern are identical across all four.

| Variant id | Palette label | Lucide icon | Eyebrow | Sheet body | Completion strategy |
|---|---|---|---|---|---|
| `pin_drop` | Pin · confirm | `MapPin` | `Location · <category>` | `PinDropBody` (pre-filled) | User taps "Confirm location" once a pin + address is set |
| `pin_drop_cold` | Pin · cold | `MapPin` | `Location · <category>` | `PinDropBody` (no initial location) | User taps "Use this location" once a pin is set |
| `nearby_jobs` | Nearby jobs | `Compass` | `Nearby · <count> jobs within <radius>` | `NearbyJobsBody` | User selects a pin/row and taps "Apply for this job" |
| `geofence` | Geofence | `ShieldCheck` (inside) / `ShieldAlert` (outside) | `Check-in · <zone>` | `GeofenceBody` | User taps "Check in here" while inside zone with GPS accuracy ≤ gate |
| `directions` | Directions | `Navigation` | `Directions · on the way` | `DirectionsBody` | Silent — Open in Maps fires deep link, emits silent `widget_response`, no `completed` lock |

`pin_drop` and `pin_drop_cold` share the same React component and `widget_response` shape (`variant: 'pin_drop'` in both cases). The split exists for the Studio palette and mock-bot text triggers, where confirm-flow vs. cold-pick is a meaningful demo distinction. Production callers send `pin_drop` and rely on the presence/absence of `initial_location` in the payload.

Default mock-bot text trigger (`show map`) = `pin_drop`.

## Payload schema

### Common fields (all variants)

```js
{
  widget_id: 'lmap_xxx',                         // makeId('lmap')
  variant: 'pin_drop' | 'nearby_jobs' | 'geofence' | 'directions',
  title: string,                                 // compact card §2 title
  description: string | null,                    // compact card §2 description
  category: string | null,                       // eyebrow tail (e.g. 'Home address', 'Warehouse 4', 'On the way')
  center_lat: number,                            // initial map center
  center_lng: number,
  initial_zoom: number,                          // 1–18, default 15
}
```

### `pin_drop`

```js
{
  initial_location: {                            // null = cold-pick; non-null = confirm flow
    lat: number,
    lng: number,
    address: string,                             // formatted address
    address_components: {                        // structured breakdown for forms downstream
      street: string,
      locality: string,
      city: string,
      postal: string,
      state: string,
      country: string,
    },
    accuracy_m: number | null,
  } | null,
  search_fixtures: [                             // sandbox-only; geocoder reads this when present
    {
      lat: number,
      lng: number,
      address: string,
      address_components: { ... },
      score: number,                             // 0..1, used for ranking matches
    },
    ...
  ],
  enable_gps: boolean,                           // default true; false hides the Locate FAB
}
```

### `nearby_jobs`

```js
{
  jobs: [
    {
      id: string,
      label: string,                             // primary row text (e.g. 'Riders Op · Indiranagar')
      sublabel: string | null,                   // secondary row text (e.g. 'Mon–Sat · ₹680/shift')
      lat: number,
      lng: number,
      distance_m_hint: number | null,            // fallback when GPS denied; live distance otherwise
    },
    ...
  ],
  filters: [                                     // optional pill row above map; default: [{ id: 'all', label: 'All' }]
    {
      id: string,
      label: string,
      predicate_id: string,                      // sandbox: matches a hardcoded predicate; prod: a function id resolved server-side
    },
    ...
  ],
}
```

### `geofence`

```js
{
  geofence: {
    id: string,
    label: string,                               // human-readable zone name
    polygon: [[lat, lng], [lat, lng], ...],      // closed ring; first ≠ last is fine, math closes it
  },
  accuracy_gate_m: number,                       // default 50; CTA disabled when GPS accuracy > this
  watch_position: boolean,                       // default true; uses watchPosition vs single-shot
}
```

### `directions`

```js
{
  origin: { lat: number, lng: number, label: string },
  destination: { lat: number, lng: number, label: string },
  polyline: [[lat, lng], ...],                   // fixture polyline (sandbox); routing-API output (prod)
  distance_m: number,
  duration_s: number,
  steps: [                                       // optional; omit to hide step list
    { instruction: string, distance_m: number, turn_type: 'straight' | 'left' | 'right' | 'arrive' },
    ...
  ],
  deep_link_template: string | null,             // override the default native-Maps URL builder; null = default
}
```

## `widget_response` shapes

```js
// pin_drop (and pin_drop_cold)
{
  type: 'widget_response',
  payload: {
    widget_id,
    source_type: 'location_map',
    variant: 'pin_drop',
    completed: true,
    completion_method: 'pin_set',
    data: {
      lat: number,
      lng: number,
      address: string,
      address_components: { ... },
      accuracy_m: number | null,
      source: 'gps' | 'tap' | 'drag' | 'search',  // how the final pin landed
      timestamp: ISO8601 string,
    },
    total_open_time_seconds: number,
  },
}

// nearby_jobs
{
  type: 'widget_response',
  payload: {
    widget_id,
    source_type: 'location_map',
    variant: 'nearby_jobs',
    completed: true,
    completion_method: 'job_selected',
    data: {
      job_id: string,
      job_label: string,
      distance_m: number,
      user_lat: number | null,                    // null when GPS denied
      user_lng: number | null,
      timestamp: ISO8601 string,
    },
    total_open_time_seconds: number,
  },
}

// geofence
{
  type: 'widget_response',
  payload: {
    widget_id,
    source_type: 'location_map',
    variant: 'geofence',
    completed: true,
    completion_method: 'check_in',
    data: {
      geofence_id: string,
      geofence_label: string,
      inside_geofence: true,                      // always true at completion (gated by CTA)
      lat: number,
      lng: number,
      accuracy_m: number,
      timestamp: ISO8601 string,
    },
    total_open_time_seconds: number,
  },
}

// directions — silent; engine records, chat unaffected
{
  type: 'widget_response',
  payload: {
    widget_id,
    source_type: 'location_map',
    variant: 'directions',
    completed: false,                             // not a completion; informational
    completion_method: 'opened_in_native_maps',
    data: {
      origin_lat: number, origin_lng: number, origin_label: string,
      destination_lat: number, destination_lng: number, destination_label: string,
      distance_m: number,
      duration_s: number,
      deep_link: string,                          // the actual URL opened
      timestamp: ISO8601 string,
    },
    total_open_time_seconds: number,
  },
}
```

## Module map

```
src/widgets/
├── LocationMap.jsx                              # public entry — compact card + portaled sheet root
├── locationMap.module.scss                      # compact-card styles (shell + variant body regions)
└── locationMap/
    ├── LocationMapSheet.jsx                     # shared shell: scrim, FLIP lift, header bar, close, footer slot
    ├── locationMapSheet.module.scss
    ├── MapSurface.jsx                           # provider seam — wraps Leaflet today
    ├── mapSurface.module.scss                   # restyles Leaflet's chrome (zoom, attribution) to Nexus tokens
    ├── useGeolocation.js                        # hook: prompt | granted | denied | unsupported
    ├── geocoder.js                              # interface: geocode(q), reverseGeocode(lat,lng); fixture-backed in sandbox
    ├── geofenceMath.js                          # point-in-polygon helper
    └── bodies/
        ├── PinDropBody.jsx + .module.scss       # search + tap + drag + GPS, single pin
        ├── NearbyJobsBody.jsx + .module.scss    # multi-pin, distance labels, list panel
        ├── GeofenceBody.jsx + .module.scss      # polygon overlay + inside/outside status
        └── DirectionsBody.jsx + .module.scss    # start/end pins + fixture polyline + native-Maps deep link
```

`LocationMap.jsx` is the only widget today with a sibling folder. The folder is justified by the breadth of internals (4 variant bodies + 3 infrastructure modules + a shared sheet); colocating in `src/widgets/` would mean 11 sibling files for one widget.

`LocationMapSheet`, `MapSurface`, the four body components, and Leaflet itself are all imported via `React.lazy` inside `LocationMap.jsx`. The compact-card render path stays Leaflet-free; the bundle cost is paid only when someone taps the CTA.

`MapSurface`, `useGeolocation`, and `geocoder` are the **provider seam**. Sandbox uses Leaflet + fixtures; an ess-pwa lift swaps `MapSurface` to a Mapbox wrapper and `geocoder.js` to a real-API adapter without touching the four bodies.

## Layout — compact card

Family §1 card shell. §2 header with variant icon badge + eyebrow + title + description. Below the header: a variant-specific body region. At the bottom: §5 primary CTA (full width, brand-60 default; success-tone on `geofence` when inside zone).

```
┌──────────────────────────────────────────────────────────┐
│  [icon]  LOCATION · HOME ADDRESS                         │
│          Confirm your address                            │
│          Tap to open the map and adjust if needed.       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │ mini-map preview
│  │              <stylized map render>                 │  │ (16:9, 16:7 for nearby_jobs)
│  │                       📍                           │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [variant-specific row] (address chip / job list /       │
│   status caption / origin→destination)                   │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Confirm location                          →       │  │ §5 primary CTA
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Variant-specific body region:**

- **`pin_drop`** — mini-map preview (16:9) with single brand-60 pin centred, accuracy ring overlay. Below: address chip (only if `initial_location` is set; cold-pick hides it). CTA: `Confirm location` (pre-filled) or `Open map` (cold).
- **`nearby_jobs`** — mini-map preview (16:7) with the user-dot + 3 closest job lollipops + small distance badges. Below: 3-row list of closest jobs (label · sublabel · distance). Rows are not tappable on the compact card — tap flows through to the CTA. CTA: `Open map`.
- **`geofence`** — mini-map preview (16:9) with the polygon outline (dashed) + user-dot. Top-left of the preview: status chip ("✓ Inside zone" success-tone, or "X away" warning-tone, where X is live distance to nearest edge). CTA: `Check in here` (success-tone primary) when inside-and-ready; `Open map` (neutral secondary) when outside, with a caption "Move closer to the zone to enable check-in". When inside but GPS accuracy exceeds `accuracy_gate_m`, CTA stays disabled with caption "Waiting for GPS lock…".
- **`directions`** — mini-map preview (16:9) with start pin (white circle, brand-60 ring) + end pin (brand-60 lollipop) + route polyline (brand-60 with white inner stroke). No body row below the preview (description handles ETA/distance). CTA: `Open in Maps` with `ArrowUpRight` icon (signals "leaves chat").

**Constant-height contract (§4):** all four variants share `min-height: 24rem`. Tallest state is `nearby_jobs` (preview + 3-row list + CTA); the others fit naturally inside the same floor.

**Width contract (§3):** `width: 100%`, slot caps at 32rem. No `data-widget-variant="wide"` — the compact card sits in the standard slot; the sheet is the wide surface, hosted in `#chat-modal-root` independent of the slot.

## Layout — portal sheet

Same chat-frame containment pattern as `JobDetailsModal` / `SignatureSheet` / `EmbeddedWebviewSheet`: portaled into `#chat-modal-root`, three-phase animation, scrim + close-button focus.

```
┌── chat-frame ───────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░ scrim ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │ sheet (slides up
│  │ [icon] Confirm your address                  [✕] │  │  from bottom)
│  ├───────────────────────────────────────────────────┤  │ thin grey-10 rule
│  │ [variant-specific top-row: search / filters /    │  │ optional second row
│  │  status banner; absent on directions]            │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │              <Leaflet map, edge-to-edge>          │  │ MapSurface
│  │                       📍                          │  │
│  │                                                   │  │
│  │                                       ┌─────┐     │  │ FAB (Locate)
│  │                                       │  ⊕  │     │  │ bottom-right
│  │                                       └─────┘     │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ [variant-specific footer body: address row /     │  │
│  │  job list peek / coords + timestamp / steps]     │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ ┌───────────────────────────────────────────────┐ │  │
│  │ │  Confirm location                          → │ │  │ §5 primary CTA
│  │ └───────────────────────────────────────────────┘ │  │ (variant-tinted)
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Sheet height:** `min(36rem, 90% of chat-frame)`, same floor as `JobDetailsModal` and `EmbeddedWebviewSheet`.

**Header bar:** variant icon (28×28 mini-badge) + variant-specific title (variable; ellipsis on overflow). Optional second-row caption (status, distance, ETA) when needed. Close button (`X`, 30×30 hit target) on the right. On `geofence` the entire header row is tone-coloured (success when inside, yellow when outside).

**Map region:** flex-grows to fill remaining space. `MapSurface` mounts here. Leaflet's default zoom and attribution controls are present but restyled (see Tokens).

**Use my location FAB:** floating circular 40×40 button, bottom-right of the map region (`space-100` insets from edge). Lucide `Locate` (idle) / `LocateFixed` (after first fix) / `LocateOff` (denied). Hidden on `directions` (origin/destination come from the payload — no GPS need). On `pin_drop` and `nearby_jobs`, single-shot. On `geofence`, watches position so inside/outside flips live.

**Footer:** variant-specific body + primary CTA. Always sticks to the bottom; the map shrinks to accommodate. Body content per variant:

- **`pin_drop`** — address chip (formatted address from current pin) + caption ("Accurate to ~12m · drag pin to fine-tune"). Search bar lives in the header second-row, not the footer, so it's reachable while panning.
- **`nearby_jobs`** — peeking bottom-sheet: collapsed shows 1 row + a swipe handle (`▔▔▔`); expanded shows the full scrollable list. Pin tap snaps the panel to the corresponding row; row tap snaps the map to the pin (single-selection model). CTA reflects the currently-selected row.
- **`geofence`** — coords row (lat/lng with monospace digits) + timestamp. CTA tone shifts with state (success when inside-and-ready, disabled with caption when outside or accuracy-poor).
- **`directions`** — step list eyebrow ("Step-by-step") + step rows (`1. Head north on Lavelle Rd · 200m`, ...) up to ~5 visible with scroll for the rest. Read-only — no row taps.

**Sheet sub-states (handled by `MapSurface` and the bodies):**

- `loading` — Leaflet mounted but tiles not yet rendered. `Loader2` spinner centred over a tinted backdrop sampled from the FLIP source frame (so the lift handoff doesn't flash white).
- `live` — first tile load fired; spinner fades out (200ms state-curve); tiles fade in.
- `tile_error` — tiles failed (network / blocked / 5xx). `WifiOff` glyph, "Couldn't load map tiles" copy, "Try again" secondary button (re-mounts the tile layer). `geofence` still works (point-in-polygon math doesn't need tiles).
- `gps_denied` (variants that depend on GPS) — `MapPinOff` glyph, variant-appropriate copy. On `geofence` the CTA stays disabled and the header band switches to `--color-text-error` tone.
- `closing` — three-phase exit (mirror open).

## State machine — widget-level

```
┌─────────┐   tap CTA    ┌─────────────┐   complete event    ┌─────────────┐
│  idle   │ ───────────► │ sheet_open  │ ──────────────────► │  completed  │
└─────────┘              └─────────────┘                     └─────────────┘
                              │   ▲
                              │   │ reopen (all variants except completed —
                              ▼   │  completed locks the sheet, mirrors
                         ┌─────────────┐  EmbeddedWebview)
                         │   dismissed │
                         └─────────────┘
```

- `idle` — compact card, CTA enabled with the variant's open-copy.
- `sheet_open` — sheet visible. Compact card sits under scrim, dimmed but mounted (FLIP origin).
- `dismissed` — sheet closed without completion. CTA copy swaps to `Reopen map`. For `nearby_jobs`, the last-selected job is preserved on the card as a small highlight ("Last viewed: Riders Op · Indiranagar"). For `pin_drop` cold-pick, the pin position is preserved if one was set. For `geofence`, the live GPS watcher detaches.
- `completed` — §10 success banner replaces the CTA region; the variant icon swaps to its filled / `Check`-overlaid form; sheet can no longer be reopened (proof state). **`directions` never enters `completed`** — Open-in-Maps emits a silent response and the widget stays in `idle` / `dismissed` indefinitely. The state diagram's `complete event` arrow does not fire for `directions`.

## State machine — sheet-internal sub-states

| Variant | States | CTA enables when | Closes silently if |
|---|---|---|---|
| `pin_drop` | `loading_tiles` → `awaiting_pin` (cold) / `pin_set` (pre-filled) → `pin_set_resolving` (debounced reverse-geocode in flight) | a pin exists with a resolved address | user closes without confirming → `dismissed`, compact-card CTA swaps to `Reopen map` |
| `nearby_jobs` | `loading_tiles` → `loaded` → `selected` (pin or row tap) | a job is selected | user closes without selecting → `dismissed` (browse-only is a valid outcome) |
| `geofence` | `loading_tiles + loading_gps` (parallel) → `outside_zone` / `inside_zone_inaccurate` / `inside_zone_ready` | inside polygon AND GPS accuracy ≤ `accuracy_gate_m` | user closes without checking in → `dismissed`; reopen and re-attempt |
| `directions` | `loading_tiles` → `loaded` (route + steps shown) | always — CTA is a deep link, no completion gating | always — `directions` is informational; Open-in-Maps emits a `silent` `widget_response` |

## Shared GPS permission lifecycle

`useGeolocation()` hook owns:

```
unsupported ◄── (navigator.geolocation absent: hide GPS-related UI)
   │
prompt → granted → tracking (single-shot for pin_drop / nearby_jobs;
   │            ↓                        watched for geofence)
   └─► denied → caption "GPS unavailable"; map-based pinning still works.
                For geofence: hard failure — error state with
                "Re-enable location to check in" copy.
```

Hook returns `{permission, position, accuracy, error, request, watch}`. Bodies decide how to react. `request()` triggers single-shot; `watch()` returns a cleanup function. Cleanup runs on sheet close to avoid leaving watchers attached when the user moves on.

**`geofence` hysteresis:** the inside/outside state only flips after 3 consecutive samples agree (≈3s with default `watchPosition`). Avoids the CTA flickering between enabled/disabled when the user's GPS jitters at the zone boundary.

## Signature moment — continuous lift

Same FLIP pattern EmbeddedWebview ships. Compact card's mini-map preview is the source rect; sheet's map region is the target.

**Phase 1 — measure (0ms).** Read `getBoundingClientRect()` of the compact card's `.miniMap` and the (hidden) sheet's `.mapRegion`. Stash both.

**Phase 2 — clone & lift (0–520ms).** Render a portaled clone of the mini-map (variant-specific markers preserved — pin / job pins / polygon outline / route) absolutely positioned at the source rect. Animate to the target rect with `transform: translate(...) scale(...)` on the §16 rise-up curve `cubic-bezier(0.18, 0.9, 0.28, 1.04)` over 520ms. Simultaneously:

- Sheet scrim fades in (180ms, state-curve).
- Sheet body slides up from `translateY(100%)` → `0` over 360ms (state-curve), but its map region stays at `opacity: 0` so the lifting clone owns the visual.
- Compact card's actual mini-map fades to `opacity: 0.4`.

**Phase 3 — handoff (520ms).** Clone removed. Sheet's map region snaps to `opacity: 1`. Leaflet enters its own `loading_tiles → live` cycle. The clone's last-frame average colour is sampled into `--lift-tint` and used as the map region's background, so the loader spinner sits on a coloured backdrop instead of flashing white.

**Reverse on dismiss.** Same FLIP, target = source. Map region fades to `opacity: 0` first (120ms, state-curve); a fresh mini-map clone lifts back down to the card's mini-map slot over 440ms; scrim fades out alongside.

**Fallback when FLIP can't run.** If the compact card has scrolled out of view at tap-time, the source rect is off-screen; the clone animates from below the viewport so it still reads as "rising into the sheet" rather than failing silently.

## Other motion

- Compact card mount: §11 `riseUp` (560ms ladder, 60ms stagger up to the 8th child).
- Mini-map markers (pins, polygon outline, polyline) on first paint: §16 springy curve, 240ms, after the map background has faded in.
- `nearby_jobs` peeking-sheet expand/collapse: state-curve, 220ms.
- `geofence` status banner tone shift (outside → inside): state-curve cross-fade on the header background and CTA, 200ms.
- `geofence` "inside zone" chip morph on first transition: §16 springy, 240ms.
- Distance-label chips on `nearby_jobs` pins: state-curve fade-in 160ms, 60ms staggered per pin (capped at the 8th).
- `directions` step list: §11 stagger entry on sheet open.
- Route polyline draw on `directions` sheet open: stroke-dashoffset animation on the rise-up curve, 520ms (same duration as the FLIP lift; the line "draws" alongside the lift).
- Loader2 spinner: rotation on state-curve 800ms-per-revolution; fades out over 200ms when first tile fires.
- Pin drop on `pin_drop` tap: §16 springy, 280ms (the pin "drops in" with a small overshoot).
- Pin drag on `pin_drop`: no animation while dragging (Leaflet handles it imperatively); reverse-geocode debounced 500ms, address chip cross-fades on update.

No fourth curve. No `transition: all`.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` neutralises:

- The FLIP lift — clone is skipped entirely. Sheet just opens (scrim fades, content snaps to its final layout).
- Pin drop bounce, status-chip morph, peeking-sheet expand spring — replaced with instant value swaps.
- `riseUp` stagger removed; rows appear at their final position immediately.
- Polyline draw — full polyline appears immediately on `directions` sheet open.

Tile load, GPS handling, focus management, geofence point-in-polygon math, and reverse-geocode debounce are unaffected — those are functional, not decorative.

## Edge cases

| Edge | Variant(s) | Behaviour |
|---|---|---|
| GPS denied | `pin_drop`, `nearby_jobs` | FAB swaps to `LocateOff`. Caption "Location off — pin manually". Map-based pinning still works. |
| GPS denied | `geofence` | Hard-fail state. Sheet shows `MapPinOff` glyph + "Re-enable location to check in" + "Try again" secondary. CTA stays disabled. |
| GPS unsupported (`navigator.geolocation` absent) | all GPS variants | FAB hidden entirely (same code path as `enable_gps: false`). |
| HTTPS required for geolocation | all GPS variants | Detected via `window.isSecureContext`. If false: FAB hidden, caption "Location requires a secure connection". |
| Tile fetch fails (offline / blocked / 5xx) | all | `MapSurface` enters `tile_error`. `WifiOff` + "Try again" secondary. `geofence` still functional via geo-math. |
| User drags pin into ocean / no fixture nearby | `pin_drop` | Reverse-geocode returns null → caption "Address unavailable for this point" under the search bar. CTA stays enabled — lat/lng are still valid. |
| Position jitters across geofence boundary | `geofence` | Hysteresis: 3 consecutive concordant samples required to flip state. CTA enable/disable doesn't flicker. |
| Malformed geofence polygon (<3 vertices, self-intersecting, empty) | `geofence` | Caught at sheet mount. Sheet shows "Invalid zone" error + console warn. No completion possible. |
| Multiple `LocationMap` widgets in one chat | all | Each instance owns its own `useGeolocation()` and Leaflet map. `watchPosition` cleans up on sheet close to avoid concurrent watchers draining battery. |
| Sheet closed before tiles load | all | Pending Leaflet tile requests aborted on unmount; loader spinner cancelled. |
| `nearby_jobs` empty array | `nearby_jobs` | Sheet shows "No jobs near you right now" empty state + `MapPinOff`. CTA hidden. |
| `nearby_jobs` no GPS | `nearby_jobs` | Distance column hidden; pins render based on payload `lat/lng`. CTA copy unchanged. |
| Long search query / 0 matches | `pin_drop` | Search dropdown shows "No matches in saved locations" caption (sandbox); production geocoder returns "No results" with same UI. |
| `directions` deep link unsupported by OS | `directions` | Fallback to `https://www.google.com/maps/dir/?...` (universal web URL). Both built from same payload. |
| Reduced motion | all | FLIP skipped; springs replaced with state-curve fades; row stagger removed. Tile load + GPS + completion logic unaffected. |
| Touch hit-target on FAB | all | 40×40 (`size-40`) minimum. CTA inherits Nexus Button atom (44px) — already compliant. |
| Reopening `dismissed` sheet | `pin_drop_cold`, `nearby_jobs`, `geofence` | Allowed. Compact-card cache restores last-known pin / last-selected job; GPS watcher re-attaches on `geofence`. |
| `pin_drop` `initial_location.address_components` missing | `pin_drop` | Render the formatted `address` only; downstream consumers expecting structured components see `null`. |
| `directions.steps` empty / omitted | `directions` | Step list section hidden entirely; sheet footer collapses to just the CTA + ETA caption. |
| Empty `category` in payload | all | Eyebrow drops the separator dot — renders as `Location` (not `Location · `). |

## Width contract (§3)

Compact card is `width: 100%` per §3; slot caps it at 32rem. **No** `data-widget-variant="wide"` — the compact card sits in the standard slot; the sheet is the wide surface and lives inside `#chat-modal-root` (independent of the slot).

## Constant-height contract (§4)

Compact card floor: `min-height: 24rem`. Tallest state across variants is `nearby_jobs` (mini-map + 3-row list + CTA). The other three variants fit inside the same floor. State transitions don't jump the card: `idle`, `dismissed`, and `completed` all keep the same shape (only the CTA region swaps to a §10 success banner on `completed`, similar height).

## Security & sandbox posture

- **HTTPS-only.** `navigator.geolocation` requires a secure context. The widget detects via `window.isSecureContext` and degrades; ess-pwa hosts on HTTPS in production.
- **OSM tile policy** (sandbox-only). `tile.openstreetmap.org` is free for development and personal use but explicitly not for production traffic. **Production migration requirement:** ess-pwa swaps `MapSurface`'s tile URL to a keyed provider (Stadia / MapTiler / Mapbox) before shipping. The seam is one line in `MapSurface.jsx`.
- **Attribution.** OSM's terms mandate visible attribution (`© OpenStreetMap contributors` linkable to `https://www.openstreetmap.org/copyright`). Leaflet's default control handles this; `mapSurface.module.scss` restyles it but never removes.
- **No user position leaves the client.** GPS coordinates stay in the React tree until submission. No background telemetry, no third-party hits.
- **Reverse-geocoding never hits Nominatim from the sandbox.** Fixture-driven only via `geocoder.js`. Production routes through the same interface to a keyed provider.
- **CSP.** Host app needs `connect-src` to allow tile-server hostnames and `img-src` to allow tile images. Leaflet ships as plain JS — no `script-src` updates beyond the bundle. **Deployment integration concern for ess-pwa, not a runtime concern for this widget.**
- **Deep links** (`directions` "Open in Maps") use only `maps:` and `https://maps.google.com/...` schemes with payload-supplied lat/lng. No user-input routes through them.

## Tokens (sanity check)

- **Spacing:** `space-200` (card padding), `space-150` (card section gap, sheet section gap), `space-125` (header badge↔text, list-row gap), `space-100` (FAB inset, search-bar internal gap, chip↔caption), `space-075` (CTA icon↔label), `space-050` (chip glyph↔text, distance-label arrow gap).
- **Sizing:** `size-36` (compact-card header badge), `size-32` (Leaflet zoom button, sheet header mini-badge), `size-40` (FAB), `size-30` (sheet close button).
- **Type:** title `font-size-400` semibold `grey-90`; description `font-size-200` regular `grey-60`; eyebrow `font-size-100` semibold uppercase `letter-spacing-wide` `grey-50` (overrides to tone-color on `geofence`); list-row label `font-size-200` medium `grey-90`; sublabel / distance / step instructions `font-size-100` regular `grey-50`; distance-label-on-pin `font-size-100` semibold `white` (on brand-60 chip background).
- **Color:** `brand-60` accent (pins, polyline, FAB icon, primary CTA, accuracy ring); neutral ladder per §13; `--color-text-success` for `geofence` inside; `--color-text-error` for GPS-denied + tile-error; `--yellow-60` for `geofence` outside-but-near (warning band).
- **Radius:** `radius-200` (card), `radius-150` (sheet header badge, FAB nested icon background, Leaflet zoom control); `radius-100` (search bar, list-row); `radius-500` (status chips, distance-label chips); `radius-full` (you-dot, FAB).
- **Borders:** `border-width-100` (card, list-row, search bar, chips, Leaflet zoom control); polygon stroke `border-width-200` (slightly heavier so it reads on tile palettes).
- **Shadows:** `shadow-100` on hover (card; FAB); pins use a custom `0 var(--size-04) var(--size-08)` drop-shadow approximation tokenized via `var(--size-*)`.
- **Motion:** state-curve (fades, scrim, hover, focus, status banner); rise-up (FLIP lift, sheet enter, list stagger, polyline draw); springy (pin drop bounce, capsule pop, status chip morph). No fourth curve.
- **Icons:** `MapPin` (pin_drop badge), `Compass` (nearby_jobs badge), `ShieldCheck` / `ShieldAlert` (geofence badge inside / outside), `Navigation` (directions badge), `Locate` / `LocateFixed` / `LocateOff` (FAB states), `X` (close), `Loader2` (loading), `WifiOff` (tile error), `MapPinOff` (GPS denied / empty list), `Check` (inside zone, completion glyph), `AlertTriangle` (outside zone), `ArrowRight` / `ArrowUpRight` (CTA chevrons).
- **Studio palette icon:** `Map`.

## Registration (§17 — five touchpoints)

1. **Widget files** — `src/widgets/LocationMap.jsx` + `locationMap.module.scss` for the compact card. Sheet shell, `MapSurface`, hooks, geocoder, and the four variant bodies live in `src/widgets/locationMap/` (only widget today with a sibling folder; justified by 11 constituent files). Co-located bodies use the same naming convention as the family — PascalCase JSX, camelCase SCSS.
2. **Registry** — `src/chat/registry.js`, key `location_map` → component import.
3. **Schema** — `src/engine/widgetSchemas.js`, key `location_map`. Category: `input`. Five variants in the palette: `pin_drop` (default), `pin_drop_cold`, `nearby_jobs`, `geofence`, `directions`. Each `payload()` factory mints `makeId('lmap')` and supplies a Bengaluru-anchored fixture (`pin_drop` confirms 14 Lavelle Road; `nearby_jobs` lists 12 jobs across the city; `geofence` defines a polygon around a fictional "Warehouse 4" near Whitefield; `directions` traces Indiranagar → Whitefield with 8 steps and a ~30-point fixture polyline).
4. **Mock trigger** — `src/engine/mockBot.js`. Five regex rules:
   - `/^(show )?(map|location)$/i` → `pin_drop`
   - `/^(show )?(map|location)\s+(cold|empty)$/i` → `pin_drop_cold`
   - `/^(show )?(map|location)\s+nearby$/i` → `nearby_jobs`
   - `/^(show )?(map|location)\s+(geofence|fence|check[- ]?in)$/i` → `geofence`
   - `/^(show )?(map|location)\s+(directions|route)$/i` → `directions`
   All build via `getVariantPayload('location_map', '<variant_id>')` — no inline payloads.
5. **Studio palette icon** — `src/studio/WidgetPalette.jsx` `WIDGET_ICONS` map: `location_map: Map` (one Lucide glyph for the whole widget; variant differentiation lives inside the widget).

**npm dependency:** `leaflet@^1.9.4` (no `react-leaflet` — direct API is fine and ~30KB lighter). Leaflet's CSS imported into `MapSurface.jsx` via side-effect import (`import 'leaflet/dist/leaflet.css'`); tree-shaken into the widget's lazy chunk so initial bundle stays clean.

**Default markers.** Leaflet's bundled marker PNGs use a relative-path import that Vite breaks. Workaround: use `L.divIcon` with HTML/SCSS-defined markers — gives full Nexus token control over pin appearance and avoids the asset-path patch entirely.

**Verification command** (post-implementation, runs on every commit per §0.1 / §18):

```bash
grep -rnE "#[0-9a-fA-F]{3,6}|[^a-zA-Z0-9_-][0-9]+(\.[0-9]+)?px" \
  src/widgets/locationMap/ src/widgets/locationMap.module.scss \
  | grep -vE "cubic-bezier|^[^:]*:[0-9]+:[[:space:]]*/|@media|9999px"
```

## Out of scope

- **Realtime tracking.** No periodic uploads, no live driver-on-the-move display. `geofence` watches position locally to flip inside/outside; nothing transmits.
- **User-drawn polygons.** No "draw a fence" UX. `geofence` consumes a polygon from the payload.
- **Custom map themes.** Leaflet's default OSM raster only. No satellite, no dark mode toggle, no terrain.
- **Offline tile caching.** Relies on browser HTTP cache only. No service-worker tile precaching.
- **Marker clustering.** `nearby_jobs` fixture caps at 12 pins. >50 pins would need clustering (`leaflet.markercluster`); that's a future design.
- **Indoor maps / 3D / streetview.** Single 2D raster surface only.
- **Multi-stop directions.** `directions` is single origin → single destination. Multi-leg is a future variant.
- **Live geocoder autocomplete.** Sandbox uses substring matches against fixtures; production wires a real provider behind the same `geocoder.geocode()` interface.
- **Provider-specific routing API integration.** `directions` consumes a fixture polyline in sandbox; the real-API integration (OSRM / Mapbox Directions / Google Directions) lives downstream of `MapSurface` in ess-pwa, not here.
- **Address autocomplete with structured form integration.** The `pin_drop` widget returns `address_components`; the consuming Form widget handles its own field population. Out of scope here.
- **Multi-pin selection on `nearby_jobs`.** Single-select only. Multi-select would change the `widget_response` shape and the bottom-panel UX.
- **i18n / RTL.** Family is LTR-only today; this widget inherits that constraint.
- **Inline-grow display mode** (no sheet). Considered and rejected — a 24rem-tall map is too small for real picking, and Leaflet's interactions fight the chat scroll. Sheet is the only display mode.
