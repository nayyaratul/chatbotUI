import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { respond } from './mockBot.js'

export function useBot() {
  const [messages, setMessages] = useState([])
  const [engineTyping, setEngineTyping] = useState(false)
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
      setEngineTyping(true)
      const timerId = setTimeout(() => {
        timersRef.current.delete(timerId)
        const botWidget = respond(userMessage)
        if (botWidget) append('bot', botWidget)
        setEngineTyping(false)
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
      setEngineTyping(true)
      const timerId = setTimeout(() => {
        timersRef.current.delete(timerId)
        const botWidget = respond(stubUserMessage)
        if (botWidget) append('bot', botWidget)
        setEngineTyping(false)
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
  }, [])

  const isBotTyping = typingOverride === 'on'
    ? true
    : typingOverride === 'off'
      ? false
      : engineTyping

  return {
    messages,
    isBotTyping,
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
