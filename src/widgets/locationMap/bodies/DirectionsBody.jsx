import { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  Navigation,
  ArrowUpRight,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  Flag,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { MapSurface } from '../MapSurface.jsx'
import { SheetHeader } from '../LocationMapSheet.jsx'
import shellStyles from '../locationMapSheet.module.scss'
import styles from './directionsBody.module.scss'

/* ─── DirectionsBody ─────────────────────────────────────────────
   Read-only route + native-Maps deep-link hand-off. The widget
   doesn't navigate the user itself — it visualises the route with a
   fixture polyline and offers a single CTA that hands off to the
   OS-level Maps app via the `maps:` URL scheme (with a Google Maps
   universal URL fallback for OSes that don't handle the scheme).

   No GPS, no FAB, no listening for any side effect. The polyline
   draws itself on enter via a stroke-dashoffset animation
   (rise-up curve, ~520ms) synchronised with the FLIP lift.

   Tap "Open in Maps" emits a silent widget_response — the engine
   sees it; the chat doesn't. Reopening the sheet stays valid; the
   widget never enters `completed` (informational variant).
   ─────────────────────────────────────────────────────────────── */

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return ''
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return ''
  if (meters < 950) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} km`
}

const TURN_ICON = {
  straight: ArrowUp,
  left:     ArrowLeft,
  right:    ArrowRight,
  arrive:   Flag,
}

function buildDeepLink({ origin, destination, template }) {
  if (template) {
    return template
      .replace('{olat}', origin.lat)
      .replace('{olng}', origin.lng)
      .replace('{dlat}', destination.lat)
      .replace('{dlng}', destination.lng)
  }
  /* Apple/Android both honour the `maps:` scheme with a `daddr`
     parameter; iOS additionally supports `saddr`. Fallback
     universal URL works on any browser. */
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`
}

export function DirectionsBody({ payload, requestClose, onComplete, closeBtnRef }) {
  const origin = payload?.origin ?? null
  const destination = payload?.destination ?? null
  const polylinePoints = payload?.polyline ?? []
  const steps = payload?.steps ?? []
  const distanceM = payload?.distance_m ?? null
  const durationS = payload?.duration_s ?? null
  const deepLinkTemplate = payload?.deep_link_template ?? null

  const [opened, setOpened] = useState(false)

  const fitBounds = useMemo(() => {
    if (!polylinePoints.length) {
      if (origin && destination) return [[origin.lat, origin.lng], [destination.lat, destination.lng]]
      return null
    }
    return polylinePoints
  }, [polylinePoints, origin, destination])

  const center = useMemo(() => {
    if (origin && destination) {
      return [
        (origin.lat + destination.lat) / 2,
        (origin.lng + destination.lng) / 2,
      ]
    }
    return [
      payload?.center_lat ?? 12.9716,
      payload?.center_lng ?? 77.5946,
    ]
  }, [origin, destination, payload?.center_lat, payload?.center_lng])

  const markers = useMemo(() => {
    const out = []
    if (origin) {
      out.push({
        id: 'origin',
        lat: origin.lat,
        lng: origin.lng,
        kind: 'dot',
        title: origin.label,
      })
    }
    if (destination) {
      out.push({
        id: 'dest',
        lat: destination.lat,
        lng: destination.lng,
        kind: 'pin',
        title: destination.label,
      })
    }
    return out
  }, [origin, destination])

  const polyline = useMemo(() => {
    if (polylinePoints.length < 2) return null
    return {
      id: 'route',
      points: polylinePoints,
      tone: 'brand',
      weight: 5,
      className: styles.routeAnimated,
    }
  }, [polylinePoints])

  /* Hover / focus on a step row highlights the matching slice of the
     polyline. Sandbox payload doesn't carry an explicit step→points
     index map, so we partition the polyline evenly across the step
     count — close enough for the fixture data, and the same heuristic
     a future routing-API integration would refine via per-step
     `geometry_indices`. Each slice overlaps its neighbours by one
     point so adjacent steps share their seam (no visual gap). */
  const [activeStepIdx, setActiveStepIdx] = useState(null)
  const stepSlices = useMemo(() => {
    if (polylinePoints.length < 2 || steps.length === 0) return []
    const N = polylinePoints.length
    return steps.map((_, i) => {
      const start = Math.floor((i * (N - 1)) / steps.length)
      const end   = Math.min(N, Math.ceil(((i + 1) * (N - 1)) / steps.length) + 1)
      return polylinePoints.slice(start, end)
    })
  }, [polylinePoints, steps])

  const polylineHighlight = useMemo(() => {
    if (activeStepIdx == null) return null
    const slice = stepSlices[activeStepIdx]
    if (!slice || slice.length < 2) return null
    return {
      id: `route-step-${activeStepIdx}`,
      points: slice,
      tone: 'brand',
      weight: 8,
    }
  }, [activeStepIdx, stepSlices])

  const handleOpenMaps = useCallback(() => {
    if (!origin || !destination) return
    const url = buildDeepLink({
      origin,
      destination,
      template: deepLinkTemplate,
    })
    /* Open in a new tab so the chat session doesn't navigate away.
       The maps: scheme will be intercepted by the OS where supported;
       browsers that don't recognise it fall back to a 404 in the new
       tab, which is benign (the user can still copy the link). */
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    setOpened(true)
    onComplete?.({
      origin_lat: origin.lat,
      origin_lng: origin.lng,
      origin_label: origin.label,
      destination_lat: destination.lat,
      destination_lng: destination.lng,
      destination_label: destination.label,
      distance_m: distanceM,
      duration_s: durationS,
      deep_link: url,
    })
  }, [origin, destination, deepLinkTemplate, distanceM, durationS, onComplete])

  const subtitle = (() => {
    const bits = []
    if (Number.isFinite(distanceM)) bits.push(formatDistance(distanceM))
    if (Number.isFinite(durationS)) bits.push(`approx. ${formatDuration(durationS)}`)
    return bits.length ? bits.join(' · ') : null
  })()

  const headerTitle = (origin?.label && destination?.label)
    ? `${origin.label} → ${destination.label}`
    : (payload?.title ?? 'Directions')

  return (
    <>
      <SheetHeader
        icon={Navigation}
        title={headerTitle}
        subtitle={subtitle}
        requestClose={requestClose}
        closeBtnRef={closeBtnRef}
      />

      <div className={shellStyles.mapRegion}>
        <MapSurface
          center={center}
          zoom={payload?.initial_zoom ?? 13}
          markers={markers}
          polyline={polyline}
          polylineHighlight={polylineHighlight}
          fitBounds={fitBounds}
          ariaLabel={headerTitle}
        />
      </div>

      <div className={cx(shellStyles.footer, styles.footer)}>
        {steps.length > 0 && (
          <>
            <span className={styles.stepsEyebrow}>Step-by-step</span>
            <ol className={styles.stepList}>
              {steps.map((step, idx) => {
                const Turn = TURN_ICON[step.turn_type] ?? ArrowRight
                const isArrival = step.turn_type === 'arrive'
                const isActive = activeStepIdx === idx
                return (
                  <li
                    key={idx}
                    className={cx(
                      styles.stepRow,
                      isActive && styles.stepRow_active,
                      isArrival && styles.stepRow_arrival,
                    )}
                    style={{ animationDelay: `${Math.min(idx, 7) * 60}ms` }}
                    onMouseEnter={() => setActiveStepIdx(idx)}
                    onMouseLeave={() => setActiveStepIdx((cur) => (cur === idx ? null : cur))}
                    onFocus={() => setActiveStepIdx(idx)}
                    onBlur={() => setActiveStepIdx((cur) => (cur === idx ? null : cur))}
                    tabIndex={0}
                  >
                    <span className={styles.stepIndex}>{idx + 1}</span>
                    <span className={cx(styles.stepIcon, isArrival && styles.stepIcon_arrival)}>
                      <Turn size={14} strokeWidth={2} aria-hidden />
                    </span>
                    <span className={styles.stepInstruction}>{step.instruction}</span>
                    {Number.isFinite(step.distance_m) && (
                      <span className={styles.stepDistance}>{formatDistance(step.distance_m)}</span>
                    )}
                  </li>
                )
              })}
            </ol>
          </>
        )}

        <Button
          variant="primary"
          className={shellStyles.footerCta}
          onClick={handleOpenMaps}
          disabled={!origin || !destination}
        >
          <span>{opened ? 'Reopen in Maps' : 'Open in Maps'}</span>
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </>
  )
}

export default DirectionsBody
