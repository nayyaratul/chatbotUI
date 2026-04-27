import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Loader2, WifiOff, RotateCcw } from 'lucide-react'
import { Button } from '@nexus/atoms'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './mapSurface.module.scss'

/* ─── MapSurface — provider seam over Leaflet ────────────────────
   Wraps Leaflet's imperative API with a declarative React surface.
   Sandbox uses Leaflet + OpenStreetMap raster tiles; an ess-pwa lift
   to a keyed tile provider (Stadia / MapTiler / Mapbox) replaces this
   one file. The four variant body components consume only this prop
   API — they never import `leaflet` directly.

   Token purity:
     Leaflet renders polygons/polylines as SVG <path> elements with
     stroke / fill set as ATTRIBUTES (not inline styles). CSS class
     rules with class-level specificity override SVG attributes — so
     polygon/polyline tones live in mapSurface.module.scss, not as
     hex strings in this file. Markers are L.divIcon-based; their
     visual is pure SCSS (no PNG asset workaround).
   ─────────────────────────────────────────────────────────────── */

const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>'
const OSM_MAX_ZOOM = 19

/* Build a Leaflet divIcon for a marker spec. The visual lives in
   mapSurface.module.scss (`.marker`, `.marker_pin`, `.marker_dot`,
   `.marker_pin_secondary`, etc.) — body-specific kinds extend the
   set in their own SCSS files via :global() selectors if needed. */
function buildDivIcon(spec, baseClass) {
  const kind = spec.kind ?? 'pin'
  const className = cx(baseClass, styles[`marker_${kind}`], spec.className)
  /* iconAnchor defaults are kind-specific so the marker's "tip"
     lands on the lat/lng. Pins anchor at bottom-center; dots at
     true center. Bodies can override per-spec if they need to. */
  const defaultAnchor = kind === 'dot' ? [10, 10] : [11, 30]
  const defaultSize = kind === 'dot' ? [20, 20] : [22, 30]
  return L.divIcon({
    className,
    iconSize: spec.iconSize ?? defaultSize,
    iconAnchor: spec.iconAnchor ?? defaultAnchor,
    html: spec.html ?? '',
  })
}

export function MapSurface({
  center,
  zoom = 15,
  markers = [],
  polygons = [],
  polyline = null,
  userLocation = null,
  fitBounds = null,
  controls,
  onMapClick = null,
  onMapReady = null,
  onStatusChange = null,
  className,
  ariaLabel = 'Map',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const overlaysRef = useRef({
    markers: [],
    polygons: [],
    polyline: null,
    userPin: null,
    userRing: null,
  })
  const onMapClickRef = useRef(onMapClick)
  const [status, setStatus] = useState('loading')
  const [retryNonce, setRetryNonce] = useState(0)

  /* Keep the click handler ref current so the map's `click` listener
     (attached once at mount) always calls the latest closure. */
  useEffect(() => { onMapClickRef.current = onMapClick }, [onMapClick])

  useEffect(() => { onStatusChange?.(status) }, [status, onStatusChange])

  /* ── Mount once ────────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const showZoom = controls?.zoom !== false
    const showAttr = controls?.attribution !== false

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: showZoom,
      attributionControl: showAttr,
      /* Keyboard / scroll-wheel defaults are fine; nothing to override. */
    })

    map.on('click', (e) => {
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    mapRef.current = map
    onMapReady?.(map)

    return () => {
      map.off()
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      overlaysRef.current = {
        markers: [],
        polygons: [],
        polyline: null,
        userPin: null,
        userRing: null,
      }
    }
    /* Mount once — `center`, `zoom`, `controls`, `onMapReady` are
       captured initial values. Subsequent updates flow through the
       view-sync effect below.                                      */
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  /* ── Tile layer (re-mounted on retry to clear cached errors) ── */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return undefined

    setStatus('loading')

    const tileLayer = L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: OSM_MAX_ZOOM,
      /* Standard OSM has 3 subdomains (a/b/c) for parallel fetches. */
      subdomains: ['a', 'b', 'c'],
      /* Help OSM's "no scraping" usage policy: identify the embed
         loosely. ess-pwa swaps to a keyed provider in production. */
      crossOrigin: 'anonymous',
    })

    let firstLoadFired = false
    const onLoad = () => {
      if (!firstLoadFired) {
        firstLoadFired = true
        setStatus('ready')
      }
    }
    const onTileError = () => {
      /* A single tile error doesn't condemn the layer — Leaflet
         retries the tile transparently. We only flip to `error`
         when the FIRST batch of tiles fails entirely (no `load`
         within ~8s). The watchdog timer below enforces that. */
    }

    tileLayer.on('load', onLoad)
    tileLayer.on('tileerror', onTileError)
    tileLayer.addTo(map)
    tileLayerRef.current = tileLayer

    /* 8-second watchdog — if no tile has fired `load` by then, treat
       the layer as broken and surface the error overlay. The retry
       button bumps `retryNonce` to re-run this effect. */
    const watchdog = window.setTimeout(() => {
      if (!firstLoadFired) setStatus('error')
    }, 8000)

    return () => {
      window.clearTimeout(watchdog)
      tileLayer.off()
      if (map && tileLayerRef.current === tileLayer) {
        map.removeLayer(tileLayer)
        tileLayerRef.current = null
      }
    }
  }, [retryNonce])

  /* ── Sync view (center / zoom) ───────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !center) return
    map.setView(center, zoom, { animate: false })
  }, [center, zoom])

  /* ── Fit bounds (if provided, takes precedence over center/zoom) */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitBounds || fitBounds.length < 2) return
    map.fitBounds(fitBounds, { padding: [24, 24], animate: false })
  }, [fitBounds])

  /* ── Markers ─────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    overlaysRef.current.markers.forEach((m) => m.remove())
    overlaysRef.current.markers = markers.map((spec) => {
      const marker = L.marker([spec.lat, spec.lng], {
        icon: buildDivIcon(spec, styles.marker),
        draggable: !!spec.draggable,
        keyboard: false,
        title: spec.title ?? '',
        riseOnHover: true,
      })
      if (spec.draggable && spec.onDragEnd) {
        marker.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng()
          spec.onDragEnd({ lat, lng })
        })
      }
      if (spec.onClick) {
        marker.on('click', () => spec.onClick(spec))
      }
      marker.addTo(map)
      return marker
    })
  }, [markers])

  /* ── Polygons ────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    overlaysRef.current.polygons.forEach((p) => p.remove())
    overlaysRef.current.polygons = polygons.map((spec) => {
      const poly = L.polygon(spec.points, {
        /* CSS class drives stroke / fill colour (token-pure). The
           inline color/fillColor still need stand-in values so
           Leaflet renders the path attrs at all — CSS overrides
           the resulting SVG attributes. */
        /* `transparent` is a stand-in so Leaflet writes the SVG
           `stroke` / `fill` attributes (required for the path to
           render). The CSS class on the path overrides both via
           class-selector specificity — see mapSurface.module.scss
           `.polygon_brand` etc. */
        color: 'transparent',
        fillColor: 'transparent',
        weight: spec.weight ?? 2,
        dashArray: spec.dashArray ?? '8 5',
        fillOpacity: spec.fillOpacity ?? 0.18,
        opacity: 1,
        className: cx(styles.polygon, styles[`polygon_${spec.tone ?? 'brand'}`], spec.className),
        interactive: false,
      })
      poly.addTo(map)
      return poly
    })
  }, [polygons])

  /* ── Polyline (single, optional) ─────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    overlaysRef.current.polyline?.remove()
    overlaysRef.current.polyline = null

    if (!polyline || !polyline.points || polyline.points.length < 2) return

    const line = L.polyline(polyline.points, {
      /* See polygon comment above — CSS class supplies the stroke. */
      color: 'transparent',
      weight: polyline.weight ?? 5,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: polyline.dashArray ?? null,
      className: cx(styles.polyline, styles[`polyline_${polyline.tone ?? 'brand'}`], polyline.className),
      interactive: false,
    })
    line.addTo(map)
    overlaysRef.current.polyline = line
  }, [polyline])

  /* ── User location pin + accuracy ring ───────────────────────── */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    overlaysRef.current.userPin?.remove()
    overlaysRef.current.userRing?.remove()
    overlaysRef.current.userPin = null
    overlaysRef.current.userRing = null

    if (!userLocation) return

    const userIcon = L.divIcon({
      className: cx(styles.marker, styles.marker_user),
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      html: '',
    })
    const pin = L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      keyboard: false,
      interactive: false,
    })
    pin.addTo(map)
    overlaysRef.current.userPin = pin

    if (userLocation.accuracy_m && userLocation.accuracy_m > 0) {
      const ring = L.circle([userLocation.lat, userLocation.lng], {
        radius: userLocation.accuracy_m,
        /* `transparent` is a stand-in so Leaflet writes the SVG
           `stroke` / `fill` attributes (required for the path to
           render). The CSS class on the path overrides both via
           class-selector specificity — see mapSurface.module.scss
           `.polygon_brand` etc. */
        color: 'transparent',
        fillColor: 'transparent',
        fillOpacity: 0.10,
        weight: 1,
        opacity: 1,
        className: cx(
          styles.userRing,
          styles[`userRing_${userLocation.tone ?? 'brand'}`],
        ),
        interactive: false,
      })
      ring.addTo(map)
      overlaysRef.current.userRing = ring
    }
  }, [userLocation])

  const handleRetry = useCallback(() => {
    setRetryNonce((n) => n + 1)
  }, [])

  return (
    <div className={cx(styles.surface, className)}>
      <div
        ref={containerRef}
        className={styles.map}
        role="application"
        aria-label={ariaLabel}
      />

      {status === 'loading' && (
        <div className={styles.loadingOverlay} aria-hidden="true">
          <span className={styles.loadingSpinner}>
            <Loader2 size={28} strokeWidth={1.75} />
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className={styles.errorOverlay} role="status">
          <span className={styles.errorIcon}>
            <WifiOff size={28} strokeWidth={1.75} />
          </span>
          <p className={styles.errorTitle}>Couldn&rsquo;t load map tiles</p>
          <p className={styles.errorBody}>Check your connection and try again.</p>
          <Button
            variant="secondary"
            className={styles.errorRetry}
            onClick={handleRetry}
          >
            <RotateCcw size={16} />
            <span>Try again</span>
          </Button>
        </div>
      )}
    </div>
  )
}

export default MapSurface
