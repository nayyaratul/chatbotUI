import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import { Volume2, Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './audioPlayer.module.scss'

/* ─── Audio Player Widget (CSV #25) ──────────────────────────────────
   Inline audio player for voice content. Pre-rendered 32-bar waveform,
   play / pause, tap-to-seek, cycling speed pill. Inherits the audio
   data-viz primitive from Voice Recording (#26) — same bar+sweep+
   `--play-progress` clip-path + mask-image vocabulary.

   State machine:
     idle → playing ↔ paused → ended → playing (replay)

   Region 4: committed state. Listen tracking is monotonic — the
   max progress reached this session, never decremented by rewind /
   seek-back. When it first crosses 95% (or <audio> fires `ended`,
   whichever lands first), `completed` flips true once, the row
   gains the listened-tone treatment + 600ms one-cycle seal
   shimmer, every bar tints success, and `onReply` fires exactly
   once with `{audio_id, listen_percentage, completed, listened_at}`.
   Replay after completion keeps the seal — terminal, like VR's
   submitted row. The play button intentionally stays brand-60 (no
   success tint) so replay reads as a normal action.
   ──────────────────────────────────────────────────────────────── */

const COMPLETION_THRESHOLD = 0.95

const BAR_COUNT = 32
const DEFAULT_SPEEDS = [1, 1.5, 2]

/* Hand-rolled, speech-shaped fallback peaks (32 normalized values).
   Used when payload.waveform_data is absent. Deterministic so the
   visual stays stable across re-renders. */
const FALLBACK_BARS = [
  0.18, 0.32, 0.55, 0.78, 0.62, 0.40, 0.28, 0.48,
  0.72, 0.85, 0.66, 0.45, 0.30, 0.50, 0.74, 0.58,
  0.38, 0.22, 0.42, 0.68, 0.82, 0.70, 0.52, 0.36,
  0.48, 0.64, 0.78, 0.60, 0.42, 0.28, 0.20, 0.14,
]

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

/* Resample an arbitrary-length array of normalized peaks to exactly
   BAR_COUNT bars by max-of-bucket. If the input is already 32, return
   it unchanged. If shorter than 32, repeat-and-interpolate. */
function resampleBars(peaks) {
  if (!Array.isArray(peaks) || peaks.length === 0) return FALLBACK_BARS
  if (peaks.length === BAR_COUNT) return peaks
  const out = new Array(BAR_COUNT)
  const ratio = peaks.length / BAR_COUNT
  for (let i = 0; i < BAR_COUNT; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.max(start + 1, Math.floor((i + 1) * ratio))
    let max = 0
    for (let j = start; j < Math.min(peaks.length, end); j++) {
      const v = Math.max(0, Math.min(1, Number(peaks[j]) || 0))
      if (v > max) max = v
    }
    out[i] = max
  }
  return out
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

  const bars = useMemo(() => resampleBars(payload?.waveform_data), [payload?.waveform_data])

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration)
  const [speedIndex, setSpeedIndex] = useState(0)
  const [hasError, setHasError] = useState(false)
  /* Per-gesture tick counters — bumped on each seek / speed cycle so
     React remounts the keyed children and re-fires the entry keyframes
     on every interaction. Pure visual ornament; no behavior depends
     on the values. Initial 0 means no animation on first paint. */
  /* Refs to the elements that get per-gesture flash keyframes
     re-fired imperatively. Storing refs (not React state + key=)
     means the elements never remount, so keyboard focus on the
     waveform survives a seek and the speed label doesn't animate
     on first paint. */
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
  /* Sweep position in [0, 1]. Sourced from audio.currentTime / duration
     on every RAF tick while playing; held frozen on pause; snaps on
     seek. Drives the `--play-progress` CSS variable on the waveform
     wrapper, which clips the brand-60 sweep layer + masks its
     leading edge. */
  const [playProgress, setPlayProgress] = useState(0)

  const audioElRef = useRef(null)
  const playRafRef = useRef(null)
  const speedLabelRef = useRef(null)
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
    /* RAF loop drives the sweep — much smoother than the audio
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

  /* Tap-to-seek on the waveform. Computes the seek fraction from the
     click position relative to the container's bounding rect — robust
     against bar/gap clicks regardless of which inner element the
     event hit (bars themselves are pointer-events:none in the SCSS
     so the container always wins).

     If currently paused or ended, the seek auto-resumes playback —
     matches WhatsApp / Telegram audio-message behavior. */
  const handleWaveformSeek = useCallback((e) => {
    const el = audioElRef.current
    const container = e.currentTarget
    if (!el || !container) return
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) return
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const dur = el.duration || duration || propDuration
    if (!Number.isFinite(dur) || dur <= 0) return

    el.currentTime = fraction * dur
    setPlayProgress(fraction)
    setCurrentTime(fraction * dur)
    const pct = fraction * 100
    setListenPercentage((prev) => (pct > prev ? pct : prev))
    if (fraction >= COMPLETION_THRESHOLD) fireCompletion()
    /* Re-fire the seek-flash keyframe on the live container
       imperatively. The button is NOT remounted — keyboard focus
       survives the seek, which is critical for keyboard users
       (Enter on the waveform with key= remount would have dropped
       focus to body). */
    flashKeyframe(container, styles.waveformSeekFlash)

    if (el.paused) {
      el.play().catch(() => { /* autoplay policy ok after gesture */ })
    }
  }, [duration, propDuration, fireCompletion])

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
  /* Format the cycling label: integers as `1×`, fractionals as
     `1.5×`. Same template either way; the conditional was a dead
     branch and has been removed. */
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

        {/* Waveform — seekable button. Two stacked .waveformLayer
            children: base in grey-30, sweep in brand-60 clipped L→R
            by `--play-progress` and softened on the leading edge by
            mask-image so the sweep "kisses" each bar. The
            .waveformEnded toggle off-on across the replay frame
            re-fires the rightmost-bar end-pulse on every replay end
            (isPlaying flips true while playProgress is still 1 from
            the prior end). */}
        <button
          type="button"
          className={cx(
            styles.waveform,
            playProgress >= 1 && !isPlaying && styles.waveformEnded,
          )}
          style={{ '--play-progress': hasError ? 0 : playProgress }}
          onClick={handleWaveformSeek}
          disabled={hasError}
          aria-label="Seek audio position"
        >
          {/* Base layer — bars in grey-30 (unplayed). */}
          <div className={styles.waveformLayer}>
            {bars.map((v, i) => {
              const norm = Math.min(1, Math.max(0, v))
              return (
                <span
                  key={`base-${i}`}
                  className={cx(styles.bar, styles.barUnplayed, completed && styles.barListened)}
                  style={{ '--bar-norm': norm }}
                />
              )
            })}
          </div>
          {/* Sweep layer — same bars in brand-60, clipped L→R by --play-progress. */}
          <div className={cx(styles.waveformLayer, styles.waveformSweep)}>
            {bars.map((v, i) => {
              const norm = Math.min(1, Math.max(0, v))
              return (
                <span
                  key={`sweep-${i}`}
                  className={cx(styles.bar, completed && styles.barListened)}
                  style={{ '--bar-norm': norm }}
                />
              )
            })}
          </div>
        </button>

        <div className={styles.meta}>
          {hasError ? (
            <span className={styles.metaError}>Unable to load audio</span>
          ) : completed ? (
            <span className={styles.listenedChip}>
              {/* Inner span gives the leaf icon its own staggered
                  springy entrance (320ms after the chip body lands).
                  Tiny detail — the chip "acquires" its check rather
                  than appearing with one stamped on. */}
              <span className={styles.listenedChipIcon} aria-hidden="true">
                <CheckCircle2 size={12} strokeWidth={2.5} />
              </span>
              Listened
            </span>
          ) : (
            <span className={styles.metaTime}>
              {isPlaying || currentTime > 0
                ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                : formatTime(duration)}
            </span>
          )}
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
