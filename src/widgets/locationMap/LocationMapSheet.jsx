import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import cx from 'classnames'
import {
  MapPin,
  Compass,
  ShieldCheck,
  ShieldAlert,
  Navigation,
  X as XIcon,
} from 'lucide-react'
import { MapSurface } from './MapSurface.jsx'
import styles from './locationMapSheet.module.scss'

/* ─── LocationMapSheet — shared shell + variant-body dispatch ────
   Same pattern as EmbeddedWebviewSheet / SignatureSheet:
     - Portaled into #chat-modal-root.
     - Three-phase animation: 'entering' → 'open' → 'exiting'.
     - Single in-flight close guard (closingRef).
     - Scrim click + Escape both request close.
     - Initial focus moves to the close button on `open`.

   The shell owns: scrim, sheet card, animation phases, close handling.
   Bodies own: header content (via SheetHeader helper), map mount,
   footer body, CTA. Each body is a self-contained component
   imported by the BodySwitch below.

   Region 5 ships only the shell + a generic body fallback
   (MapSurface at the payload's center/zoom + a "coming soon" footer).
   Regions 6–9 each register their variant-specific body in the
   switch.
   ─────────────────────────────────────────────────────────────── */

const SHEET_ANIM_DURATION = 360   /* matches transform 320ms + 40ms safety */

/* Variant icon table — bodies that need tone-aware variants
   (geofence inside vs outside) override locally. */
const VARIANT_ICON = {
  pin_drop:      MapPin,
  pin_drop_cold: MapPin,
  nearby_jobs:   Compass,
  geofence:      ShieldCheck,
  directions:    Navigation,
}

/* Re-exported for body components — keeps icon imports centralised
   so adding a variant only changes one map. */
export const VARIANT_ICONS = {
  ...VARIANT_ICON,
  geofence_outside: ShieldAlert,
}

/* ── Sheet shell (portaled) ─────────────────────────────────── */

export function LocationMapSheet({ payload, onClose, onComplete }) {
  const variant = payload?.variant ?? 'pin_drop'
  const [phase, setPhase] = useState('entering')
  const closingRef = useRef(false)
  const closeBtnRef = useRef(null)

  const portalTarget = typeof document !== 'undefined'
    ? document.getElementById('chat-modal-root')
    : null

  /* Two RAFs so initial styles paint before the transition kicks in.
     Cancelling both on unmount avoids setState-on-unmounted. */
  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setPhase('open'))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  useEffect(() => {
    if (phase !== 'open') return
    closeBtnRef.current?.focus({ preventScroll: true })
  }, [phase])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setPhase('exiting')
    window.setTimeout(onClose, SHEET_ANIM_DURATION)
  }, [onClose])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  if (!portalTarget) return null

  return createPortal(
    <div
      className={cx(styles.layer, styles[`layer_${phase}`])}
      role="dialog"
      aria-modal="true"
      aria-label={payload?.title ?? 'Map'}
    >
      <div className={styles.scrim} onClick={requestClose} aria-hidden="true" />
      <div className={styles.card}>
        <BodySwitch
          payload={payload}
          variant={variant}
          requestClose={requestClose}
          onComplete={onComplete}
          closeBtnRef={closeBtnRef}
        />
      </div>
    </div>,
    portalTarget,
  )
}

/* ── Variant body dispatch ────────────────────────────────────
   Each body gets full-shell control inside the sheet card:
   header, optional second-row, map region, footer body, CTA.
   The shell only enforces the portal/scrim/animation envelope.

   Region 5 routes every variant to GenericBody (MapSurface +
   placeholder footer). Regions 6–9 each register their dedicated
   body in this switch.                                          */

import { PinDropBody }    from './bodies/PinDropBody.jsx'
import { NearbyJobsBody } from './bodies/NearbyJobsBody.jsx'

function BodySwitch({ payload, variant, requestClose, onComplete, closeBtnRef }) {
  const props = { payload, requestClose, onComplete, closeBtnRef }
  switch (variant) {
    case 'pin_drop':
    case 'pin_drop_cold':
      return <PinDropBody {...props} />
    case 'nearby_jobs':
      return <NearbyJobsBody {...props} />
    /* Real bodies for the remaining variants land in regions 8–9. */
    default: return <GenericBody {...props} />
  }
}

/* ── Shared SheetHeader helper ────────────────────────────────
   Bodies use this to keep the header chrome consistent. The
   `tone` prop drives the band background + icon colour for
   geofence (success when inside, warning when outside). */

export function SheetHeader({
  icon: Icon = MapPin,
  title,
  subtitle,
  tone = 'neutral',     /* 'neutral' | 'success' | 'warning' | 'error' */
  requestClose,
  closeBtnRef,
}) {
  return (
    <header className={cx(styles.header, styles[`header_${tone}`])}>
      <div className={styles.headerLeft}>
        <span className={styles.headerIcon}>
          <Icon size={16} strokeWidth={2} aria-hidden />
        </span>
        <div className={styles.headerText}>
          <h3 className={styles.headerTitle}>{title}</h3>
          {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
        </div>
      </div>
      <button
        ref={closeBtnRef}
        type="button"
        className={styles.headerClose}
        onClick={requestClose}
        aria-label="Close"
      >
        <XIcon size={16} strokeWidth={2} aria-hidden />
      </button>
    </header>
  )
}

/* ── Generic body — used for variants without a dedicated body
       (and as a safety net during region progression). Renders the
       MapSurface at the payload's center/zoom + a placeholder
       footer with a disabled CTA. ───────────────────────────── */

function GenericBody({ payload, requestClose, closeBtnRef }) {
  const Icon = VARIANT_ICON[payload?.variant] ?? MapPin
  const center = [
    payload?.center_lat ?? 12.9716,
    payload?.center_lng ?? 77.5946,
  ]
  const zoom = payload?.initial_zoom ?? 15

  return (
    <>
      <SheetHeader
        icon={Icon}
        title={payload?.title ?? 'Map'}
        subtitle={payload?.description ?? null}
        requestClose={requestClose}
        closeBtnRef={closeBtnRef}
      />

      <div className={styles.mapRegion}>
        <MapSurface
          center={center}
          zoom={zoom}
          ariaLabel={payload?.title}
        />
      </div>

      <div className={styles.footer}>
        <p className={styles.footerNote}>Body coming soon.</p>
      </div>
    </>
  )
}

export default LocationMapSheet
