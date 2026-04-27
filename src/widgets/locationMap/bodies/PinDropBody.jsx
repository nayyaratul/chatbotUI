import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import {
  MapPin,
  Search,
  Locate,
  LocateFixed,
  LocateOff,
  ArrowRight,
  X as XIcon,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import { MapSurface } from '../MapSurface.jsx'
import { SheetHeader } from '../LocationMapSheet.jsx'
import { useGeolocation } from '../useGeolocation.js'
import { geocode, reverseGeocode } from '../geocoder.js'
import shellStyles from '../locationMapSheet.module.scss'
import styles from './pinDropBody.module.scss'

/* ─── PinDropBody ────────────────────────────────────────────────
   Confirm-an-address (with `initial_location`) or cold-pick
   (without). Search + tap + drag + GPS — all four interactions
   compose into a single pin. The CTA enables once a pin exists with
   a resolved address.

   State:
     pin            current { lat, lng, source } | null
     address        resolved formatted address  | null
     accuracy_m     metres                       | null
     resolving      boolean — reverse-geocode in flight
     query          search-bar text
     results        forward-geocode candidates  (visible when query)

   Source tracking: every code path that updates the pin tags it
   with a source ('search' | 'tap' | 'drag' | 'gps'). The final
   widget_response carries this verbatim.

   Region 11 wires the widget_response shape through `onComplete`.
   ─────────────────────────────────────────────────────────────── */

const REVERSE_GEOCODE_DEBOUNCE_MS = 500
const SEARCH_DEBOUNCE_MS = 220

export function PinDropBody({ payload, requestClose, onComplete, closeBtnRef }) {
  const initial = payload?.initial_location ?? null
  const fixtures = payload?.search_fixtures ?? []
  const enableGps = payload?.enable_gps !== false

  const [pin, setPin] = useState(
    initial ? { lat: initial.lat, lng: initial.lng, source: 'initial' } : null,
  )
  const [address, setAddress] = useState(initial?.address ?? null)
  const [accuracyM, setAccuracyM] = useState(initial?.accuracy_m ?? null)
  const [resolving, setResolving] = useState(false)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)

  const geo = useGeolocation()
  const reverseSeqRef = useRef(0)
  const searchSeqRef = useRef(0)

  /* ── Reverse-geocode whenever the pin moves (debounced) ───── */
  useEffect(() => {
    if (!pin) return
    /* Skip when the pin's address came from search/initial — we
       already have a fresh address for that location. */
    if (pin.source === 'search' || pin.source === 'initial') return

    setResolving(true)
    const seq = ++reverseSeqRef.current
    const t = window.setTimeout(async () => {
      const result = await reverseGeocode(pin.lat, pin.lng, fixtures)
      if (seq !== reverseSeqRef.current) return
      setAddress(result?.address ?? null)
      setResolving(false)
    }, REVERSE_GEOCODE_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [pin, fixtures])

  /* ── Forward-geocode the search input (debounced) ─────────── */
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return undefined
    }
    const seq = ++searchSeqRef.current
    const t = window.setTimeout(async () => {
      const r = await geocode(query, fixtures)
      if (seq !== searchSeqRef.current) return
      setResults(r)
      setShowResults(true)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query, fixtures])

  /* ── Promote a position fix to the pin ───────────────────── */
  const handleGpsRequest = useCallback(() => {
    geo.request()
  }, [geo])

  useEffect(() => {
    if (!geo.position) return
    setPin({ lat: geo.position.lat, lng: geo.position.lng, source: 'gps' })
    setAccuracyM(geo.accuracy ?? null)
  }, [geo.position, geo.accuracy])

  /* ── Map click handler (tap-to-pin) ──────────────────────── */
  const handleMapClick = useCallback(({ lat, lng }) => {
    setPin({ lat, lng, source: 'tap' })
    setAccuracyM(null)
  }, [])

  /* ── Pin drag-end ────────────────────────────────────────── */
  const handlePinDragEnd = useCallback(({ lat, lng }) => {
    setPin({ lat, lng, source: 'drag' })
    setAccuracyM(null)
  }, [])

  /* ── Search-result tap ───────────────────────────────────── */
  const handleResultPick = useCallback((r) => {
    setPin({ lat: r.lat, lng: r.lng, source: 'search' })
    setAddress(r.address)
    setAccuracyM(null)
    setQuery(r.address)
    setShowResults(false)
  }, [])

  const clearQuery = useCallback(() => {
    setQuery('')
    setResults([])
    setShowResults(false)
  }, [])

  /* ── Map props (memoized) ────────────────────────────────── */
  const center = useMemo(() => (
    pin
      ? [pin.lat, pin.lng]
      : [payload?.center_lat ?? 12.9716, payload?.center_lng ?? 77.5946]
  ), [pin, payload?.center_lat, payload?.center_lng])

  const markers = useMemo(() => {
    if (!pin) return []
    return [{
      id: 'pin',
      lat: pin.lat,
      lng: pin.lng,
      kind: 'pin',
      draggable: true,
      onDragEnd: handlePinDragEnd,
    }]
  }, [pin, handlePinDragEnd])

  const userLocation = useMemo(() => {
    /* Show the "you" dot only when GPS is granted and the pin is
       NOT already at the user's position (avoid stacking dot+pin). */
    if (!geo.position) return null
    if (pin && pin.source === 'gps') return null
    return {
      lat: geo.position.lat,
      lng: geo.position.lng,
      accuracy_m: geo.accuracy ?? null,
    }
  }, [geo.position, geo.accuracy, pin])

  /* ── FAB ────────────────────────────────────────────────── */
  const FabIcon =
    geo.permission === 'denied'      ? LocateOff
    : geo.permission === 'unsupported' ? LocateOff
    : geo.position                     ? LocateFixed
    : Locate

  const fabDisabled = !enableGps || geo.permission === 'unsupported' || geo.permission === 'denied'

  /* ── CTA ────────────────────────────────────────────────── */
  const canConfirm = !!pin && !!address && !resolving
  const ctaLabel = initial ? 'Confirm location' : 'Use this location'

  const handleConfirm = useCallback(() => {
    if (!pin || !address) return
    onComplete?.({
      lat: pin.lat,
      lng: pin.lng,
      address,
      address_components: null,    /* region 16 fixtures carry these */
      accuracy_m: accuracyM,
      source: pin.source === 'initial' ? 'initial' : pin.source,
    })
  }, [pin, address, accuracyM, onComplete])

  return (
    <>
      <SheetHeader
        icon={MapPin}
        title={payload?.title ?? 'Confirm your address'}
        subtitle={payload?.category ?? null}
        requestClose={requestClose}
        closeBtnRef={closeBtnRef}
      />

      <div className={shellStyles.secondRow}>
        <div className={styles.searchBar}>
          <Search size={16} strokeWidth={2} aria-hidden />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            aria-label="Search address"
          />
          {query && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={clearQuery}
              aria-label="Clear search"
            >
              <XIcon size={14} strokeWidth={2} aria-hidden />
            </button>
          )}
        </div>

        {showResults && results.length > 0 && (
          <ul className={styles.searchResults} role="listbox">
            {results.map((r, idx) => (
              <li key={`${r.lat}-${r.lng}-${idx}`}>
                <button
                  type="button"
                  className={styles.searchResult}
                  onClick={() => handleResultPick(r)}
                  role="option"
                >
                  <MapPin size={14} strokeWidth={2} aria-hidden />
                  <span>{r.address}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {showResults && results.length === 0 && query.trim() && (
          <p className={styles.searchEmpty}>No matches in saved locations.</p>
        )}
      </div>

      <div className={shellStyles.mapRegion}>
        <MapSurface
          center={center}
          zoom={payload?.initial_zoom ?? 15}
          markers={markers}
          userLocation={userLocation}
          onMapClick={handleMapClick}
          ariaLabel={payload?.title}
        />

        {enableGps && (
          <button
            type="button"
            className={cx(styles.fab, fabDisabled && styles.fab_disabled)}
            onClick={handleGpsRequest}
            disabled={fabDisabled}
            aria-label={
              geo.permission === 'denied' ? 'Location unavailable'
              : geo.permission === 'unsupported' ? 'Location not supported'
              : 'Use my location'
            }
          >
            <FabIcon size={18} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      <div className={shellStyles.footer}>
        <div className={styles.addressRow}>
          <span className={styles.addressIcon}>
            <MapPin size={14} strokeWidth={2} aria-hidden />
          </span>
          <div className={styles.addressText}>
            <p className={styles.addressMain}>
              {resolving ? 'Looking up address…' : (address ?? 'Tap the map or search to set a location')}
            </p>
            <p className={styles.addressMeta}>
              {accuracyM != null
                ? `Accurate to ~${Math.round(accuracyM)} m · drag pin to fine-tune`
                : pin
                  ? 'Drag the pin to fine-tune'
                  : (geo.permission === 'denied' ? 'Location off — pin manually'
                    : geo.permission === 'unsupported' ? 'Location not supported in this browser'
                    : '')}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          className={shellStyles.footerCta}
          onClick={handleConfirm}
          disabled={!canConfirm}
        >
          <span>{ctaLabel}</span>
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </>
  )
}

export default PinDropBody
