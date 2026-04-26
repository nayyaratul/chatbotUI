import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react'
import styles from './mediaPlayerControls.module.scss'

/* ─── MediaPlayerControls ─────────────────────────────────────────────
   Shared controls primitive used by Audio Player (#25) and Video
   Player (#16). The whole "play button + slim track + luminous thumb
   + speed pill" row lives here so the two widgets stay visually
   identical. Parent widgets render their own §2 header + (for video)
   the media region, and embed this component for the bottom row.

   Owns:
     • currentTime / duration / playProgress / isPlaying / speedIndex
     • RAF-driven playhead update reading mediaRef.current.currentTime
     • Pointer events on the bar (drag-to-scrub via setPointerCapture)
     • Keyboard ±5s seek on the play button
     • Speed pill cycling + imperative pulse keyframe
     • Listened-tone + error-state visual classes (driven by props)

   Does NOT own:
     • The <audio>/<video> element itself — parent renders it with
       its own ref (passed in via mediaRef). Parent decides where it
       lives in the DOM (audio has nowhere visual; video lives in a
       separate poster/scrim region above this row).
     • Completion-edge response payload — parent owns the onReply
       fire via the onCompletionEdge callback.
     • Variant-specific logic (enforced-mode seek clamp, total-
       watch-time accumulator) — parent passes maxSeekFraction +
       enforceSpeedLock + onPlayChange to drive it.

   Props:
     mediaRef              ref to the <audio> or <video> element
     speeds                playback speed array (default [1, 1.5, 2])
     enforceSpeedLock      hide cycling pill, render a locked 1×
                           indicator. Used by Video Player's
                           "enforced" compliance variant.
     maxSeekFraction       clamp seek position to [0, this fraction]
                           (default 1). Used by enforced video to
                           prevent skipping past the max watched
                           point.
     completed             once true, applies the listened tone to
                           the row + bar + thumb; replaces the meta
                           time line with a Listened chip; play
                           button swaps Play → RotateCcw. Sticky.
     hasError              <audio>/<video> failed to load. Disables
                           controls; replaces meta line with an
                           error message.
     completionThreshold   default 0.95. Fraction at which
                           onCompletionEdge fires for the first time.
     onCompletionEdge      ()=>void — called once the first time
                           playProgress crosses completionThreshold
                           (or `ended` fires, whichever lands first).
                           Parent fires onReply from this.
     onPlayChange          (playing: boolean)=>void — called on every
                           play/pause transition. Parent uses for
                           telemetry (total_watch_time_seconds,
                           hasPlayed flag, etc.).
     listenedLabel         label inside the listened chip (default
                           'Listened'). Video Player uses 'Completed'.
     mediaSlot             optional ReactNode rendered ABOVE the
                           controls row inside the same bordered
                           player-row chrome. Video Player passes its
                           16:9 media region (poster + video element
                           + play overlay + completion chip); Audio
                           Player omits this prop so the player row
                           is just the controls.
     trailing              ReactNode rendered at the right end of the
                           controls row, after the speed pill. Used
                           by Video Player for the Fullscreen button.

   ──────────────────────────────────────────────────────────────── */

const DEFAULT_SPEEDS = [1, 1.5, 2]

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* Imperatively re-fire a CSS keyframe on a DOM element by removing
   the class, forcing a reflow, then re-adding it. Used for the
   thumb-snap halo expansion + speed pill pulse — keeps focus on the
   live element (no React `key=` remount) while still re-firing the
   entry animation per click. */
function flashKeyframe(el, className) {
  if (!el || !className) return
  el.classList.remove(className)
  // eslint-disable-next-line no-unused-expressions
  void el.offsetWidth
  el.classList.add(className)
}

export function MediaPlayerControls({
  mediaRef,
  speeds: speedsProp,
  enforceSpeedLock = false,
  maxSeekFraction = 1,
  completed = false,
  hasError = false,
  completionThreshold = 0.95,
  onCompletionEdge,
  onPlayChange,
  listenedLabel = 'Listened',
  mediaSlot,
  trailing,
}) {
  const speeds = Array.isArray(speedsProp) && speedsProp.length > 0
    ? speedsProp
    : DEFAULT_SPEEDS

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playProgress, setPlayProgress] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(0)

  const playRafRef = useRef(null)
  const speedLabelRef = useRef(null)
  const progressThumbRef = useRef(null)
  /* Drag-scrub gate. `true` between pointerdown and pointerup on
     the progress bar; pointermove only seeks while this is set, so
     hover-by-pointer doesn't accidentally scrub. */
  const isDraggingRef = useRef(false)
  /* Synchronous gate so the completion edge fires exactly once
     across racing paths (RAF threshold, `ended` event, seek-past-
     threshold, keyboard seek-past-threshold). */
  const completedEdgeRef = useRef(false)
  const mountedRef = useRef(true)

  /* Stash the latest prop callbacks in refs so the audio-event
     listeners (attached once via useEffect) always invoke the
     newest version without needing to rebind on every prop change. */
  const onCompletionEdgeRef = useRef(onCompletionEdge)
  const onPlayChangeRef = useRef(onPlayChange)
  useEffect(() => {
    onCompletionEdgeRef.current = onCompletionEdge
    onPlayChangeRef.current = onPlayChange
  })

  /* Mirror props in refs so the RAF tick reads the latest values
     without restarting on every prop change. */
  const completionThresholdRef = useRef(completionThreshold)
  const maxSeekFractionRef = useRef(maxSeekFraction)
  useEffect(() => {
    completionThresholdRef.current = completionThreshold
    maxSeekFractionRef.current = maxSeekFraction
  })

  const stopPlayRaf = useCallback(() => {
    if (playRafRef.current) {
      cancelAnimationFrame(playRafRef.current)
      playRafRef.current = null
    }
  }, [])

  const fireCompletionEdge = useCallback(() => {
    if (completedEdgeRef.current) return
    if (!mountedRef.current) return
    completedEdgeRef.current = true
    onCompletionEdgeRef.current?.()
  }, [])

  /* ─── Audio/video element event listeners ────────────────────────
     Attached once on mount via addEventListener (NOT React JSX
     event props) because the <audio>/<video> element is rendered
     by the parent, not by this component. The mediaRef is stable
     for the lifetime of the parent widget so this effect runs
     exactly once. */
  useEffect(() => {
    mountedRef.current = true

    const el = mediaRef?.current
    if (!el) return undefined

    const onPlay = () => {
      if (!mountedRef.current) return
      stopPlayRaf()
      setIsPlaying(true)
      onPlayChangeRef.current?.(true)
      const tick = () => {
        if (!mountedRef.current || !playRafRef.current) return
        const node = mediaRef.current
        if (!node) return
        const dur = node.duration || 0
        const progress = dur > 0 ? Math.min(1, node.currentTime / dur) : 0
        setPlayProgress(progress)
        setCurrentTime(node.currentTime || 0)
        if (progress >= completionThresholdRef.current) fireCompletionEdge()
        if (progress >= 1) return
        playRafRef.current = requestAnimationFrame(tick)
      }
      playRafRef.current = requestAnimationFrame(tick)
    }

    const onPause = () => {
      if (!mountedRef.current) return
      setIsPlaying(false)
      onPlayChangeRef.current?.(false)
      stopPlayRaf()
    }

    const onEnded = () => {
      if (!mountedRef.current) return
      setIsPlaying(false)
      onPlayChangeRef.current?.(false)
      setPlayProgress(1)
      stopPlayRaf()
      /* Belt-and-suspenders: `ended` always lands at 100%, so this
         is a guaranteed completion edge. Idempotent against the
         RAF having already fired it. */
      fireCompletionEdge()
    }

    const onLoadedMetadata = () => {
      if (!mountedRef.current) return
      const d = el.duration
      if (Number.isFinite(d) && d > 0) setDuration(d)
    }

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    el.addEventListener('loadedmetadata', onLoadedMetadata)

    /* Pick up duration if metadata already loaded before mount. */
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setDuration(el.duration)
    }

    return () => {
      mountedRef.current = false
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      stopPlayRaf()
    }
  }, [mediaRef, stopPlayRaf, fireCompletionEdge])

  /* Apply playbackRate whenever the speed index changes. RAF doesn't
     need to restart — playProgress is sourced from currentTime,
     which scales with playbackRate automatically. */
  useEffect(() => {
    const el = mediaRef?.current
    if (!el) return
    const next = speeds[speedIndex] ?? 1
    el.playbackRate = next
  }, [mediaRef, speedIndex, speeds])

  /* ─── Play / pause ───────────────────────────────────────────── */

  const handlePlayPause = useCallback(() => {
    const el = mediaRef?.current
    if (!el) return
    if (el.paused) {
      /* Replay-from-ended: HTML5 doesn't mandate auto-restart when
         play() is called on a media element whose currentTime is
         at duration. Be explicit so replay always feels the same. */
      if (el.ended || (el.duration > 0 && el.currentTime >= el.duration - 0.05)) {
        el.currentTime = 0
      }
      el.play().catch(() => { /* autoplay policy ok after gesture */ })
    } else {
      el.pause()
    }
  }, [mediaRef])

  const handlePlayKeyDown = useCallback((e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const el = mediaRef?.current
    if (!el) return
    const dur = el.duration || duration
    if (!Number.isFinite(dur) || dur <= 0) return

    e.preventDefault()
    const delta = e.key === 'ArrowRight' ? 5 : -5
    const max = maxSeekFractionRef.current * dur
    const next = Math.max(0, Math.min(max, (el.currentTime || 0) + delta))
    el.currentTime = next
    const fraction = next / dur
    setPlayProgress(fraction)
    setCurrentTime(next)
    if (fraction >= completionThresholdRef.current) fireCompletionEdge()
    flashKeyframe(progressThumbRef.current, styles.progressThumbSnap)
  }, [mediaRef, duration, fireCompletionEdge])

  /* ─── Drag-to-scrub on the progress bar ──────────────────────── */

  const applyPointerSeek = useCallback((clientX, container) => {
    const el = mediaRef?.current
    if (!el || !container) return
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) return
    let fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    /* Clamp at maxSeekFraction (used by enforced video to prevent
       skipping past the max watched point). */
    if (fraction > maxSeekFractionRef.current) {
      fraction = maxSeekFractionRef.current
    }
    const dur = el.duration || duration
    if (!Number.isFinite(dur) || dur <= 0) return

    el.currentTime = fraction * dur
    setPlayProgress(fraction)
    setCurrentTime(fraction * dur)
    if (fraction >= completionThresholdRef.current) fireCompletionEdge()
  }, [mediaRef, duration, fireCompletionEdge])

  const handleProgressPointerDown = useCallback((e) => {
    if (hasError) return
    const el = mediaRef?.current
    const container = e.currentTarget
    if (!el || !container) return

    if (e.pointerId !== undefined && container.setPointerCapture) {
      try { container.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    isDraggingRef.current = true

    applyPointerSeek(e.clientX, container)
    flashKeyframe(progressThumbRef.current, styles.progressThumbSnap)

    if (el.paused) {
      el.play().catch(() => { /* autoplay policy ok after gesture */ })
    }
  }, [hasError, mediaRef, applyPointerSeek])

  const handleProgressPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    applyPointerSeek(e.clientX, e.currentTarget)
  }, [applyPointerSeek])

  const handleProgressPointerEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  /* ─── Speed cycle ────────────────────────────────────────────── */

  const handleSpeedCycle = useCallback(() => {
    setSpeedIndex((i) => (i + 1) % speeds.length)
    flashKeyframe(speedLabelRef.current, styles.speedLabelPulse)
  }, [speeds.length])

  /* ─── Render ─────────────────────────────────────────────────── */

  const currentSpeed = speeds[speedIndex] ?? 1
  const speedLabel = `${currentSpeed}×`
  const lockedSpeedLabel = `${speeds[0] ?? 1}×`

  const playLabel = hasError ? 'Audio unavailable'
    : isPlaying ? 'Pause'
      : completed ? 'Replay'
        : 'Play'

  return (
    <div className={cx(
      styles.playerRow,
      hasError && styles.playerRowError,
      completed && styles.playerRowListened,
    )}>
      {mediaSlot}
      <div className={styles.controlsRow}>
        <button
          type="button"
          className={cx(styles.playBtn, hasError && styles.playBtnDisabled)}
          onClick={handlePlayPause}
          onKeyDown={handlePlayKeyDown}
          disabled={hasError}
          aria-label={playLabel}
        >
          {isPlaying
            ? <Pause size={18} strokeWidth={2.25} aria-hidden="true" />
            : completed
              ? <RotateCcw size={18} strokeWidth={2.25} aria-hidden="true" />
              : <Play size={18} strokeWidth={2.25} aria-hidden="true" />}
        </button>

        <div className={styles.track}>
        <button
          type="button"
          className={cx(
            styles.progressBar,
            completed && styles.progressBarListened,
            hasError && styles.progressBarDisabled,
          )}
          style={{ '--play-progress': hasError ? 0 : playProgress }}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerEnd}
          onPointerCancel={handleProgressPointerEnd}
          disabled={hasError}
          /* Removed from keyboard focus order — Enter on a focused
             bar would seek to position 0 (no clientX in keyboard
             events). Keyboard scrubbing lives on the play button's
             ArrowLeft/Right handler instead. */
          tabIndex={-1}
          aria-label="Seek position"
        >
          <span className={styles.progressFill} aria-hidden="true" />
          <span
            ref={progressThumbRef}
            className={cx(
              styles.progressThumb,
              isPlaying && styles.progressThumbPlaying,
            )}
            aria-hidden="true"
          />
        </button>

        <div className={styles.trackMeta}>
          {hasError ? (
            <span className={styles.trackError}>Unable to load</span>
          ) : completed ? (
            <span className={styles.listenedChip}>
              <span className={styles.listenedChipIcon} aria-hidden="true">
                <CheckCircle2 size={12} strokeWidth={2.5} />
              </span>
              {listenedLabel}
            </span>
          ) : (
            <>
              <span className={styles.trackTimeStart}>
                {formatTime(currentTime)}
              </span>
              <span className={styles.trackTimeEnd}>
                {formatTime(duration)}
              </span>
            </>
          )}
        </div>
      </div>

        {enforceSpeedLock ? (
          <span
            className={cx(styles.speedBtn, styles.speedBtnLocked)}
            aria-label={`Speed locked at ${lockedSpeedLabel}`}
          >
            <span className={styles.speedLabel}>{lockedSpeedLabel}</span>
          </span>
        ) : (
          <button
            type="button"
            className={styles.speedBtn}
            onClick={handleSpeedCycle}
            disabled={hasError}
            aria-label={`Playback speed ${speedLabel}, tap to change`}
          >
            <span ref={speedLabelRef} className={styles.speedLabel}>
              {speedLabel}
            </span>
          </button>
        )}

        {trailing}
      </div>
    </div>
  )
}
