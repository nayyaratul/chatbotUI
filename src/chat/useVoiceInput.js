import { useCallback, useEffect, useRef, useState } from 'react'

/* Real voice input for voice mode.
 *
 * Two browser-native pieces, no backend / API keys:
 *  1. SpeechRecognition (Web Speech API) → live transcription. Final
 *     phrases are handed to `onUtterance` (the composer submits them as a
 *     spoken turn; the mock bot's reply then streams back).
 *  2. getUserMedia + AnalyserNode → an RMS amplitude `level` (0..1) so the
 *     "you speaking" border can react to the user's actual voice.
 *
 * Requesting the mic for the analyser is what surfaces the browser's
 * permission prompt when voice mode opens. SpeechRecognition is
 * Chromium/Safari-only (webkit-prefixed); where it's missing, `supported`
 * is false and the composer falls back to type-to-speak.
 */

const SpeechRecognitionImpl =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

const RMS_GAIN = 6
/* End-of-speech: only submit a turn after this much continuous silence, so
   brief pauses between words don't cut your sentence short. */
const END_SILENCE_MS = 1200
/* Barge-in auto-calibrates to the room: it tracks the ambient noise floor
   and interrupts when your voice rises over (floor + margin) for a
   sustained burst — so steady background becomes part of the floor and a
   quiet room lowers the bar. The margin comes from the Studio sensitivity
   slider: higher sensitivity → smaller margin → easier to interrupt. */
const BARGE_MARGIN_MAX = 0.3 // least sensitive (slider 0%)
const BARGE_MARGIN_MIN = 0.04 // most sensitive (slider 100%)
const BARGE_MIN = 0.1 // absolute floor so silence blips never trigger
const BARGE_FRAMES = 9 // ~150ms of continuous over-floor speech before interrupting

function marginForSensitivity(s) {
  const v = typeof s === 'number' ? Math.max(0, Math.min(1, s)) : 0.5
  return BARGE_MARGIN_MAX - v * (BARGE_MARGIN_MAX - BARGE_MARGIN_MIN)
}

export function useVoiceInput({
  active,
  listening,
  muted = false,
  assistantSpeaking = false,
  bargeSensitivity = 0.5,
  onUtterance,
  onInterrupt,
  lang = 'en-IN',
}) {
  const supported = Boolean(SpeechRecognitionImpl)

  const [status, setStatus] = useState('idle') // 'idle' | 'listening' | 'denied' | 'unsupported'
  const [interim, setInterim] = useState('')
  const [level, setLevel] = useState(0)

  const onUtteranceRef = useRef(onUtterance)
  onUtteranceRef.current = onUtterance
  const onInterruptRef = useRef(onInterrupt)
  onInterruptRef.current = onInterrupt
  const listeningRef = useRef(listening)
  listeningRef.current = listening
  const mutedRef = useRef(muted)
  mutedRef.current = muted
  const assistantSpeakingRef = useRef(assistantSpeaking)
  assistantSpeakingRef.current = assistantSpeaking
  const bargeFramesRef = useRef(0)
  const bargedRef = useRef(false)
  const noiseFloorRef = useRef(0.06)
  const bargeSensitivityRef = useRef(bargeSensitivity)
  bargeSensitivityRef.current = bargeSensitivity
  const finalBufRef = useRef('')
  const silenceTimerRef = useRef(null)

  /* End-of-speech: fire the accumulated final transcript as one turn. */
  const flushUtterance = useCallback(() => {
    silenceTimerRef.current = null
    const text = finalBufRef.current.trim()
    finalBufRef.current = ''
    setInterim('')
    if (text && acceptingRef.current) onUtteranceRef.current?.(text)
  }, [])

  const recRef = useRef(null)
  const runningRef = useRef(false)
  /* `accepting` is the gate that breaks the TTS→mic feedback loop: results
     are only honoured while it's true (the armed listening window). It's
     false during the bot's turn and during the post-reply cooldown. */
  const acceptingRef = useRef(false)
  const deniedRef = useRef(false)
  const restartRef = useRef(null)

  const streamRef = useRef(null)
  const ctxRef = useRef(null)
  const rafRef = useRef(null)

  /* ── Speech recognition ─────────────────────────────────────────── */
  const stopRec = useCallback(() => {
    runningRef.current = false
    acceptingRef.current = false
    if (restartRef.current) {
      clearTimeout(restartRef.current)
      restartRef.current = null
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    finalBufRef.current = ''
    const rec = recRef.current
    if (rec) {
      /* abort() (not stop()) discards buffered audio immediately, so a
         tail of the assistant's voice can't arrive as a final result. */
      try { rec.abort() } catch { /* not started */ }
    }
  }, [])

  const startRec = useCallback(() => {
    if (!supported || deniedRef.current || runningRef.current) return

    let rec = recRef.current
    if (!rec) {
      rec = new SpeechRecognitionImpl()
      rec.lang = lang
      rec.continuous = true
      rec.interimResults = true

      rec.onresult = (e) => {
        /* Drop anything captured outside the armed window — this is what
           stops the assistant's own spoken reply from being transcribed
           and fed back as a new user turn. */
        if (!acceptingRef.current) {
          setInterim('')
          return
        }
        let pending = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i]
          const transcript = result[0]?.transcript ?? ''
          if (result.isFinal) {
            finalBufRef.current = `${finalBufRef.current} ${transcript}`.trim()
          } else {
            pending += transcript
          }
        }
        /* Show finals + the in-progress words live. */
        setInterim(`${finalBufRef.current} ${pending}`.trim())
        /* Reset the end-of-speech timer — submit only after a real pause,
           so short gaps between words don't cut the turn short. */
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = setTimeout(flushUtterance, END_SILENCE_MS)
      }

      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          deniedRef.current = true
          runningRef.current = false
          setStatus('denied')
        }
        /* 'no-speech' / 'aborted' / 'network' fall through to onend,
           which restarts if we should still be listening. */
      }

      rec.onend = () => {
        runningRef.current = false
        if (listeningRef.current && acceptingRef.current && !deniedRef.current) {
          restartRef.current = setTimeout(() => {
            if (listeningRef.current && acceptingRef.current) startRec()
          }, 250)
        }
      }

      recRef.current = rec
    }

    try {
      rec.start()
      runningRef.current = true
      setStatus('listening')
    } catch {
      /* start() throws if already running — ignore. */
    }
  }, [supported, lang, flushUtterance])

  useEffect(() => {
    if (!supported) {
      setStatus('unsupported')
      return undefined
    }
    let armTimer = null
    if (listening) {
      /* Arm after a short cooldown so the tail of the assistant's voice
         (speaker echo / room reverb) isn't captured the instant the bot's
         turn ends and we resume listening. */
      armTimer = setTimeout(() => {
        acceptingRef.current = true
        startRec()
      }, 300)
    } else {
      stopRec()
      setInterim('')
      setStatus((s) => (s === 'denied' ? 'denied' : 'idle'))
    }
    return () => {
      if (armTimer) clearTimeout(armTimer)
    }
  }, [listening, supported, startRec, stopRec])

  /* ── Mic amplitude + barge-in (drives the reactive border) ───────────
     Runs only while voice is active AND not muted — so muting truly
     releases the mic (the OS "in use" indicator goes off), not just the
     transcription. echoCancellation keeps the assistant's own TTS out of
     the signal, so the amplitude reads the user, not the speakers. */
  useEffect(() => {
    if (!active || muted || !navigator.mediaDevices?.getUserMedia) return undefined
    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioCtx()
        ctxRef.current = ctx
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        source.connect(analyser)
        const buf = new Float32Array(analyser.fftSize)
        const loop = () => {
          analyser.getFloatTimeDomainData(buf)
          let sumSq = 0
          for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i]
          const lvl = Math.min(1, Math.sqrt(sumSq / buf.length) * RMS_GAIN)
          /* Quantise so React only re-renders on a meaningful change. */
          setLevel(Math.round(lvl * 40) / 40)

          /* Adaptive barge-in. The bar is the tracked ambient floor + a
             margin. While you're under it, the floor slowly follows the
             room; while you're over it, the floor freezes so your own
             speech can't inflate it. Interrupt on a sustained burst over
             the bar while the assistant is speaking. */
          const bar = Math.max(BARGE_MIN, noiseFloorRef.current + marginForSensitivity(bargeSensitivityRef.current))
          const over = lvl > bar
          if (!over) {
            noiseFloorRef.current = noiseFloorRef.current * 0.95 + lvl * 0.05
          }
          if (assistantSpeakingRef.current && !mutedRef.current && !bargedRef.current) {
            if (over) {
              bargeFramesRef.current += 1
              if (bargeFramesRef.current >= BARGE_FRAMES) {
                bargedRef.current = true
                bargeFramesRef.current = 0
                onInterruptRef.current?.()
              }
            } else {
              bargeFramesRef.current = 0
            }
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        loop()
      })
      .catch(() => {
        /* Denied — recognition's onerror sets the 'denied' status + the
           type-to-speak fallback. The bloom/border just won't react. */
        deniedRef.current = true
        setStatus('denied')
      })

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {})
      }
      ctxRef.current = null
      setLevel(0)
    }
  }, [active, muted])

  /* Re-arm barge-in detection for each new spoken turn. */
  useEffect(() => {
    if (!assistantSpeaking) {
      bargedRef.current = false
      bargeFramesRef.current = 0
    }
  }, [assistantSpeaking])

  /* Reset the denied latch when voice mode is fully closed, so a later
     re-open re-requests permission. */
  useEffect(() => {
    if (!active) deniedRef.current = false
  }, [active])

  /* Teardown on unmount. */
  useEffect(() => {
    return () => {
      stopRec()
      const rec = recRef.current
      if (rec) {
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
      }
    }
  }, [stopRec])

  return { supported, status, interim, level }
}
