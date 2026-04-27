import { useCallback, useEffect, useRef, useState } from 'react'

/* ─── useGeolocation ─────────────────────────────────────────────
   Shared hook for the LocationMap variants that need user position.
   Owns the permission lifecycle so each body doesn't reinvent it.

   Returns:
     permission : 'prompt' | 'granted' | 'denied' | 'unsupported'
     position   : { lat, lng } | null
     accuracy   : number (metres) | null
     error      : { code, message } | null
     request()  : single-shot getCurrentPosition; updates state
     watch()    : starts watchPosition; returns a cleanup function

   Edge cases handled:
     - navigator.geolocation absent → 'unsupported'
     - window.isSecureContext false → 'unsupported' (geolocation
       requires HTTPS; degrade so callers can fall back to map-based
       pinning instead of silently failing)
     - Permissions API queried where available to learn 'granted'
       vs 'denied' without prompting (Safari doesn't expose this for
       'geolocation' — falls back to 'prompt' until first request)
     - Component unmount with active watch → clearWatch ensures no
       leftover watcher draining battery
                                                                      */

const isClient       = typeof window !== 'undefined'
const isSecure       = isClient && window.isSecureContext === true
const hasGeolocation = isClient && typeof navigator !== 'undefined' && !!navigator.geolocation

const INITIAL_PERMISSION = (hasGeolocation && isSecure) ? 'prompt' : 'unsupported'

const PERMISSION_FROM_API = {
  granted: 'granted',
  denied:  'denied',
  prompt:  'prompt',
}

export function useGeolocation() {
  const [permission, setPermission] = useState(INITIAL_PERMISSION)
  const [position,   setPosition]   = useState(null)
  const [accuracy,   setAccuracy]   = useState(null)
  const [error,      setError]      = useState(null)

  const watchIdRef = useRef(null)

  /* Probe the Permissions API to refine prompt → granted/denied
     without prompting. Best-effort: not all browsers support
     'geolocation' as a permission name (Safari ignores it). */
  useEffect(() => {
    if (INITIAL_PERMISSION === 'unsupported') return undefined
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return undefined

    let cancelled = false
    let statusRef = null

    navigator.permissions.query({ name: 'geolocation' })
      .then((status) => {
        if (cancelled) return
        statusRef = status
        const next = PERMISSION_FROM_API[status.state] ?? 'prompt'
        setPermission(next)
        const onChange = () => {
          const updated = PERMISSION_FROM_API[status.state] ?? 'prompt'
          setPermission(updated)
        }
        status.addEventListener?.('change', onChange)
        statusRef._cleanup = () => status.removeEventListener?.('change', onChange)
      })
      .catch(() => {
        /* swallow — Permissions API rejected the query (e.g. older
           Safari). The hook still works via direct request(). */
      })

    return () => {
      cancelled = true
      statusRef?._cleanup?.()
    }
  }, [])

  const handleSuccess = useCallback((pos) => {
    setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    setAccuracy(typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null)
    setError(null)
    setPermission('granted')
  }, [])

  const handleError = useCallback((err) => {
    /* GeolocationPositionError codes:
         1 PERMISSION_DENIED · 2 POSITION_UNAVAILABLE · 3 TIMEOUT */
    setError({ code: err.code, message: err.message ?? 'Geolocation error' })
    if (err.code === 1) {
      setPermission('denied')
    }
  }, [])

  const request = useCallback(() => {
    if (INITIAL_PERMISSION === 'unsupported') return
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    })
  }, [handleSuccess, handleError])

  const watch = useCallback(() => {
    if (INITIAL_PERMISSION === 'unsupported') return () => undefined
    /* If a watch is already in flight, return a no-op cleanup so the
       caller pattern (`useEffect(() => watch(), [])`) doesn't double
       up watchers. The component-unmount cleanup below will tear the
       existing watch down. */
    if (watchIdRef.current != null) return () => undefined

    const id = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    })
    watchIdRef.current = id

    return () => {
      navigator.geolocation.clearWatch(id)
      if (watchIdRef.current === id) watchIdRef.current = null
    }
  }, [handleSuccess, handleError])

  useEffect(() => () => {
    if (watchIdRef.current != null && hasGeolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  return {
    permission,
    position,
    accuracy,
    error,
    request,
    watch,
  }
}

export default useGeolocation
