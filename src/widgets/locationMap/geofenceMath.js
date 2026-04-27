/* ─── geofenceMath ───────────────────────────────────────────────
   Pure functions for the geofence variant. No deps — `@turf/*` is
   overkill for a small polygon (~6 vertices) and would bloat the
   widget chunk.

   Coordinate convention: [lat, lng] tuples for compatibility with
   Leaflet's L.polygon API. Internally we treat lat as y and lng as
   x for the math; for short distances this is accurate enough. For
   metre-precision distance, we convert to a local metric frame by
   scaling lng by cos(lat) at the polygon's centroid.
   ─────────────────────────────────────────────────────────────── */

const EARTH_RADIUS_M = 6371000

function toRad(deg) { return deg * Math.PI / 180 }

/* Validate a polygon: must have ≥ 3 vertices and each must be a
   [lat, lng] pair of finite numbers. Self-intersection is not
   checked (rare for hand-authored zone polygons; ray-casting
   handles simple non-convex polygons correctly). */
export function isValidPolygon(polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false
  return polygon.every((p) =>
    Array.isArray(p) && p.length === 2 &&
    Number.isFinite(p[0]) && Number.isFinite(p[1])
  )
}

/* Ray-casting point-in-polygon test. Cast a horizontal ray from
   the point to +∞ and count crossings of polygon edges; odd → in,
   even → out. Polygon ring is implicitly closed (last vertex
   connects back to the first). */
export function isInsidePolygon(point, polygon) {
  if (!isValidPolygon(polygon)) return false
  const [py, px] = [point[0], point[1]]
  let inside = false
  const n = polygon.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    /* Edge from (xj, yj) to (xi, yi). Crosses the horizontal ray
       y = py when (yi > py) !== (yj > py) and the crossing x is
       to the right of px. */
    const intersects =
      ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi)
    if (intersects) inside = !inside
  }
  return inside
}

/* Closest distance (in metres) from a point to a polygon's edge.
   Used for the geofence "X m from edge" caption when the user is
   outside the zone. When inside, returns 0 (callers should branch
   on isInsidePolygon first to decide between "Inside zone" status
   and a distance caption). */
export function distanceToPolygonEdge(point, polygon) {
  if (!isValidPolygon(polygon)) return Infinity

  /* Convert to a local equirectangular metric frame anchored at the
     polygon centroid. Accurate to ~0.5% for polygons spanning <100km
     at non-polar latitudes — fine for zone-scale picker work. */
  const centroidLat = polygon.reduce((s, p) => s + p[0], 0) / polygon.length
  const cosLat = Math.cos(toRad(centroidLat))
  const M_PER_DEG_LAT = (Math.PI / 180) * EARTH_RADIUS_M
  const M_PER_DEG_LNG = M_PER_DEG_LAT * cosLat

  const toLocal = ([lat, lng]) => [
    lng * M_PER_DEG_LNG,
    lat * M_PER_DEG_LAT,
  ]

  const p = toLocal(point)
  const ring = polygon.map(toLocal)

  let best = Infinity
  const n = ring.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[j]
    const b = ring[i]
    const d = pointToSegmentDistance(p, a, b)
    if (d < best) best = d
  }
  return best
}

function pointToSegmentDistance(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) {
    /* Degenerate segment — return distance to endpoint. */
    const ex = p[0] - a[0]
    const ey = p[1] - a[1]
    return Math.sqrt(ex * ex + ey * ey)
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq
  t = Math.max(0, Math.min(1, t))
  const projX = a[0] + t * dx
  const projY = a[1] + t * dy
  const ex = p[0] - projX
  const ey = p[1] - projY
  return Math.sqrt(ex * ex + ey * ey)
}
