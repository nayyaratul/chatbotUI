import { useCallback, useEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Mic, Square, Play, Pause, RotateCcw, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react'
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

  /* Playback state — only meaningful in PREVIEW + SUBMITTED. */
  const [isPlaying, setIsPlaying]     = useState(false)
  const [playProgress, setPlayProgress] = useState(0)         // 0..1
  const [submittedAt, setSubmittedAt] = useState(null)

  /* Capture refs — survive re-renders without triggering them. */
  const streamRef         = useRef(null)
  const mediaRecorderRef  = useRef(null)
  const audioContextRef   = useRef(null)
  const analyserRef       = useRef(null)
  const tickRef           = useRef(null)
  const recordStartRef    = useRef(0)
  const ringBufferRef     = useRef(new Array(BAR_COUNT).fill(0))
  const chunksRef         = useRef([])
  const capturedRef       = useRef(null)        // { dataUrl, durationSec, mimeType, sizeBytes, bars[] }
  const audioElRef        = useRef(null)        // <audio> for playback in PREVIEW
  const playRafRef        = useRef(null)        // RAF loop while playing
  const mountedRef        = useRef(true)        // gates async setState after unmount
  const stopFallbackRef   = useRef(null)        // safety timer if mr.onstop never fires

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

  /* Freeze the bar history and transition to PREVIEW. Synchronous —
     uses URL.createObjectURL (instant) for playback rather than
     FileReader.readAsDataURL (async, was hanging in some browsers
     and never resolving onloadend). The base64 data URL needed for
     the widget_response is generated at submit time instead.
     Idempotent against unmount and against double-firing (e.g.,
     onstop + fallback timer racing — the second call hits an
     already-set capturedRef and re-runs the same setPhase no-op). */
  const finalizeRecording = useCallback((blob) => {
    /* eslint-disable no-console */
    console.log('[VoiceRecording] finalizeRecording, blob size:', blob.size, 'type:', blob.type)
    if (!mountedRef.current) {
      console.log('[VoiceRecording] not mounted — bailing')
      teardownCapture()
      return
    }
    /* If we've already finalised once, don't redo it. */
    if (capturedRef.current) {
      console.log('[VoiceRecording] already finalised — skipping')
      return
    }
    const durationSec = (Date.now() - recordStartRef.current) / 1000
    const finalBars = [...ringBufferRef.current]

    let objectUrl = ''
    try {
      objectUrl = URL.createObjectURL(blob)
    } catch (err) {
      console.warn('[VoiceRecording] createObjectURL threw:', err)
    }

    capturedRef.current = {
      blob,
      objectUrl,
      durationSec,
      mimeType: blob.type,
      sizeBytes: blob.size,
      bars: finalBars,
    }
    console.log('[VoiceRecording] capturedRef set, transitioning to preview')
    teardownCapture()
    setPhase('preview')
    /* eslint-enable no-console */
  }, [teardownCapture])

  const handleStopRecording = useCallback(() => {
    /* eslint-disable no-console */
    console.log('[VoiceRecording] handleStopRecording invoked')

    /* Stop the analyser/sampler immediately; MediaRecorder's onstop
       fires asynchronously and finalises the captured payload. */
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }

    /* Schedule a defensive fallback UNCONDITIONALLY — even if
       mediaRecorderRef is null or already inactive, the fallback
       still fires the transition with whatever data we have. This
       is the belt-and-suspenders against any path where mr.onstop
       might not fire (dropped event, browser bug, weird mr state). */
    if (stopFallbackRef.current) clearTimeout(stopFallbackRef.current)
    stopFallbackRef.current = setTimeout(() => {
      console.log('[VoiceRecording] fallback timer fired — finalizing')
      stopFallbackRef.current = null
      if (!mountedRef.current) return
      const fbMr = mediaRecorderRef.current
      const blob = new Blob(chunksRef.current, {
        type: fbMr?.mimeType || 'audio/webm',
      })
      finalizeRecording(blob)
    }, 800)

    /* Try the normal MediaRecorder.stop() path. If it fails or
       mr is in a weird state, the fallback above still saves us. */
    const mr = mediaRecorderRef.current
    console.log('[VoiceRecording] mr state at stop:', mr?.state)
    if (mr && mr.state !== 'inactive') {
      try {
        /* Flush any pending data buffered inside the recorder
           (start() was called without a timeslice, so dataavailable
           only fires on stop; some browsers skip that delivery on
           very short clips). */
        if (typeof mr.requestData === 'function') mr.requestData()
        mr.stop()
        console.log('[VoiceRecording] mr.stop() called')
      } catch (err) {
        console.warn('[VoiceRecording] mr.stop() threw:', err)
      }
    }
    /* eslint-enable no-console */
  }, [finalizeRecording])

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
        /* eslint-disable no-console */
        console.log('[VoiceRecording] mr.onstop fired')
        /* Cancel the defensive fallback — the real onstop fired. */
        if (stopFallbackRef.current) {
          clearTimeout(stopFallbackRef.current)
          stopFallbackRef.current = null
        }
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        finalizeRecording(blob)
        /* eslint-enable no-console */
      }
      mr.onerror = (e) => {
        /* eslint-disable no-console */
        console.warn('[VoiceRecording] MediaRecorder error', e)
        /* Force the same finalize path so we don't get stuck. */
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        finalizeRecording(blob)
        /* eslint-enable no-console */
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

  /* ─── Playback (PREVIEW + SUBMITTED) ──────────────────────── */

  const stopPlayRaf = useCallback(() => {
    if (playRafRef.current) {
      cancelAnimationFrame(playRafRef.current)
      playRafRef.current = null
    }
  }, [])

  const handlePlayPause = useCallback(() => {
    const el = audioElRef.current
    if (!el) return
    if (el.paused) {
      el.play().catch(() => { /* autoplay policy — usually fine after user gesture */ })
    } else {
      el.pause()
    }
  }, [])

  const handleAudioPlay = useCallback(() => {
    setIsPlaying(true)
    /* RAF loop drives the sweep — ~60fps is much smoother than the
       4Hz `timeupdate` event. */
    const tick = () => {
      const el = audioElRef.current
      if (!el) return
      const dur = el.duration || capturedRef.current?.durationSec || 0
      const progress = dur > 0 ? Math.min(1, el.currentTime / dur) : 0
      setPlayProgress(progress)
      playRafRef.current = requestAnimationFrame(tick)
    }
    playRafRef.current = requestAnimationFrame(tick)
  }, [])

  const handleAudioPause = useCallback(() => {
    setIsPlaying(false)
    stopPlayRaf()
  }, [stopPlayRaf])

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false)
    setPlayProgress(1)
    stopPlayRaf()
  }, [stopPlayRaf])

  const handleReRecord = useCallback(() => {
    /* Stop any current playback, drop the captured payload, return
       to IDLE. Does NOT auto-restart getUserMedia — user re-taps. */
    const el = audioElRef.current
    if (el) {
      try { el.pause() } catch { /* ignore */ }
      el.removeAttribute('src')
      try { el.load() } catch { /* ignore */ }
    }
    stopPlayRaf()
    setIsPlaying(false)
    setPlayProgress(0)
    setBars(new Array(BAR_COUNT).fill(0))
    setElapsedMs(0)
    /* Release the previous Object URL so the browser can GC the blob. */
    if (capturedRef.current?.objectUrl) {
      try { URL.revokeObjectURL(capturedRef.current.objectUrl) } catch { /* ignore */ }
    }
    capturedRef.current = null
    setPhase('idle')
  }, [stopPlayRaf])

  /* Cleanup on unmount — stop the recorder explicitly + null its
     onstop so the FileReader path doesn't fire on a dead component,
     stop mic stream, release audio context, cancel RAF, pause any
     playing <audio>. The `mountedRef` flag is the belt to this
     teardown's suspenders for the recorder→reader async window. */
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (stopFallbackRef.current) {
        clearTimeout(stopFallbackRef.current)
        stopFallbackRef.current = null
      }
      const mr = mediaRecorderRef.current
      if (mr) {
        mr.onstop = null
        mr.ondataavailable = null
        mr.onerror = null
        if (mr.state !== 'inactive') {
          try { mr.stop() } catch { /* ignore */ }
        }
        mediaRecorderRef.current = null
      }
      /* Release the captured-blob's Object URL on unmount. */
      if (capturedRef.current?.objectUrl) {
        try { URL.revokeObjectURL(capturedRef.current.objectUrl) } catch { /* ignore */ }
      }
      teardownCapture()
      stopPlayRaf()
      const el = audioElRef.current
      if (el) {
        try { el.pause() } catch { /* ignore */ }
      }
    }
  }, [teardownCapture, stopPlayRaf])

  /* Escape during RECORDING stops the take (only if min met) — spec
     §Interactions. Listener attaches only while recording. */
  useEffect(() => {
    if (phase !== 'recording') return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && elapsedMs >= minDurationSec * 1000) {
        e.preventDefault()
        handleStopRecording()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, elapsedMs, minDurationSec, handleStopRecording])

  const handleSubmit = useCallback(() => {
    const captured = capturedRef.current
    if (!captured) return
    const recordedAt = Date.now()
    setSubmittedAt(recordedAt)
    /* Freeze the sweep at 100% — the submitted-state waveform reads
       as a tone-success "stamp" of the captured clip. Replay from
       the post-submit play button still updates currentTime but the
       sweep is success-on-success, so visually it stays frozen. */
    setPlayProgress(1)
    setPhase('submitted')

    /* Encode the blob to a base64 data URL for the widget_response
       payload (parallel to ImageCapture's image_data_url). This is
       async — done at submit time rather than capture time so the
       PREVIEW transition doesn't block on the encode. If the reader
       fails, fall back to the Object URL so the bot still receives
       a playable handle to the audio. */
    const fireReply = (audioUrl) => onReply?.(
      {
        type: 'widget_response',
        payload: {
          source_type: 'voice_recording',
          source_widget_id: widgetId,
          data: {
            label: title,
            prompt_id: promptId,
            audio_data_url: audioUrl,
            duration_seconds: captured.durationSec,
            mime_type: captured.mimeType,
            recorded_at: recordedAt,
          },
        },
      },
      { silent: isSilent },
    )

    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : captured.objectUrl
        fireReply(result)
      }
      reader.onerror = () => fireReply(captured.objectUrl)
      reader.readAsDataURL(captured.blob)
    } catch {
      fireReply(captured.objectUrl)
    }
  }, [onReply, widgetId, title, promptId, isSilent])

  /* Derived recording values. */
  const elapsedSec      = Math.floor(elapsedMs / 1000)
  const remainingMs     = Math.max(0, maxDurationSec * 1000 - elapsedMs)
  const isWarning       = phase === 'recording' && remainingMs <= WARNING_THRESHOLD_MS
  const minMet          = elapsedMs >= minDurationSec * 1000
  const remainingMinSec = Math.max(0, Math.ceil((minDurationSec * 1000 - elapsedMs) / 1000))
  const stopDisabled  = phase === 'recording' && !minMet

  /* Frozen-bar values for PREVIEW + SUBMITTED. Pre-normalised once
     so the render path doesn't rebuild on every re-render. */
  const captured       = capturedRef.current
  const previewBars    = captured?.bars ?? null
  const previewDuration = captured?.durationSec ?? 0
  const previewSize    = captured?.sizeBytes ?? 0
  const previewCurrent = isPlaying
    ? playProgress * previewDuration
    : (playProgress >= 1 ? previewDuration : 0)

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

      {/* Prompt block (optional) — the actual question/situation the
          user is being asked to answer. Promoted to headline weight
          so it reads first; the §2 title becomes a category label. */}
      {prompt && (
        <p className={styles.promptText}>{prompt}</p>
      )}

      {/* ─── Media region — single fixed-height container that holds
          whichever state is active. All state-specific blocks render
          inside this wrapper at the same top position so the card
          doesn't visually jump as phases change (§4 constant-height
          contract). The wrapper takes flex:1 of the card's vertical
          space below the header + prompt. */}
      <div className={styles.mediaRegion}>
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

          <div
            className={cx(styles.waveform, isWarning && styles.waveformWarning)}
            aria-hidden="true"
          >
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

          {/* Plain <button> rather than the Nexus atom so we can
              control the disabled-state UX precisely (live countdown
              label) and keep the click handler as direct as possible. */}
          <button
            type="button"
            className={cx(styles.stopBtn, stopDisabled && styles.stopBtnDisabled)}
            onClick={handleStopRecording}
            disabled={stopDisabled}
          >
            <Square size={14} strokeWidth={2.25} aria-hidden="true" />
            <span className={styles.stopBtnLabel}>
              {stopDisabled
                ? `Hold for ${remainingMinSec}s more`
                : 'Stop recording'}
            </span>
          </button>
        </div>
      )}

      {/* ─── PREVIEW — frozen waveform + playback sweep + actions ─ */}
      {phase === 'preview' && previewBars && (
        <div className={styles.previewBlock}>
          <audio
            ref={audioElRef}
            src={captured.objectUrl}
            onPlay={handleAudioPlay}
            onPause={handleAudioPause}
            onEnded={handleAudioEnded}
            preload="metadata"
            aria-hidden="true"
          />

          <div className={styles.previewRow}>
            <button
              type="button"
              className={styles.playBtn}
              onClick={handlePlayPause}
              aria-label={
                isPlaying ? 'Pause playback'
                  : playProgress >= 1 ? 'Replay recording'
                    : 'Play recording'
              }
            >
              {isPlaying
                ? <Pause size={18} strokeWidth={2.25} aria-hidden="true" />
                : playProgress >= 1
                  ? <RotateCcw size={18} strokeWidth={2.25} aria-hidden="true" />
                  : <Play size={18} strokeWidth={2.25} aria-hidden="true" />}
            </button>

            {/* `previewWaveformEnded` toggles off for at least one
                render frame on Replay (isPlaying flips to true while
                playProgress is still 1 from the prior end), so the
                end-pulse keyframe re-fires on every replay-then-end. */}
            <div
              className={cx(
                styles.previewWaveform,
                playProgress >= 1 && !isPlaying && styles.previewWaveformEnded,
              )}
              style={{ '--play-progress': playProgress }}
              aria-hidden="true"
            >
              {/* Base layer: bars in grey-30 (unplayed). */}
              <div className={styles.waveformLayer}>
                {previewBars.map((v, i) => {
                  const norm = Math.min(1, Math.max(0, v * RMS_GAIN))
                  return (
                    <span
                      key={i}
                      className={cx(styles.bar, styles.barUnplayed, norm <= 0 && styles.barEmpty)}
                      style={{ '--bar-norm': norm }}
                    />
                  )
                })}
              </div>
              {/* Sweep layer: same bars in brand-60, clipped L→R by --play-progress. */}
              <div className={cx(styles.waveformLayer, styles.waveformSweep)}>
                {previewBars.map((v, i) => {
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
            </div>

            <div className={styles.previewDuration}>
              {isPlaying
                ? `${formatTime(previewCurrent)} / ${formatTime(previewDuration)}`
                : formatTime(previewDuration)}
            </div>
          </div>

          <div className={styles.actionsRow}>
            <Button
              variant="secondary"
              size="md"
              className={styles.reRecordBtn}
              iconLeft={<RotateCcw size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleReRecord}
            >
              Re-record
            </Button>
            <Button
              variant="primary"
              size="md"
              className={styles.submitBtn}
              iconRight={<ArrowRight size={14} strokeWidth={2.25} aria-hidden="true" />}
              onClick={handleSubmit}
            >
              Submit recording
            </Button>
          </div>
        </div>
      )}

      {/* ─── SUBMITTED — success banner + frozen waveform ─────── */}
      {phase === 'submitted' && previewBars && (
        <div className={styles.submittedBlock}>
          <div className={styles.successBanner}>
            <span className={styles.successCheck} aria-hidden="true">
              <CheckCircle2 size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.successBody}>
              <div className={styles.successTitle}>Voice clip submitted</div>
              <div className={styles.successSub}>
                Saved successfully{submittedAt ? ` · ${timeLabel(submittedAt)}` : ''}
              </div>
            </div>
          </div>

          <audio
            ref={audioElRef}
            src={captured.objectUrl}
            onPlay={handleAudioPlay}
            onPause={handleAudioPause}
            onEnded={handleAudioEnded}
            preload="metadata"
            aria-hidden="true"
          />

          <div className={cx(styles.previewRow, styles.previewRowSubmitted)}>
            <button
              type="button"
              className={cx(styles.playBtn, styles.playBtnSubmitted)}
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause playback' : 'Replay recording'}
            >
              {isPlaying
                ? <Pause size={18} strokeWidth={2.25} aria-hidden="true" />
                : <Play size={18} strokeWidth={2.25} aria-hidden="true" />}
            </button>

            <div
              className={styles.previewWaveform}
              style={{ '--play-progress': playProgress }}
              aria-hidden="true"
            >
              <div className={styles.waveformLayer}>
                {previewBars.map((v, i) => {
                  const norm = Math.min(1, Math.max(0, v * RMS_GAIN))
                  return (
                    <span
                      key={i}
                      className={cx(styles.bar, styles.barSubmitted, norm <= 0 && styles.barEmpty)}
                      style={{ '--bar-norm': norm }}
                    />
                  )
                })}
              </div>
              <div className={cx(styles.waveformLayer, styles.waveformSweep)}>
                {previewBars.map((v, i) => {
                  const norm = Math.min(1, Math.max(0, v * RMS_GAIN))
                  return (
                    <span
                      key={i}
                      className={cx(styles.bar, styles.barSubmitted, norm <= 0 && styles.barEmpty)}
                      style={{ '--bar-norm': norm }}
                    />
                  )
                })}
              </div>
            </div>

            <div className={styles.previewDuration}>
              {isPlaying
                ? `${formatTime(previewCurrent)} / ${formatTime(previewDuration)}`
                : formatTime(previewDuration)}
            </div>
          </div>

          {/* Compact submission receipt — single inline meta line so
              the SUBMITTED block stays within the 176px state-block
              floor and doesn't push the card taller than other phases.
              Title leads (bold), then duration · size, all dotted. */}
          <p className={styles.submittedMeta}>
            <strong className={styles.submittedMetaTitle}>{title}</strong>
            <span aria-hidden="true" className={styles.submittedMetaSep}>·</span>
            <span className={styles.submittedMetaItem}>
              {Math.round(previewDuration)}s
            </span>
            {previewSize > 0 && (
              <>
                <span aria-hidden="true" className={styles.submittedMetaSep}>·</span>
                <span className={styles.submittedMetaItem}>{formatBytes(previewSize)}</span>
              </>
            )}
          </p>
        </div>
      )}

      {/* ─── DENIED — permission error + retry ────────────────── */}
      {phase === 'denied' && (
        <div className={styles.deniedBlock}>
          <div className={styles.deniedIcon} aria-hidden="true">
            <ShieldAlert size={32} strokeWidth={1.5} />
          </div>
          <div className={styles.deniedBody}>
            <div className={styles.deniedTitle}>Microphone required</div>
            <div className={styles.deniedSub}>
              {permError || 'Allow microphone permission to continue.'}
            </div>
          </div>
          <Button
            variant="secondary"
            size="md"
            className={styles.retryBtn}
            onClick={() => { setPermError(null); handleStartRecording() }}
          >
            Try again
          </Button>
        </div>
      )}
      </div>
    </div>
  )
}
