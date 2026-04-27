import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { respond } from './mockBot.js'

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

  const latencyRef = useRef(latencyMs)
  latencyRef.current = latencyMs

  const timersRef = useRef(new Set())

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((id) => clearTimeout(id))
      timers.clear()
    }
  }, [])

  const append = useCallback((role, widget) => {
    const message = { id: uuid(), role, timestamp: Date.now(), widget }
    setMessages((prev) => [...prev, message])
    return message
  }, [])

  const sendUserMessage = useCallback(
    (widget) => {
      const userMessage = append('user', widget)
      /* Pre-compute the reply so we know the widget type *before* the
         latency delay — that lets the typing indicator pick a
         context-appropriate verb bucket while the bot "thinks". The
         actual append still happens after the delay. */
      const botWidget = respond(userMessage)
      setEngineTyping(true)
      setTypingContext(inferTypingContext(botWidget))
      const timerId = setTimeout(() => {
        timersRef.current.delete(timerId)
        if (botWidget) append('bot', botWidget)
        setEngineTyping(false)
        setTypingContext(null)
      }, latencyRef.current)
      timersRef.current.add(timerId)
    },
    [append],
  )

  /**
   * React to a user widget WITHOUT appending a visible user message.
   * The bot still computes its reply (via respond()) and that reply
   * posts as a normal bot message. Useful for widgets where the AI
   * should take action on a selection but the selection itself is
   * internal (e.g. confidence check, admin confirmation, telemetry).
   */
  const silentlyReact = useCallback(
    (widget) => {
      const stubUserMessage = {
        id: uuid(),
        role: 'user',
        timestamp: Date.now(),
        widget,
      }
      const botWidget = respond(stubUserMessage)
      setEngineTyping(true)
      setTypingContext(inferTypingContext(botWidget))
      const timerId = setTimeout(() => {
        timersRef.current.delete(timerId)
        if (botWidget) append('bot', botWidget)
        setEngineTyping(false)
        setTypingContext(null)
      }, latencyRef.current)
      timersRef.current.add(timerId)
    },
    [append],
  )

  const injectBotMessage = useCallback((widget) => { append('bot', widget) }, [append])
  const injectUserWidgetResponse = useCallback((widget) => { append('user', widget) }, [append])
  const reset = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id))
    timersRef.current.clear()
    setMessages([])
    setEngineTyping(false)
    setTypingContext(null)
  }, [])

  const isBotTyping = typingOverride === 'on'
    ? true
    : typingOverride === 'off'
      ? false
      : engineTyping

  return {
    messages,
    isBotTyping,
    typingContext,
    typingOverride,
    setTypingOverride,
    latencyMs,
    setLatencyMs,
    sendUserMessage,
    silentlyReact,
    injectBotMessage,
    injectUserWidgetResponse,
    reset,
  }
}
