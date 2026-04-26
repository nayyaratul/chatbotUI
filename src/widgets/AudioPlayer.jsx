import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import cx from 'classnames'
import { Volume2, Play, Pause } from 'lucide-react'
import styles from './audioPlayer.module.scss'

/* ─── Audio Player Widget (CSV #25) ──────────────────────────────────
   Inline audio player for voice content. Pre-rendered 32-bar waveform,
   play / pause, tap-to-seek, cycling speed pill. Inherits the audio
   data-viz primitive from Voice Recording (#26) — same bar+sweep+
   `--play-progress` clip-path + mask-image vocabulary.

   State machine:
     idle → playing ↔ paused → ended → playing (replay)

   Region 2: the signature primitive — brand-60 sweep clipped L→R by
   `--play-progress` with a `mask-image` wet leading edge, tap-to-seek
   on the waveform, single-bar end-pulse on the rightmost bar when
   playback ends. Sweep is RAF-driven (~60fps), much smoother than
   the audio element's 4Hz timeupdate event.
   ──────────────────────────────────────────────────────────────── */

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
  const widgetId        = payload?.widget_id
  const audioId         = payload?.audio_id
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
  /* Sweep position in [0, 1]. Sourced from audio.currentTime / duration
     on every RAF tick while playing; held frozen on pause; snaps on
     seek. Drives the `--play-progress` CSS variable on the waveform
     wrapper, which clips the brand-60 sweep layer + masks its
     leading edge. */
  const [playProgress, setPlayProgress] = useState(0)

  const audioElRef = useRef(null)
  const playRafRef = useRef(null)

  /* ─── Playback toggle ─────────────────────────────────────────── */

  const handlePlayPause = useCallback(() => {
    const el = audioElRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => { /* autoplay policy — usually fine after user gesture */ })
    } else {
      el.pause()
    }
  }, [])

  const stopPlayRaf = useCallback(() => {
    if (playRafRef.current) {
      cancelAnimationFrame(playRafRef.current)
      playRafRef.current = null
    }
  }, [])

  const handleAudioPlay = useCallback(() => {
    setIsPlaying(true)
    /* RAF loop drives the sweep — much smoother than the audio
       element's 4Hz timeupdate. Reads currentTime on every frame
       and pushes a [0, 1] progress value into state. */
    const tick = () => {
      const el = audioElRef.current
      if (!el) return
      const dur = el.duration || duration || propDuration
      const progress = dur > 0 ? Math.min(1, el.currentTime / dur) : 0
      setPlayProgress(progress)
      setCurrentTime(el.currentTime || 0)
      playRafRef.current = requestAnimationFrame(tick)
    }
    playRafRef.current = requestAnimationFrame(tick)
  }, [duration, propDuration])

  const handleAudioPause = useCallback(() => {
    setIsPlaying(false)
    stopPlayRaf()
  }, [stopPlayRaf])

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
    setPlayProgress(1)
    stopPlayRaf()
  }, [stopPlayRaf])

  /* `loadedmetadata` may give a more accurate duration than the
     `payload.duration_seconds` prop. Swap silently when it lands. */
  const handleLoadedMetadata = useCallback(() => {
    const el = audioElRef.current
    if (!el) return
    const d = el.duration
    if (Number.isFinite(d) && d > 0) setDuration(d)
  }, [])

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

    if (el.paused) {
      el.play().catch(() => { /* autoplay policy ok after gesture */ })
    }
  }, [duration, propDuration])

  /* Cleanup on unmount — pause any in-flight playback, cancel RAF. */
  useEffect(() => {
    return () => {
      const el = audioElRef.current
      if (el) {
        try { el.pause() } catch { /* ignore */ }
      }
      stopPlayRaf()
    }
  }, [stopPlayRaf])

  const speedIndex = 0
  const currentSpeed = speeds[speedIndex] ?? 1
  const speedLabel = Number.isInteger(currentSpeed)
    ? `${currentSpeed}×`
    : `${currentSpeed}×`

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
      <div className={styles.playerRow}>
        <audio
          ref={audioElRef}
          src={url}
          preload="metadata"
          onPlay={handleAudioPlay}
          onPause={handleAudioPause}
          onEnded={handleAudioEnded}
          onLoadedMetadata={handleLoadedMetadata}
          aria-hidden="true"
        />

        <button
          type="button"
          className={styles.playBtn}
          onClick={handlePlayPause}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying
            ? <Pause size={18} strokeWidth={2.25} aria-hidden="true" />
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
          style={{ '--play-progress': playProgress }}
          onClick={handleWaveformSeek}
          aria-label="Seek audio position"
        >
          {/* Base layer — bars in grey-30 (unplayed). */}
          <div className={styles.waveformLayer}>
            {bars.map((v, i) => {
              const norm = Math.min(1, Math.max(0, v))
              return (
                <span
                  key={`base-${i}`}
                  className={cx(styles.bar, styles.barUnplayed)}
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
                  className={styles.bar}
                  style={{ '--bar-norm': norm }}
                />
              )
            })}
          </div>
        </button>

        <div className={styles.meta}>
          <span className={styles.metaTime}>
            {isPlaying || currentTime > 0
              ? `${formatTime(currentTime)} / ${formatTime(duration)}`
              : formatTime(duration)}
          </span>
        </div>

        <button
          type="button"
          className={styles.speedBtn}
          aria-label={`Playback speed ${speedLabel}`}
        >
          {speedLabel}
        </button>
      </div>
    </div>
  )
}
