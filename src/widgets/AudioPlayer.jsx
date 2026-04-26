import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import { MediaPlayerControls } from './MediaPlayerControls.jsx'
import styles from './audioPlayer.module.scss'

/* ─── Audio Player Widget (CSV #25) ──────────────────────────────────
   Inline audio player for voice content. Renders the §2 header chrome
   + the <audio> element + a shared <MediaPlayerControls> bar. The
   controls primitive (slim track + luminous thumb + speed pill +
   drag-scrub) lives in MediaPlayerControls so Audio Player and Video
   Player stay visually identical.

   This widget owns:
     • The <audio> element (URL, src, error event)
     • The completion edge (≥95% listen → fire onReply once)
     • The listen_percentage tracking + widget_response payload

   The shared component owns:
     • currentTime / duration / playProgress / isPlaying state
     • Pointer-events-driven drag scrub
     • Speed pill cycling
     • Listened-tone + error-state visual classes
   ──────────────────────────────────────────────────────────────── */

const COMPLETION_THRESHOLD = 0.95

export function AudioPlayer({ payload }) {
  const { onReply } = useChatActions()

  const widgetId    = payload?.widget_id
  const audioId     = payload?.audio_id
  const isSilent    = Boolean(payload?.silent)
  const url         = payload?.url || ''
  const title       = payload?.title || 'Voice instruction'
  const description = payload?.description
  const speeds      = Array.isArray(payload?.speeds) && payload.speeds.length > 0
    ? payload.speeds
    : [1, 1.5, 2]

  const [completed, setCompleted] = useState(false)
  const [hasError, setHasError] = useState(false)
  /* Synchronous ref guard so the completion edge fires exactly once
     across racing paths. The shared component has its own gate that
     mirrors this — both must be set, but the response payload only
     fires from here. */
  const completedRef = useRef(false)

  const audioElRef = useRef(null)

  /* Edge-trigger the listen-completion response. Fires from
     MediaPlayerControls's onCompletionEdge callback, which is itself
     idempotent — but mirroring the gate here too means a second
     edge from any path is a true no-op for the response payload. */
  const handleCompletionEdge = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    const at = Date.now()
    setCompleted(true)
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

  const handleAudioError = useCallback(() => {
    setHasError(true)
  }, [])

  /* Pause the <audio> on unmount so a teardown mid-playback doesn't
     leave a phantom audio stream alive. The shared component handles
     its own RAF cleanup via mountedRef. */
  useEffect(() => {
    return () => {
      const el = audioElRef.current
      if (el) {
        try { el.pause() } catch { /* ignore */ }
      }
    }
  }, [])

  return (
    <div className={styles.card} role="article" aria-label={title} data-widget-id={widgetId} data-audio-id={audioId}>
      {/* Header — §2 verbatim */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Volume2 size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {/* Audio element — no event handlers in JSX; MediaPlayerControls
          attaches its own listeners via addEventListener. We only
          handle onError here because the controls component doesn't
          care about errors (the parent decides to degrade in place). */}
      <audio
        ref={audioElRef}
        src={url}
        preload="metadata"
        onError={handleAudioError}
        aria-hidden="true"
      />

      <MediaPlayerControls
        mediaRef={audioElRef}
        speeds={speeds}
        completed={completed}
        hasError={hasError}
        completionThreshold={COMPLETION_THRESHOLD}
        onCompletionEdge={handleCompletionEdge}
        listenedLabel="Listened"
      />
    </div>
  )
}
