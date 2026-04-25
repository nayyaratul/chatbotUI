import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Mic } from 'lucide-react'
import { useChatActions } from '../chat/ChatActionsContext.jsx'
import styles from './voiceRecording.module.scss'

/* ─── Voice Recording Widget (CSV #26) ───────────────────────────────
   Discrete voice-recording widget for bounded audio capture
   (typically 10–120 seconds). Tap-to-start, tap-to-stop. Captures
   via getUserMedia + MediaRecorder. The 32-bar live waveform driven
   by Web Audio AnalyserNode RMS is the signature primitive — sets
   the audio data-viz vocabulary that #25 Audio Player will inherit.

   State machine:
     idle → (tap mic) → recording → (tap stop OR max reached) → preview
                              ↓                                    ↓
                              └── (perm denied) → denied            ├── (re-record) → idle
                                       ↓                            └── (submit) → submitted
                                  (try again) → recording

   ──────────────────────────────────────────────────────────────── */

const BAR_COUNT = 32
const SAMPLE_INTERVAL_MS = 100               // ~10 samples/sec → 32 bars = ~3.2s history
const FALLBACK_MAX_DURATION = 60
const WARNING_THRESHOLD_MS = 5000            // timer goes red 5s before max

/* ─── Helpers ───────────────────────────────────────────────────── */

function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes ?? 0} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeLabel(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const hh = d.getHours() % 12 || 12
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'am' : 'pm'
  return `${hh}:${mm} ${ampm}`
}

/* ─── Root ──────────────────────────────────────────────────────── */

export function VoiceRecording({ payload }) {
  const { onReply } = useChatActions()

  const widgetId        = payload?.widget_id
  const promptId        = payload?.prompt_id
  const title           = payload?.title ?? 'Record your answer'
  const description     = payload?.description
  const prompt          = payload?.prompt
  const maxDurationSec  = Number(payload?.max_duration_seconds) || FALLBACK_MAX_DURATION
  const minDurationSec  = Math.max(0, Number(payload?.min_duration_seconds) || 0)
  const isSilent        = Boolean(payload?.silent)

  /* 'idle' | 'recording' | 'preview' | 'submitted' | 'denied' */
  const [phase, setPhase] = useState('idle')
  const [permError, setPermError] = useState(null)

  /* Region 1: visual scaffold only. Region 2 wires getUserMedia +
     MediaRecorder + AnalyserNode and replaces this stub. */
  const handleStartRecording = useCallback(() => {
    /* TODO(region 2): real capture lifecycle. */
    setPhase('recording')
  }, [])

  return (
    <div className={styles.card} role="article" aria-label={title}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconBadge} aria-hidden="true">
          <Mic size={18} strokeWidth={2} />
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      {/* Prompt block (optional) */}
      {prompt && (
        <div className={styles.promptBlock}>
          <span className={styles.promptEyebrow}>Prompt</span>
          <p className={styles.promptText}>{prompt}</p>
        </div>
      )}

      {/* ─── IDLE — big mic capture button ────────────────────────── */}
      {phase === 'idle' && (
        <button
          type="button"
          className={styles.captureBtn}
          onClick={handleStartRecording}
        >
          <div className={styles.captureIcon} aria-hidden="true">
            <Mic size={28} strokeWidth={1.75} />
          </div>
          <div className={styles.captureText}>
            <span className={styles.captureLabel}>Tap to record</span>
            <span className={styles.captureSub}>
              {minDurationSec > 0
                ? `Min ${minDurationSec}s · max ${maxDurationSec}s`
                : `Up to ${maxDurationSec}s`}
            </span>
          </div>
        </button>
      )}

      {/* RECORDING / PREVIEW / SUBMITTED / DENIED — regions 2–4 */}
    </div>
  )
}
