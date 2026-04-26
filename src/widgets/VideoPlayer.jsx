import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { PlaySquare, Play, Maximize, CircleCheck } from 'lucide-react'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { MediaPlayerControls } from './MediaPlayerControls.jsx'
import styles from './videoPlayer.module.scss'

/* ─── Video Player Widget (#16) ────────────────────────────────────
   Inline training / compliance video. Two variants share one shell:

     • 'standard' — free seek, speed picker (0.5×/1×/1.5×/2×).
     • 'enforced' — no seek-ahead, 1× locked, completion gate at
                    ≥99% watched. For compliance training.

   Renders the §2 header chrome + 16:9 media region (poster, video,
   play-overlay, completion chip) + the shared <MediaPlayerControls>
   bar with a Fullscreen button in its `trailing` slot. The controls
   primitive (slim track + luminous thumb + speed pill + drag-scrub)
   is identical to Audio Player's — both widgets adopt the same
   media-controls vocabulary.

   Commits a widget_response on first hit of ≥99% watched. Re-plays
   are allowed but don't re-fire.

   Spec: docs/superpowers/specs/2026-04-24-video-player-design.md
   Rule book: docs/widget-conventions.md
   ──────────────────────────────────────────────────────────────── */

const VARIANT_EYEBROW = {
  standard: 'Video · Onboarding',
  enforced: 'Compliance · Must watch in full',
}

const COMPLETION_THRESHOLD = 0.99

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
  const completedRef = useRef(false)
  /* Wall-clock timer for total_watch_time_seconds. Started on every
     play, accumulated on every pause/end. */
  const watchStartRef = useRef(null)
  const accumulatedWatchRef = useRef(0)
  /* Max watched fraction in [0, 1] — used for the enforced-mode
     seek clamp. RAF inside MediaPlayerControls drives the controls
     state; this ref tracks the high-water mark needed for the clamp. */
  const maxWatchedRef = useRef(0)

  const [playing, setPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [hasError, setHasError] = useState(false)
  /* Maximum watched fraction surfaced to the controls component as
     `maxSeekFraction`. Lifted into state (not just the ref) so a
     React re-render bumps the prop when maxWatched advances. */
  const [maxSeekFraction, setMaxSeekFraction] = useState(1)

  const { onReply } = useChatActions()

  /* Track currentTime via the <video> element's timeupdate event so
     the enforced-mode seek clamp keeps up. The shared controls have
     their own RAF for the bar; this is a separate concern. */
  const handleVideoTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.duration > 0) {
      const fraction = vid.currentTime / vid.duration
      if (fraction > maxWatchedRef.current) {
        maxWatchedRef.current = fraction
        if (isEnforced) {
          setMaxSeekFraction(fraction)
        }
      }
    }
  }, [isEnforced])

  /* Edge-trigger the watch-completion response. Called by
     MediaPlayerControls on the first crossing of the threshold or
     on `ended`. Idempotent against repeat calls. */
  const handleCompletionEdge = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    setCompleted(true)
    /* Allow seeking anywhere on the bar after completion — the
       enforced-mode clamp lifts once the gate is cleared. */
    setMaxSeekFraction(1)
    onReply?.({
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

  /* Drive the wall-clock watch-time accumulator + the media region's
     poster→video crossfade modifier from the controls' onPlayChange
     callback. Fires on every play/pause edge. */
  const handlePlayChange = useCallback((isPlayingNext) => {
    setPlaying(isPlayingNext)
    if (isPlayingNext) {
      setHasPlayed(true)
      watchStartRef.current = Date.now()
    } else if (watchStartRef.current) {
      accumulatedWatchRef.current += (Date.now() - watchStartRef.current) / 1000
      watchStartRef.current = null
    }
  }, [])

  const handleVideoError = useCallback(() => {
    setHasError(true)
  }, [])

  const handleMediaClick = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) {
      vid.play().catch(() => { /* autoplay / network failure — silent */ })
    } else {
      vid.pause()
    }
  }, [])

  const requestFullscreen = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.requestFullscreen) vid.requestFullscreen()
    else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen()
  }, [])

  /* Flush accumulated watch time on unmount so a mid-playback
     teardown doesn't lose its counter. */
  useEffect(() => {
    return () => {
      if (watchStartRef.current) {
        accumulatedWatchRef.current += (Date.now() - watchStartRef.current) / 1000
        watchStartRef.current = null
      }
    }
  }, [])

  const eyebrow = VARIANT_EYEBROW[variant] ?? 'Video'

  /* Speeds: enforced mode locks to a single 1× entry. The controls'
     enforceSpeedLock prop hides the cycling button and renders a
     non-interactive locked indicator instead. */
  const speeds = isEnforced ? [1] : playback_speeds

  const fullscreenButton = (
    <button
      type="button"
      className={styles.fsButton}
      onClick={requestFullscreen}
      aria-label="Enter fullscreen"
      disabled={hasError}
    >
      <Maximize size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <span className={styles.iconBadge} aria-hidden="true">
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
        onClick={handleMediaClick}
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
            tabIndex={-1}
            onTimeUpdate={handleVideoTimeUpdate}
            onError={handleVideoError}
          />
          <div className={styles.scrim} aria-hidden />
          {!playing && (
            <button
              type="button"
              className={styles.playOverlay}
              onClick={(e) => { e.stopPropagation(); handleMediaClick() }}
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

      <MediaPlayerControls
        mediaRef={videoRef}
        speeds={speeds}
        enforceSpeedLock={isEnforced}
        maxSeekFraction={maxSeekFraction}
        completed={completed}
        hasError={hasError}
        completionThreshold={COMPLETION_THRESHOLD}
        onCompletionEdge={handleCompletionEdge}
        onPlayChange={handlePlayChange}
        listenedLabel="Completed"
        trailing={fullscreenButton}
      />
    </div>
  )
}
