import { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import {
  Compass,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Locate,
  LocateFixed,
  LocateOff,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { MapSurface } from '../MapSurface.jsx'
import { SheetHeader } from '../LocationMapSheet.jsx'
import { useGeolocation } from '../useGeolocation.js'
import { haversineMeters } from '../geocoder.js'
import shellStyles from '../locationMapSheet.module.scss'
import styles from './nearbyJobsBody.module.scss'

/* ─── NearbyJobsBody ─────────────────────────────────────────────
   Multi-pin selector. Each job is a brand-60 lollipop on the map
   with a small distance-label chip above; the user's GPS position
   is the brand-60 pulsing dot. Tapping a pin or list row selects
   the corresponding job; CTA enables on selection.

   Bottom panel is a "peeking sheet": collapsed shows the selected
   row + a swipe handle; expanded shows the full scrollable list.

   Filter pill row sits in the second row above the map. Region 16
   wires real predicates; region 7 ships the 'all' default + uses
   the payload's filters as visual scaffold.

   Region 11 wraps onComplete into the widget_response shape.
   ─────────────────────────────────────────────────────────────── */

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return ''
  if (meters < 950) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 9500 ? 1 : 0)} km`
}

export function NearbyJobsBody({ payload, requestClose, onComplete, closeBtnRef }) {
  const jobs = payload?.jobs ?? []
  const filters = payload?.filters?.length ? payload.filters : [{ id: 'all', label: 'All', predicate_id: 'all' }]
  const [activeFilter, setActiveFilter] = useState(filters[0]?.id ?? 'all')
  const [selectedId, setSelectedId] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const geo = useGeolocation()

  /* Compute live distance (haversine) when GPS granted, else fall
     back to the payload-provided hint. Sort ascending. */
  const decoratedJobs = useMemo(() => {
    const userPos = geo.position
    return jobs
      .map((j) => ({
        ...j,
        distance_m: userPos
          ? haversineMeters(userPos, { lat: j.lat, lng: j.lng })
          : (j.distance_m_hint ?? null),
      }))
      .sort((a, b) => {
        const aD = a.distance_m ?? Infinity
        const bD = b.distance_m ?? Infinity
        return aD - bD
      })
  }, [jobs, geo.position])

  /* Filter — region 16 swaps in real predicates by predicate_id.
     Region 7 supports only 'all'; everything else falls through. */
  const filteredJobs = useMemo(() => {
    if (activeFilter === 'all') return decoratedJobs
    /* Placeholder — keeps the filter pills interactive without
       crashing on unknown predicates. */
    return decoratedJobs
  }, [decoratedJobs, activeFilter])

  const selected = filteredJobs.find((j) => j.id === selectedId) ?? null

  /* Auto-fit bounds to all visible job pins + user position so the
     viewport opens with everything in view. */
  const fitBounds = useMemo(() => {
    const points = filteredJobs.map((j) => [j.lat, j.lng])
    if (geo.position) points.push([geo.position.lat, geo.position.lng])
    if (points.length < 2) return null
    return points
  }, [filteredJobs, geo.position])

  const center = useMemo(() => [
    payload?.center_lat ?? 12.9716,
    payload?.center_lng ?? 77.5946,
  ], [payload?.center_lat, payload?.center_lng])

  const markers = useMemo(() => {
    const out = []
    for (const j of filteredJobs) {
      const isSel = j.id === selectedId
      out.push({
        id: `pin-${j.id}`,
        lat: j.lat,
        lng: j.lng,
        kind: 'pin',
        className: cx(isSel && styles.pinSelected),
        onClick: () => setSelectedId(j.id),
      })
      if (j.distance_m != null) {
        out.push({
          id: `lbl-${j.id}`,
          lat: j.lat,
          lng: j.lng,
          kind: 'distance_label',
          /* Lift the chip ~36px above the pin's lat/lng anchor
             (pins are 30px tall; chip itself ~22px). */
          iconAnchor: [22, 60],
          iconSize: [44, 22],
          html: formatDistance(j.distance_m),
        })
      }
    }
    return out
  }, [filteredJobs, selectedId])

  const userLocation = useMemo(() => {
    if (!geo.position) return null
    return {
      lat: geo.position.lat,
      lng: geo.position.lng,
      accuracy_m: geo.accuracy ?? null,
    }
  }, [geo.position, geo.accuracy])

  const handleRowClick = useCallback((id) => {
    setSelectedId(id)
    setExpanded(false)
  }, [])

  const handleConfirm = useCallback(() => {
    if (!selected) return
    onComplete?.({
      job_id: selected.id,
      job_label: selected.label,
      distance_m: Math.round(selected.distance_m ?? 0),
      user_lat: geo.position?.lat ?? null,
      user_lng: geo.position?.lng ?? null,
    })
  }, [selected, geo.position, onComplete])

  const FabIcon =
    geo.permission === 'denied'      ? LocateOff
    : geo.permission === 'unsupported' ? LocateOff
    : geo.position                     ? LocateFixed
    : Locate

  const fabDisabled = geo.permission === 'unsupported' || geo.permission === 'denied'

  /* What rows show in the collapsed peek vs expanded. */
  const peekRows = selected ? [selected] : filteredJobs.slice(0, 1)
  const fullRows = filteredJobs

  return (
    <>
      <SheetHeader
        icon={Compass}
        title={payload?.title ?? 'Jobs near you'}
        subtitle={payload?.category ?? null}
        requestClose={requestClose}
        closeBtnRef={closeBtnRef}
      />

      {filters.length > 1 && (
        <div className={cx(shellStyles.secondRow, styles.filterRow)}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cx(styles.filterPill, activeFilter === f.id && styles.filterPill_active)}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className={shellStyles.mapRegion}>
        <MapSurface
          center={center}
          zoom={payload?.initial_zoom ?? 13}
          markers={markers}
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
            : 'Use my location'
          }
        >
          <FabIcon size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className={cx(shellStyles.footer, styles.footer)}>
        <button
          type="button"
          className={styles.peekHandle}
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse list' : 'Expand list'}
        >
          {expanded ? <ChevronDown size={14} strokeWidth={2} aria-hidden /> : <ChevronUp size={14} strokeWidth={2} aria-hidden />}
          <span>{expanded ? 'Hide list' : `Show all ${filteredJobs.length}`}</span>
        </button>

        <ul className={cx(styles.list, expanded && styles.list_expanded)} role="listbox">
          {(expanded ? fullRows : peekRows).map((j) => (
            <li key={j.id}>
              <button
                type="button"
                className={cx(styles.row, j.id === selectedId && styles.row_selected)}
                onClick={() => handleRowClick(j.id)}
                role="option"
                aria-selected={j.id === selectedId}
              >
                <div className={styles.rowText}>
                  <span className={styles.rowLabel}>{j.label}</span>
                  {j.sublabel && <span className={styles.rowSublabel}>{j.sublabel}</span>}
                </div>
                {j.distance_m != null && (
                  <span className={styles.rowDistance}>{formatDistance(j.distance_m)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {filteredJobs.length === 0 && (
          <p className={styles.emptyState}>No jobs match this filter.</p>
        )}

        <Button
          variant="primary"
          className={shellStyles.footerCta}
          onClick={handleConfirm}
          disabled={!selected}
        >
          <span>{selected ? 'Apply for this job' : 'Select a job'}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </>
  )
}

export default NearbyJobsBody
