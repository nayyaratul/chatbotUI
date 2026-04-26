# Location Map Widget — Region Map (Pass 1)

**Sibling to:** `2026-04-27-location-map-widget-design.md`.
**Cadence:** one region = one focused commit, mirroring the EmbeddedWebview series. §0.1 (no-hardcoded-values) and §18 (anti-pattern) audits run on every region — they are not regions of their own.
**Pass 2** is `/frontend-design` elevation, kicked off after Pass 1 region 16 lands.

---

## Pass 1

### Region 1 — Scaffold + Leaflet dep + five-place registration
Add `leaflet@^1.9.4` to `package.json`. Stub `LocationMap.jsx` with a compact-card shell that renders title + description + disabled CTA. Add `locationMap.module.scss` with the §1 card shell only. Register in `src/chat/registry.js`. Add the schema entry in `src/engine/widgetSchemas.js` with five variant stubs (minimal payloads, no fixtures yet). Add the five mock-bot triggers in `src/engine/mockBot.js`. Add `location_map: Map` to `src/studio/WidgetPalette.jsx` `WIDGET_ICONS`. Wire `React.lazy` for `LocationMapSheet` (empty placeholder for now).
**Touches:** `package.json`, `src/widgets/LocationMap.jsx`, `src/widgets/locationMap.module.scss`, `src/chat/registry.js`, `src/engine/widgetSchemas.js`, `src/engine/mockBot.js`, `src/studio/WidgetPalette.jsx`.

### Region 2 — `MapSurface` (Leaflet wrapper, the provider seam)
`MapSurface.jsx` mounts a Leaflet map on a div ref, applies the tile layer (OSM raster), and exposes the prop API: `center`, `zoom`, `markers`, `polygons`, `polyline`, `onMapClick`, `onMarkerDragEnd`, `onMapReady`, `status`. Tile loading + error states with `WifiOff` retry. Attribution and zoom-control restyle to Nexus tokens via `:global()` overrides. `divIcon`-based markers (no PNG asset workaround). Side-effect import of `leaflet/dist/leaflet.css`.
**Touches:** `src/widgets/locationMap/MapSurface.jsx`, `src/widgets/locationMap/mapSurface.module.scss`.

### Region 3 — `useGeolocation` hook
Permission lifecycle: `prompt` / `granted` / `denied` / `unsupported`. `request()` for single-shot, `watch()` returning a cleanup function for `watchPosition`. `window.isSecureContext` gate. Error normalisation. No widget consumes it yet — region 6+ pull it in.
**Touches:** `src/widgets/locationMap/useGeolocation.js`.

### Region 4 — `geocoder.js` + `geofenceMath.js`
`geocoder.geocode(query, fixtures)` and `geocoder.reverseGeocode(lat, lng, fixtures)` — substring match for forward, haversine-nearest for reverse. `geofenceMath.isInsidePolygon([lat, lng], polygon)` via ray-casting; `geofenceMath.distanceToPolygonEdge(...)` for the "X m to edge" caption. Both pure functions, framework-free.
**Touches:** `src/widgets/locationMap/geocoder.js`, `src/widgets/locationMap/geofenceMath.js`.

### Region 5 — `LocationMapSheet` shared shell
Portal mount into `#chat-modal-root`. Three-phase enter (scrim fade + sheet slide + body content fade). Close button + escape-key + scrim-tap dismissal. Header bar (variant icon + title + close, with optional second-row caption slot). Footer slot. Focus trap + initial-focus management. Defines the `<MapSurface>`-wrapping pattern that variant bodies plug into.
**Touches:** `src/widgets/locationMap/LocationMapSheet.jsx`, `src/widgets/locationMap/locationMapSheet.module.scss`.

### Region 6 — `PinDropBody`
Search bar (header second-row), tap-to-pin, drag-pin, Locate FAB. Reverse-geocode debounce 500ms. Address chip + accuracy caption. State machine: `awaiting_pin` (cold) / `pin_set` (pre-filled) / `pin_set_resolving`. Source tracking on the final pin (`gps` / `tap` / `drag` / `search`). CTA copy switches based on `initial_location` presence.
**Touches:** `src/widgets/locationMap/bodies/PinDropBody.jsx`, `src/widgets/locationMap/bodies/pinDropBody.module.scss`.

### Region 7 — `NearbyJobsBody`
Multi-pin rendering with brand-60 lollipops + distance labels. Live haversine distances from user position. Filter pill row (single-select among filters; "All" as default). Peeking bottom-sheet (collapsed = 1-row peek + handle; expanded = full scroll). Pin↔row sync — pin tap snaps panel; row tap snaps map. Single-job-select model; CTA copy reflects current selection.
**Touches:** `src/widgets/locationMap/bodies/NearbyJobsBody.jsx`, `src/widgets/locationMap/bodies/nearbyJobsBody.module.scss`.

### Region 8 — `GeofenceBody`
Polygon overlay (dashed brand-60 / success-tone stroke). `watchPosition` wiring with cleanup on close. Hysteresis (3 concordant samples flip state). `accuracy_gate_m` enforcement (CTA disables when accuracy worse than gate). Tone-coloured header band (success inside-and-ready / yellow outside / error on GPS denied). Distance-to-edge caption from `geofenceMath`. Malformed-polygon defensive fallback.
**Touches:** `src/widgets/locationMap/bodies/GeofenceBody.jsx`, `src/widgets/locationMap/bodies/geofenceBody.module.scss`.

### Region 9 — `DirectionsBody`
Start pin (white circle, brand-60 ring) + end pin (brand-60 lollipop) + fixture polyline. Stroke-dashoffset draw animation on enter (rise-up curve, 520ms, synchronised with FLIP lift). Step list with §11 stagger entry. Native-Maps deep-link builder (`maps:?...`) + universal-URL fallback (`https://www.google.com/maps/dir/?...`).
**Touches:** `src/widgets/locationMap/bodies/DirectionsBody.jsx`, `src/widgets/locationMap/bodies/directionsBody.module.scss`.

### Region 10 — Compact-card variant body regions
Per-variant content inside the compact card (between header and CTA). `pin_drop`: mini-map preview + conditional address chip. `nearby_jobs`: mini-map preview (16:7) + 3-row list (read-only on the card). `geofence`: mini-map preview + status chip overlay (top-left). `directions`: mini-map preview with start/end + route polyline (no list). All four share the §1 card shell and §2 header.
**Touches:** `src/widgets/LocationMap.jsx`, `src/widgets/locationMap.module.scss`.

### Region 11 — Widget-level state machine + `widget_response` emission
Transitions: `idle` → `sheet_open` → `completed` (or `dismissed`). Per-variant `widget_response` shapes per the spec. `total_open_time_seconds` accumulation across all open intervals. `directions` silent-response carve-out (engine sees, chat doesn't; never enters `completed`).
**Touches:** `src/widgets/LocationMap.jsx`, `src/widgets/locationMap/LocationMapSheet.jsx`.

### Region 12 — `completed` state + success banner
§10 success banner replaces the CTA region per variant (skip for `directions`). Variant icon swaps to filled / `Check`-overlaid form on the compact card. Sheet reopen blocked from `completed`. Banner content: chip + tabular-nums timestamp, no confetti or hero copy (§10).
**Touches:** `src/widgets/LocationMap.jsx`, `src/widgets/locationMap.module.scss`.

### Region 13 — FLIP lift transition
Three-phase lift: measure (`getBoundingClientRect` of compact-card mini-map + sheet map region) → clone & animate (520ms rise-up curve) → handoff (clone removed, map region opacity → 1, `--lift-tint` sampled). Per-variant clone content (pin / multi-pins / polygon / route). Reverse on dismiss. Off-screen fallback (lift from below viewport when source rect is offscreen).
**Touches:** `src/widgets/locationMap/LiftClone.jsx` (new), `src/widgets/locationMap/locationMapSheet.module.scss`, `src/widgets/locationMap/locationMap.module.scss`.

### Region 14 — Reduced-motion path
`@media (prefers-reduced-motion: reduce)` neutralises: FLIP lift (skipped entirely), pin-drop bounce, status-chip morph, peeking-sheet expand spring, `riseUp` stagger, polyline draw. Functional behaviour (tile load, GPS, geofence math, reverse-geocode) untouched.
**Touches:** all `*.module.scss` under `src/widgets/locationMap/` and `src/widgets/locationMap.module.scss`.

### Region 15 — Edge-case sweep
Implement the edge-case table from the spec: GPS denied/unsupported per variant, HTTPS detection, tile-error retry, malformed-polygon error, empty jobs, long-search no-match, multiple-instance watcher cleanup, sheet-close-during-load abort, `directions` deep-link OS-unsupported fallback. One commit collecting all the small if-branches.
**Touches:** all bodies + `MapSurface.jsx` + `useGeolocation.js`.

### Region 16 — Fixture finalisation
Flesh out all five variant payloads in `widgetSchemas.js` to spec-quality demos: `pin_drop` Lavelle Road + 5 search fixtures; `pin_drop_cold` blank + same fixtures; `nearby_jobs` 12 Bengaluru jobs across 4 filters; `geofence` Warehouse 4 polygon (~6 vertices) near Whitefield; `directions` Indiranagar → Whitefield with 8 steps + ~30-point fixture polyline traced on Old Madras Road.
**Touches:** `src/engine/widgetSchemas.js`.

---

## Pass 2 — `/frontend-design` elevation

Invoke `/frontend-design` once Pass 1 region 16 is in. The skill is allowed to push micro-interactions and one signature moment per variant beyond what the spec mandates, but cannot break `widget-conventions.md`. Strong candidates for elevation:

- **`pin_drop`** — accuracy ring breathing animation; pin-drag inertia trail.
- **`nearby_jobs`** — pin tap → list-row spring with brand-60 highlight stripe; filter pill morphing.
- **`geofence`** — outside→inside transition cascade (header band sweep + chip morph + CTA tone shift staggered).
- **`directions`** — polyline route highlight on step-row hover; arrival flag bounce.

Pass 2 ships as one or more region commits in the same series ("Pass 2 region N"), not a single mega-commit.

---

## Out of region scope (handled standing-rule, not as regions)

- **§0.1 token audit** — runs on every region commit before pushing.
- **§18 anti-pattern audit** — runs on every region commit.
- **Width-contract sweep** — implicit in region 1 and never re-introduced.
- **Type definitions / TS migration** — project is JS-only; out of scope for this widget.
