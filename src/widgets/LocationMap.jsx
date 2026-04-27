import { lazy, Suspense, useState } from 'react'
import cx from 'classnames'
import {
  MapPin,
  Compass,
  ShieldCheck,
  Navigation,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@nexus/atoms'
import styles from './locationMap.module.scss'

/* ─── Location Map Widget (#13) ──────────────────────────────────
   Interactive map with four use-case variants. Compact card sits in
   the chat stream with a variant-specific preview; tapping the CTA
   lifts a portaled sheet (FLIP from the mini-map) where the real
   picking happens. Built on Leaflet + OpenStreetMap raster tiles in
   sandbox; provider seam (MapSurface, useGeolocation, geocoder) sized
   for an ess-pwa lift to a keyed tile provider and real geocoding.

     pin_drop       — confirm or pick an address; user-attested via CTA
     pin_drop_cold  — same component, no initial_location pre-fill
     nearby_jobs    — multi-pin selector with peeking-sheet job list
     geofence       — inside/outside check-in gated by GPS accuracy
     directions     — read-only route + native-Maps deep-link hand-off

   See docs/superpowers/specs/2026-04-27-location-map-widget-design.md
   and …-regions.md for the implementation sequence.
   ─────────────────────────────────────────────────────────────── */

/* Lazy import — Leaflet (~140KB) + the four variant bodies live behind
   this boundary. The compact-card render path stays Leaflet-free; the
   bundle cost is paid only when the CTA opens the sheet. */
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
  directions:    ArrowUpRight,   /* signals "leaves the chat" */
}

function eyebrowText(variant, category) {
  const heads = {
    pin_drop:      'Location',
    pin_drop_cold: 'Location',
    nearby_jobs:   'Nearby',
    geofence:      'Check-in',
    directions:    'Directions',
  }
  const head = heads[variant] ?? 'Location'
  return category ? `${head} · ${category}` : head
}

export function LocationMap({ payload }) {
  const variant = payload?.variant ?? 'pin_drop'
  const Icon = VARIANT_ICONS[variant] ?? MapPin
  const CtaIcon = CTA_ICON[variant] ?? ArrowRight
  const ctaLabel = CTA_LABEL[variant] ?? 'Open map'

  /* Sheet open/close state — wired in region 1 so region 5 can plug
     in the real shell without restructuring. CTA stays disabled in
     region 1; region 5 enables it once the shell ships. */
  const [sheetOpen] = useState(false)

  return (
    <div className={cx(styles.card, styles[`variant_${variant}`])}>
      <header className={styles.header}>
        <span className={styles.iconBadge}>
          <Icon size={18} />
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

      {/* Body region — region 10 fills in per-variant previews
         (mini-map + variant-specific overlay / list / status / route).
         Region 1 ships a tinted placeholder so the §1 / §4 contract
         (24rem floor, even spacing) is observable end-to-end. */}
      <div className={styles.bodyPlaceholder} aria-hidden="true">
        <span className={styles.bodyPlaceholderIcon}>
          <Icon size={28} strokeWidth={1.75} />
        </span>
      </div>

      <Button
        variant="primary"
        className={styles.cta}
        disabled
        aria-disabled="true"
      >
        <span>{ctaLabel}</span>
        <CtaIcon size={16} />
      </Button>

      {sheetOpen && (
        <Suspense fallback={null}>
          <LocationMapSheet />
        </Suspense>
      )}
    </div>
  )
}

export default LocationMap
