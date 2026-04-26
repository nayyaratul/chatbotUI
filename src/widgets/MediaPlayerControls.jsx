import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Play, Pause, RotateCcw, CheckCircle2, Volume2, VolumeX } from 'lucide-react'
import styles from './mediaPlayerControls.module.scss'

/* ─── MediaPlayerControls ─────────────────────────────────────────────
   Shared controls primitive — just the row of buttons plus the slim
   track and the combined "current/total" time chip below it. This
   component does NOT render a card chrome around itself; the parent
   widget decides where the row lives:

     • Audio Player wraps it in a light bordered card so the row reads
       as a self-contained control surface.
     • Video Player positions it absolutely over the bottom of its 16:9
       media region, with a YouTube-style gradient scrim behind it for
       legibility against bright video content.

   Theme prop drives the colour vocabulary — 'light' uses brand-60
   chrome on white (audio); 'dark' uses translucent-black chrome with
   white glyphs on top of video.

   Owns:
     • currentTime / duration / playProgress / isPlaying / speedIndex
       / muted state
     • RAF-driven playhead update reading mediaRef.current.currentTime
     • Pointer events on the bar (drag-to-scrub via setPointerCapture)
     • Keyboard ±5s seek on the play button
     • Speed pill cycling + mute toggle
     • Listened-tone + error-state visual classes (driven by props)

   Does NOT own:
     • Card chrome, layout shell, or media region — parent renders.
     • Completion-edge response payload — parent owns the onReply
       fire via the onCompletionEdge callback.

   Props:
     mediaRef              ref to the <audio> or <video> element
     theme                 'light' (default) or 'dark'
     speeds                playback speed array (default [1, 1.5, 2])
     enforceSpeedLock      hide cycling pill, render a locked 1×
                           indicator. Used by Video Player's
                           "enforced" compliance variant.
     showVolume            (default true) render the mute/unmute
                           button. Hidden on mobile via CSS regardless
                           — desktop-only by design.
     maxSeekFraction       clamp seek position to [0, this fraction]
                           (default 1). Used by enforced video to
                           prevent skipping past the max watched
                           point.
     completed             once true, applies the listened tone to
                           the row + bar + thumb; replaces the time
                           chip with a Listened chip; play button
                           swaps Play → RotateCcw. Sticky.
     hasError              <audio>/<video> failed to load. Disables
                           controls; replaces time chip with an
                           error message.
     completionThreshold   default 0.95.
     onCompletionEdge      ()=>void — called once the first time
                           playProgress crosses completionThreshold
                           (or `ended` fires, whichever lands first).
                           Parent fires onReply from this.
     onPlayChange          (playing: boolean)=>void — called on every
                           play/pause transition.
     listenedLabel         label inside the listened chip (default
                           'Listened'). Video Player uses 'Completed'.
     trailing              ReactNode rendered at the right end of the
                           row, after the speed pill. Used by Video
                           Player for the Fullscreen button.

   ──────────────────────────────────────────────────────────────── */

const DEFAULT_SPEEDS = [1, 1.5, 2]

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m)}:${String(s).padStart(2, '0')}`
}

function flashKeyframe(el, className) {
  if (!el || !className) return
  el.classList.remove(className)
  // eslint-disable-next-line no-unused-expressions
  void el.offsetWidth
  el.classList.add(className)
}

export function MediaPlayerControls({
  mediaRef,
  theme = 'light',
  speeds: speedsProp,
  enforceSpeedLock = false,
  showVolume = true,
  maxSeekFraction = 1,
  completed = false,
  hasError = false,
  completionThreshold = 0.95,
  onCompletionEdge,
  onPlayChange,
  listenedLabel = 'Listened',
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
  const [muted, setMuted] = useState(false)

  const playRafRef = useRef(null)
  const speedLabelRef = useRef(null)
  const progressThumbRef = useRef(null)
  const isDraggingRef = useRef(false)
  const completedEdgeRef = useRef(false)
  const mountedRef = useRef(true)

  const onCompletionEdgeRef = useRef(onCompletionEdge)
  const onPlayChangeRef = useRef(onPlayChange)
  useEffect(() => {
    onCompletionEdgeRef.current = onCompletionEdge
    onPlayChangeRef.current = onPlayChange
  })

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

  /* ─── Audio/video element event listeners ─────────────────────── */
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
      fireCompletionEdge()
    }

    const onLoadedMetadata = () => {
      if (!mountedRef.current) return
      const d = el.duration
      if (Number.isFinite(d) && d > 0) setDuration(d)
    }

    const onVolumeChange = () => {
      if (!mountedRef.current) return
      setMuted(Boolean(el.muted))
    }

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    el.addEventListener('loadedmetadata', onLoadedMetadata)
    el.addEventListener('volumechange', onVolumeChange)

    if (Number.isFinite(el.duration) && el.duration > 0) {
      setDuration(el.duration)
    }
    setMuted(Boolean(el.muted))

    return () => {
      mountedRef.current = false
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('volumechange', onVolumeChange)
      stopPlayRaf()
    }
  }, [mediaRef, stopPlayRaf, fireCompletionEdge])

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

  /* ─── Drag-to-scrub ─────────────────────────────────────────── */

  const applyPointerSeek = useCallback((clientX, container) => {
    const el = mediaRef?.current
    if (!el || !container) return
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) return
    let fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
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

  /* ─── Speed cycle + mute toggle ───────────────────────────────── */

  const handleSpeedCycle = useCallback(() => {
    setSpeedIndex((i) => (i + 1) % speeds.length)
    flashKeyframe(speedLabelRef.current, styles.speedLabelPulse)
  }, [speeds.length])

  const handleMuteToggle = useCallback(() => {
    const el = mediaRef?.current
    if (!el) return
    el.muted = !el.muted
    /* setMuted is also driven by the volumechange event listener,
       but flipping it here too avoids a one-frame visual lag. */
    setMuted(el.muted)
  }, [mediaRef])

  /* ─── Render ─────────────────────────────────────────────────── */

  const currentSpeed = speeds[speedIndex] ?? 1
  const speedLabel = `${currentSpeed}×`
  const lockedSpeedLabel = `${speeds[0] ?? 1}×`

  const playLabel = hasError ? 'Audio unavailable'
    : isPlaying ? 'Pause'
      : completed ? 'Replay'
        : 'Play'

  const themeClass = theme === 'dark' ? styles.themeDark : styles.themeLight

  return (
    <div className={cx(
      styles.controlsRow,
      themeClass,
      hasError && styles.controlsRowError,
      completed && styles.controlsRowListened,
    )}>
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

        {/* Time chip — single combined "current / total" pill anchored
            below the bar's left edge. Replaces the previous twin
            time labels (start/end). On error or completion the chip
            swaps to the appropriate state-specific message. */}
        <div className={styles.trackMeta}>
          {hasError ? (
            <span className={cx(styles.timeChip, styles.timeChipError)}>
              Unable to load
            </span>
          ) : completed ? (
            <span className={cx(styles.timeChip, styles.timeChipListened)}>
              <span className={styles.timeChipIcon} aria-hidden="true">
                <CheckCircle2 size={12} strokeWidth={2.5} />
              </span>
              {listenedLabel}
            </span>
          ) : (
            <span className={styles.timeChip}>
              <span className={styles.timeChipCurrent}>
                {formatTime(currentTime)}
              </span>
              <span aria-hidden="true" className={styles.timeChipSep}>/</span>
              <span className={styles.timeChipTotal}>
                {formatTime(duration)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Volume — mute / unmute toggle. Hidden on mobile via CSS
          (desktop-only by design — phones have hardware volume keys). */}
      {showVolume && (
        <button
          type="button"
          className={cx(styles.volumeBtn, hasError && styles.volumeBtnDisabled)}
          onClick={handleMuteToggle}
          disabled={hasError}
          aria-label={muted ? 'Unmute audio' : 'Mute audio'}
          aria-pressed={muted}
        >
          {muted
            ? <VolumeX size={16} strokeWidth={2.25} aria-hidden="true" />
            : <Volume2 size={16} strokeWidth={2.25} aria-hidden="true" />}
        </button>
      )}

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
  )
}
