import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Mic, Square } from 'lucide-react'
import { Button } from '@nexus/atoms'
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
const TICK_INTERVAL_MS = 100
const RMS_GAIN = 6                           // typical speech RMS ~0.05–0.3 → boost into 0..1
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

  /* Live-recording state. `bars` mirrors the ring buffer (32 RMS
     samples in [0, 1]) so React can render bar heights via a CSS
     custom property; `elapsedMs` drives the timer + warning beat +
     auto-stop check. Updated on a single 100ms interval. */
  const [bars, setBars] = useState(() => new Array(BAR_COUNT).fill(0))
  const [elapsedMs, setElapsedMs] = useState(0)

  /* Capture refs — survive re-renders without triggering them. */
  const streamRef         = useRef(null)
  const mediaRecorderRef  = useRef(null)
  const audioContextRef   = useRef(null)
  const analyserRef       = useRef(null)
  const tickRef           = useRef(null)
  const recordStartRef    = useRef(0)
  const ringBufferRef     = useRef(new Array(BAR_COUNT).fill(0))
  const chunksRef         = useRef([])
  const capturedRef       = useRef(null)        // { dataUrl, durationSec, mimeType, bars[] }

  /* Read the analyser's time-domain buffer and return its RMS. */
  const readRMS = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return 0
    const buf = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buf)
    let sumSq = 0
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i]
    return Math.sqrt(sumSq / buf.length)
  }, [])

  /* Tear down the audio graph + media stream + interval. Used by
     handleStopRecording, the unmount cleanup, and the re-record
     reset. Idempotent. */
  const teardownCapture = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    const s = streamRef.current
    if (s) {
      s.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    const ctx = audioContextRef.current
    if (ctx && ctx.state !== 'closed') {
      ctx.close().catch(() => { /* ignore */ })
    }
    audioContextRef.current = null
    analyserRef.current = null
  }, [])

  const handleStopRecording = useCallback(() => {
    /* Stop the analyser/sampler immediately; MediaRecorder's onstop
       fires asynchronously and finalises the captured payload. */
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    const mr = mediaRecorderRef.current
    if (mr && mr.state !== 'inactive') {
      try { mr.stop() } catch { /* ignore */ }
    }
  }, [])

  const handleStartRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermError('This browser does not support microphone access.')
      setPhase('denied')
      return
    }
    setPermError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const AudioCtx = window.AudioContext || window.webkitAudioContext
      const audioCtx = new AudioCtx()
      audioContextRef.current = audioCtx

      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      /* MediaRecorder — collect chunks then encode the final blob to
         a base64 data URL inside `onstop` so the captured payload is
         self-contained (parallel to ImageCapture's image_data_url). */
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        const durationSec = (Date.now() - recordStartRef.current) / 1000
        const finalBars = [...ringBufferRef.current]

        const reader = new FileReader()
        reader.onloadend = () => {
          capturedRef.current = {
            dataUrl: typeof reader.result === 'string' ? reader.result : '',
            durationSec,
            mimeType: blob.type,
            sizeBytes: blob.size,
            bars: finalBars,
          }
          /* Stream + audio context torn down only after the blob is
             encoded — closing the context too early can cancel the
             pending data delivery on some browsers. */
          teardownCapture()
          setPhase('preview')
        }
        reader.readAsDataURL(blob)
      }
      mediaRecorderRef.current = mr
      mr.start()

      recordStartRef.current = Date.now()
      ringBufferRef.current = new Array(BAR_COUNT).fill(0)
      chunksRef.current = []
      setBars([...ringBufferRef.current])
      setElapsedMs(0)
      setPhase('recording')

      /* Single 100ms loop: pushes one RMS sample into the ring
         buffer per tick, mirrors it into React state, advances the
         timer, and triggers auto-stop at the max-duration ceiling. */
      tickRef.current = setInterval(() => {
        const elapsed = Date.now() - recordStartRef.current
        setElapsedMs(elapsed)

        const rms = readRMS()
        ringBufferRef.current.shift()
        ringBufferRef.current.push(rms)
        setBars([...ringBufferRef.current])

        if (elapsed >= maxDurationSec * 1000) {
          handleStopRecording()
        }
      }, TICK_INTERVAL_MS)
    } catch (err) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access was denied. Allow microphone permission to continue.'
        : err?.name === 'NotFoundError'
          ? 'No microphone found on this device.'
          : (err?.message || 'Could not start recording.')
      setPermError(msg)
      setPhase('denied')
    }
  }, [maxDurationSec, readRMS, handleStopRecording, teardownCapture])

  /* Cleanup on unmount — stop everything, no leftover mic stream. */
  useEffect(() => () => teardownCapture(), [teardownCapture])

  /* Derived recording values. */
  const elapsedSec    = Math.floor(elapsedMs / 1000)
  const remainingMs   = Math.max(0, maxDurationSec * 1000 - elapsedMs)
  const isWarning     = phase === 'recording' && remainingMs <= WARNING_THRESHOLD_MS
  const minMet        = elapsedMs >= minDurationSec * 1000
  const stopDisabled  = phase === 'recording' && !minMet

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

      {/* ─── RECORDING — live waveform + timer + Stop ─────────── */}
      {phase === 'recording' && (
        <div className={styles.recordingBlock}>
          <div className={styles.recordingEyebrow}>
            <span className={styles.recordingDot} aria-hidden="true" />
            <span className={styles.recordingLabel}>Recording</span>
          </div>

          <div className={styles.waveform} aria-hidden="true">
            {bars.map((v, i) => {
              const norm = Math.min(1, Math.max(0, v * RMS_GAIN))
              return (
                <span
                  key={i}
                  className={cx(styles.bar, norm <= 0 && styles.barEmpty)}
                  style={{ '--bar-norm': norm }}
                />
              )
            })}
          </div>

          <div
            className={cx(styles.timer, isWarning && styles.timerWarning)}
            aria-live="polite"
          >
            {formatTime(elapsedSec)}
          </div>

          <Button
            variant="secondary"
            size="md"
            className={styles.stopBtn}
            onClick={handleStopRecording}
            disabled={stopDisabled}
            iconLeft={<Square size={14} strokeWidth={2.25} aria-hidden="true" />}
          >
            {stopDisabled
              ? `Hold for ${minDurationSec}s`
              : 'Stop recording'}
          </Button>
        </div>
      )}

      {/* PREVIEW / SUBMITTED / DENIED — regions 3–4 */}
    </div>
  )
}
