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

   Region 1 of Pass 1: shell + §2 header + player row at IDLE. Basic
   play/pause through the <audio> element, meta line driven by
   timeupdate (Region 2 swaps in the RAF-driven sweep + seek).
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

  const audioElRef = useRef(null)

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

  const handleAudioPlay   = useCallback(() => setIsPlaying(true), [])
  const handleAudioPause  = useCallback(() => setIsPlaying(false), [])
  const handleAudioEnded  = useCallback(() => setIsPlaying(false), [])

  /* `loadedmetadata` may give a more accurate duration than the
     `payload.duration_seconds` prop. Swap silently when it lands. */
  const handleLoadedMetadata = useCallback(() => {
    const el = audioElRef.current
    if (!el) return
    const d = el.duration
    if (Number.isFinite(d) && d > 0) setDuration(d)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const el = audioElRef.current
    if (!el) return
    setCurrentTime(el.currentTime || 0)
  }, [])

  /* Cleanup on unmount — pause any in-flight playback. */
  useEffect(() => {
    return () => {
      const el = audioElRef.current
      if (el) {
        try { el.pause() } catch { /* ignore */ }
      }
    }
  }, [])

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
          onTimeUpdate={handleTimeUpdate}
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

        <div className={styles.waveform} aria-hidden="true">
          <div className={styles.waveformLayer}>
            {bars.map((v, i) => {
              const norm = Math.min(1, Math.max(0, v))
              return (
                <span
                  key={i}
                  className={cx(styles.bar, styles.barUnplayed)}
                  style={{ '--bar-norm': norm }}
                />
              )
            })}
          </div>
        </div>

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
