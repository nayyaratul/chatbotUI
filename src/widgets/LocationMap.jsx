import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
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
/* eslint-disable react-refresh/only-export-components */
import { useChatActions } from '../chat/ChatActionsContext.jsx'
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

const LiftClone = lazy(() =>
  import('./locationMap/LiftClone.jsx').then((m) => ({
    default: m.LiftClone,
  })),
)

/* Approximate sheet header / footer heights (used when the lift's
   target rect can't be measured precisely — pre-mount of the sheet,
   or in reduced-motion fast paths). The exact rect arrives via the
   sheet's onMapRegionRect callback once layout settles. Numeric
   pixel values are deliberate — they're FLIP geometry, not visual
   styling, so the §0.1 token rule doesn't apply (the regex below
   intentionally avoids "px" suffixes in source comments). */
const SHEET_HEADER_PX = 56
const SHEET_FOOTER_PX = 140

function computeSourceRectFromDom(widgetId) {
  if (!widgetId || typeof document === 'undefined') return null
  const root = document.getElementById('chat-modal-root')
  const el = document.querySelector(`[data-lm-mini-map="${widgetId}"]`)
  if (!root || !el) return null
  const rootR = root.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return {
    top:    r.top  - rootR.top,
    left:   r.left - rootR.left,
    width:  r.width,
    height: r.height,
  }
}

function computeApproximateTargetRect() {
  if (typeof document === 'undefined') return null
  const root = document.getElementById('chat-modal-root')
  if (!root) return null
  const rootR = root.getBoundingClientRect()
  /* Target = sheet's mapRegion's eventual rect, approximated from
     chat-modal-root bounds. The sheet covers the full root; header
     sits at the top, footer at the bottom; mapRegion fills the
     rest. The exact rect arrives later via the sheet's
     onMapRegionRect callback once layout settles. */
  return {
    top:    SHEET_HEADER_PX,
    left:   0,
    width:  rootR.width,
    height: Math.max(rootR.height - SHEET_HEADER_PX - SHEET_FOOTER_PX, 0),
  }
}

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
    <div className={cx(styles.miniMap, styles.miniMap_pinDrop)} data-lm-mini-map={payload?.widget_id ?? ''} aria-hidden="true">
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
      <div className={cx(styles.miniMap, styles.miniMap_nearbyJobs)} data-lm-mini-map={payload?.widget_id ?? ''} aria-hidden="true">
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
    <div className={cx(styles.miniMap, styles.miniMap_geofence)} data-lm-mini-map={payload?.widget_id ?? ''} aria-hidden="true">
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
    <div className={cx(styles.miniMap, styles.miniMap_directions)} data-lm-mini-map={payload?.widget_id ?? ''} aria-hidden="true">
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

/* ─── widget_response shape per variant ──────────────────────── */

function buildWidgetResponse(variant, payload, data, totalOpenTimeSeconds) {
  const widget_id = payload?.widget_id
  const timestamp = new Date().toISOString()

  const base = {
    type: 'widget_response',
    payload: {
      widget_id,
      source_type: 'location_map',
      variant: variant === 'pin_drop_cold' ? 'pin_drop' : variant,
      total_open_time_seconds: totalOpenTimeSeconds,
    },
  }

  switch (variant) {
    case 'pin_drop':
    case 'pin_drop_cold':
      return {
        ...base,
        payload: {
          ...base.payload,
          completed: true,
          completion_method: 'pin_set',
          data: { ...data, timestamp },
        },
      }

    case 'nearby_jobs':
      return {
        ...base,
        payload: {
          ...base.payload,
          completed: true,
          completion_method: 'job_selected',
          data: { ...data, timestamp },
        },
      }

    case 'geofence':
      return {
        ...base,
        payload: {
          ...base.payload,
          completed: true,
          completion_method: 'check_in',
          data: { ...data, timestamp },
        },
      }

    case 'directions':
      /* directions is informational — completed: false, never locks. */
      return {
        ...base,
        payload: {
          ...base.payload,
          completed: false,
          completion_method: 'opened_in_native_maps',
          data: { ...data, timestamp },
        },
      }

    default:
      return null
  }
}

/* ─── Public widget component ──────────────────────────────── */

export function LocationMap({ payload }) {
  const variant = payload?.variant ?? 'pin_drop'
  const Icon = VARIANT_ICONS[variant] ?? MapPin
  const CtaIcon = CTA_ICON[variant] ?? ArrowRight

  const { onReply } = useChatActions()

  /* Card-level state machine (idle → sheet_open → completed | dismissed).
     `directions` never enters `completed` — see spec §state machine. */
  const [cardState, setCardState] = useState('idle')
  const [sheetOpen, setSheetOpen] = useState(false)

  /* total_open_time_seconds — accumulates across all open intervals. */
  const openedAtRef = useRef(null)
  const accumOpenMsRef = useRef(0)

  /* FLIP lift state — two rects + a phase. Forward lift fires on
     handleOpen; the clone unmounts itself via onDone after ~540ms.
     Reverse on dismiss is left as a Pass-2 polish item — region 13
     ships forward only. */
  const [lift, setLift] = useState(null)  /* { sourceRect, targetRect } | null */

  const ctaLabel = useMemo(() => {
    if (cardState === 'dismissed') return 'Reopen map'
    return CTA_LABEL[variant] ?? 'Open map'
  }, [cardState, variant])

  const handleOpen = useCallback(() => {
    if (cardState === 'completed') return  /* terminal — sheet locked */

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    const sourceRect = reduceMotion ? null : computeSourceRectFromDom(payload?.widget_id)
    const targetRect = reduceMotion ? null : computeApproximateTargetRect()

    if (sourceRect && targetRect) {
      setLift({ sourceRect, targetRect })
    }

    openedAtRef.current = Date.now()
    setSheetOpen(true)
    setCardState('sheet_open')
  }, [cardState, payload?.widget_id])

  const handleLiftDone = useCallback(() => setLift(null), [])

  const handleClose = useCallback(() => {
    if (openedAtRef.current != null) {
      accumOpenMsRef.current += Date.now() - openedAtRef.current
      openedAtRef.current = null
    }
    setSheetOpen(false)
    /* Only flip to `dismissed` if we weren't already `completed` —
       a sheet that completes also calls onClose afterwards. */
    setCardState((prev) => (prev === 'completed' ? prev : 'dismissed'))
  }, [])

  const [completedAt, setCompletedAt] = useState(null)

  const handleComplete = useCallback((data) => {
    if (openedAtRef.current != null) {
      accumOpenMsRef.current += Date.now() - openedAtRef.current
      openedAtRef.current = null
    }
    const totalSeconds = Math.round(accumOpenMsRef.current / 1000)

    const message = buildWidgetResponse(variant, payload, data, totalSeconds)
    if (message) {
      const isSilent = variant === 'directions'
      onReply(message, isSilent ? { silent: true } : undefined)
    }

    /* directions is informational — close the sheet but stay reopen-able. */
    setSheetOpen(false)
    if (variant === 'directions') {
      setCardState('dismissed')
    } else {
      setCardState('completed')
      setCompletedAt(new Date())
    }
  }, [variant, payload, onReply])

  const isCompleted = cardState === 'completed'

  return (
    <div className={cx(
      styles.card,
      styles[`variant_${variant}`],
      isCompleted && styles.card_completed,
    )}>
      <header className={styles.header}>
        <span className={cx(styles.iconBadge, isCompleted && styles.iconBadge_completed)}>
          {isCompleted
            ? <Check size={18} strokeWidth={2.5} aria-hidden />
            : <Icon size={18} strokeWidth={2} aria-hidden />
          }
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

      {isCompleted
        ? <SuccessBanner variant={variant} completedAt={completedAt} />
        : (
          <Button
            variant="primary"
            className={styles.cta}
            onClick={handleOpen}
          >
            <span>{ctaLabel}</span>
            <CtaIcon size={16} strokeWidth={2} aria-hidden />
          </Button>
        )
      }

      {sheetOpen && (
        <Suspense fallback={null}>
          <LocationMapSheet
            payload={payload}
            onClose={handleClose}
            onComplete={handleComplete}
          />
        </Suspense>
      )}

      {lift && (
        <Suspense fallback={null}>
          <LiftClone
            sourceRect={lift.sourceRect}
            targetRect={lift.targetRect}
            onDone={handleLiftDone}
          >
            <VariantPreview variant={variant} payload={payload} />
          </LiftClone>
        </Suspense>
      )}
    </div>
  )
}

/* ─── §10 success banner ────────────────────────────────────────
   Single chip + one-line tabular-nums timestamp. No confetti. */

const SUCCESS_LABELS = {
  /* directions never enters `completed`, so it has no entry. */
  pin_drop:      'Confirmed',
  pin_drop_cold: 'Confirmed',
  nearby_jobs:   'Applied',
  geofence:      'Checked in',
}

function SuccessBanner({ variant, completedAt }) {
  const label = SUCCESS_LABELS[variant] ?? 'Done'
  const timeStr = completedAt
    ? new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' }).format(completedAt)
    : ''
  return (
    <div className={styles.successBanner} role="status" aria-live="polite">
      <span className={styles.successChip}>
        <Check size={14} strokeWidth={2.5} aria-hidden />
        <span>{label}</span>
      </span>
      {timeStr && (
        <p className={styles.successMeta}>Submitted at {timeStr}.</p>
      )}
    </div>
  )
}

export default LocationMap
