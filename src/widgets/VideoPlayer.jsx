import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import {
  PlaySquare,
  Play,
  Pause,
  Maximize,
  CircleCheck,
} from 'lucide-react'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './videoPlayer.module.scss'

/* ─── Video Player Widget (#16) ────────────────────────────────────
   Inline training / compliance video. Two variants share one shell:

     • 'standard' — free seek, speed picker (0.5×/1×/1.5×/2×), fullscreen.
     • 'enforced' — no seek-ahead, 1× locked, hatched "must watch"
                    overlay on the unwatched-ahead portion of the
                    progress bar. For compliance training.

   Commits a widget_response on first hit of ≥99% watched. Re-plays
   are allowed but don't re-fire.

   Spec: docs/superpowers/specs/2026-04-24-video-player-design.md
   Rule book: docs/widget-conventions.md
   ──────────────────────────────────────────────────────────────── */

const VARIANT_EYEBROW = {
  standard: 'Video · Onboarding',
  enforced: 'Compliance · Must watch in full',
}

/* Completion fires on the first timeupdate where watched ratio meets
   this threshold. Matches the spec's "≥99% watched = done" rule. */
const COMPLETION_THRESHOLD = 0.99

function formatClockTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const total = Math.floor(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function VideoPlayer({ payload }) {
  const {
    variant = 'standard',
    video_id,
    url,
    thumbnail_url,
    title,
    subtitle,
    duration_seconds,
    playback_speeds = [0.5, 1, 1.5, 2],
    silent,
  } = payload ?? {}

  const isEnforced = variant === 'enforced'

  const videoRef = useRef(null)
  const completedRef = useRef(false)      // fire widget_response exactly once
  const watchStartRef = useRef(null)      // wall-clock for total_watch_time_seconds
  const accumulatedWatchRef = useRef(0)   // seconds of actual playback time

  const [playing, setPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(duration_seconds ?? 0)
  const [maxWatched, setMaxWatched] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [completed, setCompleted] = useState(false)

  const { onReply } = useChatActions()

  const emitCompletion = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setCompleted(true)
    /* completed=true always pairs with watch_percentage=100 so downstream
       consumers don't see the "completed but only 99% watched" edge. */
    onReply({
      type: 'widget_response',
      payload: {
        widget_id: payload?.widget_id,
        source_type: 'video',
        video_id,
        watch_percentage: 100,
        completed: true,
        total_watch_time_seconds: Math.round(accumulatedWatchRef.current),
      },
    }, { silent })
  }, [onReply, payload?.widget_id, video_id, silent])

  const handlePlay = useCallback(() => {
    setPlaying(true)
    setHasPlayed(true)
    watchStartRef.current = Date.now()
  }, [])

  const handlePause = useCallback(() => {
    setPlaying(false)
    if (watchStartRef.current) {
      accumulatedWatchRef.current += (Date.now() - watchStartRef.current) / 1000
      watchStartRef.current = null
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    const t = vid.currentTime
    setCurrentTime(t)
    if (t > maxWatched) setMaxWatched(t)
    if (
      !completedRef.current &&
      vid.duration > 0 &&
      t >= vid.duration * COMPLETION_THRESHOLD
    ) {
      emitCompletion()
    }
  }, [maxWatched, emitCompletion])

  const handleLoadedMetadata = useCallback(() => {
    const vid = videoRef.current
    if (vid?.duration) setDuration(vid.duration)
  }, [])

  /* Clamp seeks in enforced mode. onSeeking fires before the seek
     paints; we reset currentTime synchronously if the user tries to
     jump past maxWatched. */
  const handleSeeking = useCallback(() => {
    if (!isEnforced) return
    const vid = videoRef.current
    if (!vid) return
    if (vid.currentTime > maxWatched) {
      vid.currentTime = maxWatched
    }
  }, [isEnforced, maxWatched])

  const handleEnded = useCallback(() => {
    setPlaying(false)
    if (watchStartRef.current) {
      accumulatedWatchRef.current += (Date.now() - watchStartRef.current) / 1000
      watchStartRef.current = null
    }
  }, [])

  /* Toggle play/pause on media click (once the video's been shown) —
     same affordance the poster-overlay play button gives. */
  const toggle = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) {
      vid.play().catch(() => { /* autoplay / network failure — silent */ })
    } else {
      vid.pause()
    }
  }, [])

  const setSpeed = useCallback((speed) => {
    const vid = videoRef.current
    if (!vid) return
    vid.playbackRate = speed
    setPlaybackSpeed(speed)
  }, [])

  const requestFullscreen = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.requestFullscreen) vid.requestFullscreen()
    else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen()
  }, [])

  const handleProgressClick = useCallback(
    (e) => {
      const vid = videoRef.current
      if (!vid || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const target = ratio * duration
      vid.currentTime = isEnforced ? Math.min(target, maxWatched) : target
    },
    [duration, isEnforced, maxWatched],
  )

  // Flush accumulated watch time on unmount so a mid-playback teardown
  // doesn't lose its counter.
  useEffect(() => {
    return () => {
      if (watchStartRef.current) {
        accumulatedWatchRef.current += (Date.now() - watchStartRef.current) / 1000
        watchStartRef.current = null
      }
    }
  }, [])

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const maxPct = duration > 0 ? (maxWatched / duration) * 100 : 0

  const eyebrow = VARIANT_EYEBROW[variant] ?? 'Video'

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden>
          <PlaySquare size={18} strokeWidth={2} />
        </span>
        <div className={styles.headerText}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.description}>{subtitle}</p>}
        </div>
      </header>

      <div
        className={cx(
          styles.media,
          playing && styles.media_playing,
          hasPlayed && styles.media_hasPlayed,
          completed && styles.media_completed,
        )}
        onClick={toggle}
      >
        {/* Inner crop layer: children clip to the rounded media box,
            while the .media itself is unclipped so its ::after pulse
            ring can paint outside the border on completion. */}
        <div className={styles.mediaCrop}>
          {thumbnail_url ? (
            <img className={styles.poster} src={thumbnail_url} alt="" />
          ) : (
            <div className={styles.posterFallback} aria-hidden />
          )}
          <video
            ref={videoRef}
            className={styles.videoEl}
            src={url}
            preload="metadata"
            playsInline
            tabIndex={-1}  /* chrome buttons own focus; keep <video> out of tab order */
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handleEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onSeeking={handleSeeking}
          />
          <div className={styles.scrim} aria-hidden />
          {!playing && (
            <button
              type="button"
              className={styles.playOverlay}
              onClick={(e) => { e.stopPropagation(); toggle() }}
              aria-label={hasPlayed ? 'Resume video' : 'Play video'}
            >
              <Play
                size={20}
                strokeWidth={2}
                fill="currentColor"
                className={styles.playOverlayGlyph}
                aria-hidden
              />
            </button>
          )}
          {completed && (
            <span className={styles.completionChip}>
              <CircleCheck size={14} strokeWidth={2} aria-hidden />
              Completed
            </span>
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.playButton}
          onClick={toggle}
          aria-label={playing ? 'Pause video' : 'Play video'}
        >
          {playing ? (
            <Pause size={16} strokeWidth={2} aria-hidden />
          ) : (
            <Play size={16} strokeWidth={2} aria-hidden />
          )}
          <span>{playing ? 'Pause' : 'Play'}</span>
        </button>
        <span className={styles.time}>
          {formatClockTime(currentTime)} / {formatClockTime(duration)}
        </span>
        <span className={styles.controlsSpacer} />
        {isEnforced ? (
          <span className={styles.speedLock} aria-label="Speed locked at 1×">1×</span>
        ) : (
          <span className={styles.speedGroup} role="radiogroup" aria-label="Playback speed">
            {playback_speeds.map((speed) => (
              <button
                key={speed}
                type="button"
                role="radio"
                aria-checked={speed === playbackSpeed}
                className={cx(
                  styles.speedButton,
                  speed === playbackSpeed && styles.speedButton_active,
                )}
                onClick={() => setSpeed(speed)}
              >
                {speed}×
              </button>
            ))}
          </span>
        )}
        <button
          type="button"
          className={styles.fsButton}
          onClick={requestFullscreen}
          aria-label="Enter fullscreen"
        >
          <Maximize size={16} strokeWidth={2} aria-hidden />
          <span className={styles.fsLabel}>Fullscreen</span>
        </button>
      </div>

      <div
        className={cx(styles.progressTrack, isEnforced && styles.progressTrack_enforced)}
        onClick={handleProgressClick}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Playback progress"
      >
        <span
          className={styles.progressFill}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
        {isEnforced && maxPct < 100 && (
          <span
            className={styles.progressHatch}
            style={{ left: `${maxPct}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  )
}
