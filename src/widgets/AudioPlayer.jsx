import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Volume2, Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './audioPlayer.module.scss'

/* ─── Audio Player Widget (CSV #25) ──────────────────────────────────
   Inline audio player for voice content. Slim progress track with a
   luminous brand-60 thumb that breathes while playing — closer to
   VideoPlayer's family pattern than VR's bar+sweep, which the
   original spec leaned on. The waveform was a recording-side data
   visualization; on the consumption side the thumb-as-needle is the
   right primitive — functional (you see where you are, you tap to
   seek there), iconic (the breathing halo IS the audio-is-alive
   signal), and compact.

   State machine:
     idle → playing ↔ paused → ended → playing (replay)

   On the first crossing of 95% (or the audio element's `ended`
   event, whichever lands first), `completed` flips true once, the
   row gains the listened-tone treatment + 600ms one-cycle seal
   shimmer, the fill retints success, the thumb pins to the right
   edge in success-tone, and `onReply` fires exactly once with
   `{audio_id, listen_percentage, completed, listened_at}`. Replay
   keeps the seal — terminal, like VR's submitted row. The play
   button intentionally stays brand-60 (no success tint) so replay
   reads as a normal action.
   ──────────────────────────────────────────────────────────────── */

const COMPLETION_THRESHOLD = 0.95
const DEFAULT_SPEEDS = [1, 1.5, 2]

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* Imperatively re-fire a CSS keyframe on a DOM element by removing
   the class, forcing a reflow, then re-adding it. The forced
   `offsetWidth` read is the standard "restart-CSS-animation" trick;
   without it the browser may coalesce the remove + add into a single
   paint and the keyframe doesn't replay. Used for tap-to-seek + speed
   cycle gesture acknowledgments — keeps focus on the live element
   (no remount) while still re-firing the entry animation per click. */
function flashKeyframe(el, className) {
  if (!el || !className) return
  el.classList.remove(className)
  // eslint-disable-next-line no-unused-expressions
  void el.offsetWidth
  el.classList.add(className)
}

/* ─── Root ──────────────────────────────────────────────────────── */

export function AudioPlayer({ payload }) {
  const { onReply } = useChatActions()

  const widgetId        = payload?.widget_id
  const audioId         = payload?.audio_id
  const isSilent        = Boolean(payload?.silent)
  const url             = payload?.url || ''
  const propDuration    = Number(payload?.duration_seconds) || 0
  const title           = payload?.title || 'Voice instruction'
  const description     = payload?.description
  const speeds          = Array.isArray(payload?.speeds) && payload.speeds.length > 0
    ? payload.speeds
    : DEFAULT_SPEEDS

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [hasError, setHasError] = useState(false)
  /* Listen tracking. `listenPercentage` is monotonic max — never
     decremented by rewind. `completed` is a one-way flag that flips
     true on the first crossing of COMPLETION_THRESHOLD; the
     `onReply` fire is gated on the same edge. `listenedAt` records
     the moment of completion for the response payload. */
  const [listenPercentage, setListenPercentage] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [listenedAt, setListenedAt] = useState(null)
  /* Mirror flag in a ref so the RAF loop can short-circuit on
     subsequent ticks without depending on stale closure state. */
  const completedRef = useRef(false)
  /* Playhead position in [0, 1]. Sourced from audio.currentTime /
     duration on every RAF tick while playing; held frozen on pause;
     snaps on seek. Drives the `--play-progress` CSS variable on the
     progress-bar wrapper, which positions the fill width and thumb
     left coordinate. */
  const [playProgress, setPlayProgress] = useState(0)

  const audioElRef = useRef(null)
  const playRafRef = useRef(null)
  const speedLabelRef = useRef(null)
  const progressThumbRef = useRef(null)
  /* Drag-scrub state. `true` between pointerdown and pointerup on
     the progress bar; pointermove only seeks while this is set, so
     hover-by-pointer doesn't accidentally scrub. */
  const isDraggingRef = useRef(false)
  /* Gates async setState after unmount. Mirrors VR's pattern: set
     true on every effect setup (StrictMode runs setup → cleanup →
     setup on first mount; without resetting on setup the cleanup
     pass would leave it false for the rest of the lifetime). */
  const mountedRef = useRef(true)

  const stopPlayRaf = useCallback(() => {
    if (playRafRef.current) {
      cancelAnimationFrame(playRafRef.current)
      playRafRef.current = null
    }
  }, [])

  /* Edge-trigger for completion. Fires on the first crossing of the
     95% threshold OR on the audio element's `ended` event,
     whichever lands first. Idempotent against repeat calls — the
     `completedRef` guard means a second crossing (replay-then-end,
     scrub-back-then-forward, etc.) is a no-op. The `onReply` fire
     is part of this single edge — never repeats. */
  const fireCompletion = useCallback(() => {
    if (completedRef.current) return
    if (!mountedRef.current) return
    completedRef.current = true
    const at = Date.now()
    setCompleted(true)
    setListenedAt(at)
    setListenPercentage(100)
    onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'audio_player',
          source_widget_id: widgetId,
          data: {
            audio_id: audioId,
            listen_percentage: 100,
            completed: true,
            listened_at: at,
          },
        },
      },
      { silent: isSilent },
    )
  }, [onReply, widgetId, audioId, isSilent])

  const handleAudioPlay = useCallback(() => {
    if (!mountedRef.current) return
    /* Belt-and-suspenders: cancel any prior RAF chain before
       scheduling a new one. Without this, a rapid pause→resume can
       stack two recursive ticks (the older chain keeps writing
       state because playRafRef.current only tracks the most recent
       id). */
    stopPlayRaf()
    setIsPlaying(true)
    /* RAF loop drives the playhead — much smoother than the audio
       element's 4Hz timeupdate. Reads currentTime on every frame,
       pushes a [0, 1] progress value into state, and updates
       listen_percentage as the running monotonic max. Crosses the
       95% threshold → fires the completion edge once. */
    const tick = () => {
      if (!mountedRef.current || !playRafRef.current) return
      const el = audioElRef.current
      if (!el) return
      const dur = el.duration || duration || propDuration
      const progress = dur > 0 ? Math.min(1, el.currentTime / dur) : 0
      setPlayProgress(progress)
      setCurrentTime(el.currentTime || 0)
      const pct = progress * 100
      setListenPercentage((prev) => (pct > prev ? pct : prev))
      if (progress >= COMPLETION_THRESHOLD) fireCompletion()
      /* Once we've reached the end, stop scheduling — `ended` will
         land within a frame or two and finalize via handleAudioEnded.
         Continuing to schedule writes identical state values for no
         visual benefit. */
      if (progress >= 1) return
      playRafRef.current = requestAnimationFrame(tick)
    }
    playRafRef.current = requestAnimationFrame(tick)
  }, [duration, propDuration, fireCompletion, stopPlayRaf])

  const handleAudioPause = useCallback(() => {
    if (!mountedRef.current) return
    setIsPlaying(false)
    stopPlayRaf()
  }, [stopPlayRaf])

  const handleAudioEnded = useCallback(() => {
    if (!mountedRef.current) return
    setIsPlaying(false)
    setPlayProgress(1)
    stopPlayRaf()
    /* Belt-and-suspenders against the RAF tick missing the final
       95% crossing on very short clips — `ended` always lands at
       100%, so this is a guaranteed completion edge. Idempotent
       against the RAF having already fired it. */
    fireCompletion()
  }, [stopPlayRaf, fireCompletion])

  /* `loadedmetadata` may give a more accurate duration than the
     `payload.duration_seconds` prop. Swap silently when it lands. */
  const handleLoadedMetadata = useCallback(() => {
    if (!mountedRef.current) return
    const el = audioElRef.current
    if (!el) return
    const d = el.duration
    if (Number.isFinite(d) && d > 0) setDuration(d)
  }, [])

  /* The <audio> element fires `error` for URL 404, codec failures,
     network drops, etc. Degrade the row in place rather than swap to
     a separate state block — keeps the geometry stable and signals
     "this clip won't play" without taking the user out of the chat
     flow. */
  const handleAudioError = useCallback(() => {
    if (!mountedRef.current) return
    setHasError(true)
    setIsPlaying(false)
    stopPlayRaf()
  }, [stopPlayRaf])

  /* ─── Playback toggle ─────────────────────────────────────────── */

  const handlePlayPause = useCallback(() => {
    const el = audioElRef.current
    if (!el) return
    if (el.paused) {
      /* Replay-from-ended: HTML5 doesn't mandate auto-restart when
         you call play() on a media element whose currentTime is
         already at duration. Some browsers no-op; others restart.
         Be explicit so replay always feels the same. */
      if (el.ended || (el.duration > 0 && el.currentTime >= el.duration - 0.05)) {
        el.currentTime = 0
      }
      el.play().catch(() => { /* autoplay policy — usually fine after user gesture */ })
    } else {
      el.pause()
    }
  }, [])

  /* Keyboard arrow-seek on the play button. ArrowLeft / ArrowRight
     nudge ±5 seconds without leaving the button focus, so a
     screen-reader / keyboard user gets a natural scrubbing path
     they can do entirely from the primary control. Seek-forward
     past the threshold also flips completion (consistent with the
     mouse seek handler). */
  const handlePlayKeyDown = useCallback((e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const el = audioElRef.current
    if (!el) return
    const dur = el.duration || duration || propDuration
    if (!Number.isFinite(dur) || dur <= 0) return

    e.preventDefault()
    const delta = e.key === 'ArrowRight' ? 5 : -5
    const next = Math.max(0, Math.min(dur, (el.currentTime || 0) + delta))
    el.currentTime = next
    const fraction = next / dur
    setPlayProgress(fraction)
    setCurrentTime(next)
    const pct = fraction * 100
    setListenPercentage((prev) => (pct > prev ? pct : prev))
    if (fraction >= COMPLETION_THRESHOLD) fireCompletion()
    /* Re-fire the thumb-snap keyframe so keyboard scrubbing carries
       the same visual feedback as a mouse seek — the playhead
       acknowledges the gesture by briefly expanding its halo. */
    flashKeyframe(progressThumbRef.current, styles.progressThumbSnap)
  }, [duration, propDuration, fireCompletion])

  const handleSpeedCycle = useCallback(() => {
    setSpeedIndex((i) => (i + 1) % speeds.length)
    /* Re-fire the springy pulse on the inner label imperatively.
       Doing this via class-toggle (rather than React-state +
       `key=` remount) means the speed button itself isn't
       remounted — keyboard focus survives, and the keyframe
       doesn't run on first paint. */
    flashKeyframe(speedLabelRef.current, styles.speedLabelPulse)
  }, [speeds.length])

  /* Apply playbackRate whenever the speed index changes. Sweep RAF
     does not need to restart — `--play-progress` is sourced from
     audio.currentTime, which scales with playbackRate automatically. */
  useEffect(() => {
    const el = audioElRef.current
    if (!el) return
    const next = speeds[speedIndex] ?? 1
    el.playbackRate = next
  }, [speedIndex, speeds])

  /* Apply a pointer-event's clientX to the audio playhead. Shared
     between pointerdown (tap or drag-start) and pointermove (drag
     in progress). Computes the fraction from the click position
     relative to the bar's bounding rect — robust against the
     pointer leaving the bar's box mid-drag because setPointerCapture
     keeps the events flowing to this same container. */
  const applyPointerSeek = useCallback((clientX, container) => {
    const el = audioElRef.current
    if (!el || !container) return
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) return
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const dur = el.duration || duration || propDuration
    if (!Number.isFinite(dur) || dur <= 0) return

    el.currentTime = fraction * dur
    setPlayProgress(fraction)
    setCurrentTime(fraction * dur)
    const pct = fraction * 100
    setListenPercentage((prev) => (pct > prev ? pct : prev))
    if (fraction >= COMPLETION_THRESHOLD) fireCompletion()
  }, [duration, propDuration, fireCompletion])

  /* Pointerdown — tap or drag-start. Captures the pointer so move
     events keep flowing even if the cursor leaves the bar's bounds
     (drag past the right edge while heading further right is
     normal scrubbing UX). Seeks immediately to the press position
     and fires the thumb-snap keyframe as gesture acknowledgment.

     If currently paused or ended, the seek auto-resumes playback
     — matches WhatsApp / Telegram audio-message behavior. */
  const handleProgressPointerDown = useCallback((e) => {
    if (hasError) return
    const el = audioElRef.current
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
  }, [hasError, applyPointerSeek])

  /* Pointermove — drag in progress. Only seeks while isDraggingRef
     is set; without that gate, every hover-pointer crossing the
     bar would scrub. No thumb-snap keyframe per move — the snap
     fires once on pointerdown, the rest of the drag is smooth
     thumb-tracking. */
  const handleProgressPointerMove = useCallback((e) => {
    if (!isDraggingRef.current) return
    applyPointerSeek(e.clientX, e.currentTarget)
  }, [applyPointerSeek])

  /* Pointerup / pointercancel — drag ends. Browsers auto-release
     the captured pointer at this point; no explicit
     releasePointerCapture call needed. The final position was
     already committed by the last pointermove (or by pointerdown
     if the user just tapped). */
  const handleProgressPointerEnd = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  /* Lifecycle — set mountedRef true on every effect setup (StrictMode
     setup → cleanup → setup pattern requires this), pause any
     in-flight playback on unmount, cancel RAF. The mountedRef.current
     = false MUST come before el.pause() so the synchronous `pause`
     event handler bails before touching React state. */
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      const el = audioElRef.current
      if (el) {
        try { el.pause() } catch { /* ignore */ }
      }
      stopPlayRaf()
    }
  }, [stopPlayRaf])

  const currentSpeed = speeds[speedIndex] ?? 1
  const speedLabel = `${currentSpeed}×`

  return (
    <div className={styles.card} role="article" aria-label={title} data-widget-id={widgetId} data-audio-id={audioId}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Volume2 size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {/* ─── Player row ──────────────────────────────────────────── */}
      <div className={cx(
        styles.playerRow,
        hasError && styles.playerRowError,
        completed && styles.playerRowListened,
      )}>
        <audio
          ref={audioElRef}
          src={url}
          preload="metadata"
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onEnded={handleAudioEnded}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleAudioError}
          aria-hidden="true"
        />

        <button
          type="button"
          className={cx(styles.playBtn, hasError && styles.playBtnDisabled)}
          onClick={handlePlayPause}
          onKeyDown={handlePlayKeyDown}
          disabled={hasError}
          aria-label={
            hasError ? 'Audio unavailable'
              : isPlaying ? 'Pause audio'
                : completed ? 'Replay audio'
                  : 'Play audio'
          }
        >
          {isPlaying
            ? <Pause size={18} strokeWidth={2.25} aria-hidden="true" />
            : completed
              ? <RotateCcw size={18} strokeWidth={2.25} aria-hidden="true" />
              : <Play size={18} strokeWidth={2.25} aria-hidden="true" />}
        </button>

        {/* Track column — slim progress bar on top, time / status
            line below, anchored to the bar's left/right edges. Whole
            column takes flex:1 of the row, between the play button
            (left) and speed pill (right). */}
        <div className={styles.track}>
          {/* Progress bar — seekable button. The fill + thumb are
              positioned by `--play-progress` set as a CSS variable
              on the bar's inline style. The thumb is the signature
              moment of the redesign: a luminous brand-60 dot whose
              halo breathes 2.6s while playing, replacing VR's
              bar-by-bar wet-edge as the "audio is alive" signal. */}
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
               ArrowLeft/Right handler (±5s) instead. */
            tabIndex={-1}
            aria-label="Seek audio position"
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
              <span className={styles.trackError}>Unable to load audio</span>
            ) : completed ? (
              <span className={styles.listenedChip}>
                <span className={styles.listenedChipIcon} aria-hidden="true">
                  <CheckCircle2 size={12} strokeWidth={2.5} />
                </span>
                Listened
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

        <button
          type="button"
          className={styles.speedBtn}
          onClick={handleSpeedCycle}
          disabled={hasError}
          aria-label={`Playback speed ${speedLabel}, tap to change`}
        >
          {/* Inner label sits in a static span; the springy pulse
              is re-fired imperatively on each cycle via classList
              toggle (see handleSpeedCycle). The outer button owns
              the press scale (0.96 on :active); the inner span
              owns the label "land." Two layers of feedback for one
              gesture, neither stealing the show from the other. */}
          <span ref={speedLabelRef} className={styles.speedLabel}>
            {speedLabel}
          </span>
        </button>
      </div>
    </div>
  )
}
