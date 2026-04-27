import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowRight,
  Locate,
  LocateFixed,
  LocateOff,
  AlertTriangle,
  MapPinOff,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { MapSurface } from '../MapSurface.jsx'
import { SheetHeader } from '../LocationMapSheet.jsx'
import { useGeolocation } from '../useGeolocation.js'
import {
  isInsidePolygon,
  isValidPolygon,
  distanceToPolygonEdge,
} from '../geofenceMath.js'
import shellStyles from '../locationMapSheet.module.scss'
import styles from './geofenceBody.module.scss'

/* ─── GeofenceBody ───────────────────────────────────────────────
   Inside-or-outside check-in. Polygon overlay (dashed) + live
   watchPosition. CTA "Check in here" enables only when:
     1. The polygon is valid
     2. GPS permission is 'granted'
     3. The user's position is inside the polygon
     4. GPS accuracy ≤ accuracy_gate_m

   Hysteresis: state flip (inside ↔ outside) requires 3 concordant
   samples to avoid CTA flicker at zone boundaries.

   Tone-aware header band: success when inside-and-ready, warning
   when outside, error when GPS denied or polygon malformed.
   ─────────────────────────────────────────────────────────────── */

const HYSTERESIS_WINDOW = 3

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return ''
  if (meters < 950) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} km`
}

function formatLatLng(lat, lng) {
  return `${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`
}

function formatTime(d) {
  return new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d)
}

export function GeofenceBody({ payload, requestClose, onComplete, closeBtnRef }) {
  const fence = payload?.geofence ?? null
  const polygon = fence?.polygon ?? []
  const accuracyGate = payload?.accuracy_gate_m ?? 50
  const watchEnabled = payload?.watch_position !== false

  const polygonValid = isValidPolygon(polygon)
  const geo = useGeolocation()

  /* Hysteresis ring buffer of recent inside/outside samples. */
  const samplesRef = useRef([])
  const [stableInside, setStableInside] = useState(null)  /* null = not enough data yet */

  /* Auto-start watching when the body mounts. The hook detaches the
     watcher on cleanup. */
  useEffect(() => {
    if (!watchEnabled) {
      geo.request()
      return undefined
    }
    return geo.watch()
  }, [watchEnabled, geo])

  /* Recompute inside/outside as position updates. */
  useEffect(() => {
    if (!polygonValid || !geo.position) return
    const next = isInsidePolygon([geo.position.lat, geo.position.lng], polygon)
    samplesRef.current = [...samplesRef.current.slice(-(HYSTERESIS_WINDOW - 1)), next]
    if (samplesRef.current.length >= HYSTERESIS_WINDOW) {
      const allAgree = samplesRef.current.every((s) => s === next)
      if (allAgree && stableInside !== next) setStableInside(next)
    } else if (stableInside === null) {
      /* First reading — set initial state immediately so the UI
         shows something while subsequent samples confirm. */
      setStableInside(next)
    }
  }, [geo.position, polygon, polygonValid, stableInside])

  const distanceToEdgeM = useMemo(() => {
    if (!polygonValid || !geo.position) return null
    return distanceToPolygonEdge([geo.position.lat, geo.position.lng], polygon)
  }, [geo.position, polygon, polygonValid])

  const accuracyOK = geo.accuracy != null && geo.accuracy <= accuracyGate

  const isReady = polygonValid
    && geo.permission === 'granted'
    && stableInside === true
    && accuracyOK

  /* ── Tone determination ─────────────────────────────────── */
  let tone = 'neutral'
  let HeaderIcon = ShieldCheck
  let subtitle = 'Acquiring location…'
  let footerCaption = ''
  let footerCaptionIcon = null

  if (!polygonValid) {
    tone = 'error'
    HeaderIcon = ShieldX
    subtitle = 'Invalid zone definition'
    footerCaption = 'This zone could not be loaded. Contact support.'
    footerCaptionIcon = AlertTriangle
  } else if (geo.permission === 'denied' || geo.permission === 'unsupported') {
    tone = 'error'
    HeaderIcon = MapPinOff
    subtitle = geo.permission === 'denied' ? 'Location permission denied' : 'Location not supported'
    footerCaption = 'Re-enable location in browser settings to check in.'
    footerCaptionIcon = MapPinOff
  } else if (stableInside === true && accuracyOK) {
    tone = 'success'
    HeaderIcon = ShieldCheck
    subtitle = `Inside ${fence?.label ?? 'zone'} · accurate to ~${Math.round(geo.accuracy)} m`
  } else if (stableInside === true && !accuracyOK) {
    tone = 'warning'
    HeaderIcon = ShieldCheck
    subtitle = 'Waiting for GPS lock…'
    footerCaption = `Accuracy ~${Math.round(geo.accuracy ?? 0)} m — needs ≤ ${accuracyGate} m to check in.`
  } else if (stableInside === false) {
    tone = 'warning'
    HeaderIcon = ShieldAlert
    subtitle = distanceToEdgeM != null
      ? `${formatDistance(distanceToEdgeM)} from ${fence?.label ?? 'the zone'}`
      : `Outside ${fence?.label ?? 'the zone'}`
    footerCaption = 'Move closer to the zone to enable check-in.'
  }

  /* ── Map props ──────────────────────────────────────────── */
  const polygons = useMemo(() => {
    if (!polygonValid) return []
    return [{
      id: 'fence',
      points: polygon,
      tone: stableInside === true ? 'success' : 'warning',
      dashArray: '8 5',
      weight: 2,
    }]
  }, [polygon, polygonValid, stableInside])

  const userLocation = useMemo(() => {
    if (!geo.position) return null
    return {
      lat: geo.position.lat,
      lng: geo.position.lng,
      accuracy_m: geo.accuracy ?? null,
    }
  }, [geo.position, geo.accuracy])

  const center = useMemo(() => [
    payload?.center_lat ?? 12.9716,
    payload?.center_lng ?? 77.5946,
  ], [payload?.center_lat, payload?.center_lng])

  const fitBounds = useMemo(() => {
    if (!polygonValid) return null
    /* Show the entire polygon. */
    return polygon
  }, [polygon, polygonValid])

  /* ── CTA ────────────────────────────────────────────────── */
  const handleCheckIn = useCallback(() => {
    if (!isReady || !geo.position) return
    onComplete?.({
      geofence_id: fence?.id ?? null,
      geofence_label: fence?.label ?? null,
      inside_geofence: true,
      lat: geo.position.lat,
      lng: geo.position.lng,
      accuracy_m: Math.round(geo.accuracy ?? 0),
    })
  }, [isReady, geo.position, geo.accuracy, fence, onComplete])

  const FabIcon =
    geo.permission === 'denied'      ? LocateOff
    : geo.permission === 'unsupported' ? LocateOff
    : geo.position                     ? LocateFixed
    : Locate

  const fabDisabled = geo.permission === 'unsupported' || geo.permission === 'denied'

  return (
    <>
      <SheetHeader
        icon={HeaderIcon}
        title={payload?.title ?? fence?.label ?? 'Check in'}
        subtitle={subtitle}
        tone={tone}
        requestClose={requestClose}
        closeBtnRef={closeBtnRef}
      />

      <div className={shellStyles.mapRegion}>
        <MapSurface
          center={center}
          zoom={payload?.initial_zoom ?? 16}
          polygons={polygons}
          userLocation={userLocation}
          fitBounds={fitBounds}
          ariaLabel={payload?.title}
        />

        <button
          type="button"
          className={cx(styles.fab, fabDisabled && styles.fab_disabled)}
          onClick={() => geo.request()}
          disabled={fabDisabled}
          aria-label={
            geo.permission === 'denied' ? 'Location unavailable'
            : geo.permission === 'unsupported' ? 'Location not supported'
            : 'Recheck location'
          }
        >
          <FabIcon size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className={cx(shellStyles.footer, styles.footer)}>
        <div className={styles.coordRow}>
          {geo.position ? (
            <>
              <span className={styles.coord}>📍 {formatLatLng(geo.position.lat, geo.position.lng)}</span>
              <span className={styles.timestamp}>{formatTime(new Date())}</span>
            </>
          ) : (
            <span className={styles.coordPending}>Waiting for first GPS fix…</span>
          )}
        </div>

        {footerCaption && (
          <p className={cx(styles.caption, styles[`caption_${tone}`])}>
            {footerCaptionIcon && (
              <span className={styles.captionIcon}>
                {(() => {
                  const Icon = footerCaptionIcon
                  return <Icon size={14} strokeWidth={2} aria-hidden />
                })()}
              </span>
            )}
            <span>{footerCaption}</span>
          </p>
        )}

        <Button
          variant="primary"
          className={cx(shellStyles.footerCta, isReady && styles.cta_ready)}
          onClick={handleCheckIn}
          disabled={!isReady}
        >
          <span>{isReady ? 'Check in here' : 'Check in'}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </>
  )
}

export default GeofenceBody
