import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { respond } from './mockBot.js'

/* Voice transcript cadence: the backend delivers the assistant's reply in
   ~10–12-word chunks, so in voice mode we reveal a text reply chunk by
   chunk on this interval rather than appending it whole. */
const CHUNK_MIN_WORDS = 10
const CHUNK_MAX_WORDS = 12
const CHUNK_INTERVAL_MS = 750

/* Split a reply into ~10–12-word chunks (the unit the transcript streams
   in). Last chunk takes whatever's left. */
function chunkWords(text) {
  const words = (text ?? '').trim().split(/\s+/).filter(Boolean)
  const chunks = []
  for (let i = 0; i < words.length; ) {
    const remaining = words.length - i
    const size = remaining <= CHUNK_MAX_WORDS ? remaining : CHUNK_MIN_WORDS
    chunks.push(words.slice(i, i + size).join(' '))
    i += size
  }
  return chunks.length ? chunks : ['']
}

/* Maps a queued bot widget's `type` to a context-aware verb bucket
   the typing indicator can pick from. Buckets are intentionally
   coarse — one set of verbs per "kind of work the bot is doing"
   rather than per widget. Anything unmapped falls back to 'default'. */
function inferTypingContext(widget) {
  const type = widget?.type
  if (!type) return null
  switch (type) {
    case 'job_card':           return 'jobs'
    case 'carousel':           return 'jobs'
    case 'form':               return 'form'
    case 'validated_input':    return 'form'
    case 'image_capture':      return 'photo'
    case 'qc_evidence_review': return 'photo'
    case 'evidence_review':    return 'photo'
    case 'rating':             return 'rating'
    case 'confirmation':       return 'confirm'
    case 'score_card':         return 'scoring'
    case 'mcq_quiz':           return 'scoring'
    case 'leaderboard':        return 'profile'
    case 'profile':            return 'profile'
    case 'comparison':         return 'compare'
    case 'file_upload':        return 'upload'
    default:                   return 'default'
  }
}

export function useBot() {
  const [messages, setMessages] = useState([])
  const [engineTyping, setEngineTyping] = useState(false)
  const [typingContext, setTypingContext] = useState(null)
  const [typingOverride, setTypingOverride] = useState('auto') // 'auto' | 'on' | 'off'
  const [latencyMs, setLatencyMs] = useState(700)
  const [ttsSpeaking, setTtsSpeaking] = useState(false)

  const latencyRef = useRef(latencyMs)
  latencyRef.current = latencyMs

  const timersRef = useRef(new Set())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((id) => clearTimeout(id))
      timers.clear()
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [])

  const append = useCallback((role, widget, extra) => {
    const message = { id: uuid(), role, timestamp: Date.now(), widget, ...extra }
    setMessages((prev) => [...prev, message])
    return message
  }, [])

  const patchMessage = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  /* Reveal a bot text reply as a streamed transcript: post the first
     chunk, then grow the bubble one chunk at a time while the message
     carries `streaming: true`. The composer reads `isBotSpeaking` off
     this flag to run the speaking bloom for exactly the stream's life. */
  const streamBotReply = useCallback(
    (fullText) => {
      const chunks = chunkWords(fullText)
      const message = append('bot', { type: 'text', payload: { text: chunks[0] } }, {
        streaming: chunks.length > 1,
      })
      if (chunks.length <= 1) return

      let i = 1
      const tick = () => {
        const more = i + 1 < chunks.length
        patchMessage(message.id, {
          widget: { type: 'text', payload: { text: chunks.slice(0, i + 1).join(' ') } },
          streaming: more,
        })
        i += 1
        if (more) {
          const t = setTimeout(tick, CHUNK_INTERVAL_MS)
          timersRef.current.add(t)
        }
      }
      const t0 = setTimeout(tick, CHUNK_INTERVAL_MS)
      timersRef.current.add(t0)
    },
    [append, patchMessage],
  )

  /* Speak a reply aloud with the browser's built-in voice
     (SpeechSynthesis — free, no model download, uses the OS voices).
     `ttsSpeaking` keeps the composer's speaking bloom up for the real
     duration of the spoken audio rather than just the text reveal. */
  const speakReply = useCallback((text) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!synth || !text) return
    try {
      synth.cancel()
      const utter = new SpeechSynthesisUtterance(text)
      utter.lang = 'en-IN'
      const voices = synth.getVoices?.() ?? []
      const pick =
        voices.find((v) => /^en[-_]IN/i.test(v.lang)) ||
        voices.find((v) => /^en/i.test(v.lang))
      if (pick) utter.voice = pick
      utter.onstart = () => setTtsSpeaking(true)
      utter.onend = () => setTtsSpeaking(false)
      utter.onerror = () => setTtsSpeaking(false)
      synth.speak(utter)
    } catch {
      setTtsSpeaking(false)
    }
  }, [])

  /* Shared reply scheduler: think for `latency`, then either stream the
     reply (voice + text) or append it whole. */
  const scheduleReply = useCallback(
    (botWidget, { voice = false } = {}) => {
      setEngineTyping(true)
      setTypingContext(inferTypingContext(botWidget))
      const timerId = setTimeout(() => {
        timersRef.current.delete(timerId)
        setEngineTyping(false)
        setTypingContext(null)
        if (!botWidget) return
        if (voice && botWidget.type === 'text') {
          const replyText = botWidget.payload?.text ?? ''
          speakReply(replyText)
          streamBotReply(replyText)
        } else {
          append('bot', botWidget)
        }
      }, latencyRef.current)
      timersRef.current.add(timerId)
    },
    [append, streamBotReply, speakReply],
  )

  const sendUserMessage = useCallback(
    (widget, opts) => {
      const userMessage = append('user', widget)
      /* Pre-compute the reply so the typing indicator can pick a
         context-appropriate verb bucket while the bot "thinks". */
      const botWidget = respond(userMessage)
      scheduleReply(botWidget, { voice: opts?.voice })
    },
    [append, scheduleReply],
  )

  /**
   * React to a user widget WITHOUT appending a visible user message.
   * The bot still computes its reply (via respond()) and that reply
   * posts as a normal bot message.
   */
  const silentlyReact = useCallback(
    (widget, opts) => {
      const stubUserMessage = { id: uuid(), role: 'user', timestamp: Date.now(), widget }
      const botWidget = respond(stubUserMessage)
      scheduleReply(botWidget, { voice: opts?.voice })
    },
    [scheduleReply],
  )

  const injectBotMessage = useCallback((widget) => { append('bot', widget) }, [append])
  const injectUserWidgetResponse = useCallback((widget) => { append('user', widget) }, [append])
  const reset = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current.clear()
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setMessages([])
    setEngineTyping(false)
    setTypingContext(null)
    setTtsSpeaking(false)
  }, [])

  /* Interrupt the assistant mid-reply (barge-in): stop the spoken audio
     and the streaming text, keeping whatever has already been said, so
     the mic can take over immediately. */
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current.clear()
    setTtsSpeaking(false)
    setEngineTyping(false)
    setTypingContext(null)
    setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)))
  }, [])

  const isBotTyping = typingOverride === 'on'
    ? true
    : typingOverride === 'off'
      ? false
      : engineTyping

  /* True while a bot reply is mid-stream OR being spoken aloud — drives
     the voice "Ada speaking" bloom for the real duration of the audio. */
  const isBotSpeaking = ttsSpeaking || messages.some((m) => m.streaming)

  return {
    messages,
    isBotTyping,
    isBotSpeaking,
    typingContext,
    typingOverride,
    setTypingOverride,
    latencyMs,
    setLatencyMs,
    sendUserMessage,
    silentlyReact,
    stopSpeaking,
    injectBotMessage,
    injectUserWidgetResponse,
    reset,
  }
}
