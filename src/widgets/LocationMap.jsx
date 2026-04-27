import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  MapPin,
  Compass,
  ShieldCheck,
  Navigation,
  ArrowRight,
  ArrowUpRight,
  Check,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './locationMap.module.scss'

/* ─── Location Map Widget (#13) ──────────────────────────────────
   Interactive map with four use-case variants. Compact card sits in
   the chat stream with a variant-specific mini-map preview; tapping
   the CTA lifts a portaled sheet (FLIP from the mini-map) where the
   real picking happens. Built on Leaflet + OpenStreetMap raster
   tiles in sandbox; provider seam (MapSurface, useGeolocation,
   geocoder) sized for an ess-pwa lift to a keyed tile provider and
   real geocoding.

     pin_drop       — confirm or pick an address; user-attested via CTA
     pin_drop_cold  — same component, no initial_location pre-fill
     nearby_jobs    — multi-pin selector with peeking-sheet job list
     geofence       — inside/outside check-in gated by GPS accuracy
     directions     — read-only route + native-Maps deep-link hand-off

   See docs/superpowers/specs/2026-04-27-location-map-widget-design.md
   and …-regions.md for the implementation sequence.
   ─────────────────────────────────────────────────────────────── */

const LocationMapSheet = lazy(() =>
  import('./locationMap/LocationMapSheet.jsx').then((m) => ({
    default: m.LocationMapSheet,
  })),
)

const VARIANT_ICONS = {
  pin_drop:      MapPin,
  pin_drop_cold: MapPin,
  nearby_jobs:   Compass,
  geofence:      ShieldCheck,
  directions:    Navigation,
}

const CTA_LABEL = {
  pin_drop:      'Confirm location',
  pin_drop_cold: 'Open map',
  nearby_jobs:   'Open map',
  geofence:      'Check in here',
  directions:    'Open in Maps',
}

const CTA_ICON = {
  pin_drop:      ArrowRight,
  pin_drop_cold: ArrowRight,
  nearby_jobs:   ArrowRight,
  geofence:      ArrowRight,
  directions:    ArrowUpRight,
}

const HEADS = {
  pin_drop:      'Location',
  pin_drop_cold: 'Location',
  nearby_jobs:   'Nearby',
  geofence:      'Check-in',
  directions:    'Directions',
}

function eyebrowText(variant, category) {
  const head = HEADS[variant] ?? 'Location'
  return category ? `${head} · ${category}` : head
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return ''
  if (meters < 950) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} km`
}

/* ─── Mini-map preview ──────────────────────────────────────────
   Stylized illustrative map (no Leaflet — that lives behind the
   sheet's lazy boundary). Each variant overlays a different set of
   markers / overlays atop a shared SCSS background of road strokes,
   water blob, park blob.

   Region 13 will use the `.miniMap` element as the FLIP source rect:
   measure it, clone it (preserving variant overlays), animate the
   clone into the sheet's map region.
   ────────────────────────────────────────────────────────────── */

function MiniMapBackground() {
  return (
    <svg
      className={styles.miniMapBg}
      viewBox="0 0 320 180"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0 110 Q80 96 160 112 T320 102 L320 180 L0 180 Z" className={styles.miniMapWater} />
      <path d="M30 24 Q70 16 110 28 Q120 60 90 72 Q40 76 25 50 Z" className={styles.miniMapPark} />
      <g className={styles.miniMapRoads}>
        <line x1="0" y1="55" x2="320" y2="50" />
        <line x1="0" y1="92" x2="320" y2="94" />
        <line x1="0" y1="138" x2="320" y2="140" />
        <line x1="125" y1="0" x2="130" y2="180" />
        <line x1="200" y1="0" x2="205" y2="180" />
        <line x1="270" y1="0" x2="265" y2="180" />
      </g>
    </svg>
  )
}

function PinDropPreview({ payload }) {
  const hasInitial = !!payload?.initial_location
  return (
    <div className={cx(styles.miniMap, styles.miniMap_pinDrop)} aria-hidden="true">
      <MiniMapBackground />
      {hasInitial && (
        <>
          <span className={styles.accuracyRing} />
          <span className={styles.pinHero} />
        </>
      )}
      {!hasInitial && (
        <span className={styles.pinHeroMuted}>
          <MapPin size={20} strokeWidth={2} />
          <span>Tap to drop a pin</span>
        </span>
      )}
    </div>
  )
}

function NearbyJobsPreview({ payload }) {
  /* Three closest jobs (sorted client-side by distance_m_hint) shown
     in the row list and as pins on the mini-map. */
  const jobs = useMemo(() => {
    const arr = (payload?.jobs ?? []).slice()
    arr.sort((a, b) => (a.distance_m_hint ?? Infinity) - (b.distance_m_hint ?? Infinity))
    return arr.slice(0, 3)
  }, [payload?.jobs])

  /* Compute pin positions across the 16:7 mini-map by distributing
     them around the centre. Without real geo on the mini-map, this
     is purely decorative — the actual map in the sheet has truth. */
  const pinSpots = [
    { left: '32%', top: '36%' },
    { left: '64%', top: '42%' },
    { left: '78%', top: '70%' },
  ]

  return (
    <>
      <div className={cx(styles.miniMap, styles.miniMap_nearbyJobs)} aria-hidden="true">
        <MiniMapBackground />
        <span className={styles.youDot} style={{ left: '50%', top: '55%' }} />
        {jobs.map((j, idx) => (
          <span
            key={j.id ?? idx}
            className={styles.jobPin}
            style={pinSpots[idx] ?? { left: '50%', top: '50%' }}
          />
        ))}
      </div>
      <ul className={styles.jobList}>
        {jobs.map((j) => (
          <li key={j.id} className={styles.jobRow}>
            <span className={styles.jobLabel}>{j.label}</span>
            {j.distance_m_hint != null && (
              <span className={styles.jobDistance}>{formatDistance(j.distance_m_hint)}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}

function GeofencePreview({ payload }) {
  /* Polygon points are real lat/lng — but for the compact-card
     preview we don't reproject; we just shape them into a viewBox
     polygon by normalising to bounds. The map in the sheet is
     truth; this is decoration. */
  const polygonPath = useMemo(() => {
    const polygon = payload?.geofence?.polygon ?? []
    if (polygon.length < 3) return null
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    for (const [lat, lng] of polygon) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
    const pad = 0.10
    const w = (maxLng - minLng) || 1
    const h = (maxLat - minLat) || 1
    return polygon
      .map(([lat, lng]) => {
        const x = ((lng - minLng) / w) * (320 * (1 - 2 * pad)) + 320 * pad
        const y = (1 - (lat - minLat) / h) * (180 * (1 - 2 * pad)) + 180 * pad
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [payload?.geofence?.polygon])

  return (
    <div className={cx(styles.miniMap, styles.miniMap_geofence)} aria-hidden="true">
      <MiniMapBackground />
      {polygonPath && (
        <svg
          className={styles.fencePolygon}
          viewBox="0 0 320 180"
          preserveAspectRatio="none"
        >
          <polygon points={polygonPath} />
        </svg>
      )}
      <span className={styles.youDot} style={{ left: '54%', top: '52%' }} />
      <span className={styles.statusChip}>
        <Check size={12} strokeWidth={2.5} aria-hidden />
        Inside zone
      </span>
    </div>
  )
}

function DirectionsPreview({ payload }) {
  /* Route polyline normalised into viewBox space, same trick as the
     geofence polygon. */
  const routePath = useMemo(() => {
    const points = payload?.polyline ?? []
    if (points.length < 2) return null
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    for (const [lat, lng] of points) {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    }
    const pad = 0.12
    const w = (maxLng - minLng) || 1
    const h = (maxLat - minLat) || 1
    return points
      .map(([lat, lng], i) => {
        const x = ((lng - minLng) / w) * (320 * (1 - 2 * pad)) + 320 * pad
        const y = (1 - (lat - minLat) / h) * (180 * (1 - 2 * pad)) + 180 * pad
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')
  }, [payload?.polyline])

  return (
    <div className={cx(styles.miniMap, styles.miniMap_directions)} aria-hidden="true">
      <MiniMapBackground />
      {routePath && (
        <svg
          className={styles.routeSvg}
          viewBox="0 0 320 180"
          preserveAspectRatio="none"
        >
          <path d={routePath} className={styles.routeLine} />
          <path d={routePath} className={styles.routeLineInner} />
        </svg>
      )}
      <span className={styles.startPin} />
      <span className={styles.endPin} />
    </div>
  )
}

function VariantPreview({ variant, payload }) {
  switch (variant) {
    case 'pin_drop':
    case 'pin_drop_cold':
      return <PinDropPreview payload={payload} />
    case 'nearby_jobs':
      return <NearbyJobsPreview payload={payload} />
    case 'geofence':
      return <GeofencePreview payload={payload} />
    case 'directions':
      return <DirectionsPreview payload={payload} />
    default:
      return null
  }
}

/* ─── Public widget component ──────────────────────────────── */

export function LocationMap({ payload }) {
  const variant = payload?.variant ?? 'pin_drop'
  const Icon = VARIANT_ICONS[variant] ?? MapPin
  const CtaIcon = CTA_ICON[variant] ?? ArrowRight
  const ctaLabel = CTA_LABEL[variant] ?? 'Open map'

  const [sheetOpen, setSheetOpen] = useState(false)

  const handleOpen = useCallback(() => setSheetOpen(true), [])
  const handleClose = useCallback(() => setSheetOpen(false), [])
  const handleComplete = useCallback(() => {
    /* Region 11 wires this up. For now: just close. */
    setSheetOpen(false)
  }, [])

  return (
    <div className={cx(styles.card, styles[`variant_${variant}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge}>
          <Icon size={18} strokeWidth={2} aria-hidden />
        </span>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>
            {eyebrowText(variant, payload?.category)}
          </span>
          <h3 className={styles.title}>{payload?.title}</h3>
          {payload?.description && (
            <p className={styles.description}>{payload.description}</p>
          )}
        </div>
      </header>

      <VariantPreview variant={variant} payload={payload} />

      <Button
        variant="primary"
        className={styles.cta}
        onClick={handleOpen}
      >
        <span>{ctaLabel}</span>
        <CtaIcon size={16} strokeWidth={2} aria-hidden />
      </Button>

      {sheetOpen && (
        <Suspense fallback={null}>
          <LocationMapSheet
            payload={payload}
            onClose={handleClose}
            onComplete={handleComplete}
          />
        </Suspense>
      )}
    </div>
  )
}

export default LocationMap
