/* ─── geocoder ───────────────────────────────────────────────────
   Provider seam — sandbox uses `search_fixtures` from the payload
   (substring match for forward, haversine-nearest for reverse).
   Production swaps this file to a keyed Mapbox / Nominatim adapter
   without touching the four variant body components.

   Async signatures match a real provider so the swap is one-file.
   ─────────────────────────────────────────────────────────────── */

const EARTH_RADIUS_M = 6371000

function toRad(deg) { return deg * Math.PI / 180 }

/* Great-circle distance between two lat/lng points, in metres.
   Sufficient accuracy for sub-100km picker work. */
export function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return EARTH_RADIUS_M * c
}

/* Forward geocode — match query against the fixture's `address`
   field. Substring (case-insensitive) on each whitespace-split token
   gives a more forgiving match than a single substring on the whole
   address. Each fixture's `score` (0..1) breaks ties when multiple
   match equally well. Returns up to `limit` results sorted by
   match-strength × score, descending. */
export function geocode(query, fixtures, { limit = 5 } = {}) {
  return new Promise((resolve) => {
    /* setTimeout(0) keeps the async contract honest — caller code
       (e.g. `await geocode(...)`) doesn't need to differentiate
       sandbox-sync from prod-async. */
    setTimeout(() => {
      const trimmed = (query ?? '').trim()
      if (!trimmed || !Array.isArray(fixtures) || fixtures.length === 0) {
        resolve([])
        return
      }

      const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
      const scored = fixtures
        .map((f) => {
          const haystack = (f.address ?? '').toLowerCase()
          const matches = tokens.filter((t) => haystack.includes(t)).length
          if (matches === 0) return null
          const matchRatio = matches / tokens.length
          const baseScore = typeof f.score === 'number' ? f.score : 0.5
          return { fixture: f, weight: matchRatio * (0.5 + 0.5 * baseScore) }
        })
        .filter(Boolean)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, limit)
        .map(({ fixture }) => ({
          lat: fixture.lat,
          lng: fixture.lng,
          address: fixture.address,
          address_components: fixture.address_components ?? null,
          source: 'search',
        }))

      resolve(scored)
    }, 0)
  })
}

/* Reverse geocode — find the nearest fixture by haversine distance.
   Returns null if no fixtures available. Real geocoders return a
   "no result" only beyond their coverage area, so a non-null result
   is the realistic sandbox default. */
export function reverseGeocode(lat, lng, fixtures) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!Array.isArray(fixtures) || fixtures.length === 0) {
        resolve(null)
        return
      }
      const target = { lat, lng }
      let best = null
      let bestDist = Infinity
      for (const f of fixtures) {
        const d = haversineMeters(target, f)
        if (d < bestDist) {
          bestDist = d
          best = f
        }
      }
      if (!best) {
        resolve(null)
        return
      }
      resolve({
        lat: best.lat,
        lng: best.lng,
        address: best.address,
        address_components: best.address_components ?? null,
        distance_m: Math.round(bestDist),
        source: 'reverse',
      })
    }, 0)
  })
}
